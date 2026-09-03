import React, { useState } from 'react';
import { getBotConfig } from '../../../ai/bot-factory';
import { HeaderBar } from '../../components/HeaderBar';
import { LeftMatchHUD } from '../components/LeftMatchHUD';
import { BotReasoningHUD } from '../components/BotReasoningHUD';
import { BotSeat } from '../../components/BotSeat';
import { TableCenter } from '../../components/TableCenter';
import { DealingDeckAnimation } from '../../components/DealingDeckAnimation';
import { PlayerHandView } from '../../components/PlayerHandView';
import { useGameTableScreenLogic } from '../../hooks/useGameTableScreenLogic';

// Stores
import { useModalStore } from '../../../stores/useModalStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useGameStore } from '../../../stores/useGameStore';

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
  const [isReasoningHudOpen, setIsReasoningHudOpen] = useState<boolean>(true);
  const { openModal } = useModalStore();
  const { profile } = useUserStore();
  const {
    soundEnabled,
    aiHintEnabled,
    quickResponseAssistEnabled,
    xrayEnabled,
    botReasoningLogEnabled,
    toggleSound
  } = useSettingsStore();

  const {
    players,
    gameNumber,
    gameSettings,
    activeGameType,
    isDealing,
    dealtCounts,
    dealBanner,
    chopNotification,
    currentTurnPlayerId,
    leadPlayerId,
    currentMove,
    selectedCardIds,
    botThinkingThought,
    handSortMode,
    smartVariantIndex,
    myPlayerId,
    isFirstMoveOfGame,
    isLeadMove,
    toggleCardSelect,
    clearCardSelection
  } = useGameStore();

  const {
    isOnlineMatch,
    p0,
    isMyTurn,
    isValidPlaySelection,
    canP0Pass,
    botPersonaIds,
    customBotConfigs,
    topBot,
    leftBot,
    rightBot,
    topBotPersonaId,
    topBotCustomConfig,
    quickSelectCandidates,
    canQuickSelect,
    activeAiHint,
    handleQuickSelect,
    handlePlayCards,
    handlePassTurnAction
  } = useGameTableScreenLogic({
    onPlaySelectedCards,
    onPassTurn
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[radial-gradient(ellipse_at_center,#141926_0%,#090c12_100%)] flex flex-col justify-between select-none">
      {/* HEADER BAR CHÍNH */}
      <HeaderBar
        gameNumber={gameNumber}
        mode={gameSettings.mode}
        betAmount={gameSettings.betAmount}
        activeGameType={activeGameType}
        playerCoins={profile.coins}
        playerElo={profile.elo}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenCustomGameModal={null}
        onOpenRules={() => openModal('RULES')}
        onOpenSettings={() => openModal('SETTINGS')}
        onOpenXRay={() => openModal('XRAY')}
        onReturnToLobby={onReturnToLobby}
        xrayEnabled={xrayEnabled}
      />

      {/* BANNER THÔNG BÁO QUYỀN ĐI ĐẦU VÁN ĐẤU */}
      {dealBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-slate-950 font-bold px-6 py-2 rounded-full shadow-lg border border-amber-300 animate-bounce pointer-events-none text-sm tracking-wide">
          {dealBanner}
        </div>
      )}

      {/* HUD GÓC TRÁI: QUÂN SƯ AI & THỐNG KÊ CHIẾN THUẬT */}
      <LeftMatchHUD
        players={players}
        currentTurnPlayerId={currentTurnPlayerId || ''}
        leadPlayerId={leadPlayerId || ''}
        gameNumber={gameNumber}
        betAmount={gameSettings.betAmount}
        isDealing={isDealing}
        dealtCounts={dealtCounts}
        aiHint={activeAiHint}
        isHumanTurn={isMyTurn}
        aiHintEnabled={aiHintEnabled}
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

      {/* KHÔNG GIAN BÀN ĐẤU CHÍNH */}
      <main className="relative flex-1 w-full max-w-7xl mx-auto flex flex-col justify-between items-center px-4 py-2">
        {/* GHẾ TRÊN: BOT ĐỐI DIỆN */}
        <div className="w-full flex justify-center z-20">
          {topBot && (
            <BotSeat
              player={topBot}
              botConfig={getBotConfig(topBotPersonaId, topBotCustomConfig || undefined)}
              isCurrentTurn={!isDealing && currentTurnPlayerId === topBot.id}
              position="top"
              isLeader={leadPlayerId === topBot.id}
              isDealing={isDealing}
              displayCardCount={dealtCounts[topBot.id]}
              thoughtText={botThinkingThought?.botId === topBot.id ? botThinkingThought.text : null}
            />
          )}
        </div>

        {/* TRỤC GIỮA: GHẾ TRÁI + TRUNG TÂM BÀN TRÒN + GHẾ PHẢI */}
        <div className="w-full flex justify-between items-center my-auto z-10 px-4">
          {/* Ghế Trái: Bot 1 (Nếu có) */}
          <div className="flex justify-center flex-shrink-0 min-w-[120px]">
            {leftBot ? (
              <BotSeat
                player={leftBot}
                botConfig={getBotConfig(botPersonaIds[0], customBotConfigs[0] || undefined)}
                isCurrentTurn={!isDealing && currentTurnPlayerId === leftBot.id}
                position="left"
                isLeader={leadPlayerId === leftBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[leftBot.id]}
                thoughtText={botThinkingThought?.botId === leftBot.id ? botThinkingThought.text : null}
              />
            ) : (
              <div className="w-24 hidden md:block" />
            )}
          </div>

          {/* Khối Thảm Nỉ Tròn & Animation Chia Bài */}
          <div className="relative flex-1 max-w-2xl h-64 md:h-80 mx-2 flex items-center justify-center">
            {/* Thảm nỉ tròn xanh cổ điển */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-emerald-900/60 to-emerald-950/80 border-4 border-amber-600/30 shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_10px_30px_rgba(0,0,0,0.5)] pointer-events-none" />

            {/* Animation chia bài */}
            {isDealing && (
              <DealingDeckAnimation
                isDealing={isDealing}
                onDealCard={onDealCard}
                onDealComplete={onDealComplete}
                onSkip={onDealComplete}
              />
            )}

            {/* Trung Tâm Bàn Tròn: Bài đã đánh & Thông báo chặt đẹp */}
            <div className="relative z-10 w-full flex justify-center">
              <TableCenter
                currentMove={currentMove}
                isLeadMove={isOnlineMatch ? (currentMove === null || leadPlayerId === myPlayerId) : isLeadMove}
                chopNotification={chopNotification}
                isDealing={isDealing}
              />
            </div>
          </div>

          {/* Ghế Phải: Bot 3 (Nếu có) */}
          <div className="flex justify-center flex-shrink-0 min-w-[120px]">
            {rightBot ? (
              <BotSeat
                player={rightBot}
                botConfig={getBotConfig(botPersonaIds[2], customBotConfigs[2] || undefined)}
                isCurrentTurn={!isDealing && currentTurnPlayerId === rightBot.id}
                position="right"
                isLeader={leadPlayerId === rightBot.id}
                isDealing={isDealing}
                displayCardCount={dealtCounts[rightBot.id]}
                thoughtText={botThinkingThought?.botId === rightBot.id ? botThinkingThought.text : null}
              />
            ) : (
              <div className="w-24 hidden md:block" />
            )}
          </div>
        </div>

        {/* GHẾ DƯỚI: TAY BÀI VÀ CÁC NÚT ĐIỀU KHIỂN CỦA NGƯỜI CHƠI (P0) */}
        <div className="w-full flex justify-center z-30 mb-1">
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
              isFirstMoveOfGame={isOnlineMatch ? false : isFirstMoveOfGame}
              sortMode={handSortMode}
              variantIndex={smartVariantIndex}
            />
          )}
        </div>
      </main>
    </div>
  );
};
