import React, { useState } from 'react';
import { GameEngine } from '../../engine/game';
import { isValidMove } from '../../engine/validator';
import { getBotConfig } from '../../ai/bot-factory';
import { HeaderBar } from '../components/HeaderBar';
import { LeftMatchHUD } from '../components/LeftMatchHUD';
import { BotReasoningHUD } from '../components/BotReasoningHUD';
import { BotSeat } from '../components/BotSeat';
import { TableCenter } from '../components/TableCenter';
import { DealingDeckAnimation } from '../components/DealingDeckAnimation';
import { PlayerHandView } from '../components/PlayerHandView';
import { evaluateSelectionFeedback } from '../../ai/hint-engine';
import { CardTracker } from '../../ai/card-tracker';

// Stores
import { useModalStore } from '../../stores/useModalStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useGameStore } from '../../stores/useGameStore';
import { getSortedQuickSelectCandidates, getNextQuickSelectCards } from '../../engine/quick-response-finder';
import { soundManager } from '../audio/sound-manager';

interface GameTableScreenProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  onPlaySelectedCards: () => void;
  onPassTurn: () => void;
  onAutoSort: () => void;
  onApplyAiHint: () => void;
  onDealCard: (playerIndex: number, currentCardCount: number) => void;
  onDealComplete: () => void;
  onResetMatch: () => void;
  onReturnToLobby: () => void;
}

