import React from 'react';
import { 
  X, 
  Shield, 
  Users, 
  Coins, 
  Compass, 
  Radio, 
  Bomb, 
  Sparkles, 
  Play, 
  Trees, 
  Hammer, 
  Moon, 
  Sun,
  MousePointerClick,
  Flag,
  Swords,
  Crosshair,
  Home
} from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame?: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose, onStartGame }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        id="how-to-play-dialog"
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-stone-900 border-2 border-amber-500/80 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden text-stone-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-gradient-to-r from-amber-950/70 via-stone-900 to-stone-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black font-cinzel text-amber-200 tracking-wide uppercase">
                Nasıl Oynanır?
              </h2>
              <p className="text-[11px] sm:text-xs text-amber-400/90 font-pixel">
                Temel Oynanış & Kumandan Harp Kılavuzu
              </p>
            </div>
          </div>
          <button
            id="close-how-to-play-btn"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-amber-300 hover:bg-stone-800 rounded-xl transition-colors border border-transparent hover:border-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Core Gameplay Mechanics */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Main Objective Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/50 to-stone-950 border border-amber-500/40 flex items-start gap-3">
            <Flag className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-stone-300 text-xs sm:text-[13px] leading-relaxed">
              <strong className="text-amber-300 font-cinzel">Ana Harp Hedefi & Zafer:</strong> Gündüzleri kaynak topla, köylerden gönüllü toplayıp siperler inşa et. Gece düşman akınlarına karşı karargahını müdafaa et. Ordun güçlendiğinde haritanın sonundaki <strong className="text-rose-400">düşman çıkarma üslerini ve gemilerini imha ederek</strong> zafere ulaş!
            </p>
          </div>

          {/* 4 Core Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Step 1: Movement & Exploration */}
            <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 flex flex-col justify-between gap-2 shadow-sm hover:border-amber-500/40 transition">
              <div>
                <div className="flex items-center gap-2 text-amber-300 font-cinzel font-bold text-xs sm:text-sm mb-1">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-pixel text-[10px] flex items-center justify-center border border-amber-500/40">1</span>
                  <span>Hareket & Keşif</span>
                </div>
                <p className="text-stone-300 text-[11px] sm:text-xs leading-relaxed">
                  Atınla cephe hattının sağına ve soluna giderek araziyi keşfet.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-stone-400">
                <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-bold">A / D / Oklar</span>
                <span>veya</span>
                <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-sky-300 font-bold flex items-center gap-1">
                  <MousePointerClick className="w-3 h-3" /> Ekrana Tıkla
                </span>
                <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-bold">Shift: Dörtnal</span>
              </div>
            </div>

            {/* Step 2: Economy & Resource Gathering */}
            <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 flex flex-col justify-between gap-2 shadow-sm hover:border-emerald-500/40 transition">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 font-cinzel font-bold text-xs sm:text-sm mb-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-pixel text-[10px] flex items-center justify-center border border-emerald-500/40">2</span>
                  <span>Sikke & Kaynak Toplama</span>
                </div>
                <p className="text-stone-300 text-[11px] sm:text-xs leading-relaxed">
                  Çam ağaçlarının ve harp enkazlarının yanına git. Ağacı kesince yere <strong className="text-amber-300">altın sikkeler</strong> saçılır; atınla üstünden geçerek topla.
                </p>
              </div>
              <div className="flex items-center gap-1.5 pt-1 text-[10px] font-mono text-stone-400">
                <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-emerald-300 font-bold flex items-center gap-1">
                  <Trees className="w-3 h-3" /> Ağaç Kes (1🪙)
                </span>
                <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-bold">
                  E / Boşluk
                </span>
              </div>
            </div>

            {/* Step 3: Village Recruitment & Trench Construction */}
            <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 flex flex-col justify-between gap-2 shadow-sm hover:border-sky-500/40 transition">
              <div>
                <div className="flex items-center gap-2 text-sky-300 font-cinzel font-bold text-xs sm:text-sm mb-1">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-pixel text-[10px] flex items-center justify-center border border-sky-500/40">3</span>
                  <span>Köyden Asker & Siper İnşası</span>
                </div>
                <p className="text-stone-300 text-[11px] sm:text-xs leading-relaxed">
                  Haritadaki <strong className="text-amber-300">köyleri</strong> ziyaret ederek köylülere sikke ver ve orduya kat. Karargahında tüfek alarak Mehmetçik olurlar ve siperlere yerleşirler.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-stone-400">
                <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-sky-300 font-bold flex items-center gap-1">
                  <Users className="w-3 h-3" /> Gönüllü Köylü (1🪙)
                </span>
                <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-bold flex items-center gap-1">
                  <Hammer className="w-3 h-3" /> Siper Kaz & Yükselt
                </span>
              </div>
            </div>

            {/* Step 4: Defense, Whistle & Final Offensive */}
            <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-stone-800 flex flex-col justify-between gap-2 shadow-sm hover:border-rose-500/40 transition">
              <div>
                <div className="flex items-center gap-2 text-rose-300 font-cinzel font-bold text-xs sm:text-sm mb-1">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 font-pixel text-[10px] flex items-center justify-center border border-rose-500/40">4</span>
                  <span>Savunma & Karşı Taarruz</span>
                </div>
                <p className="text-stone-300 text-[11px] sm:text-xs leading-relaxed">
                  Gece siperlerde savunma yap. Yeterli ordu kurduğunda <strong className="text-amber-300">[Q]</strong> ile hücum emri ver; düşman çıkarma üssünü yıkıp bölümü tamamla!
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] font-mono text-stone-400">
                <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-amber-300 font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3" /> [Q] Taarruz Düdüğü
                </span>
                <span className="px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-rose-300 font-bold flex items-center gap-1">
                  <Bomb className="w-3 h-3" /> [F] Sahil Topu
                </span>
              </div>
            </div>
          </div>

          {/* Practical Combat Tips */}
          <div className="p-3 rounded-2xl bg-stone-950/50 border border-stone-800/80 text-[11px] text-stone-400 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-amber-400 font-cinzel font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Kumandan İçin Altın Kurallar</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-stone-300 leading-relaxed">
              <li><strong className="text-amber-300">İşlem Yapma:</strong> İnşa noktası, ağaç veya köyün yanındayken <strong className="text-amber-300">[E]</strong>, <strong className="text-amber-300">[Boşluk]</strong> veya <strong className="text-amber-300">[Aşağı Ok]</strong> tuşuna basarak sikke harcayabilirsin.</li>
              <li><strong className="text-amber-300">Karargah Geliştirme:</strong> Merkez çadırını yükselttikçe daha derin siperler, makineli tüfek yuvaları ve sahra hastanesi inşa etme imkanı açılır.</li>
              <li><strong className="text-amber-300">Zafer Şartı:</strong> Haritanın en ucundaki düşman çıkarma tabyasını imha ettiğinde o cepheyi kesin zaferle kazanırsın!</li>
            </ul>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-5 py-3.5 border-t border-stone-800 bg-stone-950 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-300 font-cinzel font-bold text-xs rounded-xl border border-stone-700 transition active:scale-95"
          >
            Kapat
          </button>

          {onStartGame ? (
            <button
              onClick={() => {
                onClose();
                onStartGame();
              }}
              className="px-6 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-cinzel font-black text-xs rounded-xl shadow-lg border border-amber-400 transition active:scale-95 flex items-center gap-1.5"
            >
              <Play className="w-4 h-4 fill-stone-950" />
              <span>Muharebeye Başla!</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-cinzel font-black text-xs rounded-xl shadow-lg border border-amber-400 transition active:scale-95 flex items-center gap-1.5"
            >
              <span>Anladım, Cepheye Dön!</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
