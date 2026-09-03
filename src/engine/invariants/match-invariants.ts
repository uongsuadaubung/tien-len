import type { MatchSnapshot } from '../offline-match-driver';

export class InvariantViolationError extends Error {
  public context?: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(`[State Invariant Violation] ${message}`);
    this.name = 'InvariantViolationError';
    this.context = context;
  }
}

/**
 * Môi trường kiểm thử hoặc phát triển: Bật chế độ Fail-Fast
 */
export function isFailFastMode(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      return true;
    }
  }
  if (import.meta.env?.DEV) {
    return true;
  }
  return false;
}

/**
 * Báo cáo vi phạm Invariant:
 * - Trong Dev/Test: Throw Error ngay lập tức (Fail-Fast để bắt bug tận gốc)
 * - Trong Production: Ghi log lỗi nghiêm trọng và cho phép hệ thống tự phục hồi an toàn
 */
export function reportInvariantViolation(message: string, context?: Record<string, unknown>): void {
  const formatted = `[State Invariant Violation] ${message}`;
  if (isFailFastMode()) {
    throw new InvariantViolationError(message, context);
  } else {
    console.error(formatted, context);
  }
}

/**
 * Chốt chặn 1: Kiểm tra tính toàn vẹn tại cổng vào trận đấu (Coordinator Startup)
 */
export function assertValidMatchStartup(context: {
  gameNumber: number;
  betAmount: number;
  playerCoins: number;
  playerCount: number;
  activeGameType?: string;
}): void {
  if (context.betAmount <= 0) {
    reportInvariantViolation(`Mức cược bàn đấu không hợp lệ (phải > 0, nhận được: ${context.betAmount})`, context);
  }

  if (context.activeGameType !== 'CAMPAIGN' && context.playerCoins < context.betAmount) {
    reportInvariantViolation(`Số dư người chơi (${context.playerCoins}) nhỏ hơn mức cược bàn (${context.betAmount})`, context);
  }

  if (context.playerCount < 2 || context.playerCount > 4) {
    reportInvariantViolation(`Số lượng người chơi bàn đấu không hợp lệ (phải từ 2 đến 4, nhận được: ${context.playerCount})`, context);
  }

  if (context.gameNumber < 1) {
    reportInvariantViolation(`Số thứ tự ván đấu không hợp lệ (phải >= 1, nhận được: ${context.gameNumber})`, context);
  }
}

/**
 * Chốt chặn 2: Kiểm tra tính toàn vẹn của Snapshot (Driver -> Store)
 */
export function assertValidSnapshot(snapshot: MatchSnapshot): void {
  // 1. Kiểm tra số lượng người chơi
  if (!snapshot.players || snapshot.players.length < 2 || snapshot.players.length > 4) {
    reportInvariantViolation(`Snapshot có số lượng người chơi không hợp lệ: ${snapshot.players?.length}`, {
      playerCount: snapshot.players?.length
    });
  }

  // 2. Kiểm tra tính đồng nhất của Tới Trắng
  if (snapshot.instantWinType) {
    if (!snapshot.isGameOver) {
      reportInvariantViolation(`Snapshot có instantWinType='${snapshot.instantWinType}' nhưng isGameOver lại là false!`, {
        instantWinType: snapshot.instantWinType,
        isGameOver: snapshot.isGameOver
      });
    }
    if (!snapshot.winners || snapshot.winners.length === 0) {
      reportInvariantViolation(`Snapshot có instantWinType='${snapshot.instantWinType}' nhưng danh sách winners lại rỗng!`, {
        instantWinType: snapshot.instantWinType,
        winnersCount: snapshot.winners?.length
      });
    }
  }

  // 3. Kiểm tra tính đồng nhất của Game Over
  if (snapshot.isGameOver && (!snapshot.winners || snapshot.winners.length === 0)) {
    reportInvariantViolation(`Snapshot đánh dấu isGameOver=true nhưng không có người chiến thắng trong winners!`, {
      isGameOver: snapshot.isGameOver,
      winnersCount: snapshot.winners?.length
    });
  }

  // 4. Kiểm tra số lá bài trên tay mỗi người chơi
  for (const p of snapshot.players) {
    if (p.hand && p.hand.length > 13) {
      reportInvariantViolation(`Người chơi ${p.name} (${p.id}) có ${p.hand.length} lá bài (> 13 lá)!`, {
        playerId: p.id,
        handLength: p.hand.length
      });
    }
  }
}

/**
 * Chốt chặn 3: Kiểm tra tính toàn vẹn cân bằng kinh tế (Settlement Balance Invariant)
 * Trong Tiến Lên Miền Nam (Zero-Sum Game), tổng số tiền thắng phải bằng tổng số tiền thua.
 */
export function assertEconomicBalance(payouts: Record<string, number>): void {
  const values = Object.values(payouts);
  if (values.length === 0) return;

  const totalSum = values.reduce((sum, val) => sum + val, 0);

  // Cho phép sai số làm tròn tối đa 1 Xu do chia lẻ (nếu có)
  if (Math.abs(totalSum) > 1) {
    reportInvariantViolation(`Dòng tiền kết toán ván đấu không cân bằng! Tổng chênh lệch: ${totalSum} Xu`, {
      payouts,
      totalSum
    });
  }
}
