# Hướng dẫn triển khai ứng dụng Bookinfo

Tài liệu này hướng dẫn từng bước cách triển khai (deploy) ứng dụng mẫu Bookinfo của Istio lên Kubernetes cluster và cách lấy địa chỉ IP LAN để những người khác cùng mạng có thể truy cập và test.

---

## Bước 1: Khởi động Kubernetes Cluster
Hãy đảm bảo rằng bạn đã cài đặt và khởi động một Kubernetes cluster (ví dụ: Docker Desktop, Minikube, OrbStack, Kind, v.v.).

> 💡 **Giải thích khái niệm:**
> - **Kubernetes Cluster (Cụm K8s):** Giống như một "nhà máy" để tự động quản lý và chạy các Container.
> - **Minikube, Docker Desktop, OrbStack, Kind:** Là các phần mềm giúp bạn "giả lập" một cụm K8s thu nhỏ chạy trực tiếp trên laptop cá nhân để học tập và test code. Thay vì phải thuê máy chủ vật lý, bạn chỉ cần 1 phần mềm này là có ngay một môi trường K8s.

## Bước 2: Triển khai các dịch vụ của Bookinfo
Di chuyển vào thư mục gốc của dự án `bookinfo` (`/Users/ductri0981/Documents/Software_Architecture/istio/samples/bookinfo`), sau đó chạy lệnh sau để triển khai ứng dụng:

```bash
kubectl apply -f platform/kube/bookinfo.yaml
```

Lệnh này sẽ tạo ra các Pod và Service cho các microservices: `details`, `ratings`, `reviews` (cả 3 phiên bản) và `productpage`.

> 💡 **Giải thích khái niệm:**
> - **Ứng dụng Bookinfo:** Đây là một hệ thống mẫu (như trang web bán sách) nổi tiếng dùng để học Microservices. Nó chia thành 4 microservices nhỏ: `productpage` (Giao diện), `details` (Thông tin chi tiết sách), `reviews` (Các bài đánh giá) và `ratings` (Số sao).
> - **Lệnh `kubectl apply`:** Lệnh này giúp nộp "bản thiết kế" (file yaml) lên K8s. K8s sẽ đọc file này và tự động tạo ra các **Pod** (chạy code của 4 dịch vụ trên) và các **Service** (để chúng liên lạc nội bộ).

## Bước 3: Kiểm tra trạng thái của các Pod
Kiểm tra xem tất cả các Pod đã được khởi tạo thành công và ở trạng thái `Running` hay chưa bằng lệnh:

```bash
kubectl get pods
```

> 💡 **Giải thích khái niệm:**
> - **Trạng thái `Running`:** Khi ra lệnh tạo Pod, K8s mất một lúc để tải Image về và khởi động. Trạng thái sẽ chuyển từ `Pending` (Chờ) -> `ContainerCreating` (Đang tạo) -> `Running` (Đang chạy).
> - Lệnh này giúp bạn lướt nhìn xem tất cả các Pod đã khởi động xong xuôi chưa, hay có Pod nào bị lỗi (`Error` hoặc `CrashLoopBackOff`).

## Bước 4: Triển khai Istio Gateway (nếu cần)
Để ứng dụng có thể được truy cập từ bên ngoài cluster thông qua Istio Ingress Gateway, bạn cần triển khai cấu hình Gateway. (Nếu bạn đã cài sẵn, lệnh này sẽ báo "unchanged"):

```bash
kubectl apply -f networking/bookinfo-gateway.yaml
```

Bạn có thể kiểm tra xem Gateway đã được tạo thành công chưa:

```bash
kubectl get gateway
```

> 💡 **Giải thích khái niệm:**
> - **Istio:** Là một công cụ (Service Mesh) cài thêm vào Kubernetes để quản lý luồng giao thông bảo mật và định tuyến thông minh hơn.
> - **Istio Ingress Gateway:** Hoạt động như "Người gác cổng". Mặc định, các Pods ở Bước 2 mới chỉ gọi nhau nội bộ được. Gateway này được sinh ra để hứng traffic (luồng truy cập) từ bên ngoài Internet/LAN và mở đường dẫn hướng vào microservice `productpage`.

## Bước 5: Lấy địa chỉ IP mạng LAN (Cục bộ)
Để bạn bè hoặc thiết bị khác trong cùng một mạng Wi-Fi/LAN có thể truy cập ứng dụng trên máy tính của bạn, bạn cần chia sẻ địa chỉ IP mạng cục bộ của máy tính bạn.

Trên macOS, bạn có thể lấy địa chỉ IP của Wi-Fi bằng lệnh sau:
```bash
ipconfig getifaddr en0
```
*(Nếu bạn dùng mạng dây hoặc kết nối khác, có thể thử `ipconfig getifaddr en1`)*

Giả sử kết quả trả về là IP: `10.122.0.183`.

> 💡 **Giải thích khái niệm:**
> - **Địa chỉ IP LAN (Cục bộ):** Máy tính của bạn trong mạng Wi-Fi ở nhà/công ty sẽ được cục Router cấp một dãy số (ví dụ: `192.168.1.5` hoặc `10.122.0.183`). Lệnh `ipconfig` giúp bạn xem nhanh địa chỉ này để gửi cho đồng nghiệp.

## Bước 6: Truy cập ứng dụng
Sử dụng địa chỉ IP vừa lấy được, bạn và những người dùng mạng chung có thể truy cập ứng dụng trên trình duyệt web tại đường dẫn:

```text
http://<ĐỊA_CHỈ_IP_LAN>/productpage
```

Ví dụ: `http://10.122.0.183/productpage`

*(Thông thường Istio Ingress Gateway trên Docker Desktop/OrbStack tự động map trực tiếp port 80 HTTP về máy host, vì vậy bạn không cần phải thêm port vào URL).*

> 💡 **Giải thích khái niệm & Luồng chạy ở bước này:**
> 1. Đồng nghiệp dùng điện thoại gõ `http://10.122.0.183/productpage`.
> 2. Yêu cầu đập thẳng vào máy tính laptop của bạn.
> 3. Cổng số `80` (HTTP) của laptop đã được móc sẵn vào thẳng **Istio Gateway**.
> 4. Gateway nhìn thấy chữ `/productpage`, bèn dẫn đường chui vào K8s, tìm đến Service của **productpage** và lấy giao diện web trả về cho điện thoại của đồng nghiệp bạn.

## Bước 7: Xóa (Tắt) ứng dụng để giải phóng tài nguyên
Khi bạn không muốn chạy ứng dụng nữa và muốn tắt đi để máy tính bớt nặng, bạn chỉ cần gõ lệnh với chữ `delete` (thay vì `apply`) truyền vào chính xác file thiết kế ban đầu:

```bash
kubectl delete -f platform/kube/bookinfo.yaml
```

> 💡 **Giải thích khái niệm:**
> - Lệnh `kubectl delete -f <file>` là lệnh ngược lại hoàn toàn với `apply`. 
> - K8s sẽ đọc file thiết kế, xem trong đó khai báo những Pod, Service nào, và đi tìm những tài nguyên tương ứng đang chạy trên hệ thống để "tiêu diệt" chúng một cách sạch sẽ.
> - Bằng cách này, toàn bộ CPU và RAM mà các Pod đó (productpage, reviews...) đang chiếm dụng sẽ được trả lại cho laptop của bạn, giúp máy chạy nhẹ nhàng trở lại.
