# Giải thích Kiến trúc và Code cốt lõi của Bookinfo

Tài liệu này giải thích "bản chất bên trong" của ứng dụng Bookinfo thông qua việc phân tích các file cấu hình hạ tầng và source code của 4 microservices chính. Thay vì liệt kê mọi dòng code (có thể lên tới hàng ngàn dòng), tôi sẽ trích xuất và giải thích các **khối code cốt lõi nhất** định hình nên hành vi của hệ thống.

---

## 1. Cấu hình Hạ tầng & Định tuyến (Kubernetes & Gateway API)

### 1.1 `gateway-api/bookinfo-gateway.yaml`
File này sử dụng chuẩn Kubernetes Gateway API để cấu hình cổng vào (ingress) đón traffic từ bên ngoài vào cluster.

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: bookinfo-gateway
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    port: 80
    protocol: HTTP
    allowedRoutes:
      namespaces:
        from: Same
```
- **Gateway**: Định nghĩa một cổng giao tiếp mạng ở biên của cluster, lắng nghe ở cổng `80` (HTTP). Chỉ thị `gatewayClassName: istio` báo cho Istio Controller biết để cấp phát một load balancer thực tế (Envoy Proxy) đảm nhiệm vai trò Gateway này.

```yaml
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: bookinfo
spec:
  parentRefs:
  - name: bookinfo-gateway
  rules:
  - matches:
    - path:
        type: Exact
        value: /productpage
    ...
    backendRefs:
    - name: productpage
      port: 9080
```
- **HTTPRoute**: Quyết định đường đi của HTTP traffic sau khi qua Gateway. Mọi request khớp với đường dẫn như `/productpage`, `/login`, `/api/v1/products` sẽ được điều hướng (backendRefs) về service `productpage` ở cổng `9080`. 
- **Bản chất**: Toàn bộ traffic của người dùng từ Internet đều đi qua một điểm duy nhất là Frontend (`productpage`), các backend còn lại sẽ bị ẩn bên trong mạng nội bộ.

### 1.2 `platform/kube/bookinfo.yaml`
File này chứa định nghĩa topology toàn bộ mạng lưới của 4 microservices. Cấu trúc lặp lại cho mỗi service gồm:
- **ServiceAccount**: Danh tính k8s cho service (rất quan trọng trong hệ thống Istio để thực hiện bảo mật mTLS hoặc RBAC).
- **Service**: Định nghĩa địa chỉ DNS nội bộ (ví dụ: `details`, `reviews`) và cổng `9080` để các pod gọi nhau.
- **Deployment**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: productpage-v1
spec:
  replicas: 3 # Số lượng bản sao
  ...
      containers:
      - name: productpage
        image: productpage:custom-v1 # Docker image
        ports:
        - containerPort: 9080
```
- **Đặc biệt với service `reviews`**: Khai báo tới 3 Deployment khác nhau (`reviews-v1`, `reviews-v2`, `reviews-v3`). 
  - `v1`: Không hiển thị sao (không gọi ratings).
  - `v2`: Hiển thị sao màu đen (có gọi ratings).
  - `v3`: Hiển thị sao màu đỏ (có gọi ratings).
- **Bản chất**: Đây là bản thiết kế để Kubernetes dựng lên các Pod. Khi cài Istio, Envoy proxy sẽ tự động được tiêm (inject) vào bên trong các Pod này để chặn và quản lý mọi traffic ra/vào mà không cần sửa code.

---

## 2. Logic Source Code của các Microservices

### 2.1 `src/productpage/productpage.py` (Python / Flask)
Đây là Frontend / Orchestrator của hệ thống. Dựng giao diện web và đi lấy dữ liệu từ các service khác.

```python
# Gọi các biến môi trường để tìm địa chỉ của các backend
detailsHostname = os.environ.get("DETAILS_HOSTNAME", "details")
detailsPort = os.environ.get("DETAILS_SERVICE_PORT", "9080")
# ... tương tự cho reviews, ratings
```
- **Khám phá dịch vụ (Service Discovery)**: Service kết nối với nhau bằng hostname DNS của Kubernetes (`details`, `reviews`) thay vì IP tĩnh.

```python
def getForwardHeaders(request):
    # Trích xuất các header liên quan đến tracing (x-b3-*, x-request-id,...)
    ...
```
- **Distributed Tracing (Truy vết phân tán)**: Bản chất của Microservice là một request sẽ đi qua nhiều tầng service. Hàm này lấy các header nhận dạng từ request gốc của trình duyệt và "nhét" vào request gọi xuống backend. Nhờ vậy, hệ thống (như Jaeger/Zipkin) mới có thể gom các request rời rạc lại thành 1 trace hoàn chỉnh.

