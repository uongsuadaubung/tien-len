import React from 'react';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  Eye, 
  CheckCircle, 
  BrainCircuit, 
  Timer, 
  Crosshair,
  Wand2,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  LogOut,
  Key,
  ExternalLink,
  History,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Modal, Button } from '../../primitives';
import { GameSpeedMode } from '../../../engine/game-speed';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import { useSettingsSync } from '../../hooks/useSettingsSync';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  autoSortEnabled: boolean;
  onToggleAutoSort: () => void;
  aiHintEnabled: boolean;
  onToggleAiHint: () => void;
  quickResponseAssistEnabled: boolean;
  onToggleQuickResponseAssist: () => void;
  xrayEnabled: boolean;
  onToggleXRay: () => void;
  botReasoningLogEnabled: boolean;
  onToggleBotReasoningLog: () => void;
  gameSpeed: GameSpeedMode;
  onSetGameSpeed: (speed: GameSpeedMode) => void;
}

const ToggleSwitch: React.FC<{ checked: boolean }> = ({ checked }) => (
  <div
    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 flex-shrink-0 ${
      checked
        ? 'bg-[var(--color-gold)] shadow-sm shadow-amber-500/30'
        : 'bg-zinc-800 border border-zinc-700'
    }`}
  >
    <div
      className={`w-5 h-5 rounded-full shadow transform transition-transform duration-200 ${
        checked ? 'translate-x-5 bg-[#0a0c0e]' : 'translate-x-0 bg-zinc-400'
      }`}
    />
  </div>
);

function formatDateTime(timestamp: number): string {
  if (!timestamp) return 'Chưa từng đồng bộ';
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  soundEnabled,
  onToggleSound,
  autoSortEnabled,
  onToggleAutoSort,
  aiHintEnabled,
  onToggleAiHint,
  quickResponseAssistEnabled,
  onToggleQuickResponseAssist,
  xrayEnabled,
  onToggleXRay,
  botReasoningLogEnabled,
  onToggleBotReasoningLog,
  gameSpeed,
  onSetGameSpeed
}) => {
  const {
    githubToken,
    cachedGithubUser,
    lastSync,
    autoBackupOnMatchEnd,
    toggleAutoBackupOnMatchEnd,
    autoBackupInterval,
    setAutoBackupInterval,
    autoSyncOnStartup,
    toggleAutoSyncOnStartup,
    clearGithubAuth
  } = useSettingsStore();

  const {
    tokenInputValue,
    setTokenInputValue,
    isSyncing,
    isValidatingToken,
    syncStatusMsg,
    setSyncStatusMsg,
    conflictData,
    historyItems,
    isLoadingHistory,
    showHistoryModal,
    setShowHistoryModal,
    handleConnectToken,
    handleSmartSync,
    handleForceUpload,
    handleForceDownload,
    handleOpenHistory,
    handleRestoreCommit,
    showNotification
  } = useSettingsSync(isOpen);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài Đặt Trò Chơi"
      subtitle="Tùy chỉnh âm thanh, nhịp độ, công cụ bàn đấu và đồng bộ đám mây"
      icon={<Settings className="w-5 h-5 text-[var(--color-gold)]" />}
      maxWidth="xl"
      height="auto"
      footer={
        <div className="w-full flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)] font-medium">Tiến Lên Miền Nam</span>
          <Button variant="surface" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        {/* ========================================================================= */}
        {/* NHÓM 1: ĐỒNG BỘ ĐÁM MÂY (GITHUB GIST SYNC) */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-md overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--bg-container)]/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-[var(--color-gold)] shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)] leading-none">
                Đồng Bộ Đám Mây (GitHub Gist)
              </span>
            </div>
            {githubToken && (
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 font-medium leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                Đã kết nối
              </span>
            )}
          </div>

          <div className="p-4 space-y-3.5">
            {/* TH1: CHƯA KẾT NỐI TOKEN */}
            {!githubToken ? (
              <div className="space-y-3">
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Lưu trữ và đồng bộ toàn bộ số Xu, ELO, Nhiệm vụ và Thành tựu của bạn lên <strong className="text-[var(--text-primary)]">GitHub Gist</strong> cá nhân an toàn và bảo mật.
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--text-muted)] inline-flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[var(--color-gold)] shrink-0" />
                    <span>GitHub Personal Access Token (Gist Token)</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="password"
                        value={tokenInputValue}
                        onChange={(e) => setTokenInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleConnectToken()}
                        placeholder="ghp_xxxxxxxxxxxx hoặc github_pat_xxxx"
                        className="w-full bg-[var(--bg-container)] border border-[var(--border-container)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-gold)] transition-colors placeholder:text-zinc-600"
                      />
                    </div>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={handleConnectToken}
                      disabled={isValidatingToken || !tokenInputValue.trim()}
                      leftIcon={isValidatingToken ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
                      className="px-4 text-xs font-semibold whitespace-nowrap"
                    >
                      {isValidatingToken ? 'Đang kết nối...' : 'Kết Nối'}
                    </Button>
                  </div>
                </div>

                {/* Hướng dẫn tạo token */}
                <div className="p-3 rounded-xl bg-[var(--bg-container)]/80 border border-[var(--border-container)] text-[11px] text-[var(--text-muted)] space-y-1">
                  <div className="flex items-center justify-between text-[var(--text-secondary)] font-medium">
                    <span>Chưa có GitHub Token?</span>
                    <a
                      href="https://github.com/settings/tokens/new?description=Tien%20Len%20Save%20Sync&scopes=gist"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-gold)] hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      <span>Tạo nhanh 1-Click</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    Chỉ cần tick chọn quyền <code className="bg-zinc-800 text-amber-300 px-1 py-0.5 rounded text-[10px]">gist</code> và nhấn Generate token, sau đó dán mã vào ô trên.
                  </p>
                </div>
              </div>
            ) : (
              /* TH2: ĐÃ KẾT NỐI TOKEN */
              <div className="space-y-3.5">
                {/* Profile Card */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-container)]/70 border border-[var(--border-container)] gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {cachedGithubUser?.avatar_url ? (
                      <img
                        src={cachedGithubUser.avatar_url}
                        alt="GitHub Avatar"
                        className="w-10 h-10 rounded-full border border-[var(--color-gold-border)] shrink-0 object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-card)] flex items-center justify-center text-sm font-bold text-[var(--color-gold)] shrink-0">
                        GH
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-[var(--text-primary)] inline-flex items-center gap-1.5 flex-wrap">
                        <span>{cachedGithubUser?.name || cachedGithubUser?.login || 'GitHub User'}</span>
                        {cachedGithubUser?.login && (
                          <span className="text-[11px] font-normal text-[var(--text-muted)]">
                            (@{cachedGithubUser.login})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                        <span>Lần đồng bộ cuối:</span>
                        <span className="text-zinc-300 font-medium">{formatDateTime(lastSync)}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="surface"
                    size="sm"
                    onClick={() => {
                      clearGithubAuth();
                      setTokenInputValue('');
                      showNotification('Đã ngắt kết nối tài khoản GitHub.', 'info');
                    }}
                    leftIcon={<LogOut className="w-3.5 h-3.5 shrink-0" />}
                    className="text-[11px] text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40 shrink-0"
                  >
                    Đăng Xuất
                  </Button>
                </div>

                {/* Các nút thao tác đồng bộ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={handleSmartSync}
                    disabled={isSyncing}
                    className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25 font-bold text-xs transition-all active:scale-95 disabled:opacity-40 select-none cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 mb-1.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="leading-tight">Đồng Bộ Ngay</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleForceUpload}
                    disabled={isSyncing}
                    className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border bg-[var(--bg-card)] border-[var(--border-card)] text-sky-400 hover:bg-[var(--bg-card-hover)] hover:border-sky-500/30 text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 select-none cursor-pointer"
                  >
                    <CloudUpload className="w-4 h-4 mb-1.5 shrink-0 text-sky-400" />
                    <span className="text-[var(--text-secondary)] leading-tight">Tải Lên Gist</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleForceDownload}
                    disabled={isSyncing}
                    className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border bg-[var(--bg-card)] border-[var(--border-card)] text-emerald-400 hover:bg-[var(--bg-card-hover)] hover:border-emerald-500/30 text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 select-none cursor-pointer"
                  >
                    <CloudDownload className="w-4 h-4 mb-1.5 shrink-0 text-emerald-400" />
                    <span className="text-[var(--text-secondary)] leading-tight">Tải Về Máy</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenHistory}
                    disabled={isSyncing}
                    className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border bg-[var(--bg-card)] border-[var(--border-card)] text-amber-400 hover:bg-[var(--bg-card-hover)] hover:border-amber-500/30 text-xs font-semibold transition-all active:scale-95 disabled:opacity-40 select-none cursor-pointer"
                  >
                    <History className="w-4 h-4 mb-1.5 shrink-0 text-amber-400" />
                    <span className="text-[var(--text-secondary)] leading-tight">Lịch Sử Gist</span>
                  </button>
                </div>

                {/* Tùy chọn Tự Động Đồng Bộ Khi Vào Game */}
                <div
                  onClick={toggleAutoSyncOnStartup}
                  className="pt-2.5 border-t border-[var(--border-card)] flex items-center justify-between cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-emerald-400 shrink-0 flex items-center justify-center">
                      <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)] leading-tight group-hover:text-[var(--color-gold)] transition-colors">
                        Tự Động Đồng Bộ Khi Vào Game
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        Tự động kiểm tra và tải dữ liệu mới nhất từ Gist khi khởi động
                      </div>
                    </div>
                  </div>
                  <ToggleSwitch checked={autoSyncOnStartup} />
                </div>

                {/* Tùy chọn Tự Động Sao Lưu Sau Mỗi Ván */}
                <div className="pt-2.5 border-t border-[var(--border-card)] space-y-2">
                  <div
                    onClick={toggleAutoBackupOnMatchEnd}
                    className="flex items-center justify-between cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-card)] text-sky-400 shrink-0 flex items-center justify-center">
                        <CloudUpload className="w-3.5 h-3.5 shrink-0" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)] leading-tight group-hover:text-[var(--color-gold)] transition-colors">
                          Tự Động Sao Lưu Đám Mây
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          Tự động tải bản lưu mới nhất lên Gist theo chu kỳ ván đấu
                        </div>
                      </div>
                    </div>
                    <ToggleSwitch checked={autoBackupOnMatchEnd} />
                  </div>

                  {/* Lựa chọn chu kỳ sao lưu */}
                  {autoBackupOnMatchEnd && (
                    <div className="pl-8 flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-[var(--text-muted)] font-medium">
                        Chu kỳ sao lưu:
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 3, 5, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setAutoBackupInterval(num)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
                              (autoBackupInterval || 5) === num
                                ? 'bg-[var(--color-gold)] text-black shadow-sm'
                                : 'bg-[var(--bg-container)] border border-[var(--border-container)] text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {num === 1 ? 'Mỗi ván' : `${num} ván`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Thông báo trạng thái Sync */}
            {syncStatusMsg && (
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                  syncStatusMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : syncStatusMsg.type === 'error'
                    ? 'bg-red-500/10 border-red-500/20 text-red-300'
                    : 'bg-sky-500/10 border-sky-500/20 text-sky-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {syncStatusMsg.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {syncStatusMsg.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
                  {syncStatusMsg.type === 'info' && <RefreshCw className="w-4 h-4 text-sky-400 shrink-0 animate-spin" />}
                  <span className="leading-tight">{syncStatusMsg.text}</span>
                </div>
                <button
                  onClick={() => setSyncStatusMsg(null)}
                  className="text-xs opacity-60 hover:opacity-100 p-0.5 ml-2 shrink-0 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* BẢNG GIẢI QUYẾT XUNG ĐỘT (NẾU CÓ) */}
            {conflictData && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Xung Đột Dữ Liệu: Cả hai bên đều có thay đổi mới!</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Vui lòng lựa chọn giữ lại bản dữ liệu trên máy hiện tại hoặc áp dụng bản lưu từ GitHub Gist:
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Bản Local */}
                  <div className="p-2.5 rounded-lg bg-[var(--bg-container)] border border-[var(--border-container)] space-y-1">
                    <div className="font-bold text-[var(--color-gold)] flex items-center gap-1.5">
                      <span>💻</span>
                      <span>Bản Trên Máy (Local)</span>
                    </div>
                    <div className="text-[11px] text-zinc-300">Xu: {conflictData.localData.profile.coins.toLocaleString()}</div>
                    <div className="text-[11px] text-zinc-300">ELO: {conflictData.localData.profile.elo}</div>
                    <div className="text-[11px] text-zinc-300">Thắng: {conflictData.localData.profile.stats.wins} ván</div>
                    <Button
                      variant="gold"
                      size="sm"
                      fullWidth
                      onClick={handleForceUpload}
                      disabled={isSyncing}
                      className="mt-2 text-[11px]"
                    >
                      Ghi đè Đám mây
                    </Button>
                  </div>

                  {/* Bản Cloud */}
                  <div className="p-2.5 rounded-lg bg-[var(--bg-container)] border border-[var(--border-container)] space-y-1">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>☁️</span>
                      <span>Bản Đám Mây (Gist)</span>
                    </div>
                    <div className="text-[11px] text-zinc-300">Xu: {conflictData.cloudData.profile.coins.toLocaleString()}</div>
                    <div className="text-[11px] text-zinc-300">ELO: {conflictData.cloudData.profile.elo}</div>
                    <div className="text-[11px] text-zinc-300">Thắng: {conflictData.cloudData.profile.stats.wins} ván</div>
                    <Button
                      variant="surface"
                      size="sm"
                      fullWidth
                      onClick={handleForceDownload}
                      disabled={isSyncing}
                      className="mt-2 text-[11px] text-emerald-400 border-emerald-500/30"
                    >
                      Áp dụng vào Máy
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL LỊCH SỬ BẢN LƯU GIST */}
        {showHistoryModal && (
          <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--color-gold-border)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-gold)]">
                <History className="w-4 h-4 shrink-0" />
                <span>Lịch Sử 5 Bản Lưu Gần Nhất Trên Gist</span>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-xs text-[var(--text-muted)] hover:text-white cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-4 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--color-gold)] shrink-0" />
                <span>Đang tải lịch sử commits từ Gist...</span>
              </div>
            ) : historyItems && historyItems.length > 0 ? (
              <div className="space-y-2">
                {historyItems.map((item) => (
                  <div
                    key={item.version}
                    className="p-2.5 rounded-xl bg-[var(--bg-container)] border border-[var(--border-container)] flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">
                        {formatDateTime(new Date(item.committedAt).getTime())}
                      </div>
                      {item.saveData?.profile ? (
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Tên: <strong className="text-zinc-200">{item.saveData.profile.name || 'Người Chơi'}</strong> | Xu: <strong className="text-amber-400">{item.saveData.profile.coins.toLocaleString()}</strong> | ELO: <strong className="text-sky-400">{item.saveData.profile.elo}</strong>
                        </div>
                      ) : (
                        <div className="text-[10px] text-zinc-500">Bản lưu không chứa profile hợp lệ</div>
                      )}
                    </div>
                    {item.saveData && (
                      <Button
                        variant="surface"
                        size="sm"
                        onClick={() => handleRestoreCommit(item)}
                        disabled={isSyncing}
                        className="text-[11px] text-[var(--color-gold)] border-[var(--color-gold-border)] ml-2 shrink-0"
                      >
                        Khôi Phục
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-[var(--text-muted)]">
                Chưa có lịch sử lưu nào trên Gist.
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* NHÓM 2: ÂM THANH TRÒ CHƠI */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-md overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--bg-container)]/70 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[var(--color-gold)] shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)] leading-none">
              Âm Thanh Trò Chơi
            </span>
          </div>

          <div>
            {/* Âm thanh bàn đấu */}
            <div
              onClick={onToggleSound}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors shrink-0 flex items-center justify-center ${soundEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  {soundEnabled ? <Volume2 className="w-4 h-4 shrink-0" /> : <VolumeX className="w-4 h-4 shrink-0" />}
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-tight">Âm Thanh Bàn Đấu</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Tiếng chia bài, đập bài, chặt heo và chiến thắng</div>
                </div>
              </div>

              <ToggleSwitch checked={soundEnabled} />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NHÓM 3: NHỊP ĐỘ VÁN ĐẤU */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-md overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--bg-container)]/70 flex items-center gap-2">
            <Timer className="w-4 h-4 text-[var(--color-gold)] shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)] leading-none">
              Nhịp Độ Ván Đấu
            </span>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-tight">Tốc Độ Ra Bài Của Đối Thủ</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Tùy chỉnh tốc độ suy nghĩ và nhịp độ ra bài tại bàn đấu</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onSetGameSpeed('FAST')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  gameSpeed === 'FAST'
                    ? 'bg-[var(--color-gold)]/15 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-md shadow-amber-500/10'
                    : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]/50'
                }`}
              >
                <span className="text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 leading-none">
                  <span className="shrink-0">⚡</span>
                  <span>Nhanh</span>
                </span>
                <span className="text-[10px] text-[var(--text-muted)] mt-1">0.4s - 0.6s</span>
              </button>

              <button
                type="button"
                onClick={() => onSetGameSpeed('REALISTIC')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  gameSpeed === 'REALISTIC'
                    ? 'bg-[var(--color-gold)]/15 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-md shadow-amber-500/10'
                    : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]/50'
                }`}
              >
                <span className="text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 leading-none">
                  <span className="shrink-0">🎯</span>
                  <span>Chân Thực</span>
                </span>
                <span className="text-[10px] text-[var(--text-muted)] mt-1">0.8s - 3.0s</span>
              </button>

              <button
                type="button"
                onClick={() => onSetGameSpeed('DELIBERATE')}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  gameSpeed === 'DELIBERATE'
                    ? 'bg-[var(--color-gold)]/15 border-[var(--color-gold)] text-[var(--color-gold)] font-bold shadow-md shadow-amber-500/10'
                    : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-secondary)] hover:border-[var(--border-gold)]/50'
                }`}
              >
                <span className="text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 leading-none">
                  <span className="shrink-0">🧠</span>
                  <span>Cân Não</span>
                </span>
                <span className="text-[10px] text-[var(--text-muted)] mt-1">2.5s - 3.5s</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NHÓM 4: HỖ TRỢ THAO TÁC & ĐÁNH BÀI */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-md overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--bg-container)]/70 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[var(--color-gold)] shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)] leading-none">
              Hỗ Trợ Thao Tác &amp; Đánh Bài
            </span>
          </div>

          <div className="space-y-0.5">
            {/* 1. Tự động gom bộ & xếp bài */}
            <div
              onClick={onToggleAutoSort}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors shrink-0 flex items-center justify-center ${autoSortEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-tight">Tự Động Gom Bộ &amp; Xếp Bài</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Tự sắp xếp sảnh, đôi, tứ quý ngay sau khi chia bài</div>
                </div>
              </div>

              <ToggleSwitch checked={autoSortEnabled} />
            </div>

            {/* 2. Hỗ Trợ Bắt Bài Nhanh */}
            <div
              onClick={onToggleQuickResponseAssist}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors shrink-0 flex items-center justify-center ${quickResponseAssistEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  <Crosshair className="w-4 h-4 shrink-0" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-tight">Hỗ Trợ Bắt Bài Nhanh</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Hiển thị nút chọn nhanh các tổ hợp hợp lệ để chặn đối thủ</div>
                </div>
              </div>

              <ToggleSwitch checked={quickResponseAssistEnabled} />
            </div>

            {/* 3. Trợ lý AI Gợi Ý Nước Đi */}
            <div
              onClick={onToggleAiHint}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors shrink-0 flex items-center justify-center ${aiHintEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  <Wand2 className="w-4 h-4 shrink-0" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-tight">Trợ Lý AI Gợi Ý Nước Đi</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Hiển thị nút tư vấn chiến thuật tối ưu khi đến lượt đánh</div>
                </div>
              </div>

              <ToggleSwitch checked={aiHintEnabled} />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NHÓM 5: PHÂN TÍCH & NÂNG CAO */}
        {/* ========================================================================= */}
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-card)] shadow-md overflow-hidden">
          <div className="px-4 py-2.5 bg-[var(--bg-container)]/70 flex items-center gap-2">
            <Eye className="w-4 h-4 text-[var(--color-gold)] shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)] leading-none">
              Phân Tích &amp; Nâng Cao
            </span>
          </div>

          <div className="space-y-0.5">
            {/* 1. Chế Độ Soi Bài (X-Ray) */}
            <div
              onClick={onToggleXRay}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors shrink-0 flex items-center justify-center ${xrayEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  <Eye className="w-4 h-4 shrink-0" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-tight">Chế Độ Soi Bài (X-Ray)</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Phân tích xác suất và quan sát toàn bộ bàn đấu</div>
                </div>
              </div>

              <ToggleSwitch checked={xrayEnabled} />
            </div>

            {/* 2. Nhật Ký Suy Luận Bot AI (Debug Mode) */}
            <div
              onClick={onToggleBotReasoningLog}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] cursor-pointer transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border transition-colors shrink-0 flex items-center justify-center ${botReasoningLogEnabled ? 'bg-[var(--bg-card-active)] border-[var(--color-gold-border)] text-[var(--color-gold)]' : 'bg-[var(--bg-container)] border-[var(--border-container)] text-[var(--text-muted)]'}`}>
                  <BrainCircuit className="w-4 h-4 shrink-0" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] leading-tight">Bảng Phân Tích Thế Trận (Nâng Cao)</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">Hiển thị góc nhìn phân tích và suy đoán bài của từng ghế ngồi</div>
                </div>
              </div>

              <ToggleSwitch checked={botReasoningLogEnabled} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

