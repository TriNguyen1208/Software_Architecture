# Lý thuyết về C4 + 1 View trong Thiết kế Hệ thống

Thuật ngữ **"C4 + 1 view"** thường được hiểu là sự kết hợp thực tế giữa 2 mô hình thiết kế kiến trúc phần mềm nổi tiếng:
1. **Mô hình C4 (C4 Model):** Quản lý cấu trúc tĩnh theo 4 mức độ (Context, Container, Component, Code).
2. **Mô hình 4+1 (4+1 Architectural View Model):** Lấy góc nhìn "+1" là **Scenarios/Use Case** (Kịch bản/Luồng nghiệp vụ) để làm rõ hành vi động của hệ thống.

Sự kết hợp này mang lại một bộ tài liệu kiến trúc toàn diện: **C4** giúp mọi người hiểu hệ thống được cấu tạo như thế nào, còn **+1 (Scenarios)** giúp chứng minh hệ thống hoạt động ra sao.

---

## Ví dụ cụ thể: Hệ thống Đặt vé xem phim (Cinema Booking System)

Dưới đây là các sơ đồ minh họa cho từng View dựa trên phương pháp tiếp cận **C4 + 1**.

### 1. Context View (C4 - Level 1)
**Mục tiêu:** Cho thấy bức tranh toàn cảnh. Hệ thống của chúng ta tương tác với người dùng nào và các hệ thống bên ngoài nào.

```mermaid
flowchart TD
    %% Khai báo các node
    User((Khách hàng))
    Admin((Nhân viên Rạp))
    
    System["Hệ thống Đặt vé xem phim<br/>(Cinema Booking System)"]:::internal
    
    Payment["Cổng thanh toán<br/>(Momo / ZaloPay)"]:::external
    SMS["Hệ thống SMS/Email<br/>(Twilio)"]:::external

    %% Liên kết
    User -->|"Tìm kiếm phim, Đặt vé"| System
    Admin -->|"Quản lý lịch chiếu, phim"| System
    System -->|"Yêu cầu thanh toán"| Payment
    System -->|"Gửi thông báo vé"| SMS

    %% Style
    classDef internal fill:#1168bd,color:#fff,stroke:#0b4884,stroke-width:2px;
    classDef external fill:#999999,color:#fff,stroke:#666666,stroke-width:2px;
```

### 2. Container View (C4 - Level 2)
**Mục tiêu:** Phóng to "Hệ thống Đặt vé xem phim". Hệ thống được chia thành các ứng dụng (App/Container), dịch vụ và database nào?

```mermaid
flowchart TD
    %% Khai báo các node
    User((Khách hàng))
    
    subgraph Cinema System [Hệ thống Đặt vé xem phim]
        WebApp["Web Application<br/>(ReactJS)"]:::frontend
        API["API Gateway / Backend<br/>(Spring Boot)"]:::backend
        DB[("Database<br/>PostgreSQL")]:::database
        Cache[("Cache<br/>Redis")]:::database
    end
    
    Payment[Cổng thanh toán]:::external

    %% Liên kết
    User -->|"Truy cập, thao tác"| WebApp
    WebApp -->|"Gọi API REST/JSON"| API
    API -->|"Đọc/Ghi dữ liệu vé"| DB
    API -->|"Lock ghế tạm thời"| Cache
    API -->|"Xác thực"| Payment

    %% Style
    classDef frontend fill:#08427b,color:#fff
    classDef backend fill:#1168bd,color:#fff
    classDef database fill:#438dd5,color:#fff
    classDef external fill:#999999,color:#fff
```

### 3. Component View (C4 - Level 3)
**Mục tiêu:** Phóng to "Backend (Spring Boot)". Nó chứa các module/component (khối xử lý logic) nào bên trong?

```mermaid
flowchart TD
    %% Node bên ngoài
    WebApp["Web Application"]:::frontend
    DB[("Database<br/>PostgreSQL")]:::database
    PaymentGateway["Cổng thanh toán"]:::external
    
    subgraph Backend Container [API Gateway / Backend Container]
        Security["Security Component<br/>(JWT, Auth)"]:::component
        Booking["Booking Component<br/>(Logic đặt vé)"]:::component
        Payment["Payment Component<br/>(Xử lý giao dịch)"]:::component
        Notify["Notification Component<br/>(Gửi thông báo)"]:::component
    end

    %% Liên kết
    WebApp -->|"Request kèm Token"| Security
    Security -->|"Xác thực thành công"| Booking
    Booking -->|"Đọc/Ghi"| DB
    Booking -->|"Yêu cầu thanh toán"| Payment
    Payment -->|"Gọi API External"| PaymentGateway
    Booking -->|"Báo tạo vé thành công"| Notify

    %% Style
    classDef frontend fill:#08427b,color:#fff
    classDef component fill:#85bbf0,color:#000
    classDef database fill:#438dd5,color:#fff
    classDef external fill:#999999,color:#fff
```

### 4. Code View (C4 - Level 4)
**Mục tiêu:** Phóng to "Booking Component". Xem cấu trúc các Class, Interface bên trong mã nguồn. *(Thường dùng UML Class Diagram)*

```mermaid
classDiagram
    class BookingController {
        +holdSeat(HoldSeatRequest)
        +bookTicket(BookRequest)
    }
    
    class BookingService {
        -TicketRepository ticketRepo
        -SeatRepository seatRepo
        +holdSeat(userId, showtimeId, seatId)
        +confirmBooking(ticketId)
    }
    
    class TicketRepository {
        <<interface>>
        +save(Ticket)
        +findById(ticketId)
    }
    
    class Ticket {
        +Long id
        +String status
        +Double price
        +markAsPaid()
    }
    
    BookingController --> BookingService : inject
    BookingService --> TicketRepository : inject
    BookingService --> Ticket : create/update
    TicketRepository ..> Ticket : returns
```

### 5. "+1" View: Scenarios / Use Case View (Luồng nghiệp vụ)
**Mục tiêu:** 4 góc nhìn trên chỉ thể hiện "tính tĩnh" (Cấu trúc). Góc nhìn thứ 5 này thể hiện "tính động" (Hành vi) bằng cách chứng minh luồng chạy của một Use Case qua các hệ thống. *(Thường dùng Sequence Diagram)*

**Kịch bản: Khách hàng Đặt vé và Thanh toán**

```mermaid
sequenceDiagram
    autonumber
    actor User as Khách hàng
    participant Web as Web Application
    participant API as API/Booking Component
    participant Redis as Cache (Redis)
    participant DB as PostgreSQL
    participant Momo as Momo Gateway

    User->>Web: Chọn ghế & Bấm "Đặt vé"
    Web->>API: POST /api/v1/booking/hold-seat
    API->>Redis: Check & Lock ghế (TTL 5 mins)
    Redis-->>API: OK (Lock thành công)
    API->>DB: Tạo Ticket (Trạng thái: PENDING)
    API-->>Web: Trả về TicketID & link thanh toán
    
    User->>Web: Chuyển hướng sang Momo
    Web->>Momo: Redirect User to Momo
    User->>Momo: Xác nhận thanh toán
    
    Momo-->>API: Webhook: Thanh toán thành công
    API->>DB: Cập nhật Ticket (Trạng thái: PAID)
    API->>Redis: Xóa Lock ghế
    API-->>Web: Server-Sent Events / WebSocket (Cập nhật UI)
    Web-->>User: Hiển thị "Đặt vé thành công" & Mã QR
```
