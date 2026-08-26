# 🎴 TIẾN LÊN MIỀN NAM — WEB GAME & AI BOT ENGINE

> **Game Tiến Lên Miền Nam chuẩn Việt Nam, vận hành trên nền tảng Web hiện đại, sở hữu kiến trúc Engine phân lớp sạch, 6 chế độ chơi đa dạng, hệ thống Trí Tuệ Nhân Tạo (AI Bot) 18 tính cách độc lập và đạt chuẩn an toàn kiểu dữ liệu 100% (Strict Type-Safe).**

---

## 🌟 ĐẶC ĐIỂM NỔI BẬT (HIGHLIGHTS)

* 🃏 **Đầy Đủ Luật Chơi Tiến Lên Miền Nam**: Đánh lẻ, Đôi, Sám, Sảnh (3–12 lá không chứa 2), 3 Đôi Thông, Tứ Quý, 4 Đôi Thông (chặt tự do không cần vòng), Chặt Chồng, Cóng (Cháy bài), Thối Heo/Hàng, Tới Trắng (Sảnh rồng, Tứ quý 2, 5-6 đôi), Cấm Đánh 2 Cuối Cùng (`prohibitEndingWithTwo`), Ăn 3 Bích Về Cuối (`threeSpadesEndingBonus`), Chống Đền Bài khi người kế tiếp báo 1 lá.
* 🎮 **Chế Độ Chơi Đa Dạng (Strategy Pattern)**:
  1. ⚡ **Chơi Nhanh & Đấu Hạng (Quick Play & Ranked Elo)**: Tự động ghép trận với các Bot cùng trình độ Elo, tùy chọn luật (Đếm Lá, Nhất Ăn Tất, Truyền Thống, Solo 1v1), tính biến động điểm Elo chuẩn FIDE và tích lũy Xu thưởng.
  2. 🗺️ **Hành Trình Sự Nghiệp (Campaign Story)**: Chinh phục 5 chương cốt truyện độc đáo, mở khóa danh hiệu và phần thưởng đặc biệt.
  3. 🛠️ **Tùy Biến Bàn Chơi (Custom Sandbox)**: Tự do tinh chỉnh số người (2-4), mức cược, phạt chặt, cóng, về 3 bích cuối và độ khó Bot.
* 🤖 **Hệ Thống Trí Tuệ Nhân Tạo (AI Bot Engine)**:
  - **18 Personas Cá Tính Hóa** thuộc 5 Bậc Elo (Rookie 850 $\to$ God Mode 2500).
  - **Composite Rule-First Strategy**: AI tự động thích ứng với bất kỳ tổ hợp luật nào đang được cấu hình.
  - **Chain of Responsibility**: 5 tầng xử lý quyết định tuần tự: `Emergency` $\to$ `Endgame` $\to$ `Lead` $\to$ `Responding` $\to$ `Fallback`.
  - **CardTracker & Bayesian Inference**: Đếm bài, theo dõi rác/heo và suy luận khả năng có Hàng của đối thủ.
  - **Opponent Dynamic Profiling (`OpponentProfiler`)**: Ghi nhớ và đọc vị thói quen tâm lý (ham giữ Heo, nhát tay, gài bẫy) của người chơi qua nhiều ván đấu.
  - **Game Theory & Nash Equilibrium (`CfrEngine`)**: Áp dụng Counterfactual Regret Minimization cho chiến thuật hỗn hợp và tung hỏa mù (Bluff Pass).
  - **Scaled ISMCTS Solver (Monte Carlo Tree Search)**: Mô phỏng song song 100 - 500+ kịch bản cây ván đấu sâu cho các Bot bậc Thần Bài.
* 🛠️ **Game Rules Builder Pattern**: Tạo và tùy biến luật chơi linh hoạt, an toàn bằng Fluent API (`GameRulesBuilder`).
* 📡 **Event-Driven Architecture (GameEventBus)**: Tách biệt hoàn toàn Game Engine với UI, Quests, Achievements và Audio.
* 🛡️ **100% Strict Type-Safe**: Tuyệt đối không sử dụng `any`, cấm ép kiểu `as Type`, không tham số `optional (?)` lỏng lẻo, kiểm soát ghế bot bằng Tuple `readonly [string, string, string]`.
* ⚡ **Hiệu Năng Render 60 FPS**: Tối ưu hóa phần cứng GPU (Hardware Acceleration Layering), âm thanh Web Audio API sống động.

---

