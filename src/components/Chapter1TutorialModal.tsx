import React, { useState, useEffect } from 'react';
import { 
  Keyboard, 
  Zap, 
  Hammer, 
  Radio, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  Trees, 
  MousePointerClick, 
  Play, 
  X,
  Compass,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

interface Chapter1TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (neverShowAgain: boolean) => void;
}

export const Chapter1TutorialModal: React.FC<Chapter1TutorialModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [testedKeys, setTestedKeys] = useState<{
    move: boolean;
    sprint: boolean;
    interact: boolean;
    whistle: boolean;
  }>({
    move: false,
    sprint: false,
    interact: false,
    whistle: false,
  });

  const [neverShowAgain, setNeverShowAgain] = useState<boolean>(false);

  // Live Key Test Listener inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key?.toLowerCase();

      if (code === 'KeyA' || code === 'KeyD' || code === 'ArrowLeft' || code === 'ArrowRight' || key === 'a' || key === 'd') {
        setTestedKeys((prev) => ({ ...prev, move: true }));
      } else if (code === 'ShiftLeft' || code === 'ShiftRight' || key === 'shift') {
        setTestedKeys((prev) => ({ ...prev, sprint: true }));
      } else if (code === 'KeyE' || code === 'Space' || code === 'ArrowDown' || key === 'e' || key === ' ') {
        setTestedKeys((prev) => ({ ...prev, interact: true }));
      } else if (code === 'KeyQ' || key === 'q') {
        setTestedKeys((prev) => ({ ...prev, whistle: true }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const allTested = testedKeys.move && testedKeys.sprint && testedKeys.interact && testedKeys.whistle;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        id="chapter1-tutorial-dialog"
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-stone-900 border-2 border-amber-500/90 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden text-stone-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-gradient-to-r from-amber-950/80 via-stone-900 to-stone-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-inner">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-pixel text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  1. BÖLÜM: BAŞLANGIÇ EĞİTİMİ
                </span>
                <span className="text-stone-500 text-xs">•</span>
                <span className="text-[10px] sm:text-[11px] text-stone-400 font-cinzel">Seddülbahir Cephesi</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black font-cinzel text-amber-200 tracking-wide uppercase mt-0.5">
                Kumandan Talimnâmesi & Tuş Kılavuzu
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-stone-400 hover:text-amber-300 hover:bg-stone-800 rounded-xl transition-colors border border-transparent hover:border-stone-700"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Welcome Lore Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 to-stone-950 border border-amber-500/30 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-stone-300 text-xs sm:text-[13px] leading-relaxed">
              <strong className="text-amber-300 font-cinzel">Kumandanım, Çanakkale Siperlerine Hoş Geldiniz!</strong> Düşman donanması Ertuğrul Koyu sahiline çıkarma yapmak üzere. Cepheyi yönetmek için klavye veya dokunmatik kontrolleri öğreniniz.
            </p>
          </div>

          {/* Interactive Keyboard Controls Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-cinzel font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Keyboard className="w-4 h-4" />
                <span>Temel Kumanda Tuşları (Tuşlara basarak test edebilirsiniz)</span>
              </span>
              {allTested && (
                <span className="text-[10px] font-pixel text-emerald-400 bg-emerald-950/60 border border-emerald-500/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> TÜM TUŞLAR TEST EDİLDİ
                </span>
              )}
            </div>

            {/* 1. Movement Card */}
            <div 
              className={`p-3.5 rounded-2xl border transition duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                testedKeys.move 
                  ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'bg-stone-950/80 border-stone-800 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${testedKeys.move ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-900 text-amber-400'}`}>
                  <ArrowRight className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-cinzel font-bold text-amber-200 text-sm">1. Atı Sür & Hareket Et</span>
                    {testedKeys.move && (
                      <span className="text-[9px] font-pixel text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/40">
                        ✓ DENENDİ
                      </span>
                    )}
                  </div>
                  <p className="text-stone-400 text-xs mt-0.5 leading-relaxed">
                    Atınla cephe hattı boyunca sola ve sağa sür. Ayrıca <strong>ekrana tıklayarak veya dokunarak</strong> da atını yönlendirebilirsin.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <kbd className="px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-amber-300 font-pixel text-xs shadow-inner min-w-[32px] text-center">
                  A
                </kbd>
                <kbd className="px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-amber-300 font-pixel text-xs shadow-inner min-w-[32px] text-center">
                  D
                </kbd>
                <span className="text-stone-500 text-xs font-bold">veya</span>
                <kbd className="px-2 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-stone-300 font-mono text-xs shadow-inner">
                  ← →
                </kbd>
              </div>
            </div>

            {/* 2. Gallop / Sprint Card */}
            <div 
              className={`p-3.5 rounded-2xl border transition duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                testedKeys.sprint 
                  ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'bg-stone-950/80 border-stone-800 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${testedKeys.sprint ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-900 text-amber-400'}`}>
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-cinzel font-bold text-amber-200 text-sm">2. Dörtnala Koş (Hızlı Sürüş)</span>
                    {testedKeys.sprint && (
                      <span className="text-[9px] font-pixel text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/40">
                        ✓ DENENDİ
                      </span>
                    )}
                  </div>
                  <p className="text-stone-400 text-xs mt-0.5 leading-relaxed">
                    Atını dörtnala koştur. Düşman hücumuna yetişmek için kullan (At yorulursa çimende otlatarak dinlendir).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <kbd className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-amber-300 font-pixel text-xs shadow-inner">
                  SHIFT
                </kbd>
              </div>
            </div>

            {/* 3. Interact / Build / Harvest Card */}
            <div 
              className={`p-3.5 rounded-2xl border transition duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                testedKeys.interact 
                  ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'bg-stone-950/80 border-stone-800 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${testedKeys.interact ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-900 text-amber-400'}`}>
                  <Hammer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-cinzel font-bold text-amber-200 text-sm">3. İnşa Et, Ağaç Kes & Sikke Yatır</span>
                    {testedKeys.interact && (
                      <span className="text-[9px] font-pixel text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/40">
                        ✓ DENENDİ
                      </span>
                    )}
                  </div>
                  <p className="text-stone-400 text-xs mt-0.5 leading-relaxed">
                    Ağaçların, siperlerin, karargahın veya köylerin yanındayken basarak <strong>sikke harca</strong>, ağaç kes, siper kaz ve gönüllü nefer topla.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <kbd className="px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-amber-300 font-pixel text-xs shadow-inner min-w-[32px] text-center">
                  E
                </kbd>
                <span className="text-stone-500 text-xs font-bold">veya</span>
                <kbd className="px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-amber-300 font-pixel text-xs shadow-inner">
                  BOŞLUK / SPACE
                </kbd>
              </div>
            </div>

            {/* 4. Whistle / Moral Card */}
            <div 
              className={`p-3.5 rounded-2xl border transition duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                testedKeys.whistle 
                  ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'bg-stone-950/80 border-stone-800 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${testedKeys.whistle ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-900 text-amber-400'}`}>
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-cinzel font-bold text-amber-200 text-sm">4. Taarruz Düdüğü (Moral & Hızlı Ateş)</span>
                    {testedKeys.whistle && (
                      <span className="text-[9px] font-pixel text-emerald-400 bg-emerald-950 px-1.5 py-0.2 rounded border border-emerald-500/40">
                        ✓ DENENDİ
                      </span>
                    )}
                  </div>
                  <p className="text-stone-400 text-xs mt-0.5 leading-relaxed">
                    3 Altın Sikke vererek düdük çal! Tüm Mehmetçiklere hücum şevki verir ve geçici olarak <strong>+%50 atış hızı</strong> kazandırır.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <kbd className="px-2.5 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-amber-300 font-pixel text-xs shadow-inner min-w-[32px] text-center">
                  Q
                </kbd>
              </div>
            </div>
          </div>

          {/* Quick Tactical Roadmap for Chapter 1 */}
          <div className="p-3.5 rounded-2xl bg-stone-950/60 border border-stone-800 text-stone-300 space-y-2">
            <span className="text-xs font-cinzel font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Trees className="w-3.5 h-3.5 text-emerald-400" />
              <span>1. Gün İçin Tavsiye Edilen İlk Adımlar</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] sm:text-xs">
              <div className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800/80 flex flex-col gap-1">
                <span className="text-amber-400 font-bold font-cinzel">1. Ağaç Kes & Altın Topla</span>
                <span className="text-stone-400">Atınla sağa ve sola giderek ağaçları [E] ile kes, saçılan altınları atınla topla.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800/80 flex flex-col gap-1">
                <span className="text-sky-400 font-bold font-cinzel">2. Köyden Nefer Çağır</span>
                <span className="text-stone-400">Haritadaki köylerden 2 sikke karşılığı gönüllü topla; karargahtan tüfek alırlar.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-stone-900/80 border border-stone-800/80 flex flex-col gap-1">
                <span className="text-rose-400 font-bold font-cinzel">3. Siperleri Hazırla</span>
                <span className="text-stone-400">Gece olmadan siperleri [E] ile kazıp tahkim et; neferler içine girip savunma yapar.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-stone-800 bg-stone-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-400 hover:text-stone-300">
            <input 
              type="checkbox"
              checked={neverShowAgain}
              onChange={(e) => setNeverShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-stone-700 bg-stone-900 text-amber-500 focus:ring-amber-500/50 cursor-pointer accent-amber-500"
            />
            <span>Bu talim ekranını bir daha otomatik açma</span>
          </label>

          <button
            onClick={() => onComplete(neverShowAgain)}
            className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-cinzel font-black text-xs sm:text-sm rounded-2xl shadow-xl border border-amber-400 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>Talimi Tamamla & Muharebeye Başla!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
