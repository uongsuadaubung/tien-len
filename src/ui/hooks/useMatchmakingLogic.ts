import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getRankTierByElo, type RankTierInfo } from '../../engine/elo';
import { soundManager } from '../audio/sound-manager';
import { useUserStore } from '../../stores/useUserStore';
import { useI18n } from '../../locales';
import type { MatchmakingData } from '../../stores/useViewStore';

export { getRankTierByElo };

export interface UseMatchmakingLogicOptions {
  match: MatchmakingData;
  onCancel: () => void;
  onMatchReady: () => void;
}

export interface MatchmakingSlot {
  id: string;
  name: string;
  avatar: string;
  elo: number;
  tier: RankTierInfo;
  isHuman: boolean;
}

export interface UseMatchmakingLogicResult {
  stage: 'SEARCHING' | 'FOUND';
  elapsedSeconds: number;
  formattedTime: string;
  currentTip: string;
  tipIndex: number;
  playerTier: RankTierInfo;
  playerProfile: ReturnType<typeof useUserStore.getState>['profile'];
  allSlots: MatchmakingSlot[];
  handleCancel: () => void;
  betAmount: number;
  modeName: string;
  playerCount: number;
}

export function formatMatchmakingTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function useMatchmakingLogic({
  match,
  onCancel,
  onMatchReady
}: UseMatchmakingLogicOptions): UseMatchmakingLogicResult {
  const { betAmount, modeName, botConfigs: matchedBots, playerCount } = match;
  const { t } = useI18n();
  const { profile: playerProfile } = useUserStore();
  const [stage, setStage] = useState<'SEARCHING' | 'FOUND'>('SEARCHING');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const tipIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const requiredBotCount = Math.max(1, playerCount - 1);

  const searchingTips = useMemo(() => [
    playerCount === 2 
      ? t('matchmaking.tipSolo')
      : playerCount === 3
        ? t('matchmaking.tip3P')
        : t('matchmaking.tip4P'),
    t('matchmaking.tipDeposit'),
    t('matchmaking.tipConnecting'),
    t('matchmaking.tipDeck')
  ], [playerCount, t]);

  useEffect(() => {
    setStage('SEARCHING');
    setElapsedSeconds(0);
    setTipIndex(0);

    // Đếm giây tìm trận
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    // Đổi câu gợi ý mỗi 850ms
    tipIntervalRef.current = setInterval(() => {
      setTipIndex(prev => (prev + 1) % searchingTips.length);
    }, 850);

    // Giả lập thời gian tìm kiếm chân thực (1.8s - 2.4s)
    const simulatedDelay = 1800 + Math.random() * 600;
    const matchFoundTimeout = setTimeout(() => {
      setStage('FOUND');
      soundManager.playMatchFound();

      if (timerRef.current) clearInterval(timerRef.current);
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);

      // Sau 1.2s hiển thị đối thủ, tự động vào bàn
      autoStartTimeoutRef.current = setTimeout(() => {
        onMatchReady();
      }, 1200);
    }, simulatedDelay);

    return () => {
      clearTimeout(matchFoundTimeout);
      if (timerRef.current) clearInterval(timerRef.current);
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
      if (autoStartTimeoutRef.current) clearTimeout(autoStartTimeoutRef.current);
    };
  }, [onMatchReady, searchingTips.length]);

  const handleCancel = useCallback(() => {
    if (stage === 'SEARCHING') {
      onCancel();
    }
  }, [stage, onCancel]);

  const playerTier = useMemo(() => getRankTierByElo(playerProfile.elo), [playerProfile.elo]);

  // Dựng danh sách người chơi hiển thị theo đúng số lượng (2, 3 hoặc 4 người)
  const allSlots: MatchmakingSlot[] = useMemo(() => [
    {
      id: playerProfile.id,
      name: playerProfile.name || t('hud.you').replace(/[()]/g, ''),
      avatar: playerProfile.avatar || '🤠',
      elo: playerProfile.elo,
      tier: playerTier,
      isHuman: true
    },
    ...matchedBots.slice(0, requiredBotCount).map((b, idx) => ({
      id: b.id || `bot_${idx}`,
      name: b.name,
      avatar: b.avatar,
      elo: b.elo,
      tier: getRankTierByElo(b.elo),
      isHuman: false
    }))
  ], [playerProfile.id, playerProfile.name, playerProfile.avatar, playerProfile.elo, playerTier, matchedBots, requiredBotCount, t]);

  return {
    stage,
    elapsedSeconds,
    formattedTime: formatMatchmakingTime(elapsedSeconds),
    currentTip: searchingTips[tipIndex] || searchingTips[0],
    tipIndex,
    playerTier,
    playerProfile,
    allSlots,
    handleCancel,
    betAmount,
    modeName,
    playerCount
  };
}
