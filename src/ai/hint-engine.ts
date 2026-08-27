import { Card, GameRules, PlayedMove, Combination, createDefaultGameRules } from '../engine/types';
import { BOT_PERSONAS } from './bot-factory';
import { CardTracker } from './card-tracker';
import { makeBotDecision } from './decision-maker';
import { getSortedQuickSelectCandidates } from '../engine/quick-response-finder';
import { isValidMove } from '../engine/validator';
import { getSmartHandGroups } from '../engine/hand-sorter';
import { isTwo, formatCard, formatCards } from '../engine/card';

export type HintType = 
  | 'DANGER_WARNING'      // Cảnh báo nguy hiểm: Tứ Quý, Đôi Thông, chặn đầu 1 lá, nguy cơ Cóng
  | 'TACTICAL_PASS'       // Khuyên nhịn bài giữ sảnh/đôi đẹp
  | 'FORCED_PASS'         // Không có bài đè được trên bàn
  | 'LEAD_OPENING'        // Mở màn thế trận đầu vòng
  | 'BEAT_MOVE'           // Đè bài / Chặn lượt
  | 'WIN_OPPORTUNITY';    // Cơ hội về Nhất (đánh hết bài trên tay)

export interface MoveHint {
  action: 'PLAY' | 'PASS';
  cards: Card[] | null;
  type: HintType;
  title: string;          // vd: "⚠️ Cảnh Báo Hàng Nóng", "💡 Nhẫn Nhịn Giữ Sảnh", "🚫 Tạm Bỏ Lượt"
  message: string;        // Lời thoại sinh động của Quân Sư (hiển thị ký hiệu bài trực quan: 3♠ 4♣ A♥ 2♥)
  explanation: string | null;    // Giữ cho backwards compatibility
  details: string | null;       // Phân tích kỹ thuật chi tiết
}

/**
 * Trợ giúp tạo MoveHint object hoàn chỉnh với details và explanation
 */
export function createMoveHint(data: {
  action: 'PLAY' | 'PASS';
  cards: Card[] | null;
  type: HintType;
  title: string;
  message: string;
  explanation?: string | null;
  details?: string | null;
}): MoveHint {
  return {
    action: data.action,
    cards: data.cards,
    type: data.type,
    title: data.title,
    message: data.message,
    explanation: data.explanation ?? null,
    details: data.details ?? null
  };
}

/**
 * Chọn ngẫu nhiên một câu thoại tự nhiên trong kho lời thoại
 */
function pickDialogue(phrases: string[]): string {
  if (!phrases || phrases.length === 0) return '';
  const idx = Math.floor(Math.random() * phrases.length);
  return phrases[idx];
}

/**
 * Kho lời thoại phong phú, tự nhiên của Quân Sư Thần Bài
 */
