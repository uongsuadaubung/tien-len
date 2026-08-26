/**
 * ============================================================================
 * UI TIMING CONSTANTS (HẰNG SỐ THỜI GIAN GIAO DIỆN & HIỆU ỨNG)
 * Tập trung toàn bộ các giá trị delay, animation, timeout để tránh Magic Numbers
 * ============================================================================
 */

export const UI_TIMINGS = {
  // Hoạt ảnh chia bài 3D (Dealing Animation)
  DEAL_CARD_INTERVAL_MS: 40,      // Khoảng cách giữa các lá bài được chia
  DEAL_HIT_DELAY_MS: 160,         // Thời gian lá bài bay tới ghế nhận
  DEAL_FINISH_DELAY_MS: 380,      // Delay sau khi lá cuối bay tới đích để kết thúc
  SHUFFLE_DURATION_MS: 400,       // Thời gian hiệu ứng xào bài

  // Thông báo & Banner
  BANNER_DISPLAY_DURATION_MS: 2800, // Thời gian hiển thị Banner mở màn
  CHOP_ALERT_DURATION_MS: 2500      // Thời gian hiển thị Thông báo chặt Heo/Hàng
} as const;
