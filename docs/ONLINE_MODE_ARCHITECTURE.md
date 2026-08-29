# TÀI LIỆU KIẾN TRÚC & HƯỚNG DẪN CHẾ ĐỘ CHƠI ONLINE (ONLINE P2P MULTIPLAYER)
## DỰ ÁN: TIẾN LÊN MIỀN NAM WEB GAME & AI BOT ENGINE

---

## 1. TỔNG QUAN HỆ THỐNG (HIGH-LEVEL OVERVIEW)

Chế độ **Chơi Online Cùng Bạn Bè** được xây dựng dựa trên kiến trúc **Serverless WebRTC P2P (Peer-to-Peer)** hiện đại, cho phép người chơi tạo phòng, mời bạn bè qua mã PIN 4 số hoặc đường link trực tiếp mà không tốn chi phí hạ tầng máy chủ trung gian.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                   KIẾN TRÚC MẠNG P2P (SERVERLESS)                        │
│                                                                                          │
│           ┌──────────────────────────────────────────────────────────────────┐           │
│           │                   Chủ Phòng (Host Authoritative)                 │           │
│           │   - Nắm giữ GameEngine & HostEngineDriver (Headless Server)      │           │
│           │   - Chia bài riêng tư (Fog of War) cho từng máy khách            │           │
│           │   - Điều phối lượt đánh, kiểm tra tính hợp lệ của nước đi        │           │
│           │   - Tính toán kết toán (Settlement), thưởng phạt, cộng trừ Xu    │           │
│           └────────────────────────┬───────────────────┬─────────────────────┘           │
│                                    │                   │                                 │
│                Encrypted P2P Data  │                   │  Encrypted P2P Data             │
│                Channel (Sub-50ms)  │                   │  Channel (Sub-50ms)             │
│                                    ▼                   ▼                                 │
│                   ┌──────────────────────┐       ┌──────────────────────┐                │
│                   │    Máy Khách (p1)    │       │    Máy Khách (p2)    │                │
│                   │  - Nhận 13 lá riêng  │       │  - Nhận 13 lá riêng  │                │
│                   │  - Gửi nước đi/bỏ qua│       │  - Gửi nước đi/bỏ qua│                │
│                   │  - Nhận Sync bàn đấu │       │  - Nhận Sync bàn đấu │                │
│                   └──────────────────────┘       └──────────────────────┘                │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Triết lý Thiết Kế & Trải Nghiệm Người Dùng (UX):
1. **Không dùng thuật ngữ kỹ thuật:** Loại bỏ hoàn toàn các từ ngữ chuyên môn như *"P2P"*, *"WebRTC"*, *"Serverless"*, *"0đ server"*. Giao diện chỉ sử dụng ngôn ngữ tự nhiên: **"Chơi Online"**, **"Tạo Phòng"**, **"Vào Phòng"**, **"Mã PIN 4 số"**.
2. **Mã PIN 4 số ngắn gọn:** Mã phòng có định dạng chuẩn `TL-XXXX` (hoặc 4 chữ số `XXXX`) giúp người chơi trên điện thoại và máy tính nhập liệu cực kỳ nhanh chóng qua bàn phím ảo tích hợp.
3. **Thống nhất giao diện Web & Mobile:** 100% các màn hình sử dụng chung Design Tokens (`--color-gold`, `--bg-container`, `--border-container`), Modal Primitive chuẩn và Hook chia sẻ [useOnlineRoomLogic.ts](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/ui/hooks/useOnlineRoomLogic.ts).

---

## 2. KIẾN TRÚC TÁCH NHỎ STATE (ZUSTAND SLICES ARCHITECTURE)

Tệp quản lý trạng thái online được module hóa theo chuẩn **Zustand Slices Pattern** tại `src/stores/online/`:

```
src/stores/
├── useOnlineStore.ts             <-- Entry point chính (hợp nhất 3 slices & re-export 100% tương thích)
└── online/
    ├── types.ts                  <-- Định nghĩa toàn bộ interfaces & types tuân thủ Strict Typing
    ├── roomSlice.ts              <-- Quản lý phòng chờ, tạo phòng, vào phòng, thêm/xóa Bot, rời phòng
    ├── matchSlice.ts             <-- Quản lý điều phối ván đấu, đánh bài, bỏ lượt, sẵn sàng ván mới
    └── chatSlice.ts              <-- Quản lý tin nhắn chat & biểu cảm tương tác
```

### Phân công trách nhiệm của từng Slice:
- **`types.ts`**: Chứa các interface `CreateRoomOptions`, `OnlineDisbandNotice`, `RoomSliceState`, `MatchSliceState`, `ChatSliceState`. Tuân thủ **Strict Typing Policy**: Tuyệt đối không dùng `prop?: Type` mà luôn dùng `prop: Type | null`.
- **`roomSlice.ts`**: Xử lý sinh mã PIN `TL-XXXX`, khởi tạo phòng cho Host, kết nối phòng cho Guest, lắng nghe sự kiện thoát phòng (`onPeerLeave`), xử lý thêm/xóa Bot ghế trống.
- **`matchSlice.ts`**: Xử lý bắt đầu ván `startMatch` (lấp đầy Bot vào ghế trống nếu thiếu người, khởi tạo `HostEngineDriver`), gửi nước đi lạc quan `sendMoveAction`, gửi bỏ lượt `sendPassAction`, bỏ phiếu ván mới `voteRematch`.
- **`chatSlice.ts`**: Quản lý hàng đợi 50 tin nhắn gần nhất và phát tán gói tin chat qua mạng P2P.

