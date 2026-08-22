import os
import asyncio
from typing import Sequence
from dotenv import load_dotenv

from langchain_community.document_loaders import AsyncHtmlLoader
from langchain_community.document_transformers import Html2TextTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

UK_DESTINATIONS = [ #A
    "Cornwall",
    "North_Cornwall",
    "South_Cornwall",
    "West_Cornwall",
]

async def ingest_wiki_data(destinations: Sequence[str]):
    """Download WikiVoyage pages and save into ChromaDB"""
    
    # Kiểm tra API KEY
    if not os.environ.get("GEMINI_API_KEY"):
        print("Lỗi: Chưa thiết lập GEMINI_API_KEY trong file .env")
        return

    # Khởi tạo Embeddings Model
    os.environ["GOOGLE_API_KEY"] = os.environ.get("GEMINI_API_KEY")
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

    urls = [f"https://en.wikivoyage.org/wiki/{slug}" for slug in destinations] #C
    
    print("Downloading destination pages ...") #C
    loader = AsyncHtmlLoader(urls) #C
    docs = await loader.aload() #C
    
    print("Converting HTML to Text ...")
    html2text = Html2TextTransformer()
    docs_transformed = html2text.transform_documents(docs)

    print("Chunking documents ...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    splits = text_splitter.split_documents(docs_transformed)

    print(f"Saving {len(splits)} chunks to ChromaDB ...")
    persist_directory = "./chroma_db"
    
    Chroma.from_documents(
        documents=splits,
        embedding=embeddings,
        persist_directory=persist_directory
    )
    
    print("Successfully ingested WikiVoyage data into ChromaDB!")

if __name__ == "__main__":
    asyncio.run(ingest_wiki_data(UK_DESTINATIONS))
