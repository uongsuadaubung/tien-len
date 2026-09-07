# Bộ Script Cân Bằng & Đánh Giá AI Bot (AI Balance Tooling Suite)

Thư mục này lưu trữ các công cụ, script benchmark và chẩn đoán được sử dụng trong quá trình kiểm định và cân bằng trình độ các bậc AI Bot (Tier 1 đến Tier 5) trong game Tiến Lên Miền Nam.

## Danh Sách Các Script

### 1. Benchmark Toàn Diện & Tương Quan Elo
- **`benchmark-1v1-matrix.ts`**:
  - *Mô tả*: Ma trận đối đầu chéo toàn bộ các cặp bot từ T1 đến T5 theo thể thức Solo 1v1 (500 ván). Sử dụng cơ chế Duplicate Hand Swap (đổi bài và đổi vị trí đánh trước trên cùng một seed chia bài) để loại bỏ 100% yếu tố may mắn ngẫu nhiên của bài khởi đầu.
  - *Chỉ số đánh giá*: Tỷ lệ thắng (Winrate), hệ số tương quan Pearson ($r$) và tương quan thứ hạng Spearman ($\rho$) giữa Elo thiết kế và thực tế.
  - *Chạy*: `bun run scripts/balance/benchmark-1v1-matrix.ts`

- **`benchmark-3p-stage.ts`**:
  - *Mô tả*: Benchmark bàn 3 người (300 ván) xoay vòng 3 ghế trên tất cả các bộ ba kết hợp giữa 5 bậc bot.
  - *Chỉ số đánh giá*: Winrate, Thứ hạng trung bình (Avg Rank), Số lá bài tồn trung bình (Cards Left), Tần suất thối heo 2, Tỷ lệ về chót.
  - *Chạy*: `bun run scripts/balance/benchmark-3p-stage.ts`

- **`benchmark-4p-stage.ts`**:
  - *Mô tả*: Benchmark bàn 4 người (200 ván) xoay vòng 4 vị trí trên các bộ tứ kết hợp giữa 5 bậc bot.
  - *Chỉ số đánh giá*: Winrate, Hạng trung bình, Lá bài tồn trung bình, Tỷ lệ về chót.
  - *Chạy*: `bun run scripts/balance/benchmark-4p-stage.ts`

### 2. Script Chẩn Đoán & Kiểm Định Chi Tiết
- **`inspect-t1-vs-t2.ts`**:
  - *Mô tả*: Chạy đối đầu trực tiếp 50 ván duplicate giữa Bot Tier 1 (Tí Chuột - 700 Elo) và Bot Tier 2 (Năm Xích Lô - 1150 Elo).
  - *Mục đích*: Đảm bảo không xảy ra nghịch lý thứ bậc (Tier 1 không được phép vượt trội hơn Tier 2).
  - *Chạy*: `bun run scripts/balance/inspect-t1-vs-t2.ts`

- **`diagnose-t3-vs-t5.ts`**:
  - *Mô tả*: Chạy đối đầu trực tiếp 50 ván duplicate giữa Bot Tier 3 (Bác Sáu Vàng - 1600 Elo) và Bot Tier 5 (Alpha Mind Boss - 3200 Elo).
  - *Mục đích*: Kiểm tra tính khắc chế và khả năng bứt phá của AI bậc cao nhất trước các chiến thuật xả sảnh / bộ của bậc trung.
  - *Chạy*: `bun run scripts/balance/diagnose-t3-vs-t5.ts`

- **`test-mcts-impact.ts`**:
  - *Mô tả*: Ablation Test (thí nghiệm triệt tiêu) đánh giá hiệu quả của thuật toán tìm kiếm MCTS (Monte Carlo Tree Search) trên Bot Tier 5.
  - *Mục đích*: So sánh kết quả khi bật MCTS vs tắt MCTS (thuần Heuristic), đảm bảo MCTS mang lại tỷ lệ thắng dương rõ rệt.
  - *Chạy*: `bun run scripts/balance/test-mcts-impact.ts`

---

## Hướng Dẫn Sử Dụng
Tất cả các script đều có thể được chạy trực tiếp bằng runtime `bun`:
```bash
bun run scripts/balance/<ten-script>.ts
```