---

## 3. TÁI SỬ DỤNG BẢNG CẤU HÌNH BÀN CHƠI CHUYÊN SÂU (`TableRulesConfigPanel`)

Tab 1 ("Tạo Phòng") của chế độ Online tái sử dụng 100% component [TableRulesConfigPanel.tsx](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/ui/components/TableRulesConfigPanel.tsx), mang lại khả năng tùy biến sâu rộng tương tự như khi tạo Custom Game:

| Nhóm Cấu Hình | Thuộc Tính Hỗ Trợ | Ý Nghĩa Chuyên Sâu |
| :--- | :--- | :--- |
| **Quy mô bàn đấu** | 2 người (Solo), 3 người, 4 người (Chuẩn) | Tự động điều chỉnh nhịp độ và số đối thủ tương ứng |
| **Quy tắc tính điểm** | `COUNT_CARDS` (Đếm Lá), `TRADITIONAL` (Truyền Thống), `WINNER_TAKES_ALL` (Nhất Ăn Tất) | Tái sử dụng `GameModeStrategy` để tính thưởng phạt và Elo chuẩn xác |
| **Mức cược ván đấu** | Presets (`500`, `1.000`, `2.000`, `5.000`) + Ô nhập tùy chỉnh | Kèm thanh đánh giá rủi ro tài chính và cảnh báo tỷ lệ % ví |
| **Hệ số Chặt Heo** | $\times 1, \times 2, \times 4$ | Nhân tiền phạt tương ứng khi chặt heo đen, heo đỏ, 3 đôi thông, tứ quý, 4 đôi thông |
| **Chặt Chồng Dồn Tiền** | `cascadeChopEnabled` (Bật / Tắt) | Người bị chặt cuối cùng gánh toàn bộ tiền phạt của chuỗi chặt |
| **4 Đôi Thông Tự Do** | `allowFourPairsCutAnytime` (Bật / Tắt) | Cho phép 4 đôi thông chặt bất kỳ lúc nào không cần theo vòng lượt |
| **Cấm 2 Về Chót** | `prohibitEndingWithTwo` (Bật / Tắt) | Bắt buộc không được để 2/hàng về cuối, xử phạt thối nếu vi phạm |
| **Luật Cóng** | `congEnabled` (Bật / Tắt) | Xử thua trắng hoặc đền làng cho người không ra được lá bài nào |
| **Thưởng 3 Bích Về Chót**| `threeSpadesEndingBonus` (Bật / Tắt) | Thưởng nhân đôi tiền nếu về Nhất bằng cây 3 Bích cuối cùng |

---

## 4. CƠ CHẾ BẢO VỆ TÀI CHÍNH 2 LỚP (FINANCIAL BALANCE GUARD)

Nhằm ngăn chặn tình trạng người chơi không đủ tiền cược tham gia bàn làm méo mó kết toán cuối ván, hệ thống áp dụng cơ chế xác thực 2 lớp:

```
                  [Người chơi nhập mã PIN để vào phòng]
                                    │
                                    ▼
       ┌──────────────────────────────────────────────────────────┐
       │ LỚP 1: XÁC THỰC MÁY KHÁCH (Guest Client-side Validation) │
       │ Nhận roomState từ Host -> Kiểm tra profile.coins         │
       └────────────────────────────┬─────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            coins < betAmount               coins >= betAmount
                    │                               │
                    ▼                               ▼
       ┌────────────────────────┐      ┌─────────────────────────────┐
       │ Tự động rời phòng      │      │ LỚP 2: BẢO VỆ CHỦ PHÒNG     │
       │ Hiện thông báo lỗi     │      │ (Host-side Security Guard)  │
       │ Bật nút [Mở Ngân Hàng] │      │ onJoinRequest kiểm tra số dư│
       └────────────────────────┘      └──────────────┬──────────────┘
                                                      │
                                      ┌───────────────┴───────────────┐
                                      │                               │
                              coins < betAmount               coins >= betAmount
                                      │                               │
                                      ▼                               ▼
                         [Host từ chối yêu cầu vào]       [Chấp nhận vào ghế chờ]
```

1. **Lớp 1 (Phía Khách):** Khi nhận `roomState`, nếu `profile.coins < roomState.betAmount`, máy Khách tự động rời phòng và hiển thị modal thông báo kèm nút **"Mở Ngân Hàng"** (`BANK`) để vay vốn/nhận cứu trợ.
2. **Lớp 2 (Phía Chủ phòng):** Trong `onJoinRequest`, Host kiểm tra `incomingPlayer.coins < current.betAmount`. Nếu không đủ, Host từ chối tiếp nhận vào ghế.

