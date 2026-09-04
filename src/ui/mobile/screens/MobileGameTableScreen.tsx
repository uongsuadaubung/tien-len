import React, { useState } from 'react';
import { getBotConfig } from '../../../ai/bot-factory';
import { BotSeat } from '../../components/BotSeat';
import { TableCenter } from '../../components/TableCenter';
import { DealingDeckAnimation } from '../../components/DealingDeckAnimation';
import { PlayerHandView } from '../../components/PlayerHandView';
import { BotReasoningHUD } from '../../web/components/BotReasoningHUD';
import { MobileMatchHUDDrawer } from '../components/MobileMatchHUDDrawer';
import { useIsMobile } from '../../hooks/useIsMobile';
import { lockToLandscape } from '../../utils/fullscreen';
import { useGameTableScreenLogic } from '../../hooks/useGameTableScreenLogic';

// Stores
import { useViewStore } from '../../../stores/useViewStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useGameStore } from '../../../stores/useGameStore';
import { useI18n } from '../../../locales';

// Icons
import { 
  Trophy,
  Settings, 
  Volume2, 
  VolumeX, 
  LogOut, 
  RotateCw,
  BarChart3
} from 'lucide-react';
import { Badge } from '../../primitives';

export interface MobileGameTableScreenProps {
  onPlaySelectedCards: () => void;
  onPassTurn: () => void;
  onAutoSort: () => void;
  onDealCard: (playerIndex: number, currentCardCount: number) => void;
  onDealComplete: () => void;
  onReturnToLobby: () => void;
}

