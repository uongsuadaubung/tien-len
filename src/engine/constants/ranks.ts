/**
 * ============================================================================
 * SINGLE SOURCE OF TRUTH (SSOT): HỆ THỐNG 5 BẬC RANK THỐNG NHẤT
 * ============================================================================
 * Mọi thông tin về Bậc Rank (Tên, Huy hiệu, Elo Min/Max, Quota bot, Ngân sách,
 * Biệt danh) đều được định nghĩa DUY NHẤT tại đây.
 *
 * Mọi thành phần khác (Elo, Ecosystem, Bot Generator, Bot Factory, UI Filters,
 * Campaign, Benchmark) đều tự động phái sinh từ tệp này mà không cần hardcode.
 */

export interface RankTierInfo {
  readonly tierNum: number;          // 1..5
  readonly id: string;               // 'BEGINNER', 'NOVICE', 'SKILLED', 'MASTER', 'GRANDMASTER'
  readonly name: string;             // 'Tân Thủ', 'Tập Sự', 'Lành Nghề', 'Cao Thủ', 'Thần Bài'
  readonly label: string;            // Alias for name ('Tân Thủ', ...)
  readonly tier: string;             // 'Tier 1: Tân Thủ', ...
  readonly badge: string;            // '⚙️', '🥉', '🥈', '🥇', '👑'
  readonly rankBadge: string;        // Alias for badge
  readonly minElo: number;           // 0, 900, 1300, 1700, 2100
  readonly maxElo: number;           // 899, 1299, 1699, 2099, 9999
  readonly color: string;            // Mã màu HEX
  readonly description: string;
  readonly targetBotQuota: number;   // Định mức phân bổ trong 200 bot: 50, 60, 46, 30, 14
  readonly bankroll: { readonly min: number; readonly max: number };
  readonly nicknames: readonly string[];
}

// Alias tương thích ngược
export type EloTierInfo = RankTierInfo;

export const RANK_TIERS: readonly RankTierInfo[] = Object.freeze([
  Object.freeze({
    tierNum: 1,
    id: 'BEGINNER',
    name: 'Tân Thủ',
    label: 'Tân Thủ',
    tier: 'Tier 1: Tân Thủ',
    badge: '⚙️',
    rankBadge: '⚙️',
    minElo: 0,
    maxElo: 899,
    color: '#71717A',
    description: 'Bậc khởi đầu cho người mới, làm quen thao tác và luật bài cơ bản, biết chống đền bài.',
    targetBotQuota: 50,
    bankroll: Object.freeze({ min: 5000, max: 20000 }),
    nicknames: Object.freeze(['Rookie', 'Newbie', 'Starter', 'Cadet', 'Trainee', 'Apprentice'])
  }),
  Object.freeze({
    tierNum: 2,
    id: 'NOVICE',
    name: 'Tập Sự',
    label: 'Tập Sự',
    tier: 'Tier 2: Tập Sự',
    badge: '🥉',
    rankBadge: '🥉',
    minElo: 900,
    maxElo: 1299,
    color: '#CD7F32',
    description: 'Nắm vững luật cơ bản, bắt đầu biết gom bài sảnh/đôi và tẩu rác khôn ngoan.',
    targetBotQuota: 60,
    bankroll: Object.freeze({ min: 15000, max: 60000 }),
    nicknames: Object.freeze(['Novice', 'Striker', 'Wildcard', 'Blitzer', 'Gambit', 'Rebel'])
  }),
  Object.freeze({
    tierNum: 3,
    id: 'SKILLED',
    name: 'Lành Nghề',
    label: 'Lành Nghề',
    tier: 'Tier 3: Lành Nghề',
    badge: '🥈',
    rankBadge: '🥈',
    minElo: 1300,
    maxElo: 1699,
    color: '#C0C0C0',
    description: 'Phong cách già dơ, biết đếm Heo, gài bẫy Át mồi và điều tiết nhịp độ bàn chơi.',
    targetBotQuota: 46,
    bankroll: Object.freeze({ min: 50000, max: 200000 }),
    nicknames: Object.freeze(['Amateur', 'Fighter', 'Brawler', 'Tactician', 'Scout', 'Duelist'])
  }),
  Object.freeze({
    tierNum: 4,
    id: 'MASTER',
    name: 'Cao Thủ',
    label: 'Cao Thủ',
    tier: 'Tier 4: Cao Thủ',
    badge: '🥇',
    rankBadge: '🥇',
    minElo: 1700,
    maxElo: 2099,
    color: '#FFD700',
    description: 'Đẳng cấp bán chuyên, nhớ bài sâu, ém Heo rình chặt và dứt điểm cờ tàn sắc bén.',
    targetBotQuota: 30,
    bankroll: Object.freeze({ min: 200000, max: 1000000 }),
    nicknames: Object.freeze(['Veteran', 'Pro Ace', 'Strategist', 'Sniper', 'Sentinel', 'Tracker'])
  }),
  Object.freeze({
    tierNum: 5,
    id: 'GRANDMASTER',
    name: 'Thần Bài',
    label: 'Thần Bài',
    tier: 'Tier 5: Thần Bài',
    badge: '👑',
    rankBadge: '👑',
    minElo: 2100,
    maxElo: 9999,
    color: '#00FFFF',
    description: 'Trí tuệ tối thượng, kích hoạt Minimax Endgame Solver, Bayesian Inference và MCTS.',
    targetBotQuota: 14,
    bankroll: Object.freeze({ min: 1000000, max: 10000000 }),
    nicknames: Object.freeze(['Grandmaster', 'Bayesian Mind', 'Oracle', 'Overlord', 'Alpha Mind', 'Singularity'])
  })
]);

/**
 * Lấy thông tin Bậc Rank theo điểm Elo (Tìm kiếm ngược từ bậc cao nhất xuống)
 */
export function getRankTierByElo(elo: number): RankTierInfo {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (elo >= RANK_TIERS[i].minElo) {
      return RANK_TIERS[i];
    }
  }
  return RANK_TIERS[0];
}

/**
 * Hàm tương thích ngược alias cho getRankTierByElo
 */
export function getTierFromElo(elo: number): RankTierInfo {
  return getRankTierByElo(elo);
}

/**
 * Lấy thông tin Bậc Rank theo số thứ tự bậc (tierNum: 1..5)
 */
export function getTierInfoByTierNum(tierNum: number): RankTierInfo {
  return RANK_TIERS.find(t => t.tierNum === tierNum) ?? RANK_TIERS[0];
}

/**
 * Lấy nhãn hiển thị cho bộ lọc Bậc Rank trên giao diện
 */
export function getTierFilterLabel(tier: number | 'ALL'): string {
  if (tier === 'ALL') return 'Tất Cả';
  const info = getTierInfoByTierNum(tier);
  return `${info.rankBadge} ${info.label}`;
}
