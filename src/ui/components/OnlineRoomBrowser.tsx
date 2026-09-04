import React, { useState, useMemo } from 'react';
import { 
  Users, 
  RotateCw, 
  ArrowRight, 
  PlusCircle, 
  KeyRound, 
  Clipboard,
  ShieldAlert,
  Radio
} from 'lucide-react';
import { Card, Badge, Button } from '../primitives';
import { type PublicRoomSummary } from '../../engine/network/network.schema';
import { getSettlementRuleLabel } from '../../engine/types';
import { getRankTierByElo } from '../../engine/elo';
import { useI18n } from '../../locales';

export interface OnlineRoomBrowserProps {
  rooms: readonly PublicRoomSummary[];
  isLoading: boolean;
  userCoins: number;
  inputPin: string;
  onInputPinChange: (pin: string) => void;
  onJoinByPin: () => void;
  onPastePin: () => Promise<void>;
  onJoinRoom: (room: PublicRoomSummary) => void;
  onRefresh: () => void;
  onCreateRoomClick: () => void;
  onOpenBank: () => void;
}

type FilterCategory = 'ALL' | 'COUNT_CARDS' | 'TRADITIONAL' | '2P' | '4P';

export const OnlineRoomBrowser: React.FC<OnlineRoomBrowserProps> = ({
  rooms,
  isLoading,
  userCoins,
  inputPin,
  onInputPinChange,
  onJoinByPin,
  onPastePin,
  onJoinRoom,
  onRefresh,
  onCreateRoomClick,
  onOpenBank
}) => {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterCategory>('ALL');

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      // Bộ lọc danh mục
      if (filter === 'COUNT_CARDS' && room.settlementRule !== 'COUNT_CARDS') return false;
      if (filter === 'TRADITIONAL' && room.settlementRule !== 'TRADITIONAL') return false;
      if (filter === '2P' && room.maxPlayers !== 2) return false;
      if (filter === '4P' && room.maxPlayers !== 4) return false;

      return true;
    });
  }, [rooms, filter]);

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 1. KHUNG VÀO BẰNG MÃ PIN NHANH (FAST PIN ENTRY) */}
      <Card variant="surface" className="p-2.5 sm:p-3 rounded-xl border border-[var(--border-container)] bg-[var(--bg-container)]/80 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0 bg-[var(--bg-card)] border border-[var(--border-card)] focus-within:border-[var(--color-gold)] rounded-xl px-2.5 py-1.5 transition-colors">
            <KeyRound className="w-4 h-4 text-[var(--color-gold)] shrink-0" />
            <input
              type="text"
              value={inputPin}
              onChange={(e) => onInputPinChange(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputPin.trim().length > 0) {
                  onJoinByPin();
                }
              }}
              placeholder={t('online.pinPlaceholder')}
              maxLength={8}
              className="bg-transparent text-xs sm:text-sm font-mono font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:font-normal focus:outline-none w-full min-w-0"
            />
            <button
              onClick={onPastePin}
              className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] active:scale-95 transition-all shrink-0"
              title={t('online.pasteFromClipboard')}
            >
              <Clipboard className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button
            variant="gold"
            size="sm"
            onClick={onJoinByPin}
            disabled={inputPin.trim().length === 0}
            rightIcon={<ArrowRight className="w-3.5 h-3.5 text-slate-950" />}
            className="font-bold text-xs py-2 sm:py-1.5 px-4 shrink-0 shadow-md shadow-amber-500/10 justify-center"
          >
            {t('online.joinByPinBtn')}
          </Button>
        </div>
      </Card>

      {/* 2. THANH CÔNG CỤ SẢNH & BỘ LỌC */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-[var(--border-container)]">
        {/* Tiêu đề Sảnh Chờ & Trạng thái Live */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Radio className="w-3 h-3" /> {t('online.lobbyTitle')}
            </span>
          </div>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {t('online.roomsOpen', { count: rooms.length })}
          </span>
        </div>

        {/* Nút Làm Mới & Bộ Lọc Nhanh */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-card)] p-0.5 rounded-xl">
            {(
              [
                { id: 'ALL', label: t('online.tabAll') },
                { id: 'COUNT_CARDS', label: t('modes.countCards') },
                { id: 'TRADITIONAL', label: t('modes.traditional') },
                { id: '2P', label: t('online.filterSolo') },
                { id: '4P', label: t('online.filter4P') }
              ] as const
            ).map(btn => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`px-2 py-0.5 text-[10px] font-bold rounded-lg transition-all ${
                  filter === btn.id
                    ? 'bg-[var(--color-gold)] text-slate-950 shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="w-7 h-7 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-[var(--border-gold)] flex items-center justify-center text-[var(--color-gold)] active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm"
            title={t('online.refreshRooms')}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. DANH SÁCH CÁC BÀN ĐANG CHỜ (ROOM LIST) */}
      <div className="min-h-[220px] max-h-[380px] overflow-y-auto pr-0.5 space-y-2 scrollbar-thin">
        {filteredRooms.length === 0 ? (
          /* TRẠNG THÁI RỖNG (EMPTY STATE) */
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center bg-[var(--bg-container)]/40 border border-dashed border-[var(--border-container)] rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-2xl text-[var(--color-gold)] mb-2.5 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              {t('online.noRoomsMessage')}
            </h4>
            <div className="mt-4">
              <Button
                variant="gold"
                size="sm"
                onClick={onCreateRoomClick}
                leftIcon={<PlusCircle className="w-4 h-4 text-slate-950" />}
                className="font-bold text-xs py-2 px-4 shadow-lg shadow-amber-500/20"
              >
                {t('online.createRoomBtn')}
              </Button>
            </div>
          </div>
        ) : (
          /* LƯỚI DANH SÁCH BÀN CHƠI */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredRooms.map(room => {
              const hostRank = getRankTierByElo(room.hostElo);
              const isFull = room.playerCount >= room.maxPlayers;
              const isAffordable = userCoins >= room.betAmount;

              return (
                <Card
                  key={room.roomCode}
                  variant="container"
                  className="p-3 rounded-2xl border border-[var(--border-container)] hover:border-[var(--border-gold)]/60 bg-gradient-to-br from-[var(--bg-container)] to-[var(--bg-card)] transition-all flex flex-col justify-between gap-2.5 shadow-sm group"
                >
                  {/* Top: Thông tin Chủ Bàn & Mã PIN */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-base shrink-0 shadow-sm">
                        {room.hostAvatar}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-[var(--text-primary)] truncate max-w-[110px]">
                            {room.hostName}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--color-gold)] font-bold">
                            {hostRank.badge}
                          </span>
                        </div>
                        <span className="text-[9.5px] font-mono text-[var(--text-muted)] block leading-tight">
                          {t('online.roomPinLabel', { pin: room.roomCode })}
                        </span>
                      </div>
                    </div>

                    {/* Huy hiệu số người */}
                    <Badge 
                      variant={isFull ? 'danger' : 'neutral'} 
                      size="sm"
                      className="font-mono font-bold shrink-0"
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {t('online.roomSlots', { current: room.playerCount, max: room.maxPlayers })}
                    </Badge>
                  </div>

                  {/* Middle: Tags Luật & Mức Cược */}
                  <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-[var(--border-container)]/60">
                    <Badge variant="gold" size="sm" className="font-semibold text-[9.5px]">
                      💰 {t('online.betPerCard', { amount: room.betAmount.toLocaleString() })}
                    </Badge>
                    <Badge variant="neutral" size="sm" className="text-[9.5px]">
                      📜 {getSettlementRuleLabel(room.settlementRule)}
                    </Badge>
                    {room.choppingMultiplier > 1 && (
                      <Badge variant="neutral" size="sm" className="text-[9.5px] text-amber-300">
                        ⚡ {t('online.chopMultiplierBadge', { count: room.choppingMultiplier, multiplier: room.choppingMultiplier })}
                      </Badge>
                    )}
                    {room.prohibitEndingWithTwo && (
                      <Badge variant="neutral" size="sm" className="text-[9.5px]">
                        🚫 {t('online.noEndTwoBadge')}
                      </Badge>
                    )}
                  </div>

                  {/* Bottom: Nút Hành Động Vào Bàn */}
                  <div className="pt-1.5 border-t border-[var(--border-container)]/60">
                    {isFull ? (
                      <Button
                        variant="surface"
                        size="sm"
                        disabled
                        className="w-full text-xs font-bold py-1.5 justify-center opacity-60 cursor-not-allowed"
                      >
                        {t('online.roomFullSlot', { current: room.playerCount, max: room.maxPlayers })}
                      </Button>
                    ) : !isAffordable ? (
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="danger"
                          size="sm"
                          disabled
                          leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}
                          className="flex-1 text-[11px] font-bold py-1.5 justify-center opacity-80 cursor-not-allowed"
                        >
                          {t('online.needCoins', { amount: room.betAmount.toLocaleString() })}
                        </Button>
                        <Button
                          variant="surface"
                          size="sm"
                          onClick={onOpenBank}
                          className="text-[11px] font-bold py-1.5 px-2.5 text-[var(--color-gold)]"
                          title={t('online.openBankBorrow')}
                        >
                          {t('online.borrowCoins')}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => onJoinRoom(room)}
                        rightIcon={<ArrowRight className="w-3.5 h-3.5 text-slate-950" />}
                        className="w-full text-xs font-bold py-1.5 justify-center shadow-md shadow-amber-500/10 group-hover:scale-[1.01] transition-transform"
                      >
                        {t('online.joinRoomNow')}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
