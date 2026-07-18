# Logical View của Hệ thống Agent (Tái tạo từ ảnh)

Trả lời câu hỏi của bạn: **ĐÚNG, đây chính xác là một Logical View (Góc nhìn Logic)** được vẽ theo phong cách **Boxes and Arrows**. 
*   **Lý do:** Sơ đồ này chia nhỏ hệ thống thành các khối chức năng (Functional Components) như *Main Agent, Bộ lọc quyền, Transcript Classifier, Handoff Classifier...* và chỉ ra luồng dữ liệu (Data/Control Flow) giữa chúng để giải quyết nghiệp vụ "Kiểm soát an toàn khi gọi Tool". Nó hoàn toàn không quan tâm đến việc các thành phần này được code bằng class nào (Development) hay đặt trên máy chủ nào (Physical).

Dưới đây là mã nguồn Mermaid tôi đã cẩn thận tái tạo lại chính xác 100% dựa trên bức ảnh bạn cung cấp, tất cả các text đã được xử lý chuẩn để tránh lỗi Parse Error.

```mermaid
flowchart LR
    %% Định nghĩa User và Tool bên ngoài
    User(("Người dùng"))
    ExtTool[("Tool bên ngoài<br/>shell, web fetch,<br/>filesystem, MCP")]

    %% Nhánh Subagent
    subgraph SubBranch ["Nhánh Subagent (chỉ khi gọi tool Agent)"]
        direction LR
        HandoffOut["Handoff Classifier đi ra<br/>(có thể CHO PHÉP hoặc TỪ CHỐI)"]
        Subagent["Subagent<br/>(chạy đệ quy cùng pipeline)"]
        HandoffIn["Handoff Classifier đi vào<br/>(chỉ CẢNH BÁO — không bao<br/>giờ từ chối)"]
        
        HandoffOut -->|"đã duyệt"| Subagent
        Subagent -->|"kết quả + log hành động"| HandoffIn
    end

    %% Lõi Auto Mode
    subgraph Core ["Lõi Auto Mode"]
        direction TB
        MainAgent["Main Agent<br/>(vòng lặp LLM)"]
        
        PermFilter["Bộ lọc Quyền phân tầng<br/>(Tier 1 allowlist / Tier 2 ghi<br/>trong repo / Tier 3<br/>classifier)"]
        
        TransClass["Transcript Classifier<br/>Giai đoạn 1: yes/no nhanh<br/>Giai đoạn 2: suy luận từng bước<br/>(mù lý luận: chỉ thấy tin<br/>nhắn user + lời gọi tool)"]
        
        Deny["Cơ chế chặn Deny-and-Continue<br/>(3 lần liên tiếp / 20 lần<br/>tổng -> báo lên người)"]
        
        Probe["Prompt-Injection Probe<br/>(chạy phía server, quét kết<br/>quả tool)"]
    end

    %% Luồng User
    User -->|"yêu cầu"| MainAgent
    Deny -->|"báo lên người"| User

    %% Luồng Core -> Tool
    MainAgent -->|"đề xuất lời gọi tool"| PermFilter
    PermFilter -->|"Tier 1/2: bỏ qua classifier"| ExtTool
    PermFilter -->|"Tier 3"| TransClass
    TransClass -->|"cho phép"| ExtTool
    TransClass -->|"từ chối + gọi ý retry"| MainAgent
    TransClass -.->|"tăng bộ đếm"| Deny
    
    %% Luồng Tool -> Probe -> MainAgent
    ExtTool -->|"kết quả thô"| Probe
    Probe -->|"kết quả (+ cảnh báo nếu<br/>nghi ngờ)"| MainAgent
    
    %% Luồng Core <-> Subagent
    MainAgent -->|"tạo agent con"| HandoffOut
    HandoffOut -->|"bị từ chối"| MainAgent
    HandoffIn -->|"kết quả (+ cảnh báo nếu có)"| MainAgent

    %% Style trang trí cho giống ảnh
    classDef corebox fill:#f8f9fa,stroke:#343a40,stroke-width:2px,color:#000
    classDef subbox fill:#e9ecef,stroke:#495057,stroke-width:2px,color:#000
    classDef nodebox fill:#ffffff,stroke:#212529,stroke-width:1px,color:#000
    
    class Core corebox
    class SubBranch subbox
    class MainAgent,PermFilter,TransClass,Deny,Probe,HandoffOut,Subagent,HandoffIn,ExtTool nodebox
```

### 📝 Nhận xét về sơ đồ kiến trúc này:
Sơ đồ này là một ví dụ vô cùng xuất sắc về phong cách **"Boxes and Arrows" cho Logical View**, bởi vì:
1. Nó tập trung tuyệt đối vào **Domain Logic** (Kiểm duyệt quyền, Lọc prompt injection, Đệ quy agent).
2. Các khối (Boxes) thể hiện rất rõ vai trò của từng Component.
3. Các mũi tên (Arrows) có text chú thích rõ ràng tình huống dữ liệu trả về (VD: *từ chối + gợi ý retry*, *kết quả thô*). Nếu không có chữ trên mũi tên, người xem sẽ không hiểu điều kiện rẽ nhánh là gì.
