import asyncio
from main import travel_info_agent
from langchain_core.messages import HumanMessage

async def main():
    async for event in travel_info_agent.astream_events({"messages": [HumanMessage(content="Hello, how is the weather in Cornwall?")]}, version="v2"):
        print(event["event"], event.get("name"))

if __name__ == "__main__":
    asyncio.run(main())
