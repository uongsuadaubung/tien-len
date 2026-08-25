import React, { useState, useEffect } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { Sparkles, User, Check, X, Shield, Award } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#1e070a] via-[#120204] to-black rounded-3xl border-2 border-yellow-500/70 shadow-[0_0_60px_rgba(234,179,8,0.25)] p-5 sm:p-6 text-white flex flex-col justify-between overflow-hidden">
        {/* Nút đóng nếu không phải bắt buộc lần đầu */}
        {!isFirstTime && onClose && profile.name.trim() !== '' && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer border border-neutral-700"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Title */}
        <div className="flex items-center gap-3 pb-3.5 border-b border-yellow-500/20">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 via-amber-600 to-yellow-500 flex items-center justify-center text-red-950 font-black shadow-lg">
            <Sparkles className="w-6 h-6 text-yellow-100" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-yellow-300 uppercase tracking-wide">
              {isFirstTime || !profile.name ? 'Chào Mừng Thần Bài Mới' : 'Cập Nhật Hồ Sơ'}
            </h2>
            <p className="text-xs text-neutral-300">
              {isFirstTime || !profile.name
                ? 'Thiết lập biệt danh & đại diện để bước vào sới bạc'
                : 'Đổi tên hiển thị & biểu tượng đại diện của bạn'}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="my-4 space-y-4">
          {/* 1. Chọn Avatar Đại Diện */}
          <div>
            <label className="block text-xs font-black text-yellow-300 uppercase tracking-wider mb-2">
              Chọn Biểu Tượng Đại Diện:
            </label>
            <div className="grid grid-cols-6 gap-2 p-2.5 rounded-2xl bg-black/60 border border-yellow-500/20">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => setAvatar(av)}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-2xl flex items-center justify-center transition-all cursor-pointer ${
                    avatar === av
                      ? 'bg-gradient-to-br from-amber-600 to-yellow-500 scale-110 shadow-lg ring-2 ring-yellow-300'
                      : 'bg-neutral-900 hover:bg-neutral-800 hover:scale-105 opacity-75 hover:opacity-100'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Nhập Tên Biệt Danh */}
          <div>
            <label className="block text-xs font-black text-yellow-300 uppercase tracking-wider mb-2">
              Biệt Danh Thần Bài:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                <User className="w-4 h-4 text-yellow-400" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ví dụ: Thần Bài Chợ Lớn..."
                maxLength={20}
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-neutral-900/90 border border-yellow-500/40 rounded-2xl text-sm font-bold text-white placeholder-neutral-500 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 transition-all shadow-inner"
              />
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-red-400 font-bold flex items-center gap-1 animate-fade-in">
                <span>⚠️</span>
                <span>{error}</span>
              </p>
            )}
            <p className="mt-1 text-[11px] text-neutral-400">
              Vốn khởi nghiệp mặc định: <strong className="text-yellow-300 font-bold">1.000.000 Xu</strong>
            </p>
          </div>

          {/* Nút xác nhận */}
          <button
            type="submit"
            className="w-full mt-3 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-red-950 font-black text-sm uppercase tracking-wider shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer border border-yellow-200"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>{isFirstTime || !profile.name ? 'Bắt Đầu Gia Nhập Sòng Bạc' : 'Lưu Thay Đổi'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
