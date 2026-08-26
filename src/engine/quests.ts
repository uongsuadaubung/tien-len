export interface Quest {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  icon: string;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  icon: string;
  targetCount: number;
  currentCount: number;
  isCompleted: boolean;
  isClaimed: boolean;
  category: 'CHOP' | 'VICTORY' | 'WEALTH' | 'SPECIAL';
}

// ============================================================================
// 1. HÒM THƯỞNG CỘT MỐC NGÀY (DAILY MILESTONE CHESTS - CÂN BẰNG TÂN THỦ)
// ============================================================================

import { DAILY_MILESTONE_REWARDS } from './constants/economy';

export interface DailyMilestoneReward {
  requiredCount: number;
  rewardCoins: number;
  title: string;
  icon: string;
}

export const DAILY_MILESTONES: readonly DailyMilestoneReward[] = [
  { requiredCount: 1, rewardCoins: DAILY_MILESTONE_REWARDS.MILESTONE_1, title: 'Hộp Gỗ Tân Thủ', icon: '🪵' },
  { requiredCount: 3, rewardCoins: DAILY_MILESTONE_REWARDS.MILESTONE_3, title: 'Hộp Bạc Cao Cấp', icon: '🥈' },
  { requiredCount: 5, rewardCoins: DAILY_MILESTONE_REWARDS.MILESTONE_5, title: 'Hòm Hoàng Gia Thần Bài', icon: '👑' }
];

// ============================================================================
// 2. MASTER DAILY QUEST POOL (KHO 42 NHIỆM VỤ HÀNG NGÀY - PHẦN THƯỞNG CÂN BẰNG)
// ============================================================================

export interface MasterDailyQuestTemplate {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  icon: string;
  targetCount: number;
}