const DIALOGUES = {
  FORCED_PASS: [
    'Bài trên bàn hơi gắt rồi, tạm bấm Bỏ Lượt để bảo toàn quân số nhé!',
    'Nước này đối thủ ép bài to quá, mình không có bài đỡ. Bỏ lượt nhường cái thôi!',
    'Tầm này không đỡ nổi rồi bạn ơi, bấm Bỏ Lượt chờ vòng mới phản công!',
    'Lượt này bài họ ép chặt quá, tạm thời nhịn một nhịp bấm Bỏ Lượt nhé.',
    'Không có bài hợp lệ để đè rồi, an tâm bấm Bỏ Lượt để giữ thế trận!'
  ],
  TACTICAL_PASS: (reason?: string | null) => [
    reason || 'Nhường lượt này đi bạn, giữ nguyên các bộ sảnh và đôi đẹp trên tay để chờ thời cơ phản công!',
    'Đừng vội đè bài này kẻo xé nát bộ bài đẹp trên tay, nhịn một nhịp nhường cái là thượng sách!',
    'Tạm thời nhường cái cho đối thủ tranh nhau, mình ém bộ đẹp chờ thời điểm quyết định!',
    'Bỏ lượt chiến thuật nhé! Giữ bài đẹp trong tay, lát nữa lấy lại cái sau.'
  ],
  DANGER_BLOCK_NEXT: (cards: string) => [
    `🚨 Đối thủ kế bên sắp về Nhất rồi! Hãy tung quân bài mạnh nhất (${cards}) để chặn đầu ngay kẻo đền bài nhé!`,
    `🚨 Báo động đỏ! Tay bài kế bên chỉ còn đúng 1 lá và sắp về Nhất, phải tung (${cards}) khóa đầu khẩn cấp!`,
    `🚨 Đối thủ chuẩn bị về Nhất! Đánh (${cards}) để chặn đường, đừng để họ về chót lọt nhé!`
  ],
  DANGER_CONG: (cards: string) => [
    `🚨 Bạn chưa đánh được lá nào mà đối thủ sắp về Nhất rồi! Hãy tung (${cards}) để thoát Cóng khẩn cấp!`,
    `🚨 Nguy cơ cháy bài cận kề! Tìm mọi cách đánh (${cards}) ra để giải phóng tay bài ngay!`,
    `🚨 Đối thủ sắp về Nhất rồi! Tung (${cards}) cứu cánh để thoát Cóng ngay lập tức!`
  ],
  DANGER_HOT_BOMBS: [
    '⚠️ Cảm giác bàn này còn nhiều hàng nóng đang rình rập. Tạm nhịn ra Heo lúc này là an toàn nhất!',
    '⚠️ Mùi khét của Tứ Quý hoặc Đôi Thông đang thoang thoảng đâu đây. Giữ Heo lại đã nhé!',
    '⚠️ Bàn đấu đang rất căng và nhiều bài úp, đừng vội bung Heo kẻo bị úp sọt oan uổng!'
  ],
  CHOP_HEO: (cards: string) => [
    `💥 Đối thủ vừa thả Heo! Hãy tung hàng đặc biệt (${cards}) để chặt Heo và ăn tiền phạt ngay!`,
    `💥 Bắt được Heo rồi! Tung (${cards}) ra chặt đè đối thủ lĩnh thưởng thôi bạn ơi!`,
    `💥 Hàng nóng lên tiếng! Đập (${cards}) xuống bàn để chặt Heo và giành quyền làm chủ thế trận!`
  ],
  WIN_OPPORTUNITY: (cards: string) => [
    `👑 Thế bài chín muồi rồi! Tung trọn bộ bài (${cards}) này ra là bạn sẽ cán đích về Nhất ngay!`,
    `👑 Cơ hội ngàn vàng! Đánh hết bộ (${cards}) này là ẵm trọn chiến thắng Về Nhất ván này!`,
    `👑 Nước bài kết liễu! Xả sạch (${cards}) để về Nhất ngoạn mục luôn nào!`
  ],
  FIRST_MOVE_3S: (cards: string) => [
    `🎯 Khai màn ván đấu! Bạn đang nắm 3 Bích (3♠), hãy đánh (${cards}) để bắt đầu trận đấu nhé.`,
    `🎯 Mở bát ván mới bằng 3 Bích (${cards}) để thăm dò và dọn đường đi bài nhé!`
  ],
  LEAD_OPENING: (cards: string) => [
    `🎯 Khởi đầu vòng bằng (${cards}) để thăm dò và dọn bớt bài rác trên tay nhé.`,
    `🎯 Mở màn bằng (${cards}) là nước đi an toàn, giúp bạn nắm quyền dẫn dắt nhịp độ trận đấu.`,
    `🎯 Tung (${cards}) đi đầu để dọn sạch bài nhỏ, mở đường cho các bộ bài to phía sau!`
  ],
  BEAT_NORMAL: (cards: string) => [
    `⚔️ Đè bài bằng tổ hợp (${cards}) để áp chế đối thủ và giữ quyền kiểm soát vòng chơi.`,
    `⚔️ Đánh (${cards}) để tranh lượt, ép đối phương phải tiêu hao những quân bài lớn!`,
    `⚔️ Lên bài (${cards}) rất vừa tầm, giữ thế chủ động và ép bài đối thủ!`
  ],
  PAIR_ACES_RISK: (cards: string) => [
    `⚔️ Đôi A (${cards}) rất mạnh đấy! Đánh ra có thể ép đối thủ muốn cản thì phải bung Đôi Heo mới đè nổi.`,
    `⚔️ Đôi A (${cards}) rất lực! Ra bài này là ép sới phải tung Đôi Heo mới cản được bạn.`
  ],
  PAIR_ACES_SAFE: (cards: string) => [
    `👑 Đôi A (${cards}) sáng nước vô cùng, cửa giữ lượt của bạn là cực kỳ rộng mở!`,
    `👑 Đôi A (${cards}) gần như nắm chắc quyền đi tiếp, tự tin xả bài để giành thế chủ động!`
  ],
  PAIR_SMALL: (cards: string) => [
    `👍 Xả đôi nhỏ (${cards}) để tẩu tán rác là hợp lý, nếu đối thủ đè đôi to hơn thì mình nhường cái.`,
    `👍 Dọn đôi nhỏ (${cards}) rất gọn tay bài, chấp nhận nhường nhịp nếu gặp đôi lớn hơn.`
  ],
  PAIR_NORMAL: (cards: string) => [
    `👍 Đôi (${cards}) khá ổn đấy, triển vọng tranh lượt tương đối sáng cửa.`,
    `👍 Lên đôi (${cards}) rất vừa vặn, giữ nhịp độ bàn đấu an toàn.`
  ],
  SINGLE_SMALL: (cards: string) => [
    `👍 Đi lá rác (${cards}) này để thăm dò, nếu đối thủ xả bài to đè lại thì mình cũng đã nhẹ gánh được 1 lá.`,
    `👍 Xả lá rác (${cards}) là nước đi hợp lý, tẩu tán bài nhỏ để tay bài gọn gàng hơn.`
  ],
  SINGLE_HIGH: (cards: string) => [
    `👍 Quân (${cards}) khá bén đấy, cửa tranh lượt đi tiếp của bạn là rất sáng.`,
    `👍 Quân bài (${cards}) khá cao, tạo áp lực lớn lên các đối thủ phía sau!`
  ],
  STRAIGHT_LONG: (length: number, cards: string) => [
    `🔥 Sảnh dài ${length} lá (${cards}) cực kỳ đẹp mắt, đối thủ sẽ rất khó lòng có sảnh dài hơn để cản bạn!`,
    `🔥 Tung sảnh dài ${length} lá (${cards}) áp đảo, tỷ lệ đối thủ có sảnh to hơn là cực thấp!`
  ],
  STRAIGHT_NORMAL: (length: number, cards: string) => [
    `👍 Tung sảnh (${cards}) dọn được ${length} lá cùng lúc, giúp tay bài thông thoáng hơn hẳn!`,
    `👍 Sảnh (${cards}) tẩu tán một mạch ${length} lá rất hiệu quả, bài trên tay nhẹ đi nhiều!`
  ],
  TRIPLE_HIGH: (cards: string) => [
    `👑 Sám (${cards}) cực mạnh, giúp bạn áp chế và làm chủ vòng chơi!`,
    `👑 Sám to (${cards}) áp đảo bàn sới, nắm chắc quyền kiểm soát vòng đấu!`
  ],
  TRIPLE_NORMAL: (cards: string) => [
    `👍 Sám (${cards}) tẩu tán 3 lá cùng lúc rất nhanh và gọn gàng, tạo thế trận rất thoáng!`,
    `👍 Xả sám (${cards}) dọn bài cực kỳ nhanh, đối thủ khó lòng có sám to hơn để cản.`
  ],
  DANGER_THOI_HEO: (cards: string) => [
    `⚠️ Coi chừng Thối Heo nhé! Bàn này cấm về bằng Heo chót, hãy tranh thủ đánh (${cards}) ra ngay khi có cơ hội!`,
    `⚠️ Cảnh báo thối hàng! Tay bài sắp hết mà vẫn còn Heo, phải tìm cách xả (${cards}) để tránh bị phạt nặng!`,
    `⚠️ Nguy cơ thối Heo cận kề! Tung (${cards}) ra ngay kẻo kẹt bài đến cuối ván là đền tiền đấy!`
  ],
  OVER_CHOP: (cards: string) => [
    `💥 Chặt Chồng Đỉnh Cao! Đối phương vừa ăn Heo, hãy đập hàng to hơn (${cards}) đè bẹp đối thủ để nuốt trọn tiền phạt!`,
    `💥 Bắt quả tang đè hàng! Tung (${cards}) chặt chồng đối thủ, ẵm trọn toàn bộ tiền phạt trên bàn!`,
    `💥 Đòn phản công sấm sét! Đập (${cards}) đè bẹp hàng của đối phương và giành quyền làm chủ cuộc chơi!`
  ],
  HEO_BLACK_TACTIC: (cards: string) => [
    `♟️ Thả Heo Đen (${cards}) thăm dò là nước cờ cao tay, vừa ép đối thủ lộ Heo Đỏ vừa an toàn cho tay bài!`,
    `👍 Dùng Heo Đen (${cards}) ép bài rất khôn ngoan, nhử đối phương bung hàng lớn để mình đón đầu!`
  ],
  HEO_RED_TACTIC: (cards: string) => [
    `👑 Tung Heo Đỏ (${cards}) uy lực tối đa, nắm chắc quyền kiểm soát thế trận và ép sới nghẹt thở!`,
    `🔥 Heo Đỏ (${cards}) xuất trận! Uy lực đè bẹp bàn sới, tự tin làm chủ vòng đấu!`
  ],
  NEAR_FINISH_CHEER: [
    'Rất bén! Bạn chỉ còn đúng 1 lá duy nhất trên tay, chỉ cần cướp lại cái là cầm chắc về Nhất!',
    'Tuyệt vời! Đánh xong bạn chỉ còn 1 lá chốt hạ, cơ hội chiến thắng đang nằm trong tầm tay!',
    'Thế trận quá sáng! Bạn đã chạm ngưỡng cửa về Nhất, giữ vững nhịp độ để cán đích nhé!'
  ],
  OPENING_GOD_HAND: (cards: string) => [
    `🎯 Ván này bài bạn đẹp như tranh vẽ! Mở màn bằng (${cards}) để từng bước làm chủ sới bạc nhé!`,
    `👑 Tay bài ván này cực phẩm, hàng họ đầy đủ! Đánh (${cards}) mở đường để tiến thẳng đến ngôi Về Nhất!`
  ]
};

