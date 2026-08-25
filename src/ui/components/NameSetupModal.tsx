import React, { useState, useEffect } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { Sparkles, User, Check, X } from 'lucide-react';
import { soundManager } from '../audio/sound-manager';

interface NameSetupModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose?: () => void;
  onUpdateProfile: (updated: PlayerProfile) => void;
  isFirstTime?: boolean;
}

const AVATAR_OPTIONS = ['🤠', '🤴', '🥷', '🎩', '🦊', '🐉', '🐯', '🦁', '👸', '😎', '🧙‍♂️', '💎'];

export const NameSetupModal: React.FC<NameSetupModalProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdateProfile,
  isFirstTime = false
}) => {
  const [name, setName] = useState<string>(profile.name || '');
  const [avatar, setAvatar] = useState<string>(profile.avatar || '🤠');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(profile.name || '');
      setAvatar(profile.avatar || '🤠');
      setError(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Vui lòng nhập tên / biệt danh của bạn!');
      return;
    }
    if (trimmed.length < 2) {
      setError('Biệt danh phải có ít nhất 2 ký tự!');
      return;
    }
    if (trimmed.length > 20) {
      setError('Biệt danh không được vượt quá 20 ký tự!');
      return;
    }

    const updated: PlayerProfile = {
      ...profile,
      name: trimmed,
      avatar: avatar
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
    soundManager.playVictory();

    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 select-none">
      <div className="relative w-full max-w-md bg-[#121724] rounded-2xl border border-[#d4af37]/40 shadow-2xl p-5 sm:p-6 text-white flex flex-col justify-between overflow-hidden">
        {/* Nút đóng nếu không phải bắt buộc lần đầu */}
        {!isFirstTime && onClose && profile.name.trim() !== '' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-[#182030] hover:bg-[#222c42] text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Title */}
        <div className="flex items-center gap-3 pb-3.5 border-b border-white/10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#aa8620] flex items-center justify-center text-[#0a0d14] font-black shadow-md">
            <Sparkles className="w-6 h-6 text-[#0a0d14]" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#f3e5ab] uppercase tracking-wide">
              {isFirstTime || !profile.name ? 'Chào Mừng Thần Bài Mới' : 'Cập Nhật Hồ Sơ'}
            </h2>
            <p className="text-xs text-slate-400">
              {isFirstTime || !profile.name
                ? 'Thiết lập biệt danh & đại diện để bước vào sòng bạc'
                : 'Đổi tên hiển thị & biểu tượng đại diện của bạn'}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="my-4 space-y-4">
          {/* 1. Chọn Avatar Đại Diện */}
          <div>
            <label className="block text-xs font-black text-[#f3e5ab] uppercase tracking-wider mb-2">
              Chọn Biểu Tượng Đại Diện:
            </label>
            <div className="grid grid-cols-6 gap-2 p-2.5 rounded-xl bg-[#0a0d14] border border-white/10">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => setAvatar(av)}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
                    avatar === av
                      ? 'bg-gradient-to-br from-[#d4af37] to-[#aa8620] scale-105 shadow ring-2 ring-[#d4af37]'
                      : 'bg-[#182030] hover:bg-[#222c42] hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Nhập Tên Biệt Danh */}
          <div>
            <label className="block text-xs font-black text-[#f3e5ab] uppercase tracking-wider mb-2">
              Biệt Danh Thần Bài:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4 text-[#d4af37]" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ví dụ: Thần Bài Sài Gòn..."
                maxLength={20}
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-[#0a0d14] border border-[#d4af37]/40 rounded-xl text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all"
              />
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-red-400 font-bold flex items-center gap-1">
                <span>⚠️</span>
                <span>{error}</span>
              </p>
            )}
            <p className="mt-1 text-[11px] text-slate-400">
              Vốn khởi nghiệp mặc định: <strong className="text-[#f3e5ab] font-bold">1.000.000 Xu</strong>
            </p>
          </div>

          {/* Nút xác nhận */}
          <button
            type="submit"
            className="w-full mt-3 py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa8620] hover:from-[#f3e5ab] hover:to-[#d4af37] text-[#0a0d14] font-black text-sm uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#ffe699]"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>{isFirstTime || !profile.name ? 'Bắt Đầu Gia Nhập Sòng Bạc' : 'Lưu Thay Đổi'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
