/**
 * AI MODE POLICY STRATEGY PATTERN (TIẾN LÊN MIỀN NAM)
 * Đóng gói các trường phái chiến thuật đặc thù theo từng Chế Độ Chơi:
 * - Đếm Lá / Sòng Bạc Ngầm: Tối đa hóa tốc độ xả bài (ưu tiên Sảnh dài, Bộ nhiều lá trước để giảm số lá tồn, tránh bị Cóng).
 * - Truyền Thống / Đấu Hạng Elo: Tẩu rác nhỏ (3, 4, 5...) trước, giữ bộ to và Heo bọc lót đường dài.
 * - Nhất Ăn Tất: "Được ăn cả, ngã về không", đánh bạo lực cướp lượt dứt điểm về Nhất.
 * - Chiến Dịch: Tự thích ứng theo tính cách từng Boss ải.
 */

import { Card, Combination, PlayedMove } from '../engine/types';
import { isTwo } from '../engine/card';
import { ValidMoveInfo } from './decision-maker';

export interface LeadPolicy {
  /** Ưu tiên xả Sảnh dài (4-6 lá) và Bộ nhiều lá trước để xả tối đa số lá bài tồn (Chế độ Đếm Lá) */
  preferLongestComboFirst: boolean;
  /** Tẩu rác nhỏ (3, 4, 5...) trước để thăm dò và giữ bộ to bọc lót (Chế độ Truyền Thống / Elo) */
  dumpSmallTrashFirst: boolean;
  /** Đánh bạo lực tranh Nhất, xả combo mạnh dứt điểm (Chế độ Nhất Ăn Tất) */
  aggressiveFinisherPush: boolean;
}

export interface AIModePolicyStrategy {
  readonly modeId: string;
  readonly modeName: string;
  readonly description: string;

  /** Lấy chính sách ra bài khi Cầm Cái / Đi đầu vòng */
  getLeadPolicy(): LeadPolicy;

  /** Lấy hệ số điều chỉnh điểm khi Đỡ Bài trong vòng đấu */
  getRespondingScoreModifier(move: ValidMoveInfo, handSize: number, targetMove: PlayedMove | null): number;
}

/**
 * 1. Chế Độ Đếm Lá & Sòng Bạc Ngầm (Count Cards & Underground Policy)
 * Mục tiêu: Tốc độ xả bài tối đa (Card Dumping Velocity) để giảm thiểu tiền phạt khi có người về Nhất.
 */
export class CountCardsAIModePolicy implements AIModePolicyStrategy {
  public readonly modeId = 'COUNT_CARDS';
  public readonly modeName = 'Đếm Lá Sát Phạt & Sòng Bạc Ngầm';
  public readonly description = 'Ưu tiên xả Sảnh dài và Bộ nhiều lá trước để giảm nhanh số lá tồn, không om Heo quá muộn.';

  public getLeadPolicy(): LeadPolicy {
    return {
      preferLongestComboFirst: true,
      dumpSmallTrashFirst: false,
      aggressiveFinisherPush: false
    };
  }

  public getRespondingScoreModifier(move: ValidMoveInfo, handSize: number, targetMove: PlayedMove | null): number {
    let bonus = 0;

    // Khuyến khích đè bài khi xả được nhiều lá (Sảnh dài >= 4 lá hoặc Sám cô / Đôi)
    if (move.cards.length >= 4) {
      bonus += 120; // Thưởng cực lớn khi xả được 4-6 lá một lúc
    } else if (move.cards.length >= 2) {
      bonus += 50;
    }

    // Khi bài đối thủ đã ít (còn <= 5 lá): Không om Heo/Hàng quá lâu, sẵn sàng xả để tránh thối
    const containsTwo = move.cards.some(isTwo);
    if (containsTwo && handSize <= 6) {
      bonus += 80;
    }

    return bonus;
  }
}

/**
 * 2. Chế Độ Truyền Thống & Đấu Hạng Elo (Traditional & Ranked Policy)
 * Mục tiêu: Kiểm soát nhịp độ (Tempo Control), tối ưu hóa thứ hạng 4 bậc Nhất - Nhì - Ba - Bét.
 */