export const MASTER_DAILY_QUESTS_POOL: readonly MasterDailyQuestTemplate[] = [
  // --- NHÓM CHIẾN THẮNG & SỐ VÁN ĐẤU ---
  {
    id: 'daily_play_three_matches',
    title: 'Khởi Động Sòng Bạc',
    description: 'Chơi hoàn thành 3 ván đấu ở bất kỳ chế độ nào.',
    rewardCoins: 5000,
    icon: '🎲',
    targetCount: 3
  },
  {
    id: 'daily_play_five_matches',
    title: 'Chiến Binh Bàn Đấu',
    description: 'Chơi hoàn thành 5 ván đấu bất kỳ trong ngày.',
    rewardCoins: 10000,
    icon: '🎮',
    targetCount: 5
  },
  {
    id: 'daily_win_two_matches',
    title: 'Tay Bài Bách Thắng',
    description: 'Giành chiến thắng về Nhất trong 2 ván đấu bất kỳ.',
    rewardCoins: 12000,
    icon: '🏆',
    targetCount: 2
  },
  {
    id: 'daily_win_three_matches',
    title: 'Chiến Thắng Tuyệt Đối',
    description: 'Giành chiến thắng về Nhất trong 3 ván đấu bất kỳ.',
    rewardCoins: 18000,
    icon: '👑',
    targetCount: 3
  },
  {
    id: 'daily_win_streak_2',
    title: 'Song Hỷ Lâm Môn',
    description: 'Đạt chuỗi thắng về Nhất 2 ván liên tiếp.',
    rewardCoins: 15000,
    icon: '🔥',
    targetCount: 2
  },
  {
    id: 'daily_win_streak_3',
    title: 'Tam Hỷ Thăng Hoa',
    description: 'Đạt chuỗi thắng về Nhất 3 ván liên tiếp không đứt đoạn.',
    rewardCoins: 25000,
    icon: '⚡',
    targetCount: 3
  },

  // --- NHÓM CHẶT HEO & CHẶT HÀNG ---
  {
    id: 'daily_chop_any_two',
    title: 'Đao Phủ Chém Heo',
    description: 'Chặt thành công ít nhất 1 lá Heo bất kỳ trong trận.',
    rewardCoins: 8000,
    icon: '🗡️',
    targetCount: 1
  },
  {
    id: 'daily_chop_red_two',
    title: 'Săn Heo Đỏ Hoàng Gia',
    description: 'Chặt ít nhất 1 lá Heo Đỏ (2 Cơ hoặc 2 Rô) trong ván.',
    rewardCoins: 12000,
    icon: '🐷',
    targetCount: 1
  },
  {
    id: 'daily_chop_black_two',
    title: 'Trảm Heo Đen Hắc Ám',
    description: 'Chặt ít nhất 1 lá Heo Đen (2 Bích hoặc 2 Chuồn) trong ván.',
    rewardCoins: 10000,
    icon: '🐗',
    targetCount: 1
  },
  {
    id: 'daily_chop_pair_two_or_goods',
    title: 'Chém Đôi Heo & Đè Hàng',
    description: 'Dùng Tứ Quý hoặc Đôi Thông chặt Đôi Heo / Hàng đối phương.',
    rewardCoins: 20000,
    icon: '💥',
    targetCount: 1
  },
  {
    id: 'daily_cascade_chop',
    title: 'Chặt Đè Chồng Liên Hoàn',
    description: 'Thực hiện 1 pha chặt đè chồng liên hoàn (Chặt chồng chuỗi).',
    rewardCoins: 25000,
    icon: '🌪️',
    targetCount: 1
  },

  // --- NHÓM BẮT CÓNG & PHẠT SÁT PHẠT ---
  {
    id: 'daily_inflict_cong',
    title: 'Thần Ma Nhốt Bài Bắt Cóng',
    description: 'Gây Cóng (bắt nhốt không cho đánh lá nào) ít nhất 1 đối thủ.',
    rewardCoins: 20000,
    icon: '🔒',
    targetCount: 1
  },
  {
    id: 'daily_pay_off_loan',
    title: 'Người Vay Có Trách Nhiệm',
    description: 'Trích tiền thắng trả nợ ngân hàng chủ sòng sau trận đấu.',
    rewardCoins: 8000,
    icon: '⚖️',
    targetCount: 1
  },

  // --- NHÓM TỔ HỢP ĐẶC BIỆT & SẢNH DÀI ---
  {
    id: 'daily_play_quad',
    title: 'Khai Quật Tứ Quý',
    description: 'Đánh ra ít nhất 1 tổ hợp Tứ Quý trong ván đấu.',
    rewardCoins: 15000,
    icon: '👑',
    targetCount: 1
  },
  {
    id: 'daily_play_three_pairs_seq',
    title: 'Tam Đôi Thông Suốt',
    description: 'Đánh ra ít nhất 1 tổ hợp 3 Đôi Thông liên tiếp.',
    rewardCoins: 15000,
    icon: '📜',
    targetCount: 1
  },
  {
    id: 'daily_play_four_pairs_seq',
    title: 'Tứ Đôi Thông Thần Thánh',
    description: 'Sở hữu và đánh ra 4 Đôi Thông bất kỳ trong ván.',
    rewardCoins: 30000,
    icon: '💎',
    targetCount: 1
  },
  {
    id: 'daily_long_straight',
    title: 'Bậc Thầy Sảnh Dài',
    description: 'Đánh ra tổ hợp Sảnh liên tiếp từ 5 lá bài trở lên.',
    rewardCoins: 10000,
    icon: '🐉',
    targetCount: 1
  },
  {
    id: 'daily_super_long_straight',
    title: 'Lục Long Ngũ Hành Sảnh 6 Lá',
    description: 'Đánh ra tổ hợp Sảnh dài từ 6 lá bài trở lên.',
    rewardCoins: 20000,
    icon: '🐲',
    targetCount: 1
  },
  {
    id: 'daily_play_three_straights',
    title: 'Tam Sảnh Tung Hoành',
    description: 'Đánh ra 3 bộ Sảnh bất kỳ trong ngày.',
    rewardCoins: 12000,
    icon: '🎋',
    targetCount: 3
  },
  {
    id: 'daily_play_three_pairs',
    title: 'Song Hành Ba Đôi',
    description: 'Đánh ra 3 bộ Đôi bài bất kỳ trong ngày.',
    rewardCoins: 8000,
    icon: '👥',
    targetCount: 3
  },
  {
    id: 'daily_play_two_triples',
    title: 'Song Sám Cô Uy Dũng',
    description: 'Đánh ra 2 tổ hợp Sám Cô (3 lá cùng số) trong ngày.',
    rewardCoins: 10000,
    icon: '✨',
    targetCount: 2
  },
  {
    id: 'daily_play_ten_singles',
    title: 'Xả Rác Điêu Luyện',
    description: 'Đánh ra 10 lá bài đơn lẻ (rác) trong các ván đấu.',
    rewardCoins: 8000,
    icon: '🃏',
    targetCount: 10
  },

  // --- NHÓM KẾT LIỄU NƯỚC ĐI VỀ NHẤT ---
  {
    id: 'daily_ending_three_spades',
    title: 'Tuyệt Kỹ Ba Bích',
    description: 'Về Nhất bằng lá bài đơn 3 Bích (3♠) ở lượt dứt điểm.',
    rewardCoins: 35000,
    icon: '♠️',
    targetCount: 1
  },
  {
    id: 'daily_ending_pair',
    title: 'Kết Thúc Bằng Đôi',
    description: 'Về Nhất ván đấu bằng một bộ Đôi bài ở lượt cuối.',
    rewardCoins: 10000,
    icon: '🤝',
    targetCount: 1
  },
  {
    id: 'daily_ending_straight',
    title: 'Sảnh Rồng Kết Liễu',
    description: 'Về Nhất ván đấu bằng một bộ Sảnh ở lượt cuối cùng.',
    rewardCoins: 12000,
    icon: '🌊',
    targetCount: 1
  },
  {
    id: 'daily_ending_triple',
    title: 'Sám Cô Dứt Điểm',
    description: 'Về Nhất ván đấu bằng một bộ Sám Cô (3 lá) ở lượt cuối.',
    rewardCoins: 15000,
    icon: '🔱',
    targetCount: 1
  },

  // --- NHÓM CHẾ ĐỘ & QUY MÔ BÀN ĐẤU ---
  {
    id: 'daily_count_cards_win',
    title: 'Vua Sát Phạt Đếm Lá',
    description: 'Về Nhất 1 ván trong chế độ Sát Phạt Đếm Lá.',
    rewardCoins: 10000,
    icon: '⚡',
    targetCount: 1
  },
  {
    id: 'daily_winner_takes_all_win',
    title: 'Nhất Ăn Tất Cả',
    description: 'Về Nhất 1 ván trong chế độ Nhất Ăn Tất.',
    rewardCoins: 10000,
    icon: '💰',
    targetCount: 1
  },
  {
    id: 'daily_traditional_win',
    title: 'Vinh Quang Truyền Thống',
    description: 'Về Nhất 1 ván trong chế độ Tiến Lên Truyền Thống.',
    rewardCoins: 10000,
    icon: '🏮',
    targetCount: 1
  },
  {
    id: 'daily_ranked_match',
    title: 'Thử Lửa Đấu Hạng',
    description: 'Thi đấu hoàn thành 1 trận Đấu Hạng Elo.',
    rewardCoins: 8000,
    icon: '🎖️',
    targetCount: 1
  },
  {
    id: 'daily_ranked_win',
    title: 'Khẳng Định Đẳng Cấp Elo',
    description: 'Giành chiến thắng về Nhất trong 1 trận Đấu Hạng.',
    rewardCoins: 15000,
    icon: '🏅',
    targetCount: 1
  },
  {
    id: 'daily_campaign_win',
    title: 'Chinh Phục Trùm Sòng',
    description: 'Giành chiến thắng về Nhất 1 ván trong Chiến Dịch Cốt Truyện.',
    rewardCoins: 12000,
    icon: '🗺️',
    targetCount: 1
  },
  {
    id: 'daily_solo_win',
    title: 'Độc Cô Cầu Bại Solo 1v1',
    description: 'Về Nhất 1 trận đấu bàn Solo 2 người chơi.',
    rewardCoins: 10000,
    icon: '⚔️',
    targetCount: 1
  },
  {
    id: 'daily_three_players_win',
    title: 'Tam Giác Tranh Hùng',
    description: 'Về Nhất 1 ván đấu bàn 3 người chơi.',
    rewardCoins: 10000,
    icon: '🔺',
    targetCount: 1
  },

  // --- NHÓM TIỀN THƯỞNG, CƯỢC CAO & VÒNG QUAY ---
  {
    id: 'daily_lucky_wheel_spin',
    title: 'Thử Vận Vòng Quay',
    description: 'Thực hiện quay Vòng Quay Thần Bài ít nhất 1 lần.',
    rewardCoins: 5000,
    icon: '🎡',
    targetCount: 1
  },
  {
    id: 'daily_lucky_wheel_spin_3',
    title: 'Con Nghiện Vòng Quay',
    description: 'Thực hiện quay Vòng Quay Thần Bài 3 lần trong ngày.',
    rewardCoins: 15000,
    icon: '🎪',
    targetCount: 3
  },
  {
    id: 'daily_earn_50k_coins',
    title: 'Thu Hoạch Xu Nhẹ Nhàng',
    description: 'Kiếm được từ 50,000 Xu tiền thắng cược trở lên.',
    rewardCoins: 15000,
    icon: '🪙',
    targetCount: 50000
  },
  {
    id: 'daily_earn_100k_coins',
    title: 'Thương Gia Sòng Bạc',
    description: 'Kiếm được từ 100,000 Xu tiền thắng cược trở lên.',
    rewardCoins: 25000,
    icon: '💵',
    targetCount: 100000
  },
  {
    id: 'daily_earn_250k_coins',
    title: 'Cự Phú Sát Phạt',
    description: 'Kiếm được từ 250,000 Xu tiền thắng cược trở lên trong ngày.',
    rewardCoins: 40000,
    icon: '🏦',
    targetCount: 250000
  },
  {
    id: 'daily_high_roller',
    title: 'Cược Lớn Sát Phạt',
    description: 'Về Nhất 1 ván với mức cược bàn từ 1,000 Xu trở lên.',
    rewardCoins: 20000,
    icon: '🎰',
    targetCount: 1
  },
  {
    id: 'daily_super_high_roller',
    title: 'Sòng Bạc Thượng Lưu 2,000 Xu',
    description: 'Về Nhất 1 ván với mức cược bàn từ 2,000 Xu trở lên.',
    rewardCoins: 30000,
    icon: '🏰',
    targetCount: 1
  }
];

