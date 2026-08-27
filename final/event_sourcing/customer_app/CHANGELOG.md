# Changelog: Event Sourcing & SQLite Migration

Dưới đây là danh sách toàn bộ các chỉnh sửa đã được thực hiện trên hệ thống (cả Frontend và Backend) để chuyển đổi từ mô hình CRUD cơ bản sang kiến trúc **Pure Event Sourcing** với **SQLite**.

## 1. 🏗 Kiến trúc & Cơ sở hạ tầng (Infrastructure)
- **Gỡ bỏ PostgreSQL**: Xoá hoàn toàn service `db` chạy PostgreSQL khỏi `docker-compose.yml` nhằm giảm tải tài nguyên hệ thống.
- **Tích hợp SQLite**: Thay thế bằng cơ sở dữ liệu SQLite nhẹ nhàng, lưu trữ cục bộ tại thư mục `./data/database.sqlite`.
- **Ánh xạ Volume**: Cấu hình volume `./data:/app/data` trong Docker Compose để đảm bảo dữ liệu không bị mất khi khởi động lại container backend.
- **Tối ưu Docker**: Bổ sung file `.dockerignore` cho cả `frontend/` và `backend/` để loại bỏ `node_modules` của máy host, ngăn chặn lỗi "Exec format error" do sai lệch kiến trúc hệ điều hành giữa máy host (Mac/Windows) và container (Linux Alpine).

## 2. 🔙 Backend (Node.js)
- **Đổi Database Driver**: Gỡ bỏ thư viện `pg` (Postgres) và cài đặt thư viện `sqlite3`, `sqlite` trong `package.json`.
- **Tự động khởi tạo Database**: Viết lại file `server.js`, bổ sung hàm `initDB()` để tự động tạo file `database.sqlite` và bảng `events` ngay khi server khởi động (loại bỏ hoàn toàn sự phụ thuộc vào file `init.sql`).
- **Thiết kế Pure Event Sourcing**:
  - Không còn lưu trạng thái hiện tại (current state) của dữ liệu.
  - **POST `/api/customers`**: Thay vì INSERT thông tin vào bảng customers, giờ đây chỉ khởi tạo một event `CustomerCreated`.
  - **PUT `/api/customers/:id`**: Tải toàn bộ events của customer đó, dựng lại dữ liệu in-memory, so sánh (diff) với dữ liệu mới từ request để tìm ra chính xác field nào bị thay đổi, sau đó ghi event `CustomerUpdated` kèm diff.
  - **DELETE `/api/customers/:id`**: Ghi một event `CustomerDeleted` thay vì dùng lệnh `DELETE FROM ...`.
  - **GET `/api/customers`**: Tải **toàn bộ** event list trong database, chạy vòng lặp để dựng lại dữ liệu hiện tại (in-memory projection) của tất cả khách hàng và trả về cho frontend.
  - **GET `/api/customers/:id/events`**: Cung cấp API mới để truy xuất toàn bộ lịch sử thay đổi của một khách hàng cụ thể.

## 3. 🎨 Frontend (ReactJS)
- **Tích hợp tính năng Audit Log (Lịch sử)**: 
  - Thêm nút "Logs" cho từng khách hàng trên component `CustomerList.jsx`.
  - Xây dựng Modal giao diện "Timeline" (dòng thời gian) để hiển thị chi tiết từng thay đổi (từ giá trị cũ sang giá trị mới).
- **Hoàn thiện tính năng Delete**: Thêm nút "Delete" gọi trực tiếp xuống API xoá của backend.
- **Cải tiến UI/UX**:
  - Cập nhật file `index.css` với các hiệu ứng Glassmorphism.
  - Thêm style cho Modal Timeline (dấu chấm tròn `.timeline-dot`, đường kẻ dọc `.timeline`, và màu sắc phân biệt giá trị cũ `.old-val` bị gạch ngang đỏ, giá trị mới `.new-val` màu xanh).

- **Trang Lịch sử Toàn Hệ thống (Global History)**:
  - Thêm một thanh điều hướng (Navbar) ở trên cùng để dễ dàng chuyển qua lại giữa các trang.
  - Bổ sung trang `/history` (component `GlobalHistory.jsx`) để hiển thị toàn bộ lịch sử các sự kiện diễn ra trong hệ thống theo thứ tự thời gian thực.
  - Trực quan hoá dữ liệu (các sự kiện Tạo, Xoá, Cập nhật) của toàn bộ khách hàng trên cùng một giao diện Timeline duy nhất.

## 4. 🗑 Dọn dẹp mã nguồn (Cleanup)
- Xoá bỏ hoàn toàn thư mục `database/` (và file `init.sql`).
- Xoá bỏ các Environment Variables không cần thiết (như DB_USER, DB_PASSWORD, DB_NAME, DB_HOST) khỏi `docker-compose.yml`.
