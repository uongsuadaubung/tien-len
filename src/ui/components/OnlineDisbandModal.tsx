import React from 'react';
import { AlertTriangle, Home } from 'lucide-react';
import { useOnlineStore } from '../../stores/useOnlineStore';
import { Button } from '../primitives';

export const OnlineDisbandModal: React.FC = () => {
  const { disbandNotice, clearDisbandNotice } = useOnlineStore();

  if (disbandNotice === null) return null;

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

        {/* Action Button */}
        <div className="pt-2">
          <Button
            variant="gold"
            size="md"
            onClick={clearDisbandNotice}
            leftIcon={<Home className="w-4 h-4 text-slate-950" />}
            className="w-full font-black text-sm uppercase tracking-wider py-3 shadow-lg shadow-amber-500/25 cursor-pointer"
          >
            Quay Về Sảnh Chính
          </Button>
        </div>
      </div>
    </div>
  );
};
