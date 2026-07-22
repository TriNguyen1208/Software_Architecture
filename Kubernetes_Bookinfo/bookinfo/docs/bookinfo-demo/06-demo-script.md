# Kịch bản Thuyết trình (Demo Script)

Kịch bản này được thiết kế để trình bày trực tiếp cho giảng viên hoặc đội ngũ kỹ thuật về ứng dụng Bookinfo chạy trên Kubernetes và Istio.

## Phần 1 — Giới thiệu bài toán

> "Chào mọi người. Hôm nay mình sẽ demo ứng dụng Bookinfo. Bookinfo là ứng dụng microservice mô phỏng một trang thông tin sách. Mục tiêu của demo không phải chức năng bán sách, mà là quan sát cách nhiều service, nhiều version và service mesh hoạt động trên Kubernetes."

## Phần 2 — Giải thích 4 service

> "Kiến trúc ứng dụng gồm 4 service chính:
> 1. `productpage` gọi đến `details` và `reviews`.
> 2. `details` trả về thông tin cơ bản của sách.
> 3. `reviews` trả về các đánh giá. Đặc biệt, `reviews` phiên bản v2 và v3 có gọi đến service thứ 4 là `ratings` để lấy số sao đánh giá.
> Như vậy, `productpage` đóng vai trò là service tổng hợp dữ liệu."

## Phần 3 — Giải thích Kubernetes resource

*(Mở file `platform/kube/bookinfo.yaml`)*

> "Nhìn vào manifest, chúng ta thấy cách định nghĩa. Đây là Deployment `reviews-v1`, nó chứa Pod template với container image `examples-bookinfo-reviews-v1`. Dưới đây là Service `reviews`.
> 
> Chú ý rằng Deployment quản lý việc tạo Pod, còn Service cung cấp địa chỉ mạng ổn định và chọn Pod bằng label selector `app: reviews`. Vì cả 3 deployment `v1`, `v2`, `v3` đều có chung label `app: reviews`, Service này sẽ định tuyến traffic đến cả 3 version."

## Phần 4 — Giải thích sidecar

*(Chạy lệnh `kubectl get pods -n bookinfo`)*

> "Mọi người có thể thấy cột READY hiển thị `2/2` thay vì `1/1` bình thường. 
> 
> Nghĩa là một container là ứng dụng của chúng ta, container còn lại là Envoy proxy do Istio tự động inject (Sidecar pattern). Envoy chặn toàn bộ traffic vào và ra của Pod, nhờ đó Istio có thể điều khiển routing (như chia phần trăm traffic) và thu thập telemetry (metric, log) mà không phải sửa một dòng business code nào."

## Phần 5 — Demo luồng truy cập

*(Mở trình duyệt, vào `/productpage`)*

> "Khi mình truy cập trang này, request đi từ Browser -> qua Ingress Gateway của Istio -> vào `productpage` -> gọi `details` và `reviews`. Nếu vào trúng `reviews` v2/v3, nó gọi tiếp `ratings`. Cuối cùng `productpage` render HTML và trả về."

## Phần 6 — Demo nhiều version

*(Refresh trang web liên tục bằng F5)*

> "Mình sẽ F5 trang này. Mọi người để ý phần đánh giá sách:
> - Có lúc không có sao (đó là v1)
> - Có lúc sao màu đen (v2)
> - Có lúc sao màu đỏ (v3)
>
> Ba Deployment có cùng app label nhưng khác version label. Kubernetes Service `reviews` có thể đưa traffic đến các Pod phù hợp theo kiểu Round-Robin. Istio có thể bổ sung rule để chọn chính xác version hoặc chia tỷ lệ traffic thông qua VirtualService và DestinationRule."

## Phần 7 — Kết luận

> "Tóm lại, hệ thống của chúng ta gồm ba lớp:
> 1. **Application layer**: Các Bookinfo microservices viết bằng nhiều ngôn ngữ.
> 2. **Orchestration layer**: Kubernetes xử lý Deployment, Pod, Service (DNS) và scaling.
> 3. **Service mesh layer**: Istio cung cấp Gateway, Envoy sidecar để quản lý routing, security và observability."
