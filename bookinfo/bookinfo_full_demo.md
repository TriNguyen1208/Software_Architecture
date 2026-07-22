# Hướng dẫn Toàn tập: Demo Ứng dụng Bookinfo với Istio từ A đến Z

Tài liệu này tổng hợp toàn bộ các bước từ lúc bắt đầu cài đặt Istio cho đến khi triển khai ứng dụng Bookinfo, tích hợp công cụ giám sát và dọn dẹp hệ thống. Đây là kịch bản hoàn hảo để bạn demo và giải thích kiến trúc vi dịch vụ (Microservices) cùng Istio Service Mesh.

---

## Phần 1: Chuẩn bị Môi trường và Cài đặt Istio

Để hệ thống Kubernetes có thể hiểu được các cấu hình của Istio (như Gateway, VirtualService), chúng ta cần cài đặt Istio vào cụm K8s.

**Bước 1:** Tải bộ cài đặt Istio
```bash
curl -L https://istio.io/downloadIstio | sh -
```

**Bước 2:** Di chuyển vào thư mục cài đặt và cấu hình biến môi trường
```bash
cd istio-*
export PATH=$PWD/bin:$PATH
```

**Bước 3:** Cài đặt Istio profile `demo` vào Kubernetes
```bash
istioctl install --set profile=demo -y
```

---

## Phần 2: Kịch bản Demo 1 - Kubernetes Thuần (Không có Istio)

Để làm nổi bật vai trò của Istio, trước tiên hãy chạy Bookinfo trên K8s thuần túy.

**Bước 1:** Tạo một Namespace không có Istio
```bash
kubectl create namespace bookinfo-vanilla
```

**Bước 2:** Triển khai ứng dụng
```bash
kubectl apply -f platform/kube/bookinfo.yaml -n bookinfo-vanilla
```

**Bước 3:** Kiểm tra trạng thái
```bash
kubectl get pods -n bookinfo-vanilla
```
> **Điểm nhấn Demo:** Chỉ cho người xem thấy cột `READY` hiển thị `1/1`. Các Pod đang chạy hoàn toàn độc lập mà không có proxy bảo vệ hay theo dõi.

**Bước 4:** Truy cập ứng dụng thủ công
Do không có Gateway, ta phải dùng `port-forward` để đục lỗ:
```bash
kubectl port-forward svc/productpage 9080:9080 -n bookinfo-vanilla
```
Truy cập `http://localhost:9080/productpage`. Dịch vụ vẫn hoạt động nhưng không có tính năng định tuyến, bảo mật hay giám sát nâng cao.

---

## Phần 3: Kịch bản Demo 2 - Sức mạnh của Istio

Bây giờ, chúng ta sẽ triển khai Bookinfo trên một Namespace đã được "tiêm" Istio Proxy.

**Bước 1:** Tạo Namespace mới và kích hoạt tự động tiêm Istio (Auto Injection)
```bash
kubectl create namespace bookinfo-istio
kubectl label namespace bookinfo-istio istio-injection=enabled
```

**Bước 2:** Triển khai ứng dụng
```bash
kubectl apply -f platform/kube/bookinfo.yaml -n bookinfo-istio
```

**Bước 3:** Kiểm tra sự khác biệt
```bash
kubectl get pods -n bookinfo-istio
```
> **Điểm nhấn Demo:** Lần này cột `READY` hiển thị `2/2`. Istio đã tự động nhúng (inject) vệ sĩ Envoy Proxy vào cùng Pod với ứng dụng!

**Bước 4:** Mở cổng Gateway cho phép truy cập từ Internet
```bash
kubectl apply -f networking/bookinfo-gateway.yaml -n bookinfo-istio
```
> **Giải thích kiến trúc Gateway API:**
> Gateway API (`bookinfo-gateway.yaml`) đóng vai trò là điểm tiếp nhận mạng tại biên của cluster. Nó gồm 2 phần:
> - **Gateway:** Lắng nghe traffic ở cổng 80, được quản lý bởi Istio.
> - **HTTPRoute:** Quy định nếu truy cập đường dẫn `/productpage` thì sẽ đẩy (route) tới dịch vụ frontend `productpage` ở cổng 9080, đồng thời giấu kín các backend (`details`, `reviews`, `ratings`) trong mạng nội bộ.

