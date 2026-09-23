import React from 'react';
import { MatchPlayer, Card } from '../../engine/types';
import { formatCardVietnamese } from '../../engine/card';
import { HandSortMode } from '../../stores/useGameStore';
import { getAvailableSmartVariants } from '../../engine/hand-sorter';
import { resolveHandSortStrategy } from '../../engine/strategies/hand-sort-strategy';
import { useI18n } from '../../locales';
import { CardView } from './CardView';
import { Play, SkipForward, ArrowUpDown, ArrowDownToLine, Layers, Crosshair } from 'lucide-react';
import type { OpeningReason, ReconnectNotice } from '../../engine/network/network.schema';
import type { ChopNotificationInfo } from '../../engine/state-machine/types';

interface HandCardStyle extends React.CSSProperties {
  '--rot-deg'?: string;
}

export interface PlayerHandViewProps {
  readonly player: MatchPlayer;
  readonly selectedCardIds: ReadonlySet<string>;
  readonly onToggleCardSelect: (cardId: string) => void;
  readonly onClearCardSelection: () => void;
  readonly onPlaySelectedCards: () => void;
  readonly onPassTurn: () => void;
  readonly onAutoSort: () => void;
  readonly onQuickSelect: () => void;
  readonly canQuickSelect: boolean;
  readonly quickSelectCandidatesCount: number;
  readonly isCurrentTurn: boolean;
  readonly canPlay: boolean;
  readonly canPass: boolean;
  readonly isLeader: boolean;
  readonly isDealing: boolean;
  readonly dealtCardsCount: number;
  readonly isFirstMoveOfGame: boolean;
  readonly firstMoveRequiredCard: Card | null;
  readonly sortMode: HandSortMode;
  readonly variantIndex: number;
  readonly cardSize: 'sm' | 'md' | 'lg' | 'mobile';
  readonly reverseButtons: boolean;
  readonly quickResponseAssistEnabled: boolean;
  readonly dealBanner: string | null;
  readonly openingReason: OpeningReason | null;
  readonly chopNotification: ChopNotificationInfo | null;
  readonly reconnectNotice: ReconnectNotice | null;
}

