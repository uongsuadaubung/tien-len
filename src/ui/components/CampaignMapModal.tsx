import React, { useState } from 'react';
import { PlayerProfile } from '../../engine/storage';
import { CAMPAIGN_CHAPTERS, CampaignChapter } from '../../engine/campaign';
import { X, Lock, CheckCircle2, Play, Award, Swords, Sparkles } from 'lucide-react';

interface CampaignMapModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onSelectChapter: (chapter: CampaignChapter) => void;
}

export const CampaignMapModal: React.FC<CampaignMapModalProps> = ({
  isOpen,
  profile,
  onClose,
  onSelectChapter
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<number>(profile.campaignUnlockedChapter || 1);

  if (!isOpen) return null;

  const currentChapter = CAMPAIGN_CHAPTERS.find(c => c.id === selectedChapterId) || CAMPAIGN_CHAPTERS[0];
  const isUnlocked = selectedChapterId <= profile.campaignUnlockedChapter;
  const chapterWins = profile.campaignChapterWins[selectedChapterId] || 0;
  const isCompleted = chapterWins >= currentChapter.requiredWins;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-4xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-black rounded-3xl border-2 border-purple-500/60 shadow-2xl p-5 sm:p-7 text-white flex flex-col justify-between overflow-hidden max-h-[92vh]">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300 bg-clip-text text-transparent uppercase tracking-wider">
              Bản Đồ Chiến Dịch
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Vượt qua các chiếu bạc lừng danh để trở thành Thần Bài Huyền Thoại</p>
          </div>

          <div className="flex items-center gap-2 bg-purple-950/80 px-4 py-2 rounded-2xl border border-purple-400/40 text-xs font-bold text-purple-200">
            <span>Tiến độ:</span>
            <strong className="text-yellow-300">{profile.campaignUnlockedChapter}/5 Ải</strong>
          </div>
        </div>

        {/* BẢN ĐỒ 5 CHƯƠNG THEO HÀNG NGANG */}
        <div className="grid grid-cols-5 gap-2 sm:gap-3 my-4">
          {CAMPAIGN_CHAPTERS.map(ch => {
            const unlocked = ch.id <= profile.campaignUnlockedChapter;
            const isSelected = selectedChapterId === ch.id;
            const wins = profile.campaignChapterWins[ch.id] || 0;
            const done = wins >= ch.requiredWins;

            return (
              <div
                key={ch.id}
                onClick={() => setSelectedChapterId(ch.id)}
                className={`relative flex flex-col items-center p-2.5 sm:p-3.5 rounded-2xl border-2 transition-all cursor-pointer select-none ${
                  isSelected
                    ? 'bg-purple-950/80 border-yellow-400 shadow-lg shadow-purple-500/30 scale-105'
                    : unlocked
                    ? 'bg-neutral-900/90 border-purple-500/40 hover:border-purple-300'
                    : 'bg-neutral-900/40 border-neutral-800 opacity-60'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-1">{ch.icon}</div>
                <h4 className="font-extrabold text-xs text-center text-yellow-200 truncate w-full">
                  {ch.name}
                </h4>
                <span className="text-[10px] text-neutral-400 text-center truncate w-full">
                  {ch.venueName}
                </span>

                {/* Huy hiệu hoàn thành / khóa */}
                <div className="mt-2">
                  {done ? (
                    <span className="flex items-center gap-0.5 text-[9px] font-black text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded-md border border-emerald-500/40">
                      <CheckCircle2 className="w-3 h-3" /> Đã Vượt
                    </span>
                  ) : unlocked ? (
                    <span className="text-[10px] font-bold text-amber-300">
                      {wins}/{ch.requiredWins} Thắng
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-neutral-500">
                      <Lock className="w-3 h-3" /> Khóa
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CHI TIẾT CHƯƠNG ĐANG CHỌN */}
        <div className="p-4 sm:p-5 rounded-3xl bg-neutral-900/90 border border-neutral-700 flex-1 flex flex-col justify-between my-2">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[11px] font-black text-purple-400 uppercase tracking-wider">
                  {currentChapter.name}: {currentChapter.subtitle}
                </span>
                <h3 className="text-lg sm:text-xl font-black text-yellow-200 mt-0.5">
                  {currentChapter.venueName}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-400">Tiền cược:</span>
                <span className="font-black text-sm text-yellow-300 bg-black/60 px-3 py-1 rounded-xl border border-yellow-500/30">
                  {currentChapter.betAmount.toLocaleString()} Xu
                </span>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed mb-4">
              {currentChapter.description}
            </p>

            {/* DANH SÁCH 3 BOT TRÙM TRONG ẢI */}
            <div className="mb-4">
              <span className="text-xs font-bold text-neutral-400 block mb-2">
                Danh sách 3 Đối thủ trong Ải:
              </span>
              <div className="grid grid-cols-3 gap-2">
                {currentChapter.bots.map(bot => (
                  <div
                    key={bot.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/60 border border-neutral-800"
                  >
                    <span className="text-2xl">{bot.avatar || '🤖'}</span>
                    <div className="min-w-0">
                      <h5 className="font-extrabold text-xs text-yellow-200 truncate">
                        {bot.tier || 'Bot'}
                      </h5>
                      <span className="text-[10px] text-amber-300/80 font-bold block">
                        Elo {bot.elo}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PHẦN THƯỞNG KHI HOÀN THÀNH ẢI */}
            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-yellow-200">Phần Thưởng Vượt Ải:</span>
                  <p className="text-[11px] text-neutral-400">
                    Nhận ngay <strong className="text-yellow-300">+{currentChapter.rewardCoins.toLocaleString()} Xu</strong>
                    {currentChapter.rewardTitle && (
                      <> + Danh hiệu <strong className="text-purple-300">"{currentChapter.rewardTitle}"</strong></>
                    )}
                  </p>
                </div>
              </div>

              <span className="text-xs font-black text-amber-300 bg-black/60 px-3 py-1.5 rounded-xl border border-amber-500/40">
                +{currentChapter.rewardCoins.toLocaleString()} 🧧
              </span>
            </div>
          </div>

          {/* Nút Khiêu Chiến */}
          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-xs text-neutral-400">
              Điều kiện qua màn: <strong className="text-white">Thắng {chapterWins}/{currentChapter.requiredWins} ván</strong>
            </span>

            <button
              onClick={() => {
                if (isUnlocked) {
                  onSelectChapter(currentChapter);
                }
              }}
              disabled={!isUnlocked}
              className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg ${
                isUnlocked
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white hover:scale-105 cursor-pointer shadow-purple-500/30'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
              }`}
            >
              <Swords className="w-4 h-4" />
              <span>{isUnlocked ? 'Khiêu Chiến Ngay' : 'Ải Chưa Mở Khóa'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
