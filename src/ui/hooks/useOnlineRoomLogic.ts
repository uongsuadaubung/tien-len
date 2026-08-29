import { useState, useCallback, useMemo } from 'react';
import { useOnlineStore } from '../../stores/useOnlineStore';
import { useUserStore } from '../../stores/useUserStore';
import { useModalStore } from '../../stores/useModalStore';
import { type GameSettlementRule, type PlayerCount } from '../../engine/types';
import { type OnlineRoomState } from '../../engine/network/network.schema';
import { type PlayerProfile } from '../../engine/storage';
import { type TableConfigState } from '../components/TableRulesConfigPanel';

export interface SettlementModeOption {
  id: GameSettlementRule;
  label: string;
  desc: string;
  icon: string;
}

export const SETTLEMENT_MODES: SettlementModeOption[] = [
  { 
    id: 'COUNT_CARDS', 
    label: 'Đếm Lá', 
    desc: 'Phạt theo số lá bài còn lại trên tay khi có người về Nhất.',
    icon: '⚡'
  },
  { 
    id: 'TRADITIONAL', 
    label: 'Truyền Thống', 
    desc: 'Tính điểm phân hạng Nhất, Nhì, Ba, Bét đầy đủ.',
    icon: '👑'
  },
  { 
    id: 'WINNER_TAKES_ALL', 
    label: 'Nhất Ăn Tất', 
    desc: 'Người về Nhất gom toàn bộ tiền cược của cả làng.',
    icon: '💰'
  }
];

export const BET_PRESETS: number[] = [500, 1000, 2000, 5000, 10000];

export const PLAYER_COUNTS: Array<2 | 3 | 4> = [2, 3, 4];

export interface UseOnlineRoomLogicResult {
  profile: PlayerProfile;
  roomState: OnlineRoomState | null;
  roomCode: string | null;
  isHost: boolean;
  tab: 'CREATE' | 'JOIN';
  inputPin: string;
  rawPinDigits: string;
  tableConfig: TableConfigState;
  playerCount: PlayerCount;
  betAmount: number;
  settlementRule: GameSettlementRule;
  copiedLink: boolean;
  copiedPin: boolean;
  canAffordBet: boolean;
  isRoomFull: boolean;
  setTab: (tab: 'CREATE' | 'JOIN') => void;
  setInputPin: (pin: string) => void;
  handleTableConfigChange: (updated: Partial<TableConfigState>) => void;
  setPlayerCount: (count: PlayerCount) => void;
  setBetAmount: (amount: number) => void;
  setSettlementRule: (rule: GameSettlementRule) => void;
  handleCopyLink: () => void;
  handleCopyPin: () => void;
  handlePastePin: () => Promise<void>;
  handleKeypadPress: (digit: string) => void;
  handleKeypadDelete: () => void;
  handleKeypadClear: () => void;
  handleCreate: () => void;
  handleJoin: () => void;
  handleStartGame: () => void;
  handleLeave: () => void;
  handleAddBot: (slotIndex: number) => void;
  handleRemoveSlot: (slotIndex: number) => void;
  handleClose: () => void;
}

