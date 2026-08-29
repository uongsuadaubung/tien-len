import React from 'react';
import { AlertTriangle, Home, Landmark } from 'lucide-react';
import { useOnlineStore } from '../../stores/useOnlineStore';
import { useModalStore } from '../../stores/useModalStore';
import { Button } from '../primitives';

export const OnlineDisbandModal: React.FC = () => {
  const { disbandNotice, clearDisbandNotice } = useOnlineStore();
  const { openModal } = useModalStore();

  if (disbandNotice === null) return null;

  const isInsufficientCoins = disbandNotice.title === 'KHÔNG ĐỦ TIỀN CƯỢC';

  const handleOpenBank = () => {
    clearDisbandNotice();
    openModal('BANK');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-white p-6 space-y-5 text-center">
        {/* Glow & Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
          <AlertTriangle className="w-8 h-8 animate-bounce" />
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h3 className="text-lg font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400">
            {disbandNotice.title}
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
            {disbandNotice.message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          {isInsufficientCoins && (
            <Button
              variant="gold"
              size="md"
              onClick={handleOpenBank}
              leftIcon={<Landmark className="w-4 h-4 text-slate-950" />}
              className="flex-1 font-black text-sm uppercase tracking-wider py-3 shadow-lg shadow-amber-500/25 cursor-pointer"
            >
              Mở Ngân Hàng
            </Button>
          )}

          <Button
            variant={isInsufficientCoins ? 'surface' : 'gold'}
            size="md"
            onClick={clearDisbandNotice}
            leftIcon={<Home className="w-4 h-4" />}
            className="flex-1 font-black text-sm uppercase tracking-wider py-3 shadow-lg cursor-pointer"
          >
            Quay Về Sảnh
          </Button>
        </div>
      </div>
    </div>
  );
};
