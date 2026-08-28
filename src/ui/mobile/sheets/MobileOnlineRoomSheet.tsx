import React, { useState } from 'react';
import { useOnlineStore } from '../../../stores/useOnlineStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useModalStore } from '../../../stores/useModalStore';
import { 
  Users, 
  Copy, 
  Check, 
  Play, 
  Sparkles,
  Wifi
} from 'lucide-react';
import { type GameSettlementRule } from '../../../engine/types';

const SETTLEMENT_MODES: Array<{ id: GameSettlementRule; label: string }> = [
  { id: 'COUNT_CARDS', label: 'Đếm Lá' },
  { id: 'TRADITIONAL', label: 'Truyền Thống' },
  { id: 'WINNER_TAKES_ALL', label: 'Nhất Ăn Tất' }
];

const PLAYER_COUNTS: Array<2 | 3 | 4> = [2, 3, 4];

export const MobileOnlineRoomSheet: React.FC = () => {
  const { isOnlineRoomOpen, closeModal } = useModalStore();
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
  const [inputPin, setInputPin] = useState('');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [betAmount, setBetAmount] = useState<number>(1000);
  const [settlementRule, setSettlementRule] = useState<GameSettlementRule>('COUNT_CARDS');
  const [copied, setCopied] = useState(false);

  if (!isOnlineRoomOpen) return null;

  const handleCopyLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}#room=${roomCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    createRoom(profile, {
      playerCount,
      betAmount,
      settlementRule
    });
  };

  const handleJoin = () => {
    if (!inputPin.trim()) return;
    const code = inputPin.toUpperCase().startsWith('TL-') ? inputPin : `TL-${inputPin}`;
    joinRoom(profile, code);
  };

  const handleStartGame = () => {
    startMatch();
    closeModal('ONLINE_ROOM');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full bg-slate-900 border-t border-amber-500/30 rounded-t-[32px] p-6 max-h-[90vh] overflow-y-auto text-white shadow-2xl">
        {/* Handle Bar */}
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-base text-yellow-300">CHƠI ONLINE P2P</h3>
              <p className="text-[11px] text-slate-400">Kết nối trực tiếp không cần server</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (roomCode) leaveRoom();
              closeModal('ONLINE_ROOM');
            }}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400"
          >
            ✕
          </button>
        </div>

        {!roomCode ? (
          <div className="space-y-4">
            {/* Tab switch */}
            <div className="flex rounded-xl bg-slate-800 p-1 border border-white/5">
              <button
                onClick={() => setTab('CREATE')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs ${
                  tab === 'CREATE' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Tạo Bàn Mới
              </button>
              <button
                onClick={() => setTab('JOIN')}
                className={`flex-1 py-2 rounded-lg font-bold text-xs ${
                  tab === 'JOIN' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                }`}
              >
                Nhập Mã Bàn
              </button>
            </div>

            {tab === 'CREATE' ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[11px] font-bold text-amber-300 block mb-1.5">CHẾ ĐỘ</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SETTLEMENT_MODES.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSettlementRule(m.id)}
                        className={`py-2 px-1 rounded-xl text-[11px] font-bold border ${
                          settlementRule === m.id
                            ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                            : 'border-white/5 bg-slate-800/60 text-slate-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-amber-300 block mb-1.5">SỐ NGƯỜI</span>
                    <div className="grid grid-cols-3 gap-1">
                      {PLAYER_COUNTS.map(c => (
                        <button
                          key={c}
                          onClick={() => setPlayerCount(c)}
                          className={`py-2 rounded-lg text-xs font-bold border ${
                            playerCount === c
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'border-white/5 bg-slate-800/60 text-slate-400'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-amber-300 block mb-1.5">MỨC CƯỢC</span>
                    <select
                      value={betAmount}
                      onChange={e => setBetAmount(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-white/10 rounded-xl py-2 px-2 text-xs font-bold text-amber-300"
                    >
                      <option value={500}>500 Xu</option>
                      <option value={1000}>1.000 Xu</option>
                      <option value={2000}>2.000 Xu</option>
                      <option value={5000}>5.000 Xu</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  TẠO PHÒNG BẠN BÈ
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="TL-...."
                  value={inputPin}
                  onChange={e => setInputPin(e.target.value.toUpperCase())}
                  maxLength={7}
                  className="w-full py-3.5 px-4 bg-slate-800 border border-amber-500/40 rounded-2xl text-center text-xl font-mono font-black text-yellow-300 tracking-widest focus:outline-none"
                />
                <button
                  onClick={handleJoin}
                  disabled={!inputPin.trim()}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Users className="w-4 h-4" />
                  VÀO BÀN
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Waiting Room */
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-amber-300/80 font-bold block">MÃ PHÒNG</span>
                <span className="text-xl font-mono font-black text-yellow-300">{roomCode}</span>
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã chép' : 'Sao chép link'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: roomState?.playerCount || 4 }).map((_, idx) => {
                const p = roomState?.players[idx];
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      p ? 'border-amber-500/40 bg-slate-800' : 'border-dashed border-white/10 bg-slate-900/40'
                    }`}
                  >
                    {p ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{p.avatar}</span>
                          <div>
                            <span className="text-[11px] font-bold block truncate max-w-[80px]">{p.name}</span>
                            <span className="text-[9px] text-amber-300 font-bold">{p.coins.toLocaleString()}</span>
                          </div>
                        </div>
                        {isHost && !p.isHost && (
                          <button
                            onClick={() => removeSlot(idx)}
                            className="text-slate-500 hover:text-rose-400 text-xs p-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] text-slate-500">Trống</span>
                        {isHost && (
                          <button
                            onClick={() => addBotToSlot(idx)}
                            className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold"
                          >
                            +Bot
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={leaveRoom}
                className="px-4 py-3 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs"
              >
                Rời Bàn
              </button>
              {isHost ? (
                <button
                  onClick={handleStartGame}
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-1.5 shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current" />
                  BẮT ĐẦU
                </button>
              ) : (
                <div className="flex-1 py-3 rounded-xl bg-slate-800 text-center text-xs font-bold text-amber-200/80">
                  Đang chờ chủ phòng...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
