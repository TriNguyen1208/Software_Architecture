# Kubernetes, Istio, Prometheus và Grafana trong hệ thống Microservice

## 1. Tổng quan

Bốn công cụ này nằm ở các lớp khác nhau trong hệ thống microservice:

```text
Kubernetes → Chạy và quản lý các microservice
Istio      → Quản lý traffic giữa các microservice
Prometheus → Thu thập số liệu hệ thống
Grafana    → Hiển thị số liệu thành dashboard
```

Có thể ghi nhớ bằng bốn câu hỏi:

| Công cụ | Câu hỏi nó giải quyết |
|---|---|
| Kubernetes | Các microservice được chạy và quản lý như thế nào? |
| Istio | Traffic giữa các microservice được kiểm soát như thế nào? |
| Prometheus | Hệ thống đang hoạt động ra sao? |
| Grafana | Làm sao quan sát và phân tích số liệu dễ dàng? |

---

# 2. Kubernetes

## 2.1. Kubernetes là gì?

Kubernetes là nền tảng dùng để triển khai, vận hành và quản lý các container.

Trong hệ thống microservice, mỗi service thường được đóng gói thành một Docker image.

Ví dụ trong Bookinfo:

```text
productpage
details
reviews
ratings
```

Kubernetes chịu trách nhiệm chạy các container này trên cluster.

## 2.2. Tại sao cần Kubernetes?

Nếu chạy microservice thủ công, lập trình viên phải tự xử lý:

- Service nào đang chạy.
- Service bị chết thì khởi động lại như thế nào.
- Làm sao tăng từ một instance lên nhiều instance.
- Các service tìm thấy nhau bằng cách nào.
- Làm sao cập nhật phiên bản mới mà không dừng hệ thống.
- Làm sao phân phối request giữa nhiều instance.
- Làm sao kiểm tra container còn hoạt động hay không.

Kubernetes tự động hóa các công việc trên.

## 2.3. Kubernetes hoạt động như thế nào?

Các thành phần quan trọng:

```text
Deployment
    ↓ quản lý
ReplicaSet
    ↓ tạo và duy trì
Pod
    ↓ chứa
Container
```

Ví dụ:

```text
Deployment reviews-v1
    ├── Pod reviews-v1-abc
    └── Pod reviews-v1-xyz
```

### Deployment

Deployment mô tả trạng thái mong muốn của ứng dụng:

- Docker image cần chạy.
- Số lượng Pod.
- Port.
- Biến môi trường.
- Health check.
- Cách cập nhật phiên bản.
- Chiến lược rolling update.

### Pod

Pod là đơn vị triển khai nhỏ nhất trong Kubernetes.

Một Pod có thể chứa một hoặc nhiều container.

Trong hệ thống sử dụng Istio, một Pod thường chứa:

```text
Application container
+
istio-proxy container
```

### Service

Kubernetes Service cung cấp địa chỉ mạng ổn định cho các Pod.

Ví dụ:

```text
productpage gọi http://reviews:9080
```

Trong đó `reviews` là tên của Kubernetes Service.

Productpage không cần biết IP thật của từng Pod reviews vì Pod có thể bị xóa và tạo lại bất cứ lúc nào.

Service sẽ chọn Pod thông qua label selector.

Ví dụ:

```yaml
selector:
  app: reviews
```

Các Pod có label sau sẽ được Service chọn:

```yaml
labels:
  app: reviews
```

## 2.4. Ý nghĩa của Kubernetes trong microservice

Kubernetes giải quyết lớp deployment và orchestration:

```text
Triển khai service
Khởi động lại khi lỗi
Scale số lượng Pod
Service discovery
Load balancing cơ bản
Rolling update
Health check
Quản lý cấu hình
Quản lý tài nguyên CPU và RAM
```

---

# 3. Istio

## 3.1. Istio là gì?

Istio là một Service Mesh.

Service Mesh là lớp hạ tầng quản lý việc giao tiếp giữa các microservice.

Kubernetes giúp các service chạy được.

Istio giúp kiểm soát cách các service giao tiếp với nhau.

## 3.2. Tại sao cần Istio?

Trong hệ thống microservice, service A gọi service B có thể gặp:

- Request bị timeout.
- Service B bị lỗi.
- Network không ổn định.
- Request cần retry.
- Muốn giới hạn traffic.
- Muốn chia một phần traffic sang version mới.
- Muốn mã hóa giao tiếp giữa các service.
- Muốn biết service nào đang chậm.
- Muốn xác định request đi qua những service nào.
- Muốn áp dụng security policy thống nhất.

Nếu viết toàn bộ logic này vào source code, mỗi microservice phải lặp lại rất nhiều code.

