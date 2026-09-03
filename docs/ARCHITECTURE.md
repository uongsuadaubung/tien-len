# KIẾN TRÚC HỆ THỐNG TOÀN DIỆN (SYSTEM ARCHITECTURE SPECIFICATION)
## DỰ ÁN: TIẾN LÊN MIỀN NAM WEB GAME & AI BOT ENGINE

---

## 1. TỔNG QUAN KIẾN TRÚC (HIGH-LEVEL ARCHITECTURE)

Hệ thống được thiết kế theo mô hình kiến trúc phân lớp sạch (Clean Layered Architecture), đảm bảo tính module hóa, dễ dàng mở rộng, kiểm thử độc lập (Unit Testable) và tối ưu hóa hiệu năng render 60 FPS trên trình duyệt:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               1. PRESENTATION LAYER (UI / UX)                            │
│  - React 19 Components (WebApp, MobileApp, LobbyHub, GameTable, HandView, BotSeat)       │
│  - Dumb Components: Chỉ nhận Props hiển thị và phát Intent hành động người dùng          │
│  - Web Audio API Sound Manager, CSS GPU Compositor Layering                              │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ User Intents (Chơi nhanh, Đánh bài, Bỏ lượt)
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                  2. FLOW COORDINATION & VIEW STATE LAYER (Unidirectional Flow)           │
│  - AppFlowCoordinator: Cổng tập trung duy nhất điều phối vào trận, về sảnh, đầu hàng      │
│  - useViewStore: Modal State Machine (Discriminated Union) - Bảo đảm 1 popup active      │
│  - Chống Race Conditions, ngăn ngừa văng màn hình và dọn dẹp bộ nhớ RAM 100%            │
└─────────────────────────────────────┬───────────────────┬────────────────────────────────┘
                                      │                   │ Starts / Controls Driver
         Emits Single Atomic Snapshot │                   ▼
                                      │ ┌──────────────────────────────────────────────────┐
                                      │ │    3. ENGINE DRIVER LAYER (Pure TypeScript Class)│
                                      │ │  - OfflineMatchDriver: Vòng lặp ván đấu ngoài DOM│
                                      │ │  - HostEngineDriver: Vòng lặp Host P2P WebRTC    │
                                      │ │  - Quản lý Bot turn delay, animation chia bài    │
                                      │ │  - cleanup() ngắt 100% ghost timers khi rời bàn  │
                                      │ └─────────────────┬────────────────────────────────┘
                                      ▼                   │
┌─────────────────────────────────────────────────────────┼────────────────────────────────┐
│                           4. STATE & PERSISTENCE LAYER  ▼                                │
│  - useGameStore: applyMatchSnapshot() đồng bộ nguyên tử trạng thái bàn đấu                │
│  - useUserStore: Quản lý Profile, Xu, Elo Rating, Nhiệm vụ ngày & Thành tựu              │
│  - useOnlineStore: RoomSlice, MatchSlice, ChatSlice cho Multiplayer P2P                   │
│  - 100% Dexie IndexedDB: Lưu trữ vĩnh viễn, chống phạt F5 qua active_session             │
└─────────────────────────────────────────────────────────┬────────────────────────────────┘
                                                          │ Executes Rules & Game Loop
                                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                           5. GAME ENGINE CORE & AI LAYER (Domain Logic)                  │
│  - GameEngine (State Machine): Bộ luật TLMN, chia bài, tính chặt heo, cóng, thối 2       │
│  - Validator & Combinations: Nhận diện và thẩm định tính hợp lệ của mọi tổ hợp bài       │
│  - Strategy Engine: 4 chế độ chơi độc lập (Đếm Lá, Nhất Ăn Tất, Truyền Thống, Chiến Dịch)│
│  - AI Layer: Composite Rule-First Strategy, Chain of Responsibility, MCTS Solver         │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CÁC MẪU THIẾT KẾ PHẦN MỀM KINH ĐIỂN (DESIGN PATTERNS)

### 2.1. Composite Rule Strategy Pattern & Chain of Responsibility
Hệ thống sử dụng mẫu thiết kế **Rule-First Strategy** để AI có thể tự động thích ứng với bất kỳ tổ hợp luật nào đang hoạt động:

