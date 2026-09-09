import React from 'react';
import { Skull, RotateCcw, Home, ShieldAlert } from 'lucide-react';
import { GameState } from '../types/game';

interface DefeatModalProps {
  state: GameState;
  onRestartLevel: () => void;
  onReturnToHQ: () => void;
}

export const DefeatModal: React.FC<DefeatModalProps> = ({
  state,
  onRestartLevel,
  onReturnToHQ,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-stone-900 border-2 border-red-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
        {/* Glow behind skull */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-600/10 rounded-full blur-3xl -z-10" />

        {/* Defeat Icon & Title */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-950 border border-red-700 text-red-500 mb-4 shadow-lg">
          <Skull className="w-9 h-9" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black font-cinzel text-red-400 tracking-wide uppercase mb-1">
          Savunma Başarısız!
        </h2>
        <p className="text-xs font-pixel text-red-300/80 mb-4">
          Karargah Düşman Tarafından İmha Edildi!
        </p>

        {/* Historical Encouragement Box */}
        <div className="bg-stone-950/80 border border-red-950 p-4 rounded-xl text-left mb-5">
          <p className="text-xs text-stone-300 font-sans leading-relaxed flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>
              Siperler düşmüş olsa da Çanakkale ruhu asla teslim olmaz! Gece taarruzuna karşı daha fazla siper kaz, dikenli telleri kat kat ör ve cephaneliği vaktinde takviye et.
            </span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-stone-950 border border-stone-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-stone-400 font-cinzel block">Dayanılan Gün</span>
            <span className="text-sm font-bold text-stone-200 font-pixel">{state.daysSurvived}</span>
          </div>
          <div className="bg-stone-950 border border-stone-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-stone-400 font-cinzel block">İmha Edilen Düşman</span>
            <span className="text-sm font-bold text-stone-200 font-pixel">{state.enemiesDefeated}</span>
          </div>
        </div>

        {/* Buttons (Taarruzu Tekrarla & Karargaha Dön) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onRestartLevel}
            className="w-full sm:w-auto flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-red-700 to-amber-700 hover:from-red-600 hover:to-amber-600 text-stone-100 font-cinzel font-bold text-sm shadow-xl flex items-center justify-center gap-2 border border-red-500 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Taarruzu Baştan Başlat</span>
          </button>

          <button
            onClick={onReturnToHQ}
            className="w-full sm:w-auto py-3 px-5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-cinzel text-xs flex items-center justify-center gap-1.5 border border-stone-700 transition"
          >
            <Home className="w-4 h-4" />
            <span>Karargaha Dön</span>
          </button>
        </div>
      </div>
    </div>
  );
};
