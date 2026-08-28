import { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [data, setData] = useState({
    total_views: 0,
    batch_views: 0,
    realtime_views: 0,
  });
  const [status, setStatus] = useState("");

  const videoId = "V_LAMBDA_101";

  useEffect(() => {
    const eventSource = new EventSource(`http://localhost:8000/stream/${videoId}`);

    eventSource.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      setData(parsedData);
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [videoId]);

  const formatNumber = (num) => new Intl.NumberFormat('vi-VN').format(num);

  const runSimulation = async () => {
    setStatus("Đang chạy mô phỏng lưu lượng...");
    try {
      await fetch("http://localhost:8000/api/simulate", { method: "POST" });
      setTimeout(() => setStatus("Mô phỏng hoàn tất! (Đã gửi 1000 views)"), 3000);
    } catch (e) {
      setStatus("Lỗi kết nối Backend!");
    }
  };

  const runBatch = async () => {
    setStatus("Đang chạy dọn dẹp Batch...");
    try {
      await fetch("http://localhost:8000/api/batch", { method: "POST" });
      setTimeout(() => setStatus("Batch hoàn tất! (Dữ liệu đã chuẩn hóa)"), 3000);
    } catch (e) {
      setStatus("Lỗi kết nối Backend!");
    }
  };

  return (
    <div className="app-container">
      <div className="video-player-mockup">
        <div className="player-screen">
          <div className="play-button">▶</div>
        </div>

        <div className="video-info">
          <h1 className="video-title">MV Kiến Trúc Lambda - Dữ liệu thực chiến</h1>

          <div className="view-counter-container">
            <span className="view-count">{formatNumber(data.total_views)} lượt xem</span>
            <span className="view-date">• Vừa mới ra mắt</span>
          </div>
        </div>

        <div className="stats-dashboard">
          <h2>Bảng điều khiển Hệ thống Lambda</h2>
          <div className="stats-grid">
            <div className="stat-card batch">
              <span className="stat-label">Batch Layer (Đã làm sạch)</span>
              <span className="stat-value">{formatNumber(data.batch_views)}</span>
            </div>
            <div className="stat-card speed">
              <span className="stat-label">Speed Layer (+ Tạm tính)</span>
              <span className="stat-value">+{formatNumber(data.realtime_views)}</span>
            </div>
            <div className="stat-card serving">
              <span className="stat-label">Serving Layer (View Hiện Tại)</span>
              <span className="stat-value">{formatNumber(data.total_views)}</span>
            </div>
          </div>
        </div>

        <div className="control-panel">
          <h3>Kịch Bản Demo</h3>
          <p className="status-text">{status || "Chưa có tiến trình nào chạy"}</p>
          <div className="button-group">
            <button className="btn simulate-btn" onClick={runSimulation}>
              🚀 Bắn View Ảo (Stream)
            </button>
            <button className="btn batch-btn" onClick={runBatch}>
              🧹 Dọn Dẹp (Batch)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
