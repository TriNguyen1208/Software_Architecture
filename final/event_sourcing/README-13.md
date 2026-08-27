# Sơ đồ góc nhìn Logic Kiến trúc Event Sourcing & CQRS

Dưới đây là sơ đồ góc nhìn logic (Logical View) mô tả luồng hoạt động của thiết kế Event Sourcing kết hợp CQRS trong bài thực hành, kèm theo ghi chú các công cụ (tools/technologies) được sử dụng để cài đặt từng thành phần.

```mermaid
flowchart TD
    %% Định nghĩa các Style để phân biệt Read/Write
    classDef client fill:#3498db,stroke:#2980b9,stroke-width:2px,color:#fff
    classDef api fill:#2c3e50,stroke:#1a252f,stroke-width:2px,color:#fff
    classDef write fill:#e74c3c,stroke:#c0392b,stroke-width:2px,color:#fff
    classDef read fill:#27ae60,stroke:#2ecc71,stroke-width:2px,color:#fff
    classDef queue fill:#f39c12,stroke:#d35400,stroke-width:2px,color:#fff
    classDef worker fill:#8e44ad,stroke:#8e44ad,stroke-width:2px,color:#fff

    %% Components
    Client["💻 Client (Frontend UI) <br> Công cụ: React / Vite"]

    subgraph Backend ["Backend API Service (Công cụ: Node.js / Express)"]
        Router["🔀 Express Router <br> (Phân loại Request)"]
        
        subgraph WriteSide ["Write Side (Command)"]
            CommandHandler["✍️ Command Handler <br> (Xử lý POST, PUT, DELETE)"]
        end
        
        subgraph ReadSide ["Read Side (Query)"]
            QueryHandler["🔍 Query Handler <br> (Xử lý GET)"]
        end
        
        Projector["⚙️ Projector / Worker <br> (Lắng nghe queue)"]
    end

    EventStore[("📚 Event Store (Write DB) <br> Công cụ: EventStoreDB (KurrentDB)")]
    MessageBus{{"📨 Message Broker / Event Bus <br> Công cụ: RabbitMQ"}}
    ReadDB[("🗄️ Read Model (Read DB) <br> Công cụ: SQLite")]

    %% Assign Classes
    class Client client
    class Router api
    class CommandHandler write
    class QueryHandler read
    class Projector worker
    class EventStore write
    class MessageBus queue
    class ReadDB read

    %% Luồng dữ liệu (Data flow)
    
    %% Luồng Write (Màu đỏ)
    Client -- "Gửi Command <br>(Tạo/Sửa/Xoá User)" --> Router
    Router -- "Định tuyến" --> CommandHandler
    CommandHandler -- "1. Nạp sự kiện mới <br>(Append Event)" --> EventStore
    CommandHandler -- "2. Phát tín hiệu sự kiện <br>(Publish Message)" --> MessageBus
    
    %% Luồng Đồng bộ (Màu cam)
    MessageBus -- "3. Nhận sự kiện bất đồng bộ <br>(Consume Message)" --> Projector
    Projector -- "4. Tính toán & Cập nhật <br>(INSERT/UPDATE/DELETE)" --> ReadDB
    
    %% Luồng Read (Màu xanh)
    Client -- "Gửi Query <br>(Lấy danh sách User)" --> Router
    Router -- "Định tuyến" --> QueryHandler
    QueryHandler -- "Truy vấn <br>(SELECT)" --> ReadDB
```

## Chú giải các công cụ sử dụng (Technology Stack):

1. **Client (Frontend)**: 
   - **React (Vite)**: Giao diện người dùng thực hiện các thao tác Command (Thêm/Sửa/Xoá) và Query (Hiển thị danh sách).
2. **Backend API (Node.js & Express)**:
   - Đóng vai trò là Server xử lý nghiệp vụ, nhận các HTTP Request từ Frontend, chia luồng thành Write và Read (CQRS).
3. **Event Store (Write Database)**: 
   - **EventStoreDB (KurrentDB)**: Đóng vai trò là Database lưu trữ chuỗi các sự kiện (Event Sourcing) không thể thay đổi (Immutable). Nó là *Nguồn Sự Thật duy nhất* (Single Source of Truth).
