/**
 * HẰNG SỐ KINH TẾ & TÀI CHÍNH TOÀN CỤC (GLOBAL ECONOMY CONSTANTS)
 * Nguồn định nghĩa duy nhất (Single Source of Truth) cho các chỉ số tài chính, vốn khởi nghiệp và cứu trợ.
 */
export const ECONOMY_CONSTANTS = {
  /** Vốn khởi nghiệp mặc định cho tân thủ mới tạo tài khoản */
  DEFAULT_STARTING_COINS: 50_000,

  /** Điểm Elo ban đầu cho người chơi mới */
  DEFAULT_STARTING_ELO: 1_000,

  /** Chi phí mua 1 vé quay Vòng Quay Thần Bài */
  LUCKY_WHEEL_SPIN_COST: 10_000,

  /** Giá trị nổ hũ tối đa của Vòng Quay Thần Bài */
  LUCKY_WHEEL_JACKPOT: 100_000,

  /** Số tiền cứu trợ phá sản khẩn cấp mỗi lần nhận */
  DAILY_RELIEF_AMOUNT: 20_000,

  /** Ngưỡng Xu tối đa được phép nhận cứu trợ phá sản (khi số dư nhỏ hơn ngưỡng này) */
  BANKRUPTCY_RELIEF_THRESHOLD: 10_000,

  /** Số lần tối đa được nhận gói cứu trợ phá sản trong 1 ngày */
  MAX_DAILY_RELIEF_COUNT: 3,

  /** Các gói vay ngân hàng chủ sòng */
  LOAN_PACKAGES: [
    { amount: 20_000, label: 'Tiếp Sức', desc: 'Vốn quay vòng nhanh' },
    { amount: 50_000, label: 'Vực Dậy', desc: 'Vốn đánh bàn trung cấp' },
    { amount: 100_000, label: 'Đại Gia', desc: 'Vốn chiến bàn lớn' },
    { amount: 250_000, label: 'Thần Bài', desc: 'Tất tay phục thù' }
  ]
} as const;
