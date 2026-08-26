import React, { useState, useEffect, useRef } from 'react';
import { 
  BrainCircuit, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Zap
} from 'lucide-react';
import { MatchLogger, MatchTurnLogEntry, BotCandidateEvaluation } from '../../engine/match-logger';
import { Card as CardType } from '../../engine/types';
import { Badge, Button } from '../primitives';

interface BotReasoningHUDProps {
  isOpen: boolean;
  onToggle: () => void;
  gameNumber: number;
  betAmount: number;
  isDealing: boolean;
}

export const BotReasoningHUD: React.FC<BotReasoningHUDProps> = ({
  isOpen,
  onToggle,
  gameNumber,
  betAmount,
  isDealing
}) => {
  const [turns, setTurns] = useState<MatchTurnLogEntry[]>([]);
  const [expandedTurnIndex, setExpandedTurnIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Đăng ký nhận dữ liệu lượt đánh theo thời gian thực từ MatchLogger
    const unsubscribe = MatchLogger.getInstance().subscribeToTurns((updatedTurns: MatchTurnLogEntry[]) => {
      setTurns(updatedTurns);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Tự động cuộn xuống lượt đánh mới nhất
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length, isOpen]);

  const handleExportJson = () => {
    const jsonStr = MatchLogger.getInstance().exportToJsonString();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tienlen_bot_reasoning_game${gameNumber}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const latestTurn = turns.length > 0 ? turns[turns.length - 1] : null;
  const latestBotDecision = latestTurn?.botDecision || null;

  return (
    <div
      className={`right-bot-reasoning-hud-container ${isOpen ? '' : 'collapsed'}`}
      style={{
        top: '50%',
        right: '12px',
        transform: isOpen ? 'translateY(-50%)' : 'translate(calc(100% - 36px), -50%)'
      }}
    >
      {/* NÚT TAY CẦM MỞ / ĐÓNG HUD BÊN TRÁI PANEL */}
      <button
        onClick={onToggle}
        className="flex flex-col items-center justify-center py-3 px-1.5 bg-[var(--bg-container)] border border-[var(--border-container)] rounded-l-xl shadow-2xl hover:bg-[var(--bg-card-active)] transition-all cursor-pointer select-none text-[var(--color-gold)] group z-50 mr-[-1px]"
        title={isOpen ? 'Thu gọn Bảng Suy Luận' : 'Mở Bảng Suy Luận Bot AI'}
      >
        <BrainCircuit className="w-5 h-5 group-hover:scale-110 transition-transform text-[var(--color-gold)] animate-pulse" />
        <span className="text-[9px] font-extrabold uppercase mt-1 [writing-mode:vertical-lr] tracking-widest text-[var(--text-primary)]">
          {isOpen ? 'ĐÓNG' : 'SUY LUẬN AI'}
        </span>
        {turns.length > 0 && (
          <span className="mt-1.5 px-1 py-0.5 rounded-full bg-[var(--color-gold)] text-[#0a0c0e] text-[8px] font-black">
            {turns.length}
          </span>
        )}
        <div className="mt-1 text-[var(--text-muted)] group-hover:text-[var(--color-gold)]">
          {isOpen ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* BẢNG HUD SUY LUẬN CHÍNH */}
      <div className="w-[330px] sm:w-[360px] max-h-[82vh] bg-[var(--bg-container)]/95 backdrop-blur-md border border-[var(--border-container)] rounded-2xl shadow-2xl p-3 text-[var(--text-primary)] flex flex-col gap-2.5">
        {/* Header HUD */}
        <div className="flex items-center justify-between border-b border-[var(--border-container)] pb-2 px-0.5 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <BrainCircuit className="w-4 h-4 text-[var(--color-gold)]" />
            <span className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">
              Suy Luận AI (Live)
            </span>
            <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold">
              Ván #{gameNumber}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleExportJson}
              title="Xuất JSON log"
              className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--color-gold)] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* NƯỚC ĐI GẦN NHẤT & LÝ DO TRỌNG TÂM */}
        {latestTurn && latestBotDecision && (
          <div className="p-2.5 rounded-xl bg-[var(--bg-card-active)] border border-[var(--color-gold-border)] shadow-md flex-shrink-0">
            <div className="flex items-center justify-between text-[10px] text-[var(--color-gold)] font-bold uppercase mb-1">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-[var(--color-gold)] animate-bounce" />
                Vừa Ra Quyết Định (#{latestTurn.turnNumber}):
              </span>
              <span>{latestTurn.playerName}</span>
            </div>
            <div className="text-xs font-semibold text-[var(--text-primary)]">
              💡 {latestBotDecision.chosenReason || 'Đánh bài theo chiến thuật'}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>Chiến thuật: <strong className="text-[var(--color-gold)]">{latestBotDecision.strategyUsed || 'N/A'}</strong></span>
              {latestBotDecision.heuristicScore !== null && (
                <span>Điểm: <strong className="text-emerald-400">+{latestBotDecision.heuristicScore}</strong></span>
              )}
            </div>
          </div>
        )}

        {/* DANH SÁCH TOÀN BỘ CÁC LƯỢT ĐÁNH TRONG TRẬN (SCROLLABLE TIMELINE) */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto max-h-[50vh] space-y-2 pr-1 text-xs"
        >
          {turns.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] italic">
              {isDealing ? 'Đang chia bài...' : 'Chưa có lượt đánh nào. Bắt đầu ván đấu để xem suy luận!'}
            </div>
          ) : (
            turns.map((turn: MatchTurnLogEntry, index: number) => {
              const isExpanded = expandedTurnIndex === index;
              const isPlay = turn.action === 'PLAY';
              const playedCardsText = turn.cardsPlayed && turn.cardsPlayed.length > 0
                ? turn.cardsPlayed.map((c: CardType) => c.code).join(' ')
                : '';

              return (
                <div
                  key={index}
                  className={`p-2 rounded-xl border transition-all text-left ${
                    turn.isBot
                      ? 'bg-[var(--bg-canvas)] border-[var(--border-container)]'
                      : 'bg-[var(--bg-container)] border-blue-500/30'
                  }`}
                >
                  {/* Dòng tóm tắt lượt */}
                  <div
                    className="flex items-center justify-between cursor-pointer select-none"
                    onClick={() => setExpandedTurnIndex(isExpanded ? null : index)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1 py-0.2 rounded bg-[var(--bg-container)] border border-[var(--border-container)] text-[9px] font-mono text-[var(--color-gold)] flex-shrink-0">
                        #{turn.turnNumber}
                      </span>
                      <span className="font-bold text-[11px] text-[var(--text-primary)] truncate max-w-[90px]">
                        {turn.playerName} {turn.isBot && '🤖'}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex-shrink-0 ${
                          isPlay
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        }`}
                      >
                        {isPlay ? `[ ${playedCardsText} ]` : 'BỎ LƯỢT'}
                      </span>
                      {turn.isChop && (
                        <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-bold flex-shrink-0">
                          ⚔️ Chặt
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] flex-shrink-0">
                      <span>Còn {turn.handAfterTurn.length} lá</span>
                      {turn.botDecision && (
                        isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </div>

                  {/* Lý do vắn tắt khi đóng */}
                  {turn.botDecision && !isExpanded && (
                    <div className="mt-1 text-[10px] text-[var(--text-muted)] truncate pl-1 border-l-2 border-l-[var(--color-gold)]">
                      💡 <span className="text-[var(--text-primary)]">{turn.botDecision.chosenReason || 'Đánh bài theo chiến thuật'}</span>
                    </div>
                  )}

                  {/* Chi tiết suy luận khi mở rộng */}
                  {turn.botDecision && isExpanded && (
                    <div className="mt-2 pt-2 border-t border-[var(--border-container)] space-y-1.5 text-[10px]">
                      <div>
                        <span className="text-[var(--text-muted)]">💡 Lý do: </span>
                        <span className="font-semibold text-[var(--text-primary)]">{turn.botDecision.chosenReason}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1 text-[9px] bg-[var(--bg-container)] p-1.5 rounded border border-[var(--border-container)]">
                        <div>
                          <span className="text-[var(--text-muted)] block">Chiến thuật:</span>
                          <span className="font-bold text-[var(--color-gold)] truncate">{turn.botDecision.strategyUsed || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block">Điểm Heuristic:</span>
                          <span className="font-bold text-emerald-400">
                            {turn.botDecision.heuristicScore !== null ? `+${turn.botDecision.heuristicScore} pts` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block">MCTS Winrate:</span>
                          <span className="font-bold text-cyan-400">
                            {turn.botDecision.mctsWinRate !== null ? `${(turn.botDecision.mctsWinRate * 100).toFixed(0)}%` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[var(--text-muted)] block">Số lá Heo/Rác:</span>
                          <span className="font-bold text-[var(--text-primary)]">
                            {turn.botDecision.handStrengthTwoCount} Heo | {turn.botDecision.handStrengthTrashCount} Rác
                          </span>
                        </div>
                      </div>

                      {/* Top ứng viên đã cân nhắc */}
                      {turn.botDecision.topCandidates.length > 0 && (
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase block">
                            Top Nước Đi Đã Đánh Giá:
                          </span>
                          <div className="space-y-0.5">
                            {turn.botDecision.topCandidates.map((cand: BotCandidateEvaluation, cIdx: number) => (
                              <div
                                key={cIdx}
                                className="flex items-center justify-between p-1 rounded bg-[var(--bg-container)] border border-[var(--border-container)] text-[9px]"
                              >
                                <span className="font-mono font-bold text-[var(--color-gold)]">
                                  [ {cand.cards.map((c: CardType) => c.code).join(' ')} ]
                                </span>
                                <span className="text-[var(--text-muted)] truncate max-w-[140px]">
                                  {cand.reasons.join(', ')}
                                </span>
                                <span className={`font-bold ${cand.score > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {cand.score > 0 ? `+${cand.score}` : cand.score}đ
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-[9px] text-[var(--text-muted)] flex items-center justify-between pt-1 border-t border-[var(--border-container)]">
                        <span>Bài trước lượt: [ {turn.handBeforeTurn.map((c: CardType) => c.code).join(' ')} ]</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
