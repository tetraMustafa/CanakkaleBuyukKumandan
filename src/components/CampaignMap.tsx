import React, { useState } from 'react';
import { CAMPAIGN_LEVELS } from '../data/levels';
import {
  Play,
  X,
  MapPin,
  Lock,
  Trophy,
  Skull,
  Coins,
  Ship,
  Compass,
  CheckCircle2,
  Calendar,
  Crosshair,
  RotateCcw,
  Check,
  ShieldAlert,
  Swords
} from 'lucide-react';
import { getAllHighScores } from '../utils/storage';
import { soundEngine } from '../audio/soundEngine';

interface CampaignMapProps {
  unlockedLevel: number;
  currentLevelIndex: number;
  onSelectLevel: (index: number) => void;
  onConfirmSelectionAndClose?: (index: number) => void;
  onResetCampaign?: () => void;
  onClose: () => void;
  onOpenMainMenu?: () => void;
}

// Geographically accurate Gallipoli Peninsula Sectors (viewBox 0 0 1000 680)
// Staggered banner offsets ensure NO TWO BANNERS ever overlap!
const SECTORS = [
  {
    id: 1,
    levelIndex: 0,
    roman: 'I',
    title: 'SEDDÜLBAHİR',
    subtitle: 'Ertuğrul Koyu & Cape Helles',
    dateStr: '25 Nisan 1915',
    tacticalObjective: 'Boğaz Girişi Müdafaası',
    // Solid Cape Helles landmass at the southern tip
    pinX: 235,
    pinY: 570,
    // Placed westward/upward into open maritime space (never collides with Arıburnu)
    flagOffsetX: -115,
    flagOffsetY: -75,
    territoryPath: 'M 175,615 C 200,560 220,515 260,515 C 295,530 310,580 280,615 C 245,635 200,630 175,615 Z',
    historicalLore: 'Yahya Çavuş ve 67 Mehmetçik, Ertuğrul Koyu\'na çıkan 3.000 kişilik İngiliz tümenini saatlerce durdurdu.'
  },
  {
    id: 2,
    levelIndex: 1,
    roman: 'II',
    title: 'ARIBURNU',
    subtitle: 'Anzac Koyu & Kanlısırt',
    dateStr: '19 Mayıs 1915',
    tacticalObjective: 'Sarp Yarlar ve Siper Savaşı',
    // Solid western coast at Arıburnu headland
    pinX: 320,
    pinY: 395,
    // Placed westward into the Aegean Sea space
    flagOffsetX: -120,
    flagOffsetY: -65,
    territoryPath: 'M 280,430 C 300,390 320,360 360,370 C 375,400 360,435 325,445 C 295,450 285,440 280,430 Z',
    historicalLore: 'Arıburnu sarp yarlarında göğüs göğüse siper savaşları başladı. Kanlısırt şehitleri vatanı cansiperane savundu.'
  },
  {
    id: 3,
    levelIndex: 2,
    roman: 'III',
    title: 'CONKBAYIRI',
    subtitle: '261 Rakımlı Zirve & 57. Alay',
    dateStr: '10 Ağustos 1915',
    tacticalObjective: 'Stratejik Zirve Karşı Taarruzu',
    // High central mountain spine (solidly in the center of the peninsula)
    pinX: 430,
    pinY: 335,
    // Placed EASTWARD towards the wide Dardanelles/Maydos side (completely separated from Arıburnu on the west)
    flagOffsetX: 125,
    flagOffsetY: -45,
    territoryPath: 'M 390,360 C 415,320 445,305 470,320 C 480,345 460,370 425,375 C 405,375 395,370 390,360 Z',
    historicalLore: 'Mustafa Kemal: "Ben size taarruzu emretmiyorum, ölmeyi emrediyorum!" 57. Alay süngü hücumuyla zirveyi geri aldı.'
  },
  {
    id: 4,
    levelIndex: 3,
    roman: 'IV',
    title: 'ANAFARTALAR',
    subtitle: 'Suvla Limanı & Kireçtepe',
    dateStr: '21 Ağustos 1915',
    tacticalObjective: 'Geniş Ova Meydan Muharebesi',
    // Northern Suvla Bay & Anafartalar Plain
    pinX: 485,
    pinY: 205,
    // Placed UPWARD directly above Suvla Bay (well clear of Conkbayırı below)
    flagOffsetX: -20,
    flagOffsetY: -90,
    territoryPath: 'M 420,240 C 450,170 500,140 555,160 C 565,200 540,240 485,250 C 445,255 425,250 420,240 Z',
    historicalLore: 'Anafartalar Grup Komutanı Albay Mustafa Kemal komutasında müttefik ordusu kesin bir hezimete uğratıldı.'
  }
];

