# Giải thích Kiến trúc Bookinfo

Tài liệu này giải thích các khái niệm kiến trúc nền tảng và cách chúng áp dụng vào demo Bookinfo.

## 1. Microservice
Trong Bookinfo, kiến trúc nguyên khối (monolith) được chia nhỏ thành các **microservice**:
- Mỗi service đảm nhiệm một trách nhiệm riêng (ví dụ: `productpage` lo giao diện, `details` cung cấp thông tin sách, `reviews` quản lý đánh giá).
- Các service giao tiếp qua network thông qua HTTP API.
- Có thể triển khai và scale độc lập.
- Bookinfo là ứng dụng polyglot: `productpage` viết bằng Python, `details` bằng Ruby, `reviews` bằng Java, và `ratings` bằng Node.js.

## 2. Kubernetes
Kubernetes là nền tảng quản lý container (orchestration).

### Pod
Đơn vị chạy nhỏ nhất trong Kubernetes. Trong demo có Istio sidecar, một Pod sẽ chứa 2 container:
`Application container (app) + istio-proxy container (sidecar)`

### Deployment
Quản lý ReplicaSet và vòng đời Pod. Dùng để tạo Pod, restart Pod, scale số lượng replica và thực hiện rolling update.
Ví dụ: `reviews-v1`, `reviews-v2`, `reviews-v3` là 3 Deployments khác nhau.

### Service
Cung cấp địa chỉ mạng ổn định (DNS name và Virtual IP) cho các Pod. 
Deployment tạo và quản lý Pod. Service tìm Pod thông qua label selector. Service không phải "application service" theo nghĩa source code, mà là định tuyến mạng.
Ví dụ: Service `reviews` sẽ định tuyến traffic đến tất cả Pod của `reviews-v1`, `v2`, và `v3` dựa trên label `app: reviews`.

### Namespace
Không gian logic chứa tài nguyên Kubernetes. 
Sử dụng label `istio-injection=enabled` trên namespace sẽ cho phép Istio tự động inject Envoy sidecar vào bất kỳ Pod mới nào được tạo trong namespace đó.

## 3. Istio và Service Mesh
- Istio là một **service mesh**. Istio không thay thế Kubernetes, mà Kubernetes chịu trách nhiệm scheduling, deployment và service discovery cơ bản.
- Istio bổ sung lớp quản lý traffic (traffic management), bảo mật (security) và giám sát (observability).
- Nhờ Istio, Application không cần tự viết logic routing phức tạp (retry, circuit breaking) vào source code.

## 4. Envoy Sidecar
Trong Istio, request không đi thẳng hoàn toàn từ application container này sang application container khác. Luồng logic như sau:
`Application -> local Envoy outbound -> network/Kubernetes Service -> destination Envoy inbound -> destination application`

Sidecar chặn toàn bộ traffic vào/ra, giúp thực hiện: thu thập telemetry, áp routing rule, retry, timeout, circuit breaking, mTLS.

## 5. Istio Control Plane và Data Plane
- **Control plane** (thường là `istiod`): Nhận cấu hình Istio từ admin, phân phối cấu hình (xds) cho Envoy proxy, quản lý service discovery và chứng chỉ (certificate).
- **Data plane**: Là các Envoy proxy (sidecar) chạy cạnh workload, trực tiếp nhận/chuyển tiếp traffic, áp dụng rule từ control plane và phát sinh telemetry.

## 6. Logical Service và Versioned Deployment
Một điểm quan trọng trong Bookinfo là sự tách biệt giữa **Logical Service** và **Deployment**:
- `reviews` là một Kubernetes Service logic (có IP và DNS cố định).
- `reviews-v1`, `reviews-v2` và `reviews-v3` là các Deployment/version khác nhau, tạo ra các Pod khác nhau.
- Vì Service `reviews` dùng selector `app: reviews`, nó sẽ chọn Pod của v1, v2 hoặc v3 một cách ngẫu nhiên (nếu chưa có Istio routing rule cụ thể). Điều này giải thích tại sao khi refresh trang `/productpage`, người dùng thỉnh thoảng thấy không có sao (v1), sao đen (v2) hoặc sao đỏ (v3).
