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
                                            │ Context Queries / Decisions
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             4. AI INTELLIGENCE LAYER (AI Engine)                         │
│  - Chain of Responsibility Decision Maker: Cờ tàn $\to$ Chặn 1 lá $\to$ Cầm cái $\to$ Đỡ│
│  - Combinatorial Hand Partitioner: Phân rã bài tối ưu ($C(n, k)$, Sảnh, Đôi, Hàng)       │
│  - CardTracker & Bayesian Inference: Đếm bài, theo dõi rác/heo, phán đoán tay đối thủ   │
│  - Monte Carlo Tree Search (MCTS): Mô phỏng ván đấu đa kịch bản cho Bot Tier 5 (Mythic)  │
│  - 18 Bot Personas & 5 Elo Tiers: Định lượng hành vi cá nhân hóa từ 850 đến 2500 Elo      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CÁC MẪU THIẾT KẾ PHẦN MỀM KINH ĐIỂN (DESIGN PATTERNS)

### 2.1. Chain of Responsibility Pattern (Chuỗi Trách Nhiệm)
Hệ thống sử dụng Chuỗi Trách Nhiệm tại hai phân hệ cốt lõi:

#### A. AI Bot Decision Chain (`src/ai/decision-maker.ts`)
Mỗi Handler trong chuỗi chịu trách nhiệm cho một kịch bản chiến thuật cụ thể. Nếu không thỏa mãn điều kiện, quyền xử lý được tự động chuyển cho Handler kế tiếp:
1. **`EndgameSolverHandler`**: Nhận diện và thực thi nước đi dứt điểm trận đấu ngay lập tức khi bài trên tay có thể kết thúc ván (bao gồm giải toán cờ tàn Cấm 2 Cuối Cùng).
2. **`AntiLeaderDefenseHandler`**: Kích hoạt khi có người chơi báo 1 lá. Nếu là người kế tiếp: ưu tiên ra Bộ (đôi/sảnh) để đối thủ không đỡ được, hoặc ra lá rác to nhất (Át/Heo) để chặn đầu chống đền bài. Nếu là người khác: xả rác nhỏ thoát thân.
3. **`LeadMoveHeuristicHandler`**: Xử lý lượt cầm cái đầu vòng. Tẩu rác nhỏ ($3, 4, 5...$) trước, giữ Heo và Hàng bọc lót; mở màn 3 Bích không phá 3 Đôi Thông / Tứ Quý.
4. **`RespondingMoveHeuristicHandler`**: Đỡ bài đối thủ, tính toán lợi nhuận khi chặt Heo hoặc nhịn bài để giữ nguyên cấu trúc bộ sảnh quý giá.
5. **`FallbackDecisionHandler`**: Đánh nước đi hợp lệ nhỏ nhất hoặc Bỏ Lượt (PASS).

#### B. Combination Recognizers Chain (`src/engine/combinations.ts`)
Nhận diện nhanh chóng loại tổ hợp bài từ Single $\to$ Pair $\to$ Triple $\to$ Straight $\to$ Three Pairs $\to$ Four of a Kind $\to$ Four Pairs.

---

### 2.2. Strategy Pattern (Mẫu Chiến Lược Chế Độ Chơi)
Vận hành tại [`src/engine/game-modes.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/engine/game-modes.ts), đóng gói các thuật toán tính điểm và luật kết thúc ván thành các Strategy riêng biệt:

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
Triển khai tại [`src/engine/event-bus.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/engine/event-bus.ts):
- Phân tách hoàn toàn (decoupling) giữa Logic Game và Giao diện UI / Hệ thống Nhiệm Vụ.
- Khi GameEngine phát ra sự kiện (`CARD_PLAYED`, `CHOP_EXECUTED`, `MATCH_COMPLETED`, `INSTANT_WIN`), các subscriber (`SoundManager`, `QuestEvaluator`, `AchievementTracker`, `UI Effects`) tự động nhận payload và phản hồi độc lập mà không cần can thiệp vào vòng đời Engine.