#### A. Composite Rule Strategy Manager ([`src/ai/rule-strategies.ts`](../src/ai/rule-strategies.ts))
Phân rã hệ thống luật thành 5 module chiến lược độc lập:
1. **`SettlementRuleStrategy`**: Điều phối chính sách ra bài và đỡ bài theo cách tính tiền (`CARD_COUNT`, `TRADITIONAL_RANK_BASED`, `WINNER_TAKES_ALL`).
2. **`CongRuleStrategy`**: Kích hoạt trạng thái **Thoát Cóng Khẩn Cấp (`EMERGENCY_UNFREEZE`)** khi Bot chưa ra lá bài nào (`hasPlayedFirstCard === false`) và có đối thủ sắp về ($\le 3$ lá).
3. **`ChoppingRuleStrategy`**: Điều chỉnh hệ số rủi ro Chặt Heo và điểm gài bẫy phục kích theo `chopping.multiplier` và luật 4 đôi thông tự do.
4. **`GameFlowRuleStrategy`**: Bảo toàn hàng ở lượt mở màn 3 Bích, xử lý cờ tàn Cấm 2 cuối (tránh thối Heo), thưởng Ăn 3 Bích cuối cùng (+500 điểm) và chống đền bài khi người kế tiếp báo 1 lá.
5. **`TableScaleRuleStrategy`**: Tối ưu hóa Solo 1v1 (thưởng lớn cướp cái để giữ 100% nhịp độ) vs Bàn 3-4 người.

#### B. AI Bot Decision Chain ([`src/ai/decision-maker.ts`](../src/ai/decision-maker.ts))
Chuỗi 5 tầng xử lý quyết định tuần tự:
1. **`EmergencyRuleHandler`**: Xử lý các tình huống can thiệp khẩn cấp (Thoát Cóng, Chống đền bài, Cấm 2 cuối cờ tàn, Mở màn 3 Bích) ở mức ưu tiên số 1.
2. **`EndgameSolverHandler`**: Nhận diện và thực thi nước đi dứt điểm ván đấu ngay lập tức (Instant Win / 2-card endgame).
3. **`LeadMoveHeuristicHandler`**: Ra bài khi Cầm Cái theo `compositeLeadPolicy` (Xả sảnh dài trong Đếm lá, Tẩu rác nhỏ trong Truyền thống).
4. **`RespondingMoveHeuristicHandler`**: Đỡ bài đối thủ, tính toán rủi ro chặt Heo, thưởng xả nhiều bài và phạt phá bộ bài quý.
5. **`FallbackDecisionHandler`**: Đánh nước đi hợp lệ nhỏ nhất hoặc Bỏ Lượt (PASS).

---

### 2.2. Strategy Pattern (Mẫu Chiến Lược Chế Độ Chơi Bàn Đấu)
Vận hành tại [`src/engine/strategies/game-mode-strategy.ts`](../src/engine/strategies/game-mode-strategy.ts), đóng gói cấu hình bàn đấu (`setupMatch`) và kết toán kinh tế (`settleMatch`):

| Strategy | Kết Thúc Ván | Cách Tính Tiền / Phạt | Elo Rating |
| :--- | :--- | :--- | :--- |
| **`TraditionalModeStrategy`** | Đánh đến khi còn 1 người | Chia tiền 4 bậc: Nhất (+2.0x), Nhì (+1.0x), Ba (-1.0x), Bét (-2.0x) | Có ($\Delta \text{Elo}$) |
| **`CountCardsModeStrategy`** | 1 người hết bài là dừng | Người thua trả $\text{Bet} \times \text{Số lá tồn} \times \text{Hệ số phạt}$ cho người Nhất | Có ($\Delta \text{Elo}$) |
| **`WinnerTakesAllModeStrategy`** | 1 người hết bài là dừng | Người về Nhất gom sạch toàn bộ tiền cược của cả bàn | Có ($\Delta \text{Elo}$) |
| **`CampaignModeStrategy`** | 1 người hết bài là dừng | 0 phạt đếm lá, mở khóa chương kế tiếp và trao thưởng Xu/Danh hiệu | Không |

---

