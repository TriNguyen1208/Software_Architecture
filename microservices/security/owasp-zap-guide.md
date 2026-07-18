# Hướng dẫn từng bước sử dụng OWASP ZAP

OWASP ZAP (Zed Attack Proxy) là một công cụ mã nguồn mở được sử dụng rộng rãi để kiểm thử bảo mật tự động và thủ công cho các ứng dụng web. Dưới đây là hướng dẫn từng bước để bạn có thể bắt đầu sử dụng ZAP để quét lỗ hổng ứng dụng của mình.

## 1. Cài đặt OWASP ZAP

Có nhiều cách để cài đặt ZAP, nhưng phổ biến nhất là:
- **Tải bộ cài đặt:** Truy cập [trang web chính thức của ZAP](https://www.zaproxy.org/download/) và tải phiên bản phù hợp với hệ điều hành của bạn (Windows, Linux, macOS).
- **Sử dụng Docker (Khuyên dùng cho CI/CD hoặc môi trường sạch):**
  ```bash
  docker pull zaproxy/zap-stable
  # Chạy ZAP UI qua Webswing (truy cập qua trình duyệt)
  # Thêm cờ -d (ví dụ: docker run -d ...) nếu bạn muốn chạy ngầm
  docker run -u zap -p 8080:8080 -p 8090:8090 -i zaproxy/zap-stable zap-webswing.sh
  ```

## 2. Khởi động và Thiết lập ban đầu

1. **Khởi động ZAP:** Mở ứng dụng ZAP bạn vừa cài đặt.
2. **Chọn chế độ lưu phiên làm việc:** Khi mở lần đầu, ZAP sẽ hỏi bạn có muốn lưu phiên làm việc không (Persisting the Session).
   - Nếu bạn chỉ muốn quét thử nhanh: Chọn *“No, I do not want to persist this session at this moment in time”*.
   - Nếu bạn muốn lưu lại kết quả để xem lại sau: Chọn *“Yes, I want to persist this session...”*.
3. **Giao diện chính:** Giao diện ZAP chia làm 3 phần chính:
   - **Cây thư mục (Tree Window):** Chứa cấu trúc ứng dụng (Sites) và danh sách các request/response.
   - **Khu vực làm việc (Workspace Window):** Nơi hiển thị các tab như Quick Start, Request, Response, v.v.
   - **Khu vực thông tin (Information Window):** Hiển thị History, Alerts (Cảnh báo lỗ hổng), Spider, Active Scan, v.v.

## 3. Cách 1: Sử dụng tính năng Quét Tự Động (Automated Scan)

Đây là cách nhanh nhất để quét một ứng dụng.

1. Trong tab **Workspace Window**, chuyển đến tab **Quick Start**.
2. Nhấn vào nút **Automated Scan**.
3. Tại ô **URL to attack**, nhập địa chỉ ứng dụng web của bạn (Ví dụ: `http://localhost:3000` hoặc địa chỉ IP của ứng dụng trên Kubernetes).
4. (Tùy chọn) Chọn trình duyệt bạn muốn ZAP sử dụng để mô phỏng (Firefox/Chrome).
5. Nhấn nút **Attack**.
6. **Quá trình diễn ra:**
   - ZAP sẽ tự động chạy **Spider** (Thu thập các đường dẫn, trang web có trong URL).
   - Sau đó chạy **Active Scan** (Tấn công chủ động để tìm lỗ hổng SQLi, XSS,...).
7. Chuyển sang tab **Alerts** ở phía dưới để xem kết quả trực tiếp khi ZAP đang chạy.

## 4. Cách 2: Quét Thủ Công kết hợp (Manual Explore)

Cách này hiệu quả hơn khi ứng dụng của bạn yêu cầu đăng nhập hoặc có luồng nghiệp vụ phức tạp.

1. Chuyển đến tab **Quick Start** > Chọn **Manual Explore**.
2. Nhập **URL** của ứng dụng.
3. Chọn trình duyệt bạn muốn khởi chạy, sau đó nhấn **Launch Browser**.
4. ZAP sẽ mở một trình duyệt đặc biệt đã được cấu hình proxy sẵn để đi qua ZAP.
5. Bạn tiến hành duyệt web bình thường trên trình duyệt đó: **Đăng nhập, click vào các link, điền form, thực hiện các thao tác chức năng.**
6. Tất cả các request bạn thực hiện sẽ được ZAP ghi lại trong mục **Sites** (cây thư mục bên trái).
7. **Thực hiện quét:**
   - Sau khi bạn đã duyệt đủ các chức năng, quay lại ZAP.
   - Chuột phải vào URL ứng dụng của bạn trong mục **Sites** bên trái.
   - Chọn **Attack** > **Active Scan...**.
   - ZAP sẽ sử dụng các request bạn vừa thực hiện (bao gồm cả cookie/token đăng nhập) để tiến hành tấn công.

## 5. Phân tích Cảnh báo (Alerts)

Sau khi Spider hoặc Active Scan hoàn tất, bạn cần phân tích kết quả.

1. Chuyển xuống khu vực **Information Window** (phía dưới màn hình) và chọn tab **Alerts**.
2. Các lỗ hổng sẽ được phân loại theo mức độ nghiêm trọng bằng cờ màu:
   - **Đỏ:** High (Nghiêm trọng - Cần fix ngay, ví dụ: SQL Injection).
   - **Cam:** Medium (Trung bình - XSS, CSRF...).
   - **Vàng:** Low (Thấp - Rò rỉ thông tin, cấu hình sai).
   - **Xanh dương:** Informational (Thông tin - Header thiếu...).
3. Nhấp vào một cảnh báo cụ thể để xem chi tiết:
   - **Description:** Mô tả lỗ hổng.
   - **URL:** Đường dẫn bị lỗi.
   - **Attack:** Payload đã sử dụng để tấn công.
   - **Evidence:** Bằng chứng cho thấy lỗ hổng tồn tại trong Response.
   - **Solution:** Cách khắc phục (rất hữu ích cho developer).

## 6. Xuất Báo cáo (Report)

Sau khi hoàn tất quá trình kiểm tra, bạn nên xuất báo cáo để lưu trữ hoặc gửi cho team.

1. Trên thanh menu, chọn **Report** > **Generate Report...**.
2. Đặt tên báo cáo (File name).
3. Chọn định dạng báo cáo (Template), thường dùng **Traditional HTML Report** hoặc **Traditional PDF Report**.
4. Chọn vị trí lưu và nhấn **Generate Report**.

---

### 💡 Lời khuyên khi sử dụng ZAP
- **Không bao giờ quét ứng dụng không thuộc quyền sở hữu của bạn** nếu không có sự cho phép.
- Đối với môi trường Microservices/Kubernetes, bạn có thể port-forward service ra ngoài `localhost` và cấu hình ZAP quét vào địa chỉ `localhost:port` đó.
- Hãy kết hợp **Manual Explore** (tự bấm các luồng đăng nhập) rồi mới **Active Scan** để ZAP có thể quét các trang yêu cầu xác thực.
