import React, { useState } from 'react';
import { HeaderBar } from '../../components/HeaderBar';
import { LeftMatchHUD } from '../components/LeftMatchHUD';
import { BotReasoningHUD } from '../components/BotReasoningHUD';
import { BotSeat } from '../../components/BotSeat';
import { TableCenter } from '../../components/TableCenter';
import { DealingDeckAnimation } from '../../components/DealingDeckAnimation';
import { PlayerHandView } from '../../components/PlayerHandView';
import { useGameTableScreenLogic } from '../../hooks/useGameTableScreenLogic';
import { useI18n } from '../../../locales';

// Stores
import { useViewStore } from '../../../stores/useViewStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useGameStore } from '../../../stores/useGameStore';
import { useShallow } from 'zustand/react/shallow';

export interface WebGameTableScreenProps {
  onPlaySelectedCards: () => void;
  onPassTurn: () => void;
  onAutoSort: () => void;
  onDealCard: (playerIndex: number, currentCardCount: number) => void;
  onDealComplete: () => void;
  onReturnToLobby: () => void;
}

export const WebGameTableScreen: React.FC<WebGameTableScreenProps> = ({
  onPlaySelectedCards,
  onPassTurn,
  onAutoSort,
  onDealCard,
  onDealComplete,
  onReturnToLobby
}) => {
  const { t } = useI18n();
  const [isMatchHudOpen, setIsMatchHudOpen] = useState<boolean>(true);
  const [isReasoningHudOpen, setIsReasoningHudOpen] = useState<boolean>(false);
  const { openModal } = useViewStore();
  const {
    soundEnabled,
    aiHintEnabled,
    quickResponseAssistEnabled,
    xrayEnabled,
    botReasoningLogEnabled,
    reverseButtonsEnabled,
    toggleSound
  } = useSettingsStore(useShallow(s => ({
    soundEnabled: s.soundEnabled,
    aiHintEnabled: s.aiHintEnabled,
    quickResponseAssistEnabled: s.quickResponseAssistEnabled,
    xrayEnabled: s.xrayEnabled,
    botReasoningLogEnabled: s.botReasoningLogEnabled,
    reverseButtonsEnabled: s.reverseButtonsEnabled,
    toggleSound: s.toggleSound
  })));

  const {
    players,
    gameNumber,
    gameSettings,
    activeGameType,
    selectedCardIds,
    handSortMode,
    smartVariantIndex
  } = useGameStore(useShallow(s => ({
    players: s.players,
    gameNumber: s.gameNumber,
    gameSettings: s.gameSettings,
    activeGameType: s.activeGameType,
    selectedCardIds: s.selectedCardIds,
    handSortMode: s.handSortMode,
    smartVariantIndex: s.smartVariantIndex
  })));

  const {
    localPlayer,
    isMyTurn,
    isValidPlaySelection,
    canPassTurn,
    playerCount,
    topBot,
    leftBot,
    rightBot,
    quickSelectCandidatesCount,
    canQuickSelect,
    activeAiHint,
    handleQuickSelect,
    handlePlayCards,
    handlePassTurnAction,
    handleOpenXRay,
    handleToggleCardSelect,
    handleClearCardSelection,
    isDealing,
    dealtCounts,
    dealBanner,
    openingReason,
    reconnectNotice,
    currentTurnPlayerId,
    leadPlayerId,
    currentMove,
    chopNotification,
    botThinkingThought,
    isLeadMove,
    isFirstMoveOfGame,
    firstMoveRequiredCard,
    isGameOver
  } = useGameTableScreenLogic({
    onPlaySelectedCards,
    onPassTurn
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[radial-gradient(ellipse_at_center,#141926_0%,#090c12_100%)] flex flex-col justify-between select-none">
      {/* HEADER BAR DẠNG FLOATING GLASSMORPHIC OVERLAY (GIỐNG MOBILE) */}
      <HeaderBar
        gameNumber={gameNumber}
        mode={gameSettings.mode}
        betAmount={gameSettings.betAmount}
        activeGameType={activeGameType}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenRules={() => openModal('RULES')}
        onOpenSettings={() => openModal('SETTINGS')}
        onOpenXRay={handleOpenXRay}
        onReturnToLobby={onReturnToLobby}
        xrayEnabled={xrayEnabled}
        onToggleMatchHud={() => setIsMatchHudOpen(prev => !prev)}
        onToggleReasoningHud={() => setIsReasoningHudOpen(prev => !prev)}
        isMatchHudOpen={isMatchHudOpen}
        isReasoningHudOpen={isReasoningHudOpen}
        botReasoningLogEnabled={botReasoningLogEnabled}
      />

      {/* HUD GÓC TRÁI: QUÂN SƯ AI & THỐNG KÊ CHIẾN THUẬT */}
      <LeftMatchHUD
        isOpen={isMatchHudOpen}
        onToggle={() => setIsMatchHudOpen(prev => !prev)}
        players={players}
        currentTurnPlayerId={currentTurnPlayerId}
        leadPlayerId={leadPlayerId}
        gameNumber={gameNumber}
        betAmount={gameSettings.betAmount}
        isDealing={isDealing}
        dealtCounts={dealtCounts}
        aiHint={activeAiHint}
        isHumanTurn={isMyTurn}
        aiHintEnabled={aiHintEnabled}
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

      {/* ĐẤU TRƯỜNG BÀN ĐẤU CHÍNH (KHÓA HÌNH HỌC - CHỐNG XÊ DỊCH) */}
      <main className="relative flex-1 w-full h-full flex flex-col justify-between items-center px-4 pt-14 pb-1 overflow-hidden">
        {/* TRỤC TRÊN: GHẾ TRÊN (TOP BOT) - CHIỀU CAO CỐ ĐỊNH, ĐỆM AN TOÀN CHO THOUGHT BUBBLE */}
        <div className="w-full flex justify-center items-center z-20 shrink-0 h-20 sm:h-24 mt-1 sm:mt-2.5 overflow-visible">
          {topBot && (
            <div className="flex justify-center items-center shrink-0 overflow-visible">
              <BotSeat
                player={topBot}
                isCurrentTurn={currentTurnPlayerId === topBot.id}
                position="top"
                isLeader={leadPlayerId === topBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[topBot.id]}
                thoughtText={botThinkingThought?.botId === topBot.id ? botThinkingThought.text : null}
                cardFanPlacement="bottom"
                cardScale="large"
              />
            </div>
          )}
        </div>

        {/* TRỤC GIỮA: GHẾ TRÁI + BÀN TRÒN TRUNG TÂM + GHẾ PHẢI */}
        <div className="w-full flex-1 flex justify-center items-center gap-3 sm:gap-5 md:gap-7 z-10 px-2 my-auto overflow-visible min-h-[220px]">
          {/* Ghế Trái (Left Bot): Kích thước cố định để không co giật layout */}
          <div className="w-28 sm:w-32 md:w-36 flex justify-center items-center shrink-0 overflow-visible">
            {leftBot && (
              <BotSeat
                player={leftBot}
                isCurrentTurn={currentTurnPlayerId === leftBot.id}
                position="left"
                isLeader={leadPlayerId === leftBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[leftBot.id]}
                thoughtText={botThinkingThought?.botId === leftBot.id ? botThinkingThought.text : null}
                cardFanPlacement="bottom"
                cardScale="large"
              />
            )}
          </div>

          {/* BÀN TRÒN TRUNG TÂM (TÂM ĐIỂM BẤT DI BẤT DỊCH) */}
          <div className="round-table relative z-30 flex items-center justify-center p-4 sm:p-6 shadow-2xl shrink-0 overflow-visible">
            <div className="table-inner-felt">
              <div className="table-center-emblem">
                <span className="text-[#d4af37]/25 font-black text-[11px] sm:text-[13px] uppercase tracking-[0.35em] select-none text-center">
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
                isGameOver={isGameOver}
              />
            </div>
          </div>

          {/* Ghế Phải (Right Bot): Kích thước cố định để không co giật layout */}
          <div className="w-28 sm:w-32 md:w-36 flex justify-center items-center shrink-0 overflow-visible">
            {rightBot && (
              <BotSeat
                player={rightBot}
                isCurrentTurn={currentTurnPlayerId === rightBot.id}
                position="right"
                isLeader={leadPlayerId === rightBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[rightBot.id]}
                thoughtText={botThinkingThought?.botId === rightBot.id ? botThinkingThought.text : null}
                cardFanPlacement="bottom"
                cardScale="large"
              />
            )}
          </div>
        </div>

        {/* TRỤC DƯỚI: KHAY BÀI VÀ CÁC NÚT ĐIỀU KHIỂN */}
        <div className="w-full flex flex-col items-center justify-end z-30 shrink-0 pb-1">
          {/* Tay bài của người chơi */}
          <div className="w-full flex justify-center">
            <PlayerHandView
              player={localPlayer}
              selectedCardIds={selectedCardIds}
              onToggleCardSelect={handleToggleCardSelect}
              onClearCardSelection={handleClearCardSelection}
              onPlaySelectedCards={handlePlayCards}
              onPassTurn={handlePassTurnAction}
              onAutoSort={onAutoSort}
              onQuickSelect={handleQuickSelect}
              canQuickSelect={canQuickSelect}
              quickSelectCandidatesCount={quickSelectCandidatesCount}
              isCurrentTurn={isMyTurn}
              canPlay={isValidPlaySelection}
              canPass={canPassTurn}
              isLeader={leadPlayerId === localPlayer.id}
              isDealing={isDealing}
              dealtCardsCount={dealtCounts[localPlayer.id] ?? 0}
              isFirstMoveOfGame={isFirstMoveOfGame}
              firstMoveRequiredCard={firstMoveRequiredCard}
              sortMode={handSortMode}
              variantIndex={smartVariantIndex}
              cardSize="md"
              reverseButtons={reverseButtonsEnabled}
              quickResponseAssistEnabled={quickResponseAssistEnabled}
              dealBanner={dealBanner}
              openingReason={openingReason}
              chopNotification={chopNotification}
              reconnectNotice={reconnectNotice}
            />
          </div>
        </div>
      </main>
    </div>
  );
};