---

### 2.4. Specification Pattern (Bộ Thẩm Định Nhiệm Vụ & Thành Tựu)
Triển khai tại [`src/engine/quests.ts`](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/engine/quests.ts):
- Đóng gói từng điều kiện hoàn thành nhiệm vụ (ví dụ: Chặt heo 2 lần, Thắng 3 ván Thế Giới Ngầm, Đạt chuỗi 5 ván thắng) thành các Evaluator chuyên biệt, tự động kiểm tra tiến độ mỗi khi có `GameEvent` tương ứng.

---

## 3. PHÂN HỆ QUẢN LÝ TRẠNG THÁI (STATE MANAGEMENT)

Sử dụng **Zustand** cho kiến trúc State mỏng, hiệu năng cao, không re-render dư thừa:
1. **`useGameStore`**:
   - `gameEngine`: Instance GameEngine đang hoạt động.
   - `gameState`: Snapshot trạng thái đồng bộ cho UI (ghế ngồi, bài trên tay, bài đã đánh, lượt đi hiện tại, lịch sử chặt chém).
   - `selectedCards`: Mảng các lá bài người chơi đang chọn trên tay để đánh.
   - `isThinking`: Trạng thái đếm ngược lượt đi của Bot.
2. **`useUserStore`**:
   - Quản lý Profile (Tên, Avatar, Cấp độ, Điểm kinh nghiệm, Danh hiệu).
   - Ví tiền (Xu thường, Tiền ngầm, Nợ chợ đen).
   - Tiến trình Nhiệm vụ ngày và Thành tựu trọn đời (tự động đồng bộ với `localStorage`).
3. **`useSettingsStore`**:
   - Cấu hình âm lượng BGM / SFX.
   - Bật/tắt trợ lý gợi ý (AI Hint Engine).
   - Tốc độ hoạt ảnh (Bình thường / Nhanh / Siêu tốc).
   - Bật/tắt X-Ray Thần Nhãn (Soi bài đối thủ).

---

## 4. TỐI ƯU HÓA HIỆU NĂNG GPU & RENDER (HARDWARE ACCELERATION)

Nhằm đảm bảo trải nghiệm siêu mượt trên mọi thiết bị và trình duyệt mà không gây nóng máy hoặc tụt FPS:
- **Loại bỏ hiệu ứng `backdrop-filter: blur` nặng nề** trong các HUD giao diện trong trận đấu, thay bằng nền solid màu tối độ mờ cao (`bg-[#150205]/95`).
- **Phân tách Layer GPU Độc Lập**:
  - Áp dụng `transform: translateZ(0)` và `will-change: transform` cho toàn bộ các lá bài (`.playing-card`) và bàn nỉ tròn (`.round-table`).
  - Toàn bộ hoạt ảnh chia bài và hiệu ứng hoa mai rơi (`FallingBlossoms`) sử dụng `translate3d(x, y, 0)` để đẩy việc tính toán chuyển động sang bộ xử lý đồ họa phần cứng (GPU Compositor).
- **Giới hạn số lượng hạt hiệu ứng (Particle Throttling)**: Thu gọn số lượng cánh hoa bay từ 16 xuống 6 hạt nhẹ, thêm thuộc tính CSS `contain: strict`.

---

## 5. BẢO MẬT & TÍNH TOÀN VẸN VÁN BÀI (INTEGRITY & FAIR PLAY)

- **Nguyên Tắc Trí Tuệ Độc Lập (Self-Interested Bot Principle)**: Mỗi Bot là một thực thể độc lập tối ưu hóa lợi ích cá nhân, tuyệt đối không có cơ chế "thông đồng" (collusion) hay "vây bắt" người chơi thật.
- **Che Dấu Thông Tin (Imperfect Information Game)**: Ở chế độ thông thường, CardTracker của Bot chỉ ghi nhận các lá bài đã được công khai trên bàn đấu và trong tay của chính nó, hoàn toàn không gian lận đọc trước bài úp của người chơi khác.
