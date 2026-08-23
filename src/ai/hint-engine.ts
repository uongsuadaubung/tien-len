import { Card, PlayedMove } from '../engine/types';
import { BOT_PERSONAS } from './bot-factory';
import { CardTracker } from './card-tracker';
import { makeBotDecision } from './decision-maker';

export interface MoveHint {
  action: 'PLAY' | 'PASS';
  cards?: Card[];
  explanation: string;
}

/**
 * Tạo gợi ý nước đi tối ưu theo tư duy của Thần bài Cô Ba
 */
export function getOptimalMoveHint(
  hand: Card[],
  leadingMove: PlayedMove | null,
  isFirstMoveOfGame: boolean,
  isLeadMove: boolean,
  tracker: CardTracker,
  remainingPlayerCards: Record<string, number>,
  nextPlayerId: string = 'p1',
  isNextPlayerOneCard?: boolean
): MoveHint {
  const resolvedNextPlayerId = nextPlayerId || Object.keys(remainingPlayerCards)[0] || 'p1';
  const decision = makeBotDecision({
    hand,
    currentRoundLeadingMove: leadingMove,
    isFirstMoveOfGame,
    isLeadMove,
    tracker,
    config: BOT_PERSONAS.BOT_ELO_1750,
    remainingPlayerCards,
    nextPlayerId: resolvedNextPlayerId,
    isNextPlayerOneCard: isNextPlayerOneCard ?? (remainingPlayerCards[resolvedNextPlayerId] === 1)
  });

  if (decision.type === 'PASS') {
    return {
      action: 'PASS',
      explanation: decision.reason || 'Nên chủ động bỏ lượt để bảo toàn các bộ sảnh/hàng quý giá trên tay.'
    };
  }

  const cardCodes = decision.cards?.map(c => c.code).join(' ') || '';

  if (decision.combination?.type === 'THREE_PAIRS_SEQUENTIAL' || decision.combination?.type === 'FOUR_OF_A_KIND') {
    return {
      action: 'PLAY',
      cards: decision.cards,
      explanation: `Tung hàng đặc biệt (${cardCodes}) để chặt đè đối thủ và giành quyền chủ động!`
    };
  }

  if (isLeadMove) {
    return {
      action: 'PLAY',
      cards: decision.cards,
      explanation: `Mở đầu vòng bằng tổ hợp (${cardCodes}) để tẩu tán bài rác và duy trì thế trận an toàn.`
    };
  }

  return {
    action: 'PLAY',
    cards: decision.cards,
    explanation: `Đè bài bằng (${cardCodes}) để tranh lượt và ép đối thủ tiêu hao bài to.`
  };
}