### 2.3. Builder Pattern (Mẫu Xây Dựng Cấu Hình Luật Bài)
Triển khai tại [`src/engine/rules-builder.ts`](../src/engine/rules-builder.ts) và [`src/ai/rule-strategies.ts`](../src/ai/rule-strategies.ts):
- **`GameRulesBuilder`**: Cung cấp Fluent API tuần tự từng bước (`setSettlementRule`, `configureChopping`, `configureCong`, `configureGameFlow`, `configureTable`), đảm bảo mọi thuộc tính luôn có giá trị mặc định chuẩn xác và không chứa trường `undefined`.
- **Strategy Builders**: Cho phép khởi tạo độc lập các Rule Strategy Evaluator cho AI layer.

---

### 2.4. Observer / Pub-Sub Event Bus Pattern
Triển khai tại [`src/engine/events/game-event-bus.ts`](../src/engine/events/game-event-bus.ts):
- Phân tách hoàn toàn (decoupling) giữa Logic Game và Giao diện UI / Hệ thống Nhiệm Vụ.
- Khi GameEngine phát ra sự kiện (`CARD_PLAYED`, `CHOP_EXECUTED`, `MATCH_COMPLETED`, `INSTANT_WIN`), các subscriber tự động nhận payload và phản hồi độc lập.

---

### 2.5. Specification Pattern (Bộ Thẩm Định Nhiệm Vụ & Thành Tựu)
Triển khai tại [`src/engine/evaluators/progress-evaluators.ts`](../src/engine/evaluators/progress-evaluators.ts):
- Đóng gói từng điều kiện hoàn thành nhiệm vụ thành các Evaluator chuyên biệt (`WinThreeMatchesEvaluator`, `ChopRedTwoEvaluator`, `MillionaireAchievementEvaluator`).

---

### 2.6. App Flow Coordinator & Offline Match Driver Pattern (Decoupled Game Loop & Unidirectional Flow)
Triển khai tại [`src/services/app-flow-coordinator.ts`](../src/services/app-flow-coordinator.ts), [`src/engine/offline-match-driver.ts`](../src/engine/offline-match-driver.ts) và [`src/stores/useViewStore.ts`](../src/stores/useViewStore.ts):
1. **Cổng Điều Phối Chuyển Cảnh Duy Nhất (`AppFlowCoordinator`)**:
   - Loại bỏ hoàn toàn việc gọi `setCurrentScreen` hay set state rời rạc trong các Component / Hook.
   - Quản lý toàn bộ vòng đời ván đấu qua đường ống tuần tự: Kiểm tra số dư Xu $\to$ Khóa cọc $\to$ Tạo Driver $\to$ Đóng Popups $\to$ Chuyển `GAME_TABLE` $\to$ Chia bài.
   - Quản lý an toàn cổng về sảnh (`returnToLobby`): Hủy Driver, ngắt 100% timers, dọn dẹp active session (chống phạt F5 oan) và đưa màn hình về `LOBBY`.
2. **Vòng Lặp Ván Đấu Độc Lập Khỏi React (`OfflineMatchDriver`)**:
   - Tách rời toàn bộ logic nhịp đánh Bot, đếm giây, animation chia bài ra khỏi React `useEffect`.
   - Vận hành bằng Pure TypeScript Class, không phụ thuộc vào chu kỳ render của DOM $\to$ triệt tiêu hoàn toàn Stale Closures và Race Conditions.
   - Cơ chế `cleanup()` hủy tức thì 100% `setTimeout` trong RAM khi người chơi rời bàn hoặc đầu hàng.
3. **Modal State Machine (`useViewStore`)**:
   - Quản lý `currentScreen` và `activeModal` dưới dạng **Discriminated Union**.
   - Đảm bảo tính loại trừ lẫn nhau (Mutually Exclusive): Tối đa duy nhất 1 popup được mở tại một thời điểm, loại bỏ triệt để lỗi kẹt giao diện và xung đột z-index.
4. **Atomic Snapshotting (`useGameStore.applyMatchSnapshot`)**:
   - Driver phát ra 1 gói dữ liệu duy nhất (`MatchSnapshot`) mỗi khi trạng thái bàn thay đổi, thay thế hơn 15 setters vụn vặt trước đây $\to$ tối ưu hóa vượt trội hiệu năng render.

---

## 3. PHÂN HỆ QUẢN LÝ TRẠNG THÁI (STATE MANAGEMENT)