export class TraditionalAIModePolicy implements AIModePolicyStrategy {
  public readonly modeId = 'TRADITIONAL';
  public readonly modeName = 'Truyền Thống & Đấu Hạng Elo';
  public readonly description = 'Tẩu rác nhỏ trước, giữ bộ to và Heo bọc lót để kiểm soát nhịp độ đường dài đến người áp chót.';

  public getLeadPolicy(): LeadPolicy {
    return {
      preferLongestComboFirst: false,
      dumpSmallTrashFirst: true,
      aggressiveFinisherPush: false
    };
  }

  public getRespondingScoreModifier(move: ValidMoveInfo, handSize: number, targetMove: PlayedMove | null): number {
    let modifier = 0;

    // Trong truyền thống: Phạt nặng hành vi xả Heo đè rác nhỏ ở đầu ván để bảo toàn Heo đến cờ tàn
    const containsTwo = move.cards.some(isTwo);
    const targetIsTwo = targetMove && targetMove.combination.cards.some(isTwo);

    if (containsTwo && !targetIsTwo && handSize >= 6) {
      modifier -= 100;
    }

    return modifier;
  }
}

/**
 * 3. Chế Độ Nhất Ăn Tất (Winner Takes All Policy)
 * Mục tiêu: "Được ăn cả, ngã về không" (All-or-Nothing) — Chỉ nhắm đến vị trí Về Nhất.
 */
export class WinnerTakesAllAIModePolicy implements AIModePolicyStrategy {
  public readonly modeId = 'WINNER_TAKES_ALL';
  public readonly modeName = 'Nhất Ăn Tất (Winner Takes All)';
  public readonly description = 'Đánh bạo lực tranh Nhất, sẵn sàng dùng bài to cướp cái để độc chiếm lượt đi và dứt điểm combo.';

  public getLeadPolicy(): LeadPolicy {
    return {
      preferLongestComboFirst: false,
      dumpSmallTrashFirst: false,
      aggressiveFinisherPush: true
    };
  }

  public getRespondingScoreModifier(move: ValidMoveInfo, handSize: number, targetMove: PlayedMove | null): number {
    let bonus = 0;

    // Thưởng điểm cướp cái bằng Heo / Bộ to để mở đường cho chuỗi combo dứt điểm
    const containsTwo = move.cards.some(isTwo);
    if (containsTwo) {
      bonus += 110;
    }

    if (move.combination.highestCard.rank >= 13) {
      bonus += 60; // Thưởng khi đánh bài to (K, A)
    }

    return bonus;
  }
}

/**
 * 4. Chế Độ Bản Đồ Chiến Dịch (Campaign Policy)
 */
export class CampaignAIModePolicy implements AIModePolicyStrategy {
  public readonly modeId = 'CAMPAIGN';
  public readonly modeName = 'Bản Đồ Chiến Dịch (Campaign Mode)';
  public readonly description = 'Chiến thuật cân bằng linh hoạt theo từng ải vượt khó.';

  public getLeadPolicy(): LeadPolicy {
    return {
      preferLongestComboFirst: false,
      dumpSmallTrashFirst: true,
      aggressiveFinisherPush: false
    };
  }

  public getRespondingScoreModifier(move: ValidMoveInfo, handSize: number, targetMove: PlayedMove | null): number {
    return 0;
  }
}

// Strategy Cache Singleton Instances
const COUNT_CARDS_POLICY = new CountCardsAIModePolicy();
const TRADITIONAL_POLICY = new TraditionalAIModePolicy();
const WINNER_TAKES_ALL_POLICY = new WinnerTakesAllAIModePolicy();
const CAMPAIGN_POLICY = new CampaignAIModePolicy();

/**
 * Resolver Factory: Định vị và trả về AI Mode Strategy tương ứng
 */
export function resolveAIModePolicy(gameMode?: string): AIModePolicyStrategy {
  const normalizedMode = (gameMode || 'TRADITIONAL').toUpperCase();

  switch (normalizedMode) {
    case 'COUNT_CARDS':
    case 'UNDERGROUND':
      return COUNT_CARDS_POLICY;

    case 'WINNER_TAKES_ALL':
      return WINNER_TAKES_ALL_POLICY;

    case 'CAMPAIGN':
      return CAMPAIGN_POLICY;

    case 'RANKED':
    case 'TRADITIONAL':
    case 'CUSTOM':
    case 'QUICK':
    default:
      return TRADITIONAL_POLICY;
  }
}
