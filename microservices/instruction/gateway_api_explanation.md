# Giải thích cấu hình Gateway API (`bookinfo-gateway.yaml`)

Đoạn mã YAML trên sử dụng tiêu chuẩn **Kubernetes Gateway API** (một bản nâng cấp và hiện đại hóa của tài nguyên `Ingress` cũ) để điều khiển luồng traffic (lưu lượng mạng) đi từ bên ngoài (Internet/External) vào bên trong cụm (Cluster) Kubernetes. 

Mục đích chính của file này là **mở một cánh cửa (Gateway) và định tuyến (Route) người dùng bên ngoài đi thẳng tới giao diện người dùng của ứng dụng Bookinfo**.

File này gồm 2 tài nguyên riêng biệt nhưng liên kết chặt chẽ với nhau: `Gateway` và `HTTPRoute`.

---

## 1. Tài nguyên `Gateway`

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

**Mục đích**: Định nghĩa một "điểm tiếp nhận" vật lý hoặc logic ở biên của mạng (Edge of network) để lắng nghe các kết nối từ bên ngoài.

**Giải thích chi tiết:**
- `kind: Gateway`: Khai báo đây là một đối tượng Gateway.
- `gatewayClassName: istio`: Đây là dòng cực kỳ quan trọng. Nó báo cho Kubernetes biết rằng Gateway này sẽ được điều khiển và thực thi bởi **Istio**. Cụ thể, Istio sẽ tự động triển khai một bộ cân bằng tải (thường là Envoy Proxy) để làm nhiệm vụ của Gateway này.
- `listeners`: Định nghĩa các cổng mà Gateway này sẽ lắng nghe.
  - `port: 80` và `protocol: HTTP`: Mở cổng 80 để đón nhận các kết nối giao thức HTTP thô (không mã hóa).
  - `allowedRoutes.namespaces.from: Same`: Nhằm mục đích bảo mật. Nó chỉ cho phép các cấu hình định tuyến (như `HTTPRoute`) nằm trong **cùng một namespace** với Gateway này được phép bám (bind) vào cổng 80 này.

---

## 2. Tài nguyên `HTTPRoute`

```yaml
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
    - path:
        type: PathPrefix
        value: /static
    - path:
        type: Exact
        value: /login
    - path:
        type: Exact
        value: /logout
    - path:
        type: PathPrefix
        value: /api/v1/products
    backendRefs:
    - name: productpage
      port: 9080
```

**Mục đích**: Chứa các quy tắc logic (Rules) để phân tích URL của người dùng và quyết định xem request đó sẽ được đẩy cho dịch vụ (Service) nào bên trong Cluster.

**Giải thích chi tiết:**
- `kind: HTTPRoute`: Tài nguyên định nghĩa quy tắc định tuyến HTTP.
- `parentRefs`: Liên kết (bind) route này vào Gateway `bookinfo-gateway` đã tạo ở trên. Bất kỳ traffic nào lọt qua Gateway đó mới được mang ra soi chiếu với quy tắc ở đây.
- `rules.matches`: Đây là danh sách các điều kiện. Nếu URL mà người dùng gõ vào trình duyệt khớp với **bất kỳ** điều kiện nào dưới đây thì quy tắc sẽ được kích hoạt:
  - Khớp chính xác (`Exact`): `/productpage`, `/login`, `/logout`.
  - Khớp theo tiền tố (`PathPrefix`): `/static` (bao gồm mọi thứ nằm trong `/static/` như CSS, JS, ảnh), `/api/v1/products` (bao gồm mọi API con).
- `backendRefs`: Đích đến của traffic. Nếu request khớp với điều kiện ở trên, nó sẽ được đẩy (forward) toàn bộ tới service nội bộ có tên là `productpage` tại cổng `9080`.

## Tóm tắt bản chất
Nếu không có file này, ứng dụng Bookinfo (bao gồm 4 microservices) chỉ có thể nói chuyện với nhau bên trong cụm (Internal), người ngoài không thể truy cập.

File này làm 2 việc:
1. Mở cổng 80 nhờ Istio (Gateway).
2. Quy định rằng: "Chỉ những ai truy cập vào đúng các trang như `/productpage`, `/login`... thì tôi mới cho phép đi qua cổng, và đích đến duy nhất tôi cho phép là service Frontend (`productpage` ở cổng `9080`)". 

Điều này giấu kín hoàn toàn các backend service nhạy cảm như `details`, `reviews`, `ratings` khỏi Internet.
