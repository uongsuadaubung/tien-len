import { Card, Combination, CombinationType, GameRules, PlayedMove, Player } from './types';

/**
 * Đánh giá chi tiết của một ứng viên nước đi trong quá trình AI tính toán
 */
export interface BotCandidateEvaluation {
  cards: Card[];
  combinationType: CombinationType | null;
  score: number;
  reasons: string[];
}

/**
 * Dữ liệu suy luận & viễn trắc chi tiết của Bot AI tại thời điểm ra quyết định
 */
export interface BotDecisionTelemetry {
  chosenReason: string | null;
  strategyUsed: string | null;
  heuristicScore: number | null;
  evaluatedCandidatesCount: number;
  topCandidates: BotCandidateEvaluation[];
  mctsWinRate: number | null;
  mctsSimulations: number | null;
  handStrengthTwoCount: number;
  handStrengthTrashCount: number;
  remainingOpponentCards: Record<string, number>;
}

/**
 * Bản ghi chi tiết của một lượt đánh trong trận đấu
 */
export interface MatchTurnLogEntry {
  turnNumber: number;
  roundNumber: number;
  timestamp: number;
  playerId: string;
  playerName: string;
  isBot: boolean;
  botPersonaId: string | null;
  action: 'PLAY' | 'PASS';
  cardsPlayed: Card[] | null;
  combination: Combination | null;
  handBeforeTurn: Card[];
  handAfterTurn: Card[];
  leadingMoveBeforeTurn: PlayedMove | null;
  isLeadMove: boolean;
  isChop: boolean;
  choppedPlayerId: string | null;
  penaltyAmount: number | null;
  botDecision: BotDecisionTelemetry | null;
}

/**
 * Thông tin tổng kết người chơi trong trận đấu
 */
export interface MatchPlayerSummary {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  botPersonaId: string | null;
  initialHand: Card[];
  finalHand: Card[];
  rankPosition: number | null;
  scoreDelta: number;
}

/**
 * Báo cáo toàn diện một trận đấu (Match Log Report)
 */
export interface MatchLogReport {
  matchId: string;
  gameNumber: number;
  gameMode: string;
  rules: GameRules;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  players: MatchPlayerSummary[];
  winner: {
    id: string;
    name: string;
    rankPosition: number;
  } | null;
  turns: MatchTurnLogEntry[];
  settlements: {
    payouts: Record<string, number>;
    isThreeSpadesWin: boolean;
    instantWinType: string | null;
    loanDeduction: number;
    eloDelta: number;
  };
}

export interface FinalizeMatchParams {
  players: Player[];
  winners: Player[];
  payouts: Record<string, number>;
  isThreeSpadesWin: boolean;
  instantWinType: string | null;
  loanDeduction: number;
  eloDelta: number;
}

/**
 * HỆ THỐNG GHI NHẬT KÝ VÁN ĐẤU & SUY LUẬN AI (MATCH LOGGER)
 * Chịu trách nhiệm ghi nhận toàn bộ diễn biến, bài trên tay và chuỗi suy luận của Bot theo thời gian thực.
 */
export class MatchLogger {
  private static instance: MatchLogger | null = null;

  private currentMatchId: string = '';
  private gameNumber: number = 1;
  private gameMode: string = 'TRADITIONAL';
  private rules: GameRules | null = null;
  private startedAtTimestamp: number = 0;
  private initialHands: Map<string, Card[]> = new Map();
  private turns: MatchTurnLogEntry[] = [];
  private currentTurnCounter: number = 0;
  private currentRoundCounter: number = 1;
  private latestFinalizedReport: MatchLogReport | null = null;
  private listeners: Set<(turns: MatchTurnLogEntry[]) => void> = new Set();

  private constructor() {}

  public static getInstance(): MatchLogger {
    if (!MatchLogger.instance) {
      MatchLogger.instance = new MatchLogger();
    }
    return MatchLogger.instance;
  }

