# TÀI LIỆU ĐẶC TẢ THỨ TỰ ƯU TIÊN RA BÀI CỦA AI BOT
## (RULE-DRIVEN MOVE SELECTION & PLAY PRIORITY SPECIFICATION)
### Căn cứ phân hệ: [`src/ai/decision-maker.ts`](../src/ai/decision-maker.ts) & [`src/ai/rule-strategies.ts`](../src/ai/rule-strategies.ts)

---

## 1. TỔNG QUAN KIẾN TRÚC RULE-FIRST (RULE-FIRST COMPOSITE PATTERNS)

Hệ thống kết hợp 2 Mẫu Thiết Kế Phần Mềm:
1. **Composite Rule Strategy Pattern ([`CompositeRuleStrategy`](../src/ai/rule-strategies.ts))**: Phân tích tập hợp các Rule đang active (`GameRules`) để tổng hợp:
   - `RuleLeadPolicy` (Chính sách ra bài cầm cái).
   - `RuleRespondingScoreModifier` (Điểm số điều chỉnh khi đỡ bài).
   - `EmergencyOverrides` (Hành động khẩn cấp: Thoát Cóng, Chống đền bài, Cấm 2 cuối).
   - `ChoppingRiskFactor` & `TrapTendencyBonus` (Hệ số rủi ro chặt & điểm gài bẫy).
2. **Chain of Responsibility Pattern**: Chuỗi 5 tầng xử lý quyết định tuần tự:

