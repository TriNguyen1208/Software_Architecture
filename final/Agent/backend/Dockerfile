FROM python:3.11-slim

WORKDIR /app

# Cài đặt công cụ build cần thiết cho ChromaDB (nếu có build native module)
RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
