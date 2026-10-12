import React from 'react';
import { ArrowLeft, ArrowRight, Zap, Radio, Trees, Pickaxe, Shield, UserPlus, Sparkles, Hammer } from 'lucide-react';
import { PlayerCommander, SlotType, BuildSlot } from '../types/game';

interface CommanderControlsProps {
  commander: PlayerCommander;
  timePhase: string;
  activeSlot?: BuildSlot | null;
  onMoveLeftStart: () => void;
  onMoveLeftEnd: () => void;
  onMoveRightStart: () => void;
  onMoveRightEnd: () => void;
  onSprintToggle: () => void;
  isSprinting: boolean;
  onInteract?: () => void;
  onWhistle: () => void;
  onNavalStrike?: () => void;
  onAdvanceToNight?: () => void;
  onNavigateToType?: (type: SlotType) => void;
}

export const CommanderControls: React.FC<CommanderControlsProps> = React.memo(({
  commander,
  timePhase: _timePhase,
  activeSlot,
  onMoveLeftStart,
  onMoveLeftEnd,
  onMoveRightStart,
  onMoveRightEnd,
  onSprintToggle,
  isSprinting,
  onInteract,
  onWhistle,
}) => {
  const canWhistle = commander.whistleCooldown <= 0;

  return (
    <div className="absolute inset-x-0 bottom-2 px-3 sm:px-6 flex flex-col items-center gap-2 pointer-events-none z-20 select-none pb-[env(safe-area-inset-bottom,0px)] [contain:layout_style]">
      {/* Main Bottom Control Center: Left movement & Right actions */}
      <div className="w-full flex items-center justify-between pointer-events-none [contain:layout_style]">
        {/* Left Movement Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onMouseDown={onMoveLeftStart}
            onMouseUp={onMoveLeftEnd}
            onMouseLeave={onMoveLeftEnd}
            onTouchStart={onMoveLeftStart}
            onTouchEnd={onMoveLeftEnd}
            onTouchCancel={onMoveLeftEnd}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-stone-900 active:bg-amber-600 hover:border-amber-400 border-2 border-stone-700 rounded-2xl flex flex-col items-center justify-center text-amber-200 shadow-lg active:scale-95"
            title="Sola Sür [A / Sol Ok]"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[8px] font-pixel text-stone-400">A</span>
          </button>

          <button
            onMouseDown={onMoveRightStart}
            onMouseUp={onMoveRightEnd}
            onMouseLeave={onMoveRightEnd}
            onTouchStart={onMoveRightStart}
            onTouchEnd={onMoveRightEnd}
            onTouchCancel={onMoveRightEnd}
            className="w-12 h-12 sm:w-14 sm:h-14 bg-stone-900 active:bg-amber-600 hover:border-amber-400 border-2 border-stone-700 rounded-2xl flex flex-col items-center justify-center text-amber-200 shadow-lg active:scale-95"
            title="Sağa Sür [D / Sağ Ok]"
          >
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[8px] font-pixel text-stone-400">D</span>
          </button>

          {/* Gallop Toggle */}
          <button
            onClick={onSprintToggle}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg active:scale-95 ${
              isSprinting
                ? 'bg-amber-600 border-amber-300 text-stone-950'
                : 'bg-stone-900 border-stone-700 text-amber-400 hover:border-amber-500'
            }`}
            title="Dörtnala Koş [Shift]"
          >
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[7px] font-pixel">SHIFT</span>
          </button>
        </div>

        {/* Center / Right Tactical Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Action / Build / Collect / Cancel Construction Button */}
          {activeSlot && onInteract && (
            <button
              onClick={onInteract}
              className={`px-3 py-1.5 min-h-[42px] sm:min-h-[46px] border rounded-xl flex items-center gap-2 shadow-lg active:scale-95 ${
                activeSlot.underConstruction
                  ? 'bg-rose-950 hover:bg-rose-900 text-rose-100 border-rose-500'
                  : 'bg-stone-950 hover:bg-stone-900 border-amber-500 hover:border-amber-400 text-amber-200'
              }`}
              title={activeSlot.underConstruction ? 'İnşaatı Durdur / İptal Et [E]' : `${activeSlot.titleTr} [E / Boşluk]`}
            >
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-pixel text-[9px] border border-amber-500/50 shadow-inner">
                  E
                </span>
                {activeSlot.underConstruction ? (
                  <span className="text-xs font-cinzel font-bold text-rose-300">
                    İnşaatı İptal Et
                  </span>
                ) : activeSlot.type === 'scavenge_wood' ? (
                  <div className="flex items-center gap-1 text-left">
                    <Trees className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-cinzel font-bold text-amber-200">
                      Ağacı Kes (1🪙)
                    </span>
                  </div>
                ) : activeSlot.type === 'recruit_camp' ? (
                  <div className="flex items-center gap-1 text-left">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-cinzel font-bold text-amber-200">
                      Gönüllü Çağır (2🪙)
                    </span>
                  </div>
                ) : activeSlot.type === 'armory' ? (
                  <div className="flex items-center gap-1 text-left">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-cinzel font-bold text-amber-200">
                      Tüfek Bırak (2🪙)
                    </span>
                  </div>
                ) : activeSlot.type === 'shrine_relic' ? (
                  <div className="flex items-center gap-1 text-left">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-xs font-cinzel font-bold text-amber-200">
                      Yadigârı Aç
                    </span>
                  </div>
                ) : activeSlot.type.startsWith('scavenge_') || activeSlot.type.startsWith('treasure_') ? (
                  <div className="flex items-center gap-1 text-left">
                    <Pickaxe className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-xs font-cinzel font-bold text-amber-200">
                      Topla • {activeSlot.titleTr}
                    </span>
                  </div>
                ) : activeSlot.health < activeSlot.maxHealth && activeSlot.level > 0 ? (
                  <div className="flex items-center gap-1 text-left">
                    <Hammer className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-xs font-cinzel font-bold text-sky-200">
                      Onar • {activeSlot.titleTr} (1🪙)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-left">
                    <Hammer className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-cinzel font-bold text-amber-200">
                      {activeSlot.level === 0 ? 'İnşa Et' : 'Yükselt'} • {activeSlot.titleTr} ({activeSlot.costMecidiye}🪙)
                    </span>
                  </div>
                )}
              </div>
            </button>
          )}

          {/* Whistle Button [Q] (3 Sikke) */}
          <button
            onClick={onWhistle}
            className={`min-h-[42px] sm:min-h-[46px] px-3 rounded-xl border flex items-center gap-2 shadow-lg transition active:scale-95 ${
              canWhistle && commander.mecidiye >= 3
                ? 'bg-amber-950 active:bg-amber-800 border-amber-500/80 text-amber-200 hover:border-amber-400'
                : 'bg-stone-950 border-stone-800 text-stone-500'
            }`}
            title="Taarruz Düdüğü [Q] (3 Sikke) - Neferleri coşturur (+%50 ateş hızı) ve mevzileri destekler."
          >
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-pixel text-[9px] border border-amber-500/40 shadow-inner">
                {canWhistle ? 'Q' : `${Math.ceil(commander.whistleCooldown)}s`}
              </span>
              <Radio className="w-4 h-4 text-amber-400" />
            </div>
            <div className="hidden sm:flex flex-col text-left pr-1">
              <span className="text-[11px] font-cinzel font-bold text-amber-200 leading-tight">TAARRUZ DÜDÜĞÜ</span>
              <span className="text-[9px] font-sans text-stone-400 leading-none">Mehmetçiğe Moral (3 Sikke)</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
});

