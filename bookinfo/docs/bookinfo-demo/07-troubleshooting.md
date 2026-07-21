# Hướng dẫn Khắc phục sự cố (Troubleshooting) & FAQ

Dưới đây là các lỗi thường gặp trong quá trình triển khai Bookinfo và cách kiểm tra, xử lý, cùng với một số câu hỏi giảng viên có thể hỏi.

## 1. Các lỗi thường gặp

### Lỗi: Pod trạng thái `ImagePullBackOff`

**Cách kiểm tra:**
```shell
kubectl describe pod <pod-name> -n bookinfo
```

**Nguyên nhân & Xử lý:**
- **Nguyên nhân**: Docker image không tồn tại, sai tên tag, hoặc không thể truy cập registry mạng.
- **Xử lý**: Kiểm tra lại tên image trong Deployment. Xác nhận máy tính/cluster có thể kéo (pull) image từ Docker Hub / Istio Registry.

### Lỗi: Pod chỉ có `READY 1/1` thay vì `2/2`

**Cách kiểm tra:**
```shell
kubectl get namespace bookinfo --show-labels
kubectl get pod <pod-name> -n bookinfo -o yaml
```

**Nguyên nhân & Xử lý:**
- **Nguyên nhân**: Namespace chưa được gắn label `istio-injection=enabled` trước khi tạo Pod. Envoy sidecar không được tự động tiêm vào.
- **Xử lý**: Đảm bảo label đã được set. Sau đó chạy lệnh để restart deployment:
  ```shell
  kubectl rollout restart deployment -n bookinfo
  ```

### Lỗi: `connection refused` khi gọi API

**Nguyên nhân & Xử lý:**
- **Nguyên nhân**: Application container chưa sẵn sàng, port định nghĩa trong Service không khớp với `containerPort`, hoặc sidecar chặn traffic do cấu hình Istio sai.
- **Xử lý**: Kiểm tra log của application và của proxy:
  ```shell
  kubectl logs -n bookinfo <pod-name> -c <app-container>
  kubectl logs -n bookinfo <pod-name> -c istio-proxy
  ```

### Lỗi: `istioctl: command not found` (Hoặc lỗi tương tự trên Windows)

**Nguyên nhân & Xử lý:**
- **Nguyên nhân**: Chưa cài đặt `istioctl` hoặc chưa thêm đường dẫn thư mục bin của Istio vào biến môi trường `PATH`.
- **Xử lý**: Tải thư mục cài đặt Istio, giải nén và thêm đường dẫn `istio-<version>/bin` vào PATH. Khởi động lại terminal.

## 2. Các câu hỏi giảng viên có thể hỏi (FAQ)

### Q: Kubernetes có phải service mesh không?
**A:** Không. Kubernetes điều phối workload (orchestration) và cung cấp service discovery/networking cơ bản. Istio mới bổ sung lớp service mesh để quản lý traffic nâng cao, bảo mật và quan sát (observability).

### Q: Vì sao cần Service khi đã có Pod IP?
**A:** Pod IP không ổn định và có thể thay đổi khi Pod bị xoá, restart hoặc scale up/down. Service cung cấp DNS name và IP ảo (Virtual IP) ổn định để các client kết nối.

### Q: Vì sao reviews có ba Deployment nhưng chỉ một Service?
**A:** Ba Deployment là ba version của cùng một logical service. Service `reviews` cung cấp một điểm truy cập ổn định duy nhất cho client (`productpage`).

### Q: `READY 2/2` nghĩa là gì?
**A:** Nghĩa là Pod có 2 container đang chạy và trong trạng thái sẵn sàng: 1 container chứa mã nguồn ứng dụng (ví dụ: java cho reviews), 1 container là Envoy proxy do Istio inject vào (sidecar).

### Q: Ingress Gateway khác Kubernetes Service thế nào?
**A:** Ingress Gateway là proxy entry point (cổng vào) xử lý traffic từ bên ngoài cụm mạng vào mesh, tuân theo các rule định tuyến nâng cao. Kubernetes Service chỉ cung cấp mạng nội bộ cơ bản.

### Q: DestinationRule khác VirtualService thế nào?
**A:** `DestinationRule` định nghĩa các tập hợp điểm đến (subset) và các policy (như load balancing, mTLS) **sau khi** request đã chọn được host. `VirtualService` định nghĩa **luật định tuyến ban đầu** (vd: 80% traffic vào v1, 20% vào v2) để chuyển request đến các host/subset.
