/**
 * Çanakkale Geçilmez: 1915 - Siper Savunması
 * Kingdom Classic / Two Crowns Style 2D Pixel Art Strategy Defense Game
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './engine/gameLoop';
import { GameRenderer } from './engine/renderer';
import { soundEngine } from './audio/soundEngine';
import { HUD } from './components/HUD';
import { VictoryModal } from './components/VictoryModal';
import { DefeatModal } from './components/DefeatModal';
import { CampaignMap } from './components/CampaignMap';
import { EncyclopediaModal } from './components/EncyclopediaModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { LevelLoadingScreen } from './components/LevelLoadingScreen';
import { RadioTelegraphModal } from './components/RadioTelegraphModal';
import { CAMPAIGN_LEVELS } from './data/levels';
import {
  recordLevelScore,
  getUnlockedLevel,
  setUnlockedLevel as setStoredUnlockedLevel,
  getSelectedLevel,
  setSelectedLevel as setStoredSelectedLevel,
  resetCampaignProgress,
  hasSeenChapter1Tutorial,
  setSeenChapter1Tutorial
} from './utils/storage';
import { Shield, Play, BookOpen, Map, Volume2, VolumeX, Sparkles, HelpCircle, ChevronDown, ChevronLeft, ChevronRight, Radio, RotateCcw } from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Keyboard input state
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const touchMoveDir = useRef<number>(0);
  const touchSprinting = useRef<boolean>(false);

  // React states for UI synchronization
  const [inMainMenu, setInMainMenu] = useState<boolean>(true);
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const [unlockedLevel, setUnlockedLevelState] = useState<number>(() => getUnlockedLevel());
  const [selectedLevelIndex, setSelectedLevelIndex] = useState<number>(() => getSelectedLevel());

  const [showMap, setShowMap] = useState<boolean>(false);
  const [showCodex, setShowCodex] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isObjectivesExpanded, setIsObjectivesExpanded] = useState<boolean>(true);
  const [isLoadingLevel, setIsLoadingLevel] = useState<boolean>(false);
  const [pendingLevelIndex, setPendingLevelIndex] = useState<number>(0);

  // Synced game state for React HUD
  const [, setTick] = useState<number>(0);
  const carriedTroopsRef = useRef<Array<{ role: import('./types/game').Soldier['role']; name?: string }>>([]);

  // Initialize Game Engine with Full Level Pre-Baking
  const startLevel = useCallback((levelIdx: number, troopsToCarry?: Array<{ role: import('./types/game').Soldier['role']; name?: string }>) => {
    soundEngine.resume();
    soundEngine.stopMenuMusic();
    const troops = troopsToCarry !== undefined ? troopsToCarry : carriedTroopsRef.current;
    const engine = new GameEngine(levelIdx, troops);
    carriedTroopsRef.current = []; // reset after carrying over
    
    // Canvas & Sprite Preloading
    if (canvasRef.current) {
      if (!rendererRef.current) {
        rendererRef.current = new GameRenderer(canvasRef.current);
      }
      rendererRef.current.resize(canvasRef.current.clientWidth || 1200, canvasRef.current.clientHeight || 600);
      rendererRef.current.preloadLevelAssets();
      engine.setViewport(rendererRef.current.getViewWidth(), 600);
    }
    
    engineRef.current = engine;
    setCurrentLevelIndex(levelIdx);
    setSelectedLevelIndex(levelIdx);
    setStoredSelectedLevel(levelIdx);
    setPendingLevelIndex(levelIdx);
    setIsLoadingLevel(true);
    setInMainMenu(false);
    setShowMap(false);
  }, []);

  // Main Menu Music: Calm, flowing historic theme loaded once from audio folder
  useEffect(() => {
    if (inMainMenu) {
      soundEngine.playMenuMusic();
    } else {
      soundEngine.stopMenuMusic();
    }
  }, [inMainMenu]);

  const handleLevelLoaded = useCallback(() => {
    setIsLoadingLevel(false);
    if (canvasRef.current && rendererRef.current && engineRef.current) {
      rendererRef.current.preloadLevelAssets();
      engineRef.current.setViewport(rendererRef.current.getViewWidth(), 600);
    }
    soundEngine.playMusic('day');
  }, []);

  // Main Loop
  useEffect(() => {
    if (inMainMenu) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!rendererRef.current) {
      rendererRef.current = new GameRenderer(canvas);
    }

    if (canvas.parentElement) {
      rendererRef.current.resize(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight);
    }

    let lastTime = performance.now();
    let lastHudTick = 0;

    const loop = (currentTime: number) => {
      // Delta time between VSync animation frames (capped to 50ms to prevent huge jumps on tab switch)
      const frameTime = Math.min((currentTime - lastTime) / 1000, 0.05);
      lastTime = currentTime;
      const dt = Math.max(0.001, frameTime);

      try {
        const engine = engineRef.current;
        const renderer = rendererRef.current;

        if (engine && renderer) {
          engine.setViewport(renderer.getViewWidth(), 600);

          // Calculate move direction from keys + touch
          const goLeft = Boolean(keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA'] || keysPressed.current['a']);
          const goRight = Boolean(keysPressed.current['ArrowRight'] || keysPressed.current['KeyD'] || keysPressed.current['d']);
          let moveDir = (goRight ? 1 : 0) - (goLeft ? 1 : 0);
          if (moveDir === 0 && touchMoveDir.current !== 0) {
            moveDir = touchMoveDir.current;
          }

          const isSprinting = Boolean(
            (keysPressed.current['ShiftLeft'] ||
            keysPressed.current['ShiftRight'] ||
            keysPressed.current['shift'] ||
            touchSprinting.current) && moveDir !== 0
          );

          // VSync synchronized smooth frame update (eliminates judder, screen tearing and horse galloping stutter)
          engine.update(dt, moveDir, isSprinting);

          // Render Canvas (VSync synchronized via requestAnimationFrame)
          renderer.render(
            engine.state,
            engine.commander,
            engine.slots,
            engine.soldiers,
            engine.enemies,
            engine.projectiles,
            engine.particles,
            engine.floatingTexts,
            engine.activeSlotNearCommander,
            engine.groundCoins,
            engine.animals,
            engine.landingCamps,
            dt
          );

          // Record high score safely on game over / victory / day changes
          if (engine.state.isGameOver || engine.state.isVictory) {
            recordLevelScore(currentLevelIndex, engine.state.enemiesDefeated, engine.state.dayNumber);
          }

          // Trigger React HUD update (throttled to ~12 FPS so Canvas runs at pure, unhindered 60-120 FPS)
          if (currentTime - lastHudTick > 80) {
            lastHudTick = currentTime;
            setTick(currentTime);
          }
        }
      } catch (err) {
        console.error('Game loop step error:', err);
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [inMainMenu]);

  // Window Resize & Responsive Layout Observer
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && rendererRef.current) {
        const parent = canvasRef.current.parentElement;
        const w = parent ? parent.clientWidth : window.innerWidth;
        const h = parent ? parent.clientHeight : window.innerHeight;
        if (w > 0 && h > 0) {
          rendererRef.current.resize(w, h);
          if (engineRef.current) {
            engineRef.current.setViewport(rendererRef.current.getViewWidth(), 600);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Modern ResizeObserver for flawless reactive resizing (handles macOS dock, Safari bars, iframe, fullscreen)
    let resizeObserver: ResizeObserver | null = null;
    if (canvasRef.current && canvasRef.current.parentElement && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(canvasRef.current.parentElement);
    }

    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  // Keyboard Event Handlers & Sticky Keys Prevention
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      soundEngine.resume();
      keysPressed.current[e.code] = true;
      if (e.key) {
        keysPressed.current[e.key.toLowerCase()] = true;
      }

      const engine = engineRef.current;
      if (!engine) return;

      // Cancel automatic click-destination when player manually moves
      if (
        e.code === 'KeyA' || e.code === 'KeyD' ||
        e.code === 'ArrowLeft' || e.code === 'ArrowRight'
      ) {
        engine.commander.targetDestinationX = null;
        engine.commander.targetSlotId = null;
      }

      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'KeyS' || e.code === 'ArrowDown') {
        engine.isHoldingInteract = true;
        if (engine.sendAssaultSquadToOtherCamp()) {
          return;
        }
        if (engine.activeSlotNearCommander) {
          engine.executeSlotAction(engine.activeSlotNearCommander);
        }
      }

      if (e.code === 'KeyQ') {
        engine.useCommanderWhistle();
      }

      if (e.code === 'KeyF') {
        engine.callNavalFireSupport();
      }

      if (e.code === 'KeyT') {
        engine.toggleRadioTelegraph();
      }

      if (e.code === 'KeyM') {
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        soundEngine.setMuted(nextMute);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      delete keysPressed.current[e.code];
      if (e.key) {
        delete keysPressed.current[e.key];
        delete keysPressed.current[e.key.toLowerCase()];
        delete keysPressed.current[e.key.toUpperCase()];
      }

      // Explicitly clear directional and sprint keys to prevent sticky keys on Shift combinations
      if (e.code === 'KeyA' || e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        delete keysPressed.current['KeyA'];
        delete keysPressed.current['ArrowLeft'];
        delete keysPressed.current['a'];
        delete keysPressed.current['A'];
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        delete keysPressed.current['KeyD'];
        delete keysPressed.current['ArrowRight'];
        delete keysPressed.current['d'];
        delete keysPressed.current['D'];
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') {
        delete keysPressed.current['ShiftLeft'];
        delete keysPressed.current['ShiftRight'];
        delete keysPressed.current['Shift'];
      }

      const engine = engineRef.current;
      if (engine && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'KeyS' || e.code === 'ArrowDown')) {
        engine.isHoldingInteract = false;
      }
    };

    const handleWindowBlur = () => {
      // Clear all pressed keys on window or iframe blur/focus change
      keysPressed.current = {};
      touchMoveDir.current = 0;
      touchSprinting.current = false;
      const engine = engineRef.current;
      if (engine) {
        engine.isHoldingInteract = false;
        engine.commander.vx = 0;
        engine.commander.isSprinting = false;
        engine.commander.state = 'idle';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowBlur);
    };
  }, [isMuted]);

  // Handle Victory Next Level
  const handleNextLevel = () => {
    const nextIdx = currentLevelIndex + 1;
    if (nextIdx < CAMPAIGN_LEVELS.length) {
      if (nextIdx > unlockedLevel) {
        setStoredUnlockedLevel(nextIdx);
        setUnlockedLevelState(nextIdx);
      }
      setStoredSelectedLevel(nextIdx);
      setSelectedLevelIndex(nextIdx);

      // Calculate surviving veteran troops to carry over (Kingdom Two Crowns style)
      let carried: Array<{ role: import('./types/game').Soldier['role']; name?: string }> = [];
      const engine = engineRef.current;
      if (engine) {
        const aliveSoldiers = engine.soldiers.filter((s) => s.health > 0);
        // Quota based on campaign difficulty: Level 1 -> 3 troops, Level 2 -> 4 troops, Level 3+ -> 5 troops
        const maxCarry = Math.min(5, 2 + Math.floor(currentLevelIndex * 1.1));
        const sorted = [...aliveSoldiers].sort((a, b) => {
          const scoreA = (a.isRetinue ? 10 : 0) + (a.role === 'infantry' ? 5 : (a.role === 'medic' ? 3 : 1));
          const scoreB = (b.isRetinue ? 10 : 0) + (b.role === 'infantry' ? 5 : (b.role === 'medic' ? 3 : 1));
          return scoreB - scoreA;
        });
        carried = sorted.slice(0, maxCarry).map((s) => ({ role: s.role, name: s.name }));
      }

      startLevel(nextIdx, carried);
    } else {
      setInMainMenu(true);
      setShowMap(true);
    }
  };

  const handleSelectCampaignLevel = (level: number) => {
    const valid = Math.max(0, Math.min(level, unlockedLevel));
    setStoredSelectedLevel(valid);
    setSelectedLevelIndex(valid);
  };

  const handleResetCampaign = () => {
    resetCampaignProgress();
    setUnlockedLevelState(0);
    setSelectedLevelIndex(0);
  };

  const handleRestartLevel = () => {
    startLevel(currentLevelIndex);
  };

  const handleReturnToHQ = () => {
    soundEngine.stopMusic();
    setInMainMenu(true);
  };

  // Canvas Click / Pointer Handling for Instant Point-and-Click Movement & Build
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    const renderer = rendererRef.current;
    if (!engine || !renderer) return;

    soundEngine.resume();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = renderer.getViewWidth() / rect.width;
    const clickScreenX = (e.clientX - rect.left) * scaleX;
    const worldX = clickScreenX + engine.state.cameraX;

    // Check if clicked near an interactive build slot
    let clickedSlot = null;
    let closestDist = 80;
    for (const slot of engine.slots) {
      const dist = Math.abs(slot.x - worldX);
      if (dist < closestDist) {
        closestDist = dist;
        clickedSlot = slot;
      }
    }

    if (clickedSlot) {
      engine.setTargetDestination(clickedSlot.x, clickedSlot.id);
      engine.addFloatingText(clickedSlot.x, 380, `🎯 ${clickedSlot.titleTr}`, '#38bdf8');
    } else {
      engine.setTargetDestination(worldX, null);
    }
  };

  const engine = engineRef.current;

  // Objective Checklist calculation
  const woodHarvested = engine ? engine.slots.filter((s) => s.type === 'scavenge_wood' && s.isScavenged).length : 0;
  const trenchesBuilt = engine ? engine.slots.filter((s) => s.type === 'trench' && s.level > 0).length : 0;
  const soldiersRecruited = engine ? engine.soldiers.length : 0;

  return (
    <main className="fixed inset-0 w-full h-full bg-stone-950 overflow-hidden select-none font-sans">
      {/* 2D Pixel Canvas */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          className="w-full h-full block image-rendering-pixelated cursor-pointer"
        />
      </div>

      {/* Atmospheric Scanlines & Vignette */}
      <div className="crt-overlay absolute inset-0 pointer-events-none z-10 opacity-30" />
      <div className="vignette-overlay absolute inset-0 pointer-events-none z-10 opacity-60" />

      {/* Main Menu Screen */}
      {inMainMenu && (
        <div
          onClick={() => {
            soundEngine.resume();
            if (inMainMenu) soundEngine.playMenuMusic();
          }}
          className="absolute inset-0 z-40 flex flex-col items-center justify-between p-3 sm:p-6 bg-stone-950/90 backdrop-blur-md text-center overflow-y-auto select-none"
        >
          {/* Top Bar inside Menu */}
          <div className="w-full max-w-2xl flex items-center justify-between text-xs font-cinzel text-stone-400 py-1">
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-bold">🇹🇷</span>
              <span className="font-semibold text-amber-200/90 tracking-wider text-[11px] sm:text-xs">
                GELİBOLU 1915 • DESTANSI MÜDAFAA
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                onClick={() => {
                  const nextMute = !isMuted;
                  setIsMuted(nextMute);
                  soundEngine.setMuted(nextMute);
                }}
                className="p-2 sm:px-3 rounded-xl bg-stone-900/90 hover:bg-stone-800 text-amber-400 hover:text-amber-300 border border-stone-800 transition active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-cinzel"
                title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span className="hidden sm:inline text-[11px] text-stone-300">{isMuted ? 'Ses Kapalı' : 'Ses Açık'}</span>
              </button>

              {/* Reset Campaign */}
              {unlockedLevel > 0 && (
                <button
                  onClick={handleResetCampaign}
                  className="px-2.5 py-2 rounded-xl bg-stone-900/90 hover:bg-red-950/80 text-stone-400 hover:text-red-300 text-xs border border-stone-800 transition active:scale-95 cursor-pointer flex items-center gap-1"
                  title="Sefer İlerlemesini Sıfırla (Bölüm 1'e Dön)"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                  <span className="hidden sm:inline text-[11px]">Sıfırla</span>
                </button>
              )}
            </div>
          </div>

          {/* Central War Council Panel */}
          <div className="flex flex-col items-center max-w-2xl w-full my-auto py-2 sm:py-3 animate-fade-in">
            {/* Crest Emblem */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-amber-900/90 via-stone-900 to-amber-950/90 border-2 border-amber-500/80 flex items-center justify-center text-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.25)] mb-3 relative">
              <Shield className="w-9 h-9 sm:w-11 sm:h-11" />
              <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-gradient-to-r from-red-600 to-red-700 rounded-full border border-stone-950 flex items-center justify-center text-[10px] font-black font-cinzel text-stone-100 shadow">
                1915
              </div>
            </div>

            <h1 className="text-2xl sm:text-5xl font-black font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-amber-300 tracking-wider uppercase drop-shadow-md mb-1">
              Çanakkale: Büyük Kumandan
            </h1>
            <p className="text-xs sm:text-sm font-pixel text-amber-400/90 mb-3 tracking-widest flex items-center gap-2 justify-center">
              <span>⚔️</span>
              <span>Siper Savunması & Kahramanlık Destanı</span>
              <span>⚔️</span>
            </p>

            <p className="text-xs sm:text-[13px] text-stone-300 font-sans leading-relaxed mb-4 bg-stone-900/80 border border-stone-800/80 p-3 sm:p-3.5 rounded-2xl shadow-inner text-center max-w-xl">
              Gelibolu yarımadasında komutanınla gündüzleri odun kes, siperler kaz, makineli tüfek yuvaları kur ve Mehmetçik sevk et. Gece bastırdığında ise düşman akınlarına karşı vatanı cansiperane müdafaa et!
            </p>

            {/* Currently Active / Selected Chapter Banner with Integrated Chapter Switcher */}
            {(() => {
              const activeChapter = CAMPAIGN_LEVELS[selectedLevelIndex] || CAMPAIGN_LEVELS[0];
              const isCompleted = selectedLevelIndex < unlockedLevel;
              const hasPrev = selectedLevelIndex > 0;
              const hasNext = selectedLevelIndex < unlockedLevel && selectedLevelIndex < CAMPAIGN_LEVELS.length - 1;

              return (
                <div className="w-full bg-gradient-to-r from-[#2a170d]/95 via-[#3d2011]/95 to-[#2a170d]/95 border-2 border-amber-600/70 rounded-2xl p-3.5 sm:p-4 mb-4 shadow-2xl flex flex-col gap-2.5 sm:gap-3 text-left">
                  {/* Top Bar of Chapter Card */}
                  <div className="flex items-center justify-between gap-2 border-b border-amber-800/50 pb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-pixel text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-amber-500/50">
                        BÖLÜM {selectedLevelIndex + 1} / {CAMPAIGN_LEVELS.length}
                      </span>
                      <span className="text-[10px] font-pixel text-amber-200/80">
                        {activeChapter.historicalDateTr}
                      </span>
                      {isCompleted && (
                        <span className="text-[10px] font-cinzel font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-600/50">
                          ✓ Zafer Kazanıldı
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] font-pixel text-amber-400/80 shrink-0">
                      ({unlockedLevel + 1}/{CAMPAIGN_LEVELS.length} Cephe Açık)
                    </span>
                  </div>

                  {/* Chapter Main Details & Navigation Arrows */}
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <button
                      onClick={() => {
                        if (hasPrev) {
                          const prev = selectedLevelIndex - 1;
                          setSelectedLevelIndex(prev);
                          setStoredSelectedLevel(prev);
                          soundEngine.playCoin();
                        }
                      }}
                      disabled={!hasPrev}
                      className={`p-2 sm:px-3 sm:py-2.5 rounded-xl border flex items-center gap-1 font-cinzel font-bold text-xs transition cursor-pointer shrink-0 ${
                        hasPrev
                          ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-600/80 text-amber-200 active:scale-95'
                          : 'bg-stone-900/50 border-stone-800 text-stone-600 cursor-not-allowed'
                      }`}
                      title={hasPrev ? 'Önceki Cepheye Geç' : 'İlk Cephedesiniz'}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Önceki</span>
                    </button>

                    <div className="flex-1 text-center sm:text-left px-1">
                      <h3 className="text-sm sm:text-base font-bold font-cinzel text-amber-100">
                        {activeChapter.nameTr}
                      </h3>
                      <p className="text-[11px] text-amber-300/90 font-serif mt-0.5">
                        📍 {activeChapter.locationTr} • <span className="text-amber-400 font-semibold">Hedef: {activeChapter.daysToWin} Gün Savunma</span>
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (hasNext) {
                          const next = selectedLevelIndex + 1;
                          setSelectedLevelIndex(next);
                          setStoredSelectedLevel(next);
                          soundEngine.playCoin();
                        }
                      }}
                      disabled={!hasNext}
                      className={`p-2 sm:px-3 sm:py-2.5 rounded-xl border flex items-center gap-1 font-cinzel font-bold text-xs transition cursor-pointer shrink-0 ${
                        hasNext
                          ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-600/80 text-amber-200 active:scale-95'
                          : 'bg-stone-900/50 border-stone-800 text-stone-600 cursor-not-allowed'
                      }`}
                      title={hasNext ? 'Sonraki Cepheye Geç' : 'Henüz Açılmadı'}
                    >
                      <span className="hidden sm:inline">Sonraki</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons Section */}
            <div className="w-full flex flex-col gap-2.5 sm:gap-3">
              {/* Primary Call to Action: Start Battle */}
              <button
                onClick={() => startLevel(selectedLevelIndex)}
                className="w-full py-3.5 sm:py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-cinzel font-black text-base sm:text-lg shadow-[0_0_25px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2.5 border-2 border-amber-300 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-5 h-5 fill-stone-950" />
                <span>MUHAREBEYE BAŞLA (BÖLÜM {selectedLevelIndex + 1})</span>
              </button>

              {/* Secondary Actions: 3-column equal-size balanced grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 w-full">
                <button
                  onClick={() => setShowMap(true)}
                  className="py-2.5 sm:py-3 px-3 rounded-xl bg-gradient-to-r from-stone-900 to-stone-800 hover:from-amber-950/80 hover:to-stone-800 text-amber-300 font-cinzel font-bold text-xs sm:text-sm border border-amber-600/50 hover:border-amber-400 shadow-lg flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Map className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Bölüm Haritası</span>
                </button>

                <button
                  onClick={() => setShowHelp(true)}
                  className="py-2.5 sm:py-3 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-amber-200 font-cinzel font-bold text-xs sm:text-sm border border-stone-700/80 hover:border-amber-500/50 shadow-lg flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Nasıl Oynanır?</span>
                </button>

                <button
                  onClick={() => setShowCodex(true)}
                  className="py-2.5 sm:py-3 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 hover:text-amber-200 font-cinzel font-bold text-xs sm:text-sm border border-stone-700/80 hover:border-amber-500/50 shadow-lg flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Ansiklopedi</span>
                </button>
              </div>
            </div>
          </div>

          {/* Controls hint at bottom */}
          <div className="text-[11px] text-stone-400 font-cinzel flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 bg-stone-900/70 px-3 sm:px-4 py-2 rounded-xl border border-stone-800 max-w-2xl w-full">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-amber-300 border border-stone-700">A / D</kbd>
              <span>Komutan</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-amber-300 border border-stone-700">Shift</kbd>
              <span>Dörtnala</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-amber-300 border border-stone-700">E / Boşluk</kbd>
              <span>Siper & İnşa</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-amber-300 border border-stone-700">Q</kbd>
              <span>Taarruz Düdüğü</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-amber-300 border border-stone-700">F</kbd>
              <span>Sahil Topu</span>
            </span>
          </div>
        </div>
      )}

      {/* Active Game HUD and Interactive Prompts */}
      {!inMainMenu && engine && (
        <>
          <HUD
            state={engine.state}
            commander={engine.commander}
            slots={engine.slots}
            isMuted={isMuted}
            onToggleMute={() => {
              const nextMute = !isMuted;
              setIsMuted(nextMute);
              soundEngine.setMuted(nextMute);
            }}
            onToggleSpeed={() => {
              engine.state.speedMultiplier = engine.state.speedMultiplier === 1 ? 2 : 1;
            }}
            onTogglePause={() => {
              engine.state.isPaused = !engine.state.isPaused;
            }}
            onOpenCodex={() => setShowCodex(true)}
            onOpenMap={() => setShowMap(true)}
            onOpenHelp={() => setShowHelp(true)}
            onWhistle={() => engine.useCommanderWhistle()}
            onNavalSupport={() => engine.callNavalFireSupport()}
            onOpenMainMenu={handleReturnToHQ}
            onToggleRadio={() => engine.toggleRadioTelegraph()}
          />

          {/* Tactical Left Column: Daily Front Orders (Collapsible, Auto-hides when 3/3 complete) + Whistle Notification / Countdown */}
          <div className="absolute top-18 left-3 z-20 pointer-events-auto flex flex-col gap-2 max-w-xs text-left hidden sm:flex">
            {/* Collapsible Daily Front Orders */}
            {((woodHarvested > 0 ? 1 : 0) + (trenchesBuilt > 0 ? 1 : 0) + (soldiersRecruited >= 3 ? 1 : 0)) < 3 && (
              <div className="bg-stone-950/92 border border-stone-800 rounded-xl shadow-xl backdrop-blur-md overflow-hidden transition-all duration-200">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsObjectivesExpanded((prev) => !prev)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setIsObjectivesExpanded((prev) => !prev);
                    }
                  }}
                  className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-stone-900/60 transition-colors select-none"
                  title={isObjectivesExpanded ? 'Cephe Emirlerini Küçült' : 'Cephe Emirlerini Aç'}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-bold font-cinzel text-amber-300">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>GÜNLÜK CEPHE EMİRLERİ</span>
                    <span className="text-[9px] font-mono text-stone-400 ml-1">
                      ({(woodHarvested > 0 ? 1 : 0) + (trenchesBuilt > 0 ? 1 : 0) + (soldiersRecruited >= 3 ? 1 : 0)}/3)
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-stone-400 hover:text-amber-300">
                    <span className="text-[9px] font-cinzel text-stone-400">
                      {isObjectivesExpanded ? 'Küçült' : 'Göster'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isObjectivesExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {isObjectivesExpanded && (
                  <div className="px-3 pb-2 pt-0.5 flex flex-col gap-1 text-[10px] font-sans text-stone-300 border-t border-stone-800/70">
                    <div className="flex items-center gap-1.5">
                      <span className={woodHarvested > 0 ? 'text-emerald-400 font-bold' : 'text-stone-500'}>
                        {woodHarvested > 0 ? '✓' : '○'}
                      </span>
                      <span>Çam ağaçlarını kes & Odun topla ({woodHarvested})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={trenchesBuilt > 0 ? 'text-emerald-400 font-bold' : 'text-stone-500'}>
                        {trenchesBuilt > 0 ? '✓' : '○'}
                      </span>
                      <span>Sağ/Sol Siperleri kaz & tahkim et ({trenchesBuilt})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={soldiersRecruited >= 3 ? 'text-emerald-400 font-bold' : 'text-stone-500'}>
                        {soldiersRecruited >= 3 ? '✓' : '○'}
                      </span>
                      <span>İskeleden Mehmetçik sevk et ({soldiersRecruited} er)</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Taarruz Düdüğü Bildirimi ve Geri Sayımı - Yalnızca Aktifken (buff veya dolum) Görünür */}
            {(engine.commander.activeBuff || engine.commander.whistleCooldown > 0) && (
              <div className={`border rounded-xl shadow-xl backdrop-blur-md px-3 py-2 transition-all duration-200 ${
                engine.commander.activeBuff
                  ? 'bg-amber-950/90 border-amber-500/80 shadow-amber-900/30 ring-1 ring-amber-500/40'
                  : 'bg-stone-950/90 border-stone-800'
              }`}>
                {engine.commander.activeBuff ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-amber-300 font-cinzel font-bold text-[11px]">
                        <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>📯 TAARRUZ DÜDÜĞÜ AKTİF!</span>
                      </div>
                      <span className="font-pixel text-[10px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/50">
                        {Math.ceil(engine.commander.buffTimer)}s
                      </span>
                    </div>
                    <div className="text-[9.5px] text-amber-200/90 font-sans leading-tight">
                      Mehmetçik hücumda: <span className="text-amber-300 font-semibold">+%50 Ateş Hızı & Süngü Hücumu</span>
                    </div>
                    <div className="w-full bg-stone-900/90 rounded-full h-1.5 mt-1.5 overflow-hidden border border-amber-800/40">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-100"
                        style={{ width: `${Math.min(100, (engine.commander.buffTimer / 8) * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 text-stone-300 font-cinzel font-bold text-[11px]">
                        <Radio className="w-3.5 h-3.5 text-stone-500" />
                        <span>⏳ DÜDÜK YENİDEN DOLUMU</span>
                      </div>
                      <span className="font-pixel text-[10px] text-stone-300 font-bold bg-stone-900 px-1.5 py-0.5 rounded border border-stone-700">
                        {Math.ceil(engine.commander.whistleCooldown)}s
                      </span>
                    </div>
                    <div className="text-[9.5px] text-stone-400 font-sans leading-tight">
                      Subay nefesleniyor, yeni taarruz emri için bekleniyor.
                    </div>
                    <div className="w-full bg-stone-900 rounded-full h-1.5 mt-1.5 overflow-hidden border border-stone-800">
                      <div
                        className="h-full bg-sky-500/80 transition-all duration-100"
                        style={{ width: `${Math.min(100, ((15 - engine.commander.whistleCooldown) / 15) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Victory Modal */}
          {engine.state.isVictory && (
            <VictoryModal
              state={engine.state}
              hasNextLevel={currentLevelIndex < CAMPAIGN_LEVELS.length - 1}
              onNextLevel={handleNextLevel}
              onRestartLevel={handleRestartLevel}
              onReturnToHQ={handleReturnToHQ}
            />
          )}

          {/* Defeat Modal */}
          {engine.state.isGameOver && (
            <DefeatModal
              state={engine.state}
              onRestartLevel={handleRestartLevel}
              onReturnToHQ={handleReturnToHQ}
            />
          )}
        </>
      )}

      {/* Level Pre-loading Screen with Historical Briefing */}
      {isLoadingLevel && (
        <LevelLoadingScreen
          levelIndex={pendingLevelIndex}
          onLoaded={handleLevelLoaded}
        />
      )}

      {/* Map, Codex & How-to-Play Modals */}
      {showMap && (
        <CampaignMap
          unlockedLevel={unlockedLevel}
          currentLevelIndex={selectedLevelIndex}
          onSelectLevel={(idx) => startLevel(idx)}
          onConfirmSelectionAndClose={(idx) => {
            handleSelectCampaignLevel(idx);
            setShowMap(false);
          }}
          onResetCampaign={handleResetCampaign}
          onClose={() => setShowMap(false)}
          onOpenMainMenu={handleReturnToHQ}
        />
      )}

      {showCodex && <EncyclopediaModal onClose={() => setShowCodex(false)} />}

      {showHelp && (
        <HowToPlayModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          onStartGame={inMainMenu ? () => startLevel(selectedLevelIndex) : undefined}
        />
      )}

      {/* Field Wireless Telegraph & Cipher Decoder Modal */}
      {engine && engine.state.radioIntercept?.isOpenUI && (
        <RadioTelegraphModal
          radioState={engine.state.radioIntercept}
          onClose={() => engine.toggleRadioTelegraph(false)}
          onTuneFrequency={(freq) => engine.tuneRadioFrequency(freq)}
          onDecodeSuccess={() => engine.decodeRadioSignal()}
        />
      )}
    </main>
  );
}
