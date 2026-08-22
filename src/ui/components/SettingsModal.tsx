import React, { useState } from 'react';
import { GameMode, GameSettings } from '../../engine/types';
import { BOT_PERSONAS, getAllBotConfigs } from '../../ai/bot-factory';
import { BotConfig } from '../../ai/types';
import { Settings, Volume2, VolumeX, Sliders, X, Check, BrainCircuit, Sparkles, ChevronDown, ChevronUp, Crown } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (settings: GameSettings) => void;
  botPersonaIds: [string, string, string]; // Persona của 3 bot
  onUpdateBotPersona: (index: number, personaId: string) => void;
  customBotConfigs: [Partial<BotConfig>, Partial<BotConfig>, Partial<BotConfig>];
  onUpdateCustomBotConfig: (index: number, config: Partial<BotConfig>) => void;
  onApplyGodModeAll: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  botPersonaIds,
  onUpdateBotPersona,
  customBotConfigs,
  onUpdateCustomBotConfig,
  onApplyGodModeAll
}) => {
  if (!isOpen) return null;

  const allPersonas = getAllBotConfigs();
  const [activeSeatTab, setActiveSeatTab] = useState<number>(0);
  const [showAdvancedTuner, setShowAdvancedTuner] = useState<boolean>(false);

  const seatNames = ['Ghế Trái (Bot 1)', 'Ghế Trên (Bot 2)', 'Ghế Phải (Bot 3)'];
  const activePersona = BOT_PERSONAS[botPersonaIds[activeSeatTab]] || BOT_PERSONAS.CHU_BAY;
  const activeCustom = customBotConfigs[activeSeatTab] || {};

  const currentConfig: BotConfig = {
    ...activePersona,
    ...activeCustom
  };

  const handleSliderChange = (field: keyof BotConfig, value: number) => {
    onUpdateCustomBotConfig(activeSeatTab, {
      ...activeCustom,
      [field]: value
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1c060a] border-2 border-yellow-500/80 rounded-3xl p-6 shadow-2xl text-white">
        {/* Nút Đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-yellow-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề */}
        <div className="flex items-center justify-between border-b border-yellow-500/30 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-yellow-500/20 border border-yellow-400/40 text-yellow-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-yellow-300">
                Cài Đặt & Xưởng Tùy Biến Bot
              </h2>
              <p className="text-xs text-yellow-100/70">
                Tùy biến luật chơi và tinh chỉnh các chỉ số thuật toán AI theo ý muốn.
              </p>
            </div>
          </div>

          {/* Nút Kích Hoạt God Mode Nhanh */}
          <button
            onClick={onApplyGodModeAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-red-950 font-black text-xs hover:scale-105 transition-all shadow-md cursor-pointer border border-yellow-200"
            title="Biến tất cả 3 Bot thành Cô Sáu Thần Bài Tối Thượng"
          >
            <Crown className="w-4 h-4" />
            <span>GOD MODE 100%</span>
          </button>
        </div>

        <div className="space-y-5">
          {/* Chế Độ Chơi */}
          <div>
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
              Chế Độ Chơi
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'TRADITIONAL', title: 'Truyền Thống (Nhất Nhì Ba Bét)', desc: 'Chơi đến khi 3 người về đích' },
                { id: 'COUNT_CARDS', title: 'Đếm Lá (Ăn Thua Ngay)', desc: '1 người về Nhất tính tiền đếm lá' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => onUpdateSettings({ ...settings, mode: m.id as GameMode })}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    settings.mode === m.id
                      ? 'bg-yellow-500/20 border-yellow-400 text-yellow-200 shadow-md ring-1 ring-yellow-400/50'
                      : 'bg-black/40 border-neutral-700/50 text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{m.title}</span>
                    {settings.mode === m.id && <Check className="w-4 h-4 text-yellow-400" />}
                  </div>
                  <p className="text-[11px] text-yellow-100/60 mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Mức Cược Ván Đấu */}
          <div>
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
              Mức Cược Lì Xì (🧧 / Lá / Bậc)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 200, 500].map(amount => (
                <button
                  key={amount}
                  onClick={() => onUpdateSettings({ ...settings, betAmount: amount })}
                  className={`py-2 rounded-xl font-black text-xs transition-all border ${
                    settings.betAmount === amount
                      ? 'bg-yellow-500 text-red-950 border-yellow-300 shadow-md'
                      : 'bg-black/40 border-neutral-700/60 text-yellow-300/80 hover:bg-neutral-800'
                  }`}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* Chọn Persona Nhanh Cho 3 Ghế */}
          <div>
            <label className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
              Nhân Cách 3 Bot Bàn Chơi
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {seatNames.map((seatName, seatIdx) => (
                <div key={seatIdx} className="bg-black/40 p-2.5 rounded-2xl border border-yellow-500/20">
                  <span className="text-[11px] font-bold text-yellow-400 block mb-1">{seatName}</span>
                  <select
                    value={botPersonaIds[seatIdx]}
                    onChange={e => onUpdateBotPersona(seatIdx, e.target.value)}
                    className="w-full bg-neutral-900 border border-yellow-500/40 rounded-xl px-2 py-1.5 text-xs text-yellow-200 font-bold focus:outline-none focus:ring-1 focus:ring-yellow-400"
                  >
                    {['Tier 1: Tập Sự', 'Tier 2: Phong Trào', 'Tier 3: Kinh Nghiệm', 'Tier 4: Cao Thủ', 'Tier 5: Thần Bài'].map(tierName => {
                      const tierBots = allPersonas.filter(p => p.tier === tierName);
                      if (tierBots.length === 0) return null;
                      return (
                        <optgroup key={tierName} label={`--- ${tierName} ---`} className="bg-neutral-950 text-amber-400 font-bold">
                          {tierBots.map(p => (
                            <option key={p.id} value={p.id} className="text-yellow-200">
                              {p.avatar} {p.name} (Elo {p.elo || '???'})
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* XƯỞNG TÙY BIẾN CHỈ SỐ BOT (CUSTOM BOT LAB) */}
          <div className="p-4 rounded-2xl bg-black/50 border border-yellow-500/30">
            <div
              onClick={() => setShowAdvancedTuner(!showAdvancedTuner)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 text-yellow-300 font-extrabold text-xs uppercase tracking-wider">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                <span>Xưởng Tùy Biến Chỉ Số Thuật Toán AI (Custom Bot Lab)</span>
              </div>
              <button className="text-yellow-400 p-1 hover:bg-white/10 rounded-lg">
                {showAdvancedTuner ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showAdvancedTuner && (
              <div className="mt-4 pt-3 border-t border-yellow-500/20 space-y-4 animate-fade-in">
                {/* Chọn Ghế Cần Tinh Chỉnh */}
                <div className="flex gap-2">
                  {seatNames.map((name, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSeatTab(idx)}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all border ${
                        activeSeatTab === idx
                          ? 'bg-yellow-500 text-red-950 border-yellow-300 shadow-md'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:bg-neutral-800'
                      }`}
                    >
                      {name.split(' ')[0]} {name.split(' ')[1]}
                    </button>
                  ))}
                </div>

                <div className="bg-neutral-900/90 p-3 rounded-2xl border border-neutral-800 space-y-3 text-xs">
                  {/* 1. Trí nhớ đếm bài */}
                  <div>
                    <div className="flex justify-between font-bold mb-1 text-yellow-300">
                      <span>🧠 Trí Nhớ Đếm Bài (`memoryDepth`)</span>
                      <span>{Math.round((currentConfig.memoryDepth || 1) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={currentConfig.memoryDepth ?? 1}
                      onChange={e => handleSliderChange('memoryDepth', Number(e.target.value))}
                      className="w-full accent-yellow-400"
                    />
                  </div>

                  {/* 2. Quản lý nhịp & Cướp cái */}
                  <div>
                    <div className="flex justify-between font-bold mb-1 text-yellow-300">
                      <span>⚡ Kiểm Soát Nhịp & Cướp Cái (`tempoControl`)</span>
                      <span>{Math.round((currentConfig.tempoControl || 0.5) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={currentConfig.tempoControl ?? 0.5}
                      onChange={e => handleSliderChange('tempoControl', Number(e.target.value))}
                      className="w-full accent-yellow-400"
                    />
                  </div>

                  {/* 3. Gài bẫy & Dụ Heo */}
                  <div>
                    <div className="flex justify-between font-bold mb-1 text-yellow-300">
                      <span>🎭 Gài Bẫy & Dụ Heo (`baitingTendency`)</span>
                      <span>{Math.round((currentConfig.baitingTendency || 0.5) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={currentConfig.baitingTendency ?? 0.5}
                      onChange={e => handleSliderChange('baitingTendency', Number(e.target.value))}
                      className="w-full accent-yellow-400"
                    />
                  </div>

                  {/* 4. Chặn người sắp thắng */}
                  <div>
                    <div className="flex justify-between font-bold mb-1 text-yellow-300">
                      <span>🛑 Chặn Người Sắp Thắng (`antiLeaderAggression`)</span>
                      <span>{Math.round((currentConfig.antiLeaderAggression || 0.8) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={currentConfig.antiLeaderAggression ?? 0.8}
                      onChange={e => handleSliderChange('antiLeaderAggression', Number(e.target.value))}
                      className="w-full accent-yellow-400"
                    />
                  </div>

                  {/* 5. Cắt lỗ & Né thối Heo */}
                  <div>
                    <div className="flex justify-between font-bold mb-1 text-yellow-300">
                      <span>🛡️ Cắt Lỗ / Né Thối Heo (`damageControl`)</span>
                      <span>{Math.round((currentConfig.damageControl || 0.5) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={currentConfig.damageControl ?? 0.5}
                      onChange={e => handleSliderChange('damageControl', Number(e.target.value))}
                      className="w-full accent-yellow-400"
                    />
                  </div>

                  {/* 6. Mô phỏng Monte Carlo MCTS */}
                  <div>
                    <div className="flex justify-between font-bold mb-1 text-yellow-300">
                      <span>🎲 Giả Lập Monte Carlo MCTS (`mctsSimulations`)</span>
                      <span>{currentConfig.mctsSimulations || 0} ván giả lập/lượt</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={currentConfig.mctsSimulations ?? 0}
                      onChange={e => handleSliderChange('mctsSimulations', Number(e.target.value))}
                      className="w-full accent-yellow-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tốc độ suy nghĩ của Bot & Âm thanh */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/40 p-3 rounded-2xl border border-yellow-500/20">
              <label className="text-xs font-bold text-yellow-300 block mb-1">
                Tốc Độ Đánh Bot: {settings.botThinkDelayMs}ms
              </label>
              <input
                type="range"
                min="200"
                max="1500"
                step="100"
                value={settings.botThinkDelayMs}
                onChange={e => onUpdateSettings({ ...settings, botThinkDelayMs: Number(e.target.value) })}
                className="w-full accent-yellow-400"
              />
            </div>

            <div className="bg-black/40 p-3 rounded-2xl border border-yellow-500/20 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-yellow-300 block">Âm Thanh Hiệu Ứng</span>
                <span className="text-[11px] text-yellow-100/60">Tiếng bài, chặt heo, pháo</span>
              </div>
              <button
                onClick={() => onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })}
                className={`p-2 rounded-xl border transition-all ${
                  settings.soundEnabled
                    ? 'bg-yellow-500 text-red-950 border-yellow-300'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Nút Hoàn Tất */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-red-950 font-black text-sm hover:scale-105 transition-all shadow-lg cursor-pointer"
          >
            Lưu Cài Đặt
          </button>
        </div>
      </div>
    </div>
  );
};
