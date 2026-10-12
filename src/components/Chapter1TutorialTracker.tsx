import React, { useState } from 'react';
import { Keyboard, ChevronDown, ChevronUp, X, Check, BookOpen } from 'lucide-react';

interface Chapter1TutorialTrackerProps {
  onOpenFullTutorial: () => void;
  hasMoved: boolean;
  hasSprinted: boolean;
  hasInteracted: boolean;
}

export const Chapter1TutorialTracker: React.FC<Chapter1TutorialTrackerProps> = ({
  onOpenFullTutorial,
  hasMoved,
  hasSprinted,
  hasInteracted,
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  if (isDismissed) return null;

  return (
    <div className="absolute left-3 top-16 sm:top-20 z-20 pointer-events-auto select-none max-w-[280px] sm:max-w-[320px] transition-all duration-300">
      <div className="bg-stone-950/90 border border-amber-500/70 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden text-stone-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-950/70 to-stone-900 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-cinzel font-bold text-amber-300 uppercase tracking-wider">
              1. Bölüm Tuş Talimi
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-stone-200"
              title={isMinimized ? 'Genişlet' : 'Küçült'}
            >
              {isMinimized ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-rose-400"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-2.5 space-y-2 text-xs">
            <div className="space-y-1.5">
              {/* Task 1 */}
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-stone-900/60 border border-stone-800/80">
                <div className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    hasMoved ? 'bg-emerald-500 text-stone-950 font-bold' : 'bg-stone-800 text-stone-400'
                  }`}>
                    {hasMoved ? <Check className="w-3 h-3" /> : '1'}
                  </div>
                  <span className="text-[11px] text-stone-300">Atı Sür:</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-pixel text-amber-300">
                  <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700">A</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700">D</kbd>
                </div>
              </div>

              {/* Task 2 */}
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-stone-900/60 border border-stone-800/80">
                <div className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    hasSprinted ? 'bg-emerald-500 text-stone-950 font-bold' : 'bg-stone-800 text-stone-400'
                  }`}>
                    {hasSprinted ? <Check className="w-3 h-3" /> : '2'}
                  </div>
                  <span className="text-[11px] text-stone-300">Dörtnal Koş:</span>
                </div>
                <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-[10px] font-pixel text-amber-300">
                  SHIFT
                </kbd>
              </div>

              {/* Task 3 */}
              <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-stone-900/60 border border-stone-800/80">
                <div className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                    hasInteracted ? 'bg-emerald-500 text-stone-950 font-bold' : 'bg-stone-800 text-stone-400'
                  }`}>
                    {hasInteracted ? <Check className="w-3 h-3" /> : '3'}
                  </div>
                  <span className="text-[11px] text-stone-300">Ağaç / İnşa / Sikke:</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-pixel text-amber-300">
                  <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700">E</kbd>
                  <span className="text-stone-500 text-[9px]">/</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700">Boşluk</kbd>
                </div>
              </div>
            </div>

            {/* Quick button to open full tutorial */}
            <button
              onClick={onOpenFullTutorial}
              className="w-full py-1.5 px-2 bg-amber-950/80 hover:bg-amber-900 text-amber-300 hover:text-amber-200 border border-amber-600/60 rounded-xl font-cinzel font-bold text-[11px] transition flex items-center justify-center gap-1.5 shadow"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Detaylı Tuş Kılavuzunu Aç</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