export const CampaignMap: React.FC<CampaignMapProps> = ({
  unlockedLevel,
  currentLevelIndex,
  onSelectLevel,
  onConfirmSelectionAndClose,
  onResetCampaign,
  onClose,
  onOpenMainMenu,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    return Math.max(0, Math.min(currentLevelIndex, CAMPAIGN_LEVELS.length - 1));
  });

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const highScores = getAllHighScores();
  const activeLevel = CAMPAIGN_LEVELS[selectedIdx] || CAMPAIGN_LEVELS[0];
  const activeSector = SECTORS[selectedIdx] || SECTORS[0];
  const isSelectedUnlocked = selectedIdx <= unlockedLevel;
  const isSelectedCompleted = selectedIdx < unlockedLevel;
  const activeScore = highScores[activeLevel.id];

  const handleSelectSector = (idx: number) => {
    soundEngine.resume();
    soundEngine.playCoin();
    setSelectedIdx(idx);
  };

  const handleStartMission = (idx: number) => {
    if (idx <= unlockedLevel) {
      soundEngine.resume();
      soundEngine.playBugleCharge();
      onSelectLevel(idx);
    }
  };

  const handleChooseAndReturn = (idx: number) => {
    if (idx <= unlockedLevel && onConfirmSelectionAndClose) {
      soundEngine.resume();
      soundEngine.playCoin();
      onConfirmSelectionAndClose(idx);
    }
  };

  const handleTriggerReset = () => {
    if (onResetCampaign) {
      onResetCampaign();
      setSelectedIdx(0);
      setShowResetConfirm(false);
      soundEngine.playCoin();
    }
  };

  // Sort sectors so the currently selected/hovered sector renders LAST (highest SVG z-layer)
  const renderedSectors = [...SECTORS].sort((a, b) => {
    if (a.levelIndex === selectedIdx) return 1;
    if (b.levelIndex === selectedIdx) return -1;
    if (a.levelIndex === hoveredIdx) return 1;
    if (b.levelIndex === hoveredIdx) return -1;
    return a.levelIndex - b.levelIndex;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-1 sm:p-3 select-none animate-fade-in backdrop-blur-md">
      
      {/* Age of Empires II Style Campaign War Table Modal */}
      <div className="bg-[#140c06] border-4 border-[#854d0e] rounded-2xl max-w-7xl w-full h-[98vh] sm:h-[92vh] shadow-[0_0_80px_rgba(0,0,0,0.98)] relative flex flex-col overflow-hidden text-stone-200">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-[#1c0f05] via-[#331808] to-[#1c0f05] border-b-2 border-amber-600/80 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xl relative z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2a1306] border-2 border-amber-500/90 flex items-center justify-center text-amber-400 shadow-md">
              <Compass className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black font-cinzel text-amber-100 tracking-wider uppercase drop-shadow flex items-center gap-2">
                  <span>ÇANAKKALE 1915</span>
                  <span className="text-amber-500 font-serif">•</span>
                  <span className="text-amber-300">GELİBOLU SEFERİ</span>
                </h1>
                <span className="hidden md:inline-block text-[10px] font-pixel text-yellow-400 bg-black/70 px-2 py-0.5 rounded border border-amber-600/70">
                  HARBİYE NEZÂRETİ HAREKÂT MASASI
                </span>
              </div>
              <p className="text-xs text-amber-300/80 font-serif flex items-center gap-2">
                <span>İlerlemeli Sefer Haritası</span>
                <span className="text-amber-600">•</span>
                <span className="text-emerald-400 font-bold">{unlockedLevel + 1} / 4 Cephe Açık</span>
                <span className="text-amber-600">•</span>
                <span className="text-stone-300">Konumu Seçin ve Muharebeye Girin</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {onResetCampaign && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="px-3 py-1.5 text-xs font-cinzel text-amber-400 hover:text-amber-200 bg-amber-950/70 hover:bg-amber-900 border border-amber-700/70 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow"
                title="Sefer İlerlemesini Sıfırla (Bölüm 1'e Dön)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Seferi Sıfırla</span>
              </button>
            )}

            {onOpenMainMenu && (
              <button
                onClick={onOpenMainMenu}
                className="px-3.5 py-1.5 text-xs font-cinzel font-bold text-amber-300 hover:text-amber-100 bg-[#351908] hover:bg-[#4d240c] border border-amber-600 rounded-xl transition shadow cursor-pointer"
              >
                Karargâh
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-100 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-xl transition cursor-pointer"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Chapter Tabs Ribbon */}
        <div className="bg-[#1b1008] border-b border-amber-900/70 px-3 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
          {SECTORS.map((sector, idx) => {
            const isUnl = idx <= unlockedLevel;
            const isComp = idx < unlockedLevel;
            const isSel = idx === selectedIdx;

            return (
              <button
                key={sector.id}
                onClick={() => handleSelectSector(idx)}
                className={`flex-1 min-w-[130px] sm:min-w-[170px] py-1.5 px-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                  isSel
                    ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-stone-950 border-yellow-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] font-black scale-[1.02]'
                    : isComp
                    ? 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-700/60'
                    : isUnl
                    ? 'bg-[#2b1509] hover:bg-[#3d1e0d] text-amber-200 border-amber-700/70'
                    : 'bg-stone-900/80 hover:bg-stone-800/80 text-stone-500 border-stone-800 opacity-80'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isComp ? (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isSel ? 'bg-stone-950 text-emerald-400' : 'bg-emerald-800 text-white'}`}>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : isUnl ? (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs ${isSel ? 'bg-stone-950 text-amber-400' : 'bg-amber-700 text-stone-950'}`}>
                      {sector.roman}
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-stone-800 flex items-center justify-center text-stone-500">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-cinzel font-bold block leading-tight">
                      {sector.title}
                    </span>
                    <span className={`text-[10px] font-sans ${isSel ? 'text-stone-900 font-semibold' : 'text-stone-400'}`}>
                      {sector.dateStr}
                    </span>
                  </div>
                </div>

                <span className={`text-[9px] font-pixel px-1.5 py-0.5 rounded border ${
                  isSel
                    ? 'bg-stone-950 text-yellow-300 border-stone-800'
                    : isComp
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                    : isUnl
                    ? 'bg-amber-950 text-amber-400 border-amber-700'
                    : 'bg-stone-950 text-stone-600 border-stone-800'
                }`}>
                  {isComp ? 'ZAFER' : isUnl ? 'AÇIK' : 'KİLİTLİ'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Main Map & Strategic Dossier Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* ========================================================================= */}
          {/* 1. AUTHENTIC WIDE GELİBOLU PENINSULA CAMPAIGN MAP (NO SPILLED BORDERS)    */}
          {/* ========================================================================= */}
          <div className="flex-1 relative bg-[#130b05] overflow-hidden flex items-center justify-center p-2 sm:p-4 border-b-2 lg:border-b-0 lg:border-r-2 border-amber-900/70">
            
            <div className="relative w-full h-full max-w-5xl bg-[#cbb685] rounded-2xl shadow-[inset_0_0_80px_rgba(40,20,5,0.6)] border-4 border-[#6d3e09] overflow-hidden flex items-center justify-center">
              
              <svg
                viewBox="0 0 1000 680"
                className="w-full h-full object-contain select-none"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Parchment Background */}
                  <radialGradient id="parchmentLight" cx="50%" cy="45%" r="65%">
                    <stop offset="0%" stopColor="#ede0be" />
                    <stop offset="60%" stopColor="#d8c596" />
                    <stop offset="100%" stopColor="#bfa772" />
                  </radialGradient>

                  {/* Sea Tone */}
                  <linearGradient id="antiqueSea" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#436c7a" />
                    <stop offset="50%" stopColor="#355763" />
                    <stop offset="100%" stopColor="#27434c" />
                  </linearGradient>

                  {/* Wide Gallipoli Landmass Relief Texture */}
                  <linearGradient id="peninsulaRelief" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#d9c79b" />
                    <stop offset="35%" stopColor="#cdb17b" />
                    <stop offset="70%" stopColor="#b89a60" />
                    <stop offset="100%" stopColor="#9e8048" />
                  </linearGradient>

                  {/* Anatolian Coast Gradient */}
                  <linearGradient id="anatoliaRelief" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c5ad77" />
                    <stop offset="100%" stopColor="#967e48" />
                  </linearGradient>

                  {/* Tactical Territory Glow */}
                  <filter id="goldenGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#f59e0b" floodOpacity="0.9" />
                  </filter>

                  {/* Coastline Drop Shadow */}
                  <filter id="coastShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="4" dy="6" stdDeviation="6" floodColor="#181108" floodOpacity="0.55" />
                  </filter>

                  {/* Banner Shadow */}
                  <filter id="bannerShadow" x="-15%" y="-15%" width="130%" height="130%">
                    <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.65" />
                  </filter>
                </defs>

                {/* --- 1. Sea Base --- */}
                <rect width="1000" height="680" fill="url(#antiqueSea)" />

                {/* Nautical Depth Curves */}
                <path d="M 0,160 Q 250,130 520,180 T 1000,140" fill="none" stroke="#5a8b9c" strokeWidth="1.2" strokeDasharray="8,10" opacity="0.45" />
                <path d="M 0,330 Q 300,300 620,340 T 1000,310" fill="none" stroke="#5a8b9c" strokeWidth="1.2" strokeDasharray="8,10" opacity="0.45" />
                <path d="M 0,510 Q 350,480 720,520 T 1000,480" fill="none" stroke="#5a8b9c" strokeWidth="1.2" strokeDasharray="8,10" opacity="0.45" />

                {/* Latitude/Longitude Grid Lines */}
                <line x1="200" y1="0" x2="200" y2="680" stroke="#487585" strokeWidth="0.6" strokeDasharray="5,8" opacity="0.35" />
                <line x1="400" y1="0" x2="400" y2="680" stroke="#487585" strokeWidth="0.6" strokeDasharray="5,8" opacity="0.35" />
                <line x1="600" y1="0" x2="600" y2="680" stroke="#487585" strokeWidth="0.6" strokeDasharray="5,8" opacity="0.35" />
                <line x1="800" y1="0" x2="800" y2="680" stroke="#487585" strokeWidth="0.6" strokeDasharray="5,8" opacity="0.35" />

                {/* --- 2. Anatolian Shore (Opposite Kumkale, Çanakkale City, Lapseki) --- */}
                <path
                  d="M 330,680
                     C 380,640 430,595 500,535
                     C 555,490 610,460 670,425
                     C 740,385 820,340 900,300
                     C 950,275 980,260 1000,250
                     L 1000,680 Z"
                  fill="url(#anatoliaRelief)"
                  stroke="#573811"
                  strokeWidth="3"
                  filter="url(#coastShadow)"
                />

                {/* Anatolian Mountain Ridge */}
                <path d="M 450,660 Q 580,560 740,460 Q 860,380 980,310" fill="none" stroke="#68471b" strokeWidth="8" strokeLinecap="round" opacity="0.25" />

                {/* --- 3. GEOGRAPHICALLY ACCURATE, BROAD GALLIPOLI PENINSULA --- */}
                {/* Generous width: Cape Helles base is 130px wide, Narrows is 180px wide, Anafartalar is 210px wide! */}
                <path
                  d="M 1000,20
                     C 880,35 800,65 720,95
                     C 650,120 590,140 525,170
                     C 475,190 435,215 395,245
                     C 350,285 330,325 305,370
                     C 285,410 270,440 250,475
                     C 225,515 190,560 160,600
                     C 150,615 160,635 185,635
                     C 215,635 250,625 290,595
                     C 340,555 385,510 440,455
                     C 500,395 550,350 610,310
                     C 685,260 775,210 870,165
                     C 930,135 970,115 1000,105 Z"
                  fill="url(#peninsulaRelief)"
                  stroke="#573811"
                  strokeWidth="3.5"
                  filter="url(#coastShadow)"
                />

                {/* Horseshoe indentation of Suvla Bay (Anafartalar Limanı & Tuz Gölü) */}
                <path
                  d="M 435,225 C 455,200 480,215 470,235 C 455,248 430,238 435,225 Z"
                  fill="#355763"
                  stroke="#573811"
                  strokeWidth="1.5"
                  opacity="0.85"
                />

                {/* Gallipoli Mountain Spine (Sarıbayır, Conkbayırı, Kocaçimen, Kireçtepe) */}
                <path
                  d="M 230,560 Q 285,485 345,415 Q 415,340 480,260 Q 560,195 670,135"
                  fill="none"
                  stroke="#68471b"
                  strokeWidth="12"
                  strokeLinecap="round"
                  opacity="0.32"
                />

                {/* Mountain Peak Glyphs */}
                <polygon points="420,330 428,314 436,330" fill="#42290d" stroke="#68471b" strokeWidth="1" />
                <polygon points="440,310 449,293 458,310" fill="#42290d" stroke="#68471b" strokeWidth="1" />
                <polygon points="460,295 469,280 478,295" fill="#42290d" stroke="#68471b" strokeWidth="1" />
                <polygon points="255,525 263,510 271,525" fill="#42290d" stroke="#68471b" strokeWidth="1" />

                {/* Historic Landmark Labels (CLEAN TEXT & BATTLEMENT ICONS - NO CONFUSING CIRCLES!) */}
                {/* Kilitbahir Kalesi (Text & battlement silhouette only) */}
                <g transform="translate(460, 420)">
                  <path d="M -8,0 L -8,-8 L -4,-8 L -4,-4 L 0,-4 L 0,-8 L 4,-8 L 4,-4 L 8,-4 L 8,0 Z" fill="#68471b" />
                  <text x="0" y="14" fill="#3b2308" fontSize="9" fontWeight="bold" fontFamily="serif" textAnchor="middle">🏰 Kilitbahir</text>
                </g>

                {/* Kale-i Sultaniye (Text & battlement silhouette only) */}
                <g transform="translate(565, 470)">
                  <path d="M -8,0 L -8,-8 L -4,-8 L -4,-4 L 0,-4 L 0,-8 L 4,-8 L 4,-4 L 8,-4 L 8,0 Z" fill="#68471b" />
                  <text x="0" y="14" fill="#3b2308" fontSize="9" fontWeight="bold" fontFamily="serif" textAnchor="middle">🏰 Kale-i Sultaniye</text>
                </g>

                {/* Allied Fleet & Minefield on Water */}
                <g transform="translate(100, 410) scale(0.85)">
                  <path d="M -30,0 L 25,0 L 20,8 L -25,8 Z" fill="#24373e" stroke="#10191c" strokeWidth="1" />
                  <rect x="-10" y="-8" width="16" height="8" fill="#364e57" />
                  <line x1="-2" y1="-8" x2="-2" y2="-16" stroke="#10191c" strokeWidth="1.5" />
                  <line x1="12" y1="0" x2="22" y2="-5" stroke="#10191c" strokeWidth="1.5" />
                  <text x="0" y="18" fill="#1b2e36" fontSize="8" fontFamily="monospace" textAnchor="middle">İngiliz Donanması</text>
                </g>

                <g transform="translate(370, 580) scale(0.75)">
                  <path d="M -22,0 L 18,0 L 14,6 L -18,6 Z" fill="#5c1d11" stroke="#3b1109" strokeWidth="1" />
                  <rect x="-6" y="-6" width="10" height="6" fill="#8a2a18" />
                  <line x1="-1" y1="-6" x2="-1" y2="-13" stroke="#f59e0b" strokeWidth="1.5" />
                  <text x="0" y="16" fill="#451a03" fontSize="8" fontWeight="bold" fontFamily="serif" textAnchor="middle">Nusret Mayın Hattı</text>
                </g>

                {/* Tactical Dotted Campaign Route */}
                <path
                  d="M 235,570 Q 285,475 320,395 Q 375,360 430,335 Q 460,265 485,205"
                  fill="none"
                  stroke="#451a03"
                  strokeWidth="5"
                  strokeDasharray="10,10"
                  opacity="0.8"
                />
                <path
                  d="M 235,570 Q 285,475 320,395 Q 375,360 430,335 Q 460,265 485,205"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeDasharray="6,8"
                  opacity="0.95"
                />

                {/* Geographic Sea Labels */}
                <text x="65" y="270" fill="#1b2e36" fontSize="15" fontWeight="900" fontFamily="Cinzel, serif" letterSpacing="4" transform="rotate(-30, 65, 270)">
                  EGE DENİZİ · SAROS KÖRFEZİ
                </text>
                <text x="590" y="440" fill="#1b2e36" fontSize="14" fontWeight="900" fontFamily="Cinzel, serif" letterSpacing="4" transform="rotate(-26, 590, 440)">
                  ÇANAKKALE BOĞAZI
                </text>
                <text x="760" y="580" fill="#38240a" fontSize="13" fontWeight="bold" fontFamily="Cinzel, serif" letterSpacing="2">
                  ANADOLU YAKASI (BİGA YARIMADASI)
                </text>

                {/* Imperial Ottoman Compass Rose */}
                <g transform="translate(85, 85) scale(0.9)">
                  <circle cx="0" cy="0" r="42" fill="#d9c79b" stroke="#573811" strokeWidth="2" />
                  <circle cx="0" cy="0" r="36" fill="none" stroke="#854d0e" strokeWidth="1" strokeDasharray="3,3" />
                  <polygon points="0,-40 6,-9 36,0 6,9 0,40 -6,9 -36,0 -6,-9" fill="#78350f" stroke="#451a03" strokeWidth="1.2" />
                  <polygon points="0,-40 0,-9 36,0 0,0 0,40 0,9 -36,0 0,0" fill="#f59e0b" />
                  <text x="-5" y="-45" fill="#451a03" fontSize="14" fontWeight="black" fontFamily="serif">K</text>
                  <circle cx="0" cy="0" r="4" fill="#451a03" />
                </g>

                {/* Cartouche */}
                <g transform="translate(820, 55)">
                  <rect x="-135" y="-28" width="270" height="56" rx="8" fill="#ebdcb7" stroke="#68471b" strokeWidth="2" filter="url(#bannerShadow)" />
                  <text x="0" y="-6" fill="#3b2308" fontSize="11" fontWeight="bold" fontFamily="Cinzel, serif" textAnchor="middle" letterSpacing="1.5">
                    GELİBOLU MÜDAFAANÂMESİ
                  </text>
                  <text x="0" y="14" fill="#68471b" fontSize="9" fontWeight="bold" fontFamily="serif" textAnchor="middle">
                    1915 Çanakkale Harekât Haritası · 1:50.000
                  </text>
                </g>

                {/* ========================================================================= */}
                {/* 4 PROMINENT NON-OVERLAPPING BATTLEFIELD SANCAKLARI                        */}
                {/* ========================================================================= */}
                {renderedSectors.map((sector) => {
                  const idx = sector.levelIndex;
                  const isUnlocked = idx <= unlockedLevel;
                  const isSelected = idx === selectedIdx;
                  const isHovered = idx === hoveredIdx;
                  const isCompleted = idx < unlockedLevel;

                  return (
                    <g
                      key={sector.id}
                      className="cursor-pointer transition-all duration-200"
                      onClick={() => handleSelectSector(idx)}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {/* 1. Territory Highlight Zone (Restricted inside proper peninsula bounds) */}
                      {(isSelected || isHovered) && (
                        <path
                          d={sector.territoryPath}
                          fill={isCompleted ? '#059669' : isUnlocked ? '#f59e0b' : '#dc2626'}
                          fillOpacity={isSelected ? 0.38 : 0.22}
                          stroke={isCompleted ? '#34d399' : isUnlocked ? '#fbbf24' : '#f87171'}
                          strokeWidth={isSelected ? '3.5' : '2'}
                          strokeDasharray={isSelected ? 'none' : '6,6'}
                          filter="url(#goldenGlow)"
                        />
                      )}

                      {/* 2. Radar Target Rings on the Pin Location */}
                      <g transform={`translate(${sector.pinX}, ${sector.pinY})`}>
                        {isSelected && (
                          <>
                            <circle cx="0" cy="0" r="30" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,6" className="animate-spin-slow" opacity="0.9" />
                            <circle cx="0" cy="0" r="40" fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,6" opacity="0.6" />
                          </>
                        )}

                        {/* Ground Shadow */}
                        <ellipse cx="0" cy="16" rx="18" ry="6" fill="#000000" opacity="0.5" />

                        {/* Central Battle Pin Dial */}
                        <circle
                          cx="0"
                          cy="0"
                          r="17"
                          fill={
                            isSelected
                              ? '#d97706'
                              : isCompleted
                              ? '#047857'
                              : isUnlocked
                              ? '#854d0e'
                              : '#292524'
                          }
                          stroke={
                            isSelected
                              ? '#fef08a'
                              : isCompleted
                              ? '#a7f3d0'
                              : isUnlocked
                              ? '#fde68a'
                              : '#78716c'
                          }
                          strokeWidth={isSelected ? '3.5' : '2'}
                          filter="url(#bannerShadow)"
                        />

                        {/* Inner Ring */}
                        <circle
                          cx="0"
                          cy="0"
                          r="11"
                          fill={
                            isSelected
                              ? '#78350f'
                              : isCompleted
                              ? '#064e3b'
                              : isUnlocked
                              ? '#451a03'
                              : '#1c1917'
                          }
                        />

                        {/* Pin Center Glyph */}
                        {isCompleted ? (
                          <path d="M -5,0 L -2,4 L 6,-4" stroke="#6ee7b7" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                        ) : !isUnlocked ? (
                          <path d="M -3,-1 L 3,-1 L 3,3 L -3,3 Z M -2,-1 L -2,-4 C -2,-5 2,-5 2,-4 L 2,-1" stroke="#cbd5e1" strokeWidth="1.4" fill="none" />
                        ) : (
                          <text x="0" y="4" textAnchor="middle" fill="#fef08a" fontSize="12" fontWeight="black" fontFamily="monospace">
                            {sector.roman}
                          </text>
                        )}
                      </g>

                      {/* 3. PROMINENT NON-OVERLAPPING BATTLE BANNER BADGE */}
                      <g
                        transform={`translate(${sector.pinX + sector.flagOffsetX}, ${sector.pinY + sector.flagOffsetY}) scale(${isSelected ? 1.06 : 1})`}
                        filter="url(#bannerShadow)"
                      >
                        {/* Connecting Line from Banner to Ground Pin */}
                        <line
                          x1={-sector.flagOffsetX}
                          y1={-sector.flagOffsetY}
                          x2="0"
                          y2="28"
                          stroke={isSelected ? '#fbbf24' : '#78350f'}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        {/* Banner Main Plate (156px wide by 62px tall) */}
                        <rect
                          x="-78"
                          y="-31"
                          width="156"
                          height="62"
                          rx="10"
                          fill={
                            isSelected
                              ? 'url(#parchmentLight)'
                              : isCompleted
                              ? '#064e3b'
                              : isUnlocked
                              ? '#291408'
                              : '#1c1917'
                          }
                          stroke={
                            isSelected
                              ? '#d97706'
                              : isCompleted
                              ? '#10b981'
                              : isUnlocked
                              ? '#b45309'
                              : '#57534e'
                          }
                          strokeWidth={isSelected ? '3.5' : '2'}
                        />

                        {/* Inner Border Inset */}
                        <rect
                          x="-74"
                          y="-27"
                          width="148"
                          height="54"
                          rx="7"
                          fill="none"
                          stroke={
                            isSelected
                              ? '#92400e'
                              : isCompleted
                              ? '#047857'
                              : isUnlocked
                              ? '#78350f'
                              : '#44403c'
                          }
                          strokeWidth="1"
                        />

                        {/* Banner Header: Roman Numeral + Date */}
                        <g transform="translate(0, -14)">
                          <rect
                            x="-70"
                            y="-9"
                            width="140"
                            height="16"
                            rx="4"
                            fill={
                              isSelected
                                ? '#451a03'
                                : isCompleted
                                ? '#022c22'
                                : isUnlocked
                                ? '#1a0b04'
                                : '#0c0a09'
                            }
                          />
                          <text
                            x="-62"
                            y="3"
                            fill={isSelected ? '#fde047' : isCompleted ? '#6ee7b7' : isUnlocked ? '#fbbf24' : '#a8a29e'}
                            fontSize="9"
                            fontWeight="900"
                            fontFamily="monospace"
                          >
                            BÖLÜM {sector.roman}
                          </text>
                          <text
                            x="62"
                            y="3"
                            fill={isSelected ? '#fef08a' : '#cbd5e1'}
                            fontSize="8"
                            fontFamily="sans-serif"
                            textAnchor="end"
                          >
                            {sector.dateStr}
                          </text>
                        </g>

                        {/* Big Chapter Title */}
                        <text
                          x="0"
                          y="6"
                          textAnchor="middle"
                          fill={
                            isSelected
                              ? '#291408'
                              : isCompleted
                              ? '#f0fdf4'
                              : isUnlocked
                              ? '#fef08a'
                              : '#a8a29e'
                          }
                          fontSize="13"
                          fontWeight="900"
                          fontFamily="Cinzel, serif"
                          letterSpacing="0.5"
                        >
                          {sector.title}
                        </text>

                        {/* Status Footnote Ribbon */}
                        <g transform="translate(0, 19)">
                          <text
                            x="0"
                            y="0"
                            textAnchor="middle"
                            fill={
                              isSelected
                                ? '#78350f'
                                : isCompleted
                                ? '#a7f3d0'
                                : isUnlocked
                                ? '#fde68a'
                                : '#ef4444'
                            }
                            fontSize="8.5"
                            fontWeight="bold"
                            fontFamily="sans-serif"
                          >
                            {isCompleted
                              ? '✓ ZAFER KAZANILDI'
                              : isUnlocked
                              ? '⚔️ MUHAREBEYE HAZIR'
                              : '🔒 KİLİTLİ CEPHE'}
                          </text>
                        </g>

                        {/* Small Ottoman Crest / Flag Waving On Top */}
                        <g transform="translate(-78, -31)">
                          <circle cx="0" cy="0" r="9" fill="#991b1b" stroke="#f59e0b" strokeWidth="1.5" />
                          <text x="0" y="3" textAnchor="middle" fill="#fef08a" fontSize="8" fontWeight="bold">☪</text>
                        </g>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. STRATEGIC MISSION BRIEFING DOSSIER                                     */}
          {/* ========================================================================= */}
          <div className="w-full lg:w-[420px] bg-gradient-to-b from-[#1b1008] via-[#24150b] to-[#140b04] p-4 sm:p-5 flex flex-col justify-between overflow-y-auto text-left border-t lg:border-t-0 border-amber-900/70 shrink-0">
            
            <div className="flex flex-col gap-3.5">
              
              {/* Header Status & Seal */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-pixel text-amber-300 bg-black/70 border border-amber-600/70 px-2.5 py-1 rounded flex items-center gap-1.5 shadow">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  {activeSector.dateStr}
                </span>

                {isSelectedCompleted ? (
                  <span className="text-xs font-cinzel font-black text-emerald-300 flex items-center gap-1.5 bg-emerald-950/90 px-3 py-1 rounded-lg border-2 border-emerald-500/80 shadow">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> ZAFER KAZANILDI
                  </span>
                ) : isSelectedUnlocked ? (
                  <span className="text-xs font-cinzel font-black text-amber-300 flex items-center gap-1.5 bg-amber-950/90 px-3 py-1 rounded-lg border-2 border-amber-500/80 shadow animate-pulse">
                    <Swords className="w-4 h-4 text-amber-400" /> AÇIK CEPHE
                  </span>
                ) : (
                  <span className="text-xs font-cinzel font-black text-red-400 flex items-center gap-1.5 bg-red-950/90 px-3 py-1 rounded-lg border-2 border-red-700/80 shadow">
                    <Lock className="w-4 h-4 text-red-400" /> KİLİTLİ CEPHE
                  </span>
                )}
              </div>

              {/* Chapter Title Badge */}
              <div className="bg-gradient-to-r from-[#2c160a] to-[#3a1d0d] border-2 border-amber-600/80 rounded-xl p-3.5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2 opacity-15">
                  <span className="text-7xl font-serif font-black text-amber-500">{activeSector.roman}</span>
                </div>
                <div className="text-[11px] font-pixel text-yellow-400 mb-1 flex items-center gap-1.5">
                  <span>BÖLÜM {selectedIdx + 1} / {CAMPAIGN_LEVELS.length}</span>
                  <span className="text-amber-500">•</span>
                  <span>{activeSector.tacticalObjective}</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black font-cinzel text-amber-100 leading-tight drop-shadow">
                  {activeLevel.nameTr}
                </h2>
                <p className="text-xs text-amber-300/90 font-serif font-semibold mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{activeLevel.locationTr}</span>
                </p>
              </div>

              {/* Locked Warning Banner */}
              {!isSelectedUnlocked && (
                <div className="bg-red-950/50 border-2 border-red-700/70 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-200 shadow-md">
                  <Lock className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold font-cinzel block text-red-300 text-sm mb-0.5">
                      Bu Cephenin Kilidi Henüz Kapalı
                    </span>
                    <span className="leading-relaxed">
                      Bu muharebeye taarruz edebilmek için önce <strong>Bölüm {selectedIdx}: {CAMPAIGN_LEVELS[selectedIdx - 1]?.nameTr}</strong> zaferle tamamlanmalıdır.
                    </span>
                  </div>
                </div>
              )}

              {/* Historical Military Order & Lore */}
              <div className="bg-[#241308]/90 border border-amber-900/80 rounded-xl p-3.5 shadow-inner flex flex-col gap-2">
                <div className="text-xs font-cinzel font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-amber-400" />
                  <span>Harekât Emri & Tarihi İstihbarat</span>
                </div>
                
                <p className="text-xs text-stone-200 font-sans leading-relaxed">
                  {activeSector.historicalLore}
                </p>

                {/* Historic Quote */}
                <div className="border-l-3 border-amber-500 pl-3 py-1 bg-amber-950/40 rounded-r text-xs italic text-amber-200 font-serif leading-snug">
                  {activeLevel.loreTr}
                </div>
              </div>

              {/* Tactical Objectives Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-stone-900/90 border border-amber-900/60 rounded-xl p-2.5 flex flex-col justify-between shadow">
                  <span className="text-[10px] text-stone-400 font-cinzel">Müdafaa Hedefi</span>
                  <span className="text-sm font-black font-cinzel text-amber-300 flex items-center gap-1.5 mt-1">
                    🛡️ {activeLevel.daysToWin} Gün Savunma
                  </span>
                </div>

                <div className="bg-stone-900/90 border border-amber-900/60 rounded-xl p-2.5 flex flex-col justify-between shadow">
                  <span className="text-[10px] text-stone-400 font-cinzel">Başlangıç Sandığı</span>
                  <span className="text-sm font-black font-pixel text-yellow-400 flex items-center gap-1.5 mt-1">
                    <Coins className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    {activeLevel.startingMecidiye} Sikke
                  </span>
                </div>

                <div className="bg-stone-900/90 border border-amber-900/60 rounded-xl p-2.5 flex flex-col justify-between col-span-2 shadow">
                  <span className="text-[10px] text-stone-400 font-cinzel">Ağır Sahil Bataryası & Donanma Desteği</span>
                  <span className={`text-xs font-bold font-cinzel flex items-center gap-1.5 mt-1 ${activeLevel.navalSupportAllowed ? 'text-sky-400' : 'text-stone-500'}`}>
                    <Ship className="w-4 h-4" />
                    {activeLevel.navalSupportAllowed ? 'Mevcut (F Tuşu ile Ağır Topçu Ateşi)' : 'Mevcut Değil (Siper Savunması)'}
                  </span>
                </div>
              </div>

              {/* Best High Score Badge */}
              {activeScore && activeScore.maxEnemiesDefeated > 0 && (
                <div className="p-2.5 bg-amber-950/80 border border-amber-600/60 rounded-xl flex items-center justify-between text-xs font-cinzel shadow">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Rekor Zafer:</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-200 font-bold">
                    <span className="flex items-center gap-1 text-red-300 font-mono">
                      <Skull className="w-3.5 h-3.5 text-red-400" /> {activeScore.maxEnemiesDefeated} İtlaf
                    </span>
                    <span className="text-amber-300 text-[11px]">
                      (Gün {activeScore.bestDay})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Primary Actions */}
            <div className="mt-4 pt-3 border-t border-amber-900/70 flex flex-col gap-2.5">
              {isSelectedUnlocked ? (
                <>
                  <button
                    onClick={() => handleStartMission(selectedIdx)}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-cinzel font-black text-sm sm:text-base shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2.5 border-2 border-yellow-300 transition active:scale-95 cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-stone-950" />
                    <span>BU CEPHEDE MUHAREBEYE BAŞLA</span>
                  </button>

                  {onConfirmSelectionAndClose && (
                    <button
                      onClick={() => handleChooseAndReturn(selectedIdx)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#311809] hover:bg-[#47220c] text-amber-200 font-cinzel font-bold text-xs border border-amber-600/70 transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
                    >
                      <Check className="w-4 h-4 text-amber-400" />
                      <span>Aktif Cephe Olarak Seç ve Menüye Dön</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full py-4 px-4 rounded-xl bg-stone-900/90 border-2 border-stone-800 text-stone-500 font-cinzel font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1.5 shadow">
                  <div className="flex items-center gap-2 text-red-400 font-bold">
                    <Lock className="w-4 h-4 text-red-400" />
                    <span>KİLİTLİ CEPHE (GİRİLEMEZ)</span>
                  </div>
                  <span className="text-[11px] text-stone-400 font-sans">
                    Önceki bölümleri zaferle tamamlamalısınız
                  </span>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="bg-[#1c1209] border-2 border-red-700 rounded-2xl max-w-md w-full p-5 text-stone-200 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-red-400 font-cinzel font-bold text-base">
              <ShieldAlert className="w-6 h-6 text-red-500" />
              <span>Sefer İlerlemesini Sıfırla</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed font-sans">
              Tüm cephe kilitleri sıfırlanacak ve sefer baştan (<strong>1. Bölüm: Seddülbahir & Ertuğrul Koyu</strong>) başlayacaktır. Bu işlem geri alınamaz. Emin misiniz?
            </p>
            <div className="flex items-center justify-end gap-3 mt-1">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-cinzel cursor-pointer font-bold"
              >
                Vazgeç
              </button>
              <button
                onClick={handleTriggerReset}
                className="px-4 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-cinzel font-black transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Sıfırla ve Baştan Başla</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