Istio đưa các chức năng này xuống lớp hạ tầng.

## 3.3. Istio hoạt động như thế nào?

Istio thường inject thêm một Envoy Proxy container vào mỗi Pod.

Trước khi có Istio:

```text
reviews Pod
└── reviews container
```

Sau khi có Istio:

```text
reviews Pod
├── reviews container
└── istio-proxy container
```

Request không còn đi trực tiếp hoàn toàn từ application này sang application khác.

Luồng đơn giản:

```text
productpage application
        ↓
productpage Envoy proxy
        ↓
reviews Envoy proxy
        ↓
reviews application
```

Envoy Proxy có thể:

- Route traffic.
- Retry.
- Timeout.
- Circuit breaking.
- Load balancing nâng cao.
- Thu thập metrics.
- Mã hóa bằng mTLS.
- Áp dụng authorization policy.

## 3.4. Control Plane và Data Plane

Istio có hai phần chính:

```text
Control Plane: istiod
Data Plane: Envoy Proxy
```

### Control Plane

Control Plane thường là `istiod`.

Nó chịu trách nhiệm:

- Nhận cấu hình Istio.
- Phân phối cấu hình cho Envoy.
- Quản lý service discovery.
- Hỗ trợ certificate và mTLS.
- Đồng bộ chính sách traffic.

### Data Plane

Data Plane là các Envoy Proxy chạy cùng với workload.

Envoy chịu trách nhiệm:

- Nhận và chuyển tiếp traffic.
- Áp dụng routing rule.
- Áp dụng retry và timeout.
- Phát sinh telemetry.
- Áp dụng policy bảo mật.

## 3.5. Ý nghĩa của Istio trong microservice

Istio giải quyết lớp communication:

```text
Traffic routing
Canary deployment
Retries
Timeouts
Circuit breaking
mTLS
Authorization
Observability
Traffic splitting
Fault injection
```

## 3.6. Ví dụ với Bookinfo

Bookinfo có ba version của reviews:

```text
reviews-v1
reviews-v2
reviews-v3
```

Istio có thể route:

```text
100% request → reviews-v1
```

Hoặc:

```text
90% request → reviews-v1
10% request → reviews-v2
```

Đây là một ví dụ về canary deployment.

Istio cũng có thể route theo header hoặc user:

```text
User jason → reviews-v2
User khác  → reviews-v1
```

---

# 4. Prometheus

## 4.1. Prometheus là gì?

Prometheus là hệ thống thu thập và lưu trữ metrics.

Metrics là các số liệu định lượng về trạng thái và hiệu năng hệ thống.

Ví dụ:

```text
Số request mỗi giây
Response time
Error rate
CPU
RAM
Số Pod đang chạy
Số response HTTP 500
p90 latency
p95 latency
p99 latency
```

## 4.2. Tại sao cần Prometheus?

Trong hệ thống microservice có nhiều service, không thể kiểm tra thủ công từng service.

Ví dụ người dùng báo:

> Website đang chậm.

Cần trả lời được:

- Service nào đang chậm?
- CPU có cao không?
- RAM có bị thiếu không?
- Request lỗi ở productpage hay reviews?
- Lỗi xảy ra từ lúc nào?
- Có bao nhiêu request bị ảnh hưởng?
- Version nào đang gây lỗi?
- Error rate có tăng không?

Prometheus thu thập dữ liệu để giúp trả lời các câu hỏi trên.

## 4.3. Prometheus hoạt động như thế nào?

Prometheus thường sử dụng cơ chế pull.

Nó định kỳ gọi vào endpoint metrics của ứng dụng hoặc hạ tầng:

```text
Prometheus
    ├── Pull metrics từ Kubernetes
    ├── Pull metrics từ Istio
    ├── Pull metrics từ application
    └── Lưu vào time-series database
```

Dữ liệu được lưu theo thời gian.

Ví dụ metric:

```text
http_requests_total
```

Metric có thể có label:

```text
service="reviews"
status="500"
version="v2"
```

Dữ liệu có thể có dạng:

```text
http_requests_total{
  service="reviews",
  status="500",
  version="v2"
} 25
```

Điều này có nghĩa là metric có giá trị 25 với các thuộc tính tương ứng.

## 4.4. Prometheus trong Bookinfo

Envoy Proxy do Istio quản lý có thể tạo metrics cho traffic.

Prometheus có thể thu thập các metrics như:

```text
istio_requests_total
istio_request_duration_milliseconds
istio_tcp_connections_opened_total
```

Từ đó có thể biết:

