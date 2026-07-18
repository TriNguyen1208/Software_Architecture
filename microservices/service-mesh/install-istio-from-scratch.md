# Hướng dẫn cài đặt Istio từ con số 0 (Từ lúc máy chưa có gì)

Nếu bạn mang bài báo cáo này lên một chiếc laptop hoàn toàn mới (chỉ mới cài Docker Desktop / Kubernetes) và **chưa hề cài đặt Istio**, thì Kubernetes sẽ báo lỗi hoặc không hiểu các lệnh liên quan đến Gateway, VirtualService.

Đây là kịch bản chuẩn để bạn tự cài đặt "Người gác cổng" và "Hệ thống bưu tá" Istio vào cụm Kubernetes của mình chỉ trong 5 phút.

---

## Bước 1: Tải bộ cài đặt Istio (istioctl)
Mở Terminal trên máy tính Mac (hoặc Linux) của bạn và chạy lệnh sau để tải phiên bản Istio mới nhất về máy:

```bash
curl -L https://istio.io/downloadIstio | sh -
```

Hệ thống sẽ tự động tải về một thư mục có tên dạng `istio-1.xx.x` (ví dụ: `istio-1.20.3`).

## Bước 2: Di chuyển vào thư mục vừa tải
Gõ lệnh để đi vào thư mục đó:
```bash
cd istio-*
```

## Bước 3: Đưa công cụ `istioctl` vào hệ thống
Trong thư mục này có chứa một công cụ lõi tên là `istioctl` (Giống như `kubectl` nhưng dành riêng để điều khiển Istio). Ta cần khai báo để Terminal nhận diện được lệnh này:

```bash
export PATH=$PWD/bin:$PATH
```
*(Lưu ý: Nếu đóng Terminal mở lại, bạn sẽ phải chạy lại lệnh export này. Để dùng vĩnh viễn, hãy copy file `istioctl` vứt vào thư mục `/usr/local/bin`)*.

## Bước 4: Chính thức cài đặt Istio vào Kubernetes
Đây là bước quan trọng nhất! Bạn dùng công cụ vừa tải để tiêm sức mạnh của Istio vào sâu bên trong cụm Kubernetes.

Ở môi trường học tập, ta dùng gói cài đặt `demo` (Gói này chứa đầy đủ mọi tính năng nhưng cấu hình nhẹ nhàng, phù hợp cho laptop):

```bash
istioctl install --set profile=demo -y
```

**Chuyện gì xảy ra dưới nền?**
Lệnh này sẽ tự động tạo ra một không gian có tên là `istio-system` trên Kubernetes, sau đó dựng lên các thành phần như "Bộ não" (`istiod`) và "Người gác cổng" (`istio-ingressgateway`). 
Sẽ mất khoảng 1-2 phút. Khi Terminal báo ✔️ xanh hết là cài đặt thành công!

## Bước 5: Bật tính năng "Tiêm tự động" (Sidecar Injection)
Cuối cùng, ta cài đặt luật cho khu vực làm việc mặc định (`default namespace`):

```bash
kubectl label namespace default istio-injection=enabled
```

Kể từ giây phút này trở đi, máy tính của bạn đã sở hữu một cụm Kubernetes có tích hợp Service Mesh cực mạnh. 
Bạn có thể tự tin gõ lệnh `kubectl apply -f platform/kube/bookinfo.yaml` và tận hưởng cột READY hiển thị **`2/2`**!
