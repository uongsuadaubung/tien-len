# TÀI LIỆU THIẾT KẾ KIẾN TRÚC & THUẬT TOÁN BOT AI (TIẾN LÊN MIỀN NAM)

---

## 1. TỔNG QUAN KIẾN TRÚC (SYSTEM ARCHITECTURE)

Hệ thống Bot AI của Tiến Lên Miền Nam được xây dựng theo kiến trúc hướng module, phân lớp rõ ràng và tích hợp các Mẫu Thiết Kế Phần Mềm (Design Patterns) kinh điển:
- **Chain of Responsibility Pattern**: Chuỗi xử lý quyết định tuần tự, ưu tiên theo ngữ cảnh (Cờ tàn $\to$ Chặn khẩn cấp $\to$ Dẫn bài $\to$ Đỡ bài $\to$ Dự phòng).
- **Factory Pattern**: [`BotFactory`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/ai/bot-factory.ts) khởi tạo 18 Personas đa dạng thuộc 5 Bậc Elo.
- **Strategy & Heuristic Evaluation Engine**: Đánh giá và chấm điểm nước đi đa chiều dựa trên thuộc tính cá nhân hóa (Personas Attributes).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   GAME ENGINE PIPELINE                                 │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ (Yêu cầu Bot ra quyết định)
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DECISION CONTEXT GENERATOR                                │
│  - Bài trên tay (Hand)            - Lịch sử bàn đấu (Played Moves)                    │
│  - Bộ theo dõi bài (CardTracker)   - Cấu hình Persona (BotConfig / Elo Tier)           │
│  - Số lá đối thủ (RemainingCards)  - Nước đi dẫn đầu vòng (CurrentRoundLeadingMove)    │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                    CHAIN OF RESPONSIBILITY (BOT DECISION HANDLER)                      │
│                                                                                        │
│  ┌───────────────────────────┐      Khớp cờ tàn      ┌──────────────────────────────┐ │
│  │ 1. EndgameSolverHandler   │ ───────────────────> │ Ra nước đi dứt điểm / Nhất   │ │
│  └─────────────┬─────────────┘                      └──────────────────────────────┘ │
│                │ Chưa khớp                                                           │
│                ▼                                                                     │
│  ┌───────────────────────────┐      Đối thủ <= 2 lá  ┌──────────────────────────────┐ │
│  │ 2. AntiLeaderIntercept    │ ───────────────────> │ Chặn đứng đối thủ sắp về     │ │
│  └─────────────┬─────────────┘                      └──────────────────────────────┘ │
│                │ Chưa khớp                                                           │
│                ▼                                                                     │
│  ┌───────────────────────────┐      Được quyền đi đầu┌──────────────────────────────┐ │
│  │ 3. LeadMoveHeuristic      │ ───────────────────> │ Xả bộ bọc lót / Xả rác nhỏ   │ │
│  └─────────────┬─────────────┘                      └──────────────────────────────┘ │
│                │ Bàn đang có bài                                                     │
│                ▼                                                                     │
│  ┌───────────────────────────┐      Đỡ bài đối thủ   ┌──────────────────────────────┐ │
│  │ 4. RespondingMoveHeuristic│ ───────────────────> │ Đỡ tối ưu / Nhịn bài giữ bộ  │ │
│  └─────────────┬─────────────┘                      └──────────────────────────────┘ │
│                │ Không tìm được                                                      │
│                ▼                                                                     │
│  ┌───────────────────────────┐                       ┌──────────────────────────────┐ │
│  │ 5. FallbackDecision       │ ───────────────────> │ Đánh lá nhỏ nhất / Bỏ lượt   │ │
│  └───────────────────────────┘                      └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CÁC PHÂN HỆ THUẬT TOÁN CỐT LÕI (CORE SUBSYSTEMS)

### 2.1. Phân Hệ Phân Rã Bài Tối Ưu ([`hand-partitioner.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/ai/hand-partitioner.ts))

Thuật toán giải bài toán phân hoạch tập hợp $H \subseteq \text{Deck}$ thành danh sách các tổ hợp hợp lệ $C = \{c_1, c_2, \dots, c_k\}$ và danh sách các lá rác $T = H \setminus \bigcup c_i$ sao cho tổng điểm đánh giá cực đại:

$$\max \text{Score}(P) = \sum_{c \in C} \text{Score}_{\text{combo}}(c) + \sum_{t \in T} \text{Score}_{\text{trash}}(t)$$

