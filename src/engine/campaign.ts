import { BOT_PERSONAS } from '../ai/bot-factory';
import { BotConfig } from '../ai/types';

export interface CampaignChapter {
  id: number;
  name: string;
  subtitle: string;
  venueName: string;
  icon: string;
  backgroundTheme: string;
  description: string;
  requiredWins: number;
  betAmount: number;
  rewardCoins: number;
  rewardTitle: string | null;
  bots: [BotConfig, BotConfig, BotConfig];
  specialRuleDescription: string | null;
}

export const CAMPAIGN_CHAPTERS: CampaignChapter[] = [
  {
    id: 1,
    name: 'Chương 1',
    subtitle: 'Nhập Môn Xóm Nhỏ',
    venueName: 'Sới Bạc Cây Đa',
    icon: '🏡',
    backgroundTheme: 'from-amber-900/60 to-emerald-950/80',
    description: 'Bắt đầu cuộc hành trình từ sới bạc bình dân trong xóm. Đối đầu với các tay chơi tập sự.',
    requiredWins: 2,
    betAmount: 200,
    rewardCoins: 5000,
    rewardTitle: 'Tân Thủ Xuất Sắc',
    bots: [
      { ...BOT_PERSONAS.BOT_ELO_700, id: 'BOT_ELO_700', name: 'Tí Chuột', avatar: '🐭', elo: 700, tier: 'Tier 1: Tân Thủ' },
      { ...BOT_PERSONAS.BOT_ELO_750, id: 'BOT_ELO_750', name: 'Tèo Bờ Rào', avatar: '👦', elo: 750, tier: 'Tier 1: Tân Thủ' },
      { ...BOT_PERSONAS.BOT_ELO_850, id: 'BOT_ELO_850', name: 'Bác Ba', avatar: '👴', elo: 850, tier: 'Tier 1: Tân Thủ' }
    ],
    specialRuleDescription: 'Thắng tích lũy 2 ván để mở khóa chương tiếp theo.'
  },
  {
    id: 2,
    name: 'Chương 2',
    subtitle: 'Khói Lửa Bến Xe',
    venueName: 'Quán Nhậu Bến Xe Miền Tây',
    icon: '🍻',
    backgroundTheme: 'from-orange-950/80 to-red-950/90',
    description: 'Các tay chơi phong trào thích chặt chém liều lĩnh và xả Heo tốc chiến tốc thắng.',
    requiredWins: 3,
    betAmount: 500,
    rewardCoins: 15000,
    rewardTitle: 'Anh Hùng Bến Xe',
    bots: [
      { ...BOT_PERSONAS.BOT_ELO_950, id: 'BOT_ELO_950', name: 'Bảy Xe Lôi', avatar: '🛺', elo: 950, tier: 'Tier 2: Tập Sự' },
      { ...BOT_PERSONAS.BOT_ELO_1000, id: 'BOT_ELO_1000', name: 'Năm Xích Lô', avatar: '🚴', elo: 1000, tier: 'Tier 2: Tập Sự' },
      { ...BOT_PERSONAS.BOT_ELO_1150, id: 'BOT_ELO_1150', name: 'Ba Gác', avatar: '🛵', elo: 1150, tier: 'Tier 2: Tập Sự' }
    ],
    specialRuleDescription: 'Thắng 3 ván trước các tay chơi liều lĩnh bậc nhất bến xe.'
  },
  {
    id: 3,
    name: 'Chương 3',
    subtitle: 'Bàn Cờ Quán Trà',
    venueName: 'Quán Trà Lão Tướng',
    icon: '🍵',
    backgroundTheme: 'from-yellow-950/80 to-stone-900/90',
    description: 'Các tay chơi phong trào sừng sỏ bắt đầu biết gom bài, ém bộ và phối hợp nhịp nhàng.',
    requiredWins: 3,
    betAmount: 1500,
    rewardCoins: 35000,
    rewardTitle: 'Kỳ Thủ Quán Trà',
    bots: [
      { ...BOT_PERSONAS.BOT_ELO_1250, id: 'BOT_ELO_1250', name: 'Chú Tư Cờ', avatar: '🍵', elo: 1250, tier: 'Tier 3: Phong Trào' },
      { ...BOT_PERSONAS.BOT_ELO_1300, id: 'BOT_ELO_1300', name: 'Rex Bụi Đời', avatar: '🤠', elo: 1300, tier: 'Tier 3: Phong Trào' },
      { ...BOT_PERSONAS.BOT_ELO_1350, id: 'BOT_ELO_1350', name: 'Zane Sát Thủ', avatar: '🎯', elo: 1350, tier: 'Tier 3: Phong Trào' }
    ],
    specialRuleDescription: 'Thắng 3 ván trước các cao thủ phong trào khôn ngoan.'
  },
  {
    id: 4,
    name: 'Chương 4',
    subtitle: 'Chiếu Bạc Lão Luyện',
    venueName: 'Chiếu Bạc Kỳ Hữu',
    icon: '🧮',
    backgroundTheme: 'from-stone-950/90 to-amber-950/90',
    description: 'Những cao thủ già dơ biết ém hàng quý, rình rập săn Heo Đỏ và nhớ bài chuẩn xác.',
    requiredWins: 3,
    betAmount: 4000,
    rewardCoins: 80000,
    rewardTitle: 'Bậc Thầy Nhớ Bài',
    bots: [
      { ...BOT_PERSONAS.BOT_ELO_1500, id: 'BOT_ELO_1500', name: 'Cụ Tám', avatar: '🧘', elo: 1500, tier: 'Tier 4: Lão Luyện' },
      { ...BOT_PERSONAS.BOT_ELO_1550, id: 'BOT_ELO_1550', name: 'Elena', avatar: '👩‍💼', elo: 1550, tier: 'Tier 4: Lão Luyện' },
      { ...BOT_PERSONAS.BOT_ELO_1600, id: 'BOT_ELO_1600', name: 'Bác Sáu Toán Học', avatar: '🧮', elo: 1600, tier: 'Tier 4: Lão Luyện' }
    ],
    specialRuleDescription: 'Thắng 3 ván trước các cao thủ chuyên đếm lá và bẫy Heo.'
  },
  {
    id: 5,
    name: 'Chương 5',
    subtitle: 'Đêm Sài Thành Rực Lửa',
    venueName: 'Câu Lạc Bộ Sài Gòn',
    icon: '💎',
    backgroundTheme: 'from-purple-950/80 to-slate-950/90',
    description: 'Sân chơi của các đại gia và cao thủ bán chuyên. Bắt đầu áp dụng chiến thuật ép nhịp cờ tàn.',
    requiredWins: 3,
    betAmount: 10000,
    rewardCoins: 180000,
    rewardTitle: 'Tinh Anh Sài Thành',
    bots: [
      { ...BOT_PERSONAS.BOT_ELO_1750, id: 'BOT_ELO_1750', name: 'Thiếu Gia Ken', avatar: '💎', elo: 1750, tier: 'Tier 5: Tinh Anh' },
      { ...BOT_PERSONAS.BOT_ELO_1800, id: 'BOT_ELO_1800', name: 'Sophia', avatar: '👸', elo: 1800, tier: 'Tier 5: Tinh Anh' },
      { ...BOT_PERSONAS.BOT_ELO_1850, id: 'BOT_ELO_1850', name: 'Đại Gia Long', avatar: '🎩', elo: 1850, tier: 'Tier 5: Tinh Anh' }
    ],
    specialRuleDescription: 'Thắng 3 ván trước các cao thủ kiểm soát nhịp độ bàn chơi.'
  },
  {
    id: 6,
    name: 'Chương 6',
    subtitle: 'Sòng Bạc Du Thuyền',
    venueName: 'Du Thuyền 5 Sao Sông Sài Gòn',
    icon: '🚢',
    backgroundTheme: 'from-blue-950/90 to-indigo-950/90',
    description: 'Nơi quy tụ các tay chơi thượng lưu quốc tế với khả năng đọc bài đối thủ và bẻ bài hiểm hóc.',
    requiredWins: 3,
    betAmount: 25000,
    rewardCoins: 400000,
    rewardTitle: 'Cao Thủ Du Thuyền',
    bots: [
      { ...BOT_PERSONAS.BOT_ELO_1950, id: 'BOT_ELO_1950', name: 'Madam Ruby', avatar: '💃', elo: 1950, tier: 'Tier 6: Cao Thủ' },
      { ...BOT_PERSONAS.BOT_ELO_2000, id: 'BOT_ELO_2000', name: 'Raven Ảo Ảnh', avatar: '🦅', elo: 2000, tier: 'Tier 6: Cao Thủ' },
      { ...BOT_PERSONAS.BOT_ELO_2050, id: 'BOT_ELO_2050', name: 'Ghost Bóng Đêm', avatar: '👻', elo: 2050, tier: 'Tier 6: Cao Thủ' }
    ],
    specialRuleDescription: 'Thắng 3 ván trước các bậc thầy bắt bài và bọc lót Heo.'
  },
  {
    id: 7,
    name: 'Chương 7',
    subtitle: 'Đấu Trường Hoàng Gia',
    venueName: 'Sòng Bạc Quý Tộc Monaco',
    icon: '👑',
    backgroundTheme: 'from-amber-950/90 via-red-950/90 to-black',
    description: 'Sân khấu đỉnh cao của các Đại Cao Thủ với kỹ năng gài bẫy và bẻ sảnh đỉnh tiêm.',
    requiredWins: 4,
    betAmount: 60000,
    rewardCoins: 800000,
    rewardTitle: 'Đại Cao Thủ Hoàng Gia',
    bots: [
      { ...BOT_PERSONAS.BOT_ELO_2300, id: 'BOT_ELO_2300', name: 'Phantom Apex', avatar: '🎭', elo: 2300, tier: 'Tier 7: Đại Cao Thủ' },
      { ...BOT_PERSONAS.BOT_ELO_2400, id: 'BOT_ELO_2400', name: 'Nova Legend', avatar: '⚡', elo: 2400, tier: 'Tier 7: Đại Cao Thủ' },
      { ...BOT_PERSONAS.BOT_ELO_2500, id: 'BOT_ELO_2500', name: 'Alpha-TL Master', avatar: '👑', elo: 2500, tier: 'Tier 7: Đại Cao Thủ' }
    ],
    specialRuleDescription: 'Đánh bại 3 Đại Cao Thủ để tiến vào Hội Kín Thần Bài.'
  },
  {
    id: 8,
    name: 'Chương 8',
    subtitle: 'Cổng Trời Thần Bài',
    venueName: 'Hội Kín Vô Cực',
    icon: '🌌',
    backgroundTheme: 'from-purple-950/90 via-violet-950/90 to-black',
    description: 'Các Thần Bài huyền thoại được trang bị Minimax Alpha-Beta và MCTS Bayesian siêu tốc.',
    requiredWins: 4,
    betAmount: 150000,
    rewardCoins: 1500000,
    rewardTitle: 'Thần Bài Vô Cực',
    bots: [
      { ...BOT_PERSONAS.BOT_ELO_2750, id: 'BOT_ELO_2750', name: 'Oracle Tiên Tri', avatar: '🔮', elo: 2750, tier: 'Tier 8: Thần Bài' },
      { ...BOT_PERSONAS.BOT_ELO_2750, id: 'BOT_ELO_2750', name: 'Chronos Bất Tử', avatar: '⏳', elo: 2750, tier: 'Tier 8: Thần Bài' },
      { ...BOT_PERSONAS.BOT_ELO_2750, id: 'BOT_ELO_2750', name: 'Aegis Hộ Pháp', avatar: '🛡️', elo: 2750, tier: 'Tier 8: Thần Bài' }
    ],
    specialRuleDescription: 'Vượt qua 4 ván đấu với các Thần Bài tính toán cờ tàn hoàn hảo.'
  },
  {
    id: 9,
    name: 'Chương 9',
    subtitle: 'Ngai Vàng Siêu Trí Tuệ',
    venueName: 'Đền Thờ Trí Tuệ Tối Thượng',
    icon: '⚡',
    backgroundTheme: 'from-amber-950 via-rose-950 to-black',
    description: 'Trận chiến Chung Kết Vĩ Đại: Đối đầu trực diện Tam Đại Siêu Trí Tuệ Boss với độ sâu nhìn trước 12 plies và Cân bằng Nash hoàn hảo.',
    requiredWins: 5,
    betAmount: 500000,
    rewardCoins: 3000000,
    rewardTitle: 'Bá Chủ Thần Bài Tối Thượng',
    bots: [
      { ...BOT_PERSONAS.BOT_ELO_3200, id: 'BOT_ELO_3200', name: 'Alpha Mind', avatar: '🧠', elo: 3200, tier: 'Tier 9: Siêu Trí Tuệ' },
      { ...BOT_PERSONAS.BOT_ELO_3200, id: 'BOT_ELO_3200', name: 'Zero Defeat', avatar: '⚔️', elo: 3200, tier: 'Tier 9: Siêu Trí Tuệ' },
      { ...BOT_PERSONAS.BOT_ELO_3200, id: 'BOT_ELO_3200', name: 'Mythic Overlord', avatar: '👑', elo: 3200, tier: 'Tier 9: Siêu Trí Tuệ' }
    ],
    specialRuleDescription: 'Đánh bại Tam Đại Boss Superhuman AI để bước lên Ngai Vàng Bá Chủ Tiến Lên!'
  }
];
