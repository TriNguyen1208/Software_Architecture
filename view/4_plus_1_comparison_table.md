# 📊 Bảng So Sánh Chi Tiết 5 Loại View (4+1 View Model)

Đây là bảng tổng hợp ngắn gọn, mang tính chất "phao cứu sinh" (Cheat-sheet) để bạn ôn tập nhanh trước khi thi. Bảng này so sánh 5 góc nhìn dựa trên các tiêu chí cốt lõi nhất.

| Tên View | Mối quan tâm chính (Core Concern) | Thành phần cốt lõi (Boxes đại diện cho gì?) | Đối tượng hướng tới (Stakeholders) | Sơ đồ UML tiêu biểu |
| :--- | :--- | :--- | :--- | :--- |
| **1. Logical View**<br/>*(Góc nhìn Logic)* | Hệ thống có chức năng gì? Cấu trúc tĩnh của các thực thể nghiệp vụ (Domain logic) ra sao? | **Các Lớp (Classes), Thực thể, Component chức năng.** | Phân tích viên (BA), Người thiết kế hệ thống, Sếp. | Class Diagram,<br/>Component Diagram,<br/>State Machine Diagram. |
| **2. Process View**<br/>*(Góc nhìn Tiến trình)* | Hệ thống chạy như thế nào? Xử lý đồng thời (Concurrency), hiệu năng, chịu tải, đồng bộ/bất đồng bộ. | **Các Tiến trình (Processes), Luồng (Threads), Hàng đợi (Queues).** | Kỹ sư tích hợp hệ thống, Kỹ sư tối ưu hiệu năng. | Activity Diagram (có swimlanes),<br/>Sequence Diagram (nhấn mạnh Async). |
| **3. Development View**<br/>*(Góc nhìn Phát triển)* | Code được tổ chức như thế nào? Phân chia thư mục, thư viện, quản lý source code ra sao? | **Các Gói (Packages), Thư viện, Module, Tệp tin mã nguồn.** | Lập trình viên (Developers), Quản lý dự án (PM). | Package Diagram,<br/>Component Diagram. |
| **4. Physical View**<br/>*(Góc nhìn Vật lý/Deployment)* | Phần mềm được cài đặt lên đâu? Cấu trúc mạng (Network), Máy chủ, Cloud topology. | **Các Máy chủ (Servers/Nodes), Hạ tầng mạng, CSDL vật lý.** | Kỹ sư Hệ thống (System Engineers), DevOps, Quản trị mạng. | Deployment Diagram. |
| **5. Scenarios (+1)**<br/>*(Góc nhìn Kịch bản)* | Hệ thống giải quyết một chuỗi công việc thực tế của User như thế nào? (Gắn kết 4 View trên lại với nhau). | **Các Bước hành động (Steps), Tác nhân (Actors).** | Tất cả mọi người (Bao gồm cả Khách hàng và Tester). | Use Case Diagram,<br/>Sequence Diagram,<br/>Activity Diagram. |

---

### 💡 Mẹo đọc bảng:
- Khi đề bài yêu cầu **"Làm sao để team DevOps biết cách deploy web lên AWS?"** ➔ Bạn cần vẽ **Physical View (Deployment Diagram)**.
- Khi đề bài yêu cầu **"Làm sao để biết hệ thống chia làm mấy Layer (Controller, Service, Repository)?"** ➔ Bạn cần vẽ **Development View (Package Diagram)**.
- Khi đề bài yêu cầu **"Làm sao để biết giỏ hàng tính tiền như thế nào?"** ➔ Bạn cần vẽ **Logical View (Class Diagram)**.
- Khi đề bài yêu cầu **"Làm sao để biết xử lý 10.000 người mua hàng cùng lúc mà không sập?"** ➔ Bạn cần vẽ **Process View (Activity Diagram với Queues/Threads)**.