export const GameTableScreen: React.FC<GameTableScreenProps> = ({
  engineRef,
  onPlaySelectedCards,
  onPassTurn,
  onAutoSort,
  onApplyAiHint,
  onDealCard,
  onDealComplete,
  onResetMatch,
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
    activeGameType,
    gameSettings,
    playerCount,
    botPersonaIds,
    customBotConfigs,
    gameNumber,
    isDealing,
    dealtCounts,
    dealBanner,
    chopNotification,
    questToast,
    players,
    currentTurnPlayerId,
    leadPlayerId,
    currentMove,
    selectedCardIds,
    currentHint,
    handSortMode,
    smartVariantIndex,
    botThinkingThought,
    setSelectedCardIds,
    toggleCardSelect,
    clearCardSelection
  } = useGameStore();

  // Phân bổ ghế người chơi
  const p0 = players[0];
  const p1 = players[1]; // Bot 1 (Trái hoặc Trên nếu solo 1v1)
  const p2 = players[2]; // Bot 2 (Trên nếu bàn 3-4 người)
  const p3 = players[3]; // Bot 3 (Phải nếu bàn 4 người)

  const isP0Turn = currentTurnPlayerId === 'p0';
  const selectedCards = p0 ? p0.hand.filter(c => selectedCardIds.has(c.id)) : [];
  const isValidPlaySelection =
    isP0Turn &&
    selectedCards.length > 0 &&
    isValidMove(
      selectedCards,
      currentMove?.combination || null,
      engineRef.current?.isFirstMoveOfGame ?? false,
      engineRef.current?.isRoundLeadMove() ?? true
    ).valid;

  const canP0Pass =
    isP0Turn &&
    !isDealing &&
    !(engineRef.current?.isFirstMoveOfGame ?? false) &&
    !(engineRef.current?.isRoundLeadMove() ?? true);

  // Tính toán danh sách các phương án Chọn Nhanh (Bắt bài vừa khít nhất)
  const quickSelectCandidates = React.useMemo(() => {
    if (!engineRef.current || !isP0Turn || !p0 || p0.hand.length === 0) return [];
    const engine = engineRef.current;
    return getSortedQuickSelectCandidates({
      hand: p0.hand,
      leadingMove: engine.getLeadingMove(),
      isLeadMove: engine.isRoundLeadMove(),
      isFirstMoveOfGame: engine.isFirstMoveOfGame,
      allowFourPairsCutAnytime: engine.rules.chopping.allowFourPairsCutAnytime,
      prohibitEndingWithTwo: engine.rules.gameFlow.prohibitEndingWithTwo
    });
  }, [isP0Turn, p0, currentMove]);

  // Phản hồi nhận xét chiến thuật thời gian thực của Quân Sư khi người chơi chọn bài trên tay
  const activeAiHint = React.useMemo(() => {
    if (!aiHintEnabled || !isP0Turn || !p0 || !engineRef.current) return currentHint;
    if (selectedCards.length === 0) return currentHint;

    const engine = engineRef.current;
    const tracker = new CardTracker(p0.hand, 1.0);

    const feedback = evaluateSelectionFeedback({
      selectedCards,
      hand: p0.hand,
      leadingMove: engine.getLeadingMove(),
      isFirstMoveOfGame: engine.isFirstMoveOfGame,
      isLeadMove: engine.isRoundLeadMove(),
      tracker,
      optimalHint: currentHint,
      prohibitEndingWithTwo: engine.rules.gameFlow.prohibitEndingWithTwo
    });

    return feedback || currentHint;
  }, [aiHintEnabled, isP0Turn, p0, selectedCards, currentHint]);

  const canQuickSelect = isP0Turn && !isDealing && quickSelectCandidates.length > 0;

  const handleQuickSelect = React.useCallback(() => {
    if (!engineRef.current || !isP0Turn || !p0 || p0.hand.length === 0) return;
    const engine = engineRef.current;

    const nextCards = getNextQuickSelectCards(
      {
        hand: p0.hand,
        leadingMove: engine.getLeadingMove(),
        isLeadMove: engine.isRoundLeadMove(),
        isFirstMoveOfGame: engine.isFirstMoveOfGame,
        allowFourPairsCutAnytime: engine.rules.chopping.allowFourPairsCutAnytime,
        prohibitEndingWithTwo: engine.rules.gameFlow.prohibitEndingWithTwo
      },
      selectedCardIds
    );

    if (nextCards && nextCards.length > 0) {
      setSelectedCardIds(new Set(nextCards.map(c => c.id)));
      soundManager.playCardDeal();
    }
  }, [isP0Turn, p0, selectedCardIds, setSelectedCardIds]);

  // Solo 1v1: Người duy nhất đối diện p0 là p1 ở Ghế Trên
  const isSolo1v1 = playerCount === 2;
  const topBot = isSolo1v1 ? p1 : (playerCount >= 3 ? p2 : null);
  const leftBot = isSolo1v1 ? null : p1;
  const rightBot = playerCount >= 4 ? p3 : null;

  const topBotPersonaId = isSolo1v1 ? botPersonaIds[0] : botPersonaIds[1];
  const topBotCustomConfig = isSolo1v1 ? customBotConfigs[0] : customBotConfigs[1];

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
        xrayEnabled={xrayEnabled}
        onOpenRules={() => openModal('RULES')}
        onOpenSettings={() => openModal('SETTINGS')}
        onOpenXRay={() => openModal('XRAY')}
        onResetMatch={onResetMatch}
        onReturnToLobby={onReturnToLobby}
      />

      {/* BẢNG THÔNG TIN BÀN ĐẤU BÊN TRÁI (LEFT MATCH HUD) */}
      <LeftMatchHUD
        players={players}
        currentTurnPlayerId={currentTurnPlayerId || 'p0'}
        leadPlayerId={leadPlayerId || 'p0'}
        gameNumber={gameNumber}
        betAmount={gameSettings.betAmount}
        isDealing={isDealing}
        dealtCounts={dealtCounts}
        aiHint={activeAiHint}
        isHumanTurn={isP0Turn}
        aiHintEnabled={aiHintEnabled}
      />

      {/* BẢNG SUY LUẬN BOT AI TRỰC TIẾP BÊN PHẢI (RIGHT BOT REASONING HUD) */}
      {botReasoningLogEnabled && (
        <BotReasoningHUD
          isOpen={isReasoningHudOpen}
          onToggle={() => setIsReasoningHudOpen(prev => !prev)}
          gameNumber={gameNumber}
          betAmount={gameSettings.betAmount}
          isDealing={isDealing}
        />
      )}

      {/* SÀN ĐẤU TIẾN LÊN: NGƯỜI CHƠI BAO QUANH BÀN TRÒN TRUNG TÂM */}
      <main className="flex-1 flex flex-col items-center justify-between px-2 py-1 max-w-7xl mx-auto w-full min-h-0 overflow-hidden relative">
        {/* Banner thông báo hoàn thành nhiệm vụ ngay trong trận */}
        {questToast && (
          <div className="absolute top-2 z-50 bg-[var(--bg-container)]/95 text-[var(--text-primary)] px-4 py-2 rounded-2xl border-2 border-[var(--color-gold)] shadow-2xl animate-fade-in flex items-center gap-2.5 backdrop-blur-md">
            <span className="text-xl">{questToast.icon}</span>
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold uppercase text-[var(--color-gold)] tracking-wider">
                🎯 Hoàn Thành Nhiệm Vụ!
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {questToast.title} <span className="text-[var(--color-gold)] font-mono">(+{questToast.rewardCoins.toLocaleString()} Xu)</span>
              </span>
            </div>
          </div>
        )}

        {/* Banner thông báo người đi trước mở màn ván */}
        {dealBanner && (
          <div className="absolute top-16 z-50 bg-[#121724]/95 text-[#f3e5ab] font-extrabold px-6 py-2 rounded-full border border-[#d4af37] shadow-2xl animate-bounce text-sm sm:text-base flex items-center gap-2">
            <span>{dealBanner}</span>
          </div>
        )}

        {/* GHẾ TRÊN: BOT TRÊN (HOẶC ĐỐI THỦ DUY NHẤT TRONG SOLO 1V1) */}
        <div className="flex justify-center w-full z-20">
          {topBot && (
            <BotSeat
              player={topBot}
              botConfig={getBotConfig(topBotPersonaId, topBotCustomConfig)}
              isCurrentTurn={!isDealing && currentTurnPlayerId === topBot.id}
              position="top"
              isLeader={leadPlayerId === topBot.id}
              isDealing={isDealing}
              displayCardCount={dealtCounts[topBot.id]}
              thoughtText={botThinkingThought?.botId === topBot.id ? botThinkingThought.text : null}
            />
          )}
        </div>

        {/* HÀNG GIỮA: BOT TRÁI | BÀN TRÒN TRUNG TÂM | BOT PHẢI */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 md:gap-14 w-full px-2 sm:px-6 z-20 my-auto">
          {/* Ghế Trái: Bot 1 (Nếu có) */}
          <div className="flex justify-center flex-shrink-0 min-w-[120px]">
            {leftBot ? (
              <BotSeat
                player={leftBot}
                botConfig={getBotConfig(botPersonaIds[0], customBotConfigs[0])}
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

          {/* BÀN TRÒN TRUNG TÂM */}
          <div className="round-table relative flex items-center justify-center p-4 sm:p-6 shadow-2xl">
            <div className="table-inner-felt">
              <div className="table-center-emblem">
                <span className="text-[#d4af37]/25 font-black text-[11px] sm:text-[13px] uppercase tracking-[0.35em] select-none text-center">
                  TIẾN LÊN MIỀN NAM
                </span>
              </div>
            </div>

            {/* Hiệu ứng bộ bài 3D chia bài */}
            {isDealing && (
              <DealingDeckAnimation
                isDealing={isDealing}
                playerCount={playerCount}
                onDealComplete={onDealComplete}
                onDealCard={onDealCard}
                onSkip={onDealComplete}
              />
            )}

            {/* Trung Tâm Bàn Tròn: Bài đã đánh & Thông báo chặt đẹp */}
            <div className="relative z-10 w-full flex justify-center">
              <TableCenter
                currentMove={currentMove}
                isLeadMove={engineRef.current?.isRoundLeadMove() ?? true}
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
                botConfig={getBotConfig(botPersonaIds[2], customBotConfigs[2])}
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
              onPlaySelectedCards={onPlaySelectedCards}
              onPassTurn={onPassTurn}
              onAutoSort={onAutoSort}
              onQuickSelect={quickResponseAssistEnabled ? handleQuickSelect : undefined}
              canQuickSelect={quickResponseAssistEnabled ? canQuickSelect : false}
              quickSelectCandidatesCount={quickSelectCandidates.length}
              isCurrentTurn={isP0Turn}
              canPlay={isValidPlaySelection}
              canPass={canP0Pass}
              isLeader={leadPlayerId === 'p0'}
              isDealing={isDealing}
              dealtCardsCount={dealtCounts['p0']}
              isFirstMoveOfGame={engineRef.current?.isFirstMoveOfGame ?? false}
              sortMode={handSortMode}
              variantIndex={smartVariantIndex}
            />
          )}
        </div>
      </main>
    </div>
  );
};
