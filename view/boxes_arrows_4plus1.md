# Trình bày: Boxes and Arrows + 4+1 View Model

Tài liệu này trình bày **toàn bộ 5 Views** của mô hình 4+1, nhưng thay vì dùng các biểu đồ UML phức tạp, chúng ta sẽ áp dụng triệt để phong cách **"Boxes and Arrows" (Khối hộp và Mũi tên)**. Phong cách này mang tính trực quan cao, tự do, tập trung vào việc truyền đạt luồng thông tin và cấu trúc mà không bị gò bó bởi các quy tắc nét đứt/nét liền hay hình khối 3D của UML.

*Ví dụ áp dụng: Hệ thống Đặt vé xem phim (Cinema Booking System)*

---
## 💡 Mẹo siêu tốc: Nhìn vào "Hộp" (Box) là biết View gì!
Vì chúng ta dùng chung một phong cách (Boxes and Arrows) cho tất cả các View, nên cách nhanh nhất để phân biệt là tự hỏi: **"Cái hộp này đại diện cho cái gì?"**

1. **Logical View** ➔ Hộp là **CHỨC NĂNG (Khối nghiệp vụ)**. *(VD: Khối Đặt vé, Khối Thanh toán)*
2. **Process View** ➔ Hộp là **TIẾN TRÌNH (Luồng chạy/Queue)**. *(VD: Background Worker, RabbitMQ)*
3. **Development View** ➔ Hộp là **THƯ MỤC (Code/Thư viện)**. *(VD: Folder Frontend, NPM Package)*
4. **Physical View (Deployment View)** ➔ Hộp là **MÁY CHỦ (Phần cứng/Network)**. *(VD: Ubuntu Server, AWS RDS)*
5. **+1 (Scenarios)** ➔ Hộp là **BƯỚC CHẠY (Hành động)**. *(VD: Bước 1 User Click, Bước 2 Lưu DB)*

---

## 1. Logical View (Góc nhìn Logic)
*   **Mục tiêu:** Thể hiện các cụm chức năng (khối nghiệp vụ) chính của hệ thống và sự tương tác giữa chúng. Không đi sâu vào code hay class.

```mermaid
flowchart TD
    UI["Khối Giao Diện<br/>(Client UI)"]:::box
    Booking["Khối Quản lý Đặt Vé<br/>(Booking Manager)"]:::box
    UserMgmt["Khối Quản lý Tài khoản<br/>(User Manager)"]:::box
    Catalog["Khối Danh mục Phim<br/>(Catalog Manager)"]:::box
    Payment["Khối Xử lý Thanh toán<br/>(Payment Processor)"]:::box

    UI -->|"1. Đăng nhập"| UserMgmt
    UI -->|"2. Xem lịch chiếu"| Catalog
    UI -->|"3. Chọn ghế & Đặt vé"| Booking
    Booking -->|"4. Yêu cầu trừ tiền"| Payment
    Booking -->|"5. Lấy thông tin phim"| Catalog

    classDef box fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000
```
**📝 Giải thích sơ đồ:**
*   Hệ thống được chia thành 4 khối chức năng chính nằm dưới Backend.
*   `UI` gọi `UserMgmt` để xác thực người dùng.
*   Khi người dùng đặt vé, `Booking` sẽ tương tác với `Payment` để thanh toán và đọc dữ liệu phim từ `Catalog`.

---

## 2. Process View (Góc nhìn Tiến trình)
*   **Mục tiêu:** Thể hiện hệ thống khi đang chạy (Runtime). Tập trung vào các luồng (Thread), tiến trình (Process), hàng đợi (Queue) và các tác vụ chạy ngầm.

```mermaid
flowchart LR
    ReqHandler["Tiến trình xử lý Request<br/>(Main Thread)"]:::proc
    MsgQueue["Hàng đợi sự kiện<br/>(RabbitMQ)"]:::queue
    Worker["Tiến trình chạy ngầm<br/>(Background Worker)"]:::proc
    DB[("Database")]:::db

    ReqHandler -->|"1. Ghi dữ liệu vé"| DB
    ReqHandler -->|"2. Bắn sự kiện 'Vé đã tạo'"| MsgQueue
    MsgQueue -->|"3. Phân phối sự kiện"| Worker
    Worker -->|"4. Xử lý gửi Email/SMS<br/>(Bất đồng bộ)"| Worker

    classDef proc fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px,color:#000
    classDef queue fill:#fce4ec,stroke:#c2185b,stroke-width:2px,color:#000
    classDef db fill:#e0f2f1,stroke:#00695c,stroke-width:2px,color:#000
```
**📝 Giải thích sơ đồ:**
*   Hệ thống áp dụng xử lý bất đồng bộ (Asynchronous) để tối ưu hiệu năng.
*   `Main Thread` chỉ lo việc ghi vé vào Database rồi nhanh chóng trả phản hồi cho người dùng.
*   Việc gửi Email/SMS tốn thời gian được đẩy vào `RabbitMQ`. Một `Background Worker` chạy độc lập sẽ lấy sự kiện ra để gửi Email, giúp luồng chính không bị nghẽn (blocking).

---

## 3. Development View (Góc nhìn Phát triển)
*   **Mục tiêu:** Thể hiện cách tổ chức mã nguồn, chia thư mục, gói (package) và sự phụ thuộc thư viện của dự án.

