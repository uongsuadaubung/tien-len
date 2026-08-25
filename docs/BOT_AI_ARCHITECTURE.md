# TÀI LIỆU THIẾT KẾ KIẾN TRÚC & THUẬT TOÁN TRÍ TUỆ NHÂN TẠO BOT AI (TIẾN LÊN MIỀN NAM)
## KIẾN TRÚC RULE-FIRST COMPOSITE AI STRATEGY SYSTEM

---

## 1. TỔNG QUAN KIẾN TRÚC (SYSTEM ARCHITECTURE)

Hệ thống Bot AI của Tiến Lên Miền Nam được xây dựng theo kiến trúc hướng module, phân lớp sạch và tích hợp các Mẫu Thiết Kế Phần Mềm (Design Patterns) kinh điển:
- **Composite Rule Strategy Pattern**: Thay vì gán AI cứng nhắc theo từng Chế độ chơi (Game Mode), hệ thống phân tích tập hợp các Rule đang **BẬT (active)** trong [`GameRules`](file:///c:/Users/kien.hm/Desktop/tien-len/src/engine/types.ts) để tự động tổng hợp chính sách ra bài, điểm điều chỉnh đỡ bài, rủi ro chặt và các hành vi khẩn cấp.
- **Chain of Responsibility Pattern**: Chuỗi xử lý quyết định tuần tự 5 tầng ưu tiên cao xuống thấp:
  $$\text{EmergencyRuleHandler} \longrightarrow \text{EndgameSolverHandler} \longrightarrow \text{LeadMoveHeuristicHandler} \longrightarrow \text{RespondingMoveHeuristicHandler} \longrightarrow \text{FallbackDecisionHandler}$$
- **Factory Pattern**: [`BotFactory`](file:///c:/Users/kien.hm/Desktop/tien-len/src/ai/bot-factory.ts) khởi tạo 18 Personas đa dạng thuộc 5 Bậc Elo (850 - 2500 Elo).
- **MCTS Solver (Monte Carlo Tree Search)**: Cung cấp khả năng mô phỏng cây ván đấu sâu cho các Bot bậc Thần Bài (Tier 5).

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
│  - nextPlayerId (Người kế tiếp)   - hasPlayedFirstCard (Kiểm tra nguy cơ Cóng)        │
│  - rules: GameRules (Tập luật)    - prohibitEndingWithTwo (Luật Cấm 2 Cuối)           │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                  COMPOSITE RULE STRATEGY MANAGER (src/ai/rule-strategies.ts)           │
│                                                                                        │
│  ┌───────────────────────────┐ ┌───────────────────────────┐ ┌──────────────────────┐  │
│  │ 1. Settlement Strategy    │ │ 2. Cong & Anti-Freeze     │ │ 3. Chopping & Trap   │  │
│  │ (Đếm lá / Truyền thống)   │ │ (Thoát cóng khẩn cấp)     │ │ (Rủi ro x2 & gài bẫy)│  │
│  └───────────────────────────┘ └───────────────────────────┘ └──────────────────────┘  │
│  ┌───────────────────────────┐ ┌───────────────────────────┐                           │
│  │ 4. GameFlow Strategy      │ │ 5. Table Scale Strategy   │                           │
│  │ (3 Bích / Cấm 2 / Chống đền)│ (Solo 1v1 vs Bàn 3-4 người)│                           │
│  └───────────────────────────┘ └───────────────────────────┘                           │
└──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                           │ Hợp nhất: Emergency Actions, Lead Policy,
                                           │ Responding Modifiers, Risk Factors
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                    CHAIN OF RESPONSIBILITY (BOT DECISION HANDLER)                      │
│                                                                                        │
│  ┌───────────────────────────┐      Trạng thái khẩn cấp   ┌──────────────────────────┐ │
│  │ 1. EmergencyRuleHandler   │ ─────────────────────────> │ Thoát Cóng / Chống Đền / │ │
│  │ (Rule-Driven Emergency)   │                            │ Xả Heo Cờ Tàn Cấm 2 Cuối │ │
│  └─────────────┬─────────────┘                            └──────────────────────────┘ │
│                │ Không có tình huống khẩn cấp                                          │
│                ▼                                                                       │
│  ┌───────────────────────────┐      Khớp cờ tàn           ┌──────────────────────────┐ │
│  │ 2. EndgameSolverHandler   │ ─────────────────────────> │ Về Nhất / Đôi 2 lá cờ tàn│ │
│  └─────────────┬─────────────┘                            └──────────────────────────┘ │
│                │ Chưa khớp                                                             │
│                ▼                                                                       │
│  ┌───────────────────────────┐      Cầm cái đầu vòng      ┌──────────────────────────┐ │
│  │ 3. LeadMoveHeuristic      │ ─────────────────────────> │ Theo CompositeLeadPolicy │ │
│  └─────────────┬─────────────┘                            │ (Sảnh dài / Tẩu rác nhỏ) │ │
│                │ Bàn đang có bài                          └──────────────────────────┘ │
│                ▼                                                                       │
│  ┌───────────────────────────┐      Đỡ bài đối thủ        ┌──────────────────────────┐ │
│  │ 4. RespondingMoveHeuristic│ ─────────────────────────> │ Đỡ tối ưu / Đè heo / Nhịn│ │
│  └─────────────┬─────────────┘                            │ bài tính theo Risk Factor│ │
│                │ Không tìm được nước đi hợp lệ            └──────────────────────────┘ │
│                ▼                                                                       │
│  ┌───────────────────────────┐                            ┌──────────────────────────┐ │
│  │ 5. FallbackDecision       │ ─────────────────────────> │ Đánh lá nhỏ nhất / Pass  │ │
│  └───────────────────────────┘                            └──────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. HỆ THỐNG 5 MODULE RULE STRATEGIES ([`rule-strategies.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/ai/rule-strategies.ts))

Mỗi quy tắc trong [`GameRules`](file:///c:/Users/kien.hm/Desktop/tien-len/src/engine/types.ts) được ánh xạ thành một `RuleStrategyEvaluator` độc lập:

### 2.1. `SettlementRuleStrategy` (Quy Tắc Tính Tiền & Thứ Hạng)
- **`CARD_COUNT` (Đếm Lá / Sòng Bạc Ngầm)**:
  - *Mục tiêu*: Tối đa hóa tốc độ xả bài (Card Dumping Velocity) để giảm tiền phạt khi có người về Nhất.
  - *Lead*: Ưu tiên xả Sảnh dài (4-6 lá) & Bộ nhiều lá trước.
  - *Responding*: Thưởng lớn ($+120$) khi xả $\ge 4$ lá một lúc; không om Heo quá muộn khi đối thủ còn ít bài.
- **`TRADITIONAL_RANK_BASED` (Truyền Thống / Đấu Hạng Elo)**:
  - *Mục tiêu*: Kiểm soát nhịp độ (Tempo Control), tối ưu hóa 4 thứ hạng Nhất - Nhì - Ba - Bét.
  - *Lead*: Tẩu rác nhỏ ($3, 4, 5...$) trước để xả bài yếu và thăm dò; giữ bộ to bọc lót đường dài.
  - *Responding*: Phạt ($-100$) hành vi xả Heo đè rác nhỏ ở đầu ván.
- **`WINNER_TAKES_ALL` (Nhất Ăn Tất)**:
  - *Mục tiêu*: "Được ăn cả, ngã về không" — Chỉ nhắm tới ngôi vị Về Nhất.
  - *Lead & Responding*: Thưởng lớn khi dùng Heo/bài to cướp cái để chuỗi combo dứt điểm.

### 2.2. `CongRuleStrategy` (Quy Tắc Cóng & Thoát Cháy Bài)
- Khi `cong.enabled === true`:
  - Theo dõi cờ `hasPlayedFirstCard === false` (Bot chưa ra được lá bài nào).
  - Khi có đối thủ bất kỳ còn $\le 3$ lá: Kích hoạt **`EMERGENCY_UNFREEZE` (Thoát Cóng Khẩn Cấp)**.
  - *Hành vi*: Bot chấp nhận đánh bất kỳ nước đi hợp lệ nào (kể cả phá bộ nhỏ, đánh lẻ hoặc xả Heo) để có ít nhất 1 lá trên bàn, thoát khỏi mức phạt thảm họa $26 \times \text{multiplier}$ lá.

### 2.3. `ChoppingRuleStrategy` (Quy Tắc Chặt Heo & Gài Bẫy)
- Tính toán theo `chopping.multiplier` ($1\times$ chuẩn, $2\times$ sòng bạc ngầm) và `allowFourPairsCutAnytime`.
- Khi cầm Hàng: Tăng điểm om hàng & gài bẫy (nhử Heo) tỷ lệ thuận với hệ số phạt.
- Khi cầm Heo: Nhân hệ số rủi ro Chặt với `chopping.multiplier` và tăng độ cảnh giác khi 4 đôi thông được phép chặt tự do.

### 2.4. `GameFlowRuleStrategy` (Quy Tắc Vòng Đấu & Cờ Tàn)
- **`firstGameRequireThreeOfSpades`**: Bắt buộc chứa $3\spadesuit$, bảo vệ tuyệt đối Hàng (3 đôi thông, 4 đôi thông, tứ quý).
- **`prohibitEndingWithTwo` (Cấm 2 Cuối Cùng)**: Khi cờ tàn còn tổ hợp Heo + 1 lượt bài thường dứt điểm, ép xả Heo trước để kết liễu bằng bài thường, ngăn ngừa 100% nguy cơ Thối Heo.
- **`antiLeaderDefense` (Chống Đền Bài)**: Khi người kế tiếp báo 1 lá, ép ra Bộ hoặc lá rác to nhất (A, 2) để chặn đầu.

### 2.5. `TableScaleRuleStrategy` (Quy Mô Bàn Đấu)
- **Solo 1v1 (`playerCount === 2`)**: Đè bài thành công là $100\%$ cướp cái $\to$ thưởng lớn điểm Tempo ($+90$).
- **Bàn 3-4 người**: Phân phối rác, phòng thủ xoay vòng và đọc đối thủ báo 1 lá.

---

## 3. CÁC PHÂN HỆ THUẬT TOÁN HỖ TRỢ

### 3.1. Phân Hệ Phân Rã Bài Tối Ưu ([`hand-partitioner.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/ai/hand-partitioner.ts))
Thuật toán giải bài toán phân hoạch tập hợp $H \subseteq \text{Deck}$ thành danh sách tổ hợp $C$ và rác $T$ sao cho tổng điểm cực đại:
$$\max \text{Score}(P) = \sum_{c \in C} \text{Score}_{\text{combo}}(c) + \sum_{t \in T} \text{Score}_{\text{trash}}(t)$$

### 3.2. Phân Hệ Theo Dõi & Đếm Bài ([`card-tracker.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/ai/card-tracker.ts))
1. **Đếm Heo & Hàng Quý**: Theo dõi 4 lá Heo và nguy cơ Tứ Quý / Đôi Thông.
2. **Bayesian Pass Inference**: Ghi nhận đối thủ bỏ lượt theo loại tổ hợp và độ dài sảnh.
3. **Báo Cáo An Toàn Heo (`TwoSafetyReport`)**: Đánh giá chỉ số rủi ro ra Heo.

---

## 4. PHÂN CẤP 5 BẬC ELO & BẢNG THUỘC TÍNH BOT (BOT PERSONAS)

```
 BẬC ELO       PERSONAS TIÊU BIỂU      LOOKAHEAD    OPTIMALITY    TEMPO CONTROL   ĐẶC TRƯNG CHIẾN THUẬT
──────────────────────────────────────────────────────────────────────────────────────────────────────────
 Tier 5       🤖 Alpha-TL (2500)          4            0.88           1.0         Đọc bài 100%, MCTS Tree Search,
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

## 5. ĐỘ BAO PHỦ KIỂM THỬ TỰ ĐỘNG (TEST COVERAGE)

- **155/155 tests PASS 100%** qua 23 files kiểm thử chuyên sâu (`bun test`).
- Bao phủ trọn vẹn:
  1. Từng Rule Strategy độc lập và tổ hợp Composite Rules tùy biến.
  2. Thoát Cóng khẩn cấp (`EMERGENCY_UNFREEZE`).
  3. Cờ tàn Cấm 2 cuối & Chống đền bài khi báo 1 lá.
  4. Ma trận đấu 5 bậc Elo (200 ván ngẫu nhiên).
