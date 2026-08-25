# KIẾN TRÚC HỆ THỐNG TOÀN DIỆN (SYSTEM ARCHITECTURE SPECIFICATION)
## DỰ ÁN: TIẾN LÊN MIỀN NAM WEB GAME & AI BOT ENGINE

---

## 1. TỔNG QUAN KIẾN TRÚC (HIGH-LEVEL ARCHITECTURE)

Hệ thống được thiết kế theo mô hình kiến trúc phân lớp sạch (Clean Layered Architecture), đảm bảo tính module hóa, dễ dàng mở rộng, kiểm thử độc lập (Unit Testable) và tối ưu hóa hiệu năng render 60 FPS trên trình duyệt:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               1. PRESENTATION LAYER (UI / UX)                            │
│  - React 18 Components (LobbyHub, GameTableScreen, TableCenter, PlayerHandView, BotSeat) │
│  - Web Audio API Sound Manager (Nhạc nền Tết, hiệu ứng đập bài, chặt heo, lật bài)       │
│  - Hardware-Accelerated Vanilla CSS (3D Card Transform, GPU Compositor Layering)         │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ Actions / Subscriptions
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                           2. STATE MANAGEMENT LAYER (Zustand Stores)                     │
│  - useGameStore: Đồng bộ trạng thái ván bài, lượt đánh, người thắng, tiền cược           │
│  - useUserStore: Lưu trữ Profile, Xu, Elo Rating, Nhiệm vụ ngày & Thành tựu trọn đời     │
│  - useSettingsStore: Tùy chỉnh âm lượng, trợ lý gợi ý (Hint Engine), tốc độ ván đấu       │
│  - useModalStore: Quản lý vòng đời hiển thị các Popup / Modal tương tác                  │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ Commands / State Updates
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                           3. GAME ENGINE CORE LAYER (Pure TypeScript)                    │
│  - GameEngine (State Machine): Khởi tạo ván, chia bài, xử lý vòng đánh, chặt heo, thối 2│
│  - Validator & Combinations: Nhận diện và thẩm định tính hợp lệ của mọi tổ hợp bài       │
│  - Strategy Engine: 6 chế độ chơi độc lập (Truyền Thống, Đếm Lá, Nhất Ăn Tất, Ngầm...)   │
│  - EventBus: Hệ thống Pub/Sub phát sự kiện decoupling giữa Engine và UI/Quests           │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ Context Queries / Decisions (GameRules)
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             4. AI INTELLIGENCE LAYER (AI Engine)                         │
│  - Composite Rule Strategy Manager: 5 Rule Strategies (Settlement, Cong, Chop, Flow, Tab)│
│  - Chain of Responsibility: Emergency (Cóng/Đền/2) -> Endgame -> Lead -> Response -> Fall│
│  - Combinatorial Hand Partitioner: Phân rã bài tối ưu ($C(n, k)$, Sảnh, Đôi, Hàng)       │
│  - CardTracker & Bayesian Inference: Đếm bài, theo dõi rác/heo, phán đoán tay đối thủ   │
│  - Monte Carlo Tree Search (MCTS): Mô phỏng ván đấu đa kịch bản cho Bot Tier 5 (Mythic)  │
│  - 18 Bot Personas & 5 Elo Tiers: Định lượng hành vi cá nhân hóa từ 850 đến 2500 Elo      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CÁC MẪU THIẾT KẾ PHẦN MỀM KINH ĐIỂN (DESIGN PATTERNS)

### 2.1. Composite Rule Strategy Pattern & Chain of Responsibility
Hệ thống sử dụng mẫu thiết kế **Rule-First Strategy** để AI có thể tự động thích ứng với bất kỳ tổ hợp luật nào đang hoạt động:

#### A. Composite Rule Strategy Manager ([`src/ai/rule-strategies.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/ai/rule-strategies.ts))
Phân rã hệ thống luật thành 5 module chiến lược độc lập:
1. **`SettlementRuleStrategy`**: Điều phối chính sách ra bài và đỡ bài theo cách tính tiền (`CARD_COUNT`, `TRADITIONAL_RANK_BASED`, `WINNER_TAKES_ALL`).
2. **`CongRuleStrategy`**: Kích hoạt trạng thái **Thoát Cóng Khẩn Cấp (`EMERGENCY_UNFREEZE`)** khi Bot chưa ra lá bài nào (`hasPlayedFirstCard === false`) và có đối thủ sắp về ($\le 3$ lá).
3. **`ChoppingRuleStrategy`**: Điều chỉnh hệ số rủi ro Chặt Heo và điểm gài bẫy phục kích theo `chopping.multiplier` và luật 4 đôi thông tự do.
4. **`GameFlowRuleStrategy`**: Bảo toàn hàng ở lượt mở màn 3 Bích, xử lý cờ tàn Cấm 2 cuối (tránh thối Heo), và chống đền bài khi người kế tiếp báo 1 lá.
5. **`TableScaleRuleStrategy`**: Tối ưu hóa Solo 1v1 (thưởng lớn cướp cái để giữ 100% nhịp độ) vs Bàn 3-4 người.