/**
 * Tạo gợi ý nước đi tối ưu & lời thoại chiến thuật của Quân Sư Thần Bài (Bao quát 100% kịch bản trận đấu)
 */
export function getOptimalMoveHint(
  hand: Card[],
  leadingMove: PlayedMove | null,
  isFirstMoveOfGame: boolean,
  isLeadMove: boolean,
  tracker: CardTracker,
  remainingPlayerCards: Record<string, number>,
  nextPlayerId: string = 'p1',
  isNextPlayerOneCard?: boolean,
  prohibitEndingWithTwo?: boolean,
  gameMode?: string,
  rules?: GameRules,
  hasPlayedFirstCard: boolean = true
): MoveHint {
  // 1. Kiểm tra kịch bản BẮT BUỘC BỎ LƯỢT (Không có bất kỳ quân nào đè được)
  if (!isLeadMove && leadingMove) {
    const candidates = getSortedQuickSelectCandidates({
      hand,
      leadingMove,
      isLeadMove: false,
      isFirstMoveOfGame: false,
      allowFourPairsCutAnytime: true,
      prohibitEndingWithTwo: prohibitEndingWithTwo ?? true
    });
    if (candidates.length === 0) {
      return {
        action: 'PASS',
        cards: null,
        type: 'FORCED_PASS',
        title: '🚫 Tạm Nhường Lượt',
        message: pickDialogue(DIALOGUES.FORCED_PASS),
        explanation: 'Không có bài hợp lệ để đè bài trên bàn.',
        details: null
      };
    }
  }

  const resolvedNextPlayerId = nextPlayerId || Object.keys(remainingPlayerCards)[0] || 'p1';
  const resolvedIsNextPlayerOneCard = isNextPlayerOneCard ?? (remainingPlayerCards[resolvedNextPlayerId] === 1);

  const decision = makeBotDecision({
    hand,
    currentRoundLeadingMove: leadingMove,
    isFirstMoveOfGame,
    isLeadMove,
    tracker,
    config: BOT_PERSONAS.BOT_ELO_1750,
    remainingPlayerCards,
    nextPlayerId: resolvedNextPlayerId,
    isNextPlayerOneCard: resolvedIsNextPlayerOneCard,
    prohibitEndingWithTwo: prohibitEndingWithTwo ?? true,
    gameMode: gameMode ?? 'TRADITIONAL',
    rules: rules ?? createDefaultGameRules(),
    hasPlayedFirstCard,
    mctsMap: null,
    compositeRuleStrategy: null,
    opponentProfiles: null
  });

  const cardCodes = decision.cards ? formatCards(decision.cards) : '';
  const hasTwosInHand = hand.some(c => c.rank === 15);
  const twoSafety = tracker.getTwoSafetyReport ? tracker.getTwoSafetyReport() : null;

  // 2. Kịch bản CẢNH BÁO NGUY CƠ BỊ CÓNG / CHÁY BÀI (Chưa đánh được lá nào mà có đối thủ sắp về)
  const anyOpponentNearWin = Object.entries(remainingPlayerCards).some(([id, count]) => id !== 'p0' && count <= 2);
  if (!hasPlayedFirstCard && anyOpponentNearWin && decision.type === 'PLAY' && decision.cards) {
    return {
      action: 'PLAY',
      cards: decision.cards,
      type: 'DANGER_WARNING',
      title: '🚨 Nguy Cơ Bị Cóng!',
      message: pickDialogue(DIALOGUES.DANGER_CONG(cardCodes)),
      explanation: 'Nguy cơ bị Cóng khi chưa đánh được lá nào.',
      details: null
    };
  }

  // 2b. Kịch bản CẢNH BÁO THỐI HEO CHÓT (Khi tay bài còn <= 3 lá mà ôm Heo trong luật cấm về Heo)
  if (prohibitEndingWithTwo && hand.length <= 3 && hasTwosInHand) {
    const twoCards = hand.filter(c => c.rank === 15);
    return {
      action: decision.type === 'PLAY' && decision.cards ? 'PLAY' : 'PASS',
      cards: decision.type === 'PLAY' ? decision.cards : null,
      type: 'DANGER_WARNING',
      title: '⚠️ Cảnh Báo Thối Heo!',
      message: pickDialogue(DIALOGUES.DANGER_THOI_HEO(formatCards(twoCards))),
      explanation: 'Luật cấm về bằng Heo đang bật, hãy cẩn thận xả bài để tránh bị thối Heo.',
      details: null
    };
  }

  // 3. Kịch bản CẢNH BÁO CHẶN ĐẦU (Người kế bên chỉ còn 1 lá)
  if (resolvedIsNextPlayerOneCard && !isLeadMove && decision.type === 'PLAY' && decision.cards) {
    return {
      action: 'PLAY',
      cards: decision.cards,
      type: 'DANGER_WARNING',
      title: '🚨 Chặn Đầu Khẩn Cấp!',
      message: pickDialogue(DIALOGUES.DANGER_BLOCK_NEXT(cardCodes)),
      explanation: `Chặn đầu đối thủ kế bên chỉ còn 1 lá bằng (${cardCodes}).`,
      details: null
    };
  }

  // 4. Kịch bản CƠ HỘI BẮT HEO / CHẶT HÀNG (Đối thủ vừa ra Heo và ta có hàng đè)
  const isTargetTwo = leadingMove?.combination && (
    (leadingMove.combination.type === 'SINGLE' && isTwo(leadingMove.combination.highestCard)) ||
    (leadingMove.combination.type === 'PAIR' && isTwo(leadingMove.combination.highestCard))
  );
  if (isTargetTwo && (decision.combination?.type === 'THREE_PAIRS_SEQUENTIAL' || decision.combination?.type === 'FOUR_OF_A_KIND' || decision.combination?.type === 'FOUR_PAIRS_SEQUENTIAL')) {
    return {
      action: 'PLAY',
      cards: decision.cards || null,
      type: 'BEAT_MOVE',
      title: '💥 Cơ Hội Bắt Heo!',
      message: pickDialogue(DIALOGUES.CHOP_HEO(cardCodes)),
      explanation: 'Tung hàng đặc biệt để chặt Heo.',
      details: null
    };
  }

  // 4b. Kịch bản CHẶT CHỒNG ĐÈ HÀNG (Đối thủ vừa chặt hàng, và ta có hàng to hơn đè tiếp)
  const isLeadingSpecialBomb = leadingMove?.combination && (
    leadingMove.combination.type === 'THREE_PAIRS_SEQUENTIAL' ||
    leadingMove.combination.type === 'FOUR_OF_A_KIND' ||
    leadingMove.combination.type === 'FOUR_PAIRS_SEQUENTIAL'
  );
  if (isLeadingSpecialBomb && (decision.combination?.type === 'FOUR_OF_A_KIND' || decision.combination?.type === 'FOUR_PAIRS_SEQUENTIAL')) {
    return {
      action: 'PLAY',
      cards: decision.cards || null,
      type: 'BEAT_MOVE',
      title: '💥 Chặt Chồng Đỉnh Cao!',
      message: pickDialogue(DIALOGUES.OVER_CHOP(cardCodes)),
      explanation: `Chặt chồng hàng đặc biệt (${cardCodes}) đè bẹp đối thủ.`,
      details: null
    };
  }

  // 5. Kịch bản CẢNH BÁO RÌNH CHẶT HEO (Có Heo trên tay nhưng linh cảm ngoài sới có hàng nóng)
  if (hasTwosInHand && twoSafety && twoSafety.dangerousFourOfAKindRanks.length > 0) {
    if (decision.type === 'PASS') {
      return {
        action: 'PASS',
        cards: null,
        type: 'DANGER_WARNING',
        title: '⚠️ Cẩn Thận Hàng Nóng',
        message: pickDialogue(DIALOGUES.DANGER_HOT_BOMBS),
        explanation: 'Nguy cơ bị chặt Heo cao, nên chủ động nhịn bài.',
        details: null
      };
    }
  }

  // 6. Kịch bản NHẪN NHỊN BỎ LƯỢT CHIẾN THUẬT (Giữ sảnh / giữ đôi)
  if (decision.type === 'PASS') {
    return {
      action: 'PASS',
      cards: null,
      type: 'TACTICAL_PASS',
      title: '💡 Nhẫn Nhịn Giữ Bài',
      message: pickDialogue(DIALOGUES.TACTICAL_PASS(decision.reason)),
      explanation: decision.reason || 'Nên chủ động bỏ lượt để bảo toàn các bộ sảnh/hàng quý giá trên tay.',
      details: null
    };
  }

  // 7. Kịch bản CƠ HỘI VỀ NHẤT (Đánh hết toàn bộ bài trên tay)
  if (decision.cards && decision.cards.length === hand.length) {
    return {
      action: 'PLAY',
      cards: decision.cards,
      type: 'WIN_OPPORTUNITY',
      title: '👑 Cơ Hội Về Nhất!',
      message: pickDialogue(DIALOGUES.WIN_OPPORTUNITY(cardCodes)),
      explanation: `Đánh hết bài (${cardCodes}) để về Nhất!`,
      details: null
    };
  }

  // 8. Kịch bản CHẶT HÀNG ĐẶC BIỆT
  if (decision.combination?.type === 'THREE_PAIRS_SEQUENTIAL' || decision.combination?.type === 'FOUR_OF_A_KIND' || decision.combination?.type === 'FOUR_PAIRS_SEQUENTIAL') {
    return {
      action: 'PLAY',
      cards: decision.cards || null,
      type: 'BEAT_MOVE',
      title: '💥 Tung Hàng Bắt Đè!',
      message: pickDialogue(DIALOGUES.CHOP_HEO(cardCodes)),
      explanation: `Tung hàng đặc biệt (${cardCodes}) để chặt đè đối thủ và giành quyền chủ động!`,
      details: null
    };
  }

  // 9. Kịch bản KHAI MÀN 3 BÍCH (Ván đầu tiên)
  if (isFirstMoveOfGame) {
    return {
      action: 'PLAY',
      cards: decision.cards || null,
      type: 'LEAD_OPENING',
      title: '🎯 Khởi Đầu 3 Bích (3♠)',
      message: pickDialogue(DIALOGUES.FIRST_MOVE_3S(cardCodes)),
      explanation: 'Đánh 3 Bích để mở màn ván đầu.',
      details: null
    };
  }

  // 10. Kịch bản MỞ MÀN VÒNG ĐẤU (Lead Move thông thường)
  if (isLeadMove) {
    const hasManyTwos = hand.filter(c => c.rank === 15).length >= 3;
    if (hasManyTwos) {
      return {
        action: 'PLAY',
        cards: decision.cards || null,
        type: 'LEAD_OPENING',
        title: '👑 Thế Bài Cực Đẹp!',
        message: pickDialogue(DIALOGUES.OPENING_GOD_HAND(cardCodes)),
        explanation: `Mở đầu với tay bài siêu đẹp bằng (${cardCodes}).`,
        details: null
      };
    }
    return {
      action: 'PLAY',
      cards: decision.cards || null,
      type: 'LEAD_OPENING',
      title: '🎯 Mở Màn Thế Trận',
      message: pickDialogue(DIALOGUES.LEAD_OPENING(cardCodes)),
      explanation: `Mở đầu vòng bằng tổ hợp (${cardCodes}) để tẩu tán bài rác và duy trì thế trận an toàn.`,
      details: null
    };
  }

  // 11. Kịch bản ĐÈ BÀI BÌNH THƯỜNG
  return {
    action: 'PLAY',
    cards: decision.cards || null,
    type: 'BEAT_MOVE',
    title: '⚔️ Đè Bài Tranh Lượt',
    message: pickDialogue(DIALOGUES.BEAT_NORMAL(cardCodes)),
    explanation: `Đè bài bằng (${cardCodes}) để tranh lượt và ép đối thủ tiêu hao bài to.`,
    details: null
  };
}

