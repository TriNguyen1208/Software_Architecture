# Hướng dẫn Triển khai Bookinfo

Hướng dẫn này mô tả chi tiết các bước để triển khai Bookinfo lên môi trường Kubernetes với Istio.

> **Lưu ý Môi trường**: Hệ thống hiện tại thiếu `istioctl`. Bạn cần tải và thêm `istioctl` vào PATH trước khi chạy các lệnh liên quan đến cài đặt Istio. Các lệnh `kubectl` cơ bản vẫn hoạt động bình thường.

## Step 1 — Kiểm tra công cụ

```shell
kubectl version --client
docker version
docker version
```

## Step 2 — Kiểm tra hoặc cài Istio

```shell
# Kiểm tra nếu Istio đã cài đặt
kubectl get namespace istio-system

# Nếu chưa, cài đặt Istio profile demo
istioctl install --set profile=demo -y
```

- `profile=demo` là cấu hình nhẹ phù hợp cho việc học và demo, cung cấp đủ control plane (`istiod`) và Ingress Gateway.

## Step 3 — Tạo namespace demo và bật injection

```shell
kubectl create namespace bookinfo
kubectl label namespace bookinfo istio-injection=enabled
```
- `kubectl create namespace bookinfo`: Tạo một namespace tên là `bookinfo`.
- `kubectl label namespace bookinfo istio-injection=enabled`: Gắn label "istio-injection=enabled" vào namespace `bookinfo`. Điều này ra lệnh cho Istio "Tự động (inject) sidecar vào tất cả các Pod mới được tạo ra trong namespace này"
- VD: Khi Kubernetes chuẩn bị tạo Pod cho productpage, Istio phát hiện ra cái nhãn ở namespace. Nó liền "nhét" lén thêm 1 container nữa (gọi là istio-proxy) vào cấu hình Pod.

## Step 4 — Deploy Bookinfo

```shell
kubectl apply -n bookinfo -f platform/kube/bookinfo.yaml
```

- Lệnh này tạo các ServiceAccount, Kubernetes Service, Deployment, ReplicaSet và Pod. Container thực tế sẽ do Docker/Containerd runtime tạo theo PodSpec.

## Step 5 — Kiểm tra workload và Sidecar

```shell
kubectl get pods -n bookinfo 
```
Bạn sẽ thấy `READY 2/2` cho mỗi Pod (1 app container + 1 istio-proxy sidecar).



## Step 6 — Deploy Gateway

```shell
kubectl apply -n bookinfo -f networking/bookinfo-gateway.yaml
```

- Tạo `Gateway` (cho phép traffic qua cổng 80 vào mesh) và `VirtualService` (định tuyến `/productpage` và các API liên quan đến service `productpage`).

## Step 7 — Truy cập ứng dụng

```shell
kubectl port-forward -n istio-system svc/istio-ingressgateway 8080:80
```

- Mở trình duyệt tại: `http://localhost:8080/productpage`

## Step 8 — Demo nhiều version reviews

- F5 (refresh) trang nhiều lần. Bạn sẽ quan sát thấy giao diện thay đổi:
  - Không có sao (reviews-v1)
  - Sao màu đen (reviews-v2)
  - Sao màu đỏ (reviews-v3)
- Bằng chứng cho việc Kubernetes Service load balance traffic đều cho cả 3 version.

## Step 9 — Định nghĩa subset (Destination Rules)

```shell
kubectl apply -n bookinfo -f networking/destination-rule-all.yaml
```

- Khai báo các Subsets (`v1`, `v2`, `v3`) cho các service, chuẩn bị cho việc định tuyến traffic chi tiết của Istio.

## Step 10 — Demo traffic routing (Tuỳ chọn)

Ví dụ: Định tuyến 100% traffic vào v1:

```shell
kubectl apply -n bookinfo -f networking/virtual-service-all-v1.yaml
```
- Refresh trang, lúc này bạn sẽ chỉ thấy giao diện không có sao (v1).



# 1. Cài đặt Prometheus Addon
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
# 2. Cài đặt Grafana Addon (đã được cấu hình sẵn các Dashboard cho Istio)
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml

kubectl get pods -n istio-system

kubectl port-forward -n istio-system svc/prometheus 9090:9090

Hỏi câu lệnh PromQL:
    istio_requests_total : Tổng số request đã đi qua Service Mesh.
    rate(istio_requests_total[1m]) : Tốc độ request trên giây (RPS) trong 1 phút qua.
    sum(rate(istio_requests_total{reporter="destination"}[1m])) by (destination_workload, response_code) : Phân loại request theo service đích và mã HTTP status (200, 500,...).

kubectl port-forward -n istio-system svc/grafana 3000:3000