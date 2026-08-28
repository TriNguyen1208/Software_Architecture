import boto3
import psycopg2
import os

def reset_all():
    print("Bắt đầu reset dữ liệu...")
    
    # 1. Reset PostgreSQL
    try:
        print("Đang xóa dữ liệu PostgreSQL...")
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
        
        cursor.execute("TRUNCATE TABLE batch_views;")
        cursor.execute("TRUNCATE TABLE realtime_views;")
        print("Đã xóa sạch dữ liệu trong bảng batch_views và realtime_views.")
        
        conn.close()
    except Exception as e:
        print(f"Lỗi khi reset PostgreSQL: {e}")
        
    # 2. Reset MinIO S3
    try:
        print("Đang xóa dữ liệu MinIO (S3)...")
        minio_endpoint = os.environ.get('MINIO_ENDPOINT', 'http://localhost:9000')
        s3_client = boto3.client(
            's3',
            endpoint_url=minio_endpoint,
            aws_access_key_id='admin',
            aws_secret_access_key='password123',
            region_name='us-east-1'
        )
        
        bucket_name = 'raw-logs'
        
        # Paginator để xóa toàn bộ files
        paginator = s3_client.get_paginator('list_objects_v2')
        pages = paginator.paginate(Bucket=bucket_name)
        
        deleted_count = 0
        for page in pages:
            if 'Contents' in page:
                objects_to_delete = [{'Key': obj['Key']} for obj in page['Contents']]
                s3_client.delete_objects(
                    Bucket=bucket_name,
                    Delete={'Objects': objects_to_delete}
                )
                deleted_count += len(objects_to_delete)
                
        print(f"Đã xóa toàn bộ {deleted_count} file JSON trong bucket '{bucket_name}'.")
    except Exception as e:
        print(f"Lỗi khi reset MinIO: {e}")

    print("Reset hoàn tất!")

if __name__ == "__main__":
    reset_all()