```text
productpage gọi reviews bao nhiêu lần
reviews-v2 lỗi bao nhiêu request
ratings có response time bao nhiêu
service nào có nhiều HTTP 500
version nào đang có latency cao
```

## 4.5. Ý nghĩa của Prometheus trong microservice

Prometheus giải quyết lớp monitoring data collection:

```text
Thu thập metrics
Lưu metrics theo thời gian
Query bằng PromQL
Tạo alert
Phát hiện bất thường
Đánh giá hiệu năng
Theo dõi SLA và SLO
```

---

# 5. Grafana

## 5.1. Grafana là gì?

Grafana là công cụ trực quan hóa dữ liệu.

Prometheus lưu dữ liệu, còn Grafana lấy dữ liệu từ Prometheus và hiển thị thành dashboard.

```text
Prometheus → dữ liệu
Grafana    → biểu đồ và dashboard
```

## 5.2. Tại sao cần Grafana?

Dữ liệu trong Prometheus thường được truy vấn bằng PromQL.

Ví dụ:

```promql
sum(rate(istio_requests_total[5m]))
```

Việc đọc các query và số liệu thô có thể khó.

Grafana giúp chuyển dữ liệu thành:

- Biểu đồ response time.
- Biểu đồ số request mỗi giây.
- Biểu đồ error rate.
- CPU và RAM.
- Trạng thái Pod.
- Dashboard theo từng service.
- Dashboard theo từng version.
- Dashboard theo namespace.
- Dashboard về traffic trong service mesh.

## 5.3. Grafana hoạt động như thế nào?

Grafana kết nối với Prometheus như một data source.

Luồng dữ liệu:

```text
Microservices / Istio / Kubernetes
              ↓
          Prometheus
              ↓
           Grafana
              ↓
        Dashboard người dùng
```

Grafana thường không trực tiếp thu thập metrics từ microservice.

Nó truy vấn dữ liệu đã được Prometheus lưu trữ.

## 5.4. Ý nghĩa của Grafana trong microservice

Grafana giải quyết lớp visualization:

```text
Dashboard
Biểu đồ
Theo dõi gần thời gian thực
So sánh các service
Theo dõi SLA và SLO
Hỗ trợ điều tra sự cố
Theo dõi xu hướng hiệu năng
```

---

# 6. Cách bốn công cụ kết hợp với nhau

```text
                         ┌─────────────────┐
                         │     Grafana     │
                         │    Dashboard    │
                         └────────▲────────┘
                                  │ Query
                         ┌────────┴────────┐
                         │   Prometheus    │
                         │ Collect metrics │
                         └────────▲────────┘
                                  │ Scrape
┌─────────────────────────────────┼────────────────────────────┐
│                    Kubernetes Cluster                        │
│                                                              │
│   ┌──────────────────┐       ┌──────────────────┐            │
│   │ productpage Pod  │       │   reviews Pod    │            │
│   │                  │       │                  │            │
│   │ productpage app  │       │ reviews app      │            │
│   │ istio-proxy      │──────▶│ istio-proxy      │            │
│   └──────────────────┘       └──────────────────┘            │
│                                                              │
│                    Istio Service Mesh                        │
└──────────────────────────────────────────────────────────────┘
```

Vai trò của từng lớp:

```text
Kubernetes xử lý workload.
Istio xử lý traffic.
Prometheus thu thập dữ liệu.
Grafana hiển thị dữ liệu.
```

---

# 7. Áp dụng vào Bookinfo

Bookinfo có request flow:

```text
Browser
   ↓
Istio Ingress Gateway
   ↓
productpage
   ├── details
   └── reviews
          ↓
        ratings
```

## 7.1. Kubernetes làm gì?

Kubernetes tạo và quản lý:

```text
Deployment productpage-v1
Deployment details-v1
Deployment reviews-v1
Deployment reviews-v2
Deployment reviews-v3
Deployment ratings-v1
```

Kubernetes Service cung cấp DNS ổn định:

```text
productpage
details
reviews
ratings
```

Ví dụ:

```text
productpage gọi http://details:9080
productpage gọi http://reviews:9080
reviews gọi http://ratings:9080
```

Productpage không cần biết IP thật của từng Pod.

## 7.2. Istio làm gì?

Istio:

- Nhận traffic từ bên ngoài qua Ingress Gateway.
- Route request đến productpage.
- Quản lý traffic giữa productpage, reviews, details và ratings.
- Có thể cố định traffic đến một version reviews.
- Có thể chia traffic giữa nhiều version.
- Có thể retry khi service lỗi.
- Có thể cấu hình timeout.
- Có thể bật mTLS.
- Thu thập telemetry từ Envoy.

## 7.3. Prometheus làm gì?

