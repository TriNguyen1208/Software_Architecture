# Báo cáo kết quả kiểm thử tải với K6 (k6 run script_test.js)

Dưới đây là giải thích chi tiết cho từng dòng kết quả kiểm thử của bạn:

## 1. Thông tin cơ bản về quá trình thực thi

```text
     execution: local
        script: script_test.js
        output: -
```
* **execution: local**: Bài kiểm thử được chạy cục bộ trên máy tính của bạn (không phải trên hệ thống cloud của k6).
* **script: script_test.js**: Tên của tệp mã nguồn k6 được sử dụng để kiểm thử.
* **output: -**: Đầu ra của kết quả hiển thị trực tiếp trên màn hình terminal (standard output), không ghi vào file cụ thể nào.

## 2. Thông tin kịch bản (Scenarios)

```text
     scenarios: (100.00%) 1 scenario, 50 max VUs, 3m10s max duration (incl. graceful stop):
              * test_50_concurrent_users: 50 looping VUs for 3m0s (gracefulStop: 10s)
```
* **scenarios**: Bạn có 1 kịch bản kiểm thử (chiếm 100% lượng công việc).
* **50 max VUs**: Số lượng người dùng ảo (Virtual Users - VUs) tối đa đồng thời là 50.
* **3m10s max duration**: Tổng thời gian tối đa chạy kịch bản này là 3 phút 10 giây (bao gồm 10 giây chờ dừng an toàn - graceful stop).
* **test_50_concurrent_users**: Tên của kịch bản là `test_50_concurrent_users`. Trong đó 50 VUs sẽ chạy lặp lại liên tục các yêu cầu (looping) trong thời gian 3 phút, với thời gian chờ cho các request dở dang hoàn thành trước khi ngắt là 10 giây (gracefulStop).

## 3. Ngưỡng cảnh báo (Thresholds)

```text
  █ THRESHOLDS 

    http_req_duration
    ✗ 'p(95)<500' p(95)=2.91s

    http_req_failed
    ✓ 'rate<0.01' rate=0.00%
```
Đây là các tiêu chí đánh giá thành công/thất bại mà bạn đã định nghĩa trong kịch bản k6:
* **http_req_duration ✗ 'p(95)<500' p(95)=2.91s**: Ngưỡng này **THẤT BẠI (✗)**. Bạn kỳ vọng 95% số lượng HTTP request có thời gian phản hồi dưới 500ms (0.5s), nhưng thực tế 95% request có thời gian phản hồi lên tới 2.91s (2910ms).
* **http_req_failed ✓ 'rate<0.01' rate=0.00%**: Ngưỡng này **THÀNH CÔNG (✓)**. Bạn kỳ vọng tỷ lệ lỗi HTTP (như 4xx, 5xx) nhỏ hơn 1% (0.01). Thực tế tỷ lệ lỗi là 0.00%, rất tốt.

## 4. Tổng quan các kiểm tra (Checks)

```text
  █ TOTAL RESULTS 

    checks_total.......: 8934   49.200689/s
    checks_succeeded...: 67.98% 6074 out of 8934
    checks_failed......: 32.01% 2860 out of 8934
```
* **checks_total (8934)**: Tổng số lần kiểm tra (assertions/checks) được thực hiện trong suốt quá trình chạy. Trung bình thực hiện ~49.2 lần check mỗi giây.
* **checks_succeeded (67.98%)**: Tỷ lệ các bài kiểm tra được đánh giá là Đạt (6074 lần).
* **checks_failed (32.01%)**: Tỷ lệ các bài kiểm tra bị đánh giá là Trượt (2860 lần).

**Chi tiết các checks:**
```text
    ✓ status is 200
    ✗ response time dưới 500 ms
      ↳  35% — ✓ 1607 / ✗ 2860
```
* **✓ status is 200**: Tất cả các request đều trả về mã trạng thái HTTP 200 (Thành công hoàn toàn).
* **✗ response time dưới 500 ms**: Kiểm tra thời gian phản hồi có dưới 500ms không. Kiểm tra này đã trượt trên nhiều request. Cụ thể, chỉ có khoảng 35% số request vượt qua (1607 lần thành công) và có 2860 lần bị quá 500ms.

## 5. Kết quả HTTP (HTTP Metrics)

