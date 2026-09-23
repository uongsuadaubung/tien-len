import React, { useCallback } from 'react';
import { MatchPlayer } from '../../engine/types';
import { getBotConfig } from '../../ai/bot-factory';
import { isBotConfig } from '../../ai/types';
import { createCampaignBotEntity } from '../../engine/campaign';
import { useEcosystemStore } from '../../stores/useEcosystemStore';
import { useViewStore } from '../../stores/useViewStore';
import { useGameStore } from '../../stores/useGameStore';
import { useI18n } from '../../locales';

export interface BotSeatProps {
  player: MatchPlayer;
  isCurrentTurn: boolean;
  position: 'left' | 'top' | 'right';
  isLeader: boolean;
  displayCardCount: number | null;
  isDealing: boolean;
  thoughtText: string | null;
  cardFanPlacement: 'bottom' | 'side';
  cardScale: 'normal' | 'large';
}

const BotSeatComponent: React.FC<BotSeatProps> = ({
  player,
  isCurrentTurn,
  position = 'top',
  isLeader,
  displayCardCount,
  isDealing,
  thoughtText,
  cardFanPlacement,
  cardScale
}) => {
  const { t } = useI18n();
  const rankPosition = useGameStore(
    useCallback(state => {
      // Chỉ tính thứ hạng vinh danh khi ván đấu đã kết thúc (GAME_OVER / INSTANT_WIN)
      if (!state.isGameOver) return 0;
      const idx = state.winners.findIndex(w => w.id === player.id);
      return idx >= 0 ? idx + 1 : 0;
    }, [player.id])
  );

  const handleInspectBot = () => {
    if (!player.isBot) return;
    const botConfig = isBotConfig(player.customBotConfig) 
      ? player.customBotConfig 
      : getBotConfig(player.botPersonaId, player.customBotConfig);
    const ecosystemBots = useEcosystemStore.getState().bots;
    const botEntity = ecosystemBots.find(b => b.id === botConfig.id || b.name === botConfig.name || b.name === player.name) 
      ?? createCampaignBotEntity(botConfig, ecosystemBots);
    useEcosystemStore.getState().setSelectedBot(botEntity);
    useViewStore.getState().openModal({ type: 'BOT_PROFILE', bot: botEntity });
  };

  const cardCount = isDealing 
    ? (displayCardCount ?? 0) 
    : player.cardCount;
  const visibleCards = Math.min(13, cardCount);
  const isRightSeat = position === 'right';
  const isCardsBottom = cardFanPlacement === 'bottom';
  const isLargeCard = cardScale === 'large';

  // Hộp thông tin Bot (Avatar, Cầm Cái, Tên, Số lá bài)
  const botInfoBox = (
    <div
      onClick={handleInspectBot}
      className={`
        flex items-center gap-1.5 px-1.5 py-0.5 rounded-xl border transition-all duration-150 cursor-pointer shadow-lg shrink-0
        ${isCurrentTurn
          ? 'bg-[#182030] border-[#d4af37] ring-2 ring-[#d4af37]/60 shadow-[#d4af37]/25 scale-105'
          : 'bg-[#0e1422]/90 border-[#222c3d] hover:border-amber-500/40'
        }
        ${player.isPassedCurrentRound ? 'opacity-60 grayscale' : ''}
      `}
      title={t('bot.inspectTitle', { name: player.name })}
    >
      {/* Avatar nhỏ */}
      <div className="relative shrink-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#141b2b] border border-[#2a3449] flex items-center justify-center text-lg sm:text-xl leading-none shadow-inner">
          <span className="emoji-avatar">{player.avatar}</span>
        </div>

        {isLeader && (
          <div className="absolute -top-1 -right-1 bg-amber-500 text-black text-[7px] sm:text-[8px] font-black px-1 rounded-full shadow">
            {t('bot.leader')}
          </div>
        )}

        {rankPosition > 0 && (
          <div className="absolute -bottom-1 -right-1 text-[7px] sm:text-[8px] font-black px-1 rounded-full bg-amber-500 text-black shadow">
            {rankPosition === 1 ? '🥇' : rankPosition === 2 ? '🥈' : rankPosition === 3 ? '🥉' : '💥'}
          </div>
        )}
      </div>

      {/* Tên & Số lá bài (nằm ngang) */}
      <div className="flex flex-col min-w-0 pr-0.5 text-left">
        <span className="text-[10px] sm:text-xs font-bold text-zinc-100 truncate max-w-[65px] sm:max-w-[85px] leading-tight">
          {player.name}
        </span>

        {player.isPassedCurrentRound ? (
          <span className="text-[8px] sm:text-[9px] font-black text-rose-400">{t('bot.passed')}</span>
        ) : rankPosition > 0 ? (
          <span className="text-[8px] sm:text-[9px] font-black text-amber-400">
            {rankPosition === 1 ? t('victory.rank1') : rankPosition === 2 ? t('victory.rank2') : rankPosition === 3 ? t('victory.rank3') : t('victory.rank4')}
          </span>
        ) : cardCount > 0 ? (
          <span className={`text-[8px] sm:text-[9px] font-extrabold px-1 rounded text-center leading-tight mt-0.5 ${
            cardCount === 1 
              ? 'bg-rose-950 text-rose-300 border border-rose-500 animate-bounce' 
              : 'bg-[#141b2b] text-amber-300 border border-amber-500/30'
          }`}>
            {cardCount} {t('bot.cardsUnit')}
          </span>
        ) : null}
      </div>
    </div>
  );

  // Dãy bài úp xòe quạt
  const cardFanElement = cardCount > 0 && rankPosition === 0 ? (
    <div
      className={`flex items-center ${
        isLargeCard
          ? '-space-x-[23px] sm:-space-x-[27px] mt-1.5'
          : isCardsBottom 
            ? '-space-x-3 sm:-space-x-3.5 mt-1' 
            : '-space-x-2.5 sm:-space-x-3'
      } pointer-events-none transition-transform px-1 ${
        isCurrentTurn ? 'scale-105 drop-shadow-[0_0_8px_rgba(212,175,55,0.45)]' : ''
      }`}
      title={t('bot.holdingCards', { name: player.name, count: cardCount })}
    >
      {Array.from({ length: visibleCards }).map((_, i) => {
        const rot = (i - (visibleCards - 1) / 2) * (isCardsBottom ? 3 : 2.5);
        const translateY = isCardsBottom ? Math.abs(rot) * (isLargeCard ? 0.35 : 0.25) : 0;
        const isTopCard = i === visibleCards - 1;
        return (
          <div
            key={i}
            className={`
              ${isLargeCard
                ? 'w-[30px] h-[44px] sm:w-[36px] sm:h-[52px] rounded-[4px] sm:rounded-[5px]'
                : isCardsBottom 
                  ? 'w-5 h-[30px] sm:w-[22px] sm:h-[32px] rounded-[3px] sm:rounded-[4px]' 
                  : 'w-4 h-[24px] sm:w-[18px] sm:h-[26px] rounded-[3px]'
              }
              bg-gradient-to-br from-[#1c2638] via-[#141d2c] to-[#0a101a] border border-[#d4af37] shadow-md flex items-center justify-center shrink-0
            `}
            style={{
              transform: `rotate(${rot}deg) translateY(${translateY}px)`,
              zIndex: i + 1
            }}
          >
            {isTopCard && (
              <span className={`
                ${isLargeCard
                  ? 'text-xs sm:text-sm'
                  : isCardsBottom 
                    ? 'text-[9px] sm:text-[10px]' 
                    : 'text-[7px]'
                } text-[#d4af37] font-black drop-shadow
              `}>
                ♠
              </span>
            )}
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div
      id={`seat-${player.id}`}
      className="relative flex items-center justify-center z-20 select-none"
    >
      {/* Bong bóng suy nghĩ động (Thought Bubble) */}
      {Boolean(thoughtText) && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#121826] text-[#f3e5ab] text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-full border border-[#d4af37] shadow-xl animate-pulse flex items-center gap-1 z-30 pointer-events-none">
          <span>{thoughtText}</span>
        </div>
      )}

      {isCardsBottom ? (
        <div className="flex flex-col items-center justify-center gap-1">
          {botInfoBox}
          {cardFanElement}
        </div>
      ) : (
        <div className={`flex items-center gap-1.5 ${isRightSeat ? 'flex-row-reverse' : 'flex-row'}`}>
          {botInfoBox}
          {cardFanElement}
        </div>
      )}
    </div>
  );
};

export const BotSeat = React.memo(BotSeatComponent);

