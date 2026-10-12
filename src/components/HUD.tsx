import React from 'react';
import { 
  Coins, 
  Crosshair, 
  Volume2, 
  VolumeX, 
  FastForward, 
  Play, 
  Pause, 
  BookOpen, 
  Map, 
  HelpCircle,
  Wind,
  Sun,
  Moon,
  Flame,
  Radio,
  Home,
  Award,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { GameState, PlayerCommander, BuildSlot } from '../types/game';
import { CAMPAIGN_LEVELS } from '../data/levels';
import { PixelCoinPouch } from './PixelCoinPouch';

interface HUDProps {
  state: GameState;
  commander: PlayerCommander;
  slots: BuildSlot[];
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleSpeed: () => void;
  onTogglePause: () => void;
  onCycleWeather?: () => void;
  onCycleSeason?: () => void;
  onOpenCodex: () => void;
  onOpenMap: () => void;
  onOpenHelp?: () => void;
  onOpenTutorial?: () => void;
  onWhistle: () => void;
  onNavalSupport: () => void;
  onOpenMainMenu?: () => void;
  onToggleRadio?: () => void;
}

export const HUD: React.FC<HUDProps> = React.memo(({
  state,
  commander,
  slots: _slots,
  isMuted,
  onToggleMute,
  onToggleSpeed,
  onTogglePause,
  onCycleWeather,
  onCycleSeason,
  onOpenCodex,
  onOpenMap,
  onOpenHelp,
  onOpenTutorial,
  onWhistle: _onWhistle,
  onNavalSupport: _onNavalSupport,
  onOpenMainMenu,
  onToggleRadio,
}) => {
  // Phase labels
  const phaseLabels: Record<string, { label: string; color: string }> = {
    dawn: { label: 'ŞAFAK', color: 'text-amber-400' },
    day: { label: 'GÜNDÜZ - TAHKİMAT', color: 'text-sky-400' },
    dusk: { label: 'GÜNBATIMI', color: 'text-orange-500' },
    night: { label: 'GECE TAARRUZU', color: 'text-rose-500' },
    midnight: { label: 'GECE BASKINI', color: 'text-red-600' },
  };

  const seasonLabels: Record<string, string> = {
    spring: 'İlkbahar 1915',
    summer: 'Yaz Sıcağı',
    autumn: 'Sonbahar Çamuru',
    winter: 'Boran & Don',
  };

  const weatherLabels: Record<string, string> = {
    clear: 'Açık Hava',
    rain: 'Sağanak Yağmur',
    fog: 'Yoğun Sis',
    storm: 'Fırtına',
    snow: 'Tipi & Kar',
  };

  const currentPhase = phaseLabels[state.timePhase] || { label: 'GÜNDÜZ', color: 'text-amber-400' };

  // Minimap calculation
  const worldW = state.level.worldWidth;
  const hqHealthPct = Math.max(0, Math.min(1, state.hqHealth / state.maxHqHealth));

  // Find relic details from all campaign levels and dynamically spawned shrines
  const allRelics = CAMPAIGN_LEVELS.flatMap((l) => l.relicsAvailable);
  const activeRelicDetails = state.relicsCollected.map((id) => {
    if (id.includes('statue_damage')) {
      return {
        id,
        titleTr: '🇹🇷 57. Alay & Mustafa Kemal Yadigârı',
        descriptionTr: 'Tüm Mehmetçiklerin mermilerini güçlendirir; düşmana %50 daha fazla hasar verdirir ve izli mermi kazandırır.',
      };
    }
    if (id.includes('statue_health')) {
      return {
        id,
        titleTr: '🌙 Hilal-i Ahmer Şifa Yadigârı',
        descriptionTr: 'Bütün Mehmetçiklerin ve kumandanın azami canını %40 artırır ve yaralarını sarar.',
      };
    }
    if (id.includes('statue_defense')) {
      return {
        id,
        titleTr: '🛡️ Çanakkale İstihkâm & Savunma Yadigârı',
        descriptionTr: 'Bütün mevzi, siper ve binaların azami dayanıklılığını %50 artırır ve hasarları onarır.',
      };
    }
    return allRelics.find((r) => r.id === id) || {
      id,
      titleTr: 'Mukaddes Yadigâr',
      descriptionTr: 'Manevi güç ve taarruz takviyesi sağlar.',
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 sm:p-3 select-none">
      {/* Top Header Bar */}
      <div className="flex items-start justify-between gap-2">
        {/* Left: Kingdom Coin Purse & Commander Vitals + Whistle Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pointer-events-auto">
          {/* Mecidiye Coins (Gold Coin Icon) */}
          <div className="flex items-center gap-2 sm:gap-3 bg-stone-950/95 border border-amber-500/70 px-3 py-1.5 rounded-xl shadow-2xl">
            <div className="relative flex items-center justify-center">
              <PixelCoinPouch amount={commander.mecidiye} maxAmount={commander.maxMecidiye} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-amber-400/90 font-cinzel leading-none">
                Mecidiye Sikkesi
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base sm:text-lg font-black text-amber-300 font-pixel drop-shadow">
                  {commander.mecidiye}
                </span>
                <span className="text-[10px] sm:text-xs text-amber-500/80 font-cinzel">
                  / {commander.maxMecidiye}
                </span>
              </div>
            </div>
          </div>

          {/* Taarruz Düdüğü Durumu (Kompakt Üst Bilgi) */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-lg transition-all select-none ${
              commander.activeBuff
                ? 'bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-amber-400 ring-1 ring-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.35)] animate-pulse text-amber-200'
                : commander.whistleCooldown > 0
                ? 'bg-stone-950/90 border-stone-800 text-stone-400'
                : commander.mecidiye < 3 && (!state.inGameTutorial?.enabled || state.inGameTutorial?.step !== 'use_whistle')
                ? 'bg-stone-950/90 border-stone-800/80 text-amber-400/80'
                : 'bg-stone-950/95 border-amber-500/80 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
            }`}
            title={
              commander.activeBuff
                ? 'Taarruz Düdüğü Aktif! (+%50 Ateş Hızı & Hücum Morali)'
                : commander.whistleCooldown > 0
                ? `Düdük Doluyor: ${Math.ceil(commander.whistleCooldown)} saniye`
                : commander.mecidiye < 3 && (!state.inGameTutorial?.enabled || state.inGameTutorial?.step !== 'use_whistle')
                ? 'Taarruz Düdüğü İçin 3 Sikke Gerekir'
                : 'Taarruz Düdüğü Hazır! [Q] Tuşuna Bas'
            }
          >
            <span className="text-xs shrink-0">📯</span>
            {commander.activeBuff ? (
              <div className="flex items-center gap-1.5 font-cinzel text-[10px] font-bold">
                <span className="text-amber-300">HÜCUM:</span>
                <span className="font-pixel text-xs text-amber-100 bg-amber-900/60 px-1 py-0.5 rounded border border-amber-500/50">
                  {Math.ceil(commander.buffTimer)}s
                </span>
              </div>
            ) : commander.whistleCooldown > 0 ? (
              <div className="flex items-center gap-1.5 font-cinzel text-[10px]">
                <span className="text-stone-400">DÜDÜK:</span>
                <span className="font-pixel text-xs text-stone-300">
                  {Math.ceil(commander.whistleCooldown)}s
                </span>
              </div>
            ) : commander.mecidiye < 3 && (!state.inGameTutorial?.enabled || state.inGameTutorial?.step !== 'use_whistle') ? (
              <div className="flex items-center gap-1.5 font-cinzel text-[10px]">
                <span className="text-stone-300 font-semibold">DÜDÜK:</span>
                <span className="font-pixel text-[10px] text-amber-400 bg-amber-950/50 px-1 py-0.5 rounded border border-amber-600/40">
                  3🪙 Lazım
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-cinzel text-[10px] font-bold">
                <span className="text-amber-300">DÜDÜK HAZIR</span>
                <kbd className="px-1 py-0.5 rounded bg-stone-900 border border-amber-400/60 text-[9px] font-pixel text-amber-200">
                  Q
                </kbd>
              </div>
            )}
          </div>

          {/* Radio Intercept / Intel Report Button (Sadece akşam ve gece görünür; sabah olunca otomatik kapanır) */}
          {state.radioIntercept?.isActive && (state.timePhase === 'dusk' || state.timePhase === 'night' || state.timePhase === 'midnight') && (
            <button
              onClick={() => onToggleRadio ? onToggleRadio() : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-lg transition-all cursor-pointer select-none active:scale-95 ${
                state.radioIntercept.isDecoded
                  ? 'bg-stone-950/95 border-emerald-500/80 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:bg-emerald-950/40'
                  : 'bg-gradient-to-r from-amber-950/95 via-amber-900/95 to-amber-950/95 border-amber-400 text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.4)] animate-pulse hover:bg-amber-900'
              }`}
              title={
                state.radioIntercept.isDecoded
                  ? 'Çözülmüş istihbarat telgrafını aç [T]'
                  : 'Düşman telsiz sinyali yakalandı! Telsiz masasında çözün [T]'
              }
            >
              <Radio className={`w-3.5 h-3.5 shrink-0 ${state.radioIntercept.isDecoded ? 'text-emerald-400' : 'text-amber-300 animate-spin'}`} />
              {state.radioIntercept.isDecoded && state.radioIntercept.intelReport ? (
                <div className="flex items-center gap-1 font-cinzel text-[10px] font-bold">
                  <span className="text-emerald-400">İSTİHBARAT:</span>
                  <span className="text-emerald-200">
                    {state.radioIntercept.intelReport.flank === 'left' ? 'SOL KANAT' : state.radioIntercept.intelReport.flank === 'right' ? 'SAĞ KANAT' : 'HER İKİ KANAT'}
                  </span>
                  <span className="font-pixel text-[9px] text-emerald-400 bg-emerald-950 px-1 rounded border border-emerald-800">
                    {state.radioIntercept.intelReport.enemyCount} Er
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 font-cinzel text-[10px] font-bold">
                  <span className="text-amber-300">DÜŞMAN TELSİZİ</span>
                  <kbd className="px-1 py-0.5 rounded bg-stone-900 border border-amber-400/60 text-[9px] font-pixel text-amber-200">
                    T
                  </kbd>
                </div>
              )}
            </button>
          )}
        </div>

        {/* Center: Prominent Day Banner, Season Display, Sun/Moon Clock & HQ Health */}
        <div className="flex flex-col items-center pointer-events-auto">
          <div className="bg-stone-950/95 border-2 border-amber-500/80 px-3.5 sm:px-5 py-1.5 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.25)] flex items-center gap-2.5 sm:gap-4">
            {/* Clock Icon Rotate */}
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-500/60 flex items-center justify-center bg-stone-900 overflow-hidden shadow-inner">
              {state.dayProgress >= 0.2 && state.dayProgress <= 0.6 ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-indigo-300" />
              )}
              {/* Radial Progress Needle */}
              <div 
                className="absolute inset-0 border-2 border-transparent border-t-amber-400 rounded-full"
                style={{ transform: `rotate(${state.dayProgress * 360}deg)` }}
              />
            </div>

            <div className="flex flex-col text-center">
              <div className="flex items-center gap-1.5 justify-center">
                <span className="text-sm sm:text-base font-black font-cinzel text-amber-300 tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {state.dayNumber}. GÜN
                </span>
                <span className="text-stone-500 text-xs font-bold">•</span>
                <span className="text-xs sm:text-sm font-bold font-cinzel text-amber-200/90">
                  {seasonLabels[state.season] || 'İlkbahar 1915'}
                </span>
                <span className="text-[10px] sm:text-xs text-amber-500/80 font-cinzel font-semibold hidden sm:inline">
                  ({state.level.daysToWin}g Hedef)
                </span>
              </div>
              <span className={`text-[10px] sm:text-[11px] font-extrabold font-pixel tracking-wider ${currentPhase.color}`}>
                {currentPhase.label}
              </span>
            </div>

            {/* Weather info */}
            <div className="hidden md:flex flex-col border-l border-stone-800 pl-3 text-left">
              <span className="text-[10px] text-stone-200 font-cinzel flex items-center gap-1 font-medium">
                <Wind className="w-3 h-3 text-sky-400" /> {weatherLabels[state.weather] || 'Açık'}
              </span>
            </div>
          </div>

          {/* Karargah Health Bar */}
          <div className="w-40 sm:w-56 mt-1.5 bg-stone-900/90 border border-stone-700/80 rounded-full h-2 overflow-hidden shadow-md">
            <div 
              className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${hqHealthPct * 100}%` }}
              title={`Karargah Canı: ${state.hqHealth} / ${state.maxHqHealth}`}
            />
          </div>
        </div>

        {/* Right: Actions & Menu Buttons + Collected Relics Bar */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          {/* Action & Menu Button Row */}
          <div className="flex items-center gap-1">
            {/* Speed Toggle (1x / 2x) */}
            <button
              onClick={onToggleSpeed}
              className="p-1.5 sm:p-2 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 rounded-lg text-stone-300 hover:text-amber-400 transition shadow active:scale-95 cursor-pointer"
              title="Oyun Hızı (1x / 2x)"
            >
              <FastForward className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${state.speedMultiplier > 1 ? 'text-amber-400 font-bold' : ''}`} />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleMute}
              className="p-1.5 sm:p-2 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 rounded-lg text-stone-300 hover:text-amber-400 transition shadow active:scale-95 cursor-pointer"
              title="Ses Aç/Kapat"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />}
            </button>

            {/* How to Play Guide */}
            {onOpenHelp && (
              <button
                onClick={onOpenHelp}
                className="p-1.5 sm:p-2 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 rounded-lg text-stone-300 hover:text-amber-400 transition shadow active:scale-95 cursor-pointer"
                title="Nasıl Oynanır? (Kumandan Kılavuzu)"
              >
                <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              </button>
            )}

            {/* Historical Codex */}
            <button
              onClick={onOpenCodex}
              className="p-1.5 sm:p-2 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 rounded-lg text-stone-300 hover:text-amber-400 transition shadow active:scale-95"
              title="Tarihi Çanakkale Ansiklopedisi"
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            </button>

            {/* Campaign Map */}
            <button
              onClick={onOpenMap}
              className="p-1.5 sm:p-2 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 rounded-lg text-stone-300 hover:text-amber-400 transition shadow active:scale-95"
              title="Cephe Haritası"
            >
              <Map className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
            </button>

            {/* Main Menu Button */}
            {onOpenMainMenu && (
              <button
                onClick={onOpenMainMenu}
                className="p-1.5 sm:p-2 bg-stone-900/90 hover:bg-amber-950 border border-amber-600/70 rounded-lg text-amber-300 hover:text-amber-200 transition shadow active:scale-95 flex items-center gap-1 font-cinzel text-xs"
                title="Ana Menüye Dön"
              >
                <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span className="hidden md:inline font-bold">MENÜ</span>
              </button>
            )}

            {/* Pause */}
            <button
              onClick={onTogglePause}
              className="p-1.5 sm:p-2 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 rounded-lg text-stone-300 hover:text-amber-400 transition shadow active:scale-95"
              title="Duraklat"
            >
              {state.isPaused ? <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-300" />}
            </button>
          </div>

          {/* Active Collected Relics (Yadigârlar) Display Under Top Right Buttons */}
          {activeRelicDetails.length > 0 && (
            <div className="flex flex-col gap-1 max-w-[280px] sm:max-w-xs items-end">
              <div className="flex items-center gap-1 text-[10px] font-bold font-cinzel text-amber-400/90 px-1">
                <Sparkles className="w-3 h-3 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
                <span>KAZANILAN YADİGÂRLAR</span>
              </div>
              <div className="flex flex-col gap-1 w-full">
                {activeRelicDetails.map((relic) => (
                  <div
                    key={relic.id}
                    className="flex items-center gap-2 bg-stone-950/95 border border-amber-500/60 hover:border-amber-400 px-2 py-1 rounded-lg shadow-lg transition group"
                  >
                    <div className="p-1 bg-amber-950/80 border border-amber-500/50 rounded flex-shrink-0 text-amber-300">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="flex flex-col min-w-0 text-right w-full">
                      <span className="text-[10px] sm:text-[11px] font-bold text-amber-200 font-cinzel leading-tight">
                        {relic.titleTr}
                      </span>
                      <span className="text-[9px] text-stone-300 leading-tight mt-0.5">
                        {relic.descriptionTr}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
