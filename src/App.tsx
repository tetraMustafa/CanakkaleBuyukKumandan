/**
 * Çanakkale Geçilmez: 1915 - Siper Savunması
 * Kingdom Classic / Two Crowns Style 2D Pixel Art Strategy Defense Game
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './engine/gameLoop';
import { GameRenderer } from './engine/renderer';
import { soundEngine } from './audio/soundEngine';
import { HUD } from './components/HUD';
import { CommanderControls } from './components/CommanderControls';
import { VictoryModal } from './components/VictoryModal';
import { DefeatModal } from './components/DefeatModal';
import { CampaignMap } from './components/CampaignMap';
import { EncyclopediaModal } from './components/EncyclopediaModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { CAMPAIGN_LEVELS } from './data/levels';
import { recordLevelScore } from './utils/storage';
import { Shield, Play, BookOpen, Map, Volume2, VolumeX, Sparkles, HelpCircle, ChevronDown, Radio } from 'lucide-react';

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
  const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('canakkale_unlocked_level');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [showMap, setShowMap] = useState<boolean>(false);
  const [showCodex, setShowCodex] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isObjectivesExpanded, setIsObjectivesExpanded] = useState<boolean>(true);

  // Synced game state for React HUD
  const [, setTick] = useState<number>(0);
  const carriedTroopsRef = useRef<Array<{ role: import('./types/game').Soldier['role']; name?: string }>>([]);

  // Initialize Game Engine
  const startLevel = useCallback((levelIdx: number, troopsToCarry?: Array<{ role: import('./types/game').Soldier['role']; name?: string }>) => {
    soundEngine.resume();
    const troops = troopsToCarry !== undefined ? troopsToCarry : carriedTroopsRef.current;
    const engine = new GameEngine(levelIdx, troops);
    carriedTroopsRef.current = []; // reset after carrying over
    if (canvasRef.current && rendererRef.current) {
      rendererRef.current.resize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
      engine.setViewport(rendererRef.current.getViewWidth(), 600);
    }
    engineRef.current = engine;
    setCurrentLevelIndex(levelIdx);
    setInMainMenu(false);
    setShowMap(false);
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
    let accumulator = 0;
    const FIXED_DT = 1 / 60; // 60 Hz deterministic fixed update step
    let lastHudTick = 0;

    const loop = (currentTime: number) => {
      const frameTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      accumulator += frameTime;

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

          // Fixed time-step simulation to prevent frame tearing, jitter and physics tunneling
          let steps = 0;
          while (accumulator >= FIXED_DT && steps < 5) {
            engine.update(FIXED_DT, moveDir, isSprinting);
            accumulator -= FIXED_DT;
            steps++;
          }
          if (steps >= 5) {
            accumulator = 0; // Prevent spiral of death on background tab focus
          }

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
            frameTime
          );

          // Record high score safely on game over / victory / day changes
          if (engine.state.isGameOver || engine.state.isVictory) {
            recordLevelScore(currentLevelIndex, engine.state.enemiesDefeated, engine.state.dayNumber);
          }

          // Trigger React HUD update (throttled to ~20 FPS so Canvas runs at pure 60-120 FPS)
          if (currentTime - lastHudTick > 45) {
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

  // Window Resize Observer
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && rendererRef.current) {
        const parent = canvasRef.current.parentElement;
        if (parent) {
          const w = parent.clientWidth;
          const h = parent.clientHeight;
          rendererRef.current.resize(w, h);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
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
        setUnlockedLevel(nextIdx);
        localStorage.setItem('canakkale_unlocked_level', nextIdx.toString());
      }

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
    <main className="relative w-screen h-screen bg-stone-950 overflow-hidden select-none font-sans">
      {/* 2D Pixel Canvas */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
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
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-between p-6 bg-stone-950/85 backdrop-blur-sm text-center">
          <div />

          <div className="flex flex-col items-center max-w-xl animate-fade-in">
            {/* Crest Emblem */}
            <div className="w-20 h-20 rounded-3xl bg-amber-950/80 border-2 border-amber-500/80 flex items-center justify-center text-amber-400 shadow-2xl mb-4 relative">
              <Shield className="w-11 h-11" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full border border-stone-950 flex items-center justify-center text-[10px] font-bold text-stone-100">
                1915
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black font-cinzel text-amber-200 tracking-wider uppercase drop-shadow-md mb-2">
              Çanakkale: Büyük Kumandan
            </h1>
            <p className="text-sm sm:text-base font-pixel text-amber-400/90 mb-4 tracking-wide">
              Siper Savunması & Destansı Muharebe
            </p>

            <p className="text-xs sm:text-sm text-stone-300 font-sans leading-relaxed mb-6 bg-stone-900/90 border border-stone-800 p-4 rounded-2xl shadow-inner text-left">
              2D piksel art. Gelibolu yarımadasında komutanınla gündüzleri odun kes, siperler kaz, makineli tüfek yuvaları kur ve Mehmetçik sevk et. Gece bastırdığında ise düşman akınlarına karşı vatanı cansiperane müdafaa et!
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
              <button
                onClick={() => startLevel(unlockedLevel)}
                className="w-full sm:w-auto py-3.5 px-8 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-cinzel font-black text-base shadow-xl flex items-center justify-center gap-2 border border-amber-400 transition active:scale-95"
              >
                <Play className="w-5 h-5 fill-stone-950" />
                <span>Muharebeye Başla</span>
              </button>

              <button
                onClick={() => setShowHelp(true)}
                className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-950/80 to-stone-900 hover:from-amber-900 hover:to-stone-800 text-amber-300 font-cinzel font-bold text-sm border border-amber-500/60 shadow-xl flex items-center justify-center gap-2 transition active:scale-95"
              >
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Nasıl Oynanır?</span>
              </button>

              <button
                onClick={() => setShowMap(true)}
                className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-200 font-cinzel font-bold text-sm border border-stone-700 shadow-xl flex items-center justify-center gap-2 transition"
              >
                <Map className="w-4 h-4 text-sky-400" />
                <span>Cephe Haritası</span>
              </button>

              <button
                onClick={() => setShowCodex(true)}
                className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 text-stone-200 font-cinzel font-bold text-sm border border-stone-700 shadow-xl flex items-center justify-center gap-2 transition"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Tarihi Ansiklopedi</span>
              </button>
            </div>
          </div>

          {/* Controls hint at bottom */}
          <div className="text-[11px] text-stone-400 font-cinzel flex flex-wrap items-center justify-center gap-4 bg-stone-900/60 px-4 py-2 rounded-xl border border-stone-800">
            <span>[A / D / Ok Tuşları]: Komutan Hareketi</span>
            <span>[Shift]: Dörtnala Koş</span>
            <span>[E / Boşluk]: Siper Kaz / İnşa Et</span>
            <span>[Q]: Hücum Düdüğü</span>
            <span>[F]: Sahil Bataryası</span>
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

          {/* Universal Tactical Command Dock */}
          <CommanderControls
            commander={engine.commander}
            timePhase={engine.state.timePhase}
            activeSlot={engine.activeSlotNearCommander}
            onMoveLeftStart={() => {
              touchMoveDir.current = -1;
            }}
            onMoveLeftEnd={() => {
              if (touchMoveDir.current === -1) touchMoveDir.current = 0;
            }}
            onMoveRightStart={() => {
              touchMoveDir.current = 1;
            }}
            onMoveRightEnd={() => {
              if (touchMoveDir.current === 1) touchMoveDir.current = 0;
            }}
            onSprintToggle={() => {
              touchSprinting.current = !touchSprinting.current;
            }}
            isSprinting={touchSprinting.current}
            onInteract={() => {
              if (engine.activeSlotNearCommander) {
                engine.executeSlotAction(engine.activeSlotNearCommander);
              }
            }}
            onWhistle={() => engine.useCommanderWhistle()}
          />

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

      {/* Map, Codex & How-to-Play Modals */}
      {showMap && (
        <CampaignMap
          unlockedLevel={unlockedLevel}
          currentLevelIndex={currentLevelIndex}
          onSelectLevel={(idx) => startLevel(idx)}
          onClose={() => setShowMap(false)}
          onOpenMainMenu={handleReturnToHQ}
        />
      )}

      {showCodex && <EncyclopediaModal onClose={() => setShowCodex(false)} />}

      {showHelp && (
        <HowToPlayModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          onStartGame={inMainMenu ? () => startLevel(unlockedLevel) : undefined}
        />
      )}
    </main>
  );
}
