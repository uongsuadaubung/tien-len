# Đặc Tả Luật Chơi Tiến Lên Miền Nam

## 1. Tổng Quan & Bộ Bài
- **Số người chơi**: 4 người (mỗi người 13 lá từ bộ bài Tây 52 lá).
- **Độ lớn của số (Rank)**:
  $$3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2$$
  *Lá 3 là lá nhỏ nhất, lá 2 (Heo) là lá lớn nhất.*
- **Độ lớn của chất (Suit)**:
  $$\text{Bích } (\spadesuit) < \text{Chuồn/Tép } (\clubsuit) < \text{Rô } (\diamondsuit) < \text{Cơ } (\heartsuit)$$
- **Quy tắc so sánh 2 lá bài đơn**:
  1. So sánh theo số trước.
  2. Nếu cùng số thì so sánh theo chất.
  - Ví dụ: $3\heartsuit > 3\diamondsuit > 3\clubsuit > 3\spadesuit$. $4\spadesuit > 3\heartsuit$. $2\heartsuit$ là lá bài cao nhất trong bộ bài.

---

## 2. Các Tổ Hợp Hợp Lệ (Card Combinations)

| Tên tổ hợp | Định nghĩa | Ví dụ | Quy tắc so sánh |
| :--- | :--- | :--- | :--- |
| **Rác (Single)** | 1 lá bài đơn lẻ | $3\spadesuit, K\heartsuit, 2\diamondsuit$ | So rank, sau đó so suit |
| **Đôi (Pair)** | 2 lá bài cùng số | $5\spadesuit 5\heartsuit$ | So rank, sau đó so chất của lá lớn nhất trong đôi |
| **Sám cô (Triple)** | 3 lá bài cùng số | $7\spadesuit 7\clubsuit 7\diamondsuit$ | So rank (sám lớn hơn thắng) |
| **Sảnh (Straight)** | Dãy từ 3 lá liên tiếp trở lên không phân biệt chất (từ 3 đến A, **không chứa 2**) | $3\spadesuit 4\diamondsuit 5\heartsuit$, $10\text{-}J\text{-}Q\text{-}K\text{-}A$ | Cùng độ dài: so lá cao nhất trong sảnh |
| **3 Đôi Thông (3-Consecutive Pairs)** | 3 đôi có giá trị số liên tiếp | $4\text{-}4, 5\text{-}5, 6\text{-}6$ | So lá cao nhất của đôi cao nhất |
| **Tứ Quý (Four of a Kind)** | 4 lá bài cùng một giá trị số | $9\spadesuit 9\clubsuit 9\diamondsuit 9\heartsuit$ | So rank |
| **4 Đôi Thông (4-Consecutive Pairs)** | 4 đôi có giá trị số liên tiếp | $7\text{-}7, 8\text{-}8, 9\text{-}9, 10\text{-}10$ | So lá cao nhất của đôi cao nhất |
| **5 Đôi Thông** | 5 đôi liên tiếp | $3\text{-}3 \to 7\text{-}7$ | Tới trắng |
| **6 Đôi Bất Kỳ** | 6 đôi không cần liên tiếp | 6 đôi bất kỳ | Tới trắng |

> [!IMPORTANT]
> **Quy định về Sảnh**: Sảnh hợp lệ có độ dài từ 3 đến 12 lá (Sảnh rồng 3-A). **Sảnh không được phép chứa lá 2 (Heo)** (không có sảnh $K\text{-}A\text{-}2$ hay $A\text{-}2\text{-}3$).

---

## 3. Quy Tắc Đè Bài & Chặt Hàng (Beating & Chopping Rules)

### 3.1. Đỡ bài thông thường
- Người đánh sau phải ra bộ **cùng loại và cùng số lượng lá** nhưng có giá trị cao hơn người trước (đôi đè đôi, sám đè sám, sảnh đè sảnh cùng độ dài).

### 3.2. Quy tắc Chặt Heo & Chặt Hàng Đặc Biệt

| Bộ trên bàn | Các bộ có thể Chặt | Lưu ý về vòng chơi |
| :--- | :--- | :--- |
| **1 Heo (2 bất kỳ)** | - 1 Heo lớn hơn<br>- 3 Đôi Thông<br>- Tứ Quý<br>- 4 Đôi Thông | - 3 Đôi Thông: **phải theo vòng**<br>- Tứ Quý: **theo lượt/không cần vòng**<br>- 4 Đôi Thông: **chặt tự do không cần vòng** |
| **Đôi Heo (2 lá 2)** | - Đôi Heo lớn hơn<br>- Tứ Quý<br>- 4 Đôi Thông | 3 Đôi thông **KHÔNG** chặt được đôi heo |
| **3 Đôi Thông** | - 3 Đôi Thông lớn hơn<br>- Tứ Quý<br>- 4 Đôi Thông | Phải theo vòng |
| **Tứ Quý** | - Tứ Quý lớn hơn<br>- 4 Đôi Thông | Phải theo vòng (trừ 4 đôi thông) |
| **4 Đôi Thông** | - 4 Đôi Thông lớn hơn | **Chặt tự do không cần vòng (nhảy cóc)** |

