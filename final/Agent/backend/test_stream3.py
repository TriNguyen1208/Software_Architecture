import asyncio
from main import travel_info_agent
from langchain_core.messages import HumanMessage

async def main():
    async for event in travel_info_agent.astream_events({"messages": [HumanMessage(content="Hello, how is the weather in Cornwall?")]}, version="v2"):
        if event["event"] == "on_chat_model_stream":
            chunk = event["data"]["chunk"]
            print("TYPE:", type(chunk.content), "CONTENT:", repr(chunk.content))

if __name__ == "__main__":
    asyncio.run(main())