**Bước 5:** Truy cập ứng dụng
Bạn có thể chia sẻ IP LAN (vd lấy bằng `ipconfig getifaddr en0`) hoặc mở trình duyệt tại `http://localhost/productpage`.

---

## Phần 4: Tích hợp Công cụ Giám sát (Grafana & Kiali)

Tính năng "ăn tiền" nhất của Istio là cung cấp khả năng quan sát (Observability) toàn diện hệ thống.

**Bước 1:** Cài đặt Prometheus (để thu thập metrics)
```bash
kubectl apply -f addons/prometheus.yaml
```

**Bước 2:** Cài đặt Grafana và Kiali
```bash
kubectl apply -f addons/grafana.yaml
kubectl apply -f addons/kiali.yaml
```

**Bước 3:** Mở Dashboard
```bash
# Bật terminal 1 (Mở Kiali):
kubectl port-forward -n istio-system svc/kiali 20001:20001
# Sau đó mở trình duyệt truy cập: http://localhost:20001

# Bật terminal 2 (Mở Grafana):
kubectl port-forward -n istio-system svc/grafana 3000:3000
# Sau đó mở trình duyệt truy cập: http://localhost:3000
```

**Bước 4:** Tạo tải ảo để vẽ biểu đồ
Chạy lệnh sau để giả lập hàng trăm người dùng đang truy cập liên tục:
```bash
while true; do curl -s -o /dev/null http://localhost/productpage; sleep 0.5; done
```
> **Quan sát kết quả:** 
> - Tại **Kiali**, bạn sẽ thấy một biểu đồ mạng nhện trực quan với các điểm sáng li ti luân chuyển giữa các dịch vụ.
> - Tại **Grafana** (phần Istio Mesh Dashboard), bạn sẽ xem được lưu lượng RPS, độ trễ và các biểu đồ tài nguyên theo thời gian thực.

---

## Phần 5: Khắc phục sự cố 503 Cluster Not Found

Khi demo có thể bạn sẽ vô tình gặp lỗi HTTP 503 khi gõ `/productpage`.

**Nguyên nhân:** Có sự xung đột luật định tuyến Gateway. Thường là do bạn từng apply `bookinfo-gateway.yaml` ở Namespace `default` nhưng lại quên xóa, sau đó lại apply ở `bookinfo-istio`. Istio sẽ bị bối rối và ưu tiên luật cũ.

**Cách giải quyết:** Xóa bỏ bảng chỉ đường ở luật định tuyến cũ kỹ (ví dụ ở default namespace):
```bash
kubectl delete -f networking/bookinfo-gateway.yaml
```
Ngay sau đó, tải lại trang web hệ thống sẽ nhận luật đúng và hoạt động bình thường!

---

## Phần 6: Dọn dẹp Hệ thống (Cleanup Cheatsheet)

Sau buổi demo, đây là các lệnh giúp giải phóng tài nguyên.

**1. Xóa ứng dụng an toàn từ file thiết kế** (Khuyên dùng)
```bash
kubectl delete -f platform/kube/bookinfo.yaml -n bookinfo-istio
kubectl delete -f networking/bookinfo-gateway.yaml -n bookinfo-istio
```

**2. Tiêu diệt sạch sẽ một Namespace**
Nếu muốn dọn triệt để mọi thứ trong namespace:
```bash
kubectl delete namespace bookinfo-vanilla
kubectl delete namespace bookinfo-istio
```

**3. Tắt tính năng tự động tiêm Istio**
```bash
kubectl label namespace default istio-injection-
```

**4. Xóa "hủy diệt hàng loạt"** (Cẩn thận)
```bash
kubectl delete all --all -n <tên-namespace>
```
Lệnh này xóa mọi Pod, Service, Deployment nhưng giữ lại Gateway, Secret... Do đó, ưu tiên sử dụng `kubectl delete -f` để dọn dẹp chính xác nhất.
