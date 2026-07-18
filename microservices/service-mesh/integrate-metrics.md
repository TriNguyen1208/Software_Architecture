# Hướng dẫn Tích hợp và Sử dụng Grafana & Kiali trong Istio

Trong hệ thống Istio, Grafana và Kiali không hoạt động độc lập mà chúng cần có **Prometheus** đi kèm để cung cấp dữ liệu. Rất may mắn, Istio đã chuẩn bị sẵn toàn bộ file cấu hình chuẩn cho chúng ta. 

Dưới đây là các bước để cài đặt và mở hai công cụ tuyệt vời này lên màn hình.

---

## Bước 1: Cài đặt Prometheus (Bắt buộc)
Như đã giải thích, Prometheus là "kế toán" gom số liệu. Nếu không có nó, Grafana và Kiali sẽ không có dữ liệu để vẽ biểu đồ và sơ đồ.
Khi bạn tải Istio về máy (thư mục `istio-1.xx.x`), bên trong có sẵn một thư mục tên là `samples/addons`. Bạn hãy chạy lệnh sau:

```bash
kubectl apply -f samples/addons/prometheus.yaml
```

## Bước 2: Cài đặt Grafana và Kiali
Tiếp tục sử dụng file cấu hình có sẵn của Istio để cài đặt 2 công cụ này:

```bash
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/kiali.yaml
```

*Đợi khoảng 30 giây, bạn có thể kiểm tra xem các công cụ này đã chạy lên chưa bằng lệnh:*
```bash
kubectl get pods -n istio-system
```
*(Nếu thấy dòng `grafana-...`, `kiali-...` và `prometheus-...` báo `Running` là thành công).*

---

## Bước 3: Mở Bảng điều khiển (Dashboard)
Vì các công cụ này nằm giấu kín bên trong khu vực `istio-system` của Kubernetes, K8s không tự động mở cửa cho bạn truy cập. Bạn có 2 cách để mở chúng lên:

**Cách 1: Dùng lệnh siêu tốc của Istio (Khuyên dùng)**
Nếu bạn dùng `istioctl`, nó sẽ tự động cấu hình và mở luôn trình duyệt web cho bạn:
```bash
# Mở Grafana
istioctl dashboard grafana

# Mở Kiali
istioctl dashboard kiali
```

**Cách 2: Đục lỗ thủ công bằng Kubernetes (Dùng khi không có istioctl)**
Nếu máy bạn báo lỗi không tìm thấy `istioctl`, hãy dùng lệnh port-forward thủ công của K8s. Bạn cần mở 2 cửa sổ Terminal khác nhau để treo 2 lệnh này:

```bash
# Mở Grafana (Ở tab Terminal 1)
kubectl port-forward -n istio-system svc/grafana 3000:3000
# Sau đó trình duyệt truy cập: http://localhost:3000

# Mở Kiali (Ở tab Terminal 2)
kubectl port-forward -n istio-system svc/kiali 20001:20001
# Sau đó trình duyệt truy cập: http://localhost:20001
```

---

## Bước 4: Trải nghiệm Demo thực tế (Cách lấy điểm cao)
Khi mở Dashboard lên, chúng sẽ trống trơn nếu không có ai truy cập web của bạn. Để demo cho thầy cô thấy hệ thống "nhảy múa", hãy làm theo các bước sau:

1. Mở một terminal mới, gõ lệnh sau để tạo ra "hàng trăm người dùng giả" truy cập liên tục vào hệ thống của bạn:
   ```bash
   while true; do curl -s -o /dev/null http://localhost/productpage; sleep 0.5; done
   ```

2. **Bên phía Kiali (Sơ đồ mạng nhện):**
   - Truy cập vào giao diện Kiali, bấm mục **Graph** ở menu bên trái.
   - Ở thanh công cụ phía trên, phần *Namespace*, hãy tick chọn `bookinfo-istio`.
   - Ở góc trên cùng, bật tính năng **Traffic Animation**. Bạn sẽ thấy các điểm sáng li ti chạy qua lại giữa các Node (Service) cực kỳ sinh động! Kiali sẽ hiện màu xanh (thành công) hoặc đỏ (nếu có lỗi 503 như bạn vừa sửa lúc nãy).

3. **Bên phía Grafana (Biểu đồ hiệu năng):**
   - Trong giao diện Grafana, bấm vào biểu tượng **Kính lúp (Search)** ở menu bên trái.
   - Tìm và chọn thư mục **Istio** -> Chọn bảng **Istio Mesh Dashboard**.
   - Bạn sẽ thấy các biểu đồ đường, biểu đồ cột bắt đầu dựng đứng lên, thể hiện lưu lượng (RPS) và tốc độ phản hồi (Latency) theo thời gian thực rất chuyên nghiệp!
