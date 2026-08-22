import os
import json
import random
import operator
from typing import Annotated, Sequence, TypedDict

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.messages import BaseMessage, HumanMessage, ToolMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import create_retriever_tool
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import tools_condition

load_dotenv()

# Đặt biến môi trường chuẩn cho thư viện
if os.environ.get("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ.get("GEMINI_API_KEY")

app = FastAPI(title="Agentic RAG Chatbot API")

# Cho phép CORS từ frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. KHỞI TẠO CÁC TOOLS
TOOLS = []

# Tool 1: Tìm kiếm thông tin từ tài liệu nội bộ (ChromaDB)
try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    db = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
    retriever = db.as_retriever(search_kwargs={"k": 3})
    
    search_travel_info_tool = create_retriever_tool(
        retriever,
        "search_travel_info",
        "Tìm kiếm các thông tin về du lịch, hướng dẫn học tập, quy định hoặc tri thức nội bộ từ cơ sở dữ liệu vector. Hữu ích khi bạn cần thông tin chi tiết để trả lời câu hỏi của người dùng.",
    )
    TOOLS.append(search_travel_info_tool)
except Exception as e:
    print("Cảnh báo: Chưa thể khởi tạo ChromaDB hoặc Embeddings.", e)

# Tool 2: Lấy thông tin thời tiết (Mock Data như trong travel_agent.ipynb)
@tool(description="Lấy thông tin thời tiết hiện tại và nhiệt độ cho các điểm đến (ví dụ: Cornwall, North_Cornwall, v.v.)")
def get_weather_info(city: str) -> str:
    """Returns the weather condition and temperature for a given city."""
    city_normalized = city.strip().lower().replace(" ", "_")
    mock_weather_db = {
        "cornwall": "Sunny, 18°C, perfect for a beach day.",
        "north_cornwall": "Windy and partly cloudy, 15°C. Great for surfing.",
        "south_cornwall": "Clear skies, 19°C. Ideal for sailing.",
        "west_cornwall": "Light rain, 14°C. Good for indoor activities or coastal walks."
    }
    
    if city_normalized in mock_weather_db:
        return mock_weather_db[city_normalized]
    
    conditions = ["Sunny", "Cloudy", "Rainy", "Windy", "Foggy"]
    temp = random.randint(10, 25)
    random_condition = random.choice(conditions)
    return f"The current weather in {city} is {random_condition} with a temperature of {temp}°C."

TOOLS.append(get_weather_info)


# 2. KHỞI TẠO LLM VÀ LANGGRAPH AGENT
llm_model = ChatGoogleGenerativeAI(model="models/gemini-3.6-flash", temperature=0.3)
llm_with_tools = llm_model.bind_tools(TOOLS)

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], operator.add]

class ToolsExecutionNode:
    """Thực thi các tool mà LLM yêu cầu trong tin nhắn cuối cùng."""
    def __init__(self, tools: Sequence):
        self._tools_by_name = {t.name: t for t in tools}

    async def __call__(self, state: dict):
        messages: Sequence[BaseMessage] = state.get("messages", [])
        last_msg = messages[-1]
        tool_messages: list[ToolMessage] = []
        tool_calls = getattr(last_msg, "tool_calls", [])
        
        for tool_call in tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool = self._tools_by_name[tool_name]
            # Gọi tool bất đồng bộ để không block event loop
            result = await tool.ainvoke(tool_args)
            tool_messages.append(
                ToolMessage(
                    content=str(result),
                    name=tool_name,
                    tool_call_id=tool_call["id"],
                )
            )
        return {"messages": tool_messages}

async def llm_node(state: AgentState, config: RunnableConfig):
    """LLM Node để suy luận và quyết định dùng tool hay trả lời."""
    current_messages = state["messages"]
    # Bắt buộc phải truyền config vào ainvoke để astream_events nhận được stream tokens
    response_message = await llm_with_tools.ainvoke(current_messages, config=config)
    return {"messages": [response_message]}

builder = StateGraph(AgentState)
builder.add_node("llm_node", llm_node)
builder.add_node("tools", ToolsExecutionNode(TOOLS))

builder.add_conditional_edges("llm_node", tools_condition)
builder.add_edge("tools", "llm_node")
builder.set_entry_point("llm_node")

travel_info_agent = builder.compile()

# 3. FASTAPI ENDPOINT (STREAMING)
class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def chat_stream(request: ChatRequest):
    async def generate():
        try:
            # Khởi tạo tin nhắn hệ thống bắt buộc sử dụng Tool nếu cần
            system_msg = SystemMessage(
                content="Bạn là một trợ lý AI thông minh. Hãy luôn sử dụng công cụ `search_travel_info` "
                        "để tra cứu thông tin nếu người dùng hỏi về kiến thức nội bộ, hoặc dùng `get_weather_info` "
                        "nếu hỏi về thời tiết. Nếu bạn dùng tool, hãy dùng ngôn ngữ tự nhiên để trả lời từ dữ liệu trả về."
            )
            state = {"messages": [system_msg, HumanMessage(content=request.message)]}
            
            # Sử dụng astream_events để bắt được các sự kiện stream chữ từ mô hình
            # Điều này giúp ta lấy được token chữ kể cả khi nó đang nằm trong luồng Graph
            async for event in travel_info_agent.astream_events(state, version="v2"):
                kind = event["event"]
                
                # Bắt lấy các luồng sinh chữ của Assistant
                if kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if hasattr(chunk, 'content'):
                        content = chunk.content
                        if isinstance(content, str) and content:
                            yield f"data: {content}\n\n"
                        elif isinstance(content, list):
                            for item in content:
                                if isinstance(item, dict) and item.get("type") == "text" and item.get("text"):
                                    yield f"data: {item['text']}\n\n"
                # Gửi tín hiệu khi Tool được gọi
                elif kind == "on_tool_start":
                    tool_name = event.get("name", "tool")
                    yield f"data: [TOOL_START] {tool_name}\n\n"
                elif kind == "on_tool_end":
                    tool_name = event.get("name", "tool")
                    yield f"data: [TOOL_END] {tool_name}\n\n"
                        
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
        finally:
            yield "data: [DONE]\n\n"
            
    return StreamingResponse(generate(), media_type="text/event-stream")
