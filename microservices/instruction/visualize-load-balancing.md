# Hướng dẫn: Hiển thị Tên Pod (Instance ID) lên Giao diện để kiểm tra Load Balancing

Tài liệu này ghi lại các bước đã thực hiện để chỉnh sửa mã nguồn ứng dụng `productpage` (frontend của Bookinfo), nhằm hiển thị tên Pod xử lý request trực tiếp lên giao diện web. Điều này giúp trực quan hóa cơ chế cân bằng tải (Load Balancing) khi tăng số lượng replica lên thành 3 instance.

## 1. Mục đích
Khi có nhiều instance cùng chạy một dịch vụ (ví dụ: `productpage-v1` có 3 replicas), người dùng cần một dấu hiệu trực quan để biết request của mình đang được điều phối vào instance nào.
Giải pháp là sử dụng biến môi trường `HOSTNAME` (được Kubernetes tự động gán bằng tên của Pod) và hiển thị nó lên giao diện HTML.

## 2. Các bước thực hiện

### Bước 1: Chỉnh sửa mã nguồn ứng dụng (Python & HTML)
**File 1: `src/productpage/productpage.py`**
Chỉnh sửa code Python để truyền thêm biến `podname` vào hàm `render_template`.

```python
import os

# ... code logic ...
    return render_template(
        'productpage.html',
        detailsStatus=detailsStatus,
        reviewsStatus=reviewsStatus,
        product=product,
        details=details,
        reviews=reviews,
        user=user,
        podname=os.environ.get('HOSTNAME', 'unknown_pod')) # <-- Thêm dòng này
```

**File 2: `src/productpage/templates/productpage.html`**
Hiển thị biến `{{ podname }}` lên giao diện, ví dụ trên thanh điều hướng (Navigation Bar).

```html
<nav class="bg-gray-800">
  <div class="container mx-auto px-4 sm:px-6 lg:px-8">
    <div class="relative flex h-16 items-center justify-between">
      <!-- Thêm {{ podname }} vào kế bên title -->
      <a href="#" class="text-white px-3 py-2 text-lg font-medium" aria-current="page">BookInfo Sample <span class="text-sm text-gray-400">({{ podname }})</span></a>
      ...
```

### Bước 2: Build Docker Image cục bộ
Vì mã nguồn đã bị thay đổi, chúng ta cần đóng gói lại Docker Image. 
Đi vào thư mục chứa source code và chạy lệnh build:

```bash
cd src/productpage
docker build -t productpage:custom-v1 .
```

### Bước 3: Cập nhật cấu hình Kubernetes Deployment
Mở file cấu hình chính `platform/kube/bookinfo.yaml`, tìm đến khối `Deployment` của `productpage-v1`.
Thay đổi tên `image` thành image vừa build và thêm cờ `imagePullPolicy` để Kubernetes sử dụng image cục bộ thay vì kéo từ internet về.

```yaml
      containers:
      - name: productpage
        image: productpage:custom-v1          # <-- Sửa thành tên image mới
        imagePullPolicy: IfNotPresent         # <-- Thêm dòng này để ưu tiên dùng image local
        ports:
        - containerPort: 9080
```

### Bước 4: Cập nhật lên Cluster
Áp dụng file cấu hình mới:
```bash
kubectl apply -f platform/kube/bookinfo.yaml
```

Khởi động lại deployment để đảm bảo Kubernetes tạo lại các Pod sử dụng bản code mới:
```bash
kubectl rollout restart deployment productpage-v1
```

## 3. Cách kiểm tra
Mở trình duyệt và truy cập vào trang `productpage`.
Bạn sẽ thấy trên thanh menu xuất hiện đoạn text dạng: **BookInfo Sample (productpage-v1-xxxxx-yyyyy)**.
Mỗi lần tải lại trang (F5), dãy ID phía sau sẽ thay đổi luân phiên giữa 3 instance, chứng minh hệ thống đang thực hiện phân tải (Load Balancing) hiệu quả.