### 3.3. Quy tắc Chặt Chồng (Chặt đè)
- Khi một người chặt heo/hàng, người kế tiếp có thể tiếp tục chặt đè bằng hàng lớn hơn.
- Toàn bộ tiền phạt/điểm tích lũy từ các lần chặt trước sẽ do **người bị chặt cuối cùng gánh chịu** cho người chặt thành công sau cùng.

---

## 4. Quy Trình Ván Đấu & Vòng Chơi (Game Flow)

### 4.1. Khởi đầu ván chơi
- **Ván đầu tiên**: Người nắm giữ quân bài $3\spadesuit$ (3 Bích) được quyền đánh trước. Lượt đánh đầu tiên bắt buộc phải chứa quân $3\spadesuit$ (đánh $3\spadesuit$ lẻ, đôi chứa $3\spadesuit$, sám chứa $3\spadesuit$, hoặc sảnh chứa $3\spadesuit$).
- **Các ván tiếp theo**: Người về Nhất ở ván trước được quyền đánh trước với bất kỳ quân/bộ bài nào.

### 4.2. Vòng chơi và Bỏ lượt (Pass Turn)
- Lần lượt theo chiều kim đồng hồ, mỗi người chơi có quyền đánh bộ lớn hơn hoặc chọn **Bỏ lượt (Pass)**.
- Khi người chơi chọn **Bỏ lượt**, người đó sẽ **mất quyền tham gia trong suốt vòng đấu hiện tại** cho đến khi vòng đấu đó kết thúc.
- Một vòng đấu kết thúc khi **tất cả người chơi khác đều bỏ lượt**. Người đánh ra bộ bài cuối cùng sẽ giành quyền mở vòng mới ("Được Cái") và có thể đánh ra bất kỳ bộ bài hợp lệ nào.

---

## 5. Các Trường Hợp Đặc Biệt

### 5.1. Tới Trắng (Thắng Ngay Lập Tức Khi Chia Bài)
Người chơi được xử thắng ngay (Tới Trắng) nếu sở hữu một trong các tổ hợp sau:
1. **Sảnh Rồng**: Sảnh từ 3 đến A (12 lá) hoặc từ 3 đến 2 (13 lá).
2. **Tứ Quý 2**: Sở hữu cả 4 con heo ($2\spadesuit 2\clubsuit 2\diamondsuit 2\heartsuit$).
3. **5 Đôi Thông**: Sở hữu 5 đôi liên tiếp.
4. **6 Đôi Bất Kỳ**: Sở hữu 6 đôi bất kỳ trên tay.
5. **13 Lá Cùng Màu**: 13 lá toàn bộ màu Đỏ ($\heartsuit, \diamondsuit$) hoặc toàn bộ màu Đen ($\spadesuit, \clubsuit$).
6. **Ván đầu tiên sở hữu Tứ Quý 3**: Xử tới trắng ngay.

*Ưu tiên*: Nếu có nhiều người cùng tới trắng, ưu tiên xét theo thứ tự độ mạnh của bộ tới trắng hoặc người có $3\spadesuit$ (nếu ván đầu).

### 5.2. Cóng (Cháy Bài)
- Khi có một người chơi đã đánh hết toàn bộ 13 lá bài (về Nhất) mà một người chơi khác **chưa đánh ra được bất kỳ lá bài nào** trong suốt cả ván, người đó bị coi là **Cóng (Cháy bài)**.
- **Hình phạt**:
  - Bị xử bét ngay lập tức và phạt gấp đôi điểm/tiền.
  - Phải đền thêm toàn bộ số lá Heo ($2$) và Hàng (Tứ Quý, Đôi Thông) còn kẹt trên tay.

### 5.3. Thối Heo / Thối Hàng
- Khi ván đấu kết thúc (đã tìm ra người về Nhất ở chế độ Đếm Lá hoặc đủ thứ hạng ở chế độ Truyền Thống), người còn giữ lá $2$ (Heo Đen phạt 1 mức, Heo Đỏ phạt 2 mức), Tứ Quý hoặc Đôi Thông sẽ bị phạt tiền/điểm theo quy chuẩn.

---

## 6. Cơ Chế Tính Điểm

### 6.1. Chế độ Truyền Thống (Nhất - Nhì - Ba - Bét)
- Ván đấu tiếp diễn cho đến khi 3 người hết bài.
- Người về Nhất: $+3$ cược (từ người Bét: $-3$ cược, người Ba: $-1$ cược, người Nhì: $+1$ cược).
- Cộng trừ tiền phạt Chặt heo/hàng tức thì trong ván.

### 6.2. Chế độ Đếm Lá
- Ngay khi có 1 người hết bài (về Nhất), ván đấu dừng ngay.
- Mỗi người chơi còn lại bị phạt: $\text{Số lá bài còn lại} \times \text{Tiền cược}$.
- Nếu còn Heo/Hàng: phạt cộng dồn vào tổng tiền thua.
