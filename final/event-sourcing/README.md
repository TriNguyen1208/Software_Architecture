# CustomerHub

Ứng dụng quản lý thông tin khách hàng gồm form nhập liệu, trang danh sách và Event Sourcing bằng SQLite.

## Chạy ứng dụng

Chạy ứng dụng:

   ```bash
   cd KienTrucW09
   npm start
   ```

Mở http://localhost:3000 trong trình duyệt.

## API

- `GET /api/customers` — lấy danh sách khách hàng.
- `POST /api/customers` — thêm khách hàng với `firstName`, `lastName`, `customerId`, `dateOfBirth`, `balance`.
- `PUT /api/customers/:id` — cập nhật khách hàng bằng cách ghi event mới.
- `DELETE /api/customers/:id` — ẩn khách hàng bằng cách ghi event `CustomerDeleted` mới.
- `GET /api/customers/:id/events` — lấy lịch sử event, mới nhất trước.

`customer_events` là Event Store, gồm: `event_id`, `event_type`, `event_name`, `event_data`, `created_at`. `event_id` là mã stream/customer và có thể lặp lại qua nhiều event; `event_type` là `Customer`; `event_name` là `CustomerCreated`, `CustomerUpdated` hoặc `CustomerDeleted`. Backend chỉ `INSERT` event, event cũ không bị cập nhật/xóa.

Thêm bảng `customers` làm snapshot/read model. Background worker chạy mỗi giây, lấy event theo `created_at`, gộp dữ liệu cũ → mới thành một JSON `snapshot_data` và lưu một bản ghi/customer. Danh sách và form sửa đọc bảng `customers`, vì vậy không cần replay toàn bộ event mỗi lần hiển thị. Event Store vẫn giữ lịch sử để audit hoặc dựng lại snapshot khi cần.

Database mặc định là `data/customer-events.db`; có thể đổi file bằng biến môi trường `DATABASE_FILE`.