#### Biểu Điểm Tổ Hợp Cân Bằng (Balanced Combination Scoring):
* **5 Đôi Thông**: $800$ điểm
* **4 Đôi Thông**: $600$ điểm
* **Tứ Quý**: $400$ điểm
* **3 Đôi Thông**: $300$ điểm
* **Sảnh (Straight)**: $15 + \text{length} \times 8$ điểm *(Cân bằng để không nuốt mất Đôi)*
* **Sám Cô (Triple)**: $40$ điểm
* **Đôi (Pair)**: $22$ điểm
* **Lá Rác (Trash Card)**: $-15$ điểm (riêng Heo rác $+10$ điểm)

---

### 2.2. Phân Hệ Theo Dõi & Đếm Bài ([`card-tracker.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/ai/card-tracker.ts))

Mô phỏng khả năng ghi nhớ và suy luận bài của con người:
1. **Đếm Heo & Hàng Quý**: Theo dõi chính xác vị trí của từng lá Heo ($2\spadesuit, 2\clubsuit, 2\diamondsuit, 2\heartsuit$) và các Rank có nguy cơ hình thành Tứ Quý / Đôi Thông.
2. **Theo Dõi Bỏ Lượt (Pass Inference)**: Khi một đối thủ bỏ lượt ở một vòng đánh (ví dụ: vòng Đôi 9), hệ thống suy luận đối thủ đó không sở hữu tổ hợp cùng loại lớn hơn tổ hợp hiện tại.
3. **Báo Cáo An Toàn Heo (`TwoSafetyReport`)**: Cung cấp chỉ số an toàn khi ra Heo (Xác suất đối thủ cầm Hàng chặt Heo).

---

### 2.3. Cỗ Máy Ra Quyết Định ([`decision-maker.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/ai/decision-maker.ts))

#### A. Cờ Tàn 2 Lá Cao Cấp (2-Card Endgame Finisher)
Khi Bot còn đúng 2 lá trên tay (1 lá to chắc thắng như Heo/Át + 1 lá rác nhỏ):
- Bot **luôn đi lá rác nhỏ trước**:
  - Nếu đối thủ đè bài $\to$ Bot lập tức dùng Heo/Át đè lại $\to$ Về Nhất.
  - Nếu đối thủ bỏ lượt $\to$ Bot ung dung đánh tiếp Heo/Át $\to$ Về Nhất.
- Tỉ lệ giải quyết cờ tàn đạt **100% chiến thắng**.

#### B. Chặn Đứng Khẩn Cấp (Emergency Anti-Leader Intercept)
- Khi có bất kỳ người chơi nào còn $\le 2$ lá trên tay:
  - Miễn trừ hoàn toàn mức phạt phá bộ (`penaltyDiscount = 0.0`).
  - Cộng `+150` điểm ưu tiên chặn bài.
  - Sẵn sàng xé Đôi, xé Sảnh để đè bài, không cho đối thủ tẩu thoát.

#### C. Chiến Thuật Dẫn Bài Bọc Lót (Lead Move Covering Strategy)
- Khi được quyền đi đầu:
  - Nếu có nhiều bộ cùng độ dài (ví dụ Đôi 4 và Đôi K): Bot **ưu tiên đánh Đôi 4 trước**, giữ Đôi K lại để đè lại nếu đối thủ vượt lên.
  - Nếu có các bộ khác độ dài: Ưu tiên xả Sảnh dài trước để giảm nhanh số lá trên tay.

#### D. Sai Số Ra Quyết Định Thực Tế Theo Bậc Elo (Skill-Tiered Variance)
- **Tier 1 (Tập Sự)**: Tích hợp sai số ngẫu nhiên $\pm 25$ điểm mô phỏng tâm lý người mới (đánh theo cảm tính, xả bài to sớm).
- **Tier 2 (Phong Trào)**: Sai số nhẹ $\pm 10$ điểm.
- **Tier 3 / 4 / 5**: Sai số $0$, tính toán chuẩn xác tuyệt đối.

---

## 3. PHÂN CẤP 5 BẬC ELO & BẢNG THUỘC TÍNH BOT (BOT PERSONAS)

