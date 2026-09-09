import React from 'react';
import { CAMPAIGN_LEVELS } from '../data/levels';
import { MapPin, Shield, Star, Play, X, Award, ChevronRight, Home, Trophy, Skull } from 'lucide-react';
import { getAllHighScores } from '../utils/storage';

interface CampaignMapProps {
  unlockedLevel: number;
  currentLevelIndex: number;
  onSelectLevel: (index: number) => void;
  onClose: () => void;
  onOpenMainMenu?: () => void;
}

export const CampaignMap: React.FC<CampaignMapProps> = ({
  unlockedLevel,
  currentLevelIndex,
  onSelectLevel,
  onClose,
  onOpenMainMenu,
}) => {
  const highScores = getAllHighScores();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-stone-900 border-2 border-amber-600/80 rounded-3xl p-6 max-w-4xl w-full shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-cinzel text-amber-300 tracking-wide uppercase flex items-center gap-2">
              <Shield className="w-6 h-6 text-amber-400" />
              Gelibolu Yarımadası 1915 - Cephe Haritası
            </h2>
            <p className="text-xs text-stone-400 font-sans mt-0.5">
              Tarihi muharebe hatlarını ve savunma mevkilerini seç • Bölüm rekorlarını incele
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMainMenu && (
              <button
                onClick={onOpenMainMenu}
                className="px-3 py-1.5 text-xs font-cinzel font-bold text-amber-300 hover:text-amber-200 bg-stone-800 hover:bg-amber-950 border border-amber-600/60 rounded-xl transition flex items-center gap-1.5"
              >
                <Home className="w-4 h-4 text-amber-400" />
                <span>Ana Menü</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-100 bg-stone-800 hover:bg-stone-700 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Levels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1">
          {CAMPAIGN_LEVELS.map((lvl, idx) => {
            const isUnlocked = idx <= unlockedLevel;
            const isSelected = idx === currentLevelIndex;
            const score = highScores[lvl.id];

            return (
              <div
                key={lvl.id}
                onClick={() => isUnlocked && onSelectLevel(idx)}
                className={`p-4 rounded-2xl border-2 transition flex flex-col justify-between text-left relative overflow-hidden group ${
                  !isUnlocked
                    ? 'bg-stone-950/60 border-stone-800 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-stone-800/90 border-amber-500 shadow-xl cursor-pointer ring-2 ring-amber-400/40'
                    : 'bg-stone-950/80 border-stone-800 hover:border-amber-600/80 cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-pixel text-amber-400 bg-amber-950/60 border border-amber-500/50 px-2 py-0.5 rounded">
                      {lvl.historicalDateTr}
                    </span>
                    {isUnlocked ? (
                      <span className="text-xs font-cinzel text-emerald-400 flex items-center gap-1 font-bold">
                        <Star className="w-3.5 h-3.5 fill-emerald-400" /> Açık
                      </span>
                    ) : (
                      <span className="text-xs font-cinzel text-stone-500">Kilitli</span>
                    )}
                  </div>

                  <h3 className="text-base font-bold font-cinzel text-stone-100 mb-1">
                    {lvl.nameTr}
                  </h3>
                  <p className="text-xs text-amber-200/80 font-cinzel font-semibold mb-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> {lvl.locationTr}
                  </p>
                  <p className="text-xs text-stone-300 font-sans leading-relaxed line-clamp-2">
                    {lvl.descriptionTr}
                  </p>

                  {/* Level High Score Badge on Hover / Always if exists */}
                  {score && score.maxEnemiesDefeated > 0 && (
                    <div className="mt-3 p-2 bg-amber-950/40 border border-amber-600/40 rounded-xl flex items-center justify-between text-xs font-cinzel transition-all group-hover:bg-amber-950/80 group-hover:border-amber-500">
                      <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <span>En Yüksek Skor:</span>
                      </div>
                      <div className="flex items-center gap-3 text-stone-200">
                        <span className="flex items-center gap-1 text-red-300 font-mono font-bold">
                          <Skull className="w-3.5 h-3.5 text-red-400" /> {score.maxEnemiesDefeated} Düşman
                        </span>
                        <span className="text-amber-200/70 text-[11px]">
                          (Gün {score.bestDay})
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                  <span className="text-[11px] font-pixel text-stone-400">
                    Hedef: {lvl.daysToWin} Gün
                  </span>

                  {isUnlocked && (
                    <button className="flex items-center gap-1 text-xs font-cinzel font-bold text-amber-400 hover:text-amber-300">
                      <span>{isSelected ? 'Mevcut Cephe' : 'Hemen Başla'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
