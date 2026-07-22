# Môi trường kiểm chứng

## Trạng thái hệ thống

- **Hệ điều hành**: Windows 11 (hoặc tương đương)
- **Shell**: PowerShell
- **Kubernetes Client**: v1.36.1
- **Docker**: 29.6.1 (Docker Desktop)
- **Kubernetes Context**: docker-desktop (Local cluster)
- **Istio CLI (`istioctl`)**: **Không tìm thấy**

## Đánh giá môi trường

Môi trường hiện tại có Docker và Kubernetes hoạt động bình thường, đảm bảo khả năng triển khai các microservice (Pod, Deployment, Service). Tuy nhiên, thiếu `istioctl` đồng nghĩa với việc:

1. Không thể tự động cài đặt Istio control plane thông qua CLI.
2. Không thể tự động inject Envoy sidecar nếu chưa cấu hình webhook từ trước.
3. Các tính năng về traffic routing (VirtualService, DestinationRule) sẽ không thể kiểm chứng live nếu thiếu Istio Ingress Gateway và control plane.

> ⚠️ **Lưu ý**: Tài liệu này và các script kèm theo vẫn được tạo dựa trên phân tích từ repository để phục vụ mục đích kiến trúc và lý thuyết. Các phần cần kiểm chứng bằng Istio sẽ được đánh dấu là "UNVERIFIED" trong execution log.
