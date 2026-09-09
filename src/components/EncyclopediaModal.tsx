import React from 'react';
import { HISTORICAL_CODEX } from '../data/levels';
import { BookOpen, X, Award, Shield } from 'lucide-react';

interface EncyclopediaModalProps {
  onClose: () => void;
}

export const EncyclopediaModal: React.FC<EncyclopediaModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-stone-900 border-2 border-amber-600/80 rounded-3xl p-6 max-w-3xl w-full shadow-2xl relative max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black font-cinzel text-amber-300 tracking-wide uppercase flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-amber-400" />
              Çanakkale 1915 Tarihi Ansiklopedisi
            </h2>
            <p className="text-xs text-stone-400 font-sans mt-0.5">
              Kahramanlar, tarihi birlikler, siper taktikleri ve destansı hatıratlar
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 bg-stone-800 hover:bg-stone-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Codex Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 overflow-y-auto pr-1">
          {HISTORICAL_CODEX.map((item, idx) => (
            <div
              key={idx}
              className="bg-stone-950/80 border border-amber-900/60 p-4 rounded-2xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-pixel text-amber-400 bg-amber-950/60 border border-amber-500/50 px-2 py-0.5 rounded">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-sm font-bold font-cinzel text-amber-200 mb-2">
                  {item.title}
                </h3>
                <p className="text-xs text-stone-300 font-sans leading-relaxed">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