export function useOnlineRoomLogic(): UseOnlineRoomLogicResult {
  const { closeModal } = useModalStore();
  const profile = useUserStore(s => s.profile);

  const {
    roomState,
    roomCode,
    isHost,
    createRoom,
    joinRoom,
    addBotToSlot,
    removeSlot,
    startMatch,
    leaveRoom
  } = useOnlineStore();

  const [tab, setTab] = useState<'CREATE' | 'JOIN'>('CREATE');
  const [inputPin, setInputPin] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);

  const [tableConfig, setTableConfig] = useState<TableConfigState>({
    playerCount: 4,
    mode: 'COUNT_CARDS',
    betAmount: 1000,
    choppingMultiplier: 1,
    congEnabled: true,
    prohibitEndingWithTwo: true,
    allowFourPairsCutAnytime: true,
    threeSpadesEndingBonus: true,
    cascadeChopEnabled: true,
    instantWinEnabled: true
  });

  const rawPinDigits = useMemo(() => {
    return inputPin.replace(/^TL-/i, '').replace(/[^0-9A-Z]/gi, '').slice(0, 4);
  }, [inputPin]);

  const currentMultiplier = tableConfig.choppingMultiplier || 1;
  const depositRequired = 26 * tableConfig.betAmount * currentMultiplier;
  const canAffordBet = profile.coins >= depositRequired || profile.coins >= tableConfig.betAmount;
  const isRoomFull = roomState !== null ? roomState.players.length >= roomState.playerCount : false;

  const handleTableConfigChange = useCallback((updated: Partial<TableConfigState>) => {
    setTableConfig(prev => ({ ...prev, ...updated }));
  }, []);

  const setPlayerCount = useCallback((count: PlayerCount) => {
    handleTableConfigChange({ playerCount: count });
  }, [handleTableConfigChange]);

  const setBetAmount = useCallback((amount: number) => {
    handleTableConfigChange({ betAmount: amount });
  }, [handleTableConfigChange]);

  const setSettlementRule = useCallback((rule: GameSettlementRule) => {
    handleTableConfigChange({ mode: rule });
  }, [handleTableConfigChange]);

  const handleCopyLink = useCallback(() => {
    if (roomCode === null) return;
    const url = `${window.location.origin}${window.location.pathname}#room=${roomCode}`;
    void navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [roomCode]);

  const handleCopyPin = useCallback(() => {
    if (roomCode === null) return;
    void navigator.clipboard.writeText(roomCode);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  }, [roomCode]);

  const handlePastePin = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text !== null && text.trim().length > 0) {
        let cleaned = text.trim().toUpperCase();
        // Extract TL-XXXX or XXXX if present in URL or string
        const match = cleaned.match(/TL-[A-Z0-9]{4}/i) || cleaned.match(/[A-Z0-9]{4}/i);
        if (match !== null) {
          cleaned = match[0].toUpperCase();
          if (!cleaned.startsWith('TL-')) {
            cleaned = `TL-${cleaned}`;
          }
          setInputPin(cleaned);
        } else {
          const raw = cleaned.replace(/[^0-9A-Z]/gi, '').slice(0, 4);
          setInputPin(raw.length > 0 ? `TL-${raw}` : '');
        }
      }
    } catch {
      // Clipboard permissions or not supported
    }
  }, []);

  const handleKeypadPress = useCallback((digit: string) => {
    setInputPin(prev => {
      const current = prev.replace(/^TL-/i, '').replace(/[^0-9A-Z]/gi, '');
      if (current.length >= 4) return prev;
      const next = `${current}${digit}`.toUpperCase();
      return `TL-${next}`;
    });
  }, []);

  const handleKeypadDelete = useCallback(() => {
    setInputPin(prev => {
      const current = prev.replace(/^TL-/i, '').replace(/[^0-9A-Z]/gi, '');
      if (current.length === 0) return '';
      const next = current.slice(0, -1);
      return next.length > 0 ? `TL-${next}` : '';
    });
  }, []);

  const handleKeypadClear = useCallback(() => {
    setInputPin('');
  }, []);

  const currentSettlementRule: GameSettlementRule = 
    tableConfig.mode === 'CUSTOM' ? 'COUNT_CARDS' : tableConfig.mode;

  const handleCreate = useCallback(() => {
    createRoom(profile, {
      playerCount: tableConfig.playerCount,
      betAmount: tableConfig.betAmount,
      settlementRule: currentSettlementRule,
      choppingMultiplier: tableConfig.choppingMultiplier ?? 1,
      congEnabled: tableConfig.congEnabled ?? true,
      prohibitEndingWithTwo: tableConfig.prohibitEndingWithTwo ?? true,
      allowFourPairsCutAnytime: tableConfig.allowFourPairsCutAnytime ?? true,
      threeSpadesEndingBonus: tableConfig.threeSpadesEndingBonus ?? true,
      cascadeChopEnabled: tableConfig.cascadeChopEnabled ?? true
    });
  }, [createRoom, profile, tableConfig, currentSettlementRule]);

  const handleJoin = useCallback(() => {
    if (inputPin.trim().length === 0) return;
    const code = inputPin.toUpperCase().startsWith('TL-') ? inputPin.trim() : `TL-${inputPin.trim()}`;
    joinRoom(profile, code);
  }, [inputPin, joinRoom, profile]);

  const handleStartGame = useCallback(() => {
    startMatch();
    closeModal('ONLINE_ROOM');
  }, [startMatch, closeModal]);

  const handleLeave = useCallback(() => {
    leaveRoom();
  }, [leaveRoom]);

  const handleAddBot = useCallback((slotIndex: number) => {
    addBotToSlot(slotIndex);
  }, [addBotToSlot]);

  const handleRemoveSlot = useCallback((slotIndex: number) => {
    removeSlot(slotIndex);
  }, [removeSlot]);

  const handleClose = useCallback(() => {
    if (roomCode !== null) {
      leaveRoom();
    }
    closeModal('ONLINE_ROOM');
  }, [roomCode, leaveRoom, closeModal]);

  return {
    profile,
    roomState,
    roomCode,
    isHost,
    tab,
    inputPin,
    rawPinDigits,
    tableConfig,
    playerCount: tableConfig.playerCount,
    betAmount: tableConfig.betAmount,
    settlementRule: currentSettlementRule,
    copiedLink,
    copiedPin,
    canAffordBet,
    isRoomFull,
    setTab,
    setInputPin,
    handleTableConfigChange,
    setPlayerCount,
    setBetAmount,
    setSettlementRule,
    handleCopyLink,
    handleCopyPin,
    handlePastePin,
    handleKeypadPress,
    handleKeypadDelete,
    handleKeypadClear,
    handleCreate,
    handleJoin,
    handleStartGame,
    handleLeave,
    handleAddBot,
    handleRemoveSlot,
    handleClose
  };
}
