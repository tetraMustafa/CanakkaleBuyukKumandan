import React from 'react';
import { Trophy, ArrowRight, RotateCcw, Award, CheckCircle } from 'lucide-react';
import { GameState } from '../types/game';

interface VictoryModalProps {
  state: GameState;
  hasNextLevel: boolean;
  onNextLevel: () => void;
  onRestartLevel: () => void;
  onReturnToHQ: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  state,
  hasNextLevel,
  onNextLevel,
  onRestartLevel,
  onReturnToHQ,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-stone-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
        {/* Glow behind medal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -z-10" />

        {/* Victory Icon & Title */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500 text-amber-400 mb-4 shadow-lg">
          <Award className="w-9 h-9" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black font-cinzel text-amber-300 tracking-wide uppercase mb-1">
          Çanakkale Geçilmez!
        </h2>
        <p className="text-xs font-pixel text-amber-400/90 mb-4">
          {state.level.nameTr} Zaferle Tamamlandı!
        </p>

        {/* Historical Quote Box */}
        <div className="bg-stone-950/80 border border-amber-900/60 p-4 rounded-xl text-left mb-5">
          <p className="text-xs italic text-stone-300 font-sans leading-relaxed">
            {state.level.loreTr}
          </p>
        </div>

        {/* Campaign Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-stone-950 border border-stone-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-stone-400 font-cinzel block">Savunulan Gün</span>
            <span className="text-sm font-bold text-amber-400 font-pixel">{state.daysSurvived}</span>
          </div>
          <div className="bg-stone-950 border border-stone-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-stone-400 font-cinzel block">İmha Edilen Düşman</span>
            <span className="text-sm font-bold text-rose-400 font-pixel">{state.enemiesDefeated}</span>
          </div>
          <div className="bg-stone-950 border border-stone-800 p-2.5 rounded-xl">
            <span className="text-[10px] text-stone-400 font-cinzel block">Toplam Skor</span>
            <span className="text-sm font-bold text-emerald-400 font-pixel">{state.score}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {hasNextLevel ? (
            <button
              onClick={onNextLevel}
              className="w-full sm:w-auto flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-cinzel font-bold text-sm shadow-xl flex items-center justify-center gap-2 border border-amber-400 transition"
            >
              <span>Sonraki Cepheye İlerle</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onReturnToHQ}
              className="w-full sm:w-auto flex-1 py-3 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-stone-100 font-cinzel font-bold text-sm shadow-xl flex items-center justify-center gap-2 border border-emerald-500 transition"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Nihai Zafer & Karargah</span>
            </button>
          )}

          <button
            onClick={onRestartLevel}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-cinzel text-xs flex items-center justify-center gap-1.5 border border-stone-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Bölümü Tekrar Oyna</span>
          </button>
        </div>
      </div>
    </div>
  );
};
