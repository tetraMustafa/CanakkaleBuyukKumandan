import React, { useState, useEffect } from 'react';
import { CAMPAIGN_LEVELS } from '../data/levels';
import { Compass, Shield, Flag, Sparkles, MapPin, Calendar, Crosshair } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface LevelLoadingScreenProps {
  levelIndex: number;
  onLoaded: () => void;
}

const HISTORICAL_QUOTES = [
  {
    quote: '"Ben size taarruzu emretmiyorum, ölmeyi emrediyorum! Biz ölünceye kadar geçecek zaman zarfında yerimize başka kuvvetler ve kumandanlar gelecektir."',
    author: 'Mustafa Kemal Atatürk • 19. Tümen Kumandanı'
  },
  {
    quote: '"Bir kumandan için en büyük bahtiyarlık, vatanın müdafaasında Mehmetçik gibi arslanlarla omuz omuza çarpışmaktır."',
    author: 'Cevat Paşa • Çanakkale Müstahkem Mevkii Kumandanı'
  },
  {
    quote: '"Gülümse ey şanlı hilal! Bu topraklar üzerinde tek bir nefer kalana dek Çanakkale geçilmeyecektir."',
    author: 'Mehmet Akif Ersoy • Çanakkale Şehitlerine'
  },
  {
    quote: '"Vur Mehmetçik, vur ki vatan kurtulsun; iman dolu göğsün düşmana siper olsun!"',
    author: 'Yahya Çavuş • Ertuğrul Koyu Müdafaası'
  }
];

const LOADING_STEPS = [
  'Gelibolu Cephe Haritası ve Arazi Topoğrafyası Oluşturuluyor...',
  'Siper Hatları, Makineli Tüfek Mevzileri ve Yadigârlar Konumlandırılıyor...',
  'Grafik ve Görsel Bellek Önbelleğe Alınıyor (60 FPS V-Sync)...',
  'Ses Motoru Sentezleyicisi ve Mühimmat İstihkamları Hazırlanıyor...',
  'Tüm Cephe Varlıkları Hazır! Muharebe Başlıyor...'
];

export const LevelLoadingScreen: React.FC<LevelLoadingScreenProps> = ({
  levelIndex,
  onLoaded,
}) => {
  const [progress, setProgress] = useState<number>(10);
  const [stepIndex, setStepIndex] = useState<number>(0);

  const level = CAMPAIGN_LEVELS[levelIndex] || CAMPAIGN_LEVELS[0];
  const quoteObj = HISTORICAL_QUOTES[levelIndex % HISTORICAL_QUOTES.length];

  useEffect(() => {
    soundEngine.resume();

    // Smooth progressive loading timeline
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => {
      setProgress(35);
      setStepIndex(1);
    }, 120));

    timers.push(setTimeout(() => {
      setProgress(68);
      setStepIndex(2);
    }, 280));

    timers.push(setTimeout(() => {
      setProgress(90);
      setStepIndex(3);
    }, 450));

    timers.push(setTimeout(() => {
      setProgress(100);
      setStepIndex(4);
    }, 620));

    timers.push(setTimeout(() => {
      onLoaded();
    }, 850));

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [onLoaded]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0905] text-stone-200 select-none animate-fade-in p-4">
      {/* Background Vintage Vignette & Map Texture Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2a170b]/60 via-[#140b04]/90 to-[#080402] pointer-events-none" />
      
      {/* Ancient Parchment War Briefing Card */}
      <div className="relative z-10 max-w-2xl w-full bg-[#1c120a] border-4 border-[#b45309] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(0,0,0,0.95)] flex flex-col items-center text-center overflow-hidden">
        
        {/* Brass Header Trim */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-950 border border-amber-500 flex items-center justify-center text-amber-400 shadow">
            <Compass className="w-5 h-5 text-amber-400 animate-spin-slow" />
          </div>
          <span className="text-xs font-pixel text-amber-400 uppercase tracking-widest bg-black/60 px-2.5 py-0.5 rounded border border-amber-600/60">
            HARBİYE NEZÂRETİ • CEPHE YÜKLENİYOR
          </span>
        </div>

        {/* Level Title & Date */}
        <h2 className="text-xl sm:text-2xl font-black font-cinzel text-amber-100 tracking-wide uppercase drop-shadow mb-1">
          {level.nameTr}
        </h2>

        <div className="flex items-center justify-center gap-4 text-xs text-amber-300/90 font-cinzel font-semibold mb-5">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            {level.historicalDateTr}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            {level.locationTr}
          </span>
        </div>

        {/* Historical Quote Box */}
        <div className="w-full bg-[#27150a]/90 border border-amber-800/60 rounded-xl p-4 mb-6 shadow-inner text-left">
          <p className="text-xs sm:text-sm text-amber-100/95 font-serif italic leading-relaxed mb-2">
            {quoteObj.quote}
          </p>
          <div className="text-[11px] font-cinzel font-bold text-amber-400 text-right">
            — {quoteObj.author}
          </div>
        </div>

        {/* Loading Step Description */}
        <div className="w-full flex items-center justify-between text-xs font-cinzel text-amber-300 font-bold mb-2">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
            {LOADING_STEPS[stepIndex]}
          </span>
          <span className="font-mono text-yellow-400 text-sm font-black">
            %{progress}
          </span>
        </div>

        {/* Golden Ornate Progress Bar Container */}
        <div className="w-full h-4 bg-stone-950 border-2 border-amber-700/80 rounded-full overflow-hidden p-0.5 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(250,204,21,0.7)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-[11px] text-stone-400 font-serif mt-4">
          Tüm harita grafikleri, siperler ve sesler belleğe yükleniyor. Oyun esnasında takılma yaşanmaz.
        </p>

      </div>
    </div>
  );
};