```
                                  GAME ENGINE
                                       │ (Gửi DecisionContext chứa rules & hasPlayedFirstCard)
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        COMPOSITE RULE STRATEGY RESOLVER                                │
│    - Settlement: CARD_COUNT / TRADITIONAL / WINNER_TAKES_ALL                           │
│    - Cong: enabled / penaltyCards / multiplier                                         │
│    - Chopping: allowFourPairsCutAnytime / multiplier                                   │
│    - GameFlow: prohibitEndingWithTwo / threeSpadesEndingBonus / firstGame              │
│    - TableScale: playerCount (2 / 3 / 4)                                               │
└──────────────────────────────────────┬─────────────────────────────────────────────────┘
                                       │ Emergency Overrides, Lead Policy, Score Modifiers
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│             CHAIN OF RESPONSIBILITY (AI BOT DECISION HANDLER PIPELINE)                 │
│                                                                                        │
│  1. EmergencyRuleHandler ──> 2. EndgameSolverHandler ──> 3. LeadMoveHeuristic          │
│     (Thoát Cóng/Đền/Cấm 2)      (Dứt điểm ván bài)          (Ra bài theo LeadPolicy)   │
│                                                                  │                     │
│                                                                  ▼                     │
│                             5. FallbackDecision   <── 4. RespondingMoveHeuristic       │
│                                (Dự phòng an toàn)        (Đỡ bài theo Rule Modifiers)  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MA TRẬN TÁC ĐỘNG CHIẾN THUẬT THEO TỪNG NHÓM RULE ACTIVE

| Nhóm Rule | Trạng Thái Active | Tác Động Khi Cầm Cái (Lead Move) | Tác Động Khi Đỡ Bài (Responding Move) | Hành Động Khẩn Cấp (Emergency) |
| :--- | :--- | :--- | :--- | :--- |
| ⚡ **Settlement: `CARD_COUNT`** | `settlementRule = 'CARD_COUNT'` | **Xả Sảnh dài (4-6 lá) & Bộ nhiều lá trước** để giảm cấp tốc số lá tồn. | **Thưởng lớn ($+120$) khi xả $\ge 4$ lá**. Sẵn sàng xả Heo/Hàng khi đối thủ còn ít bài. | Không |
| 🏆 **Settlement: `TRADITIONAL`** | `settlementRule = 'TRADITIONAL_RANK_BASED'` | **Tẩu rác nhỏ ($3, 4, 5...$) trước** để thăm dò; giữ bộ to bọc lót đường dài. | **Phạt ($-100$) xả Heo đè rác nhỏ** đầu ván khi bài còn $\ge 6$ lá. | Không |
| 👑 **Settlement: `WINNER_TAKES_ALL`** | `settlementRule = 'WINNER_TAKES_ALL'` | **Đánh bạo lực tranh Nhất (All-or-Nothing)**. | **Thưởng lớn cướp cái bằng Heo/bài to** ($+110$) để dứt điểm combo. | Không |
| ❄️ **Luật Cóng (`cong`)** | `cong.enabled = true` | Không | Tăng điểm muốn đánh khi đối thủ còn ít bài để sớm có lá trên bàn. | **`EMERGENCY_UNFREEZE`**: Khi `hasPlayedFirstCard === false` và đối thủ còn $\le 3$ lá $\to$ đánh bất kỳ bài gì để thoát Cóng! |
| ⚔️ **Luật Chặt (`chopping`)** | `multiplier \ge 2` hoặc `freeCutFourPairs = true` | Giữ Hàng phục kích nếu có bài rác để nhử Heo. | Tăng hệ số rủi ro Chặt khi xả Heo; tăng điểm gài bẫy nhử Heo khi cầm Hàng. | Không |
| 🚫 **Cấm 2 Cuối (`gameFlow`)** | `prohibitEndingWithTwo = true` | Khi bài thường còn đúng 1 lượt dứt điểm $\to$ **Xả Heo trước**. | Thưởng đè Heo cờ tàn để dứt điểm bằng bài thường. | Tự động Pass nếu chỉ còn toàn Heo trên tay. |
| 🎴 **Ăn 3 Bích Cuối (`gameFlow`)** | `threeSpadesEndingBonus = true` | **Thưởng cực đại ($+500$)** khi lá đơn $3\spadesuit$ là nước đi dứt điểm ván đấu. Giữ $3\spadesuit$ khi bài có Heo Cơ giữ cái. | Không | Không |
| 🛡️ **Chống Đền Bài** | Đối thủ kế tiếp báo 1 lá | **Bắt buộc đánh Bộ hoặc lá rác TO NHẤT** (Át/Heo) để chặn đầu. | Cướp cái quyết liệt để ngăn người 1 lá đi tiếp. | Ép nước đi chặn đầu chống phạt đền bài. |
| ⚔️ **Solo 1v1 (`table`)** | `playerCount = 2` | **Đẩy nhanh tốc độ kết liễu**, ép nhịp liên tục. | **Thưởng lớn điểm cướp cái ($+90$)** do 100% giữ quyền đi tiếp. | Không |

---

## 3. CHI TIẾT THỨ TỰ ƯU TIÊN XỬ LÝ THEO TỪNG HANDLER

### 🔴 1. Tầng Khẩn Cấp Số 1 (`EmergencyRuleHandler`)
Xử lý các tình huống có nguy cơ thiệt hại cực lớn hoặc bắt buộc theo luật:
1. **Thoát Cóng Khẩn Cấp**: Khi Bot chưa ra lá nào (`hasPlayedFirstCard === false`) và có người sắp về ($\le 3$ lá) $\to$ Đánh ngay nước đi hợp lệ nhỏ nhất bất kỳ.
2. **Chống Đền Bài Báo 1 Lá**: Nếu đối thủ kế tiếp còn 1 lá $\to$ Đánh Bộ (đôi/sảnh/tam) hoặc lá rác to nhất (A, 2).
3. **Cờ Tàn Cấm 2 Cuối**: Khi bài thường còn 1 lượt dứt điểm $\to$ Xả tổ hợp Heo ra trước để tránh thối Heo.
4. **Mở Màn Ván 1 (3 Bích)**: Mở màn an toàn bằng $3\spadesuit$, bảo vệ tuyệt đối 3 Đôi Thông / 4 Đôi Thông / Tứ Quý.

---

### 🟡 2. Tầng Cờ Tàn Tối Ưu (`EndgameSolverHandler`)
1. **Instant Win**: Nếu có nước đi đánh hết sạch toàn bộ lá bài trên tay $\to$ Đánh ngay lập tức để về Nhất.
2. **Ăn 3 Bích Cuối Cùng**: Nếu bài có [Lá giữ cái cực mạnh (2 Cơ/Tứ quý) + Lá đơn 3 Bích], ưu tiên đánh lá giữ cái trước để dứt điểm ván bằng $3\spadesuit$ nhận thưởng gấp đôi.
3. **Cờ tàn 2 lá không cấm 2 cuối**:
   - Về đôi nếu là đôi 2 lá.
   - Đánh rác nhỏ trước nếu có 1 lá to giữ cái (Heo / Át / lá to nhất còn lại trên bàn).

---

### 🔵 3. Tầng Cầm Cái Đầu Vòng (`LeadMoveHeuristicHandler`)
Thực thi theo `compositeRuleStrategy.getCompositeLeadPolicy()`:
1. **Khai thác điểm yếu đối thủ**: Đánh tổ hợp mà đối thủ kế tiếp từng bỏ lượt (dựa trên Bayesian Pass Inference từ `CardTracker`).
2. **Theo nhánh Lead Policy active**:
   - Nếu `preferLongestComboFirst`: Xả Sảnh dài $\ge 4$ lá hoặc Sám cô trước $\to$ Xả rác.
   - Nếu `dumpSmallTrashFirst`: Tẩu rác nhỏ ($3, 4, 5...$) trước $\to$ Đánh bộ nhỏ $\to$ Giữ bộ to bọc lót.
3. **MCTS Lookahead**: Tối ưu hóa xác suất thắng dựa trên cây mô phỏng ngẫu nhiên (Tier 4 / Tier 5).

---

### 🟢 4. Tầng Đỡ Bài Trong Vòng (`RespondingMoveHeuristicHandler`)
Chấm điểm mọi nước đi hợp lệ (`moveScore`):
1. **Chặt Heo / Chặt Hàng**: $+280$ điểm gốc $+ \text{Bonus nhân hệ số phạt chặt } (\times \text{multiplier}) + \text{Bonus gài bẫy}$.
2. **Xả Heo đè bài**:
   - Đè Heo đối thủ: Thưởng điểm, trừ đi $\text{Rủi ro bị chặt} \times \text{ChoppingRiskFactor}$.
   - Đè bài thường bằng Heo: Chỉ cho phép khi cờ tàn ($\le 4$ lá), 1v1, hoặc ép chặn người 1 lá; phạt nặng ($-180$) nếu tự ý vứt Heo đè rác khi bài còn nhiều.
3. **Cộng điểm từ Composite Strategy**: Thưởng xả nhiều lá trong Đếm lá, thưởng cướp cái trong Nhất ăn tất / 1v1.
4. **Phạt phá bộ bài quý**: Trừ điểm nặng nếu nước đi xé lẻ 3 Đôi Thông, Tứ Quý, Sảnh dài.
5. **Minimum Sufficient Beat**: Ưu tiên đè bằng lá bài nhỏ nhất vừa đủ để bảo toàn tài nguyên bài to.
6. **Quyết định**: Nếu `bestMoveScore > 0` $\to$ **PLAY**, ngược lại $\to$ **PASS** để giữ thế trận.