Prometheus thu thập:

```text
Số request đến productpage
Số request từ productpage đến reviews
Error rate của ratings
Response time của reviews-v1
Response time của reviews-v2
Response time của reviews-v3
CPU và RAM của workload
```

## 7.4. Grafana làm gì?

Grafana hiển thị:

```text
Request per second
Success rate
HTTP error rate
Latency
CPU và RAM
Traffic theo từng service
Traffic theo từng version
Tình trạng Pod
```

---

# 8. Request flow chi tiết

Một request đến Bookinfo có thể đi theo luồng sau:

```text
1. Người dùng mở /productpage.
2. Request đi vào Istio Ingress Gateway.
3. Gateway áp dụng routing rule.
4. Request được chuyển đến Kubernetes Service productpage.
5. Service chọn một productpage Pod.
6. Envoy sidecar chuyển request vào application container.
7. Productpage gọi details.
8. Traffic đi qua Envoy sidecar của productpage.
9. Kubernetes Service details chọn một details Pod.
10. Details trả dữ liệu về productpage.
11. Productpage gọi reviews.
12. Kubernetes Service reviews chọn một reviews Pod.
13. Nếu là reviews-v2 hoặc reviews-v3, reviews tiếp tục gọi ratings.
14. Ratings trả dữ liệu rating về reviews.
15. Reviews trả dữ liệu về productpage.
16. Productpage render HTML.
17. Response quay lại qua Ingress Gateway.
18. Browser nhận trang hoàn chỉnh.
```

---

# 9. Ví dụ khi xảy ra sự cố

Giả sử người dùng báo:

> Trang Bookinfo load rất chậm.

Có thể xử lý theo trình tự:

## Bước 1: Quan sát Grafana

Grafana cho thấy latency của `reviews` tăng cao.

## Bước 2: Phân tích dữ liệu Prometheus

Prometheus cho thấy `reviews-v3` có nhiều request chậm hoặc nhiều lỗi.

## Bước 3: Điều chỉnh traffic bằng Istio

Tạm thời route traffic từ `reviews-v3` về `reviews-v1`.

Ví dụ:

```text
100% traffic → reviews-v1
```

## Bước 4: Xử lý workload bằng Kubernetes

Có thể:

- Restart Pod reviews-v3.
- Scale thêm Pod.
- Rollback image.
- Kiểm tra CPU và RAM.
- Kiểm tra readiness probe.

## Bước 5: Xác nhận lại trên Grafana

Grafana cho thấy response time trở lại bình thường.

Ý nghĩa thực tế:

```text
Kubernetes giúp sửa và duy trì workload.
Istio giúp điều chỉnh traffic.
Prometheus cung cấp dữ liệu để chẩn đoán.
Grafana giúp quan sát dữ liệu dễ dàng.
```

---

# 10. So sánh nhanh

| Tiêu chí | Kubernetes | Istio | Prometheus | Grafana |
|---|---|---|---|---|
| Nhóm công cụ | Container orchestration | Service mesh | Monitoring | Visualization |
| Quản lý Pod | Có | Không | Không | Không |
| Quản lý traffic nâng cao | Hạn chế | Có | Không | Không |
| Thu thập metrics | Không phải vai trò chính | Sinh telemetry | Có | Không |
| Lưu metrics | Không | Không | Có | Không |
| Dashboard | Có dashboard quản trị cơ bản tùy môi trường | Không phải vai trò chính | Không phải thế mạnh | Có |
| Retry và timeout | Không ở mức service mesh | Có | Không | Không |
| Canary routing | Rolling update cơ bản | Có traffic splitting | Không | Không |
| Theo dõi latency | Không trực tiếp | Sinh metric | Thu thập và lưu | Hiển thị |
| mTLS giữa service | Không mặc định | Có | Không | Không |

---

# 11. Cách ghi nhớ

## Kubernetes

> Chạy và quản lý các microservice.

## Istio

> Kiểm soát cách các microservice giao tiếp.

## Prometheus

> Thu thập và lưu số liệu của hệ thống.

## Grafana

> Biến số liệu thành dashboard dễ quan sát.

---

# 12. Kết luận

Trong hệ thống microservice:

```text
Kubernetes giúp microservice chạy ổn định.

Istio giúp các microservice giao tiếp có kiểm soát.

Prometheus giúp thu thập tình trạng và hiệu năng hệ thống.

Grafana giúp con người nhìn, theo dõi và phân tích tình trạng đó.
```

Bốn công cụ không thay thế nhau mà bổ sung cho nhau:

```text
Kubernetes → Workload
Istio      → Traffic
Prometheus → Metrics
Grafana    → Dashboard
```