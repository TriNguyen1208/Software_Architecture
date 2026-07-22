# Hướng dẫn Kiểm thử Khả năng Mở rộng (Scalability Testing) với k6

Tài liệu này hướng dẫn từng bước cách cấu hình và chạy [k6](https://k6.io/) để kiểm thử hiệu năng và khả năng mở rộng (scalability) cho các microservices của bạn.

## 1. Cài đặt k6

### MacOS (Sử dụng Homebrew)
```bash
brew install k6
```

### Windows (Sử dụng Winget hoặc Choco)
```bash
winget install k6
# Hoặc
choco install k6
```

### Linux (Debian/Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## 2. Tạo kịch bản kiểm thử (Test Script)

Tạo một file có tên `script_test.js` trong thư mục `scalability` này với nội dung cơ bản sau. Kịch bản này sẽ giả lập các mức tải khác nhau để kiểm tra khả năng mở rộng của hệ thống (ví dụ hệ thống có tự scale-out pods trên k8s kịp thời hay không):


## 3. Cấu hình kiểm thử cho Scalability

Trong bài test trên, phần `stages` định nghĩa cách tải tăng lên:
- Tăng từ từ lên mức tải bình thường.
- Tăng đột biến (spike) lên mức tải cao hơn để xem hệ thống có scale out (ví dụ: Kubernetes HPA tạo thêm pods) kịp thời không.
- Chờ hệ thống xử lý mức tải cao.
- Trở về 0.

**Trong lúc chạy k6, bạn nên mở một terminal khác và theo dõi số lượng pods của service đang được test để thấy HPA hoạt động:**
```bash
kubectl get hpa -w
# Hoặc xem số lượng pod để biết quá trình scale out/scale in
kubectl get pods -w
```

## 4. Chạy kịch bản kiểm thử

Mở terminal tại thư mục `scalability` và chạy lệnh. **Lưu ý:** Chúng ta sử dụng cờ `-e` để truyền biến môi trường `TARGET_URL` trực tiếp từ terminal vào trong script k6, giúp bạn không cần phải sửa code script mỗi khi đổi địa chỉ IP.

```bash
# Trực tiếp truyền địa chỉ URL cần test từ terminal
k6 run -e TARGET_URL=http://192.168.1.10/productpage script_test.js
```

### Các tuỳ chọn chạy k6 hữu ích

- **Ghi kết quả ra file để phân tích, báo cáo:**
  Nếu bạn cần nộp báo cáo hoặc vẽ biểu đồ, bạn có thể vừa truyền URL vừa yêu cầu k6 xuất kết quả ra file (JSON hoặc CSV):
  ```bash
  k6 run -e TARGET_URL=http://localhost/productpage --out json=results.json script_test.js
  
  # Xuất ra định dạng CSV:
  k6 run -e TARGET_URL=http://localhost/productpage --out csv=results.csv script_test.js
  ```

- **Ghi đè cấu hình (options) trực tiếp từ dòng lệnh (Command line):**
  Bạn có thể bỏ qua cấu hình trong file `options` bằng cách truyền cờ (flags) lúc chạy kịch bản. Rất hữu ích nếu muốn test nhanh mà không cần sửa code:
  ```bash
  k6 run --vus 50 --duration 2m script_test.js
  ```

## 5. Phân tích kết quả

Sau khi test xong, k6 sẽ in ra một bảng thống kê chi tiết trên terminal:

- `http_reqs`: Tổng số request đã gửi đi.
- `http_req_duration`: Thời gian phản hồi trung bình (avg), med, min, max, p(90), p(95). Đây là thông số quan trọng nhất để xem API có bị chậm khi tải cao không.
- `http_req_failed`: Tỉ lệ request bị lỗi (do timeout, 50x lỗi server,...).
- `vus` và `vus_max`: Số lượng virtual users đã được sử dụng.

**Cách đánh giá Khả năng mở rộng (Scalability):** 
Nếu hệ thống của bạn có cấu hình auto-scaling tốt (như HPA trong Kubernetes), bạn sẽ thấy thời gian phản hồi (`http_req_duration`) hoặc số lượng lỗi (`http_req_failed`) có thể cao lúc đầu khi tải vừa tăng vọt, sau đó sẽ ổn định lại khi có thêm pods mới được tạo ra để chia sẻ tải trọng.