export interface SelectionFeedbackContext {
  selectedCards: Card[];
  hand: Card[];
  leadingMove: PlayedMove | null;
  isFirstMoveOfGame: boolean;
  isLeadMove: boolean;
  tracker: CardTracker;
  optimalHint: MoveHint | null;
  prohibitEndingWithTwo: boolean | null;
}

/**
 * Phân tích chuyên sâu khả năng bị đối thủ chặn & triển vọng thế trận của tổ hợp bài vừa chọn (Gợi ý tự nhiên, tinh tế)
 */
function analyzeTacticalOutcome(
  combo: Combination,
  selectedCards: Card[],
  _hand: Card[],
  tracker: CardTracker
): { title: string; message: string; type: HintType } {
  const cardCodes = formatCards(selectedCards);

  // 1. Phân tích đối với ĐÔI BÀI (PAIR)
  if (combo.type === 'PAIR') {
    const isPairOfTwos = combo.cards.every(c => c.rank === 15);
    const isPairOfAces = combo.cards.every(c => c.rank === 14);

    if (isPairOfTwos) {
      if (combo.highestCard.suit === 'HEARTS') {
        return {
          type: 'BEAT_MOVE',
          title: '👑 Đôi Heo Uy Lực!',
          message: `Đôi Heo chứa 2 Cơ (${cardCodes}) cực kỳ đắt giá, khả năng rất cao bạn sẽ giữ được quyền đi tiếp!`
        };
      }
      return {
        type: 'BEAT_MOVE',
        title: '🔥 Đôi Heo Rất Mạnh!',
        message: `Đôi Heo (${cardCodes}) rất uy lực, nắm trọn quyền kiểm soát bàn đấu!`
      };
    }

    if (isPairOfAces) {
      const unseenTwos = tracker.getUnseenTwos ? tracker.getUnseenTwos() : [];
      if (unseenTwos.length >= 2) {
        return {
          type: 'BEAT_MOVE',
          title: '⚔️ Đôi A Rất Lực',
          message: pickDialogue(DIALOGUES.PAIR_ACES_RISK(cardCodes))
        };
      }
      return {
        type: 'BEAT_MOVE',
        title: '👑 Đôi A Cực Đẹp!',
        message: pickDialogue(DIALOGUES.PAIR_ACES_SAFE(cardCodes))
      };
    }

    // Các đôi nhỏ khác (Đôi 3 -> Đôi K)
    const unseenTwosCount = tracker.getUnseenTwos ? tracker.getUnseenTwos().length : 0;
    if (combo.highestCard.rank <= 9 && unseenTwosCount > 0) {
      return {
        type: 'BEAT_MOVE',
        title: '👍 Dọn Đôi Rác',
        message: pickDialogue(DIALOGUES.PAIR_SMALL(cardCodes))
      };
    }

    return {
      type: 'BEAT_MOVE',
      title: '👍 Nước Đi Khá Ổn',
      message: pickDialogue(DIALOGUES.PAIR_NORMAL(cardCodes))
    };
  }

  // 2. Phân tích đối với LÁ BÀI ĐƠN (SINGLE)
  if (combo.type === 'SINGLE') {
    const card = selectedCards[0];
    const singleCode = formatCard(card);

    if (card.rank === 15) {
      if (card.suit === 'HEARTS') {
        return {
          type: 'BEAT_MOVE',
          title: '👑 2 Cơ Uy Lực!',
          message: '2 Cơ (2♥) là quân bài uy lực tối thượng, ra bài là nắm chắc quyền làm chủ cuộc chơi!'
        };
      }
      if (card.suit === 'DIAMONDS') {
        return {
          type: 'BEAT_MOVE',
          title: '🔥 2 Rô Cực Mạnh!',
          message: pickDialogue(DIALOGUES.HEO_RED_TACTIC(singleCode))
        };
      }
      return {
        type: 'BEAT_MOVE',
        title: '♟️ Heo Đen Thăm Dò',
        message: pickDialogue(DIALOGUES.HEO_BLACK_TACTIC(singleCode))
      };
    }

    // Lá rác thông thường (3 -> A)
    if (tracker.isStrongestRemainingSingle && tracker.isStrongestRemainingSingle(card)) {
      return {
        type: 'BEAT_MOVE',
        title: '👑 Lá Bài Rất Cao!',
        message: `Quân (${singleCode}) này thuộc hàng cao cờ nhất hiện tại, cơ hội giữ lượt cho bạn là rất lớn!`
      };
    }

    if (card.rank <= 9) {
      return {
        type: 'BEAT_MOVE',
        title: '👍 Đi Rác Thăm Dò',
        message: pickDialogue(DIALOGUES.SINGLE_SMALL(singleCode))
      };
    }

    return {
      type: 'BEAT_MOVE',
      title: '👍 Nước Đi Sáng Cửa',
      message: pickDialogue(DIALOGUES.SINGLE_HIGH(singleCode))
    };
  }

  // 3. Phân tích đối với SẢNH (STRAIGHT)
  if (combo.type === 'STRAIGHT') {
    if (combo.length >= 5) {
      return {
        type: 'BEAT_MOVE',
        title: '🔥 Sảnh Dài Hiểm Hóc!',
        message: pickDialogue(DIALOGUES.STRAIGHT_LONG(combo.length, cardCodes))
      };
    }
    if (combo.highestCard.rank === 14) {
      return {
        type: 'BEAT_MOVE',
        title: '👑 Sảnh Tới A Rất Mạnh!',
        message: `Sảnh tới A (${cardCodes}) uy lực lớn, gần như nắm chắc quyền đi tiếp!`
      };
    }
    return {
      type: 'BEAT_MOVE',
      title: '👍 Sảnh Dọn Bài Tốt',
      message: pickDialogue(DIALOGUES.STRAIGHT_NORMAL(combo.length, cardCodes))
    };
  }

  // 4. Phân tích đối với SÁM CÔ (TRIPLE)
  if (combo.type === 'TRIPLE') {
    if (combo.highestCard.rank >= 13) {
      return {
        type: 'BEAT_MOVE',
        title: '👑 Sám To Áp Đảo!',
        message: pickDialogue(DIALOGUES.TRIPLE_HIGH(cardCodes))
      };
    }
    return {
      type: 'BEAT_MOVE',
      title: '👍 Sám Dọn Bài Nhanh',
      message: pickDialogue(DIALOGUES.TRIPLE_NORMAL(cardCodes))
    };
  }

  // 5. HÀNG ĐẶC BIỆT (Tứ Quý / Đôi Thông)
  return {
    type: 'BEAT_MOVE',
    title: '💥 Tung Hàng Chặn Đè!',
    message: `Tổ hợp đặc biệt (${cardCodes}) cực kỳ uy lực! Tung ra để bắt Heo hoặc lật ngược thế cờ.`
  };
}