## 🏗️ KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               1. PRESENTATION LAYER (UI / UX)                            │
│  - React 19 + Tailwind CSS + Hardware-Accelerated CSS (3D Transform, GPU Layering)       │
│  - Components: LobbyHub, GameTableScreen, TableCenter, PlayerHandView, BotSeat, Modals   │
│  - Web Audio API Sound Manager (Nhạc Tết, hiệu ứng đập bài, chặt heo, thối 2)             │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ Actions / Subscriptions
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                           2. STATE MANAGEMENT LAYER (Zustand Stores)                     │
│  - useGameStore: Đồng bộ snapshot ván bài, lượt đánh, người thắng, tiền cược             │
│  - useUserStore: Quản lý Profile, Xu, Elo Rating, Nhiệm vụ ngày & Thành tựu trọn đời     │
│  - useSettingsStore: Tùy chỉnh âm lượng, AI Hint Engine (Trợ lý gợi ý), tốc độ ván đấu   │
│  - useModalStore: Quản lý vòng đời hiển thị các Popup tương tác                          │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ Commands / State Updates
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                           3. GAME ENGINE CORE LAYER (Pure TypeScript)                    │
│  - GameEngine (State Machine): Khởi tạo ván, chia bài, xử lý vòng, chặt heo, thối 2      │
│  - Validator & Combinations: Nhận diện và thẩm định tính hợp lệ của mọi tổ hợp bài       │
│  - GameModeStrategy Pattern: 6 chế độ chơi độc lập (Truyền Thống, Đếm Lá, Ngầm...)       │
│  - GameEventBus: Hệ thống Pub/Sub phát sự kiện decoupling giữa Engine và UI/Quests       │
└───────────────────────────────────────────┬──────────────────────────────────────────────┘
                                            │ Context Queries / GameRules
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                             4. AI INTELLIGENCE LAYER (AI Engine)                         │
│  - Composite Rule Strategy: 5 Rule Strategies (Settlement, Cong, Chop, Flow, TableScale) │
│  - Chain of Responsibility: Emergency (Cóng/Đền/2) -> Endgame -> Lead -> Responding      │
│  - CardTracker & Bayesian Inference: Đếm bài, theo dõi rác/heo, phán đoán tay đối thủ   │
│  - ISMCTS Solver: Mô phỏng Rollout đa kịch bản cho Bot Cao Thủ & Thần Bài               │
│  - 18 Bot Personas: Định lượng hành vi cá nhân hóa (Baiting, Aggression, Tempo Control)  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 CÀI ĐẶT & CHẠY DỰ ÁN (GETTING STARTED)

