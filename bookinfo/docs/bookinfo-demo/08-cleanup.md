# Hướng dẫn Dọn dẹp (Cleanup)

Sau khi demo, bạn nên dọn dẹp các resource để giải phóng bộ nhớ cho cụm Kubernetes.

## 1. Dọn dẹp ứng dụng Bookinfo

Xóa hoàn toàn namespace `bookinfo` sẽ xóa tất cả Deployment, Service, Pod và các rule định tuyến liên quan.

```shell
kubectl delete namespace bookinfo
```

> Lưu ý: Quá trình xoá namespace có thể mất 1-2 phút để Kubernetes xoá xong toàn bộ resource con bên trong.

## 2. Gỡ cài đặt Istio (Chỉ làm khi cần)

Nếu bạn đã cài Istio vào `istio-system` và muốn dọn dẹp cụm hoàn toàn:

```shell
istioctl uninstall -y --purge
kubectl delete namespace istio-system
```

*(Lệnh trên yêu cầu `istioctl` phải hoạt động).*