/**
 * Đánh giá nhận xét tức thì của Quân Sư khi người chơi bấm chọn các lá bài trên tay (Bao quát 100% kịch bản)
 */
export function evaluateSelectionFeedback(context: SelectionFeedbackContext): MoveHint | null {
  const selectedCards = context.selectedCards;
  const hand = context.hand;
  const leadingMove = context.leadingMove;
  const isFirstMoveOfGame = context.isFirstMoveOfGame;
  const isLeadMove = context.isLeadMove;
  const tracker = context.tracker;
  const prohibitEndingWithTwo = context.prohibitEndingWithTwo ?? true;

  if (!selectedCards || selectedCards.length === 0) return null;

  const targetCombo = leadingMove?.combination || null;
  const isFinishing = selectedCards.length === hand.length;
  const validation = isValidMove(
    selectedCards,
    targetCombo,
    isFirstMoveOfGame,
    isLeadMove,
    false,
    true,
    isFinishing,
    prohibitEndingWithTwo
  );

  const cardCodes = formatCards(selectedCards);

  // 1. Nếu tổ hợp KHÔNG HỢP LỆ
  if (!validation.valid) {
    return {
      action: 'PLAY',
      cards: selectedCards,
      type: 'FORCED_PASS',
      title: '🚫 Chưa Hợp Lệ',
      message: validation.reason || `Bộ bài (${cardCodes}) chưa hợp lệ theo luật hoặc không đè được bài trên bàn!`,
      explanation: validation.reason || 'Nước đi không hợp lệ',
      details: null
    };
  }

  // 2. Nếu nước đi đưa người chơi VỀ NHẤT
  if (isFinishing) {
    return {
      action: 'PLAY',
      cards: selectedCards,
      type: 'WIN_OPPORTUNITY',
      title: '👑 Nước Bài Về Nhất!',
      message: pickDialogue(DIALOGUES.WIN_OPPORTUNITY(cardCodes)),
      explanation: 'Đánh hết bài để về Nhất.',
      details: null
    };
  }

  // 3. Cảnh báo nguy hiểm khi ra Heo (2)
  const hasTwo = selectedCards.some(c => c.rank === 15);
  const twoSafety = tracker.getTwoSafetyReport ? tracker.getTwoSafetyReport() : null;
  if (hasTwo && twoSafety && twoSafety.dangerousFourOfAKindRanks.length > 0) {
    return {
      action: 'PLAY',
      cards: selectedCards,
      type: 'DANGER_WARNING',
      title: '⚠️ Cẩn Thận Bị Bắt Heo!',
      message: `Cảm giác bàn này còn nhiều hàng nóng đang rình rập. Bạn có chắc muốn tung Heo (${cardCodes}) lúc này không?`,
      explanation: 'Nguy cơ bị chặt Heo cao.',
      details: null
    };
  }

  // 4. Cảnh báo XÉ BỘ ĐẸP (Sảnh dài, Tứ Quý, 3 Đôi Thông)
  const smartGroups = getSmartHandGroups(hand);
  
  // 4a. Cảnh báo xé Tứ Quý
  const fourOfAKindGroups = smartGroups.filter(g => g.type === 'FOUR_OF_A_KIND');
  for (const group of fourOfAKindGroups) {
    const selectedFromGroup = group.cards.filter(c => selectedCards.some(sc => sc.id === c.id));
    if (selectedFromGroup.length > 0 && selectedFromGroup.length < group.cards.length) {
      return {
        action: 'PLAY',
        cards: selectedCards,
        type: 'DANGER_WARNING',
        title: '⚠️ Cảnh Báo Xé Tứ Quý!',
        message: `Đánh (${cardCodes}) sẽ làm xé nát bộ ${group.name} (${formatCards(group.cards)}) quý giá trên tay bạn đấy!`,
        explanation: 'Nước đi làm xé Tứ Quý.',
        details: null
      };
    }
  }

  // 4b. Cảnh báo xé 3 Đôi Thông
  const sequentialPairsGroups = smartGroups.filter(g => g.type === 'THREE_PAIRS_SEQUENTIAL' || g.type === 'FOUR_PAIRS_SEQUENTIAL');
  for (const group of sequentialPairsGroups) {
    const selectedFromGroup = group.cards.filter(c => selectedCards.some(sc => sc.id === c.id));
    if (selectedFromGroup.length > 0 && selectedFromGroup.length < group.cards.length) {
      return {
        action: 'PLAY',
        cards: selectedCards,
        type: 'DANGER_WARNING',
        title: '⚠️ Cảnh Báo Xé Đôi Thông!',
        message: `Đánh (${cardCodes}) sẽ làm mất bộ ${group.name} (${formatCards(group.cards)}) trên tay bạn đấy!`,
        explanation: 'Nước đi làm xé Đôi Thông.',
        details: null
      };
    }
  }

  // 4c. Cảnh báo xé Sảnh (>= 4 lá)
  const straightGroups = smartGroups.filter(g => g.type === 'STRAIGHT' && g.cards.length >= 4);
  for (const group of straightGroups) {
    const selectedFromGroup = group.cards.filter(c => selectedCards.some(sc => sc.id === c.id));
    if (selectedFromGroup.length > 0 && selectedFromGroup.length < group.cards.length) {
      return {
        action: 'PLAY',
        cards: selectedCards,
        type: 'DANGER_WARNING',
        title: '⚠️ Coi Chừng Xé Sảnh!',
        message: `Đánh (${cardCodes}) sẽ làm xé nát bộ ${group.name} (${formatCards(group.cards)}) trên tay bạn đấy!`,
        explanation: 'Nước đi làm xé sảnh đẹp.',
        details: null
      };
    }
  }

  // 5. Phân tích thế trận & dự báo đối thủ có chặn được không (gợi ý tự nhiên)
  if (validation.combination) {
    const outcome = analyzeTacticalOutcome(validation.combination, selectedCards, hand, tracker);
    const remainingCount = hand.length - selectedCards.length;
    let extraContext = '';
    if (remainingCount === 1) {
      extraContext = ' ' + pickDialogue(DIALOGUES.NEAR_FINISH_CHEER);
    } else if (remainingCount === 2) {
      extraContext = ' Đánh xong bạn chỉ còn 2 lá, thế trận vô cùng sáng cửa!';
    }

    return {
      action: 'PLAY',
      cards: selectedCards,
      type: outcome.type,
      title: outcome.title,
      message: outcome.message + extraContext,
      explanation: outcome.message,
      details: null
    };
  }

  return {
    action: 'PLAY',
    cards: selectedCards,
    type: 'BEAT_MOVE',
    title: '👍 Nước Đi Hợp Lệ',
    message: `Tổ hợp (${cardCodes}) hợp lệ! Bấm Đánh Bài để thực hiện.`,
    explanation: 'Hợp lệ.',
    details: null
  };
}
