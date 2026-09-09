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
  onOpenCodex: () => void;
  onOpenMap: () => void;
  onOpenHelp?: () => void;
  onWhistle: () => void;
  onNavalSupport: () => void;
  onOpenMainMenu?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  state,
  commander,
  slots: _slots,
  isMuted,
  onToggleMute,
  onToggleSpeed,
  onTogglePause,
  onOpenCodex,
  onOpenMap,
  onOpenHelp,
  onWhistle: _onWhistle,
  onNavalSupport: _onNavalSupport,
  onOpenMainMenu,
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
        titleTr: '🇹🇷 57. Alay Şüheda Sancağı',
        descriptionTr: 'Tüm Mehmetçiklerin mermilerini güçlendirir; düşmana %50 daha fazla hasar verdirir ve izli mermi kazandırır.',
      };
    }
    if (id.includes('statue_health')) {
      return {
        id,
        titleTr: '🌙 Hilal-i Ahmer Metanet Yadigârı',
        descriptionTr: 'Bütün Mehmetçiklerin ve kumandanın azami canını %40 artırır ve yaralarını sarar.',
      };
    }
    if (id.includes('statue_defense')) {
      return {
        id,
        titleTr: '🏰 Mecidiye Tabyası İstihkâm Yadigârı',
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
        {/* Left: Kingdom Coin Purse & Commander Vitals */}
        <div className="flex flex-col gap-1.5 pointer-events-auto">
          {/* Mecidiye Coins (Gold Pouch) */}
          <div className="flex items-center gap-2 sm:gap-3 bg-stone-950/90 border border-amber-500/70 px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md">
            <div className="relative flex items-center justify-center">
              <PixelCoinPouch amount={commander.mecidiye} maxAmount={commander.maxMecidiye} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-amber-400/90 font-cinzel leading-none">
                Sikke Kesesi
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
            {commander.activeBuff && (
              <span className="ml-1 text-[9px] font-pixel text-amber-300 bg-amber-950/70 border border-amber-600/60 px-1.5 py-0.5 rounded">
                ⚡{Math.ceil(commander.buffTimer)}s
              </span>
            )}
          </div>
        </div>

        {/* Center: Prominent Day Banner, Season Display, Sun/Moon Clock & HQ Health */}
        <div className="flex flex-col items-center pointer-events-auto">
          <div className="bg-stone-950/95 border-2 border-amber-500/80 px-3.5 sm:px-5 py-1.5 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.25)] flex items-center gap-2.5 sm:gap-4 backdrop-blur-md">
            {/* Clock Icon Rotate */}
            <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-500/60 flex items-center justify-center bg-stone-900 overflow-hidden shadow-inner">
              {state.dayProgress >= 0.2 && state.dayProgress <= 0.6 ? (
                <Sun className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '30s' }} />
              ) : (
                <Moon className="w-5 h-5 text-indigo-300 animate-pulse" />
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
              className="p-1.5 sm:p-2 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 rounded-lg text-stone-300 hover:text-amber-400 transition shadow active:scale-95"
              title="Oyun Hızı (1x / 2x)"
            >
              <FastForward className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${state.speedMultiplier > 1 ? 'text-amber-400 font-bold' : ''}`} />
            </button>

            {/* Sound Toggle */}
            <button
              onClick={onToggleMute}
              className="p-1.5 sm:p-2 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 rounded-lg text-stone-300 hover:text-amber-400 transition shadow active:scale-95"
              title="Ses Aç/Kapat"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />}
            </button>

            {/* How to Play Guide */}
            {onOpenHelp && (
              <button
                onClick={onOpenHelp}
                className="p-1.5 sm:p-2 bg-stone-900/90 hover:bg-stone-800 border border-stone-700 rounded-lg text-stone-300 hover:text-amber-400 transition shadow active:scale-95"
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
                    className="flex items-center gap-2 bg-stone-950/90 border border-amber-500/60 hover:border-amber-400 px-2 py-1 rounded-lg shadow-lg backdrop-blur-md transition group"
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
};
