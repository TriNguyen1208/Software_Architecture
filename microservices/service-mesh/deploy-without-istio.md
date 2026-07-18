# Hướng dẫn chạy ứng dụng Bookinfo thuần K8s (Không có Istio)

Nếu thầy cô yêu cầu bạn demo: *"Làm sao chứng minh được sự khác biệt giữa có Istio và không có Istio?"*, đây chính là kịch bản hoàn hảo nhất để bạn trình diễn!

Chúng ta sẽ khởi chạy ứng dụng Bookinfo bằng **Kubernetes thuần túy**. Lúc này ứng dụng vẫn chạy được, nhưng sẽ không có các tính năng bảo mật, định tuyến thông minh hay giám sát của Istio.

---

## Bước 1: Dọn dẹp ứng dụng cũ
Nếu bạn đang chạy ứng dụng Bookinfo có chứa Istio ở bài trước, hãy tắt nó đi để tránh xung đột:
```bash
kubectl delete -f platform/kube/bookinfo.yaml
```

## Bước 2: Tạo một "khu vực" (Namespace) không có Istio
Mặc định, cụm K8s của bạn đang được cài đặt chế độ: *Bất cứ Pod nào sinh ra ở khu vực mặc định (default namespace) đều bị Istio cưỡng chế nhét "bưu tá" vào*.
Để lách luật, ta tạo ra một khu vực mới hoàn toàn sạch sẽ, đặt tên là `no-istio`:

```bash
kubectl create namespace no-istio
```

## Bước 3: Đẩy ứng dụng vào khu vực sạch
Chạy lại lệnh deploy quen thuộc, nhưng thêm đuôi `-n no-istio` để ném toàn bộ Bookinfo vào khu vực ta vừa tạo:

```bash
kubectl apply -f platform/kube/bookinfo.yaml -n no-istio
```

## Bước 4: Kiểm chứng sự biến mất của Istio (Quan trọng để demo)
Bạn hãy chạy lệnh kiểm tra các Pod trong khu vực mới:
```bash
kubectl get pods -n no-istio
```
**👉 Điểm ăn tiền ở đây:** Bạn hãy chỉ cho người xem cột `READY`. Lúc này nó sẽ hiện là `1/1` (Thay vì `2/2` như trước đây). 
Điều này chứng tỏ Pod bây giờ chỉ chứa duy nhất ứng dụng của bạn, hoàn toàn không có bóng dáng của gã vệ sĩ Envoy Proxy (Istio) nào cả!

## Bước 5: Mở cửa cho người dùng truy cập
Vì không có Istio, ta **KHÔNG THỂ** dùng cái "Người gác cổng" xịn xò là `bookinfo-gateway.yaml` được nữa.
Thay vào đó, ta phải dùng cách mở cửa thủ công "chạy bằng cơm" của Kubernetes (gọi là Port-Forward - đục lỗ trực tiếp vào Service):

```bash
kubectl port-forward svc/productpage 9080:9080 -n no-istio
```
*(Lệnh này sẽ treo Terminal của bạn để giữ kết nối liên tục).*

## Bước 6: Truy cập ứng dụng
Mở trình duyệt web trên máy tính của bạn và truy cập vào địa chỉ:
```text
http://localhost:9080/productpage
```

**Kết quả:** Ứng dụng bán sách vẫn hiện lên bình thường! Các dịch vụ Details và Reviews vẫn gọi được nhau thông qua DNS nội bộ thuần túy của Kubernetes.

---
**💡 KẾT LUẬN ĐỂ BÁO CÁO:** 
- Kubernetes thuần (không Istio) vẫn đủ khả năng chạy và kết nối các Microservices. 
- Tuy nhiên, ta phải mở port thủ công rất vất vả, không hứng được traffic lớn từ bên ngoài, không biết service nào đang gọi service nào (vì không có ai theo dõi), và dữ liệu truyền đi không được mã hóa bảo mật. Đó chính là lý do các hệ thống lớn BẮT BUỘC phải cài thêm Istio!
