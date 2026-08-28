import React from 'react';
import { 
  Play, 
  Sliders, 
  Sparkles, 
  Crown, 
  Dice5, 
  Users, 
  Zap, 
  BrainCircuit
} from 'lucide-react';
import { TableRulesConfigPanel } from '../../components/TableRulesConfigPanel';
import { Tabs, Card, Badge, Button } from '../../primitives';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { 
  useCustomGame, 
  CustomGameModalConfig, 
  CustomGameTabType 
} from '../../hooks/useCustomGame';

export interface MobileCustomGameViewProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: Partial<CustomGameModalConfig>;
  playerCoins: number;
  onStartCustomGame: (config: CustomGameModalConfig) => void;
}

interface CustomTab {
  id: CustomGameTabType;
  label: string;
  icon: React.ReactNode;
}

const customTabs: CustomTab[] = [
  { id: 'MODE_RULES', label: '1. Luật & Bàn Đấu', icon: <Zap className="w-4 h-4" /> },
  { id: 'BOT_ROSTER', label: '2. Đội Hình Đối Thủ', icon: <Users className="w-4 h-4" /> },
  { id: 'ADVANCED_AI', label: '3. Tinh Chỉnh Chiến Thuật', icon: <BrainCircuit className="w-4 h-4" /> }
];