4. **Message Broker (Event Bus)**: 
   - **RabbitMQ**: Đóng vai trò truyền tải thông điệp bất đồng bộ (Asynchronous) từ Write Model sang Read Model, giúp giải phóng API Ghi nhanh chóng mà không cần chờ cập nhật Read Database.
5. **Read Model (Read Database)**:
   - **SQLite**: Database quan hệ lưu trữ dữ liệu dạng bảng (Table), được tối ưu hoá để đọc cực kỳ nhanh bằng các truy vấn `SELECT` đơn giản, không cần tốn thời gian tính toán lại (Replay) từ các Events.
6. **Projector / Event Worker**:
   - Chạy ngầm trong tiến trình Node.js (nhờ amqplib), lắng nghe queue của RabbitMQ và ánh xạ thông tin sự kiện ra các câu SQL (`INSERT`, `UPDATE`, `DELETE`) vào bảng `customers_read` trong SQLite.

## Cây thư mục dự án (Directory Tree)

```text
.
|--- CHANGELOG.md
|--- backend
|   |--- Dockerfile
|   |--- package-lock.json
|   |--- package.json
|   |--- server.js
|--- data
|   |--- database_read.sqlite
|--- docker-compose.yml
|--- frontend
|   |--- Dockerfile
|   |--- README.md
|   |--- index.html
|   |--- package-lock.json
|   |--- package.json
|   |--- public
|   |   |--- favicon.svg
|   |   |--- icons.svg
|   |--- src
|   |   |--- App.css
|   |   |--- App.jsx
|   |   |--- assets
|   |   |   |--- hero.png
|   |   |   |--- react.svg
|   |   |   |--- vite.svg
|   |   |--- index.css
|   |   |--- main.jsx
|   |   |--- pages
|   |   |   |--- CustomerForm.jsx
|   |   |   |--- CustomerList.jsx
|   |   |   |--- GlobalHistory.jsx
|   |--- vite.config.js
```

## Sơ đồ góc nhìn Triển khai (Deployment View)

Dưới đây là sơ đồ mô tả cách hệ thống được đóng gói và chạy trong môi trường thực tế (Sử dụng Docker).

```mermaid
flowchart TD
    %% Định nghĩa Style
    classDef node fill:#ecf0f1,stroke:#bdc3c7,stroke-width:2px,color:#2c3e50
    classDef container fill:#3498db,stroke:#2980b9,stroke-width:2px,color:#fff
    classDef volume fill:#f1c40f,stroke:#f39c12,stroke-width:2px,color:#fff

    ClientBrowser["🌐 Web Browser <br> (Người dùng)"]

    subgraph DockerHost ["🐳 Docker Host (Máy cá nhân / Server) <br> Công cụ: Docker Engine / Docker Compose"]
        
        subgraph Net ["Docker Internal Network"]
            Frontend["📦 Frontend Container <br> React + Vite <br> (Port: 5173)"]
            Backend["📦 Backend Container <br> Node.js + Express <br> (Port: 5000)"]
            EventStoreDB["📦 EventStoreDB Container <br> KurrentDB <br> (Port: 2113)"]
            RabbitMQ["📦 RabbitMQ Container <br> Broker <br> (Port: 5672)"]
        end

        VolumeSQLite[("💾 Host Volume (./data) <br> SQLite Files")]
        VolumeES[("💾 Docker Volume <br> eventstore-data")]
        VolumeMQ[("💾 Docker Volume <br> rabbitmq-data")]
    end

    %% Assign Classes
    class DockerHost node
    class Frontend,Backend,EventStoreDB,RabbitMQ container
    class VolumeSQLite,VolumeES,VolumeMQ volume

    %% Routing / Connections
    ClientBrowser -- "Truy cập Web (http://localhost:5173)" --> Frontend
    ClientBrowser -- "Gọi API (http://localhost:5001/api)" --> Backend
    
    Backend -- "Ghi/Đọc Events qua gRPC" --> EventStoreDB
    Backend -- "Publish/Consume Messages qua AMQP" --> RabbitMQ
    
    %% Volumes mapping
    Backend -- "Đọc/Ghi database_read.sqlite" --> VolumeSQLite
    EventStoreDB -- "Lưu trữ Event" --> VolumeES
    RabbitMQ -- "Lưu trữ Message" --> VolumeMQ
```

