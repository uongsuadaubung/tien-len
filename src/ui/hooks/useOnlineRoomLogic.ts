import { useState, useCallback, useMemo, useEffect } from 'react';
import { useOnlineStore } from '../../stores/useOnlineStore';
import { useUserStore } from '../../stores/useUserStore';
import { useViewStore } from '../../stores/useViewStore';
import { type GameSettlementRule, type PlayerCount } from '../../engine/types';
import { type OnlineRoomState, type PublicRoomSummary } from '../../engine/network/network.schema';
import { type PlayerProfile } from '../../engine/storage';
import { type TableConfigState } from '../components/TableRulesConfigPanel';
import { t } from '../../locales';
import { calculateRequiredDeposit } from '../../engine/constants/economy';

export interface SettlementModeOption {
  id: GameSettlementRule;
  label: string;
  desc: string;
  icon: string;
}

export const getSettlementModes = (): SettlementModeOption[] => [
  { 
    id: 'COUNT_CARDS', 
    label: t('tableConfig.modeCountCardsTitle'), 
    desc: t('tableConfig.modeCountCardsDesc'),
    icon: '⚡'
  },
  { 
    id: 'TRADITIONAL', 
    label: t('tableConfig.modeTraditionalTitle'), 
    desc: t('tableConfig.modeTraditionalDesc'),
    icon: '👑'
  },
  { 
    id: 'WINNER_TAKES_ALL', 
    label: t('tableConfig.modeWinnerTakesAllTitle'), 
    desc: t('tableConfig.modeWinnerTakesAllDesc'),
    icon: '💰'
  }
];

export const SETTLEMENT_MODES: SettlementModeOption[] = getSettlementModes();

export const BET_PRESETS: number[] = [500, 1000, 2000, 5000, 10000];

export const PLAYER_COUNTS: Array<2 | 3 | 4> = [2, 3, 4];

export interface ActiveOnlineRoom {
  readonly roomCode: string;
  readonly roomState: OnlineRoomState;
  readonly isHost: boolean;
  readonly myPlayerId: string;
}

export interface UseOnlineRoomLogicResult {
  profile: PlayerProfile;
  activeRoom: ActiveOnlineRoom | null;
  roomState: OnlineRoomState | null;
  roomCode: string | null;
  isHost: boolean;
  tab: 'LOBBY' | 'CREATE';
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
  isPublicRoom: boolean;
  publicRooms: readonly PublicRoomSummary[];
  isLobbyLoading: boolean;
  setTab: (tab: 'LOBBY' | 'CREATE') => void;
  setInputPin: (pin: string) => void;
  setIsPublicRoom: (isPublic: boolean) => void;
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
  handleJoinPublicRoom: (room: PublicRoomSummary) => void;
  handleRefreshLobby: () => void;
  handleStartGame: () => void;
  handleLeave: () => void;
  handleAddBot: (slotIndex: number) => void;
  handleRemoveSlot: (slotIndex: number) => void;
  handleClose: () => void;
  handleOpenBank: () => void;
}

export function useOnlineRoomLogic(): UseOnlineRoomLogicResult {
  const { openModal, closeModal } = useViewStore();
  const profile = useUserStore(s => s.profile);

  const sessionState = useOnlineStore(s => s.sessionState);
  const {
    roomState,
    roomCode,
    isHost,
    publicRooms,
    isLobbyLoading,
    createRoom,
    joinRoom,
    joinPublicRoom,
    addBotToSlot,
    removeSlot,
    startMatch,
    leaveRoom,
    startBrowsingLobby,
    stopBrowsingLobby,
    refreshLobbyRooms
  } = useOnlineStore();

  const activeRoom: ActiveOnlineRoom | null = useMemo(() => {
    if (sessionState.status === 'IN_ROOM_WAITING' || sessionState.status === 'IN_ROOM_PLAYING') {
      return {
        roomCode: sessionState.roomCode,
        roomState: sessionState.roomState,
        isHost: sessionState.isHost,
        myPlayerId: sessionState.myPlayerId
      };
    }
    return null;
  }, [sessionState]);

  const [tab, setTab] = useState<'LOBBY' | 'CREATE'>('LOBBY');
  const [inputPin, setInputPin] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedPin, setCopiedPin] = useState<boolean>(false);
  const [isPublicRoom, setIsPublicRoom] = useState<boolean>(true);

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

  // Tự động lắng nghe Sảnh Phòng khi ở tab LOBBY và chưa vào phòng
  useEffect(() => {
    if (tab === 'LOBBY' && roomState === null) {
      startBrowsingLobby();
    } else {
      stopBrowsingLobby();
    }

    return () => {
      stopBrowsingLobby();
    };
  }, [tab, roomState, startBrowsingLobby, stopBrowsingLobby]);

  const rawPinDigits = useMemo(() => {
    return inputPin.replace(/^TL-/i, '').replace(/[^0-9A-Z]/gi, '').slice(0, 4);
  }, [inputPin]);

  const depositRequired = calculateRequiredDeposit(tableConfig.betAmount);
  const canAffordBet = profile.coins >= depositRequired || profile.coins >= tableConfig.betAmount;
  const isRoomFull = activeRoom !== null ? activeRoom.roomState.players.length >= activeRoom.roomState.playerCount : false;

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
      cascadeChopEnabled: tableConfig.cascadeChopEnabled ?? true,
      isPublic: isPublicRoom
    });
  }, [createRoom, profile, tableConfig, currentSettlementRule, isPublicRoom]);

  const handleJoin = useCallback(() => {
    if (inputPin.trim().length === 0) return;
    const code = inputPin.toUpperCase().startsWith('TL-') ? inputPin.trim() : `TL-${inputPin.trim()}`;
    joinRoom(profile, code);
  }, [inputPin, joinRoom, profile]);

  const handleJoinPublicRoom = useCallback((room: PublicRoomSummary) => {
    joinPublicRoom(profile, room);
  }, [joinPublicRoom, profile]);

  const handleRefreshLobby = useCallback(() => {
    refreshLobbyRooms();
  }, [refreshLobbyRooms]);

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
    stopBrowsingLobby();
    closeModal('ONLINE_ROOM');
  }, [roomCode, leaveRoom, stopBrowsingLobby, closeModal]);

  const handleOpenBank = useCallback(() => {
    handleClose();
    openModal('BANK');
  }, [handleClose, openModal]);

  return {
    profile,
    activeRoom,
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
    isPublicRoom,
    publicRooms,
    isLobbyLoading,
    setTab,
    setInputPin,
    setIsPublicRoom,
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
    handleJoinPublicRoom,
    handleRefreshLobby,
    handleStartGame,
    handleLeave,
    handleAddBot,
    handleRemoveSlot,
    handleClose,
    handleOpenBank
  };
}
