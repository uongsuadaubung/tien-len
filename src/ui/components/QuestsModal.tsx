import React, { useState } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { Quest, Achievement } from '../../engine/quests';
import { X, Check, Target, Award, Sparkles, Flame, Trophy } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-black rounded-3xl border-2 border-blue-500/50 shadow-2xl p-4 sm:p-6 text-white max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900/80 border border-blue-400/50 flex items-center justify-center text-blue-300">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-blue-200">
                Nhiệm Vụ & Thành Tựu
              </h2>
              <p className="text-xs text-neutral-400">Hoàn thành thử thách để nhận hàng ngàn xu thưởng</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-yellow-950/80 px-3 py-1.5 rounded-full border border-yellow-500/40 text-xs font-black text-yellow-300">
              <span>🧧</span>
              <span>{profile.coins.toLocaleString()} Xu</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 my-4">
          <button
            onClick={() => setTab('DAILY')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              tab === 'DAILY'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Nhiệm Vụ Hàng Ngày (Reset 24h)</span>
          </button>

          <button
            onClick={() => setTab('ACHIEVEMENTS')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              tab === 'ACHIEVEMENTS'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Thành Tựu Trọn Đời</span>
          </button>
        </div>

        {/* Danh Sách Nhiệm Vụ */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 my-2">
          {tab === 'DAILY' ? (
            profile.dailyQuests.map(quest => {
              const pct = Math.min(100, Math.round((quest.currentCount / quest.targetCount) * 100));

              return (
                <div
                  key={quest.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-950/80 border border-blue-500/30 flex items-center justify-center text-2xl">
                      {quest.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-yellow-200">
                        {quest.title}
                      </h4>
                      <p className="text-xs text-neutral-400 leading-tight mt-0.5 max-w-sm">
                        {quest.description}
                      </p>
                      {/* Tiến trình */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-28 sm:w-40 h-2 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-neutral-400 font-bold">
                          {quest.currentCount}/{quest.targetCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-xs font-black text-yellow-300">
                      +{quest.rewardCoins.toLocaleString()} 🧧
                    </span>
                    <button
                      onClick={() => handleClaimQuest(quest.id)}
                      disabled={!quest.isCompleted || quest.isClaimed}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        quest.isClaimed
                          ? 'bg-neutral-800 text-neutral-500 cursor-default'
                          : quest.isCompleted
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-red-950 font-black hover:scale-105 shadow-md animate-pulse'
                          : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      }`}
                    >
                      {quest.isClaimed ? 'Đã Nhận' : quest.isCompleted ? 'Nhận Thưởng' : 'Chưa Xong'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            profile.achievements.map(ach => {
              const pct = Math.min(100, Math.round((ach.currentCount / ach.targetCount) * 100));

              return (
                <div
                  key={ach.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-2xl">
                      {ach.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-yellow-200">
                        {ach.title}
                      </h4>
                      <p className="text-xs text-neutral-400 leading-tight mt-0.5 max-w-sm">
                        {ach.description}
                      </p>
                      {/* Tiến trình */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-28 sm:w-40 h-2 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-neutral-400 font-bold">
                          {ach.currentCount.toLocaleString()}/{ach.targetCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-xs font-black text-yellow-300">
                      +{ach.rewardCoins.toLocaleString()} 🧧
                    </span>
                    <button
                      onClick={() => handleClaimAchievement(ach.id)}
                      disabled={!ach.isCompleted || ach.isClaimed}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                        ach.isClaimed
                          ? 'bg-neutral-800 text-neutral-500 cursor-default'
                          : ach.isCompleted
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-red-950 font-black hover:scale-105 shadow-md animate-pulse'
                          : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      }`}
                    >
                      {ach.isClaimed ? 'Đã Nhận' : ach.isCompleted ? 'Nhận Thưởng' : 'Chưa Xong'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 text-center text-xs text-neutral-500">
          Nhiệm vụ hàng ngày tự động làm mới vào 00:00 mỗi ngày.
        </div>
      </div>
    </div>
  );
};
