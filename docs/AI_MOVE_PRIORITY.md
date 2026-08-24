# TÀI LIỆU ĐẶC TẢ THỨ TỰ ƯU TIÊN RA BÀI CỦA AI BOT
## (AI MOVE SELECTION & PLAY PRIORITY SPECIFICATION)
### Căn cứ phân hệ: [`src/ai/decision-maker.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/ai/decision-maker.ts) & [`src/ai/mode-policies.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/ai/mode-policies.ts)

---

## 1. TỔNG QUAN KIẾN TRÚC KẾT HỢP (HYBRID DESIGN PATTERNS)

Hệ thống kết hợp 2 Mẫu Thiết Kế Phần Mềm kinh điển:
1. **Strategy Pattern (`AIModePolicyStrategy`)**: Định hình trường phái và chính sách chơi bài riêng biệt cho từng Chế độ chơi (`COUNT_CARDS`, `UNDERGROUND`, `TRADITIONAL`, `RANKED`, `WINNER_TAKES_ALL`, `CAMPAIGN`).
2. **Chain of Responsibility Pattern**: Chuỗi 5 tầng xử lý quyết định tuần tự, nhận chỉ thị từ Mode Strategy để đưa ra nước đi tối ưu nhất:

```
                                  GAME ENGINE
                                       │ (Gửi DecisionContext chứa gameMode)
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        MODE STRATEGY RESOLVER (Strategy Pattern)                       │
│    - COUNT_CARDS / UNDERGROUND ──> CountCardsAIModePolicy (Tối đa hóa tốc độ xả bài)   │
│    - TRADITIONAL / RANKED      ──> TraditionalAIModePolicy (Tẩu rác, giữ bài bọc lót) │
│    - WINNER_TAKES_ALL          ──> WinnerTakesAllAIModePolicy (Được ăn cả, ngã về 0)   │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │ Policy Rules & Score Modifiers
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             CHAIN OF RESPONSIBILITY (AI BOT DECISION HANDLER PIPELINE)                 │
│                                                                                        │
│  1. EndgameSolverHandler ──> 2. AntiLeaderDefense ──> 3. LeadMoveHeuristic             │
│     (Cờ tàn & Cấm 2 Cuối)       (Chống đối thủ 1 lá)     (Cầm cái theo Mode Policy)    │
│                                                                  │                     │
│                                                                  ▼                     │
│                             5. FallbackDecision   <── 4. RespondingMoveHeuristic       │
│                                (Dự phòng an toàn)        (Đỡ bài theo Mode Policy)     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MA TRẬN CHIẾN THUẬT THEO TỪNG CHẾ ĐỘ CHƠI (GAME MODE STRATEGY MATRIX)

| Chế Độ Chơi | Bản Chất Kinh Tế & Kết Thúc | Chiến Thuật Khi Cầm Cái (Lead Move) | Chiến Thuật Khi Đỡ Bài (Responding Move) |
| :--- | :--- | :--- | :--- |
| ⚡ **Đếm Lá (`COUNT_CARDS`) & Sòng Bạc Ngầm (`UNDERGROUND`)** | - 1 người về Nhất là **kết thúc ván ngay lập tức**.<br>- Người thua bị phạt theo: $\text{Số lá tồn} \times \text{Bet}$ ($\times 2$ trong Ngầm).<br>- Bị Cóng ($13$ lá) phạt gấp đôi + thối Heo. | **Ưu tiên xả SẢNH DÀI (4-6 lá) & BỘ NHIỀU LÁ (Sám, Đôi) trước**.<br>Mục tiêu: Hạ số lá bài trên tay từ 13 xuống còn 7-8 lá trong chớp mắt để triệt tiêu nguy cơ bị Cóng và giảm tiền phạt nếu có người về trước. | **Tích cực đè bài khi xả được $\ge 3$ lá** (thưởng $+120$ điểm).<br>Khi bài đối thủ còn ít ($\le 5$ lá): Sẵn sàng xả Heo/Hàng sớm để tránh bị thối bất ngờ khi đối thủ dứt điểm. |
| 🏆 **Truyền Thống (`TRADITIONAL`) & Đấu Hạng (`RANKED`)** | - Đánh đường dài đến người áp chót.<br>- Phân 4 bậc Nhất (+Elo lớn), Nhì (giữ Elo), Ba/Bét (trừ Elo). | **TẨU RÁC NHỎ ($3, 4, 5...$) trước** để thăm dò và giảm tải bài yếu.<br>Giữ Sảnh to, Đôi to và Heo làm **vũ khí bọc lót** để kiểm soát nhịp độ (Tempo Control). | **Bảo tồn Heo chặt chẽ** (phạt $-100$ điểm nếu vứt Heo đè rác nhỏ khi bài còn $\ge 6$ lá). Nhịn bài giữ bộ để tranh chấp thứ hạng Nhất/Nhì ở cờ tàn. |
| 👑 **Nhất Ăn Tất (`WINNER_TAKES_ALL`)** | - Chỉ người về Nhất mới có tiền.<br>- Nhì/Ba/Bét đều mất $100\%$ tiền cược như nhau (giữ ít lá khi về Nhì vô nghĩa). | **Đánh bạo lực tranh Nhất (All-or-Nothing)**.<br>Ưu tiên chuỗi combo dứt điểm, sẵn sàng dùng bài to đè nhịp. | **Thưởng điểm cướp cái bằng Heo/Bài to** ($+110$ điểm) để đoạt lượt đi và dứt điểm combo về Nhất. |

---

## 3. CHI TIẾT CÁC QUY TẮC XỬ LÝ THEO TỪNG HANDLER

### 🟢 1. Mở Màn Ván Đầu Tiên (`isFirstMoveOfGame = true`)
- **Bảo vệ tuyệt đối Hàng Chặt**: Nếu $3\spadesuit$ (3 Bích) nằm trong **3 Đôi Thông ($334455$)** hoặc **Tứ Quý 3**, Bot **tách riêng lá $3\spadesuit$ lẻ** ra đánh, tuyệt đối **không xả cả bộ 6 lá** ở lượt đầu.
- **Thứ tự ưu tiên mở màn**:
  1. Lá rác lẻ $3\spadesuit$ (nếu là rác).
  2. Đôi nhỏ chứa $3\spadesuit$ ($[3\spadesuit, 3\heartsuit]$).
  3. Sảnh ngắn chứa $3\spadesuit$ ($[3\spadesuit, 4, 5]$).

---

### 🔵 2. Ra Bài Khi Cầm Cái / Đi Đầu Vòng (`isLeadMove = true`)
1. **Nhánh Đếm Lá / Sòng Bạc Ngầm (`preferLongestComboFirst = true`)**:
   - Nếu có Sảnh $\ge 4$ lá hoặc Sám cô: **Đánh Sảnh dài nhất / Bộ nhiều lá nhất trước** $\to$ Sau đó mới tẩu rác lẻ.
2. **Nhánh Truyền Thống / Đấu Hạng (`dumpSmallTrashFirst = true`)**:
   - Tẩu **lá rác nhỏ nhất ($3, 4, 5...$)** trước $\to$ Sau đó đánh bộ nhỏ nhất $\to$ Giữ bộ to bọc lót.
3. **Quy tắc bảo tồn Heo & Hàng**: Tuyệt đối không đánh Heo lẻ, Đôi Heo hay Hàng ra đầu ván khi còn rác (trừ cờ tàn).

---

### 🔴 3. Phòng Thủ Khi Có Người Báo 1 Lá (`AntiLeaderDefenseHandler`)
- **Nếu người báo 1 lá là Người Kế Tiếp (`nextPlayerId`)**:
  1. Ưu tiên 1: Đánh **Bộ (Đôi, Sảnh, Sám, Tứ Quý)** để người 1 lá chắc chắn không bắt được.
  2. Ưu tiên 2: Nếu chỉ có rác lẻ $\to$ Bắt buộc đánh **lá rác TO NHẤT** (Át Cơ, Heo, hoặc rác to nhất) để chặn đầu chống bị xử Đền Bài.
- **Nếu người báo 1 lá là Người Khác (non-direct)**:
  - Đánh **lá rác nhỏ nhất** để tẩu thoát bài bản thân và chạy điểm.

---

### 🟡 4. Giải Toán Cờ Tàn & Luật Cấm 2 Cuối Cùng (`EndgameSolverHandler`)
- **Khi Bật Luật Cấm 2 Cuối Cùng (`prohibitEndingWithTwo = true`)**:
  - Khi bài thường không chứa Heo chỉ còn đúng **1 lượt dứt điểm** (`totalNonTwoTurns === 1`, ví dụ: 1 Sảnh + 1 Heo, 1 Đôi + Tứ Quý 2, hoặc 1 Rác + Đôi Heo):
  - **Bot BẮT BUỘC xả tổ hợp Heo ra trước** khi Cầm Cái để ép cả bàn bỏ lượt $\to$ Sau đó dứt điểm bằng bộ thường còn lại để về Nhất hợp lệ (triệt tiêu 100% nguy cơ Thối Heo).
- **Khi Chơi Luật Thông Thường (`prohibitEndingWithTwo = false`)**:
  - Khi Bot còn 2 lá ($1\text{ rác nhỏ } 3\spadesuit + 1\text{ Heo } 2\heartsuit$): Bot đánh $3\spadesuit$ trước để nhử bài, dùng $2\heartsuit$ đè lại chốt hạ về Nhất.

---

## 4. BẢNG MINH CHỨNG SO SÁNH THỰC TẾ (BENCHMARK CASE STUDY)

Giả sử Bot đang cầm bộ bài: **[Sảnh 5 lá $3\spadesuit 4\diamondsuit 5\heartsuit 6\spadesuit 7\diamondsuit$ + Rác lẻ $9\clubsuit, 10\spadesuit, K\heartsuit$]**:

| Chế độ thi đấu | Nước đi Bot lựa chọn | Phân tích lý do & Lợi ích chiến thuật |
| :--- | :--- | :--- |
| ⚡ **Đếm Lá (`COUNT_CARDS`)** | **Đánh Sảnh 5 lá ($3\text{-}4\text{-}5\text{-}6\text{-}7$)** | Xả ngay 5 lá bài, hạ số bài từ 8 xuống còn 3 lá. Nếu đối thủ bất ngờ về Nhất, Bot chỉ bị phạt 3 lá thay vì 8 lá (tiết kiệm hơn 60% tiền thua) và tránh Cóng. |
| 🏆 **Truyền Thống (`TRADITIONAL`)** | **Đánh lá Rác lẻ $9\clubsuit$** | Xả lá bài yếu nhất để thăm dò phản ứng của bàn đấu, giữ nguyên Sảnh 5 lá làm vũ khí bọc lót giành lại cái ở các vòng sau để cạnh tranh vị trí Nhất/Nhì. |
| 👑 **Nhất Ăn Tất (`WINNER_TAKES_ALL`)** | **Đánh Sảnh 5 lá hoặc Cướp Cái bằng $K$** | Tấn công dồn dập để độc chiếm lượt đi và dứt điểm nhanh nhất có thể. |