Sử dụng **Zustand** cho kiến trúc State mỏng, hiệu năng cao, phân định ranh giới rõ ràng:
1. **`useViewStore`**: Quản lý điều hướng màn hình (`currentScreen: 'LOBBY' | 'GAME_TABLE'`) và Modal State Machine (`activeModal: ActiveModalDescriptor`).
2. **`useGameStore`**: Lưu trữ trạng thái bàn đấu, nhận cập nhật nguyên tử qua `applyMatchSnapshot()`, quản lý bài đang chọn của người chơi.
3. **`useUserStore`**: Quản lý Profile, Xu, Elo, Nhiệm vụ ngày và Thành tựu trọn đời.
4. **`useOnlineStore`**: Module hóa 3 Slices (RoomSlice, MatchSlice, ChatSlice) cho P2P WebRTC Multiplayer.
5. **`useEcosystemStore`**: Quản lý 200 Đối Thủ, Bảng Tin Giang Hồ, Xếp Hạng Toàn Máy Chủ và kết toán mô phỏng ngầm.
6. **`useSettingsStore`**: Cấu hình âm lượng, gợi ý (AI Hint Engine), tốc độ ván đấu, X-Ray soi bài.

---

## 4. TỐI ƯU HÓA HIỆU NĂNG GPU & RENDER (HARDWARE ACCELERATION)

- **Loại bỏ hiệu ứng `backdrop-filter: blur` nặng nề** trong các HUD giao diện trận đấu.
- **Phân tách Layer GPU Độc Lập**: Áp dụng `transform: translateZ(0)` và `will-change: transform` cho toàn bộ các lá bài (`.playing-card`) và bàn nỉ tròn (`.round-table`).
- **Giới hạn số lượng hạt hiệu ứng (Particle Throttling)**: Thu gọn số lượng cánh hoa bay và thêm thuộc tính CSS `contain: strict`.

---

## 5. CHUẨN HÓA BẢO ĐẢM AN TOÀN KIỂU DỮ LIỆU (STRICT TYPE SAFETY)

- **Cấm `any`**: Sử dụng kiểu dữ liệu chi tiết, union types hoặc generics chặt chẽ.
- **Cấm Ép Kiểu `as Type`**: Sử dụng runtime validation, discriminated unions và type narrowing.
- **Không Tham Số Optional Trong Luật**: Toàn bộ các model cấu hình bàn chơi, tham số kinh tế và sự kiện đều bắt buộc truyền tường minh.
- **Quản Lý Bàn 3 Bot Bằng Tuple**: Sử dụng kiểu Tuple `readonly [string, string, string]` để đảm bảo tính toàn vẹn 100% của danh sách đối thủ.

---

## 6. TẦNG LƯU TRỮ VĨNH VIỄN & HỆ SINH THÁI 200 ĐỐI THỦ (DEXIE INDEXEDDB & CONCURRENCY)

### 6.1. Kiến Trúc Lưu Trữ 100% Dexie IndexedDB (`TIEN_LEN_DEXIE_DB_V1`)
- Loại bỏ hoàn toàn `localStorage` để giải phóng giới hạn 5MB và tránh nghẽn I/O đồng bộ trên Main Thread.
- Quản lý 7 bảng dữ liệu quan hệ có index tối ưu:
  * `bots: 'id, elo, coins, status, dnaTier'`
  * `newsfeed: 'id, timestamp, type'`
  * `player_profile: 'key'`
  * `game_settings: 'key'`
  * `active_session: 'key'`
  * `human_behavior: 'key'`
  * `match_logs: 'matchId, startedAt, gameMode'`
- **Write-Through RAM Cache (0ms Reads)**: Dữ liệu được nạp vào bộ nhớ RAM khi ứng dụng khởi động. Mọi thao tác đọc đều tức thì $0\text{ms}$; thao tác ghi được cập nhật đồng thời vào RAM và ghi bất đồng bộ non-blocking xuống IndexedDB.

### 6.2. Single Source of Truth & Pure Derived State (Rank & Badges)
- **Điểm Elo là nguồn chân lý duy nhất (Single Source of Truth)**.
- Toàn bộ Bậc Rank (5 Tier Bot / 7 Tier Esports), Huy hiệu, Tên Bậc, Khung Màu đều được phái sinh thuần túy qua hàm thuần túy `getTierFromElo(elo)`. Không lưu trữ trùng lặp các trường tính toán được vào Database.