```mermaid
flowchart TD
    subgraph Frontend ["Repository: Frontend (React)"]
        UI_Components["/components (Giao diện)"]
        API_Client["/api (Axios Client)"]
    end
    
    subgraph Backend ["Repository: Backend (NodeJS)"]
        Controllers["/controllers (Nhận Request)"]
        Services["/services (Xử lý nghiệp vụ)"]
        Models["/models (Tương tác Database)"]
    end
    
    subgraph ThirdParty ["Thư viện bên thứ 3 (NPM)"]
        Bcrypt["Bcrypt (Mã hóa MK)"]
        Mongoose["Mongoose (ORM DB)"]
    end

    API_Client -.->|"Call HTTP"| Controllers
    Controllers -->|"Gọi logic"| Services
    Services -->|"Thao tác DB"| Models
    Services -->|"Dùng thư viện"| Bcrypt
    Models -->|"Dùng thư viện"| Mongoose
```
**📝 Giải thích sơ đồ:**
*   Dự án được chia làm 2 kho lưu trữ (Repo) riêng biệt cho Frontend và Backend.
*   Backend tổ chức code theo kiến trúc 3 lớp: Controllers -> Services -> Models. Lớp trên chỉ được gọi lớp ngay dưới nó.
*   Các thư viện bên ngoài (NPM) được quản lý riêng và được gọi vào khi cần thiết (Mongoose cho Database, Bcrypt để bảo mật).

---

## 4. Physical View (Góc nhìn Vật lý / Deployment View)
*   **Mục tiêu:** Thể hiện cách phần mềm được cài đặt lên các máy chủ phần cứng / cloud cụ thể và mạng lưới kết nối.

```mermaid
flowchart TD
    Internet(("Internet"))
    LB["Load Balancer<br/>(AWS ALB)"]:::server
    
    subgraph Private_Network ["Vùng mạng nội bộ (VPC)"]
        App1["Máy chủ App 01<br/>(Ubuntu EC2)"]:::server
        App2["Máy chủ App 02<br/>(Ubuntu EC2)"]:::server
        DB[("Máy chủ Database<br/>(AWS RDS MySQL)")]:::db
        Redis[("Máy chủ Cache<br/>(Redis)")]:::db
    end

    Internet -->|"HTTPS (Port 443)"| LB
    LB -->|"Chuyển tiếp HTTP"| App1
    LB -->|"Chuyển tiếp HTTP"| App2
    App1 -->|"TCP (Port 3306)"| DB
    App2 -->|"TCP (Port 3306)"| DB
    App1 -->|"TCP (Port 6379)"| Redis
    App2 -->|"TCP (Port 6379)"| Redis

    classDef server fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    classDef db fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000
```
**📝 Giải thích sơ đồ:**
*   Người dùng từ Internet kết nối vào hệ thống qua `Load Balancer` thông qua HTTPS.
*   LB phân tải đều cho 2 máy chủ chạy Ứng dụng (`App 01` và `App 02`) nằm trong mạng riêng (Private VPC) để bảo mật.
*   Cả 2 App server đều kết nối chung vào 1 máy chủ Database (MySQL) để lưu dữ liệu lâu dài và 1 máy chủ Redis để lưu Cache tăng tốc độ tải.

---

## 5. "+1" View: Scenarios (Góc nhìn Kịch bản)
*   **Mục tiêu:** Trong phong cách "Boxes & Arrows", thay vì dùng Sequence Diagram phức tạp, ta có thể dùng Flowchart biểu diễn từng bước đi (step-by-step) của 1 luồng công việc nối kết các khối ở 4 View trên lại với nhau.

**Kịch bản: Khách hàng tìm kiếm phim và xem chi tiết**

```mermaid
flowchart TD
    Step1(("1. User gõ 'Avenger'<br/>trên thanh tìm kiếm")):::step
    Step2["2. Frontend gọi API<br/>GET /api/movies?q=Avenger"]:::step
    Step3["3. Controller nhận Request<br/>chuyển cho Catalog Service"]:::step
    Step4{"4. Redis Cache<br/>có dữ liệu không?"}:::decision
    
    Step5_Yes["5a. Lấy từ Cache<br/>và trả về ngay"]:::step
    Step5_No["5b. Query xuống Database<br/>lưu lại vào Cache rồi trả về"]:::step
    
    Step6(("6. Frontend hiển thị<br/>danh sách phim")):::step

    Step1 --> Step2 --> Step3 --> Step4
    Step4 -->|"Có (Cache Hit)"| Step5_Yes --> Step6
    Step4 -->|"Không (Cache Miss)"| Step5_No --> Step6

    classDef step fill:#fff,stroke:#424242,stroke-width:2px,color:#000
    classDef decision fill:#fff9c4,stroke:#fbc02d,stroke-width:2px,color:#000
```
**📝 Giải thích sơ đồ:**
*   Kịch bản chứng minh cách dữ liệu chảy từ Client (Development View) qua Controller (Logical View), tương tác với Redis Cache (Physical View & Process View) để tăng tốc độ truy vấn, sau đó trả ngược kết quả về cho người dùng. Mọi View đều được gắn kết hoàn hảo.
