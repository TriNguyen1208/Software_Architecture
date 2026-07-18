# So sánh 3 Phong cách Biểu diễn Kiến trúc

Giảng viên của bạn đã đưa ra 3 lựa chọn về cách trình bày đồ án/bài thi:
1. **UML + Views**
2. **Boxes and Arrows + Views**
3. **Boxes and Arrows + C4 Models**

Điểm cốt lõi ở đây là sự kết hợp (mix & match) giữa **Ký hiệu (Notation)** và **Bộ khung (Framework/Model)**.
- **Ký hiệu:** Bạn dùng bộ quy tắc nào để vẽ? (Dùng luật UML khắt khe hay dùng Khối hộp & Mũi tên tự do).
- **Bộ khung:** Bạn dùng danh sách các View nào? (Dùng nhóm 4+1 View hay dùng nhóm 4 Level của C4 Model).

Dưới đây là ví dụ minh họa sự khác biệt của cả 3 phong cách, cùng áp dụng cho một **Hệ thống xử lý Đơn hàng (Order System)** để bạn dễ so sánh bằng mắt thường.

---

## 1. Phong cách "UML + Views"
*   **Ký hiệu:** UML (Unified Modeling Language). Khi đã chọn UML, bạn **phải tuân thủ chuẩn ký hiệu quốc tế**. Class có 3 ngăn, Interface dùng đường đứt nét với mũi tên rỗng (Realization), Component phải có icon đặc trưng... Nếu vẽ bừa sẽ bị chấm là "vẽ sai UML".
*   **Bộ khung:** 4+1 Views (Ví dụ dưới đây là **Logical View** sử dụng UML Class Diagram).

```mermaid
classDiagram
    %% UML tuân thủ chặt chẽ ký hiệu Class và quan hệ
    class OrderController {
        +createOrder(cart)
    }
    class OrderService {
        <<interface>>
        +process(order)
    }
    class OrderServiceImpl {
        -PaymentGateway payment
        +process(order)
    }
    class PaymentGateway {
        <<interface>>
        +charge(amount)
    }
    
    OrderController --> OrderService : Dependency
    OrderServiceImpl ..|> OrderService : Realization (Implements)
    OrderServiceImpl --> PaymentGateway : Dependency
```
*Nhận xét:* Nhìn rất học thuật, chuẩn xác tới từng hàm/biến, nhưng đôi khi khô khan và khó hiểu với người không biết code (Ví dụ: Giám đốc kinh doanh).

---

## 2. Phong cách "Boxes and Arrows + Views"
*   **Ký hiệu:** Boxes and Arrows (Khối hộp và Mũi tên). Vẽ tự do, linh hoạt. Miễn là có hộp (box) đại diện cho một cụm xử lý, và mũi tên (arrow) đại diện cho chiều luồng dữ liệu. Không ai được quyền bắt bẻ bạn vẽ sai luật!
*   **Bộ khung:** 4+1 Views (Ví dụ dưới đây là **Physical View** - Góc nhìn Vật lý).

```mermaid
flowchart LR
    %% Vẽ tự do không cần tuân thủ ký hiệu Node 3D phức tạp của UML Deployment Diagram
    User((Khách hàng))
    
    subgraph AWS [Đám mây AWS]
        Web["Web Server<br/>(Nginx)"]:::box
        App["App Server<br/>(NodeJS)"]:::box
        DB[("Database<br/>(MySQL)")]:::box
    end
    
    User -->|"Truy cập Web"| Web
    Web -->|"Gọi API"| App
    App -->|"Truy vấn SQL"| DB

    classDef box fill:#e1f5fe,stroke:#03a9f4,stroke-width:2px,color:#000
```
*Nhận xét:* Dễ vẽ, cực kỳ dễ hiểu. Dùng cho slide thuyết trình rất tốt.

---

## 3. Phong cách "Boxes and Arrows + C4 Models"
*   **Ký hiệu:** Khối hộp và Mũi tên tự do (tương tự số 2).
*   **Bộ khung:** C4 Model (Context, Container, Component, Code). Bộ khung C4 ép buộc một tiêu chuẩn trình bày chữ bên trong hộp rất khoa học: **[Tên] + [Loại / Công nghệ] + [Mô tả ngắn]**, và mũi tên phải ghi rõ **Giao thức**.

Ví dụ dưới đây là **Container View (Level 2 của C4)**:

```mermaid
flowchart TD
    %% Boxes and Arrows mang phong cách trình bày chữ đặc trưng của C4
    User(("Khách hàng<br/>[Person]<br/><br/>Người mua hàng trên web")):::person
    
    WebApp["Web Application<br/>[Container: ReactJS]<br/><br/>Giao diện mua sắm trực tuyến"]:::internal
    API["API Application<br/>[Container: Java Spring Boot]<br/><br/>Xử lý logic đơn hàng"]:::internal
    DB[("Database<br/>[Container: PostgreSQL]<br/><br/>Lưu trữ dữ liệu hệ thống")]:::db
    Momo["Cổng thanh toán Momo<br/>[Software System]<br/><br/>Bên thứ 3 xử lý tiền"]:::external

    User -->|"1. Xem hàng, Đặt hàng<br/>[HTTPS]"| WebApp
    WebApp -->|"2. Gọi API REST<br/>[JSON/HTTPS]"| API
    API -->|"3. Đọc/Ghi dữ liệu<br/>[JDBC]"| DB
    API -->|"4. Yêu cầu trừ tiền<br/>[HTTPS]"| Momo

    %% Màu sắc chuẩn thường thấy của C4 Model
    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef internal fill:#1168bd,color:#fff,stroke:#0b4884
    classDef db fill:#438dd5,color:#fff,stroke:#2d69a6
    classDef external fill:#999999,color:#fff,stroke:#666666
```
*Nhận xét:* Đây là phong cách được ưa chuộng nhất hiện nay trong công nghiệp phần mềm (Agile/Microservices). Nó kết hợp sự thân thiện của "Khối hộp tự do" và tính kỷ luật tuyệt vời của "C4 Model" (chỉ cần nhìn vào 1 cái hộp là biết ngay công nghệ gì, làm nhiệm vụ gì).

---
## 💡 Lời khuyên khi làm bài thi
- Nếu thầy/cô bạn khắt khe về tính hàn lâm, học thuật: Hãy chọn **Số 1**.
- Nếu bạn muốn vẽ nhanh, không sợ bị bắt bẻ sai nét đứt/nét liền: Hãy chọn **Số 2**.
- Nếu bạn muốn bản thiết kế nhìn siêu chuyên nghiệp, sát với chuẩn các công ty công nghệ lớn đang làm, được đánh giá cao: Khuyên dùng **Số 3**.