const PlayerHandViewComponent: React.FC<PlayerHandViewProps> = ({
  player,
  selectedCardIds,
  onToggleCardSelect,
  onClearCardSelection,
  onPlaySelectedCards,
  onPassTurn,
  onAutoSort,
  onQuickSelect,
  canQuickSelect,
  quickSelectCandidatesCount,
  isCurrentTurn,
  canPlay,
  canPass,
  isLeader,
  isDealing,
  dealtCardsCount,
  isFirstMoveOfGame,
  firstMoveRequiredCard,
  sortMode,
  variantIndex,
  cardSize,
  reverseButtons,
  quickResponseAssistEnabled,
  dealBanner,
  openingReason,
  chopNotification,
  reconnectNotice,
}) => {
  const { t } = useI18n();
  const isReverseButtons = reverseButtons;

  const [reconnectRemainingSeconds, setReconnectRemainingSeconds] = React.useState<number>(0);

  React.useEffect(() => {
    if (!reconnectNotice) {
      setReconnectRemainingSeconds(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((reconnectNotice.deadline - Date.now()) / 1000));
      setReconnectRemainingSeconds(remaining);
    };
    update();
    const interval = setInterval(update, 500);
    return () => clearInterval(interval);
  }, [reconnectNotice]);

  const resolvedOpeningText = React.useMemo(() => {
    if (!dealBanner) return null;
    if (!openingReason) return dealBanner;
    const who = isLeader ? t('game.openingWhoYou') : t('game.openingWhoOpponent');
    switch (openingReason) {
      case 'THREE_SPADES':
        return t('game.openingBannerThreeSpades', { who: who });
      case 'SMALLEST_CARD':
        return t('game.openingBannerSmallestCard', { who: who });
      case 'PREVIOUS_WINNER':
        return t('game.openingBannerPreviousWinner', { who: who });
      default:
        return dealBanner;
    }
  }, [dealBanner, openingReason, isLeader, t]);

  const isMobileSize = cardSize === 'mobile';
  const visibleCardCount = isDealing ? dealtCardsCount : player.hand.length;
  const hand = React.useMemo(() => {
    return player.hand.slice(0, visibleCardCount);
  }, [player.hand, visibleCardCount]);

  const handCardsContentKey = React.useMemo(() => {
    return hand.map(c => c.id).sort().join(',');
  }, [hand]);

  const requiredCard = firstMoveRequiredCard ?? (isFirstMoveOfGame ? hand[0] ?? null : null);
  const hasRequiredCard = requiredCard !== null && hand.some(c => c.id === requiredCard.id);
  const isSelectedWithRequired = requiredCard !== null && Array.from(selectedCardIds).some(id => id === requiredCard.id);

  const isSmartMode = sortMode === 'SMART_GROUP';
  const availableVariants = React.useMemo(() => {
    return getAvailableSmartVariants(hand);
  }, [handCardsContentKey]);

  const totalVariants = availableVariants.length;
  const smartGroups = React.useMemo(() => {
    if (!isSmartMode || availableVariants.length === 0) return [];
    const safeIdx = Math.max(0, Math.min(variantIndex, availableVariants.length - 1));
    return availableVariants[safeIdx];
  }, [isSmartMode, variantIndex, availableVariants]);

  // Áp dụng Strategy Pattern để sắp xếp danh sách lá bài hiển thị (chỉ tính khi không ở SMART_GROUP vì SMART_GROUP hiển thị smartGroups)
  const sortedHand = React.useMemo(() => {
    if (isSmartMode) return hand;
    const strategy = resolveHandSortStrategy(sortMode);
    return strategy.sort(hand);
  }, [hand, sortMode, isSmartMode]);

  const currentStrategy = resolveHandSortStrategy(sortMode);
  // Xác định nhãn và tooltip của nút Xếp Bài khi xoay vòng:
  // Nếu có nhiều phương án xếp bộ (totalVariants > 1), hiển thị "Bộ 1", "Bộ 2", "Bộ 3",...
  // Nếu chỉ có 1 phương án xếp bộ, hiển thị "Xếp Bộ"
  let sortButtonLabel: string;
  let sortButtonTitle: string;

  if (isSmartMode) {
    if (totalVariants > 1) {
      sortButtonLabel = t('sort.comboVariant', { index: variantIndex + 1 });
      sortButtonTitle = t('sort.comboVariantTitle', { index: variantIndex + 1, total: totalVariants });
    } else {
      sortButtonLabel = t('sort.smartGroupLabel');
      sortButtonTitle = t('sort.smartGroupDesc');
    }
  } else {
    sortButtonLabel = currentStrategy.label;
    sortButtonTitle = currentStrategy.description;
  }

  const hasSelectedCards = selectedCardIds.size > 0;

  return (
    <div id={`seat-${player.id}`} className="relative flex flex-col items-center justify-end w-full pb-0.5 z-30 select-none overflow-visible">
      {/* KHU VỰC THÔNG BÁO NỔI - ZERO LAYOUT SHIFT (Tách khỏi document flow: h-0 overflow-visible để không bao giờ làm xê dịch UI) */}
      <div className="h-0 w-full flex items-center justify-center overflow-visible z-50 pointer-events-none select-none">
        <div
          className={`relative -top-9 sm:-top-11 flex flex-col items-center whitespace-nowrap transition-transform duration-200 ${
            hasSelectedCards ? '-translate-y-2 sm:-translate-y-3' : 'translate-y-0'
          }`}
        >
          {/* 1. Thông báo Chờ Kết Nối Lại (Grace Period Reconnect Notice) - Độ ưu tiên cao nhất */}
          {reconnectNotice && (
            <div className="animate-pulse shadow-2xl">
              <div className="flex items-center gap-2 px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-red-950 via-amber-950 to-red-950 text-amber-200 font-bold text-xs sm:text-sm tracking-wide border-2 border-amber-500/80">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                <span>
                  {t('online.reconnectWaitingBanner', {
                    name: reconnectNotice.playerName,
                    seconds: reconnectRemainingSeconds
                  })}
                </span>
              </div>
            </div>
          )}

          {/* 2. Thông báo Chặt Heo / Chặt Chồng (Chop Notification) */}
          {!reconnectNotice && chopNotification && chopNotification.visible && (
            <div className="animate-bounce shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white font-black text-xs sm:text-sm tracking-wider border-2 border-yellow-300">
                <span className="text-base">{chopNotification.isCascade ? '🔥' : '⚡'}</span>
                <span>
                  {chopNotification.isCascade
                    ? t('table.chopCascadeTitle', { chain: chopNotification.chainCount || 1 })
                    : t('table.chopSingleTitle')}
                </span>
                <span className="text-yellow-200 text-[10px] sm:text-xs font-semibold">
                  {t('table.chopDetail', {
                    chopper: chopNotification.chopperName,
                    amount: chopNotification.amount.toLocaleString(),
                    victim: chopNotification.targetName
                  })}
                </span>
              </div>
            </div>
          )}

          {/* 3. Banner Thông Báo Quyền Mở Màn / Lý do đi đầu ván đấu */}
          {!reconnectNotice && (!chopNotification || !chopNotification.visible) && resolvedOpeningText && (
            <div className="animate-bounce shadow-2xl">
              <div className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-xs sm:text-sm tracking-wide border-2 border-amber-200">
                <span className="text-sm sm:text-base">👑</span>
                <span>{resolvedOpeningText}</span>
              </div>
            </div>
          )}

          {/* 4. Thông báo hướng dẫn nước đi đầu tiên ván 1 */}
          {!reconnectNotice && (!chopNotification || !chopNotification.visible) && !resolvedOpeningText && !isDealing && isCurrentTurn && isFirstMoveOfGame && hasRequiredCard && requiredCard && (
            <div className="animate-fade-in shadow-xl">
              {selectedCardIds.size > 0 && !isSelectedWithRequired ? (
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-red-950 border border-red-500/70 text-red-300 text-[10px] sm:text-[11px] font-bold">
                  <span>⚠️</span>
                  <span>{t('game.firstMoveWarning', { card: formatCardVietnamese(requiredCard) })}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#0c3327] border border-[#d4af37]/70 text-[#f3e5ab] text-[10px] sm:text-[11px] font-bold">
                  <span>{requiredCard.suit === 'SPADES' ? '♠' : requiredCard.suit === 'CLUBS' ? '♣' : requiredCard.suit === 'DIAMONDS' ? '♦' : '♥'}</span>
                  <span>{t('game.firstMoveInstruction', { card: formatCardVietnamese(requiredCard) })}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bảng nút điều khiển hành động (Action Controls) - Z-Index 40, Khóa chiều cao cố định để không đẩy hand */}
      <div className="h-8 sm:h-10 flex items-center justify-center mb-3 sm:mb-5 z-40">
        {!isDealing && (isCurrentTurn || hasSelectedCards) ? (
          <div
            className={`flex items-center justify-center gap-1.5 sm:gap-2 z-40 transition-transform duration-200 ${
              hasSelectedCards ? '-translate-y-2 sm:-translate-y-3' : 'translate-y-0'
            } ${isReverseButtons ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Nhóm nút thao tác chính (Đánh bài, Bắt bài, Hạ bài, Xếp bài) */}
            <div className={`flex items-center ${isReverseButtons ? 'flex-row-reverse' : 'flex-row'} ${isMobileSize ? 'gap-1 px-1.5 py-0.5 rounded-xl border border-amber-500/50' : 'gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-2xl border-2 border-amber-500/60'} bg-[#0d1322] shadow-xl`}>
              {/* Các nút hành động khi đến lượt đi */}
              {isCurrentTurn && (
                <>
                  {/* Nút Đánh Bài */}
                  <button
                    onClick={onPlaySelectedCards}
                    disabled={!canPlay}
                    className={`
                      flex items-center gap-1 ${isMobileSize ? 'px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px]' : 'px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-xl text-xs sm:text-sm'} font-black uppercase tracking-wider transition-all duration-150 shadow-md
                      ${canPlay
                        ? 'bg-gradient-to-r from-[#f0cb64] via-[#d4af37] to-[#b08c23] hover:brightness-110 text-black hover:scale-105 shadow-[#d4af37]/40 cursor-pointer border border-amber-200'
                        : 'bg-[#182030] text-slate-500 cursor-not-allowed border border-white/5'
                      }
                    `}
                  >
                    <Play className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} fill-current`} />
                    <span>{t('game.playCard')}</span>
                  </button>

                  {/* Nút Bắt Bài (Tự động chọn nhanh tổ hợp vừa khít để đè bài trên bàn) */}
                  {quickResponseAssistEnabled && onQuickSelect && (
                    <button
                      onClick={onQuickSelect}
                      disabled={!canQuickSelect}
                      className={`
                        flex items-center gap-1 ${isMobileSize ? 'px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px]' : 'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs'} font-bold transition-all duration-150 shadow
                        ${canQuickSelect
                          ? 'bg-[#2e1808] hover:bg-[#40220a] text-amber-300 border border-amber-500/60 hover:border-amber-400 hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-[#182030] text-slate-500 cursor-not-allowed border border-white/5 opacity-50'
                        }
                      `}
                      title={
                        canQuickSelect
                          ? `${t('game.quickSelectTooltipReady', { action: isLeader ? t('game.quickSelectActionLead') : t('game.quickSelectActionBeat') })}${quickSelectCandidatesCount > 1 ? ` (${quickSelectCandidatesCount})` : ''}`
                          : t('game.quickSelectTooltipEmpty')
                      }
                    >
                      <Crosshair className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-amber-300`} />
                      <span>{t('game.quickSelect')}</span>
                    </button>
                  )}
                </>
              )}

              {/* Nút Hạ Bài (Xuất hiện khi có bài đang chọn) */}
              {hasSelectedCards && onClearCardSelection && (
                <button
                  onClick={onClearCardSelection}
                  className={`flex items-center gap-1 ${isMobileSize ? 'px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px]' : 'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs'} bg-[#1c2438] hover:bg-[#283450] text-[#f3e5ab] border border-amber-400/40 hover:scale-105 cursor-pointer font-bold shadow transition-all duration-150`}
                  title={t('game.clearSelectionTooltip')}
                >
                  <ArrowDownToLine className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-[#d4af37]`} />
                  <span>{t('game.clearSelection')} {selectedCardIds.size > 1 ? `(${selectedCardIds.size})` : ''}</span>
                </button>
              )}

              {/* Nút Xếp Bài: Xoay vòng đa phương án Xếp Bộ và Xếp Điểm */}
              <button
                onClick={onAutoSort}
                className={`flex items-center gap-1 ${isMobileSize ? 'px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px]' : 'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs'} bg-[#1c2438] hover:bg-[#283450] text-slate-300 border border-white/10 hover:scale-105 cursor-pointer font-bold transition-all duration-150`}
                title={sortButtonTitle}
              >
                {sortMode === 'NATURAL' ? (
                  <>
                    <ArrowUpDown className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-[#d4af37]`} />
                    <span>{sortButtonLabel}</span>
                  </>
                ) : (
                  <>
                    <Layers className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-[#d4af37]`} />
                    <span>{sortButtonLabel}</span>
                  </>
                )}
              </button>
            </div>

            {/* Nhóm nút Bỏ lượt riêng biệt - Nền đặc đỏ thẫm */}
            {isCurrentTurn && (
              <div className={`bg-[#0d1322] ${isMobileSize ? 'px-1 py-0.5 rounded-xl border border-red-500/50' : 'px-1.5 py-1 sm:py-1.5 rounded-2xl border-2 border-red-500/50'} shadow-2xl flex items-center`}>
                <button
                  onClick={onPassTurn}
                  disabled={!canPass}
                  className={`
                    flex items-center gap-1 ${isMobileSize ? 'px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px]' : 'px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-xl text-xs'} font-bold transition-all duration-150
                    ${canPass
                      ? 'bg-[#3b1219] hover:bg-[#521822] text-red-200 hover:text-white border border-red-500/70 hover:border-red-400 hover:scale-105 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                      : 'bg-[#182030]/60 text-slate-600 cursor-not-allowed border border-white/5 opacity-50'
                    }
                  `}
                  title={canPass ? t('game.passTurn') : ''}
                >
                  <SkipForward className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-red-400`} />
                  <span>{t('game.passTurn')}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Khi chưa tới lượt: Nút xếp bài với chiều cao cố định để tay bài không bị giật lên xuống */
          !isDealing && (
            <div className="flex items-center justify-center z-40">
              <button
                onClick={onAutoSort}
                className={`flex items-center gap-1 ${isMobileSize ? 'px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px]' : 'px-3 py-1 rounded-xl text-xs'} bg-[#1c2438]/80 hover:bg-[#283450] text-slate-300 border border-white/10 hover:scale-105 cursor-pointer font-bold transition-all shadow`}
                title={sortButtonTitle}
              >
                {sortMode === 'NATURAL' ? (
                  <>
                    <ArrowUpDown className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-[#d4af37]`} />
                    <span>{sortButtonLabel}</span>
                  </>
                ) : (
                  <>
                    <Layers className={`${isMobileSize ? 'w-2.5 h-2.5 sm:w-3 sm:h-3' : 'w-3.5 h-3.5'} text-[#d4af37]`} />
                    <span>{sortButtonLabel}</span>
                  </>
                )}
              </button>
            </div>
          )
        )}
      </div>

      {/* Dãy bài trên tay người chơi (Giữ nguyên z-index tự nhiên từ trái sang phải: 10 + index, Tự động scale vừa khít màn hình khi xếp nhiều bộ) */}
      {isSmartMode && smartGroups.length > 0 ? (
        <div className="w-full max-w-full flex items-end justify-center px-1 overflow-visible">
          <div 
            className={`
              relative flex items-center justify-center max-w-full transition-transform duration-200
              ${isMobileSize
                ? smartGroups.length >= 7
                  ? 'gap-1 scale-[0.82] sm:scale-[0.88] origin-bottom'
                  : smartGroups.length === 6
                    ? 'gap-1 sm:gap-1.5 scale-[0.88] sm:scale-[0.93] origin-bottom'
                    : smartGroups.length === 5
                      ? 'gap-1.5 sm:gap-2 scale-[0.94] sm:scale-100 origin-bottom'
                      : 'gap-2 sm:gap-3 scale-100 origin-bottom'
                : 'gap-3 sm:gap-5 scale-100 origin-bottom'
              }
            `}
          >
            {smartGroups.map((group, groupIdx) => (
              <div 
                key={group.id} 
                className={`
                  relative flex items-center shrink-0
                  ${isMobileSize 
                    ? smartGroups.length >= 5 
                      ? '-space-x-7 sm:-space-x-7.5' 
                      : '-space-x-6.5 sm:-space-x-7' 
                    : '-space-x-8'
                  }
                `}
              >
                {group.cards.map((card, cardIndex) => {
                  const isSelected = selectedCardIds.has(card.id);
                  const isKeyRequiredCard = isFirstMoveOfGame && isCurrentTurn && requiredCard !== null && card.id === requiredCard.id;
                  const rot = (cardIndex - (group.cards.length - 1) / 2) * 2;
                  const cardStyle: HandCardStyle = {
                    zIndex: 10 + cardIndex,
                    '--rot-deg': `${rot}deg`,
                    animationDelay: `${groupIdx * 40 + cardIndex * 20}ms`
                  };
                  return (
                    <div
                      key={card.id}
                      className={`zingplay-card-fan relative ${isKeyRequiredCard && !isSelected ? 'ring-2 ring-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.8)] rounded-lg' : ''}`}
                      style={cardStyle}
                    >
                      <CardView
                        card={card}
                        isSelected={isSelected}
                        isPlayable={!isDealing}
                        onCardClick={onToggleCardSelect}
                        size={isMobileSize ? 'mobile' : 'md'}
                        rotationDeg={rot}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={`relative flex items-center justify-center ${isMobileSize ? '-space-x-6 sm:-space-x-6.5' : '-space-x-8'} max-w-full overflow-x-visible px-2 py-0.5`}>
          {sortedHand.map((card, index) => {
            const isSelected = selectedCardIds.has(card.id);
            const isKeyRequiredCard = isFirstMoveOfGame && isCurrentTurn && requiredCard !== null && card.id === requiredCard.id;
            const rot = (index - (hand.length - 1) / 2) * 2;
            const cardStyle: HandCardStyle = {
              zIndex: 10 + index,
              '--rot-deg': `${rot}deg`,
              animationDelay: `${index * 25}ms`
            };
            return (
              <div
                key={card.id}
                className={`zingplay-card-fan relative ${isKeyRequiredCard && !isSelected ? 'ring-2 ring-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.8)] rounded-lg' : ''}`}
                style={cardStyle}
              >
                <CardView
                  card={card}
                  isSelected={isSelected}
                  isPlayable={!isDealing}
                  onCardClick={onToggleCardSelect}
                  size={isMobileSize ? 'mobile' : 'md'}
                  rotationDeg={rot}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const PlayerHandView = React.memo(PlayerHandViewComponent);