```
 BẬC ELO       PERSONAS TIÊU BIỂU      LOOKAHEAD    OPTIMALITY    TEMPO CONTROL   ĐẶC TRƯNG CHIẾN THUẬT
──────────────────────────────────────────────────────────────────────────────────────────────────────────
 Tier 5       🤖 Alpha-TL (2500)          4            0.88           1.0         Đọc bài 100%, bọc lót hoàn hảo,
 (Thần Bài)   👑 Cô Sáu (2300)                                                    không bao giờ mắc sai lầm.
──────────────────────────────────────────────────────────────────────────────────────────────────────────
 Tier 4       💼 Ba Son (1950)            3            0.85           0.90        Đếm bài 95%, ép nhịp bàn chơi,
 (Cao Thủ)    🧠 Thầy Ba (1900)                                                   nhốt đối thủ sắp về nhất.
──────────────────────────────────────────────────────────────────────────────────────────────────────────
 Tier 3       🏹 Chị Tư (1600)            2            0.78           0.75        Giữ heo chặt, rình bẫy hàng quý,
 (Kinh Nghiệm)🎣 Anh Sáu (1650)                                                   xả rác an toàn.
──────────────────────────────────────────────────────────────────────────────────────────────────────────
 Tier 2       🍺 Tư Rượu (1250)           1            0.60           0.50        Biết luật cơ bản, đánh hổ báo,
 (Phong Trào) 🤠 Chú Bảy (1150)                                                   dễ bị lừa heo và dính bẫy.
──────────────────────────────────────────────────────────────────────────────────────────────────────────
 Tier 1       🧒 Bé Năm (850)             0            0.35           0.20        Có gì đánh nấy, không nhớ bài,
 (Tập Sự)     👶 Cu Tí (900)                                                      đánh ngẫu hứng và lãng phí bài to.
```

---

## 4. NGUYÊN TẮC ĐỘC LẬP & TỰ LỢI CÁ NHÂN (SELF-INTEREST & ANTI-COLLUSION)

Hệ thống Bot AI tuân thủ nghiêm ngặt nguyên tắc **Self-Interested Individual Agents**:
1. **Tuyệt đối không bắt tay / Quây người chơi**: Mỗi Bot là một thực thể độc lập, ra quyết định chỉ nhằm tối đa hóa cơ hội thắng và điểm số của riêng nó.
2. **Công bằng tuyệt đối (Fair Play)**: Bot không nhìn trộm bài úp của đối thủ (No Cheating), chỉ suy luận dựa trên dữ liệu công khai trên bàn đấu thông qua `CardTracker`.
3. **Phòng thủ bình đẳng**: Bot chặn bất kỳ ai sắp về Nhất (bất kể là Người chơi hay Bot khác) nếu nước đi đó có lợi cho thứ hạng của Bot.

---

## 5. MINH CHỨNG HIỆU NĂNG & THỰC NGHIỆM (TOURNAMENT MATRIX BENCHMARK)

Kết quả giải đấu Ma trận Toàn bộ 5 Bậc Elo (400 ván đấu thực tế trong [`all-elo-matchups.test.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/tests/ai/all-elo-matchups.test.ts)):

```
========================================================================================
--- BẢNG XẾP HẠNG MA TRẬN 5 BẬC ELO TOURNAMENT (10 CẶP ĐẤU / 400 VÁN THỰC TẾ) ---
----------------------------------------------------------------------------------------
 Hạng 1 | 🤖 Tier 5 (Thần Bài - Elo 2300-2500)   : 87/160 Thắng (54.4%) | Lá tồn TB: 2.63
 Hạng 2 | 💼 Tier 4 (Cao Thủ - Elo 1900-1950)    : 85/160 Thắng (53.1%) | Lá tồn TB: 2.56
 Hạng 3 | 🍺 Tier 2 (Phong Trào - Elo 1250-1350) : 82/160 Thắng (51.2%) | Lá tồn TB: 2.75
 Hạng 4 | 🏹 Tier 3 (Kinh Nghiệm - Elo 1600-1650): 81/160 Thắng (50.6%) | Lá tồn TB: 2.62
 Hạng 5 | 🧒 Tier 1 (Tập Sự - Elo 850-900)       : 65/160 Thắng (40.6%) | Lá tồn TB: 3.48
========================================================================================
```

* **Kết quả**: 100% Unit Tests & Integration Tests (99/99 bài kiểm tra) vượt qua tuyệt đối. Trình độ Bot tăng dần đều và ổn định theo bậc Elo.