// ============================================================================
// 3. THUẬT TOÁN BĂM NGÀY CHỌN ĐÚNG 5 NHIỆM VỤ DUY NHẤT MỖI NGÀY
// ============================================================================

export const DAILY_QUEST_COUNT = 5;

/**
 * Tạo chuỗi ngày YYYY-MM-DD theo giờ địa phương
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Thuật toán băm Murmur-inspired cho chuỗi ngày -> Seed nguyên dương
 */
export function hashDateStringToSeed(dateStr: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

/**
 * Bộ tạo số giả ngẫu nhiên có Seed (Mulberry32 PRNG)
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Chọn đúng 5 nhiệm vụ độc nhất từ Master Pool dựa trên ngày hiện tại
 */
export function generateDailyQuestsForDate(dateStr: string): Quest[] {
  const seed = hashDateStringToSeed(dateStr);
  const random = mulberry32(seed);

  // Tạo mảng copy các template
  const pool = [...MASTER_DAILY_QUESTS_POOL];

  // Thuật toán xáo trộn Fisher-Yates có Seed
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const temp = pool[i];
    pool[i] = pool[j];
    pool[j] = temp;
  }

  // Lấy đúng 5 nhiệm vụ đầu tiên sau khi xáo trộn
  const selectedTemplates = pool.slice(0, DAILY_QUEST_COUNT);

  return selectedTemplates.map(tmpl => ({
    id: tmpl.id,
    title: tmpl.title,
    description: tmpl.description,
    rewardCoins: tmpl.rewardCoins,
    icon: tmpl.icon,
    targetCount: tmpl.targetCount,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false
  }));
}

