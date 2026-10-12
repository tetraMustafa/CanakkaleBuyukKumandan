import React, { useState, useEffect, useRef } from 'react';
import { Radio, X, Volume2, ShieldAlert, CheckCircle, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { RadioInterceptState, RadioIntelReport } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface RadioTelegraphModalProps {
  radioState: RadioInterceptState;
  onClose: () => void;
  onTuneFrequency: (freq: number) => void;
  onDecodeSuccess: () => void;
}

export const RadioTelegraphModal: React.FC<RadioTelegraphModalProps> = ({
  radioState,
  onClose,
  onTuneFrequency,
  onDecodeSuccess,
}) => {
  const [freq, setFreq] = useState<number>(radioState.currentFrequency || 500);
  const targetFreq = radioState.targetFrequency || 740;
  const isDecoded = radioState.isDecoded;
  const report = radioState.intelReport;

  // Signal strength calculation (0 to 1) based on distance to target frequency
  const freqDiff = Math.abs(freq - targetFreq);
  const signalStrength = Math.max(0, 1 - freqDiff / 90);
  const isLocked = signalStrength >= 0.88;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Audio feedback as player tunes the frequency
  useEffect(() => {
    if (!isDecoded && signalStrength > 0.4) {
      soundEngine.playRadioChatter();
    }
  }, [Math.round(freq / 20), isDecoded]);

  // Oscilloscope waveform rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const renderWave = () => {
      time += 0.08;
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // CRT Scanlines
      ctx.fillStyle = 'rgba(0, 255, 120, 0.03)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1);
      }

      // Center baseline grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      // Oscilloscope Sine / Noise Wave
      ctx.lineWidth = 2;
      ctx.strokeStyle = isDecoded
        ? '#4ade80'
        : isLocked
        ? '#facc15'
        : signalStrength > 0.4
        ? '#38bdf8'
        : '#475569';

      ctx.beginPath();
      const points = 160;
      for (let i = 0; i < points; i++) {
        const x = (i / points) * w;
        const norm = (i / points) * Math.PI * 8;
        // More noise when far from frequency, clean harmonic wave when locked
        const noise = (1 - signalStrength) * (Math.random() - 0.5) * 22;
        const amplitude = (signalStrength * 28 + 6);
        const y = h / 2 + Math.sin(norm + time * 3) * amplitude + noise;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [signalStrength, isDecoded, isLocked]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setFreq(val);
    onTuneFrequency(val);
  };

  const handleStep = (delta: number) => {
    const next = Math.max(400, Math.min(1200, freq + delta));
    setFreq(next);
    onTuneFrequency(next);
  };

  const handleDecode = () => {
    if (isLocked && !isDecoded) {
      soundEngine.playRadioDecode();
      onDecodeSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-stone-900 via-stone-950 to-stone-900 border-2 border-amber-600/80 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col text-stone-100">
        
        {/* Brass Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-stone-950 via-amber-950/80 to-stone-950 border-b border-amber-700/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-500/60 flex items-center justify-center text-amber-400 shadow-inner">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="font-cinzel font-black text-sm sm:text-base text-amber-300 tracking-wider">
                1915 SAHRA TELSİZ & İSTİHBARAT MASASI
              </h2>
              <p className="text-[10px] text-amber-400/80 font-mono tracking-tight">
                ÇANAKKALE MÜSTAHKEM MEVKİİ MUHABERE İSTASYONU
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-900/80 hover:bg-stone-800 text-stone-400 hover:text-amber-300 border border-stone-700/70 transition cursor-pointer"
            title="Kapat (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 flex flex-col gap-5 overflow-y-auto max-h-[80vh]">

          {/* Oscilloscope Screen & Tuning Meters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-stone-950/90 border border-stone-800 rounded-xl p-3 sm:p-4 shadow-inner">
            {/* Screen */}
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-stone-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  SİNYAL MONİTÖRÜ (KABLOSUZ TELGRAF)
                </span>
                <span className="text-amber-400 font-bold">
                  {freq} kHz
                </span>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-emerald-900/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <canvas ref={canvasRef} width={400} height={120} className="w-full h-28 object-cover bg-stone-950" />
                <div className="absolute top-2 right-2 text-[9px] font-mono bg-black/60 px-1.5 py-0.5 rounded text-emerald-400 border border-emerald-800/40">
                  {isDecoded ? 'DEKODE EDİLDİ' : isLocked ? 'REZONE OLDU' : 'TARANIYOR...'}
                </div>
              </div>
            </div>

            {/* Signal Strength Needle Meter */}
            <div className="flex flex-col justify-between bg-stone-900/80 border border-stone-800 rounded-lg p-3">
              <div>
                <span className="text-[10px] font-cinzel font-bold text-amber-300 block mb-1">
                  SİNYAL KALİTESİ
                </span>
                <div className="w-full bg-stone-950 h-3 rounded-full overflow-hidden border border-stone-800 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-150 ${
                      signalStrength > 0.85
                        ? 'bg-gradient-to-r from-amber-500 to-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                        : signalStrength > 0.4
                        ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                        : 'bg-rose-900'
                    }`}
                    style={{ width: `${Math.round(signalStrength * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-stone-400 mt-1">
                  <span>Zayıf</span>
                  <span className="font-bold text-amber-300">{Math.round(signalStrength * 100)}%</span>
                  <span>Kuvvetli</span>
                </div>
              </div>

              {/* Status Note */}
              <div className="text-[10px] text-stone-400 font-sans mt-2 p-2 bg-stone-950/70 rounded border border-stone-800/80 leading-relaxed">
                {isDecoded ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 shrink-0" /> Şifre çözüldü! Aşağıdaki istihbarat raporunu inceleyin.
                  </span>
                ) : isLocked ? (
                  <span className="text-amber-300 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 shrink-0 text-amber-400 animate-spin" /> Düşman frekansı yakalandı! Şifreyi Çöz tuşuna basın.
                  </span>
                ) : (
                  <span>
                    Kadranı çevirerek telsiz sinyalini netleştirin (İpucu: <strong className="text-amber-300">{Math.round(targetFreq / 50) * 50} kHz</strong> civarı).
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tuner Controls (Only if not already decoded) */}
          {!isDecoded && (
            <div className="flex flex-col gap-3 bg-stone-950/80 border border-amber-900/40 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs font-cinzel font-bold text-amber-200">
                <span>FREKANS AYARI (KADRAN)</span>
                <span className="font-mono text-amber-400">{freq} kHz</span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={400}
                max={1200}
                step={5}
                value={freq}
                onChange={handleSliderChange}
                className="w-full accent-amber-500 h-2 bg-stone-800 rounded-lg cursor-pointer"
              />

              {/* Quick Step Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStep(-25)}
                    className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 text-xs font-mono border border-stone-700 transition cursor-pointer"
                  >
                    -25 kHz
                  </button>
                  <button
                    onClick={() => handleStep(-5)}
                    className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 text-xs font-mono border border-stone-700 transition cursor-pointer"
                  >
                    -5 kHz
                  </button>
                </div>

                {/* Decode Button */}
                <button
                  onClick={handleDecode}
                  disabled={!isLocked}
                  className={`px-5 py-2 rounded-xl font-cinzel font-black text-xs sm:text-sm tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                    isLocked
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 animate-pulse'
                      : 'bg-stone-900 text-stone-600 border border-stone-800 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>ŞİFREYİ ÇÖZ & RAPORU AL</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStep(5)}
                    className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 text-xs font-mono border border-stone-700 transition cursor-pointer"
                  >
                    +5 kHz
                  </button>
                  <button
                    onClick={() => handleStep(25)}
                    className="px-2.5 py-1 rounded bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-amber-300 text-xs font-mono border border-stone-700 transition cursor-pointer"
                  >
                    +25 kHz
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Decoded Intel Dispatch Report Card */}
          {isDecoded && report && (
            <div className="relative bg-gradient-to-b from-[#2a1e12] to-[#1c140c] border-2 border-amber-600/80 rounded-xl p-4 sm:p-5 shadow-[0_0_30px_rgba(245,158,11,0.2)] text-amber-100 flex flex-col gap-3">
              {/* Historical Ottoman Telegram Header */}
              <div className="flex items-center justify-between border-b border-amber-700/50 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="text-xl">🇹🇷</div>
                  <div>
                    <span className="font-cinzel font-extrabold text-xs sm:text-sm text-amber-300 tracking-wider block">
                      HARBİYE NEZARETİ - TELGRAF ŞİFRE DAİRESİ
                    </span>
                    <span className="text-[10px] text-amber-500 font-mono">
                      MUHABERE VE İSTİHBARAT RAPORU #1915-{Math.round(freq)}
                    </span>
                  </div>
                </div>

                {/* Red Wax / Ink Stamp */}
                <div className="border-2 border-rose-600 text-rose-500 rounded px-2 py-0.5 text-[9px] font-mono font-bold tracking-widest uppercase rotate-[-3deg] shadow-inner">
                  ŞİFRESİ ÇÖZÜLDÜ
                </div>
              </div>

              {/* Intercepted Text */}
              <div className="bg-black/30 p-3 rounded-lg border border-amber-900/50 font-serif text-xs sm:text-sm leading-relaxed text-amber-200">
                <span className="text-amber-400 font-bold block mb-1">
                  📡 Yakalanan Düşman Telsiz Mesajı:
                </span>
                "{report.text}"
              </div>

              {/* Tactical Intel Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div className="bg-amber-950/60 border border-amber-700/50 rounded-lg p-2 flex flex-col">
                  <span className="text-[10px] text-amber-400/80 font-cinzel font-semibold">HEDEF KANAT</span>
                  <span className="font-bold text-xs sm:text-sm text-amber-200">
                    {report.flank === 'left' ? 'SOL KANAT (ARIBURNU)' : report.flank === 'right' ? 'SAĞ KANAT (SEDDÜLBAHİR)' : 'HER İKİ KANAT (KISKAÇ)'}
                  </span>
                </div>

                <div className="bg-amber-950/60 border border-amber-700/50 rounded-lg p-2 flex flex-col">
                  <span className="text-[10px] text-amber-400/80 font-cinzel font-semibold">TAHMİNİ KUVVET</span>
                  <span className="font-bold text-xs sm:text-sm text-amber-200">
                    ~{report.enemyCount} Düşman Neferi
                  </span>
                </div>

                <div className="bg-amber-950/60 border border-amber-700/50 rounded-lg p-2 flex flex-col">
                  <span className="text-[10px] text-amber-400/80 font-cinzel font-semibold">BİRLİK NİTELİĞİ</span>
                  <span className="font-bold text-xs sm:text-sm text-amber-200">
                    {report.hasHeavyUnits ? '⚠️ Ağır Piyade & Bomba Atar' : 'Hafif Keşif & Piyade'}
                  </span>
                </div>
              </div>

              {/* Commander Advice */}
              <div className="text-[11px] text-amber-300/90 bg-amber-900/30 p-2.5 rounded-lg border border-amber-700/40 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Kumandanın Notu:</strong> Bir sonraki hücum dalgası çözülen plana göre gerçekleşecektir. Savunmanızı belirtilen kanada yoğunlaştırın veya borazan ile hücumu karşılayın!
                </span>
              </div>

              {/* Close / Action Button */}
              <button
                onClick={onClose}
                className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-cinzel font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
              >
                <span>İSTİHBARATI SİPERLERE İLET & KAPAT</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
