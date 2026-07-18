# 📚 Hướng Dẫn Ôn Thi Giữa Kỳ: Kiến Trúc Phần Mềm (Software Architecture)

Dựa trên những lưu ý từ giảng viên, tài liệu này tổng hợp lại toàn bộ kiến thức cốt lõi giúp bạn tránh được các "bẫy" khái niệm thường gặp khi đi thi và làm bài tập lớn.

---

## 1. Phương Pháp Biểu Diễn Kiến Trúc
Khi thiết kế kiến trúc, bạn cần kết hợp giữa **Ký hiệu (Notation)** và **Mô hình kiến trúc (Architecture Model)**. Theo đề cương, bạn có thể chọn 1 trong 3 cách:

1. **UML + Views:** Dùng chuẩn UML khắt khe (Class, Sequence, Component, Deployment...) để vẽ các View (như 4+1).
2. **Boxes and Arrows + Views:** Dùng các khối hộp và mũi tên tự do (không bị gò bó bởi luật UML, dễ vẽ, dễ hiểu) để vẽ các View.
3. **Boxes and Arrows + C4 Models:** Dùng khối hộp và mũi tên để vẽ theo mô hình C4 (Context, Container, Component, Code).

> **⚠️ QUY TẮC VÀNG (BẮT BUỘC NHỚ):** Việc vẽ sơ đồ **luôn luôn** phải đi kèm với **giải thích bằng chữ** (text description). Nếu bạn chỉ vẽ một sơ đồ thật đẹp nhưng không có đoạn văn giải thích các khối (Component/Box) đó làm nhiệm vụ gì, mũi tên đó truyền dữ liệu gì, thì sơ đồ đó vô giá trị và sẽ bị mất điểm!

---

## 2. Bẫy khái niệm: Phân biệt VIEW vs UML MODEL
Rất nhiều sinh viên nhầm lẫn rằng: *"Vẽ đủ 4 cái hình UML (Package, Component, Deployment, Artifact) là đã có đủ 4 Views"*. **ĐÂY LÀ SAI LẦM CHÍNH TRONG LÝ THUYẾT!**

*   **View (Góc nhìn / Mối quan tâm):** Là một lăng kính nhìn vào hệ thống để giải quyết một vấn đề, hoặc một mối quan tâm (concern) của một nhóm Stakeholders cụ thể. (Ví dụ: Logical View quan tâm đến chức năng, Physical View quan tâm đến hạ tầng).
*   **UML Model (Sơ đồ UML):** Chỉ là **công cụ / ngôn ngữ ký hiệu** áp dụng các quy tắc để vẽ cái View đó ra.

**Ví dụ thực tế:** 
Để thể hiện **Logical View**, bạn có thể dùng *UML Class Diagram*. 
Để thể hiện **Physical View**, bạn dùng *UML Deployment Diagram*. 
👉 **Kết luận:** 4 sơ đồ UML không đồng nghĩa với 4 Views. UML chỉ là "cây bút", còn View là "bức tranh" muốn truyền tải!

---

## 3. Cần vẽ bao nhiêu View là đủ?
Không có một con số giới hạn cụ thể. Một kiến trúc được coi là "đủ" khi:
1. Mã nguồn có thể bắt đầu được code dựa trên tài liệu đó.
2. Ban quản lý (Management) không có yêu cầu giải trình thêm.

Tuy nhiên, **mức tối thiểu (chuẩn mực thông thường)** bắt buộc phải có là:
*   **Mô hình 4+1 Views** (Hoặc C4 Model nếu bạn chọn C4).
*   **Database Schema (Lược đồ CSDL):** ERD Diagram để thể hiện cách lưu trữ dữ liệu - vì dữ liệu là trái tim của mọi hệ thống.

---

## 4. Các View Bổ Sung (Dựa trên Quality Attributes)
Chất lượng hệ thống (Quality Attributes - QA) như tính bảo mật, hiệu năng, tính sẵn sàng... sẽ quyết định bạn có cần vẽ thêm View hay không. Nhóm phát triển và ban quản lý quan tâm tới QA nào thì phải có View chứng minh QA đó:

### 4.1. Security View (Góc nhìn Bảo mật)
*   **Khi nào dùng:** Khi đề tài hoặc hệ thống có yêu cầu nghiêm ngặt về phân quyền, bảo vệ dữ liệu, chống tấn công (VD: App ngân hàng, App y tế).
*   **Mối quan tâm (Concerns):** Authentication (Xác thực), Authorization (Phân quyền), Data Encryption (Mã hóa), Firewall, Trust Boundaries (Vùng tin cậy).
*   **Sơ đồ thường dùng:** Sơ đồ luồng dữ liệu (Data Flow Diagram) có khoanh vùng bảo mật, hoặc Sequence Diagram mô tả luồng Đăng nhập (OAuth2 / JWT).

### 4.2. Concurrency View (Góc nhìn Đồng thời / Hiệu năng)
*   **Khi nào dùng:** Khi hệ thống yêu cầu hiệu năng cao, xử lý hàng ngàn/triệu request cùng lúc (VD: Hệ thống đặt vé máy bay, Sàn thương mại điện tử giờ Flash sale).
*   **Mối quan tâm (Concerns):** Quản lý Thread/Process, Deadlock, Resource sharing (chia sẻ tài nguyên), Race conditions, Xử lý bất đồng bộ (Message Queue).
*   **Sơ đồ thường dùng:** Activity Diagram với các Swimlanes, hoặc State Machine Diagram mô tả vòng đời của luồng (Thread lifecycle), Sequence diagram mô tả giao tiếp bất đồng bộ qua Kafka/RabbitMQ.

---

## 5. ✅ Tổng kết Checklist trước khi nộp bài / Làm bài thi
- [ ] Đã thống nhất 1 phong cách vẽ xuyên suốt chưa? (UML hoặc Boxes & Arrows).
- [ ] Đã thống nhất khung kiến trúc chưa? (Views hoặc C4).
- [ ] Đã có **giải thích chi tiết bằng chữ** cho TẤT CẢ các sơ đồ chưa?
- [ ] Sơ đồ UML (nếu dùng) có bị dùng sai mục đích cho View không?
- [ ] Đã có tối thiểu 4+1 View (hoặc C4) và Database Schema chưa?
- [ ] Đề bài (hoặc Ban quản lý) có nhấn mạnh tính chất đặc thù nào (Bảo mật, Chịu tải cao) để phải vẽ thêm Security/Concurrency View không?
