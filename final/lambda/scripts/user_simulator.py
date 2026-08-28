import json
import time
import random
from kafka import KafkaProducer

def generate_events():
    producer = KafkaProducer(
        bootstrap_servers='localhost:9092',
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    
    video_id = "V_LAMBDA_101"
    
    print("Starting traffic generator...")
    # Generate 300 valid views from random IPs
    for i in range(300):
        ip = f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
        event = {
            "video_id": video_id,
            "ip": ip,
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "timestamp": int(time.time() * 1000)
        }
        producer.send('views', event)
        if i % 10 == 0:
            time.sleep(0.1) # slight delay to spread out events
    
    # Generate 700 fake views from a single IP (Spam bot)
    spam_ip = "192.168.1.99"
    for i in range(700):
        event = {
            "video_id": video_id,
            "ip": spam_ip,
            "user_agent": "Bot/1.0",
            "timestamp": int(time.time() * 1000)
        }
        producer.send('views', event)
        if i % 50 == 0:
            time.sleep(0.05)
            
    producer.flush()
    print("Traffic generation complete. Sent 1000 views total (300 valid, 700 spam).")

if __name__ == "__main__":
    generate_events()
