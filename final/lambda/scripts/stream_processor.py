import json
import time
import os
import psycopg2
from kafka import KafkaConsumer

def run_stream():
    kafka_broker = os.environ.get('KAFKA_BROKER', 'localhost:9092')
    pg_host = os.environ.get('POSTGRES_HOST', 'localhost')

    # Kết nối Database
    conn = psycopg2.connect(
        dbname="views_db",
        user="admin",
        password="password",
        host=pg_host,
        port="5432"
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    # Kết nối Kafka
    consumer = KafkaConsumer(
        'views',
        bootstrap_servers=[kafka_broker],
        auto_offset_reset='latest',
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))
    )
    
    print("Stream Processor (Speed Layer) đang chạy...")
    
    # Cấu hình Sliding Window
    window_size_seconds = 10
    slide_seconds = 5
    
    current_window_views = 0
    window_start = time.time()
    
    while True:
        # Lấy message với timeout 1 giây để vòng lặp không bị khóa chết nếu không có message
        records = consumer.poll(timeout_ms=1000)
        
        for tp, messages in records.items():
            for message in messages:
                current_window_views += 1
                
        current_time = time.time()
        
        # Nếu đã qua thời gian trượt (Slide = 5s) và có dữ liệu để flush
        if current_time - window_start >= slide_seconds:
            if current_window_views > 0:
                print(f"Cập nhật Window: Thêm {current_window_views} views")
                
                # Upsert vào Postgres (Cập nhật Real-time)
                cursor.execute("""
                    INSERT INTO realtime_views (video_id, views, last_updated)
                    VALUES (%s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (video_id) 
                    DO UPDATE SET views = realtime_views.views + EXCLUDED.views, last_updated = CURRENT_TIMESTAMP;
                """, ("V_LAMBDA_101", current_window_views))
                
                current_window_views = 0
            
            # Cập nhật mốc thời gian cửa sổ bất kể có dữ liệu hay không
            window_start = current_time

if __name__ == "__main__":
    run_stream()
