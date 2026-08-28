import React from 'react';
import { PlayerProfile } from '../../../engine/storage';
import { ECONOMY_CONSTANTS } from '../../../engine/constants/economy';
import { Sparkles, User, Check, Shuffle } from 'lucide-react';
import { Card, Button } from '../../primitives';
import { MobileScreenWrapper } from './MobileScreenWrapper';
import { useNameSetup } from '../../hooks/useNameSetup';
import { generateRandomCasinoNickname } from '../components/MobileVirtualKeyboard';
import { MobileVirtualInput } from '../components/MobileVirtualInput';

export interface MobileNameSetupViewProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: (() => void) | null;
  onUpdateProfile: (updated: PlayerProfile) => void;
  isFirstTime: boolean;
}

export const MobileNameSetupView: React.FC<MobileNameSetupViewProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdateProfile,
  isFirstTime
}) => {
  const {
    name,
    setName,
    avatar,
    setAvatar,
    error,
    setError,
    avatarOptions,
    handleSubmit
  } = useNameSetup({ profile, isOpen, onClose, onUpdateProfile });

  if (!isOpen) return null;

  const handleQuickRandom = () => {
    const nick = generateRandomCasinoNickname();
    setName(nick);
    if (error) setError(null);
  };

  return (
    <MobileScreenWrapper
      isOpen={isOpen}
      onClose={onClose ? onClose : () => {}}
      title={isFirstTime || !profile.name ? 'Chào Mừng Thần Bài Mới' : 'Cập Nhật Hồ Sơ'}
      subtitle={
        isFirstTime || !profile.name
          ? 'Thiết lập biệt danh & đại diện để bước vào sòng bạc'
          : 'Đổi tên hiển thị & biểu tượng đại diện của bạn'
      }
      icon={<Sparkles className="w-5 h-5 text-[var(--color-gold)]" />}
      headerRight={null}
      footer={
        <div className="w-full flex items-center justify-end gap-2">
          {!isFirstTime && onClose && profile.name.trim() !== '' && (
            <Button variant="surface" size="md" onClick={onClose}>
              Hủy
            </Button>
          )}
          <Button
            variant="gold"
            size="md"
            onClick={() => handleSubmit(null)}
            leftIcon={<Check className="w-4 h-4" />}
          >
            {isFirstTime || !profile.name ? 'Bắt Đầu Chơi' : 'Lưu Thay Đổi'}
          </Button>
        </div>
      }
      className={null}
    >
      <div className="space-y-2.5 pb-6 select-none">
        {/* 1. Chọn Avatar Đại Diện */}
        <Card variant="card" className="p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Chọn Biểu Tượng Đại Diện ({avatarOptions.length} Mẫu):
            </label>
            <span className="text-[10px] text-[var(--color-gold)] font-bold">
              Đã chọn: <span className="text-base align-middle">{avatar}</span>
            </span>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:gap-2.5 max-h-40 sm:max-h-48 overflow-y-auto pr-1 p-0.5">
            {avatarOptions.map((av) => {
              const isSelected = avatar === av;
              return (
                <button
                  type="button"
                  key={av}
                  onClick={() => setAvatar(av)}
                  className={`h-11 sm:h-12 rounded-xl text-2xl sm:text-3xl flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--bg-card-active)] border-2 border-[var(--color-gold)] scale-105 shadow-md'
                      : 'bg-[var(--bg-container)] border border-[var(--border-container)] hover:border-white/25 hover:scale-105'
                  }`}
                >
                  <span className="emoji-avatar">{av}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 2. Nhập Tên Biệt Danh Dùng MobileVirtualInput */}
        <Card variant="card" className="p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Biệt Danh Thần Bài:
            </span>
            {isFirstTime && (
              <span className="text-[10px] text-[var(--text-muted)]">
                Vốn: <strong className="text-[var(--color-gold)] font-bold">{ECONOMY_CONSTANTS.DEFAULT_STARTING_COINS.toLocaleString()} Xu</strong>
              </span>
            )}
          </div>

          <MobileVirtualInput
            value={name}
            onChange={(val) => {
              setName(val);
              if (error) setError(null);
            }}
            placeholder="Chạm để nhập tên..."
            icon={<User className="w-4 h-4 text-[var(--color-gold)]" />}
            label={null}
            error={error}
            maxLength={20}
            showRandomNameButton={true}
            showPasteButton={false}
            onRandomName={handleQuickRandom}
            onPaste={null}
            onSubmit={() => handleSubmit(null)}
            className={null}
            inputClassName="border-[var(--color-gold-border)]"
            clearable={false}
            renderExtraActions={() => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickRandom();
                }}
                className="p-1 sm:p-1.5 rounded-lg bg-[var(--bg-container)] border border-[var(--border-container)] text-[var(--color-gold)] hover:bg-[var(--bg-card)] active:scale-95 transition-all cursor-pointer"
                title="Tạo tên ngẫu nhiên"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
            )}
          />
        </Card>
      </div>
    </MobileScreenWrapper>
  );
};