---

## 5. BẢO MẬT & GIAO THỨC CHỐNG SOI BÀI (FOG OF WAR PROTOCOL)

Tất cả các gói tin mạng đều được định nghĩa và kiểm định chặt chẽ bằng Zod Schema tại [network.schema.ts](file:///c:/Users/uongsuadaubung/Desktop/tien_len_mien_nam/src/engine/network/network.schema.ts):

| Gói Tin | Hướng Truyền | Bảo Mật & Vai Trò |
| :--- | :--- | :--- |
| **`DealHandPacket`** | Host $\rightarrow$ Guest (Kênh riêng tư) | **Fog of War:** Chỉ gửi đúng 13 lá bài của riêng người chơi đó. Khách không thể soi bài đối thủ qua DevTools. |
| **`TableStateSyncPacket`** | Host $\rightarrow$ All (Phát thanh công khai) | Đồng bộ lượt đánh hiện tại, bài vừa đánh ra, số lá bài còn lại trên tay của từng người và người thắng. |
| **`PlayerActionPacket`** | Guest $\rightarrow$ Host (Kênh riêng tư) | Gửi lệnh Đánh bài (`PLAY`) hoặc Bỏ lượt (`PASS`). Host kiểm tra tính hợp lệ qua `GameEngine` trước khi chấp nhận. |
| **`GameEndPacket`** | Host $\rightarrow$ All (Phát thanh công khai) | Kết toán Xu, cập nhật $\Delta \text{Elo}$, và **tiết lộ toàn bộ bài tàn cuộc** của tất cả người chơi để hiển thị bảng tổng kết. |
| **`RematchVotePacket`** | Guest $\rightarrow$ Host | Bỏ phiếu sẵn sàng chơi tiếp ván mới. Chỉ khi **100% người chơi trong phòng đồng ý** thì ván mới mới bắt đầu. |
| **`ChatPacket`** | Peer $\rightarrow$ All | Gửi tin nhắn văn bản và biểu cảm cảm xúc (Emotes) thời gian thực. |

---

## 6. XỬ LÝ SỰ CỐ & NGẮT KẾT NỐI (FAULT TOLERANCE & DISBAND)

1. **Chủ phòng (Host) thoát hoặc mất mạng:**
   - Host phát thanh giải tán (`DISBANDED`) kèm lý do rõ ràng.
   - Tất cả máy Khách tự động nhận thông báo giải tán, đóng màn hình ván đấu và quay về Sảnh an toàn.
2. **Khách thoát khi đang ở phòng chờ (`WAITING`):**
   - Host tự động giải phóng vị trí của người đó thành ghế trống để người khác hoặc Bot có thể vào thay thế.
3. **Khách thoát giữa trận (`PLAYING`):**
   - Host dừng ván đấu ngay lập tức, kích hoạt giải tán phòng và thông báo cho các người chơi còn lại.
4. **Ván đấu mới sau khi Rematch:**
   - Sau khi kết thúc ván 1, trạng thái `isReady` của tất cả người chơi được reset về `false`.
   - Host và Khách lần lượt bấm "Sẵn Sàng". Khi đạt đủ 100% số phiếu, `HostEngineDriver` tự động chia bài ván 2 (`gameNumber = 2`), giữ nguyên người thắng ván trước để giành quyền đánh trước.

---

## 7. KIỂM THỬ TỰ ĐỘNG & BẢO ĐẢM CHẤT LƯỢNG (TESTING & QA)

Hệ thống mạng Online được bảo vệ bởi **23 bài test tự động chuyên sâu** tại thư mục `tests/network/`:

1. **`tests/network/online-match-flow.test.ts` (10 tests):**
   - Tạo phòng, bắt đầu trận đấu, lấp đầy Bot tự động, dọn dẹp state khi rời phòng.
   - Sắp xếp bài thông minh trên máy Host & Khách.
   - Bỏ phiếu Rematch Ready Check và chuyển tiếp Ván 2 mượt mà.
   - Xử lý các kịch bản thoát phòng, ngắt mạng khi chờ và giữa trận.
2. **`tests/network/online-settlement.test.ts` (6 tests):**
   - Kết toán Xu cho Host và Khách theo các mức cược và chế độ (Đếm Lá, Nhất Ăn Tất).
   - Mở bài đối thủ khi kết thúc ván (thối 2, cóng).
   - Kiểm tra tài chính 2 lớp: Chặn người chơi thiếu tiền cược ở cả Host-side và Guest-side.
3. **`tests/network/protocol.test.ts` (7 tests):**
   - Kiểm định tính hợp lệ của tất cả Zod Schemas (`OnlinePlayer`, `OnlineRoomState`, `PlayerActionPacket`, `DealHandPacket`, `TableStateSyncPacket`, `ChatPacket`, `RematchVotePacket`).