### Các công cụ triển khai:
1. **Docker Engine**: Công cụ ảo hoá mức OS để chạy các container độc lập.
2. **Docker Compose**: Công cụ định nghĩa và quản lý đa container (Multi-container orchestration) thông qua file `docker-compose.yml`. Cho phép khởi chạy Frontend, Backend, RabbitMQ, và EventStoreDB cùng lúc, tự động kết nối chúng vào cùng một mạng (Network) nội bộ.

---

## Hướng dẫn các bước triển khai hệ thống (Deployment Steps)

Để triển khai hệ thống Event Sourcing hoàn chỉnh này lên môi trường local (máy cá nhân), hãy thực hiện các bước sau:

**Bước 1: Chuẩn bị môi trường**
- Cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Hỗ trợ Mac, Windows, Linux).
- Đảm bảo Terminal/Command Prompt có thể chạy lệnh `docker` và `docker-compose`.

**Bước 2: Di chuyển vào thư mục dự án**
Mở Terminal và cd vào thư mục chứa mã nguồn:
```bash
cd /Users/ductri0981/Documents/Software_Architecture/event_sourcing/customer_app
```

**Bước 3: Build và khởi chạy toàn bộ hệ thống**
Sử dụng Docker Compose để tự động tải Image, Build mã nguồn, tạo Volume và chạy các Container ngầm (Chế độ detached `-d`):
```bash
docker-compose up -d --build
```
*Lưu ý (Giao diện công cụ trực tuyến): Khi chạy lệnh này, Docker Desktop sẽ tự động hiển thị cụm stack `customer_app` chạy trên giao diện trực quan của nó.*

**Bước 4: Kiểm tra trạng thái hoạt động**
Để đảm bảo tất cả các container đều đã chạy ổn định và backend đã kết nối thành công tới Database & Broker:
```bash
# Xem danh sách các container đang chạy
docker-compose ps

# Xem log của Backend để xác nhận kết nối
docker-compose logs -f backend
```
*Bạn cần nhìn thấy thông báo như sau trong log Backend:*
```text
Connected to EventStoreDB
Connected to RabbitMQ
Server running on port 5000
```

