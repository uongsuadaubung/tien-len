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
import { Modal, Tabs, Card, Badge, Button } from '../../primitives';
import { 
  useCustomGame, 
  CustomGameModalConfig, 
  CustomGameTabType 
} from '../../hooks/useCustomGame';

export type { CustomGameModalConfig };

interface CustomGameModalProps {
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

export const CustomGameModal: React.FC<CustomGameModalProps> = ({
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Xưởng Tùy Biến Trận Đấu (Custom Sandbox)"
      subtitle="Toàn quyền tùy chỉnh luật bàn đấu, số người chơi, lựa chọn đối thủ và phong cách thi đấu."
      icon={<Sliders className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="4xl"
      height="h-[92vh] sm:h-[720px]"
      headerRight={
        <Badge variant="neutral" size="md">
          🪙 {playerCoins.toLocaleString()} Xu
        </Badge>
      }
      footer={
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-muted)] hidden sm:block">
            Đang chọn: <span className="text-[var(--text-primary)] font-bold">{playerCount} Người</span> • Cược: <span className="text-[var(--color-gold)] font-bold">{settings.betAmount.toLocaleString()} Xu</span> • Phạt: <span className="text-[var(--color-gold)] font-bold">x{choppingMultiplier}</span> • Tiền cọc an toàn: <span className="text-[var(--color-gold)] font-bold">{actualDeposit.toLocaleString()} Xu</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="surface"
              size="md"
              onClick={onClose}
              className="flex-1 sm:flex-none"
            >
              Hủy Bỏ
            </Button>
            <Button
              variant="gold"
              size="md"
              onClick={handleStartGame}
              disabled={isInsufficientCoins}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
              className="flex-1 sm:flex-none"
            >
              <span>{isInsufficientCoins ? 'Không Đủ Tiền Cược' : 'Bắt Đầu Trận Đấu'}</span>
            </Button>
          </div>
        </div>
      }
    >
      {/* TABS */}
      <Tabs
        options={customTabs}
        activeId={activeTab}
        onChange={(id) => {
          if (id === 'MODE_RULES' || id === 'BOT_ROSTER' || id === 'ADVANCED_AI') {
            setActiveTab(id);
          }
        }}
        className="mb-4"
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

      {/* TAB 2: ĐỘI HÌNH ĐỐI THỦ */}
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
                { id: 'NEWBIE_TABLE', name: 'Nhập Môn Xóm Nhỏ', description: 'Tí Chuột, Tèo, Bác Ba', botIds: ['BOT_ELO_700', 'BOT_ELO_750', 'BOT_ELO_850'] as const },
                { id: 'CASUAL_STREET', name: 'Quán Trà Bến Xe', description: 'Bảy Xe Lôi, Xích Lô, Ba Gác', botIds: ['BOT_ELO_950', 'BOT_ELO_1000', 'BOT_ELO_1150'] as const },
                { id: 'MID_TIER_PRO', name: 'Cao Thủ Sài Thành', description: 'Elena, Ken, Sophia', botIds: ['BOT_ELO_1500', 'BOT_ELO_1750', 'BOT_ELO_1800'] as const },
                { id: 'ELITE_CLUB', name: 'Đấu Trường Monaco', description: 'Ruby, Nova, Apex', botIds: ['BOT_ELO_2000', 'BOT_ELO_2300', 'BOT_ELO_2500'] as const }
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
              
              {/* Preset Thần Bài & Trùm Sòng */}
              <button
                onClick={handleApplyGodModeAll}
                className="p-2.5 rounded-xl bg-[var(--color-ruby-bg)] hover:brightness-110 border border-[var(--color-ruby-border)] text-left transition-all cursor-pointer col-span-2 sm:col-span-4 flex items-center gap-2 shadow-sm"
              >
                <Crown className="w-4 h-4 text-[var(--color-gold)] flex-shrink-0" />
                <span className="text-xs font-bold text-red-200">
                  Thách Thức Tam Đại Trùm Sòng & Thần Bài (Cao Thủ Thượng Thừa)
                </span>
              </button>
            </div>
          </Card>

          {/* CHỌN ĐỐI THỦ TỪNG GHẾ */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Chỉ Định Đối Thủ Cho Từng Ghế ({activeBotCount} Ghế Khả Dụng)
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
                        {persona?.avatar || '👤'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">{persona?.name || 'Đối thủ'}</div>
                        <div className="text-[11px] text-[var(--color-gold)] font-bold">{persona?.elo || 1150} Elo</div>
                        <div className="text-[10px] text-[var(--text-muted)] line-clamp-1">{persona?.description}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DANH SÁCH ĐỐI THỦ KHẢ DỤNG */}
          <Card variant="surface" className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Danh Sách Đối Thủ Khả Dụng (Gán vào {seatLabels[activeBotSeatIndex]})
              </span>
              <span className="text-xs text-[var(--text-muted)]">{allPersonas.length} Nhân Vật</span>
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
                    <div className="text-2xl mb-1">{bot.avatar || '👤'}</div>
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
                Nhân vật: <strong className="text-[var(--color-gold)]">{currentConfig.name || 'Đối thủ'}</strong> ({currentConfig.elo} Elo)
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
                  Đối thủ {i + 1}
                </Button>
              ))}
            </div>
          </Card>

          {/* SLIDER THÔNG SỐ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Simulations Lookahead */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Độ Sâu Tính Nước:</span>
                <span className="font-mono text-[var(--color-gold)] font-bold">{currentConfig.mctsSimulations || 0} lượt</span>
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
              <div className="text-[10px] text-[var(--text-muted)]">Tính toán trước các nước bài khả dĩ để ra đòn chính xác</div>
            </Card>

            {/* 2. Memory Depth */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Khả Năng Nhớ Bài:</span>
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
              <div className="text-[10px] text-[var(--text-muted)]">Mức độ ghi nhớ các lá bài lẻ, Heo và Hàng đã xuất hiện</div>
            </Card>

            {/* 3. Tempo Control */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Kiểm Soát Nhịp Độ:</span>
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
              <div className="text-[10px] text-[var(--text-muted)]">Chủ động điều tiết nhịp trận đấu, xả rác hoặc ém bài rình rập</div>
            </Card>

            {/* 4. Baiting Tendency */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Nghệ Thuật Nhử Mồi:</span>
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
              <div className="text-[10px] text-[var(--text-muted)]">Tung bài mồi dẫn dụ đối phương chém Heo vào thế trận giăng sẵn</div>
            </Card>

            {/* 5. Damage Control */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Kỹ Năng Cắt Lỗ:</span>
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
              <div className="text-[10px] text-[var(--text-muted)]">Chủ động tẩu thoát bài sớm để giảm thiểu tiền phạt khi bài xấu</div>
            </Card>

            {/* 6. Anti-Leader */}
            <Card variant="nested" className="p-3.5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-[var(--text-primary)]">Khả Năng Đì Bài:</span>
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
              <div className="text-[10px] text-[var(--text-muted)]">Quyết liệt chặn đứng đối thủ sắp hết bài để giành lại thế trận</div>
            </Card>

            {/* 7. Tuyệt Kỹ & Chiến Thuật Đặc Biệt */}
            <Card variant="nested" className="p-3.5 sm:col-span-2 space-y-3">
              <div className="text-xs font-bold text-[var(--color-gold)] uppercase tracking-wider flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4" /> Tuyệt Kỹ & Chiến Thuật Đặc Biệt
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Endgame solver */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] cursor-pointer hover:border-[var(--border-gold)] transition-colors">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Tính Toán Tàn Cuộc Tuyệt Đối</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Tính trước toàn bộ nước bài cuối ván để tìm đường về Nhất chắc thắng</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(currentConfig.useMinimaxEndgame)}
                    onChange={(e) => handleConfigChange('useMinimaxEndgame', e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-gold)] cursor-pointer"
                  />
                </label>

                {/* Card tracker / Inference */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] cursor-pointer hover:border-[var(--border-gold)] transition-colors">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Đoán Bài Ẩn Qua Nhịp Bỏ Lượt</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Phán đoán bài trên tay đối thủ dựa vào các lượt bỏ bài</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(currentConfig.useBayesianInference)}
                    onChange={(e) => handleConfigChange('useBayesianInference', e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-gold)] cursor-pointer"
                  />
                </label>

                {/* Unpredictable play */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-card)] cursor-pointer hover:border-[var(--border-gold)] transition-colors">
                  <div>
                    <div className="text-xs font-bold text-[var(--text-primary)]">Lối Đánh Biến Ảo Khó Lường</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Chiến thuật đánh biến hóa ngẫu nhiên chống bị bắt bài</div>
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
                    <div className="text-xs font-bold text-[var(--text-primary)]">Tái Cấu Trúc Bộ Bài Linh Hoạt</div>
                    <div className="text-[10px] text-[var(--text-muted)]">Linh hoạt phá sảnh, xé đôi để thoát bài cứu Cóng</div>
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
    </Modal>
  );
};
