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

export const INITIAL_DAILY_QUESTS: Quest[] = [
  {
    id: 'daily_chop_red_two',
    title: 'Săn Heo Đỏ',
    description: 'Thực hiện chặt ít nhất 1 lá Heo Đỏ (2 Cơ hoặc 2 Rô) trong ván.',
    rewardCoins: 5000,
    icon: '🗡️',
    targetCount: 1,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false
  },
  {
    id: 'daily_long_straight',
    title: 'Bậc Thầy Sảnh Dài',
    description: 'Đánh ra ít nhất 1 tổ hợp Sảnh có độ dài từ 5 lá bài trở lên.',
    rewardCoins: 8000,
    icon: '🐉',
    targetCount: 1,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false
  },
  {
    id: 'daily_win_three_matches',
    title: 'Chiến Thắng Tuyệt Đối',
    description: 'Giành chiến thắng về Nhất trong 3 ván đấu ở chế độ bất kỳ.',
    rewardCoins: 12000,
    icon: '🏆',
    targetCount: 3,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false
  },
  {
    id: 'daily_underground_master',
    title: 'Bá Chủ Thế Giới Ngầm',
    description: 'Về Nhất 1 ván tại Sòng Bạc Thế Giới Ngầm.',
    rewardCoins: 15000,
    icon: '🎰',
    targetCount: 1,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false
  }
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
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
    rewardCoins: 100000,
    icon: '⚔️',
    targetCount: 50,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'CHOP'
  },
  {
    id: 'ach_win_streak_5',
    title: 'Bất Khả Chiến Bại',
    description: 'Đạt chuỗi 5 ván thắng về Nhất liên tiếp.',
    rewardCoins: 50000,
    icon: '🔥',
    targetCount: 5,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'VICTORY'
  },
  {
    id: 'ach_total_wins_50',
    title: 'Huyền Thoại 50 Trận Thắng',
    description: 'Đạt tổng cộng 50 ván thắng về Nhất trong sự nghiệp.',
    rewardCoins: 150000,
    icon: '👑',
    targetCount: 50,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'VICTORY'
  },
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
    id: 'ach_millionaire',
    title: 'Đại Phú Hào Triệu Xu',
    description: 'Tích lũy số dư tài sản đạt mốc 1,000,000 xu.',
    rewardCoins: 250000,
    icon: '💎',
    targetCount: 1000000,
    currentCount: 0,
    isCompleted: false,
    isClaimed: false,
    category: 'WEALTH'
  }
];
