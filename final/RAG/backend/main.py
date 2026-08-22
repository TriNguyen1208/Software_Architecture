import os
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# Đặt biến môi trường chuẩn cho thư viện
if os.environ.get("GEMINI_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ.get("GEMINI_API_KEY")

app = FastAPI(title="RAG Chatbot API")

# Cho phép CORS từ frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Khởi tạo mô hình Embeddings và Vector DB (nếu chưa nạp data thì có thể lỗi)
try:
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
    db = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
    retriever = db.as_retriever(search_kwargs={"k": 3})
except Exception as e:
    print("Cảnh báo: Chưa thể khởi tạo ChromaDB hoặc Embeddings.", e)
    retriever = None

# Khởi tạo mô hình sinh LLM
llm = ChatGoogleGenerativeAI(model="models/gemini-3.6-flash", temperature=0.3)

# Template câu nhắc
template = """Bạn là trợ lý AI thông minh. Sử dụng dữ liệu tri thức sau để trả lời câu hỏi.
Nếu bạn không biết câu trả lời từ dữ liệu cung cấp, hãy nói là bạn không biết, đừng cố bịa ra.

Context: {context}

Question: {question}
Answer:"""

prompt = ChatPromptTemplate.from_template(template)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

# Tạo chuỗi RAG sử dụng LCEL
if retriever:
    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
else:
    rag_chain = None

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def chat_stream(request: ChatRequest):
    if not rag_chain:
        return {"error": "Hệ thống RAG chưa sẵn sàng. Hãy chạy ingest.py trước."}
        
    async def generate():
        try:
            # Dùng astream để sinh dữ liệu theo thời gian thực (streaming chunk)
            async for chunk in rag_chain.astream(request.message):
                # Format dữ liệu theo chuẩn Server-Sent Events (SSE)
                yield f"data: {chunk}\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
        finally:
            yield "data: [DONE]\n\n"
            
    return StreamingResponse(generate(), media_type="text/event-stream")
