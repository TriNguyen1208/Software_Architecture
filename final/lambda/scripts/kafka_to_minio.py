import json
import time
import os
import boto3
from kafka import KafkaConsumer

def consume_and_store():
    kafka_broker = os.environ.get('KAFKA_BROKER', 'localhost:9092')
    minio_endpoint = os.environ.get('MINIO_ENDPOINT', 'http://localhost:9000')

    consumer = KafkaConsumer(
        'views',
        bootstrap_servers=[kafka_broker],
        group_id='minio_writer',
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        value_deserializer=lambda x: json.loads(x.decode('utf-8'))
    )
    
    s3_client = boto3.client(
        's3',
        endpoint_url=minio_endpoint,
        aws_access_key_id='admin',
        aws_secret_access_key='password123',
        region_name='us-east-1'
    )
    
    bucket_name = 'raw-logs'
    
    # Create bucket if not exists
    try:
        s3_client.create_bucket(Bucket=bucket_name)
    except Exception as e:
        pass # Bucket might already exist
        
    print("Listening to Kafka and writing to MinIO...")
    
    messages = []
    batch_size = 100
    
    for message in consumer:
        messages.append(message.value)
        if len(messages) >= batch_size:
            timestamp = int(time.time() * 1000)
            file_name = f"views_batch_{timestamp}.json"
            
            # Save batch to S3
            s3_client.put_object(
                Bucket=bucket_name,
                Key=file_name,
                Body=json.dumps(messages)
            )
            print(f"Saved {len(messages)} events to MinIO: s3://{bucket_name}/{file_name}")
            messages = []

if __name__ == "__main__":
    consume_and_store()
