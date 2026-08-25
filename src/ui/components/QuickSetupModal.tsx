import React, { useState } from 'react';
import { GameSettlementRule, GameRules, GameSettings } from '../../engine/types';
import { 
  X, 
  Play, 
  Users, 
  Coins, 
  Zap, 
  Crown, 
  Layers, 
  Flame, 
  ShieldAlert, 
  Snowflake, 
  Ban, 
  Check,
  Sliders
} from 'lucide-react';

export interface QuickSetupConfig {
  playerCount: 2 | 3 | 4;
  betAmount: number;
  settlementRule: GameSettlementRule;
  choppingMultiplier: number;
  congEnabled: boolean;
  prohibitEndingWithTwo: boolean;
  allowFourPairsCutAnytime: boolean;
}

interface QuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerCoins: number;
  onStartGame: (config: QuickSetupConfig) => void;
}

const PRESET_BETS = [500, 1000, 2000, 5000, 10000, 20000];

export const QuickSetupModal: React.FC<QuickSetupModalProps> = ({
  isOpen,
  onClose,
  playerCoins,
  onStartGame
}) => {
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [betAmount, setBetAmount] = useState<number>(() => Math.min(1000, Math.max(100, Math.floor(playerCoins / 26))));
  const [customBetInput, setCustomBetInput] = useState<string>(betAmount.toString());
  const [settlementRule, setSettlementRule] = useState<GameSettlementRule>('CARD_COUNT');
  const [choppingMultiplier, setChoppingMultiplier] = useState<number>(1);
  const [congEnabled, setCongEnabled] = useState<boolean>(true);
  const [prohibitEndingWithTwo, setProhibitEndingWithTwo] = useState<boolean>(true);
  const [allowFourPairsCutAnytime, setAllowFourPairsCutAnytime] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSelectPresetBet = (amt: number) => {
    setBetAmount(amt);
    setCustomBetInput(amt.toString());
  };

  const handleCustomBetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value.replace(/\D/g, '');
    setCustomBetInput(valStr);
    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val > 0) {
      setBetAmount(val);
    }
  };

  const depositRequired = 26 * betAmount * choppingMultiplier;
  const depositPercent = playerCoins > 0 ? (depositRequired / playerCoins) * 100 : 100;
  const isInsufficientCoins = playerCoins < depositRequired;

  const handleStart = () => {
    if (isInsufficientCoins && playerCoins > 0) {
      alert(`Số dư hiện tại (${playerCoins.toLocaleString()} Xu) không đủ để đặt cọc an toàn cho bàn đấu (Cần tối thiểu ${depositRequired.toLocaleString()} Xu)!`);
      return;
    }

    onStartGame({
      playerCount,
      betAmount: Math.max(10, betAmount),
      settlementRule,
      choppingMultiplier,
      congEnabled,
      prohibitEndingWithTwo,
      allowFourPairsCutAnytime
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#1c0307] via-[#140103] to-[#0a0001] rounded-3xl border-2 border-yellow-500/50 shadow-2xl p-5 sm:p-6 text-white flex flex-col justify-between overflow-hidden max-h-[90vh]">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer z-10 border border-yellow-500/20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* TIÊU ĐỀ MODAL */}
        <div className="flex items-center gap-3 pb-3 border-b border-yellow-500/20">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-600 to-yellow-500 flex items-center justify-center text-red-950 shadow-lg">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-yellow-300 uppercase tracking-wide flex items-center gap-2">
              Cấu Hình Bàn Chơi Nhanh
            </h2>
            <p className="text-xs text-neutral-400">Tùy chỉnh tiền cược, luật phạt và vào bàn chơi ngay</p>
          </div>
        </div>

        {/* BẢNG ĐÁNH GIÁ RỦI RO TÀI CHÍNH & TIỀN CỌC AN TOÀN (Ghim ngay đầu Header) */}
        <div className={`mt-3 p-3.5 rounded-2xl border transition-all shadow-md ${
          isInsufficientCoins
            ? 'bg-red-950/80 border-red-500 text-red-200'
            : depositPercent > 65
            ? 'bg-red-950/50 border-red-500/70 text-red-100'
            : depositPercent > 35
            ? 'bg-amber-950/50 border-amber-500/70 text-amber-100'
            : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-5 h-5 ${
                isInsufficientCoins || depositPercent > 65 ? 'text-red-400 animate-pulse' : depositPercent > 35 ? 'text-amber-400' : 'text-emerald-400'
              }`} />
              <div>
                <div className="text-xs font-black uppercase tracking-wide flex items-center gap-2">
                  <span>Đánh Giá Rủi Ro Tài Chính Bàn Đấu</span>
                </div>
                <div className="text-[10px] text-neutral-300">
                  Tiền cọc an toàn: <strong className="text-yellow-300">{depositRequired.toLocaleString()} Xu</strong> ({depositPercent.toFixed(1)}% tài sản ví)
                </div>
              </div>
            </div>

            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${
              isInsufficientCoins
                ? 'bg-red-900 text-red-200 border-red-400 animate-pulse'
                : depositPercent > 65
                ? 'bg-red-900 text-red-200 border-red-400'
                : depositPercent > 35
                ? 'bg-amber-900 text-amber-200 border-amber-400'
                : 'bg-emerald-900 text-emerald-200 border-emerald-400'
            }`}>
              {isInsufficientCoins ? 'Thiếu Tiền Cọc' : depositPercent > 65 ? 'Tất Tay / Tử Địa' : depositPercent > 35 ? 'Rủi Ro Cao' : 'An Toàn'}
            </span>
          </div>

          <div className="text-[11px] mt-2 leading-relaxed opacity-95">
            {isInsufficientCoins ? (
              <span>❌ <strong>SỐ DƯ KHÔNG ĐỦ:</strong> Bạn cần tối thiểu <strong>{depositRequired.toLocaleString()} Xu</strong> để đặt cọc vào bàn. Hãy giảm cược hoặc vay thêm vốn từ Ngân Hàng.</span>
            ) : depositPercent > 65 ? (
              <span>⚠️ <strong>CẢNH BÁO TỬ ĐỊA:</strong> Bạn đang mạo hiểm <strong>{depositPercent.toFixed(0)}%</strong> tài sản ví! Một ván thua Cóng hoặc bị chặt chồng heo có thể khiến bạn cháy túi ngay lập tức.</span>
            ) : depositPercent > 35 ? (
              <span>⚠️ <strong>RỦI RO ĐÁNG KỂ:</strong> Tiền cọc chiếm <strong>{depositPercent.toFixed(0)}%</strong> ví. Hãy đánh cẩn trọng, tránh om heo và chặt đè khi chưa nắm chắc cái.</span>
            ) : (
              <span>✅ <strong>VỐN AN TOÀN:</strong> Mức cọc chỉ chiếm <strong>{depositPercent.toFixed(1)}%</strong> ví. Số dư của bạn hoàn toàn dư dả để chịu các biến động sát phạt.</span>
            )}
          </div>
        </div>

        {/* NỘI DUNG CUỘN TRỌN GỌI TRONG 1 TRANG */}
        <div className="my-4 space-y-4 overflow-y-auto pr-1">
          {/* 1. SỐ NGƯỜI CHƠI (TABLE SCALE) */}
          <div>
            <label className="text-xs font-black text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Số Người Chơi Trên Bàn</span>
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { count: 2, label: 'Solo 1v1', desc: '13 lá/người • Căng não' },
                { count: 3, label: 'Bàn 3 Người', desc: '13 lá/người • Nhanh gọn' },
                { count: 4, label: 'Bàn 4 Người', desc: 'Chuẩn Tiến Lên Miền Nam' }
              ].map(item => (
                <button
                  key={item.count}
                  onClick={() => setPlayerCount(item.count as 2 | 3 | 4)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    playerCount === item.count
                      ? 'bg-gradient-to-r from-amber-950/90 to-yellow-950/80 border-yellow-400 text-yellow-100 shadow-md ring-1 ring-yellow-400'
                      : 'bg-black/40 border-yellow-500/20 text-neutral-400 hover:text-yellow-200 hover:border-yellow-500/40'
                  }`}
                >
                  <div className="font-extrabold text-xs sm:text-sm text-yellow-300">{item.label}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. MỨC CƯỢC BÀN (BET AMOUNT) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span>Mức Cược Cơ Bản</span>
              </label>
              <span className="text-[11px] text-neutral-400">
                Ví hiện có: <strong className="text-yellow-300">{playerCoins.toLocaleString()} Xu</strong>
              </span>
            </div>

            {/* Chip cược nhanh */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
              {PRESET_BETS.map(amt => (
                <button
                  key={amt}
                  onClick={() => handleSelectPresetBet(amt)}
                  className={`py-2 px-1 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    betAmount === amt
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-red-950 border-yellow-200 shadow-lg scale-105'
                      : 'bg-neutral-900/90 hover:bg-neutral-800 text-yellow-300/80 border-yellow-500/20'
                  }`}
                >
                  {amt.toLocaleString()} 🧧
                </button>
              ))}
            </div>

            {/* Ô nhập cược tùy biến */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Tùy biến cược:</span>
              <input
                type="text"
                value={customBetInput}
                onChange={handleCustomBetChange}
                placeholder="Nhập mức cược..."
                className="flex-1 bg-black/60 border border-yellow-500/30 focus:border-yellow-400 rounded-xl px-3 py-1.5 text-xs text-yellow-300 font-bold outline-none"
              />
              <span className="text-xs text-yellow-400 font-bold">Xu</span>
            </div>
          </div>

          {/* 3. KIỂU KẾT TOÁN & TÍNH TIỀN (SETTLEMENT RULE) */}
          <div>
            <label className="text-xs font-black text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Kiểu Kết Toán & Tính Tiền</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Đếm Lá */}
              <div
                onClick={() => setSettlementRule('CARD_COUNT')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                  settlementRule === 'CARD_COUNT'
                    ? 'bg-gradient-to-br from-amber-950 to-yellow-950/90 border-yellow-400 text-yellow-100 shadow-md ring-1 ring-yellow-400'
                    : 'bg-black/40 border-yellow-500/20 text-neutral-400 hover:border-yellow-500/40'
                }`}
              >
                <div className="flex items-center gap-1.5 font-extrabold text-xs text-yellow-300">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Tiến Lên Đếm Lá</span>
                </div>
                <p className="text-[10px] text-neutral-300 mt-1 leading-relaxed">
                  1 người về Nhất kết thúc ván ngay. Người thua đền <strong className="text-yellow-300">{(betAmount * choppingMultiplier).toLocaleString()} Xu</strong> / lá tồn ({choppingMultiplier > 1 ? `sát phạt x${choppingMultiplier}` : '1x cược'}).
                </p>
              </div>

              {/* Truyền Thống */}
              <div
                onClick={() => setSettlementRule('TRADITIONAL_RANK_BASED')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                  settlementRule === 'TRADITIONAL_RANK_BASED'
                    ? 'bg-gradient-to-br from-amber-950 to-yellow-950/90 border-yellow-400 text-yellow-100 shadow-md ring-1 ring-yellow-400'
                    : 'bg-black/40 border-yellow-500/20 text-neutral-400 hover:border-yellow-500/40'
                }`}
              >
                <div className="flex items-center gap-1.5 font-extrabold text-xs text-yellow-300">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span>Truyền Thống</span>
                </div>
                <p className="text-[10px] text-neutral-300 mt-1 leading-relaxed">
                  {playerCount === 4 ? (
                    <>
                      Đánh đến áp chót. Nhất (<strong className="text-emerald-400">+{(betAmount * 3 * choppingMultiplier).toLocaleString()}</strong>), Nhì (<strong className="text-emerald-300">+{(betAmount * 1 * choppingMultiplier).toLocaleString()}</strong>), Ba (<strong className="text-red-400">-{(betAmount * 1 * choppingMultiplier).toLocaleString()}</strong>), Bét (<strong className="text-red-500">-{(betAmount * 3 * choppingMultiplier).toLocaleString()}</strong>).
                    </>
                  ) : playerCount === 3 ? (
                    <>
                      Đánh đến áp chót. Nhất (<strong className="text-emerald-400">+{(betAmount * 2 * choppingMultiplier).toLocaleString()}</strong>), Nhì (0), Bét (<strong className="text-red-500">-{(betAmount * 2 * choppingMultiplier).toLocaleString()}</strong>).
                    </>
                  ) : (
                    <>
                      Solo 1v1. Nhất (<strong className="text-emerald-400">+{(betAmount * 1 * choppingMultiplier).toLocaleString()}</strong>), Bét (<strong className="text-red-500">-{(betAmount * 1 * choppingMultiplier).toLocaleString()}</strong>).
                    </>
                  )}
                </p>
              </div>

              {/* Nhất Ăn Tất */}
              <div
                onClick={() => setSettlementRule('WINNER_TAKES_ALL')}
                className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                  settlementRule === 'WINNER_TAKES_ALL'
                    ? 'bg-gradient-to-br from-amber-950 to-yellow-950/90 border-yellow-400 text-yellow-100 shadow-md ring-1 ring-yellow-400'
                    : 'bg-black/40 border-yellow-500/20 text-neutral-400 hover:border-yellow-500/40'
                }`}
              >
                <div className="flex items-center gap-1.5 font-extrabold text-xs text-yellow-300">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Nhất Ăn Tất</span>
                </div>
                <p className="text-[10px] text-neutral-300 mt-1 leading-relaxed">
                  Chỉ người về Nhất nhận tiền, gom trọn <strong className="text-yellow-300">{(betAmount * (playerCount - 1) * choppingMultiplier).toLocaleString()} Xu</strong> ({playerCount - 1} đối thủ × {(betAmount * choppingMultiplier).toLocaleString()} Xu).
                </p>
              </div>
            </div>
          </div>

          {/* 4. LUẬT PHẠT & HỆ SỐ NHÂN (PENALTIES & STAKES) */}
          <div>
            <label className="text-xs font-black text-yellow-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Tùy Chọn Luật Phạt & Hệ Số Nhân</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Hệ Số Sát Phạt (Penalty Multiplier x1, x2, x3, x4, x5) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-neutral-950/70 border border-yellow-500/20 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500 animate-pulse" />
                  <div>
                    <div className="text-xs font-bold text-yellow-200 flex items-center gap-2">
                      <span>Hệ Số Sát Phạt Bàn Đấu</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-red-950 text-red-300 border border-red-500/40 font-black">
                        {choppingMultiplier === 1 ? 'Chuẩn (x1)' : choppingMultiplier === 2 ? 'Sát Phạt (x2)' : choppingMultiplier === 3 ? 'Khốc Liệt (x3)' : choppingMultiplier === 4 ? 'Tử Địa (x4)' : 'Đại Gia (x5)'}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Nhân {choppingMultiplier}x toàn bộ tiền phạt Đếm lá, Chặt Heo/Hàng, Thối bài và Phạt Cóng
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-yellow-500/20">
                  {[1, 2, 3, 4, 5].map(mult => (
                    <button
                      key={mult}
                      onClick={() => setChoppingMultiplier(mult)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        choppingMultiplier === mult
                          ? mult >= 4
                            ? 'bg-gradient-to-r from-red-600 to-purple-600 text-white shadow-lg scale-105 ring-1 ring-red-400'
                            : mult >= 2
                            ? 'bg-red-600 text-white shadow-md scale-105'
                            : 'bg-amber-600 text-white shadow-md'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      x{mult}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phạt Cóng (Cháy Bài) */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-950/70 border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs font-bold text-yellow-200">Luật Phạt Cóng (Cháy Bài)</div>
                    <div className="text-[10px] text-neutral-400">
                      Không ra được lá nào đền <strong className="text-yellow-300">{26 * choppingMultiplier} lá</strong> ({(betAmount * 26 * choppingMultiplier).toLocaleString()} Xu)
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setCongEnabled(!congEnabled)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    congEnabled
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                  }`}
                >
                  {congEnabled ? 'BẬT' : 'TẮT'}
                </button>
              </div>

              {/* Cấm 2 Cuối Cùng */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-950/70 border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-400" />
                  <div>
                    <div className="text-xs font-bold text-yellow-200">Cấm Đánh 2 Cuối Cùng</div>
                    <div className="text-[10px] text-neutral-400">
                      Cấm về Heo • Thối phạt từ <strong className="text-yellow-300">{(betAmount * 1 * choppingMultiplier).toLocaleString()}</strong> đến <strong className="text-yellow-300">{(betAmount * 6 * choppingMultiplier).toLocaleString()} Xu</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setProhibitEndingWithTwo(!prohibitEndingWithTwo)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    prohibitEndingWithTwo
                      ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                      : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                  }`}
                >
                  {prohibitEndingWithTwo ? 'BẬT' : 'TẮT'}
                </button>
              </div>

              {/* 4 Đôi Thông Cắt Tự Do */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-neutral-950/70 border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <div>
                    <div className="text-xs font-bold text-yellow-200">4 Đôi Thông Cắt Tự Do</div>
                    <div className="text-[10px] text-neutral-400">
                      Chặt bất kỳ lúc nào • Thắng ngay <strong className="text-yellow-300">+{(betAmount * 6 * choppingMultiplier).toLocaleString()} Xu</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setAllowFourPairsCutAnytime(!allowFourPairsCutAnytime)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    allowFourPairsCutAnytime
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                  }`}
                >
                  {allowFourPairsCutAnytime ? 'BẬT' : 'TẮT'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTION BUTTONS */}
        <div className="pt-3 border-t border-yellow-500/20 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="py-3 px-5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer border border-neutral-700"
          >
            Hủy Bỏ
          </button>

          <button
            onClick={handleStart}
            disabled={isInsufficientCoins}
            className={`flex-1 py-3 px-6 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 border ${
              isInsufficientCoins
                ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-red-950 hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-yellow-200'
            }`}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{isInsufficientCoins ? 'Không Đủ Xu Đặt Cọc' : 'Vào Bàn Chơi Ngay'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