**Bước 5: Trải nghiệm ứng dụng**
- Truy cập Giao diện Web: Mở trình duyệt và vào địa chỉ **[http://localhost:5173](http://localhost:5173)**
- Bảng điều khiển RabbitMQ: Mở **[http://localhost:15672](http://localhost:15672)** (User: `guest`, Pass: `guest`)
- Bảng điều khiển EventStoreDB: Mở **[http://localhost:2113](http://localhost:2113)**

**Bước 6: Tắt hệ thống (Khi không sử dụng)**
Nếu muốn dừng và xoá bỏ các container (nhưng vẫn giữ lại dữ liệu trong Volumes):
```bash
docker-compose down
```

---

## Sơ đồ góc nhìn Tiến trình (Process View)

Dưới đây là sơ đồ góc nhìn tiến trình (thể hiện bằng Sequence Diagram) cho **chức năng xem/xuất danh sách khách hàng** trong hệ thống Event Sourcing kết hợp CQRS.

Điểm đặc biệt của kiến trúc CQRS là khi truy vấn danh sách (Query), hệ thống sẽ **bỏ qua hoàn toàn luồng Event Sourcing** (Không chạm vào EventStoreDB hay RabbitMQ) mà truy vấn trực tiếp vào **Read Model (SQLite)** để lấy dữ liệu với độ phức tạp `O(1)`, đảm bảo tốc độ phản hồi siêu nhanh.

```mermaid
sequenceDiagram
    autonumber
    actor User as 🌐 Người dùng (Trình duyệt)
    participant UI as 🖥️ Frontend (React)
    participant API as ⚙️ Backend (Express Query Handler)
    participant DB as 🗄️ Read Database (SQLite)

    User->>UI: Truy cập trang "Danh sách khách hàng"
    activate UI
    
    UI->>API: Gửi HTTP GET /api/customers
    activate API
    
    API->>DB: Thực thi Query: SELECT * FROM customers_read
    activate DB
    Note over API,DB: Truy vấn trực tiếp vào bảng Materialized View
    
    DB-->>API: Trả về tập dữ liệu (Array of Customers)
    deactivate DB
    
    API-->>UI: Trả về HTTP 200 OK (Kèm dữ liệu JSON)
    deactivate API
    
    UI->>UI: Render (vẽ) giao diện dạng Bảng (Table)
    UI-->>User: Hiển thị danh sách khách hàng lên màn hình
    deactivate UI
```

### Hướng dẫn thu thập minh chứng (Theo yêu cầu đề bài):
Để nộp kèm bản in giao diện xem danh sách, bạn hãy thực hiện:
1. Mở trình duyệt và truy cập: `http://localhost:5173`.
2. Bấm vào Tab (hoặc nút) **"Danh sách khách hàng"** (Customer List).
3. Chụp ảnh màn hình giao diện danh sách bảng khách hàng đã hiện ra.
4. Chèn hoặc in ảnh đó đính kèm vào báo cáo của bạn.

---

## Sơ đồ Lưu trữ (Storage View)

Trong mô hình Event Sourcing kết hợp CQRS, dữ liệu được chia làm 2 kho lưu trữ biệt lập phục vụ cho 2 mục đích riêng rẽ (Ghi và Đọc). Dưới đây là sơ đồ lưu trữ mô tả cấu trúc của 2 kho dữ liệu này.

```mermaid
erDiagram
    %% Write Model (Event Store)
    "EVENT_STORE (KurrentDB)" {
        String eventId "UUID: Mã định danh event"
        String streamId "Tên stream, VD: customer-<aggregateId>"
        Int revision "Số thứ tự của event trong stream"
        String eventType "Loại event, VD: CustomerCreated"
        JSON data "Payload của event"
        Timestamp created "Thời điểm event được tạo"
    }

    %% Read Model (SQLite)
    "READ_MODEL (SQLite - customers_read)" {
        String id "PK: UUID"
        String customer_id "Mã khách hàng"
        String fullname "Tên đầy đủ"
        String lastname "Họ"
        String date_of_birth "Ngày sinh"
        Float balance "Số dư tài khoản"
        Timestamp updated_at "Lần cập nhật cuối"
    }

    "EVENT_STORE (KurrentDB)" ||--o{ "READ_MODEL (SQLite - customers_read)" : "Projector đồng bộ bất đồng bộ (Qua RabbitMQ)"
```

### Công cụ và Các bước cài đặt sơ đồ lưu trữ

**Công cụ sử dụng:**
- **Write Database:** EventStoreDB (KurrentDB) - Database chuyên biệt dành cho Event Sourcing (Lưu trữ dạng Log-append).
- **Read Database:** SQLite - Database quan hệ nhỏ gọn (RDBMS), phù hợp để tạo các Materialized Views.
- **Message Broker:** RabbitMQ - Đóng vai trò cầu nối dữ liệu.

**Các bước cài đặt lưu trữ:**
1. **Thiết lập EventStoreDB:** Sử dụng Docker Compose để khởi chạy EventStoreDB, bật tính năng Insecure mode (cho môi trường dev) và export các port `2113`.
2. **Khởi tạo bảng Read Model:** Trong file `server.js`, chạy câu lệnh `CREATE TABLE IF NOT EXISTS customers_read (...)` để đảm bảo SQLite có sẵn bảng ngay khi backend khởi động.
3. **Cấu hình Projector:** Cài đặt thư viện `amqplib` (RabbitMQ) và `sqlite3` trong Backend. Map (ánh xạ) cấu trúc JSON (`Payload`) từ KurrentDB sang các cột tương ứng trong bảng `customers_read` của SQLite.
4. **Mount Volume bảo toàn dữ liệu:** Cấu hình Docker Volume để file `database_read.sqlite` lưu vĩnh viễn trên ổ cứng máy Host thay vì bị mất khi container tắt.

---

## Sơ đồ Luồng dữ liệu & Cơ chế tái tạo (Event Replay / Rehydration)

Sơ đồ dưới đây mô tả luồng dữ liệu biến đổi từ trạng thái sơ khai (Empty) đến trạng thái cuối cùng (Final State) thông qua việc áp dụng tuần tự các sự kiện (Events) đã xảy ra trong quá khứ.

```mermaid
flowchart LR
    Start((Trạng thái ban đầu <br> Null / Trống))
    
    Event1[/"Sự kiện 1: <br> CustomerCreated <br> (Tạo mới: Nguyễn A, Số dư: 0)"/]
    State1("Trạng thái 1: <br> {Tên: Nguyễn A, Số dư: 0}")
    
    Event2[/"Sự kiện 2: <br> CustomerUpdated <br> (Nạp tiền, Số dư: 50.000)"/]
    State2("Trạng thái 2: <br> {Tên: Nguyễn A, Số dư: 50.000}")
    
    Event3[/"Sự kiện 3: <br> CustomerUpdated <br> (Đổi tên: Nguyễn Văn A)"/]
    FinalState(("Trạng thái hiện tại <br> {Tên: Nguyễn Văn A, Số dư: 50.000}"))

    Start --> Event1 --> State1
    State1 --> Event2 --> State2
    State2 --> Event3 --> FinalState
```

### Giải thích cơ chế tái tạo lại trạng thái (Event Rehydration)
Trong Event Sourcing, hệ thống **không lưu trạng thái hiện tại** của một đối tượng ở phía Write, mà lưu toàn bộ lịch sử (những gì đã xảy ra). Để biết được trạng thái hiện tại (Ví dụ: tên hiện tại là gì, số dư bao nhiêu), hệ thống sử dụng cơ chế **Tái tạo (Replay/Rehydration)** hay còn gọi là quá trình **Left-Fold**:
1. Khởi tạo một đối tượng khách hàng rỗng (State = Null).
2. Lấy ra toàn bộ sự kiện theo đúng thứ tự thời gian (từ Event đầu tiên đến Event mới nhất) thuộc về Stream của khách hàng đó (VD: `customer-123`).
3. Lặp qua từng sự kiện (Apply event), cập nhật đè (mutate) các thông số lên đối tượng rỗng ở Bước 1.
4. Sau khi duyệt hết sự kiện cuối cùng, trạng thái của đối tượng chính là trạng thái hiện tại chính xác nhất.

### Công cụ và Các bước để tái tạo trạng thái

**Công cụ sử dụng:**
- **Node.js (Backend)**: Đóng vai trò xử lý logic Replay.
- **`@eventstore/db-client` (SDK)**: Cung cấp hàm `readStreamEventsForward` để kéo toàn bộ Event theo thứ tự thời gian.

**Các bước cần thực hiện để tái tạo trạng thái (Replay Events):**
1. **Truy vấn Stream:** Gọi hàm đọc stream từ KurrentDB bằng `esdb.readStreamEventsForward('customer-123', { fromRevision: START })`.
2. **Khởi tạo biến trạng thái:** Tạo một biến rỗng, ví dụ `let currentState = {};`.
3. **Vòng lặp Apply (Giảm dần):** 
   - Dùng vòng lặp `for...of` duyệt qua danh sách events trả về.
   - Nếu `Event = CustomerCreated` -> Cập nhật `currentState` bằng các trường thông tin ban đầu.
   - Nếu `Event = CustomerUpdated` -> Ghi đè (Overwrite) các trường mới (ví dụ: họ tên mới, số dư mới) lên `currentState`.
4. **Đồng bộ vào Read Model (Tuỳ chọn):** Nếu hệ thống bị sập mất file SQLite, ta hoàn toàn có thể viết một đoạn script chạy từ đầu đến cuối cơ chế Replay này cho tất cả khách hàng, sau đó insert hàng loạt `currentState` vừa tính toán được vào bảng `customers_read` để xây dựng lại Read Database từ đầu. Đây là ưu điểm mạnh mẽ nhất của Event Sourcing.
