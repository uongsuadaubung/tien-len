import React, { useState } from 'react';
import { PlayerProfile, savePlayerProfile } from '../../engine/storage';
import { SHOP_ITEMS, ShopItem } from '../../engine/shop-items';
import { X, Check, ShoppingBag, Sparkles, Layers, Image, Award, Crown } from 'lucide-react';

interface ShopModalProps {
  isOpen: boolean;
  profile: PlayerProfile;
  onClose: () => void;
  onUpdateProfile: (updated: PlayerProfile) => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  profile,
  onClose,
  onUpdateProfile
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'CARD_BACK' | 'TABLE_FELT' | 'AVATAR_FRAME' | 'TITLE'>('CARD_BACK');

  if (!isOpen) return null;

  const items = SHOP_ITEMS.filter(i => i.category === selectedCategory);

  const handleBuyOrEquip = (item: ShopItem) => {
    const isUnlocked = profile.unlockedItems.includes(item.id) || item.price === 0;

    if (isUnlocked) {
      // Trang bị (Equip)
      const updated = { ...profile };
      if (item.category === 'CARD_BACK') updated.activeCardBack = item.id;
      if (item.category === 'TABLE_FELT') updated.activeTableFelt = item.id;
      if (item.category === 'AVATAR_FRAME') updated.activeAvatarFrame = item.id;
      if (item.category === 'TITLE') updated.activeTitle = item.id;

      savePlayerProfile(updated);
      onUpdateProfile(updated);
    } else {
      // Mua (Buy)
      if (profile.coins < item.price) {
        alert('Bạn không đủ tiền xu để mua vật phẩm này!');
        return;
      }

      const updated: PlayerProfile = {
        ...profile,
        coins: profile.coins - item.price,
        unlockedItems: [...profile.unlockedItems, item.id]
      };

      if (item.category === 'CARD_BACK') updated.activeCardBack = item.id;
      if (item.category === 'TABLE_FELT') updated.activeTableFelt = item.id;
      if (item.category === 'AVATAR_FRAME') updated.activeAvatarFrame = item.id;
      if (item.category === 'TITLE') updated.activeTitle = item.id;

      savePlayerProfile(updated);
      onUpdateProfile(updated);
    }
  };

  const isEquipped = (item: ShopItem) => {
    if (item.category === 'CARD_BACK') return profile.activeCardBack === item.id;
    if (item.category === 'TABLE_FELT') return profile.activeTableFelt === item.id;
    if (item.category === 'AVATAR_FRAME') return profile.activeAvatarFrame === item.id;
    if (item.category === 'TITLE') return profile.activeTitle === item.id;
    return false;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-black rounded-3xl border-2 border-purple-500/50 shadow-2xl p-4 sm:p-6 text-white max-h-[90vh] flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900/80 border border-purple-400/50 flex items-center justify-center text-purple-300">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-purple-200">
                Cửa Hàng Thần Bài VIP
              </h2>
              <p className="text-xs text-neutral-400">Trang bị Lưng Bài 3D, Thảm Bàn, Avatar & Danh Hiệu</p>
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

        {/* Tab Phân Loại */}
        <div className="flex items-center gap-2 my-4 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('CARD_BACK')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === 'CARD_BACK'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Lưng Bài VIP</span>
          </button>

          <button
            onClick={() => setSelectedCategory('TABLE_FELT')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === 'TABLE_FELT'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>Thảm Bàn Chơi</span>
          </button>

          <button
            onClick={() => setSelectedCategory('AVATAR_FRAME')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === 'AVATAR_FRAME'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Khung Avatar</span>
          </button>

          <button
            onClick={() => setSelectedCategory('TITLE')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              selectedCategory === 'TITLE'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Danh Hiệu</span>
          </button>
        </div>

        {/* Danh Sách Vật Phẩm */}
        <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 my-2">
          {items.map(item => {
            const unlocked = profile.unlockedItems.includes(item.id) || item.price === 0;
            const equipped = isEquipped(item);

            return (
              <div
                key={item.id}
                className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  equipped
                    ? 'bg-purple-950/60 border-purple-400/80 shadow-lg shadow-purple-500/20'
                    : unlocked
                    ? 'bg-neutral-900/90 border-neutral-700'
                    : 'bg-neutral-900/50 border-neutral-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-black/60 border border-neutral-700 flex items-center justify-center text-2xl">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-yellow-200">
                      {item.name}
                    </h4>
                    <p className="text-[11px] text-neutral-400 leading-tight mt-0.5 max-w-[180px]">
                      {item.description}
                    </p>
                    {!unlocked && (
                      <span className="text-xs font-bold text-amber-400 mt-1 block">
                        💰 {item.price.toLocaleString()} Xu
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleBuyOrEquip(item)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                    equipped
                      ? 'bg-emerald-600 text-white cursor-default flex items-center gap-1'
                      : unlocked
                      ? 'bg-purple-600 hover:bg-purple-500 text-white hover:scale-105'
                      : profile.coins >= item.price
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-red-950 font-black hover:scale-105 shadow-md'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}
                >
                  {equipped ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Đang Dùng</span>
                    </>
                  ) : unlocked ? (
                    'Sử Dụng'
                  ) : (
                    'Mua Ngay'
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 text-center text-xs text-neutral-500">
          Vật phẩm sau khi mua sẽ được lưu vĩnh viễn trong tài khoản của bạn.
        </div>
      </div>
    </div>
  );
};