```python
@app.route('/productpage')
def front():
    ...
    detailsStatus, details = getProductDetails(product_id, headers)
    reviewsStatus, reviews = getProductReviews(product_id, headers)
    return render_template('productpage.html', ...)
```
- **API logic**: Khi người dùng tải trang `/productpage`, Python gửi HTTP request đi lấy thông tin từ service `details` và `reviews`, ráp chúng lại và render ra file HTML.

### 2.2 `src/details/details.rb` (Ruby / WEBrick)
Service cung cấp thông tin sách (tác giả, số trang, năm xuất bản...).

```ruby
server.mount_proc '/details' do |req, res|
    id = Integer(pathParts[-1])
    details = get_book_details(id, headers)
    res.body = details.to_json
end
```
- **Logic**: Mở server, khi có request GET `/details/:id`, sẽ trả về một cục JSON.

```ruby
def get_book_details(id, headers)
    if ENV['ENABLE_EXTERNAL_BOOK_SERVICE'] === 'true' then
        return fetch_details_from_external_service(isbn, id, headers) # Gọi Google Books API
    end
    return { 'author': 'William Shakespeare', 'pages' => 200 ... } # Trả về mock data
end
```
- **Cơ chế gọi ngoại mạng (Egress)**: Mặc định service sẽ trả về data hardcode giả (mock). Tuy nhiên, nếu set cờ môi trường, nó sẽ gọi Internet (Google Books API). Chức năng này được dùng để minh họa cơ chế kiểm soát Egress Traffic của Service Mesh.

### 2.3 `src/reviews/reviews-application/.../LibertyRestEndpoint.java` (Java / JAX-RS)
Service đánh giá sách, có đặc điểm là nó lại đi gọi tiếp sang một tầng service thứ 3 là `ratings`.

```java
private final static Boolean ratings_enabled = Boolean.valueOf(System.getenv("ENABLE_RATINGS"));
private final static String star_color = System.getenv("STAR_COLOR") == null ? "black" : System.getenv("STAR_COLOR");
```
- **Phân biệt phiên bản (Version differentiation)**: Bản chất sự khác biệt giữa 3 version `v1, v2, v3` của `reviews` hoàn toàn nằm ở biến môi trường truyền vào lúc start Pod, chứ không phải do code Java khác nhau:
  - `v1`: ENABLE_RATINGS = false
  - `v2`: ENABLE_RATINGS = true, STAR_COLOR = black
  - `v3`: ENABLE_RATINGS = true, STAR_COLOR = red

```java
private JsonObject getRatings(String productId, HttpHeaders requestHeaders) {
    WebTarget ratingsTarget = client.target(ratings_service + "/" + productId);
    ...
    // Propagate headers để giữ nguyên tracing
    for (String header : headers_to_propagate) { ... builder.header(header,value); }
    Response r = builder.get();
}
```
- Dùng Client Java JAX-RS HTTP gửi request, đồng thời sao chép chuỗi headers truy vết (tracing propagation) giống như cơ chế của Python Frontend.

### 2.4 `src/ratings/ratings.js` (Node.js / HttpDispatcher)
Service lưu số lượng sao. Đây là service duy nhất trong Bookinfo có khả năng kết nối DB thật.

```javascript
if (process.env.SERVICE_VERSION === 'v2') {
  if (process.env.DB_TYPE === 'mysql') {
     // Khởi tạo kết nối MySQL qua module mysql
  } else {
     // Khởi tạo kết nối MongoDB qua MongoClient
  }
}
```
- **Đa Cơ sở dữ liệu**: Dựa vào `SERVICE_VERSION`, app sẽ quyết định lấy kết quả từ MySQL, MongoDB, hay chỉ là in-memory array (v1).

```javascript
if (process.env.SERVICE_VERSION === 'v-faulty') {
   var random = Math.random();
   if (random <= 0.5) { getLocalReviewsServiceUnavailable(res) } // Lỗi 503
   else { getLocalReviewsSuccessful(res, productId) }
}
```
- **Mô phỏng lỗi (Chaos Engineering)**: Kịch bản `v-faulty` (50% lỗi HTTP 503) và `v-delayed` (50% delay 7 giây) được thiết kế có chủ đích. Nó giúp người học Istio có môi trường lý tưởng để thực hành tính năng Retry (thử lại) và Circuit Breaker (ngắt mạch) mà không cần phải can thiệp phá hỏng server vật lý.
