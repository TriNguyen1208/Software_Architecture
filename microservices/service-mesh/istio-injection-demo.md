# Kịch bản Demo: Sự khác biệt giữa Kubernetes thuần và có Istio (Service Mesh)

**Mục tiêu của bài Demo:** Trình diễn chạy 2 phiên bản của ứng dụng Bookinfo song song cùng một lúc. Một bên là Kubernetes nguyên thủy (không có Istio - hiển thị 1/1), một bên là hệ thống đã được nâng cấp với Istio (hiển thị 2/2) để so sánh trực tiếp. Kịch bản này thể hiện tư duy tổ chức hệ thống rất chuyên nghiệp.

---

## Bước 1: Chuẩn bị 2 "Khu vực" (Namespace) riêng biệt
Thay vì dùng chung ở `default` rất dễ bị nhầm lẫn, ta sẽ tạo ra 2 namespace riêng biệt để chứa 2 phiên bản ứng dụng:

```bash
kubectl create namespace bookinfo-vanilla
kubectl create namespace bookinfo-istio
```

## Bước 2: Kích hoạt sức mạnh của Istio cho khu vực thứ 2
Ta dán nhãn `istio-injection=enabled` vào namespace `bookinfo-istio` để báo cho Kubernetes biết: *"Từ giờ trở đi, hễ có ứng dụng nào được khởi chạy ở khu vực này, hãy tự động tiêm thêm gã bưu tá (Envoy Proxy) vào cho tôi"*.

```bash
kubectl label namespace bookinfo-istio istio-injection=enabled
```
*(Lưu ý: Khu vực `bookinfo-vanilla` ta giữ nguyên không dán nhãn để nó chạy K8s thuần túy).*

## Bước 3: Triển khai ứng dụng vào khu vực KHÔNG CÓ Istio
Khởi chạy ứng dụng vào namespace `bookinfo-vanilla`:

```bash
kubectl apply -f platform/kube/bookinfo.yaml -n bookinfo-vanilla
```

Kiểm tra kết quả:
```bash
kubectl get pods -n bookinfo-vanilla
```
**👉 Điểm cần nhấn mạnh lúc Demo:** Hãy chỉ cho người xem cột `READY`. Bạn sẽ thấy tất cả các Pod đều hiển thị **`1/1`**. Ứng dụng đang chạy hoàn toàn đơn độc, không bị ai "kèm cặp".

## Bước 4: Triển khai ứng dụng vào khu vực CÓ Istio
Khởi chạy ứng dụng vào namespace `bookinfo-istio`:

```bash
kubectl apply -f platform/kube/bookinfo.yaml -n bookinfo-istio
```

Kiểm tra kết quả:
```bash
kubectl get pods -n bookinfo-istio
```
**👉 Điểm cần nhấn mạnh lúc Demo:** Lúc này, bạn sẽ thấy K8s phải mất thêm thời gian khởi tạo vì nó phải tải thêm proxy. Cột READY sẽ hiển thị **`2/2`**. Istio đã tự động "tiêm" vệ sĩ Envoy Proxy vào nằm chung Pod với ứng dụng của bạn!

## Bước 5: So sánh sự khác biệt khi mở cửa (Expose) ra Internet

**🔴 Bên không có Istio (bookinfo-vanilla):**
Do không có hệ thống "Người gác cổng" (Gateway) chuyên nghiệp, bạn phải đục lỗ thủ công bằng lệnh `port-forward` rất bất tiện và không chịu được tải lớn:
```bash
kubectl port-forward svc/productpage 9080:9080 -n bookinfo-vanilla
```
*(Gõ lệnh xong phải treo terminal, tắt terminal là mất kết nối).*

**🟢 Bên có Istio (bookinfo-istio):**
Bạn được trang bị hệ thống `Ingress Gateway` xịn xò để tự động điều phối traffic:
```bash
kubectl apply -f networking/bookinfo-gateway.yaml -n bookinfo-istio
```
Sau lệnh này, Gateway đã được mở, bạn chỉ việc cung cấp địa chỉ IP cho mọi người truy cập vào hệ thống một cách mượt mà thông qua port 80 mặc định.

---
**💡 Chốt hạ kịch bản Demo:**
Bằng cách thiết lập sẵn 2 Namespace song song thế này, lúc lên bục thuyết trình, bạn chỉ cần lướt terminal qua lại giữa 2 lệnh `kubectl get pods -n bookinfo-vanilla` và `kubectl get pods -n bookinfo-istio` để khán giả thấy ngay lập tức sự khác biệt giữa `1/1` và `2/2` mà không cần phải hì hục ngồi xóa app rồi cài lại từ đầu. Đảm bảo cực kỳ trơn tru và chuyên nghiệp!