### 6.3. Web Worker Concurrency & Organic Random Concurrency
- Khi người chơi vào bàn đấu, hệ thống kích hoạt Web Worker (`simulation-worker.ts`) mô phỏng ngầm song song cho các đối thủ còn lại, giải phóng 100% CPU Main Thread.
- **Xác Suất Tham Gia Tự Nhiên (Organic Random Concurrency)**: Không ép toàn bộ đối thủ vào bàn cùng lúc. Từng bot được tính xác suất tham gia từ 30% đến 85% dựa trên khẩu vị rủi ro (`riskAppetite`) và chuỗi thắng/thua (`currentStreak`/`Tilt`). Kết quả: ~40% - 70% bot thi đấu (`participatingBots`), ~30% - 60% bot nghỉ ngơi (`restingBots`) để mô phỏng không khí sới bạc chân thực.
- **Error Boundary & 3s Safety Timeout**: Client bridge (`simulation-worker-client.ts`) tích hợp sẵn `worker.onerror` và bộ đếm Timeout 3 giây. Nếu Web Worker gặp sự cố, hệ thống tự động fallback sang chạy inline `simulateAllTablesBatch` mượt mà, ngăn ngừa tuyệt đối lỗi treo Promise (Hanging Promise).

### 6.4. Vòng Đời Bot & Dọn Sạch Bản Ghi Phá Sản (Dexie Purge & Rookie Drafting)
- **Ngưỡng Phá Sản Chuẩn Hóa**: Mức cược tối thiểu toàn sới là `1.000 Xu / lá`. Bất kỳ Bot nào rớt xuống $\le 1.000\ \text{Xu}$ sẽ lập tức bị xử Vỡ nợ (`BANKRUPT`).
- **Dọn Sạch Bản Ghi Cũ (`dbDeleteBotsBatch`)**: Bản ghi của bot phá sản bị xóa vĩnh viễn khỏi Dexie IndexedDB (`db.bots.bulkDelete`), duy trì kích thước cơ sở dữ liệu luôn chính xác 200 Bot.
- **Tuyển Mộ Tân Binh (`draftRookieBot`)**: Tự động sinh Tân Binh mới kế thừa DNA AI của bậc rank vừa vỡ nợ, cấp vốn khởi điểm `50.000 Xu` và `1.000 Elo` để tự gầy dựng lại cơ đồ.

### 6.5. Kinh Tế Co Giãn & Tiền Cọc Động (Elastic Dynamic Deposit)
- **Công Thức Tiền Cọc Co Giãn**:
  $$\text{actualDeposit} = \min(\text{playerCoins}, 26 \times \text{betAmount} \times \text{multiplier})$$
- Người chơi không bị chặn tham gia khi thiếu cọc tối đa 26 lá; chỉ bị chặn khi số dư thực sự nhỏ hơn mức cược tối thiểu bàn (`coins < betAmount`).
- Bảo toàn 100% số dư ví người chơi qua nhiều ván liên tiếp, ngăn chặn triệt để tình trạng stale closure và trừ tiền oan.

### 6.6. Thuật Toán Thích Ứng Elo Đa Quy Mô (Adaptive Multi-Scale Elo)
- Hỗ trợ tính toán chính xác biến động Elo cho cả bàn 2 người (Solo 1v1), 3 người và 4 người:
  * **Bàn 2 người (Solo 1v1)**: Nhất ($+24 \to +32$ Elo), Bét/Thua ($-24 \to -32$ Elo).
  * **Bàn 3 người**: Nhất ($+24 \to +32$ Elo), Nhì ($\pm 2$ Elo - Hòa điểm), Ba/Bét ($-24 \to -32$ Elo).
  * **Bàn 4 người**: Nhất ($+24 \to +32$), Nhì ($+8 \to +12$), Ba ($-8 \to -12$), Bét ($-24 \to -32$).

### 6.7. Cinematic 3-Second Loading Gate (`SplashScreen.tsx`)
- Khi người chơi mở ứng dụng hoặc F5, cổng tải `SplashScreen` kích hoạt song song quá trình hydrate IndexedDB và bộ đếm thời gian thực `Date.now() - startTime`.
- Đảm bảo hiển thị tối thiểu 3.000ms với thanh tiến trình mượt mà từ 5% đến 100%, tạo cảm giác nhập vai sang trọng của sới bạc chuyên nghiệp.
