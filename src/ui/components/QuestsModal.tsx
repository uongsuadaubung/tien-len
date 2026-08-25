import React, { useState } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { X, Check, Target, Award, Sparkles } from 'lucide-react';

interface QuestsModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

export const QuestsModal: React.FC<QuestsModalProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdateProfile
}) => {
  const [tab, setTab] = useState<'DAILY' | 'ACHIEVEMENTS'>('DAILY');

  if (!isOpen) return null;

  const handleClaimQuest = (questId: string) => {
    const quest = profile.dailyQuests.find(q => q.id === questId);
    if (!quest || !quest.isCompleted || quest.isClaimed) return;

    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + quest.rewardCoins,
      dailyQuests: profile.dailyQuests.map(q =>
        q.id === questId ? { ...q, isClaimed: true } : q
      )
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
  };

  const handleClaimAchievement = (achId: string) => {
    const ach = profile.achievements.find(a => a.id === achId);
    if (!ach || !ach.isCompleted || ach.isClaimed) return;

    const updated: PlayerProfile = {
      ...profile,
      coins: profile.coins + ach.rewardCoins,
      achievements: profile.achievements.map(a =>
        a.id === achId ? { ...a, isClaimed: true } : a
      )
    };

    savePlayerProfile(updated);
    onUpdateProfile(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 select-none">
      <div className="relative w-full max-w-2xl bg-[#121724] rounded-2xl border border-[#d4af37]/40 shadow-2xl p-4 sm:p-6 text-white max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#f3e5ab]">
                Nhiệm Vụ & Thành Tựu
              </h2>
              <p className="text-xs text-slate-400">Hoàn thành thử thách để nhận thưởng hàng ngàn xu</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-[#182030] px-3 py-1.5 rounded-full border border-[#d4af37]/30 text-xs font-black text-[#f3e5ab]">
              <span>🪙</span>
              <span>{profile.coins.toLocaleString()} Xu</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#182030] hover:bg-[#222c42] text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 my-4">
          <button
            onClick={() => setTab('DAILY')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'DAILY'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-[#182030] text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Nhiệm Vụ Hàng Ngày (Reset 24h)</span>
          </button>

          <button
            onClick={() => setTab('ACHIEVEMENTS')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              tab === 'ACHIEVEMENTS'
                ? 'bg-[#d4af37] text-[#0a0d14] shadow font-black'
                : 'bg-[#182030] text-slate-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Thành Tựu Danh Hiệu</span>
          </button>
        </div>

        {/* Danh Sách Nhiệm Vụ Hoặc Thành Tựu */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-1">
          {tab === 'DAILY' ? (
            profile.dailyQuests.map((quest) => {
              const progressPct = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));

              return (
                <div
                  key={quest.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#182030] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{quest.icon}</span>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-white">{quest.title}</h4>
                      <p className="text-[11px] text-slate-400">{quest.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-28 sm:w-40 h-1.5 bg-[#0a0d14] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {quest.currentCount}/{quest.targetCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-[#f3e5ab]">
                      +{quest.rewardCoins.toLocaleString()} 🪙
                    </span>
                    {quest.isClaimed ? (
                      <span className="text-xs font-bold text-slate-500 bg-[#0a0d14] px-3 py-1.5 rounded-lg border border-white/5">
                        Đã Nhận
                      </span>
                    ) : quest.isCompleted ? (
                      <button
                        onClick={() => handleClaimQuest(quest.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#aa8620] hover:from-[#f3e5ab] hover:to-[#d4af37] text-[#0a0d14] font-black text-xs shadow cursor-pointer transition-all"
                      >
                        Nhận Thưởng
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 bg-[#0a0d14] px-3 py-1.5 rounded-lg border border-white/5">
                        Chưa Xong
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            profile.achievements.map((ach) => {
              const progressPct = Math.min(100, Math.round((ach.currentCount / ach.targetCount) * 100));

              return (
                <div
                  key={ach.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#182030] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ach.icon}</span>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-white">{ach.title}</h4>
                      <p className="text-[11px] text-slate-400">{ach.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-28 sm:w-40 h-1.5 bg-[#0a0d14] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#d4af37] rounded-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {ach.currentCount}/{ach.targetCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-[#f3e5ab]">
                      +{ach.rewardCoins.toLocaleString()} 🪙
                    </span>
                    {ach.isClaimed ? (
                      <span className="text-xs font-bold text-slate-500 bg-[#0a0d14] px-3 py-1.5 rounded-lg border border-white/5">
                        Đã Nhận
                      </span>
                    ) : ach.isCompleted ? (
                      <button
                        onClick={() => handleClaimAchievement(ach.id)}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#aa8620] hover:from-[#f3e5ab] hover:to-[#d4af37] text-[#0a0d14] font-black text-xs shadow cursor-pointer transition-all"
                      >
                        Nhận Thưởng
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-slate-500 bg-[#0a0d14] px-3 py-1.5 rounded-lg border border-white/5">
                        Chưa Xong
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#182030] hover:bg-[#222c42] text-slate-300 text-xs font-bold border border-white/10 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
