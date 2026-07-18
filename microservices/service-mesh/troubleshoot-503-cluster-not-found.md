# Phân tích lỗi 503 Cluster Not Found trong Istio

Trong quá trình thao tác với Kubernetes và Istio, đặc biệt là khi chuyển đổi ứng dụng qua lại giữa các Namespace khác nhau (như từ `default` sang `bookinfo-istio`), bạn rất dễ gặp phải lỗi **503 Cluster Not Found** khi truy cập web.

Tài liệu này sẽ giải thích tận gốc rễ nguyên nhân của lỗi này, giúp bạn thể hiện sự am hiểu sâu sắc về kiến trúc mạng của Service Mesh nếu bị thầy cô chất vấn.

---

## 1. Bản chất của "Người gác cổng" (Istio Ingress Gateway)
Điều đầu tiên bạn cần nhớ: Trong toàn bộ cụm Kubernetes của bạn, chỉ có **duy nhất một** chiếc Pod thật sự làm nhiệm vụ gác cổng (nó nằm ở khu vực `istio-system` và luôn mở port 80). 

Khi bạn dùng lệnh `kubectl apply -f bookinfo-gateway.yaml` dù ở bất kỳ Namespace nào, K8s không tạo ra cái cổng mới. Nó chỉ lấy "luật định tuyến" (VirtualService) trong file đó và nhồi vào bộ não của cái cổng duy nhất này.

## 2. Kịch bản sinh ra lỗi (Sự xung đột định tuyến)
Giả sử quy trình làm việc của bạn như sau:

1. **Ngày hôm trước:** Bạn deploy ứng dụng vào khu vực `default` kèm theo file Gateway.
   👉 *Luật cũ được ghi nhận:* "Nếu có ai gõ `/productpage`, hãy dẫn họ tới dịch vụ `productpage` **thuộc khu vực default**."
2. **Hôm nay (Dọn dẹp):** Bạn xóa sạch ứng dụng ở `default`, nhưng **quên không xóa** file Gateway đi.
3. **Triển khai mới:** Bạn tạo khu vực mới `bookinfo-istio`, deploy ứng dụng vào đó, và apply lại file Gateway một lần nữa.
   👉 *Luật mới được ghi nhận:* "Nếu có ai gõ `/productpage`, hãy dẫn họ tới dịch vụ `productpage` **thuộc khu vực bookinfo-istio**."

## 3. Quá trình lỗi 503 diễn ra như thế nào?
Vì lúc này đang có 2 luật giống hệt nhau (cùng bắt đường dẫn `/productpage`), Istio bị bối rối và cơ chế của nó quyết định **ưu tiên cái luật cũ nhất**.

Quá trình truy cập của người dùng sẽ diễn ra như sau:
1. Trình duyệt gõ: `http://localhost/productpage`.
2. Gã gác cổng (Ingress Gateway) nhận được, giở sổ ra xem và thấy luật ưu tiên: *"À, phải dẫn ông này vào khu vực `default`"*.
3. Gã gác cổng chạy vào khu vực `default` tìm dịch vụ có tên là `productpage` để giao dữ liệu.
4. Nó nhìn quanh thấy khu vực này vườn không nhà trống (vì bạn đã xóa ứng dụng ở Bước 2).
5. Nó quay ra trả về lỗi cho trình duyệt: **`503 cluster_not_found`** (Dịch ra là: Tôi không tìm thấy cụm đích đến!).

## 4. Giải pháp khắc phục
Nguyên lý giải quyết lỗi này cực kỳ đơn giản: *"Xóa nhà thì phải xóa luôn cái bảng chỉ đường dẫn vào nhà, nếu không shipper sẽ bị lạc"*.

Bạn chỉ cần ra lệnh xóa bỏ cái luật định tuyến cũ kỹ đang nằm ở khu vực `default` bằng lệnh:
```bash
kubectl delete -f networking/bookinfo-gateway.yaml
```
*(Lưu ý: Không thêm hậu tố `-n`, để lệnh này mặc định nhắm vào khu vực `default`).*

Ngay khi luật cũ bị xóa đi, gã gác cổng chỉ còn cầm trên tay duy nhất một cái luật đúng: *"Dẫn vào khu vực `bookinfo-istio`"*. Lúc này nếu tải lại trang web, mọi thứ sẽ hoạt động hoàn hảo!