### Yêu Cầu Môi Trường
* [Bun](https://bun.sh/) (khuyến nghị $\ge 1.1.0$) hoặc Node.js $\ge 18.0.0$.

### 1. Cài Đặt Dependencies
```bash
bun install
```

### 2. Chạy Máy Chủ Phát Triển (Development Server)
```bash
bun run dev
```
Truy cập trình duyệt tại địa chỉ: `http://localhost:5173`.

### 3. Kiểm Tra Mã Nguồn (Linting)
```bash
bun run lint
```
> Kiểm tra toàn diện với ESLint, tuân thủ nghiêm ngặt quy tắc cấm `any` và cấm ép kiểu `as`.

### 4. Kiểm Thử Đơn Vị & Báo Cáo Bao Phủ (Unit Testing & Coverage)
```bash
# Chạy toàn bộ 216 bài kiểm thử (34 test suites)
bun test

# Chạy kiểm thử kèm bảng thống kê Code Coverage chi tiết
bun run test:coverage
```
> Bao phủ toàn diện Engine, AI Decision Maker, Opponent Profiler, CFR Solver, Multi-threaded MCTS, Strategy Rules, Validator, EventBus, Quests, Zustand Stores, Audio Manager và Fuzzing Invariants 1000+ ván.

### 5. Đóng Gói Ứng Dụng (Production Build)
```bash
bun run build
```

---

## 🛠️ TÙY BIẾN LUẬT BÀI VỚI BUILDER PATTERN

Dự án cung cấp `GameRulesBuilder` để khởi tạo và tùy biến luật chơi linh hoạt:

```typescript
import { GameRulesBuilder } from './src/engine/rules-builder';

// Khởi tạo bàn chơi Đếm Lá Sát Phạt Cao Cấp
const customRules = new GameRulesBuilder()
  .setSettlementRule('CARD_COUNT')
  .configureChopping({
    multiplier: 2,
    allowFourPairsCutAnytime: true,
    allowThreePairsCutTwo: true,
    allowFourOfAKindCutPairsOfTwos: true
  })
  .configureCong({
    enabled: true,
    penaltyCards: 26,
    multiplier: 2
  })
  .configureGameFlow({
    firstGameRequireThreeOfSpades: true,
    winnerLeadsNextGame: true,
    prohibitEndingWithTwo: true,
    threeSpadesEndingBonus: true
  })
  .configureTable({
    playerCount: 4,
    betAmount: 1000,
    soundEnabled: true
  })
  .build();
```

---

## 🤖 HỆ THỐNG 18 BOT PERSONAS (5 ELO TIERS)

| Tier | Elo Range | Danh Sách Bot | Đặc Điểm Chiến Thuật |
| :--- | :--- | :--- | :--- |
| **Tier 1: Rookie** | 800 – 990 | Bé Bông, Cu Tí, Út Nhỏ | Đánh bài ngây thơ, ít nhớ bài, dễ bị lừa Heo. |
| **Tier 2: Amateur** | 1000 – 1290 | Nam Biker, Linh Shipper, Phong Sinh Viên | Biết giữ Heo cơ bản, tẩu rác khi có cơ hội. |
| **Tier 3: Skilled** | 1300 – 1590 | Chú Bảy Cà Phê, Cô Năm Chợ Cũ, Hoàng Công Sở | Tích cực săn Heo, gài bẫy Át để nhử hàng. |
| **Tier 4: Master** | 1600 – 1990 | Hải Đồ Tể, Phượng Bất Động Sản, Dũng Xế Sang | Khai thác điểm yếu đối thủ, cướp cái quyết liệt, đếm bài chuẩn. |
| **Tier 5: Grandmaster** | 2000 – 2500 | Bà Năm Hột Xoàn, Ông Trùm Năm Sài Gòn, Thần Bài Cô Ba | Sử dụng MCTS Lookahead, đọc bài đối thủ chính xác, tối ưu hóa nhịp độ. |

---

## 📚 TÀI LIỆU CHI TIẾT (DOCUMENTATION INDEX)

Mọi khía cạnh chuyên sâu của dự án được ghi chép chi tiết trong thư mục [`docs/`](docs/):

* 📖 [**`TIEN_LEN_RULES.md`**](docs/TIEN_LEN_RULES.md): Đặc tả chi tiết luật chơi Tiến Lên Miền Nam chuẩn Việt Nam (Đè bài, Chặt heo, Thối 2, Tới trắng, Ăn 3 Bích cuối, Chống đền bài).
* 🏛️ [**`ARCHITECTURE.md`**](docs/ARCHITECTURE.md): Kiến trúc tổng thể hệ thống, mô hình phân lớp, Design Patterns, State Management và tối ưu hóa hiệu năng GPU.
* 🤖 [**`BOT_AI_ARCHITECTURE.md`**](docs/BOT_AI_ARCHITECTURE.md): Kiến trúc AI Bot Rule-First, Bayesian Card Tracker, MCTS Solver và thuật toán phân rã tổ hợp bài.
* 🎯 [**`AI_MOVE_PRIORITY.md`**](docs/AI_MOVE_PRIORITY.md): Bảng ma trận thứ tự ưu tiên ra bài và đỡ bài của AI theo từng tập luật hoạt động.
* 📋 [**`API_AND_DATA_MODELS.md`**](docs/API_AND_DATA_MODELS.md): Đặc tả Interfaces, TypeScript Types, Builders, Game Events và Stores.

---

## 🛡️ CHÍNH SÁCH CHUẨN HÓA TYPE (STRICT TYPE-SAFETY POLICY)

Dự án áp dụng bộ quy tắc kiểm soát kiểu dữ liệu ở mức cao nhất:
1. **Không `any`**: Sử dụng kiểu dữ liệu cụ thể, Union Types hoặc Generic có ràng buộc.
2. **Không `as Type` (Type Assertions)**: Cấm hoàn toàn cú pháp ép kiểu. Thay vào đó dùng Type Narrowing, Discriminated Unions và User-Defined Type Guards (`isGameRules()`,...).
3. **Không Optional Tham Số Luật**: Mọi cấu hình bàn chơi, tham số kinh tế và thuộc tính sự kiện đều bắt buộc truyền tường minh.
4. **Tuple Cho Ghế Bot**: Cấu hình 3 bot đối thủ được quản lý bằng Tuple `readonly [string, string, string]`, đảm bảo an toàn tuyệt đối khi render bàn chơi.

---

## 📄 GIẤY PHÉP (LICENSE)
Dự án được phân phối dưới giấy phép mã nguồn mở MIT License.