export const MobileCustomGameView: React.FC<MobileCustomGameViewProps> = ({
  isOpen,
  onClose,
  initialConfig,
  playerCoins,
  onStartCustomGame
}) => {
  const {
    playerCount,
    settings,
    botPersonaIds,
    choppingMultiplier,
    congEnabled,
    activeTab,
    setActiveTab,
    activeBotSeatIndex,
    setActiveBotSeatIndex,
    actualDeposit,
    isInsufficientCoins,
    seatLabels,
    activeBotCount,
    currentConfig,
    allPersonas,
    handleApplyBotPreset,
    handleApplyGodModeAll,
    handleRandomizeBots,
    handleUpdateBotPersona,
    handleConfigChange,
    handleTableConfigChange,
    handleStartGame
  } = useCustomGame({
    playerCoins,
    initialConfig,
    onStartCustomGame,
    onClose
  });

  if (!isOpen) return null;

  return (
    <MobileScreenWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Xưởng Tùy Biến Trận Đấu (Custom Sandbox)"
      subtitle="Toàn quyền tùy chỉnh luật bàn đấu, số người chơi, xếp đội hình Bot và tinh chỉnh AI."
      icon={<Sliders className="w-5 h-5 text-[var(--color-gold)]" />}
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {playerCoins.toLocaleString()} Xu
        </Badge>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0 flex flex-col">
            <span className="text-[10px] text-[var(--text-muted)] truncate">
              {playerCount} Người • Cược <span className="text-[var(--color-gold)] font-bold">{settings.betAmount.toLocaleString()} Xu</span>
            </span>
            <span className="text-[10px] text-[var(--text-muted)] truncate">
              Phạt: <span className="text-[var(--color-gold)] font-bold">x{choppingMultiplier}</span> • Cọc: <span className="text-[var(--color-gold)] font-bold">{actualDeposit.toLocaleString()} Xu</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="surface"
              size="md"
              onClick={onClose}
            >
              Hủy Bỏ
            </Button>
            <Button
              variant="gold"
              size="md"
              onClick={handleStartGame}
              disabled={isInsufficientCoins}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              <span>{isInsufficientCoins ? 'Không Đủ Tiền' : 'Bắt Đầu'}</span>
            </Button>
          </div>
        </div>
      }
      className={null}
    >
      <div className="space-y-4 pb-4 select-none">
        {/* TABS */}
        <Tabs
          options={customTabs}
          activeId={activeTab}
          onChange={(id) => {
            if (id === 'MODE_RULES' || id === 'BOT_ROSTER' || id === 'ADVANCED_AI') {
              setActiveTab(id);
            }
          }}
          className="mb-2"
        />

        {/* TAB 1: LUẬT BÀN ĐẤU */}
        {activeTab === 'MODE_RULES' && (
          <TableRulesConfigPanel
            playerCoins={playerCoins}
            config={{
              ...settings,
              playerCount,
              choppingMultiplier,
              congEnabled
            }}
            onChange={handleTableConfigChange}
            showInstantWin={true}
            showCongOption={false}
          />
        )}

        {/* TAB 2: ĐỘI HÌNH BOT */}
        {activeTab === 'BOT_ROSTER' && (
          <div className="space-y-4 animate-fade-in">
            {/* PRESETS NHANH */}
            <Card variant="surface" className="p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-gold)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Đội Hình Đối Thủ Khuyên Dùng
                  </span>
                </div>
                <Button
                  variant="surface"
                  size="sm"
                  onClick={handleRandomizeBots}
                  leftIcon={<Dice5 className="w-3.5 h-3.5 text-[var(--color-gold)]" />}
                >
                  Chọn Nhanh Đối Thủ
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { id: 'NEWBIE_TABLE', name: 'Nhập Môn Xóm Nhỏ', description: 'Elo 700 - 850 (Tí Chuột, Tèo, Bác Ba)', botIds: ['BOT_ELO_700', 'BOT_ELO_750', 'BOT_ELO_850'] as const },
                  { id: 'CASUAL_STREET', name: 'Quán Trà Bến Xe', description: 'Elo 950 - 1150 (Bảy Xe Lôi, Xích Lô, Ba Gác)', botIds: ['BOT_ELO_950', 'BOT_ELO_1000', 'BOT_ELO_1150'] as const },
                  { id: 'MID_TIER_PRO', name: 'Cao Thủ Sài Thành', description: 'Elo 1500 - 1800 (Elena, Ken, Sophia)', botIds: ['BOT_ELO_1500', 'BOT_ELO_1750', 'BOT_ELO_1800'] as const },
                  { id: 'ELITE_CLUB', name: 'Đấu Trường Monaco', description: 'Elo 2000 - 2500 (Ruby, Nova, Apex)', botIds: ['BOT_ELO_2000', 'BOT_ELO_2300', 'BOT_ELO_2500'] as const }
                ] as const).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleApplyBotPreset([preset.botIds[0], preset.botIds[1], preset.botIds[2]])}
                    className="p-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-card)] hover:border-[var(--border-gold)] text-left transition-all group cursor-pointer shadow-sm"
                  >
                    <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--color-gold)]">
                      {preset.name}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                      {preset.description}
                    </div>
                  </button>
                ))}
                
                {/* Preset Thần Bài & Siêu Trí Tuệ */}
                <button
                  onClick={handleApplyGodModeAll}
                  className="p-2.5 rounded-xl bg-[var(--color-ruby-bg)] hover:brightness-110 border border-[var(--color-ruby-border)] text-left transition-all cursor-pointer col-span-2 sm:col-span-4 flex items-center gap-2 shadow-sm"
                >
                  <Crown className="w-4 h-4 text-[var(--color-gold)] flex-shrink-0" />
                  <span className="text-xs font-bold text-red-200">
                    Thách Thức Tam Đại Boss & Thần Bài (God Mode 2750-3200 Elo + Minimax + Nash)
                  </span>
                </button>
              </div>
            </Card>

            {/* CHỌN BOT TỪNG GHẾ */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Chỉ Định Bot Cho Từng Ghế ({activeBotCount} Ghế Khả Dụng)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {seatLabels.slice(0, activeBotCount).map((label, idx) => {
                  const botId = botPersonaIds[idx];
                  const persona = allPersonas.find(p => p.id === botId) || allPersonas[0];
                  const isSelectedSeat = activeBotSeatIndex === idx;

                  return (
                    <div
                      key={idx}
                      onClick={() => setActiveBotSeatIndex(idx)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelectedSeat
                          ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] shadow-md'
                          : 'bg-[var(--bg-card)] border-[var(--border-card)] hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
                        <span className="font-bold">{label}</span>
                        {isSelectedSeat && (
                          <Badge variant="gold" size="sm">Đang Chọn</Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)] flex items-center justify-center text-2xl shadow-inner">
                          {persona?.avatar || '🤖'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text-primary)]">{persona?.name || 'Bot'}</div>
                          <div className="text-[11px] text-[var(--color-gold)] font-bold">{persona?.elo || 1150} Elo</div>
                          <div className="text-[10px] text-[var(--text-muted)] line-clamp-1">{persona?.description}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* KHO BOT SẴN CÓ */}
            <Card variant="surface" className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Kho Bot Sẵn Có (Gán vào {seatLabels[activeBotSeatIndex]})
                </span>
                <span className="text-xs text-[var(--text-muted)]">{allPersonas.length} Nhân Vật Bot</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 max-h-56 overflow-y-auto pr-1">
                {allPersonas.map((bot) => {
                  const isCurrent = botPersonaIds[activeBotSeatIndex] === bot.id;
                  return (
                    <button
                      key={bot.id}
                      onClick={() => handleUpdateBotPersona(activeBotSeatIndex, bot.id)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] text-[var(--text-primary)] shadow-sm'
                          : 'bg-[var(--bg-card)] border-[var(--border-card)] text-[var(--text-muted)] hover:border-white/30 hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="text-2xl mb-1">{bot.avatar || '🤖'}</div>
                      <div className="text-xs font-bold truncate">{bot.name}</div>
                      <div className="text-[10px] text-[var(--color-gold)] font-bold">{bot.elo} Elo</div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: TINH CHỈNH CHỈ SỐ AI */}
        {activeTab === 'ADVANCED_AI' && (
          <div className="space-y-4 animate-fade-in">
            <Card variant="surface" className="p-3.5 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Đang Tinh Chỉnh: {seatLabels[activeBotSeatIndex]}
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  Nhân vật: <strong className="text-[var(--color-gold)]">{currentConfig.name || 'Bot'}</strong> ({currentConfig.elo} Elo)
                </div>
              </div>

              {/* Chọn ghế */}
              <div className="flex items-center gap-1.5">
                {seatLabels.slice(0, activeBotCount).map((_l, i) => (
                  <Button
                    key={i}
                    variant={activeBotSeatIndex === i ? 'gold' : 'surface'}
                    size="sm"
                    onClick={() => setActiveBotSeatIndex(i)}
                  >
                    Bot {i + 1}
                  </Button>
                ))}
              </div>
            </Card>

            {/* SLIDER THÔNG SỐ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 1. MCTS Simulations */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">Mô Phỏng MCTS:</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{currentConfig.mctsSimulations || 0} ván</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={currentConfig.mctsSimulations || 0}
                  onChange={(e) => handleConfigChange('mctsSimulations', parseInt(e.target.value, 10))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">Mô phỏng trước các nhánh rẽ tương lai để tìm nước tối ưu</div>
              </Card>

              {/* 2. Memory Depth */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">Nhớ Bài (Memory Depth):</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.memoryDepth || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentConfig.memoryDepth || 0}
                  onChange={(e) => handleConfigChange('memoryDepth', parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">Tỷ lệ nhớ các lá bài đã đánh, Heo và Hàng trên bàn</div>
              </Card>

              {/* 3. Tempo Control */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">Nhịp Độ (Tempo Control):</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.tempoControl || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentConfig.tempoControl || 0}
                  onChange={(e) => handleConfigChange('tempoControl', parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">Quyết định xả rác nhanh hay ém bài chém Heo</div>
              </Card>

              {/* 4. Baiting Tendency */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">Nhử Mồi (Baiting Tendency):</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.baitingTendency || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentConfig.baitingTendency || 0}
                  onChange={(e) => handleConfigChange('baitingTendency', parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">Đánh bài lẻ cao để lừa đối phương chém Heo vào bẫy Hàng</div>
              </Card>

              {/* 5. Damage Control */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">Hạn Chế Thiệt Hại (Damage Control):</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.damageControl || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentConfig.damageControl || 0}
                  onChange={(e) => handleConfigChange('damageControl', parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">Tẩu thoát bài sớm để giảm số lá phạt khi khó tranh Nhất</div>
              </Card>

              {/* 6. Anti-Leader */}
              <Card variant="nested" className="p-3.5 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">Chặn Người Sắp Thắng (Anti-Leader):</span>
                  <span className="font-mono text-[var(--color-gold)] font-bold">{Math.round((currentConfig.antiLeaderAggression || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentConfig.antiLeaderAggression || 0}
                  onChange={(e) => handleConfigChange('antiLeaderAggression', parseFloat(e.target.value))}
                  className="w-full accent-[var(--color-gold)] cursor-pointer"
                />
                <div className="text-[10px] text-[var(--text-muted)]">Quyết liệt chặn đối thủ còn ít bài để giữ thế trận</div>
              </Card>

              {/* 7. Bộ Thuật Toán AI Solvers Cao Cấp */}
              <Card variant="nested" className="p-3.5 sm:col-span-2 space-y-3">
                <div className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-wider flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4" /> Bộ Thuật Toán AI Solvers Cao Cấp (Tier 7 - 9)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Minimax Alpha-Beta Endgame */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] cursor-pointer hover:border-[var(--border-gold)] transition-colors">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">Minimax Alpha-Beta (Tier 8+)</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Vét cạn độ sâu 10-12 plies tìm thế Forced-Win</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.useMinimaxEndgame)}
                      onChange={(e) => handleConfigChange('useMinimaxEndgame', e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-gold)] cursor-pointer"
                    />
                  </label>

                  {/* Bayesian Probability Tracker */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] cursor-pointer hover:border-[var(--border-gold)] transition-colors">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">Suy Luận Xác Suất Bayes (Tier 8+)</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Đoán xác suất bài ẩn dựa vào nhịp bỏ lượt</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.useBayesianInference)}
                      onChange={(e) => handleConfigChange('useBayesianInference', e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-gold)] cursor-pointer"
                    />
                  </label>

                  {/* Nash Equilibrium Solver */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] cursor-pointer hover:border-[var(--border-gold)] transition-colors">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">Cân Bằng Nash Hỗn Hợp (Tier 9 Boss)</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Chiến lược ngẫu hóa chống bị đối thủ bắt bài</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.useNashEquilibrium)}
                      onChange={(e) => handleConfigChange('useNashEquilibrium', e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-gold)] cursor-pointer"
                    />
                  </label>

                  {/* Dynamic Repartitioning */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] cursor-pointer hover:border-[var(--border-gold)] transition-colors">
                    <div>
                      <div className="text-xs font-bold text-[var(--text-primary)]">Tái Cấu Trúc Nhánh Bài Động (Tier 6+)</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Xé phỏm bẻ sảnh Branch & Bound cứu Cóng</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(currentConfig.useDynamicRepartitioning)}
                      onChange={(e) => handleConfigChange('useDynamicRepartitioning', e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-gold)] cursor-pointer"
                    />
                  </label>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </MobileScreenWrapper>
  );
};
