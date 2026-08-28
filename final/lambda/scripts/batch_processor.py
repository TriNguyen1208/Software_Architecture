import os
import json
import psycopg2
import boto3

def run_batch():
    # 1. Kết nối MinIO (Đóng giả S3)
    s3_client = boto3.client(
        's3',
        endpoint_url='http://localhost:9000',
        aws_access_key_id='admin',
        aws_secret_access_key='password123',
        region_name='us-east-1'
    )
    bucket_name = 'raw-logs'
    
    print("Batch Layer đang bắt đầu công việc cuối ngày...")
    
    # 2. Tải toàn bộ file raw log (Sử dụng Paginator để vượt qua giới hạn 1000 files của S3)
    all_events = []
    try:
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket_name)
        for page in pages:
            if 'Contents' in page:
                for obj in page['Contents']:
                    file_key = obj['Key']
                    response = s3_client.get_object(Bucket=bucket_name, Key=file_key)
                    content = response['Body'].read().decode('utf-8')
                    events = json.loads(content)
                    all_events.extend(events)
    except Exception as e:
        print("Lỗi khi đọc từ S3:", e)
        return
        
    if not all_events:
        print("Không có dữ liệu trong S3.")
        return
        
    print(f"Đã đọc {len(all_events)} sự kiện thô từ S3.")
    
    # 3. Sử dụng PySpark để xử lý dữ liệu (Đúng chuẩn Big Data Batch Layer)
    from pyspark.sql import SparkSession
    
    print("Khởi tạo Spark Session...")
    # Khởi tạo Spark (yêu cầu máy có cài Java). Ép dùng Java 17 của Conda thay vì Java 8 của Mac
    os.environ["JAVA_HOME"] = "/opt/miniconda3/envs/lambda-env/lib/jvm"
    spark = SparkSession.builder \
        .appName("Lambda_Batch_Layer") \
        .master("local[*]") \
        .getOrCreate()
        
    # Tạo DataFrame từ list dữ liệu thô
    df = spark.createDataFrame(all_events)
    
    # Chạy thuật toán lọc ảo (Deduplication): Một IP chỉ được tính 1 lượt xem cho 1 video
    df_valid = df.dropDuplicates(["video_id", "ip"])
    
    # Tính tổng số lượt xem hợp lệ bằng Spark SQL
    view_counts_df = df_valid.groupBy("video_id").count()
    
    # Chuyển kết quả từ Spark trở lại Python dictionary để ghi vào Postgres
    results = view_counts_df.collect()
    video_view_counts = {row['video_id']: row['count'] for row in results}
    
    print("PySpark xử lý xong. Dừng Spark Session.")
    spark.stop()
        
    # 4. Ghi kết quả chính xác vào Database (Ghi đè)
    pg_host = os.environ.get('POSTGRES_HOST', 'localhost')
    conn = psycopg2.connect(
        dbname="views_db",
        user="admin",
        password="password",
        host=pg_host,
        port="5432"
    )
    conn.autocommit = True
    cursor = conn.cursor()
    
    for video_id, count in video_view_counts.items():
        print(f"Video {video_id}: Tổng hợp lệ là {count} views. Cập nhật vào Batch Table.")
        cursor.execute("""
            INSERT INTO batch_views (video_id, views, last_updated)
            VALUES (%s, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (video_id) 
            DO UPDATE SET views = EXCLUDED.views, last_updated = CURRENT_TIMESTAMP;
        """, (video_id, count))
        
        # Lambda Architecture: Sau khi Batch Layer đã cập nhật dữ liệu chính xác,
        # chúng ta cần reset Speed Layer (Real-time Views) về 0 để tránh đếm trùng.
        cursor.execute("""
            UPDATE realtime_views 
            SET views = 0, last_updated = CURRENT_TIMESTAMP 
            WHERE video_id = %s;
        """, (video_id,))
        
    print("Batch Job hoàn tất! Đã reset Speed Layer về 0.")

if __name__ == "__main__":
    run_batch()
