# Sổ tay các lệnh Dọn dẹp & Quản lý Kubernetes (Cheat Sheet)

Trong quá trình học và làm đồ án, bạn sẽ thường xuyên phải tạo ra rồi xóa đi để làm lại. Dưới đây là các câu lệnh "cứu cánh" giúp bạn dọn dẹp hệ thống một cách sạch sẽ và chuyên nghiệp nhất.

---

## 1. Cách gỡ Istio ra khỏi Namespace
Nếu bạn lỡ dán nhãn kích hoạt Istio vào một Namespace và giờ muốn tắt nó đi, bạn dùng lệnh lột nhãn (thêm dấu trừ `-` ở cuối):
```bash
# Ví dụ gỡ Istio khỏi namespace default:
kubectl label namespace default istio-injection-

# Gỡ khỏi namespace tên là bookinfo-istio:
kubectl label namespace bookinfo-istio istio-injection-
```
*(Lưu ý: Sau khi gỡ nhãn, các Pod cũ vẫn sẽ giữ nguyên `2/2`. Bạn phải xóa các Pod đó đi để K8s tạo lại Pod mới `1/1`).*

---

## 2. Cách xóa một Namespace
Khi bạn xóa một Namespace, **toàn bộ** mọi thứ (Pod, Service, Deployment...) nằm bên trong Namespace đó sẽ bị tiêu diệt sạch sẽ không còn một dấu vết. Đây là cách dọn dẹp triệt để nhất!
```bash
kubectl delete namespace <tên-namespace>

# Ví dụ:
kubectl delete namespace no-istio
```

---

## 3. Cách đổi tên một Namespace
**Cực kỳ quan trọng:** Trong Kubernetes, **KHÔNG CÓ LỆNH ĐỂ ĐỔI TÊN NAMESPACE!** K8s thiết kế các namespace cố định để tránh phá vỡ các cấu hình mạng nội bộ.

Nếu bạn buộc phải đổi tên, bạn chỉ có 1 cách duy nhất (đường vòng):
1. Lấy toàn bộ cấu hình ở namespace cũ ra.
2. Tạo namespace mới với tên ưng ý.
3. Đẩy cấu hình vào namespace mới.
4. Xóa namespace cũ đi.

---

## 4. Ý nghĩa của lệnh `kubectl delete all --all`
Đây là lệnh "Hủy diệt hàng loạt" (Rất hay dùng khi thực hành trên laptop):
```bash
kubectl delete all --all
```
**Nó làm gì?** 
- Nó sẽ quét qua Namespace hiện tại (thường là `default`), và tìm diệt sạch mọi thứ: Pod, Service, Deployment, ReplicaSet, StatefulSet,...
- **Lưu ý:** Chữ `all` trong K8s bị giới hạn. Nó **sẽ không xóa** các tài nguyên đặc biệt như: Secret (mật khẩu), ConfigMap (cấu hình), Ingress, Gateway hay PVC (Ổ cứng lưu trữ).

---

## 5. Cách xóa sạch những gì đã tạo ra từ file `bookinfo.yaml`
So với lệnh "hủy diệt hàng loạt" ở trên, đây là **cách xóa chuyên nghiệp và an toàn nhất**.
Quy tắc vàng của Kubernetes: *"Bạn dùng file nào để `apply` thì hãy dùng chính file đó để `delete`"*.
```bash
kubectl delete -f platform/kube/bookinfo.yaml
```
**Tại sao cách này tốt hơn?**
Bởi vì K8s sẽ đọc đúng cái file `bookinfo.yaml`, xem trong đó khai báo chính xác những Pod nào, Service nào, và đi tìm đúng những thằng đó để tiêu diệt. Nó sẽ không bao giờ "giết nhầm" các ứng dụng khác đang chạy trên máy của bạn.