/**
 * Danh sách nhiệm vụ mặc định cho ngày đầu tiên
 */
export const INITIAL_DAILY_QUESTS: Quest[] = generateDailyQuestsForDate(getTodayDateString());

// ============================================================================
// 4. MASTER ACHIEVEMENTS (DANH SÁCH 35 THÀNH TỰU DANH HIỆU - PHẦN THƯỞNG CÂN BẰNG)
// ============================================================================

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  // --- PHÂN LOẠI CHOP (ĐAO PHỦ CHÉM HEO & HÀNG) ---
  {
    id: 'ach_chop_master_1',
    title: 'Thợ Săn Heo Tập Sự',
    description: 'Thực hiện chặt Heo thành công 10 lần.',
    rewardCoins: 20000,
    icon: '🐷',
    targetCount: 10,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'CHOP'
  },
  {
    id: 'ach_chop_master_2',
    title: 'Sát Thủ Heo Đỏ',
    description: 'Thực hiện chặt Heo thành công 50 lần.',
    rewardCoins: 80000,
    icon: '⚔️',
    targetCount: 50,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'CHOP'
  },
  {
    id: 'ach_chop_master_3',
    title: 'Huyền Thoại Đao Phủ',
    description: 'Thực hiện chặt Heo thành công 100 lần trong sự nghiệp.',
    rewardCoins: 200000,
    icon: '⚡',
    targetCount: 100,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'CHOP'
  },
  {
    id: 'ach_chop_goods_10',
    title: 'Bậc Thầy Bắt Hàng',
    description: 'Dùng Tứ Quý hoặc 4 Đôi Thông chặt Đôi Heo/đè Hàng 10 lần.',
    rewardCoins: 120000,
    icon: '💥',
    targetCount: 10,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'CHOP'
  },
  {
    id: 'ach_cascade_chop_10',
    title: 'Vua Đè Chồng Bàn Đấu',
    description: 'Thực hiện 10 pha chặt đè chồng liên hoàn trong sự nghiệp.',
    rewardCoins: 150000,
    icon: '🌪️',
    targetCount: 10,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'CHOP'
  },
  {
    id: 'ach_cong_master_10',
    title: 'Đại Ma Đầu Bắt Cóng',
    description: 'Gây Cóng (bắt nhốt bài không ra được lá nào) 10 lần.',
    rewardCoins: 150000,
    icon: '🔒',
    targetCount: 10,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'CHOP'
  },
  {
    id: 'ach_quad_master_10',
    title: 'Đại Sư Tứ Quý',
    description: 'Đánh ra 10 bộ Tứ Quý trong sự nghiệp.',
    rewardCoins: 100000,
    icon: '👑',
    targetCount: 10,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'CHOP'
  },
  {
    id: 'ach_three_pairs_seq_10',
    title: 'Siêu Cấp Tam Đôi Thông',
    description: 'Đánh ra 10 bộ 3 Đôi Thông liên tiếp.',
    rewardCoins: 80000,
    icon: '📜',
    targetCount: 10,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'CHOP'
  },

  // --- PHÂN LOẠI VICTORY (CHIẾN THẮNG & TRẬN ĐẤU) ---
  {
    id: 'ach_total_wins_10',
    title: 'Thập Trận Khởi Nghiệp',
    description: 'Đạt mốc 10 ván thắng về Nhất đầu tiên.',
    rewardCoins: 25000,
    icon: '🌱',
    targetCount: 10,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'VICTORY'
  },
  {
    id: 'ach_total_wins_20',
    title: 'Cao Thủ Sòng Bài',
    description: 'Đạt mốc 20 ván thắng về Nhất trong sự nghiệp.',
    rewardCoins: 50000,
    icon: '🎖️',
    targetCount: 20,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'VICTORY'
  },
  {
    id: 'ach_total_wins_50',
    title: 'Huyền Thoại 50 Trận Thắng',
    description: 'Đạt tổng cộng 50 ván thắng về Nhất.',
    rewardCoins: 150000,
    icon: '🏆',
    targetCount: 50,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'VICTORY'
  },
  {
    id: 'ach_total_wins_100',
    title: 'Thần Bài Vô Địch 100 Trận',
    description: 'Đạt mốc 100 ván thắng về Nhất trong lịch sử đấu.',
    rewardCoins: 400000,
    icon: '🌟',
    targetCount: 100,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'VICTORY'
  },
  {
    id: 'ach_win_streak_3',
    title: 'Khí Thế Bách Thắng',
    description: 'Đạt chuỗi 3 ván thắng về Nhất liên tiếp.',
    rewardCoins: 30000,
    icon: '🔥',
    targetCount: 3,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'VICTORY'
  },
  {
    id: 'ach_win_streak_5',
    title: 'Bất Khả Chiến Bại',
    description: 'Đạt chuỗi 5 ván thắng về Nhất liên tiếp.',
    rewardCoins: 80000,
    icon: '⚡',
    targetCount: 5,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'VICTORY'
  },
  {
    id: 'ach_win_streak_10',
    title: 'Độc Cô Thần Bài',
    description: 'Đạt chuỗi 10 ván thắng về Nhất liên tiếp không đứt đoạn.',
    rewardCoins: 300000,
    icon: '👑',
    targetCount: 10,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'VICTORY'
  },
  {
    id: 'ach_solo_master_20',
    title: 'Đệ Nhất Song Đấu 1v1',
    description: 'Giành chiến thắng 20 trận trong bàn Solo 2 người chơi.',
    rewardCoins: 100000,
    icon: '🤺',
    targetCount: 20,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'VICTORY'
  },

  // --- PHÂN LOẠI WEALTH (BẬC THANG TÀI SẢN TỪ TÂN THỦ 50K -> ĐẠI GIA) ---
  {
    id: 'ach_wealth_200k',
    title: 'Phú Hộ Khởi Nghiệp',
    description: 'Tích lũy số dư tài sản đạt mốc 200,000 Xu.',
    rewardCoins: 20000,
    icon: '🪙',
    targetCount: 200000,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'WEALTH'
  },
  {
    id: 'ach_wealth_500k',
    title: 'Đại Gia Sòng Bạc',
    description: 'Tích lũy số dư tài sản đạt mốc 500,000 Xu.',
    rewardCoins: 50000,
    icon: '💵',
    targetCount: 500000,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'WEALTH'
  },
  {
    id: 'ach_wealth_1m',
    title: 'Triệu Phú Sòng Bài',
    description: 'Tích lũy số dư tài sản đạt mốc 1,000,000 Xu.',
    rewardCoins: 120000,
    icon: '🏦',
    targetCount: 1000000,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'WEALTH'
  },
  {
    id: 'ach_millionaire',
    title: 'Đại Phú Hào Triệu Phú',
    description: 'Tích lũy số dư tài sản đạt mốc 5,000,000 Xu.',
    rewardCoins: 350000,
    icon: '💎',
    targetCount: 5000000,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'WEALTH'
  },
  {
    id: 'ach_billionaire',
    title: 'Tỷ Phú Sòng Bạc',
    description: 'Tích lũy số dư tài sản đạt mốc 10,000,000 Xu.',
    rewardCoins: 800000,
    icon: '🏛️',
    targetCount: 10000000,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'WEALTH'
  },
  {
    id: 'ach_wealth_20m',
    title: 'Đế Chế Tài Phiệt Hoàng Gia',
    description: 'Tích lũy số dư tài sản đạt mốc 20,000,000 Xu.',
    rewardCoins: 1500000,
    icon: '🪐',
    targetCount: 20000000,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'WEALTH'
  },
  {
    id: 'ach_high_roller_win_50',
    title: 'Bá Chủ Sát Phạt Cược Lớn',
    description: 'Thắng về Nhất 50 ván đấu với mức cược từ 1,000 Xu trở lên.',
    rewardCoins: 250000,
    icon: '🎰',
    targetCount: 50,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'WEALTH'
  },
  {
    id: 'ach_wheel_spins_20',
    title: 'Khách Quen Vòng Quay',
    description: 'Thực hiện quay Vòng Quay Thần Bài 20 lần.',
    rewardCoins: 60000,
    icon: '🎡',
    targetCount: 20,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'WEALTH'
  },
  {
    id: 'ach_debt_free',
    title: 'Người Lương Thiện Hoàn Lương',
    description: 'Trả dứt điểm toàn bộ số tiền nợ ngân hàng chủ sòng sau trận đấu.',
    rewardCoins: 50000,
    icon: '🕊️',
    targetCount: 1,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'WEALTH'
  },

  // --- PHÂN LOẠI SPECIAL (KỲ TÍCH & DANH HIỆU ĐỘC BẢN) ---
  {
    id: 'ach_instant_win_1',
    title: 'Vận Mệnh Tới Trắng',
    description: 'Đạt Tới Trắng (Sảnh Rồng, Tứ Quý 2, 5 Đôi Thông, v.v.) 1 lần.',
    rewardCoins: 200000,
    icon: '✨',
    targetCount: 1,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_instant_win_3',
    title: 'Thần May Mắn Chiếu Mệnh',
    description: 'Đạt Tới Trắng 3 lần trong sự nghiệp thi đấu.',
    rewardCoins: 500000,
    icon: '🌠',
    targetCount: 3,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_dragon_straight',
    title: 'Sảnh Rồng Hoàng Kim',
    description: 'Đạt Tới Trắng bằng tổ hợp Sảnh Rồng 12-13 lá liên tiếp.',
    rewardCoins: 300000,
    icon: '🐉',
    targetCount: 1,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_four_twos',
    title: 'Tứ Quý Heo Đại Náo',
    description: 'Đạt Tới Trắng sở hữu trọn vẹn 4 con Heo (Tứ Quý 2).',
    rewardCoins: 300000,
    icon: '🐗',
    targetCount: 1,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_five_pairs_seq',
    title: 'Ngũ Đôi Thông Tuyệt Kỹ',
    description: 'Đạt Tới Trắng bằng 5 Đôi Thông liên tiếp.',
    rewardCoins: 300000,
    icon: '🏮',
    targetCount: 1,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_same_color',
    title: 'Đồng Màu Tuyệt Sắc',
    description: 'Đạt Tới Trắng bằng 13 lá bài cùng màu đồng nhất (Đỏ hoặc Đen).',
    rewardCoins: 300000,
    icon: '🎨',
    targetCount: 1,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_ending_three_spades_3',
    title: 'Vua Ba Bích Sát Phạt',
    description: 'Thực hiện về Nhất bằng quân 3 Bích (3♠) dứt điểm 3 lần.',
    rewardCoins: 100000,
    icon: '♠️',
    targetCount: 3,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_ending_three_spades_10',
    title: 'Thần Bài Ba Bích Huyền Thoại',
    description: 'Thực hiện về Nhất bằng quân 3 Bích (3♠) dứt điểm 10 lần.',
    rewardCoins: 350000,
    icon: '🗡️',
    targetCount: 10,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_campaign_all_clear',
    title: 'Thần Bài Toàn Năng 5 Chương',
    description: 'Đánh bại toàn bộ Trùm Sòng và hoàn thành 5 Chương Chiến Dịch.',
    rewardCoins: 500000,
    icon: '🌟',
    targetCount: 5,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_ranked_master_1400',
    title: 'Cao Thủ Danh Vọng Elo 1400',
    description: 'Đạt mốc điểm Elo Đấu Hạng từ 1,400 điểm trở lên.',
    rewardCoins: 150000,
    icon: '🛡️',
    targetCount: 1400,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_ranked_grandmaster_1600',
    title: 'Đại Kiện Tướng Sòng Bài Elo 1600',
    description: 'Đạt mốc điểm Elo Đấu Hạng từ 1,600 điểm trở lên.',
    rewardCoins: 350000,
    icon: '🪐',
    targetCount: 1600,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_ranked_legend_1800',
    title: 'Huyền Thoại Bất Bại Elo 1800',
    description: 'Đạt mốc điểm Elo Đấu Hạng từ 1,800 điểm trở lên.',
    rewardCoins: 700000,
    icon: '🏆',
    targetCount: 1800,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  },
  {
    id: 'ach_ranked_god_2000',
    title: 'Thần Bài Vô Cực Elo 2000',
    description: 'Đạt mốc điểm Elo đỉnh cao từ 2,000 điểm trở lên.',
    rewardCoins: 1500000,
    icon: '🌌',
    targetCount: 2000,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'SPECIAL'
  }
];
