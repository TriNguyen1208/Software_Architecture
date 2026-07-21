# Phân tích Repository Bookinfo

Dựa trên cấu trúc file trong `samples/bookinfo` (cụ thể là `platform/kube/bookinfo.yaml` và các rule trong `networking/`), dưới đây là phân tích kiến trúc của ứng dụng.

## 1. Thành phần Microservices

Bookinfo bao gồm 4 service chính (logical services):

| Logical service | Source path | Language | Deployment | Service | Port | Calls |
|---|---|---|---|---|---:|---|
| `productpage` | `src/productpage` | Python | `productpage-v1` | `productpage` | 9080 | Gọi `details` và `reviews` |
| `details` | `src/details` | Ruby | `details-v1` | `details` | 9080 | (Không gọi ai) |
| `reviews` | `src/reviews` | Java | `reviews-v1`, `reviews-v2`, `reviews-v3` | `reviews` | 9080 | v2/v3 gọi `ratings` |
| `ratings` | `src/ratings` | Node.js | `ratings-v1` | `ratings` | 9080 | (Không gọi ai) |

## 2. Kubernetes Resources

Theo `platform/kube/bookinfo.yaml`, hệ thống định nghĩa các tài nguyên sau:

- **ServiceAccounts**: Mỗi service có 1 service account riêng (`bookinfo-productpage`, `bookinfo-details`, `bookinfo-reviews`, `bookinfo-ratings`).
- **Services**: 4 Kubernetes Services tương ứng để cung cấp kết nối mạng nội bộ (`productpage`, `details`, `reviews`, `ratings`). Tất cả đều map port 9080 vào container port 9080.
- **Deployments**:
  - `productpage-v1`
  - `details-v1`
  - `reviews-v1` (Không có sao)
  - `reviews-v2` (Sao đen)
  - `reviews-v3` (Sao đỏ)
  - `ratings-v1`

## 3. Istio Networking Resources

Theo `networking/destination-rule-all.yaml`, các Subsets (phiên bản) được định nghĩa dựa trên label `version`:

- **productpage**: `v1`
- **details**: `v1`, `v2`
- **reviews**: `v1`, `v2`, `v3`
- **ratings**: `v1`, `v2`, `v2-mysql`, `v2-mysql-vm`

*Lưu ý*: Mặc dù destination rules định nghĩa nhiều subset cho details và ratings, manifest deployment chính (`bookinfo.yaml`) chỉ triển khai `v1` cho các service này. Trong khi đó, `reviews` thực sự được triển khai với cả 3 phiên bản.