export const MobileGameTableScreen: React.FC<MobileGameTableScreenProps> = ({
  onPlaySelectedCards,
  onPassTurn,
  onAutoSort,
  onDealCard,
  onDealComplete,
  onReturnToLobby
}) => {
  const { t } = useI18n();
  const [isMatchHudDrawerOpen, setIsMatchHudDrawerOpen] = useState<boolean>(false);
  const [isReasoningHudOpen, setIsReasoningHudOpen] = useState<boolean>(false);

  const { isPortrait } = useIsMobile();
  const { openModal } = useViewStore();

  const {
    soundEnabled,
    quickResponseAssistEnabled,
    botReasoningLogEnabled,
    toggleSound
  } = useSettingsStore();

  const {
    players,
    gameNumber,
    gameSettings,
    selectedCardIds,
    handSortMode,
    smartVariantIndex,
    myPlayerId,
    toggleCardSelect,
    clearCardSelection
  } = useGameStore();

  const {
    p0,
    isMyTurn,
    isValidPlaySelection,
    canP0Pass,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    topBot,
    leftBot,
    rightBot,
    topBotPersonaId,
    topBotCustomConfig,
    quickSelectCandidates,
    canQuickSelect,
    handleQuickSelect,
    handlePlayCards,
    handlePassTurnAction,
    isDealing,
    dealtCounts,
    dealBanner,
    currentTurnPlayerId,
    leadPlayerId,
    currentMove,
    chopNotification,
    botThinkingThought,
    isLeadMove,
    isFirstMoveOfGame
  } = useGameTableScreenLogic({
    onPlaySelectedCards,
    onPassTurn
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[radial-gradient(ellipse_at_center,#141926_0%,#090c12_100%)] flex flex-col justify-between select-none">
      
      {/* OVERLAY BẮT BUỘC XOAY NGANG MÀN HÌNH NẾU ĐANG CẦM DỌC TRÊN MOBILE */}
      {isPortrait && (
        <div className="absolute inset-0 z-[999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 animate-spin-slow">
            <RotateCw className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-amber-300 mb-2">{t('hud.rotateDeviceTitle')}</h2>
          <p className="text-sm text-slate-300 max-w-xs mb-6">
            {t('hud.rotateDeviceDesc')}
          </p>
          <button
            onClick={() => lockToLandscape()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-transform flex items-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            {t('hud.rotateDeviceBtn')}
          </button>
        </div>
      )}

      {/* TOP HEADER BAR SLIM CHO MOBILE LANDSCAPE (TỐI GIẢN TỐI ĐA CHIỀU CAO) */}
      <header className="relative z-40 w-full px-3 py-1 flex items-center justify-between border-b border-white/5 bg-slate-950/60 backdrop-blur-md shrink-0 h-9">
        {/* Góc Trái: Thông tin phòng & Ván */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold text-xs">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('hud.gameNumber', { number: gameNumber })}</span>
          </div>

          <Badge variant="neutral" size="sm" className="hidden sm:inline-flex text-[11px] font-medium text-slate-300 border-white/10">
            {gameSettings.mode === 'COUNT_CARDS' ? t('modes.countCards') : gameSettings.mode === 'WINNER_TAKES_ALL' ? t('modes.winnerTakesAll') : t('modes.traditional')}
          </Badge>

          <span className="text-xs font-bold text-amber-400">
            {t('victory.betAmountLabel', { amount: gameSettings.betAmount.toLocaleString() })}
          </span>
        </div>

        {/* Góc Phải: Các nút điều khiển nhanh */}
        <div className="flex items-center gap-1">
          {/* Nút mở Quân Sư AI & Lịch sử ván */}
          <button
            onClick={() => setIsMatchHudDrawerOpen(true)}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white active:scale-95 transition-transform"
            title={t('header.aiAdvisorTooltip')}
          >
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Bật/Tắt Âm Thanh */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white active:scale-95 transition-transform"
            title={soundEnabled ? t('header.soundOffTooltip') : t('header.soundOnTooltip')}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Cài Đặt */}
          <button
            onClick={() => openModal('SETTINGS')}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white active:scale-95 transition-transform"
            title={t('header.matchSettingsTooltip')}
          >
            <Settings className="w-4 h-4 text-slate-300" />
          </button>

          {/* Về Sảnh (Xác nhận thoát trận) */}
          <button
            onClick={onReturnToLobby}
            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:text-rose-200 active:scale-95 transition-transform"
            title={t('header.leaveRoomTooltip')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* BANNER THÔNG BÁO QUYỀN ĐI ĐẦU VÁN ĐẤU (COMPACT BANNER) */}
      {dealBanner && (
        <div className="absolute top-11 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-slate-950 font-bold px-4 py-1 rounded-full shadow-lg border border-amber-300 animate-bounce pointer-events-none text-xs tracking-wide">
          {dealBanner}
        </div>
      )}

      {/* BOTTOM SHEET / DRAWER: QUÂN SƯ AI & PHÂN TÍCH DIỄN BIẾN TRẬN ĐẤU */}
      <MobileMatchHUDDrawer
        isOpen={isMatchHudDrawerOpen}
        onClose={() => setIsMatchHudDrawerOpen(false)}
        players={players}
        currentTurnPlayerId={currentTurnPlayerId}
        leadPlayerId={leadPlayerId}
        gameNumber={gameNumber}
        betAmount={gameSettings.betAmount}
        isDealing={isDealing}
        dealtCounts={dealtCounts}
        customBotConfigs={customBotConfigs}
      />

      {/* HUD GÓC PHẢI: LOGIC SUY LUẬN REAL-TIME CỦA BOT */}
      {botReasoningLogEnabled && (
        <BotReasoningHUD
          isOpen={isReasoningHudOpen}
          onToggle={() => setIsReasoningHudOpen(prev => !prev)}
          gameNumber={gameNumber}
          betAmount={gameSettings.betAmount}
          isDealing={isDealing}
        />
      )}

      {/* KHÔNG GIAN BÀN ĐẤU MOBILE LANDSCAPE (TỐI ƯU HÓA KHÔNG GIAN DỌC CHO BÀI NGƯỜI CHƠI) */}
      <main className="relative flex-1 w-full flex flex-col justify-between items-center px-2 py-0 overflow-hidden">
        {/* GHẾ TRÊN: BOT ĐỐI DIỆN */}
        <div className="w-full flex justify-center z-20 shrink-0">
          {topBot && (
            <BotSeat
              player={topBot}
              botConfig={getBotConfig(topBotPersonaId, topBotCustomConfig || undefined)}
              isCurrentTurn={currentTurnPlayerId === topBot.id}
              position="top"
              isLeader={leadPlayerId === topBot.id}
              isDealing={isDealing}
              displayCardCount={dealtCounts[topBot.id]}
              thoughtText={botThinkingThought?.botId === topBot.id ? botThinkingThought.text : null}
              size="compact"
            />
          )}
        </div>

        {/* TRỤC GIỮA: GHẾ TRÁI + TRUNG TÂM BÀN TRÒN + GHẾ PHẢI (NGỒI SÁT CẠNH BÀN) */}
        <div className="w-full flex-1 flex justify-center items-center gap-2 sm:gap-4 z-10 px-1 my-auto overflow-visible min-h-[140px]">
          {/* Ghế Trái: Bot 1 */}
          <div className="flex justify-center shrink-0">
            {leftBot && (
              <BotSeat
                player={leftBot}
                botConfig={getBotConfig(botPersonaIds[0], customBotConfigs[0] || undefined)}
                isCurrentTurn={currentTurnPlayerId === leftBot.id}
                position="left"
                isLeader={leadPlayerId === leftBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[leftBot.id]}
                thoughtText={botThinkingThought?.botId === leftBot.id ? botThinkingThought.text : null}
                size="compact"
              />
            )}
          </div>

          {/* BÀN TRÒN TRUNG TÂM */}
          <div className="round-table relative z-30 flex items-center justify-center p-2 sm:p-4 shadow-2xl shrink-0 overflow-visible">
            <div className="table-inner-felt">
              <div className="table-center-emblem">
                <span className="text-[#d4af37]/20 font-black text-[9px] sm:text-[11px] uppercase tracking-[0.25em] select-none text-center">
                  {t('table.emblem')}
                </span>
              </div>
            </div>

            {/* Animation chia bài */}
            {isDealing && (
              <DealingDeckAnimation
                isDealing={isDealing}
                playerCount={playerCount}
                players={players}
                onDealCard={onDealCard}
                onDealComplete={onDealComplete}
                onSkip={onDealComplete}
              />
            )}

            {/* Trung Tâm Bàn Tròn: Bài đã đánh & Thông báo chặt đẹp */}
            <div className="relative z-30 w-full flex justify-center overflow-visible">
              <TableCenter
                currentMove={currentMove}
                isLeadMove={isLeadMove}
                chopNotification={chopNotification}
                isDealing={isDealing}
                cardSize="table"
              />
            </div>
          </div>

          {/* Ghế Phải: Bot 3 */}
          <div className="flex justify-center shrink-0">
            {rightBot && (
              <BotSeat
                player={rightBot}
                botConfig={getBotConfig(botPersonaIds[2], customBotConfigs[2] || undefined)}
                isCurrentTurn={currentTurnPlayerId === rightBot.id}
                position="right"
                isLeader={leadPlayerId === rightBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[rightBot.id]}
                thoughtText={botThinkingThought?.botId === rightBot.id ? botThinkingThought.text : null}
                size="compact"
              />
            )}
          </div>
        </div>

        {/* GHẾ DƯỚI: TAY BÀI VÀ CÁC NÚT ĐIỀU KHIỂN CỦA NGƯỜI CHƠI (P0, FULL THÂN BÀI 100%) */}
        <div className="w-full flex justify-center z-30 mb-0 overflow-visible shrink-0">
          {p0 && (
            <PlayerHandView
              player={p0}
              selectedCardIds={selectedCardIds}
              onToggleCardSelect={toggleCardSelect}
              onClearCardSelection={clearCardSelection}
              onPlaySelectedCards={handlePlayCards}
              onPassTurn={handlePassTurnAction}
              onAutoSort={onAutoSort}
              onQuickSelect={quickResponseAssistEnabled ? handleQuickSelect : null}
              canQuickSelect={quickResponseAssistEnabled ? canQuickSelect : false}
              quickSelectCandidatesCount={quickSelectCandidates.length}
              isCurrentTurn={isMyTurn}
              canPlay={isValidPlaySelection}
              canPass={canP0Pass}
              isLeader={leadPlayerId === myPlayerId}
              isDealing={isDealing}
              dealtCardsCount={dealtCounts[myPlayerId]}
              isFirstMoveOfGame={isFirstMoveOfGame}
              sortMode={handSortMode}
              variantIndex={smartVariantIndex}
              cardSize="mobile"
            />
          )}
        </div>
      </main>
    </div>
  );
};
