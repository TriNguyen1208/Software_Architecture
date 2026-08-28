import asyncio
import json
import psycopg2
import subprocess
import os
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from contextlib import asynccontextmanager

# Get the directory containing the lambda scripts
SCRIPTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'scripts'))
worker_processes = []

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: spawn the 2 background workers
    print("Đang khởi động các background workers (kafka_to_minio và stream_processor)...")
    env = os.environ.copy()
    p1 = subprocess.Popen(["python", os.path.join(SCRIPTS_DIR, "kafka_to_minio.py")], cwd=SCRIPTS_DIR, env=env)
    p2 = subprocess.Popen(["python", os.path.join(SCRIPTS_DIR, "stream_processor.py")], cwd=SCRIPTS_DIR, env=env)
    worker_processes.extend([p1, p2])
    
    yield
    
    # Shutdown: kill the background workers
    print("Đang tắt các background workers...")
    for p in worker_processes:
        p.terminate()
        p.wait()

app = FastAPI(lifespan=lifespan)

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    pg_host = os.environ.get('POSTGRES_HOST', 'localhost')
    return psycopg2.connect(
        dbname="views_db",
        user="admin",
        password="password",
        host=pg_host,
        port="5432"
    )

def fetch_views(video_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT views FROM realtime_views WHERE video_id = %s;", (video_id,))
    rt_result = cursor.fetchone()
    realtime_views = rt_result[0] if rt_result else 0
    
    cursor.execute("SELECT views FROM batch_views WHERE video_id = %s;", (video_id,))
    bt_result = cursor.fetchone()
    batch_views = bt_result[0] if bt_result else 0
    
    conn.close()
    
    return {
        "video_id": video_id,
        "total_views": batch_views + realtime_views,
        "batch_views": batch_views,
        "realtime_views": realtime_views
    }

@app.get("/stream/{video_id}")
async def message_stream(request: Request, video_id: str):
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break
            data = fetch_views(video_id)
            yield {
                "event": "message",
                "data": json.dumps(data)
            }
            await asyncio.sleep(1)
    return EventSourceResponse(event_generator())

def run_script(script_name: str):
    script_path = os.path.join(SCRIPTS_DIR, script_name)
    print(f"Running script: {script_path}")
    subprocess.run(["python", script_path], cwd=SCRIPTS_DIR)

@app.post("/api/simulate")
async def trigger_simulation(background_tasks: BackgroundTasks):
    run_script("user_simulator.py")
    return {"message": "Traffic simulation started in background."}
    # background_tasks.add_task(run_script, "user_simulator.py")
    # return {"message": "Traffic simulation started in background."}

@app.post("/api/batch")
async def trigger_batch():
    # Chạy đồng bộ để frontend chờ PySpark xử lý xong
    run_script("batch_processor.py")
    return {"message": "Batch processor completed successfully."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
