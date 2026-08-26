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
  rewardTitle?: string;
  bots: [BotConfig, BotConfig, BotConfig];
  specialRuleDescription?: string;
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
    bots: [BOT_PERSONAS.BOT_ELO_850, BOT_PERSONAS.BOT_ELO_900, BOT_PERSONAS.BOT_ELO_950],
    specialRuleDescription: 'Thắng tích lũy 2 ván để mở khóa ải tiếp theo.'
  },
  {
    id: 2,
    name: 'Chương 2',
    subtitle: 'Khói Lửa Bến Xe',
    venueName: 'Bàn Nhậu Bến Xe Miền Tây',
    icon: '🍻',
    backgroundTheme: 'from-orange-950/80 to-red-950/90',
    description: 'Các tay chơi phong trào thích chặt chém liều lĩnh và xả Heo tốc chiến tốc thắng.',
    requiredWins: 3,
    betAmount: 500,
    rewardCoins: 15000,
    rewardTitle: 'Anh Hùng Bến Xe',
    bots: [BOT_PERSONAS.BOT_ELO_1150, BOT_PERSONAS.BOT_ELO_1200, BOT_PERSONAS.BOT_ELO_1250],
    specialRuleDescription: 'Thắng 3 ván trước các tay chơi liều lĩnh bậc nhất.'
  },
  {
    id: 3,
    name: 'Chương 3',
    subtitle: 'Chiếu Bạc Lão Luyện',
    venueName: 'Quán Trà Lão Tướng',
    icon: '🍵',
    backgroundTheme: 'from-yellow-950/80 to-stone-900/90',
    description: 'Những cao thủ già dơ biết ém hàng quý, rình rập săn Heo Đỏ và nhớ bài chuẩn xác.',
    requiredWins: 3,
    betAmount: 1500,
    rewardCoins: 40000,
    rewardTitle: 'Bậc Thầy Nhớ Bài',
    bots: [BOT_PERSONAS.BOT_ELO_1450, BOT_PERSONAS.BOT_ELO_1550, BOT_PERSONAS.BOT_ELO_1600],
    specialRuleDescription: 'Thắng 3 ván trước các cao thủ già dơ chuyên gài bẫy.'
  },
  {
    id: 4,
    name: 'Chương 4',
    subtitle: 'Đêm Sài Thành Rực Lửa',
    venueName: 'Câu Lạc Bộ Sài Gòn',
    icon: '💎',
    backgroundTheme: 'from-purple-950/80 to-slate-950/90',
    description: 'Sân chơi của các đại gia và cao thủ bán chuyên. Bắt đầu áp dụng chiến thuật ép nhịp cờ tàn.',
    requiredWins: 3,
    betAmount: 5000,
    rewardCoins: 100000,
    rewardTitle: 'Cao Thủ Sài Thành',
    bots: [BOT_PERSONAS.BOT_ELO_1750, BOT_PERSONAS.BOT_ELO_1850, BOT_PERSONAS.BOT_ELO_1950],
    specialRuleDescription: 'Thắng 3 ván trước các cao thủ kiểm soát nhịp độ bàn chơi.'
  },
  {
    id: 5,
    name: 'Chương 5',
    subtitle: 'Đỉnh Cao Thần Bài',
    venueName: 'Sòng Bạc Ngầm Tối Thượng',
    icon: '👑',
    backgroundTheme: 'from-red-950/90 via-black to-amber-950/90',
    description: 'Trận chiến đỉnh cao đối đầu các Siêu Trí Tuệ Thần Bài: Nova (Apex Legend) và Alpha-TL (Supreme AI).',
    requiredWins: 4,
    betAmount: 20000,
    rewardCoins: 300000,
    rewardTitle: 'Thần Bài Huyền Thoại',
    bots: [BOT_PERSONAS.BOT_ELO_2150, BOT_PERSONAS.BOT_ELO_2300, BOT_PERSONAS.BOT_ELO_2500],
    specialRuleDescription: 'Đánh bại 3 Trùm Thần Bài với MCTS Rollout và Endgame Solver để trở thành Huyền Thoại!'
  }
];
