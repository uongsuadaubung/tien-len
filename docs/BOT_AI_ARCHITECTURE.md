# Kiến Trúc Thuật Toán Bot AI Tiến Lên Miền Nam

## 1. Tổng Quan Kiến Trúc AI Engine

Hệ thống Bot AI được thiết kế theo mô hình **Module hóa & Cấu hình động (Configurable Strategy)**, cho phép tạo ra vô số tính cách bot với các mức độ thông minh từ cơ bản đến cao thủ.

```
┌─────────────────────────────────────────────────────────────┐
│                    BOT DECISION ENGINE                      │
├─────────────────┬─────────────────────────┬─────────────────┤
│  Card Tracker   │   Hand Partitioner      │ Heuristic /     │
│ (Memory & Card  │ (Optimal Combinatorial  │ Lookahead Tree  │
│    Counting)    │      Decomposer)        │  (Simulator)    │
└────────┬────────┴────────────┬────────────┴────────┬────────┘
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   BOT CONFIGURATION (PERSONA)               │
│  - memoryDepth (0.0 -> 1.0)       - riskAppetite (0 -> 1)   │
│  - trapTendency (0 -> 1)          - lookaheadMoves (1 -> 5) │
│  - playStyle: Aggressive | Balanced | Conservative         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Các Thành Phần Cốt Lõi (Core Components)

### 2.1. Thuật Toán Phân Rã Bài Tối Ưu (Hand Partitioning Solver)
- **Mục tiêu**: Nhận vào 1 danh sách lá bài trên tay bot (tối đa 13 lá) và tìm cách gom nhóm bài thành các bộ (sảnh, đôi thông, tứ quý, sám, đôi) sao cho:
  1. **Tối thiểu hóa số lượng lá rác lẻ** (lá rác không thuộc bất kỳ bộ nào).
  2. **Bảo tồn các tổ hợp Hàng quý giá** (3 đôi thông, 4 đôi thông, tứ quý).
  3. **Tối đa hóa tính chủ động** (các bộ sảnh dài, đôi to, heo).
- **Thuật toán**: 
  - Đệ quy quay lui (Backtracking) kết hợp cắt tỉa (Pruning) để tìm ra tập phân hoạch tối ưu $P^* = \arg\min_P (\text{Penalty}(P))$.
  - $\text{Penalty}(P) = w_{\text{waste}} \times N_{\text{trash}} - w_{\text{control}} \times V_{\text{control}} - w_{\text{special}} \times N_{\text{special\_hands}}$.

### 2.2. Bộ Nhớ Đếm Bài & Suy Luận Xác Suất (Card Counting & Inference Tracker)
- **Theo dõi lịch sử ván bài**:
  - Ghi nhận mọi lá bài đã được đánh ra bàn.
  - Quản lý tập hợp các lá bài "vô danh" (Unknown Cards = $52 - \text{Hand}_{\text{bot}} - \text{PlayedCards}$).
- **Suy luận thông minh**:
  1. **Đếm Heo**: Biết chính xác đã ra bao nhiêu lá $2$, còn lại bao nhiêu lá $2$ và chất nào chưa ra (ví dụ: $2\heartsuit$ đã ra chưa).
  2. **Dự báo Nguy cơ Hàng (Tứ Quý / Đôi Thông)**: Nếu một rank (ví dụ 10) chưa từng xuất hiện lá nào và còn đủ 4 lá trên bàn thì đối thủ có xác suất cầm Tứ Quý 10. Nếu đã xuất hiện 1 lá 10 thì loại trừ khả năng đối thủ cầm Tứ Quý 10.
  3. **Inference theo lượt Bỏ bài (Pass Tracker)**: Nếu người chơi bỏ lượt khi bàn đang đánh "Đôi 9", suy ra người đó không có đôi lớn hơn 9 (hoặc đang cố tình nhịn).

### 2.3. Cỗ Máy Ra Quyết Định (Decision Maker)
Khi đến lượt bot, bot sẽ:
1. Lấy danh sách tất cả các nước đi hợp lệ (`getValidMoves(hand, currentRoundLeadingMove)`).
2. Lọc ra các nhóm nước đi:
   - Nước đi bình thường (đánh rác nhỏ, đánh đôi nhỏ trong phân hoạch).
   - Nước đi giành quyền (đánh sảnh to, đôi to, heo).
   - Nước đi chặt hàng (dùng 3 đôi thông, tứ quý, 4 đôi thông).
   - Quyết định Bỏ Lượt (Pass).
3. Chấm điểm từng nước đi dựa trên cấu hình Persona (`BotConfig`):
   $$\text{Score}(M) = \Delta \text{HandValue}(M) + \text{UrgencyReward}(M) + \text{RiskPenalty}(M)$$
4. Chọn nước đi có điểm số cao nhất.

---

## 3. Danh Sách Persona Cài Đặt Sẵn

| Tên Bot | Cấp độ | Bộ nhớ bài | Phong cách | Chiến thuật đặc trưng |
| :--- | :--- | :--- | :--- | :--- |
| **Bé Năm (Tập sự)** | Dễ (Beginner) | 10% (Gần như không nhớ) | Ngây thơ | Đánh quân nhỏ nhất hợp lệ, có gì đánh nấy, dễ bị dụ heo. |
| **Chú Bảy (Liều lĩnh)** | Trung bình (Normal) | 60% (Nhớ heo đã ra) | Hổ báo | Thích xả heo sớm để tranh cái, đánh sảnh dài xốc xáo, ít khi nhẫn nhịn. |
| **Bác Tư (Cẩn trọng)** | Khó (Hard) | 85% (Nhớ heo + Hàng) | Thận trọng | Giữ chặt heo và hàng, ưu tiên tẩu tán hết rác lẻ an toàn, rình rập chặt heo lớn. |
| **Cô Ba (Thần Bài)** | Cao thủ (Master) | 100% (Đếm bài chuẩn) | Toàn diện | Tính toán xác suất đối thủ còn bài gì, bẫy 4 đôi thông/tứ quý, tối ưu hóa đường về Nhất. |

---

## 4. Công Thức Đánh Giá Nước Đi (Heuristic Scoring)

- **Giải phóng rác lẻ**: $+15$ điểm cho việc tẩu thoát rác nhỏ nhất ($3\spadesuit \to 6$).
- **Phá bộ sảnh/đôi quý**: $-30$ điểm nếu việc đánh lẻ phá vỡ một sảnh đẹp hoặc đôi thông.
- **Đánh Heo**:
  - Nếu đối thủ còn $\le 3$ lá: $+40$ điểm (phòng thủ khẩn cấp chống về nhất / chống bị đút 3 bích).
  - Nếu đầu ván và chưa đếm được hàng: $-20$ điểm phạt nguy cơ bị chặt.
- **Chặt Heo**:
  - Chặt được $2\heartsuit$: $+60$ điểm.
  - Chặt chồng: $+80$ điểm.
