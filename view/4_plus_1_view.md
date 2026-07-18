# Mô hình 4+1 View (4+1 Architectural View Model)

Mô hình 4+1 do Philippe Kruchten đề xuất, sử dụng 4 góc nhìn (view) khác nhau để mô tả thiết kế của một hệ thống phần mềm. Tất cả 4 góc nhìn này đều xoay quanh và được minh chứng tính đúng đắn bởi góc nhìn thứ 5 (Kịch bản - Scenarios).

Dưới đây là mô tả và sơ đồ Mermaid minh họa cho từng View, áp dụng cho **Hệ thống Đặt vé xem phim (Cinema Booking System)**. Lưu ý các cú pháp Mermaid đã được xử lý chuẩn để tránh lỗi Parse error.

---

## 💡 Mẹo siêu tốc phân biệt 5 View
Để ghi nhớ nhanh nhất, bạn chỉ cần gán 1 "từ khóa" đại diện cho đối tượng chính mà mỗi View quan tâm tới:
- **Logical View** ➔ **CLASS** (Thực thể/Chức năng)
- **Process View** ➔ **THREAD** (Đồng thời/Luồng chạy)
- **Development View** ➔ **PACKAGE** (Đóng gói/Mã nguồn)
- **Physical View (Deployment View)** ➔ **SERVER** (Hạ tầng/Phần cứng)
- **+1 (Scenarios)** ➔ **USE CASE** (Kịch bản/Nghiệp vụ)

> **"CLASS chạy THREAD, gói trong PACKAGE, cài lên SERVER để phục vụ USE CASE."**

---

### 1. Logical View (Góc nhìn Logic)
**Mục tiêu:** Mô tả cấu trúc tĩnh của hệ thống qua các thực thể kinh doanh (business entities) và mối quan hệ giữa chúng, nhằm đáp ứng các yêu cầu chức năng.  
**Đối tượng:** Lập trình viên, Quản lý hệ thống.

```mermaid
classDiagram
    class Cinema {
        +String name
        +String address
    }
    class Movie {
        +String title
        +int duration
    }
    class ShowTime {
        +DateTime time
    }
    class Ticket {
        +String seatNumber
        +double price
        +String status
    }
    class User {
        +String username
        +String email
    }

    Cinema "1" *-- "many" ShowTime
    Movie "1" <-- "many" ShowTime
    ShowTime "1" *-- "many" Ticket
    User "1" <-- "many" Ticket : books
```

### 2. Process View (Góc nhìn Tiến trình)
**Mục tiêu:** Tập trung vào hành vi động của hệ thống: các luồng xử lý (processes), tính đồng thời (concurrency), hiệu suất, và sự phân tán (distribution).  
**Đối tượng:** Kỹ sư tích hợp hệ thống (System Integrators).

```mermaid
flowchart TD
    UserReq["User Request Thread"]:::thread
    AuthProc["Authentication Process"]:::process
    BookingProc["Booking Process<br/>(Concurrency handling)"]:::process
    DBConn["Database Connection Pool"]:::pool

    UserReq -->|"1. Validate Token"| AuthProc
    AuthProc -->|"2. Valid"| BookingProc
    BookingProc -->|"3. Lock Seat (Mutex)"| DBConn
    
    classDef thread fill:#f9f,stroke:#333,stroke-width:2px;
    classDef process fill:#bbf,stroke:#333,stroke-width:2px;
    classDef pool fill:#bfb,stroke:#333,stroke-width:2px;
```

### 3. Development View (Góc nhìn Phát triển)
**Mục tiêu:** Mô tả cách tổ chức mã nguồn, các package, thư viện, framework. Quản lý cấu trúc của project thực tế.  
**Đối tượng:** Lập trình viên (Programmers).

```mermaid
flowchart TD
    subgraph com.cinema.booking ["Package: com.cinema.booking"]
        API["API Layer<br/>(Controllers)"]
        Service["Service Layer<br/>(Business Logic)"]
        Repo["Repository Layer<br/>(Data Access)"]
    end
    
    subgraph com.cinema.security ["Package: com.cinema.security"]
        JWT["JWT Provider"]
    end
    
    subgraph External ["External Libraries"]
        Spring["Spring Boot Framework"]
        Hibernate["Hibernate ORM"]
    end

    API --> Service
    Service --> Repo
    API --> JWT
    Repo -.-> Hibernate
    API -.-> Spring
```

### 4. Physical View (Góc nhìn Vật lý / Deployment View)
**Mục tiêu:** Mô tả việc triển khai phần mềm lên phần cứng (servers, cloud, database nodes, network topology).  
**Đối tượng:** Kỹ sư hệ thống, DevOps, Quản trị mạng (System Engineers).

```mermaid
flowchart TD
    subgraph Client ["Client Tier"]
        Browser["User Browser<br/>(ReactJS SPA)"]
    end
    
    subgraph Cloud ["AWS Cloud"]
        LB["Load Balancer<br/>(Nginx / AWS ALB)"]
        
        subgraph AppServers ["App Servers (EC2/EKS)"]
            App1["Cinema App Instance 1"]
            App2["Cinema App Instance 2"]
        end
        
        subgraph Databases ["Database Nodes (RDS)"]
            Master[("PostgreSQL<br/>(Master)")]
            Slave[("PostgreSQL<br/>(Read Replica)")]
        end
        
        Redis[("ElastiCache<br/>(Redis)")]
    end

    Browser -->|"HTTPS"| LB
    LB --> App1
    LB --> App2
    App1 --> Master
    App2 --> Master
    Master -.->|"Replication"| Slave
    App1 --> Redis
    App2 --> Redis
```

### 5. "+1" View: Scenarios (Kịch bản / Use Case)
**Mục tiêu:** Kết nối 4 view trên lại với nhau, minh họa cách hệ thống hoạt động thông qua một chuỗi các hành động thực tế.  
**Đối tượng:** Tất cả mọi người (Stakeholders).

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Khách hàng
    participant UI as Giao diện (Logical)
    participant Server as App Server (Physical)
    participant Process as Booking Process (Process)
    participant Code as Service Layer (Development)
    participant DB as Database (Physical)

    Customer->>UI: Chọn ghế & Xác nhận
    UI->>Server: Gửi request đặt vé
    Server->>Process: Spawn/Assign Thread
    Process->>Code: Gọi BookingService.holdSeat()
    Code->>DB: Thực thi SQL Query
    DB-->>Code: Trả về kết quả Lock
    Code-->>Process: Xử lý logic xong
    Process-->>Server: Trả về HTTP 200 OK
    Server-->>UI: Cập nhật giao diện
    UI-->>Customer: Hiển thị "Đã giữ ghế"
```
