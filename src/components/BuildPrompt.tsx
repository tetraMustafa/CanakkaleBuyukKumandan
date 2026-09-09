import React from 'react';
import { BuildSlot, PlayerCommander } from '../types/game';
import { Coins, Trees, ShieldAlert, Hammer, Sparkles, Wrench, UserPlus, Axe, Pickaxe } from 'lucide-react';

interface BuildPromptProps {
  slot: BuildSlot | null;
  commander: PlayerCommander;
  onInteract: () => void;
  onStartHold: () => void;
  onEndHold: () => void;
}

export const BuildPrompt: React.FC<BuildPromptProps> = ({
  slot,
  commander,
  onInteract,
  onStartHold,
  onEndHold,
}) => {
  if (!slot) return null;

  const canAfford =
    commander.mecidiye >= slot.costMecidiye &&
    commander.timber >= slot.costTimber &&
    commander.iron >= slot.costIron;

  const isRelic = slot.type === 'shrine_relic';
  const isWood = slot.type === 'scavenge_wood';
  const isIron = slot.type === 'scavenge_iron';
  const isRecruit = slot.type === 'recruit_camp';
  const isAssault = slot.type === 'assault_banner';
  const isHQ = slot.type === 'headquarters';
  const isWildHorse = slot.type === 'wild_horse';
  const isTetheredHorse = slot.type === 'tethered_horse';
  const isDamaged = slot.health < slot.maxHealth && slot.level > 0;
  const isMaxLevel = slot.level >= slot.maxLevel;

  let actionTitle = 'İnşa Et / Yükselt';
  let actionIcon = <Hammer className="w-4 h-4 text-amber-400" />;

  if (isRelic) {
    actionTitle = slot.relicClaimed ? 'Yadigâr Alındı' : 'Tarihi Yadigârı Al';
    actionIcon = <Sparkles className="w-4 h-4 text-amber-300" />;
  } else if (isWood) {
    actionTitle = slot.isScavenged ? 'Orman Kesildi' : 'Çam Ağacını Kes (+6 Odun)';
    actionIcon = <Axe className="w-4 h-4 text-emerald-400" />;
  } else if (isIron) {
    actionTitle = slot.isScavenged ? 'Maden Kazıldı' : 'Hurdayı/Madeni Kaz (+5 Demir)';
    actionIcon = <Pickaxe className="w-4 h-4 text-sky-400" />;
  } else if (isRecruit) {
    actionTitle = 'Gönüllü Mehmetçik Çağır (2 Sikke)';
    actionIcon = <UserPlus className="w-4 h-4 text-emerald-400" />;
  } else if (isAssault) {
    actionTitle = `${slot.side === 'left' ? 'Sol' : 'Sağ'} Hücum Akıncısı Donat (4 Sikke)`;
    actionIcon = <UserPlus className="w-4 h-4 text-amber-400" />;
  } else if (isHQ && isMaxLevel) {
    actionTitle = 'Sol veya Sağ Sancaktan Taarruz Akıncısı Donat';
    actionIcon = <Sparkles className="w-4 h-4 text-amber-400" />;
  } else if (isWildHorse) {
    const nameMap = { brown: 'Kahverengi Yağız At (Aşırı Hızlı)', black: 'Siyah Karayel At (Yüksek Dayanıklı)', white: 'Aydınlık Kır At (Dengeli)' };
    const horseName = nameMap[slot.horseType || 'brown'];
    actionTitle = `${horseName} Evcilleştir (7 Sikke)`;
    actionIcon = <Sparkles className="w-4 h-4 text-amber-400" />;
  } else if (isTetheredHorse) {
    actionTitle = 'Eski Ata Tekrar Bin (4 Sikke)';
    actionIcon = <Sparkles className="w-4 h-4 text-amber-400" />;
  }

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-bounce-short">
      <div className="bg-stone-950/95 border-2 border-amber-600/80 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col items-center gap-2 min-w-[280px] max-w-[420px] text-center">
        {/* Title & Level */}
        <div className="flex items-center gap-2">
          {actionIcon}
          <span className="text-sm font-bold font-cinzel text-amber-200">
            {slot.titleTr}
          </span>
          {slot.maxLevel > 1 && (
            <span className="text-[10px] bg-amber-950/80 border border-amber-500/60 text-amber-300 px-1.5 py-0.5 rounded font-pixel">
              Sv. {slot.level} / {slot.maxLevel}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-stone-300 font-sans leading-snug">
          {isDamaged
            ? '🛡️ Mevzi hasarlı! Gündüz boştaki neferler çekiçle otomatik tamir edecektir.'
            : isHQ && isMaxLevel
            ? '🏰 Karargah Azami Seviyede! Sağ ve Sol taraftaki sancaklara gidip 4 sikke yatırarak Hücum Akıncısı çıkartabilirsiniz (Azami 5 nefer).'
            : slot.upgradeDescription}
        </p>

        {/* Cost Matrix (Kingdom coin drop style) */}
        {!isRelic && !isWood && !isIron && (!isMaxLevel || isRecruit || isAssault || isWildHorse || isTetheredHorse) && (
          <div className="flex items-center justify-center gap-3 bg-stone-900/80 border border-stone-800 px-3 py-1 rounded-lg">
            {slot.costMecidiye > 0 && (
              <div className={`flex items-center gap-1 text-xs font-pixel ${commander.mecidiye >= slot.costMecidiye ? 'text-amber-400' : 'text-red-400'}`}>
                <Coins className="w-3.5 h-3.5" />
                <span>{slot.costMecidiye}</span>
              </div>
            )}
            {slot.costTimber > 0 && (
              <div className={`flex items-center gap-1 text-xs font-pixel ${commander.timber >= slot.costTimber ? 'text-emerald-400' : 'text-red-400'}`}>
                <Trees className="w-3.5 h-3.5" />
                <span>{slot.costTimber}</span>
              </div>
            )}
            {slot.costIron > 0 && (
              <div className={`flex items-center gap-1 text-xs font-pixel ${commander.iron >= slot.costIron ? 'text-sky-400' : 'text-red-400'}`}>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{slot.costIron}</span>
              </div>
            )}
          </div>
        )}

        {/* Interactive Action Button */}
        {(!isMaxLevel || isRelic || isWood || isIron || isRecruit || isAssault || isWildHorse || isTetheredHorse) && (
          <button
            onClick={onInteract}
            onMouseDown={onStartHold}
            onMouseUp={onEndHold}
            onTouchStart={onStartHold}
            onTouchEnd={onEndHold}
            disabled={!canAfford && !isRelic && !isWood && !isIron}
            className={`w-full py-2 px-4 rounded-xl font-cinzel font-bold text-xs shadow-md transition flex items-center justify-center gap-2 ${
              canAfford || isRelic || isWood || isIron
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 border border-amber-400 active:scale-95'
                : 'bg-stone-900 border border-stone-800 text-stone-500 cursor-not-allowed'
            }`}
          >
            <span>[E] / Dokun: {actionTitle}</span>
          </button>
        )}
      </div>
    </div>
  );
};
