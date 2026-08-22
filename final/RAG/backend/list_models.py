import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    print("Danh sách các model có hỗ trợ Embeddings:")
    for m in genai.list_models():
        if 'embedContent' in m.supported_generation_methods:
            print(f"- {m.name}")
else:
    print("Không tìm thấy GEMINI_API_KEY trong file .env")
