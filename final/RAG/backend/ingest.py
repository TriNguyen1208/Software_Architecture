import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import Chroma

load_dotenv()

def ingest_pdf():
    # Kiểm tra API KEY
    if not os.environ.get("GEMINI_API_KEY"):
        print("Lỗi: Chưa thiết lập GEMINI_API_KEY trong file .env")
        return

    # Khởi tạo Embeddings Model mới nhất
    os.environ["GOOGLE_API_KEY"] = os.environ.get("GEMINI_API_KEY")
    embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")

    # Đường dẫn tới file pdf (nằm ở thư mục cha RAG/)
    pdf_path = "file.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"Lỗi: Không tìm thấy file {pdf_path}")
        return

    print("Đang đọc file PDF...")
    loader = PyPDFLoader(pdf_path)
    docs = loader.load()

    print("Đang chia nhỏ dữ liệu (chunking)...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    splits = text_splitter.split_documents(docs)

    print(f"Đã chia thành {len(splits)} chunks. Đang lưu vào ChromaDB cục bộ...")
    
    # Lưu vào ChromaDB
    persist_directory = "./chroma_db"
    Chroma.from_documents(
        documents=splits,
        embedding=embeddings,
        persist_directory=persist_directory
    )
    
    print("Nạp dữ liệu RAG thành công!")

if __name__ == "__main__":
    ingest_pdf()
