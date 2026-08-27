import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [dashboardData, setDashboardData] = useState({ stock: 3, totalUsers: 0 });
  const [orderStatus, setOrderStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('user@example.com');

  // Fetch dashboard data
  const fetchDashboard = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
    }
  };

  // Poll for dashboard updates every 2 seconds
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateOrder = async () => {
    setLoading(true);
    setOrderStatus('Đang gửi yêu cầu...');

    try {
      const response = await fetch('http://localhost:3001/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: emailInput, quantity: 1 })
      });

      const data = await response.json();

      if (response.ok) {
        setOrderStatus(`[Thành công] ${data.message} (Order ID: ${data.orderId})`);
      } else {
        setOrderStatus(`[Lỗi] ${data.error}`);
      }
    } catch (error) {
      setOrderStatus(`[Lỗi mạng] Không thể kết nối đến Order Service.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Event-Driven Architecture Demo</h1>
        <p>Hệ thống xử lý đơn hàng bất đồng bộ sử dụng Kafka & Saga Pattern</p>
      </header>

      <main className="dashboard-grid">
        <div className="card dashboard-card">
          <h2>📊 Thống Kê (Inventory Service)</h2>
          <div className="stats">
            <div className="stat-box">
              <h3>Tồn kho hiện tại</h3>
              <p className={`number ${dashboardData.stock === 0 ? 'out-of-stock' : ''}`}>
                {dashboardData.stock}
              </p>
            </div>
            <div className="stat-box">
              <h3>Số người đặt hàng</h3>
              <p className="number highlight">{dashboardData.totalUsers}</p>
            </div>
          </div>
          <p className="note">* Tự động cập nhật (Polling mỗi 2s)</p>
        </div>

        <div className="card order-card">
          <h2>🛒 Tạo Đơn Hàng (Order Service)</h2>
          <div className="form-group">
            <label>Email người đặt:</label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>
          <button
            className="btn-create"
            onClick={handleCreateOrder}
            disabled={loading}
          >
            {loading ? 'Đang xử lý...' : 'Tạo Đơn Hàng Mới'}
          </button>

          {orderStatus && (
            <div className={`status-message ${orderStatus.includes('Lỗi') ? 'error' : 'success'}`}>
              {orderStatus}
              <br /><small>(Phản hồi ngay lập tức, không đợi trừ kho)</small>
            </div>
          )}
        </div>
      </main>

      <section className="instructions">
        <h3>Các kịch bản test:</h3>
        <ul>
          <li><strong>Happy Path:</strong> Bấm tạo đơn, Tồn kho giảm 1, Số người tăng 1. Node.js console sẽ in ra log gửi Email.</li>
          <li><strong>Out of stock:</strong> Bấm tạo đơn liên tục đến khi kho về 0. Bấm tiếp sẽ thấy báo hết hàng ở phía console backend.</li>
          <li><strong>Fault Tolerance (Sập Service):</strong> Tắt <code>inventory-service</code>, bấm tạo đơn. Order Service vẫn nhận đơn. Bật lại Inventory Service, Tồn kho sẽ giảm một lượt bằng số đơn đã bấm.</li>
        </ul>
      </section>
    </div>
  );
}

export default App;