#### B. AI Bot Decision Chain ([`src/ai/decision-maker.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/ai/decision-maker.ts))
Chuỗi 5 tầng xử lý quyết định tuần tự:
1. **`EmergencyRuleHandler`**: Xử lý các tình huống can thiệp khẩn cấp (Thoát Cóng, Chống đền bài, Cấm 2 cuối cờ tàn, Mở màn 3 Bích) ở mức ưu tiên số 1.
2. **`EndgameSolverHandler`**: Nhận diện và thực thi nước đi dứt điểm ván đấu ngay lập tức (Instant Win / 2-card endgame).
3. **`LeadMoveHeuristicHandler`**: Ra bài khi Cầm Cái theo `compositeLeadPolicy` (Xả sảnh dài trong Đếm lá, Tẩu rác nhỏ trong Truyền thống).
4. **`RespondingMoveHeuristicHandler`**: Đỡ bài đối thủ, tính toán rủi ro chặt Heo, thưởng xả nhiều bài và phạt phá bộ bài quý.
5. **`FallbackDecisionHandler`**: Đánh nước đi hợp lệ nhỏ nhất hoặc Bỏ Lượt (PASS).

---

### 2.2. Strategy Pattern (Mẫu Chiến Lược Chế Độ Chơi Bàn Đấu)
Vận hành tại [`src/engine/strategies/game-mode-strategy.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/engine/strategies/game-mode-strategy.ts), đóng gói cấu hình bàn đấu (`setupMatch`) và kết toán kinh tế (`settleMatch`):

| Strategy | Kết Thúc Ván | Cách Tính Tiền / Phạt | Elo Rating |
| :--- | :--- | :--- | :--- |
| **`TraditionalModeStrategy`** | Đánh đến khi còn 1 người | Chia tiền 4 bậc: Nhất (+2.0x), Nhì (+1.0x), Ba (-1.0x), Bét (-2.0x) | Không |
| **`CountCardsModeStrategy`** | 1 người hết bài là dừng | Người thua trả $1\times \text{Bet} \times \text{Số lá tồn}$ cho người Nhất | Không |
| **`WinnerTakesAllModeStrategy`** | 1 người hết bài là dừng | Người về Nhất gom sạch toàn bộ tiền cược của cả bàn | Không |
| **`UndergroundModeStrategy`** | 1 người hết bài là dừng | Đếm lá sát phạt $\times 2.0$, vay nợ chợ đen, trích nợ 10% mỗi ván thắng | Không |
| **`CampaignModeStrategy`** | 1 người hết bài là dừng | 0 phạt đếm lá, mở khóa ải kế tiếp và trao thưởng Xu/Danh hiệu | Không |
| **`RankedModeStrategy`** | Đánh đến còn 1 người | 0 Xu cược, tính điểm Elo tăng/giảm theo hiệu suất chuẩn FIDE | Có ($\Delta \text{Elo}$) |

---

### 2.3. Observer / Pub-Sub Event Bus Pattern
Triển khai tại [`src/engine/events/game-event-bus.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/engine/events/game-event-bus.ts):
- Phân tách hoàn toàn (decoupling) giữa Logic Game và Giao diện UI / Hệ thống Nhiệm Vụ.
- Khi GameEngine phát ra sự kiện (`CARD_PLAYED`, `CHOP_EXECUTED`, `MATCH_COMPLETED`, `INSTANT_WIN`), các subscriber tự động nhận payload và phản hồi độc lập.

---

### 2.4. Specification Pattern (Bộ Thẩm Định Nhiệm Vụ & Thành Tựu)
Triển khai tại [`src/engine/quests.ts`](file:///c:/Users/kien.hm/Desktop/tien-len/src/engine/quests.ts):
- Đóng gói từng điều kiện hoàn thành nhiệm vụ thành các Evaluator chuyên biệt.

---

## 3. PHÂN HỆ QUẢN LÝ TRẠNG THÁI (STATE MANAGEMENT)

Sử dụng **Zustand** cho kiến trúc State mỏng, hiệu năng cao:
1. **`useGameStore`**: Quản lý instance `GameEngine`, snapshot ván đấu, bài đang chọn, lượt đi.
2. **`useUserStore`**: Quản lý Profile, Xu, Elo, Nhiệm vụ ngày và Thành tựu trọn đời.
3. **`useSettingsStore`**: Cấu hình âm lượng, gợi ý (AI Hint Engine), tốc độ ván đấu, X-Ray soi bài.
4. **`useModalStore`**: Quản lý vòng đời hiển thị các Popup / Modal tương tác.

---

## 4. TỐI ƯU HÓA HIỆU NĂNG GPU & RENDER (HARDWARE ACCELERATION)

- **Loại bỏ hiệu ứng `backdrop-filter: blur` nặng nề** trong các HUD giao diện trận đấu.
- **Phân tách Layer GPU Độc Lập**: Áp dụng `transform: translateZ(0)` và `will-change: transform` cho toàn bộ các lá bài (`.playing-card`) và bàn nỉ tròn (`.round-table`).
- **Giới hạn số lượng hạt hiệu ứng (Particle Throttling)**: Thu gọn số lượng cánh hoa bay và thêm thuộc tính CSS `contain: strict`.

---

## 5. BẢO MẬT & TÍNH TOÀN VẸN VÁN BÀI (INTEGRITY & FAIR PLAY)

- **Nguyên Tắc Trí Tuệ Độc Lập (Self-Interested Bot Principle)**: Mỗi Bot là một thực thể độc lập tối ưu hóa lợi ích cá nhân, tuyệt đối không có cơ chế "thông đồng" (collusion).
- **Che Dấu Thông Tin (Imperfect Information Game)**: CardTracker của Bot chỉ ghi nhận các lá bài đã công khai trên bàn đấu và trong tay của chính nó, hoàn toàn không gian lận đọc trước bài úp của đối thủ.
