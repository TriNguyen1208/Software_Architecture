# Execution Log

## [2026-07-18 15:10:00] Step 1 — Phân tích repository

**Command**

```shell
# (No specific shell command, analyzed via directory listing and file reads)
```

**Reason**

Để hiểu kiến trúc các file manifest và source code trước khi thực hiện bất kỳ lệnh thay đổi nào.

**Expected**

Xác định được các deployment, service, port và image đang được dùng.

**Actual**

Đã xác định 4 service (`productpage`, `details`, `reviews`, `ratings`) với cấu hình Deployment tương ứng (reviews có v1, v2, v3).

**Interpretation**

Dữ liệu phân tích khớp với tài liệu Bookinfo chuẩn của Istio.

**Status**

SUCCESS

**Next action**

Kiểm tra môi trường.

---

## [2026-07-18 15:11:00] Step 2 — Kiểm tra công cụ

**Command**

```shell
kubectl version --client; docker version; istioctl version
```

**Reason**

Xác nhận hệ thống có đủ các công cụ cần thiết để giao tiếp với Kubernetes và Istio.

**Expected**

Cả ba lệnh đều trả về phiên bản hợp lệ, cho thấy công cụ đã sẵn sàng.

**Actual**

```text
Client Version: v1.36.1
Docker Version: 29.6.1
istioctl: The term 'istioctl' is not recognized...
```

**Interpretation**

Hệ thống có Kubernetes và Docker, nhưng thiếu `istioctl`. Không thể cài đặt và tương tác với Istio thông qua CLI hiện tại.

**Status**

FAILED (Partial)

**Next action**

Tài liệu hoá các lệnh triển khai tiếp theo nhưng không thực thi trực tiếp trên hệ thống do thiếu `istioctl`. Đánh dấu trạng thái UNVERIFIED.

---

## [YYYY-MM-DD HH:mm:ss] Step 3 — Cài đặt Istio

**Command**

```shell
istioctl install --set profile=demo -y
```

**Reason**

Khởi tạo control plane (`istiod`) và Ingress Gateway để kích hoạt Service Mesh.

**Expected**

Control plane và gateway chuyển sang trạng thái Ready.

**Actual**

`UNVERIFIED - Bỏ qua vì thiếu istioctl`

**Interpretation**

N/A

**Status**

SKIPPED

**Next action**

Chờ cài đặt `istioctl` hoặc thiết lập thủ công.