```text
    HTTP
    http_req_duration..............: avg=1.02s min=131.57ms med=703.11ms max=6.65s p(90)=2.22s p(95)=2.91s
      { expected_response:true }...: avg=1.02s min=131.57ms med=703.11ms max=6.65s p(90)=2.22s p(95)=2.91s
    http_req_failed................: 0.00%  0 out of 4467
    http_reqs......................: 4467   24.600344/s
```
* **http_req_duration**: Thời gian từ lúc gửi yêu cầu đến lúc nhận về toàn bộ phản hồi.
  * **avg=1.02s**: Thời gian phản hồi trung bình là 1.02 giây cho mỗi request.
  * **min=131.57ms**: Request nhanh nhất tốn 131.57ms.
  * **med=703.11ms**: Trung vị (50% request nhanh hơn mức này, 50% request chậm hơn) là 703ms.
  * **max=6.65s**: Request chậm nhất tốn tới 6.65 giây.
  * **p(90)=2.22s**: 90% lượng request hoàn thành trong thời gian dưới 2.22 giây.
  * **p(95)=2.91s**: 95% lượng request hoàn thành trong thời gian dưới 2.91 giây (Đây là chỉ số làm bạn không đạt Thresholds).
* **http_req_failed (0.00%)**: Không có request nào bị thất bại (toàn bộ 4467 request đều chạy tốt).
* **http_reqs (4467)**: Tổng số request đã được bắn đi. Trung bình hệ thống bạn xử lý được **24.6 request / giây**.

## 6. Kết quả Thực thi (Execution Metrics)

```text
    EXECUTION
    iteration_duration.............: avg=2.02s min=1.13s    med=1.7s     max=7.65s p(90)=3.22s p(95)=3.91s
    iterations.....................: 4467   24.600344/s
    vus............................: 19     min=19        max=50
    vus_max........................: 50     min=50        max=50
```
* **iteration_duration**: Thời gian hoàn thành 1 vòng lặp (1 lần gọi hàm `default` trong file script). Trung bình là 2.02 giây. (Khác với `http_req_duration` vì iteration còn bao gồm cả thời gian thiết lập code, `sleep()`, parse response v.v...)
* **iterations (4467)**: Tổng số vòng lặp đã chạy.
* **vus**: Số người dùng ảo tại thời điểm kết thúc test đang là 19.
* **vus_max (50)**: Số lượng người dùng ảo tối đa đã được cấp trong quá trình chạy là 50.

## 7. Mạng lưới (Network)

```text
    NETWORK
    data_received..................: 743 MB 4.1 MB/s
    data_sent......................: 598 kB 3.3 kB/s
```
* **data_received**: Lượng dữ liệu hệ thống k6 tải về từ máy chủ là 743 MB (Tốc độ tải trung bình khoảng 4.1 MB/s). Mức dữ liệu này khá cao, có thể là API trả về kết quả truy vấn lớn, hình ảnh, hoặc file.
* **data_sent**: Lượng dữ liệu hệ thống k6 gửi lên máy chủ (Headers, Body) là 598 kB.

## 8. Trạng thái kết thúc

```text
running (3m01.6s), 00/50 VUs, 4467 complete and 0 interrupted iterations
test_50_concurrent_users ✓ [===========================] 50 VUs  3m0s
```
* **running (3m01.6s)**: Script đã chạy tổng thời gian thực tế là 3 phút 1.6 giây.
* **4467 complete and 0 interrupted iterations**: Hoàn thành trọn vẹn 4467 kịch bản chạy và không có vòng chạy nào bị ngắt hoặc dừng ép buộc (interrupted) do hết giờ.

---
### Tóm tắt Đánh giá Chung
1. **Độ ổn định tốt**: Với 50 kết nối đồng thời trong 3 phút, hệ thống không làm rớt bất kỳ request nào (`status 200`, lỗi = `0%`).
2. **Hiệu suất chưa đạt yêu cầu**: Tốc độ phản hồi hiện tại khá chậm. Rất nhiều request bị vi phạm điều kiện dưới 500ms (lên tới 65% request). Thời gian phản hồi có sự chênh lệch lớn từ 131ms lên đến mức tối đa 6.65 giây.
3. **Đề xuất**: Bạn cần tối ưu hóa hiệu năng (bottleneck có thể nằm ở Database truy vấn chậm do lượng data nhận về lớn `743 MB`, cần cache, index cơ sở dữ liệu, tối ưu lại query, hoặc tăng cường tài nguyên CPU/RAM cho backend).