  /**
   * Đăng ký lắng nghe các lượt đánh mới theo thời gian thực (dành cho Live HUD)
   */
  public subscribeToTurns(listener: (turns: MatchTurnLogEntry[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.turns]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const turnsCopy = [...this.turns];
    this.listeners.forEach(fn => fn(turnsCopy));
  }

  /**
   * Khởi tạo phiên ghi log cho ván đấu mới
   */
  public startNewMatch(params: {
    gameNumber: number;
    gameMode: string;
    rules: GameRules;
    players: Player[];
  }): void {
    this.currentMatchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.gameNumber = params.gameNumber;
    this.gameMode = params.gameMode;
    this.rules = params.rules;
    this.startedAtTimestamp = Date.now();
    this.currentTurnCounter = 0;
    this.currentRoundCounter = 1;
    this.turns = [];
    this.initialHands.clear();
    this.latestFinalizedReport = null;

    params.players.forEach(p => {
      this.initialHands.set(p.id, [...p.hand]);
    });

    this.notifyListeners();
  }

  /**
   * Ghi nhận một lượt đánh (PLAY hoặc PASS) của Người chơi hoặc Bot AI
   */
  public recordTurn(entry: {
    roundNumber: number;
    playerId: string;
    playerName: string;
    isBot: boolean;
    botPersonaId: string | null;
    action: 'PLAY' | 'PASS';
    cardsPlayed: Card[] | null;
    combination: Combination | null;
    handBeforeTurn: Card[];
    handAfterTurn: Card[];
    leadingMoveBeforeTurn: PlayedMove | null;
    isLeadMove: boolean;
    isChop: boolean;
    choppedPlayerId: string | null;
    penaltyAmount: number | null;
    botDecision: BotDecisionTelemetry | null;
  }): void {
    this.currentTurnCounter++;
    this.currentRoundCounter = entry.roundNumber;

    const turnRecord: MatchTurnLogEntry = {
      turnNumber: this.currentTurnCounter,
      roundNumber: entry.roundNumber,
      timestamp: Date.now(),
      playerId: entry.playerId,
      playerName: entry.playerName,
      isBot: entry.isBot,
      botPersonaId: entry.botPersonaId,
      action: entry.action,
      cardsPlayed: entry.cardsPlayed ? [...entry.cardsPlayed] : null,
      combination: entry.combination,
      handBeforeTurn: [...entry.handBeforeTurn],
      handAfterTurn: [...entry.handAfterTurn],
      leadingMoveBeforeTurn: entry.leadingMoveBeforeTurn,
      isLeadMove: entry.isLeadMove,
      isChop: entry.isChop,
      choppedPlayerId: entry.choppedPlayerId,
      penaltyAmount: entry.penaltyAmount,
      botDecision: entry.botDecision
    };

    this.turns.push(turnRecord);
    this.notifyListeners();
  }

  /**
   * Lấy danh sách các lượt đánh trong ván đấu hiện tại (Real-time Live)
   */
  public getTurns(): MatchTurnLogEntry[] {
    return [...this.turns];
  }

  public getLiveTurnCount(): number {
    return this.turns.length;
  }

  /**
   * Hoàn tất ván đấu và tạo báo cáo MatchLogReport tổng kết
   */
  public finalizeMatch(params: FinalizeMatchParams): MatchLogReport {
    const endedAtTimestamp = Date.now();
    const durationMs = Math.max(0, endedAtTimestamp - (this.startedAtTimestamp || endedAtTimestamp));

    const winner = params.winners.length > 0 ? {
      id: params.winners[0].id,
      name: params.winners[0].name,
      rankPosition: params.winners[0].rankPosition || 1
    } : null;

    const playerSummaries: MatchPlayerSummary[] = params.players.map(p => {
      const initial = this.initialHands.get(p.id) || [];
      const payout = params.payouts[p.id] || 0;
      return {
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isBot: p.isBot,
        botPersonaId: p.botPersonaId || null,
        initialHand: [...initial],
        finalHand: [...p.hand],
        rankPosition: p.rankPosition || null,
        scoreDelta: payout
      };
    });

    const report: MatchLogReport = {
      matchId: this.currentMatchId || `match_${endedAtTimestamp}`,
      gameNumber: this.gameNumber,
      gameMode: this.gameMode,
      rules: this.rules || ({} as GameRules),
      startedAt: new Date(this.startedAtTimestamp || endedAtTimestamp).toISOString(),
      endedAt: new Date(endedAtTimestamp).toISOString(),
      durationMs,
      players: playerSummaries,
      winner,
      turns: [...this.turns],
      settlements: {
        payouts: { ...params.payouts },
        isThreeSpadesWin: params.isThreeSpadesWin,
        instantWinType: params.instantWinType,
        loanDeduction: params.loanDeduction,
        eloDelta: params.eloDelta
      }
    };

    this.latestFinalizedReport = report;
    this.notifyListeners();
    return report;
  }

  /**
   * Lấy báo cáo trận đấu gần nhất
   */
  public getLatestReport(): MatchLogReport | null {
    return this.latestFinalizedReport;
  }

  public getLatestFinalizedReport(): MatchLogReport | null {
    return this.latestFinalizedReport;
  }

  /**
   * Xuất báo cáo dạng chuỗi JSON định dạng đẹp
   */
  public exportToJsonString(report: MatchLogReport | null = null): string {
    const target = report || this.latestFinalizedReport || (this.turns.length > 0 ? this.generateInProgressReport() : null);
    if (!target) return JSON.stringify({ error: 'Không có dữ liệu trận đấu' }, null, 2);
    return JSON.stringify(target, null, 2);
  }

  /**
   * Xuất báo cáo dạng văn bản đọc được (Human-readable text format)
   */
  public exportToTextString(report: MatchLogReport | null = null): string {
    const target = report || this.latestFinalizedReport || (this.turns.length > 0 ? this.generateInProgressReport() : null);
    if (!target) return 'Không có dữ liệu trận đấu';

    const lines: string[] = [];
    lines.push('================================================================');
    lines.push(`🎮 NHẬT KÝ VÁN ĐẤU TIẾN LÊN MIỀN NAM - TRẬN #${target.gameNumber}`);
    lines.push(`Mã trận: ${target.matchId}`);
    lines.push(`Chế độ: ${target.gameMode} | Bắt đầu: ${target.startedAt} | Thời lượng: ${(target.durationMs / 1000).toFixed(1)}s`);
    lines.push('================================================================\n');

    lines.push('👥 DANH SÁCH NGƯỜI CHƠI & BÀI KHỞI ĐẦU:');
    target.players.forEach(p => {
      const handCodes = p.initialHand.map(c => c.code).join(' ');
      const resultText = p.rankPosition ? `Về Hạng ${p.rankPosition}` : 'Chưa về';
      const deltaText = p.scoreDelta >= 0 ? `+${p.scoreDelta.toLocaleString()}` : p.scoreDelta.toLocaleString();
      lines.push(`- [${p.id}] ${p.name} (${p.isBot ? 'Bot: ' + (p.botPersonaId || 'AI') : 'Người Chơi'}):`);
      lines.push(`  + Bài ban đầu (${p.initialHand.length} lá): [ ${handCodes} ]`);
      lines.push(`  + Kết quả: ${resultText} | Biến động Xu: ${deltaText} Xu\n`);
    });

    lines.push('📜 CHI TIẾT TỪNG LƯỢT ĐÁNH & SUY LUẬN AI:');
    lines.push('----------------------------------------------------------------');

    target.turns.forEach(t => {
      const timeStr = new Date(t.timestamp).toLocaleTimeString();
      const roleTag = t.isBot ? `🤖 [BOT: ${t.playerName}]` : `🤠 [BẠN: ${t.playerName}]`;
      const leadTag = t.isLeadMove ? ' [CẦM CÁI]' : '';
      const chopTag = t.isChop ? ` ⚔️ [CHẶT HEO/HÀNG: Phạt ${t.penaltyAmount?.toLocaleString()} Xu]` : '';

      lines.push(`\n[Lượt ${t.turnNumber} | Vòng ${t.roundNumber} | ${timeStr}] ${roleTag}${leadTag}${chopTag}`);
      lines.push(`  Bài trên tay trước lượt (${t.handBeforeTurn.length} lá): [ ${t.handBeforeTurn.map(c => c.code).join(' ')} ]`);

      if (t.leadingMoveBeforeTurn) {
        lines.push(`  Bài trên bàn cần đè: [ ${t.leadingMoveBeforeTurn.combination.cards.map(c => c.code).join(' ')} ] (${t.leadingMoveBeforeTurn.combination.type})`);
      } else {
        lines.push('  Bài trên bàn: Đang mở vòng mới (bàn trống)');
      }

      if (t.action === 'PLAY' && t.cardsPlayed) {
        lines.push(`  👉 HÀNH ĐỘNG: ĐÁNH [ ${t.cardsPlayed.map(c => c.code).join(' ')} ] (${t.combination?.type || 'COMBO'})`);
      } else {
        lines.push('  👉 HÀNH ĐỘNG: BỎ LƯỢT (PASS)');
      }

      if (t.botDecision) {
        lines.push('  🧠 SUY LUẬN CỦA BOT:');
        lines.push(`     • Lý do chính: ${t.botDecision.chosenReason || 'N/A'}`);
        lines.push(`     • Chiến thuật: ${t.botDecision.strategyUsed || 'N/A'}`);
        if (t.botDecision.heuristicScore !== null) {
          lines.push(`     • Điểm Heuristics: ${t.botDecision.heuristicScore}`);
        }
        if (t.botDecision.mctsWinRate !== null) {
          lines.push(`     • MCTS Tỷ Lệ Thắng: ${(t.botDecision.mctsWinRate * 100).toFixed(1)}% (${t.botDecision.mctsSimulations || 0} mô phỏng)`);
        }
        lines.push(`     • Thống kê bài: ${t.botDecision.handStrengthTwoCount} Heo, ${t.botDecision.handStrengthTrashCount} rác lẻ`);

        if (t.botDecision.topCandidates.length > 0) {
          lines.push('     • Các nước đi đã cân nhắc (Top Candidates):');
          t.botDecision.topCandidates.forEach((cand, idx) => {
            lines.push(`       ${idx + 1}. [ ${cand.cards.map(c => c.code).join(' ')} ] -> ${cand.score}đ (${cand.reasons.join(', ')})`);
          });
        }
      }
    });

    lines.push('\n================================================================');
    lines.push('🏆 KẾT QUẢ CHUNG CUỘC:');
    if (target.winner) {
      lines.push(`Người về Nhất: ${target.winner.name} (${target.winner.id})`);
    } else {
      lines.push('Ván đấu đang diễn ra hoặc chưa có kết quả.');
    }
    lines.push('================================================================');

    return lines.join('\n');
  }

  /**
   * Tạo báo cáo tạm thời cho trận đấu đang diễn ra
   */
  private generateInProgressReport(): MatchLogReport {
    const endedAtTimestamp = Date.now();
    const durationMs = Math.max(0, endedAtTimestamp - (this.startedAtTimestamp || endedAtTimestamp));

    return {
      matchId: this.currentMatchId || `match_${endedAtTimestamp}`,
      gameNumber: this.gameNumber,
      gameMode: this.gameMode,
      rules: this.rules || ({} as GameRules),
      startedAt: new Date(this.startedAtTimestamp || endedAtTimestamp).toISOString(),
      endedAt: new Date(endedAtTimestamp).toISOString(),
      durationMs,
      players: [],
      winner: null,
      turns: [...this.turns],
      settlements: {
        payouts: {},
        isThreeSpadesWin: false,
        instantWinType: null,
        loanDeduction: 0,
        eloDelta: 0
      }
    };
  }
}
