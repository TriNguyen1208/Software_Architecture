// Import module 'http' từ k6 để thực hiện các HTTP requests (GET, POST, v.v.)
import http from 'k6/http';
// Import 'check' để kiểm tra điều kiện (assert) và 'sleep' để tạm dừng thực thi
import { check, sleep } from 'k6';

// Export object options để cấu hình cách thức k6 chạy bài test này
export const options = {
    // Định nghĩa các kịch bản test (scenarios)
    scenarios: {
        // Tên kịch bản (bạn có thể đặt tùy ý)
        test_50_concurrent_users: {
            // Sử dụng executor 'constant-vus': Giữ số lượng virtual users (VUs) cố định trong suốt quá trình test
            executor: 'constant-vus',
            // Số lượng VUs đồng thời là 50 (mô phỏng 50 user truy cập cùng lúc)
            vus: 1000,
            // Thời gian chạy kịch bản này là 3 phút
            duration: '3m',
            // Thời gian chờ tối đa 10 giây để các request đang dở dang hoàn thành trước khi buộc dừng hẳn bài test
            gracefulStop: '10s',
        },
    },

    // Định nghĩa các ngưỡng (thresholds) quyết định bài test đạt (pass) hay trượt (fail)
    thresholds: {
        // Ngưỡng 1: Tỷ lệ request lỗi (failed) phải nhỏ hơn 1% (0.01)
        http_req_failed: ['rate<0.01'],

        // Ngưỡng 2: Thời gian phản hồi (duration) của 95% số request phải nhỏ hơn 500 milliseconds
        http_req_duration: ['p(95)<500'],
    },
};

// Hàm default được tự động chạy lặp đi lặp lại bởi mỗi Virtual User trong suốt quá trình test
export default function () {
    // Lấy URL từ biến môi trường BASE_URL nếu được truyền vào lúc chạy lệnh (VD: k6 run -e BASE_URL=...), nếu không thì dùng URL mặc định
    const url = __ENV.BASE_URL || 'http://localhost/productpage';

    // Thực hiện 1 request HTTP GET tới URL đã định nghĩa
    const response = http.get(url, {
        // Cấu hình headers cho request, báo cho server biết client muốn nhận dữ liệu dạng JSON
        headers: {
            Accept: 'application/json',
        },
        // Đặt timeout 10 giây, nếu request quá 10 giây không có phản hồi sẽ bị coi là lỗi
        timeout: '10s',
    });

    // Kiểm tra kết quả trả về của request có thỏa mãn các điều kiện không
    check(response, {
        // Điều kiện 1: HTTP Status code trả về phải là 200 (Thành công)
        'status is 200': (res) => res.status === 200,
        // Điều kiện 2: Thời gian phản hồi của request này phải nhỏ hơn 500 milliseconds
        'response time dưới 500 ms': (res) => res.timings.duration < 500,
    });

    // Mỗi virtual user tạm nghỉ 1 giây trước khi vòng lặp (hàm default) chạy lại (gửi request tiếp theo)
    sleep(1);
}