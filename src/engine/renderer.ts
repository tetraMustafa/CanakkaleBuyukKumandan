/**
 * Çanakkale 1915 - 2D Pixel Art Canvas Renderer & Lighting Engine
 * Kingdom Classic / Two Crowns inspired aesthetics with dynamic lighting and parallax
 */

import {
  BuildSlot,
  Enemy,
  FieldArtillery,
  FloatingText,
  GameState,
  GroundCoin,
  LandingCamp,
  Particle,
  PlayerCommander,
  Projectile,
  Soldier,
  StoneLetter,
  WildAnimal
} from '../types/game';

export class GameRenderer {
  public static readonly VIRTUAL_HEIGHT = 600;
  public static readonly GROUND_Y = 440;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private width: number = 1200;
  private height: number = 600;
  private groundY: number = 440;
  private animTimer: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.lightCanvas = document.createElement('canvas');
    this.lightCtx = this.lightCanvas.getContext('2d')!;
    this.resize(canvas.clientWidth || 1200, canvas.clientHeight || 600);
  }

  public getViewWidth(): number {
    return this.width;
  }

  public getGroundY(): number {
    return this.groundY;
  }

  public resize(clientWidth: number, clientHeight: number) {
    const cHeight = clientHeight > 0 ? clientHeight : 600;
    const cWidth = clientWidth > 0 ? clientWidth : 1200;
    const aspect = cWidth / cHeight;

    this.height = GameRenderer.VIRTUAL_HEIGHT; // Always locked to 600
    this.width = Math.round(GameRenderer.VIRTUAL_HEIGHT * aspect);
    this.width = Math.max(960, Math.min(1800, this.width));

    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.lightCanvas.width = this.width;
    this.lightCanvas.height = this.height;
    this.groundY = GameRenderer.GROUND_Y; // Fixed 440
  }

  public render(
    state: GameState,
    commander: PlayerCommander,
    slots: BuildSlot[],
    soldiers: Soldier[],
    enemies: Enemy[],
    projectiles: Projectile[],
    particles: Particle[],
    floatingTexts: FloatingText[],
    activeSlotNearCommander: BuildSlot | null,
    groundCoins: GroundCoin[] = [],
    animals: WildAnimal[] = [],
    landingCamps: LandingCamp[] = [],
    frameDt: number = 0.016
  ) {
    this.animTimer += Math.min(0.06, frameDt * 3.0);
    const ctx = this.ctx;
    // Round camera coordinate to exact whole integer to eliminate sub-pixel antialiasing jitter & tearing during movement
    const camX = Math.round(state.cameraX);

    // 1. Draw Sky & Parallax Backgrounds
    this.drawSkyAndParallax(state, camX);

    // 2. Draw Distant Battlefield & Straits (Çanakkale Boğazı & Battleships)
    this.drawStraitsAndHills(state, camX);

    // 3. Draw Terrain & Ground (Dirt layers, geological strata, beach & foaming sea water)
    this.drawTerrain(state, camX, slots);

    // 4. Dynamic Forest Backdrop (Kingdom Two Crowns style - wilderness canopy & background timber)
    this.drawForestBackdrop(slots, camX, state);

    // 5. Forest Grass & Steppe Vegetation Layer (Drawn over forest backdrop so grass is crisply visible)
    this.drawForestGrass(state, camX, slots);

    // Draw Target Destination Marker (if commander has clicked to move)
    if (commander.targetDestinationX !== null) {
      this.drawDestinationMarker(commander.targetDestinationX - camX);
    }

    // 6. Draw Build Slots & Fortifications (Trenches, Wire, MG nests, Artillery, HQ, Chests)
    this.drawBuildSlots(slots, camX, activeSlotNearCommander);

    // 6.5 Foreground Grass & Wild Poppies (Extra depth over trenches & ground edge)
    this.drawForegroundGrass(state, camX, slots);

    // 7. Draw Coastal Landing Barges / Inland Fortified Bunker
    if (landingCamps && landingCamps.length > 0) {
      this.drawLandingCamps(landingCamps, camX, state);
    }

    // 8. Draw Wild Animals (Gelibolu Karacası, Tavşanlar, Keklikler)
    this.drawAnimals(animals, camX);

    // 9. Draw Ground Coins (Kingdom style dropped coins)
    this.drawGroundCoins(groundCoins, camX);

    // 10. Draw Soldiers (Mehmetçik)
    this.drawSoldiers(soldiers, camX, slots);

    // 10.25 Draw Field Artillery (75mm Krupp Sahra Topu)
    this.drawFieldArtilleries(state.fieldArtilleries || [], camX);

    // 10.5 Draw Trench Front Parapets (Sandbags, Timber Wall, Stone Wall in FRONT of soldiers)
    this.drawTrenchFrontParapets(slots, camX, soldiers);

    // 11. Draw Enemies (Anzac / British)
    this.drawEnemies(enemies, camX);

    // 11.5 Ancient Monolithic Stone Title ("ÇANAKKALE") - In front of everything except the Commander!
    if (state.stoneTitleEnabled !== false && state.stoneLetters && state.stoneLetters.length > 0) {
      this.drawStoneTitle(state.stoneLetters, camX);
    }

    // 12. Draw Player Commander
    this.drawCommander(commander, camX, state);

    // 13. Draw Projectiles (Bullets, Artillery, Grenades, Flares)
    this.drawProjectiles(projectiles, camX, state);

    // 14. Draw Particles (Sparks, Smoke, Blood, Debris, Weather)
    this.drawParticles(particles, camX);

    // 15. Draw Water Reflection (Kingdom Two Crowns style lower river/sea reflection)
    this.drawWaterReflection(camX, state);

    // 16. Dynamic Lighting Layer (Night darkness, lantern, campfires, flares, searchlights)
    this.drawLighting(state, commander, slots, projectiles, particles, camX, landingCamps);

    // 17. Floating Numbers and Prompt Highlights
    this.drawFloatingTexts(floatingTexts, camX);
  }

  // --- Parallax & Environment Rendering Helpers ---

  private hexToRgb(color: string): [number, number, number] {
    if (!color || typeof color !== 'string') return [0, 0, 0];
    const trimmed = color.trim();
    if (trimmed.startsWith('rgb')) {
      const match = trimmed.match(/\d+(\.\d+)?/g);
      if (match && match.length >= 3) {
        return [
          Math.max(0, Math.min(255, Math.round(parseFloat(match[0]) || 0))),
          Math.max(0, Math.min(255, Math.round(parseFloat(match[1]) || 0))),
          Math.max(0, Math.min(255, Math.round(parseFloat(match[2]) || 0))),
        ];
      }
    }
    const clean = trimmed.replace(/[^0-9a-fA-F]/g, '');
    if (clean.length === 3) {
      return [
        parseInt(clean[0] + clean[0], 16) || 0,
        parseInt(clean[1] + clean[1], 16) || 0,
        parseInt(clean[2] + clean[2], 16) || 0,
      ];
    }
    if (clean.length >= 6) {
      return [
        parseInt(clean.substring(0, 2), 16) || 0,
        parseInt(clean.substring(2, 4), 16) || 0,
        parseInt(clean.substring(4, 6), 16) || 0,
      ];
    }
    return [0, 0, 0];
  }

  private lerpColor(c1: string, c2: string, t: number): string {
    const clampedT = Math.max(0, Math.min(1, isNaN(t) ? 0 : t));
    const [r1, g1, b1] = this.hexToRgb(c1);
    const [r2, g2, b2] = this.hexToRgb(c2);
    const r = Math.round((isNaN(r1) ? 0 : r1) + ((isNaN(r2) ? 0 : r2) - (isNaN(r1) ? 0 : r1)) * clampedT);
    const g = Math.round((isNaN(g1) ? 0 : g1) + ((isNaN(g2) ? 0 : g2) - (isNaN(g1) ? 0 : g1)) * clampedT);
    const b = Math.round((isNaN(b1) ? 0 : b1) + ((isNaN(b2) ? 0 : b2) - (isNaN(b1) ? 0 : b1)) * clampedT);
    return `rgb(${Math.max(0, Math.min(255, isNaN(r) ? 0 : r))},${Math.max(0, Math.min(255, isNaN(g) ? 0 : g))},${Math.max(0, Math.min(255, isNaN(b) ? 0 : b))})`;
  }

  // --- Kingdom Two Crowns Style Smooth Day/Night & Celestial Arc Engine ---

  private drawSkyAndParallax(state: GameState, camX: number) {
    const ctx = this.ctx;
    const p = Math.max(0, Math.min(1, state.dayProgress || 0)); // 0..1

    // 1. Continuous Multi-Keyframe Color Interpolation (Gradual dawn, golden hour, dusk, midnight, pre-dawn)
    const skyKeyframes = [
      { p: 0.00, top: '#080c1e', mid: '#1e1b4b', bot: '#4c1d95' }, // Pre-Dawn / Sabaha Karşı (Derin Mavi/Mor Fecir)
      { p: 0.06, top: '#1e1b4b', mid: '#831843', bot: '#c2410c' }, // Fecir Işıltısı (Kızıllık Başlangıcı)
      { p: 0.12, top: '#1e3a8a', mid: '#b45309', bot: '#f59e0b' }, // Şafak Vakti / Golden Dawn (Altın Işık)
      { p: 0.20, top: '#0284c7', mid: '#38bdf8', bot: '#fed7aa' }, // Gündoğumu (Aydınlık Sabah Başlangıcı)
      { p: 0.32, top: '#0284c7', mid: '#7dd3fc', bot: '#bae6fd' }, // Tam Sabah (Ferah Çanakkale Göğü)
      { p: 0.48, top: '#0369a1', mid: '#38bdf8', bot: '#e0f2fe' }, // Öğle Vakti (Pırıl Pırıl Güneş)
      { p: 0.60, top: '#0284c7', mid: '#60a5fa', bot: '#fef08a' }, // İkindi Vakti (Ilık Öğleden Sonra)
      { p: 0.68, top: '#1e3a8a', mid: '#d97706', bot: '#fde047' }, // Akşamüstü / Golden Hour (Altın Sarısı Hüzmeler)
      { p: 0.74, top: '#3b0764', mid: '#991b1b', bot: '#ea580c' }, // Günbatımı / Gurup (Kızıl Akşamüstü)
      { p: 0.80, top: '#0f172a', mid: '#312e81', bot: '#6366f1' }, // Alacakaranlık / Twilight (Mor Akşam Havası)
      { p: 0.86, top: '#020617', mid: '#090d16', bot: '#1e1b4b' }, // Gece Başlangıcı (Yıldızlı Gece)
      { p: 0.94, top: '#020617', mid: '#070a13', bot: '#0f172a' }, // Gece Yarısı / Midnight (Karanlık Muharebe)
      { p: 1.00, top: '#080c1e', mid: '#1e1b4b', bot: '#4c1d95' }, // Sabaha Karşı Döngüsü
    ];

    let idx = 0;
    for (let i = 0; i < skyKeyframes.length - 1; i++) {
      if (p >= skyKeyframes[i].p && p <= skyKeyframes[i + 1].p) {
        idx = i;
        break;
      }
    }
    const k1 = skyKeyframes[idx];
    const k2 = skyKeyframes[idx + 1] || skyKeyframes[idx];
    const span = Math.max(0.0001, (k2.p - k1.p));
    // Smooth cosine/hermite interpolation between keyframes for fluid non-linear color blending
    const rawT = Math.max(0, Math.min(1, (p - k1.p) / span));
    const segT = rawT * rawT * (3 - 2 * rawT);

    let curTop = this.lerpColor(k1.top, k2.top, segT);
    let curMid = this.lerpColor(k1.mid, k2.mid, segT);
    let curBot = this.lerpColor(k1.bot, k2.bot, segT);

    // Weather Storm Overcast modification (safe string interpolation)
    if (state.weather === 'rain' || state.weather === 'storm') {
      curTop = this.lerpColor(curTop, '#1e293b', 0.65);
      curMid = this.lerpColor(curMid, '#334155', 0.65);
      curBot = this.lerpColor(curBot, '#64748b', 0.65);
    }

    // Sky Linear Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.groundY);
    skyGrad.addColorStop(0, curTop);
    skyGrad.addColorStop(0.55, curMid);
    skyGrad.addColorStop(1, curBot);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.groundY);

    // 2. Kingdom Two Crowns Style Slow, Majestic Sun Trajectory (0.00 <= p <= 0.76)
    if (p <= 0.76) {
      const sunProgress = Math.min(1, Math.max(0, p / 0.74));
      // Steady horizontal sweep across the wide sky:
      const sunX = (this.width * 0.08) + sunProgress * (this.width * 0.84) - (camX * 0.015);
      // Parabolic smooth altitude curve (rises smoothly, hangs at zenith at noon, sets smoothly at dusk):
      const sunHeightCurve = 4 * sunProgress * (1 - sunProgress);
      const sunPeakHeight = this.groundY * 0.74;
      const sunY = (this.groundY - 14) - (sunHeightCurve * sunPeakHeight);

      if (sunY < this.groundY + 30) {
        ctx.save();

        // Atmospheric Warm Halo
        const isHorizonSun = sunProgress < 0.18 || sunProgress > 0.82;
        const sunRadius = isHorizonSun ? 18 : 15;
        const haloRadius = isHorizonSun ? 95 : 65;

        const sunAura = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, haloRadius);
        if (isHorizonSun) {
          sunAura.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
          sunAura.addColorStop(0.3, 'rgba(249, 115, 22, 0.5)');
          sunAura.addColorStop(0.7, 'rgba(220, 38, 38, 0.2)');
          sunAura.addColorStop(1, 'rgba(220, 38, 38, 0)');
        } else {
          sunAura.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          sunAura.addColorStop(0.25, 'rgba(254, 240, 138, 0.6)');
          sunAura.addColorStop(0.65, 'rgba(250, 204, 21, 0.2)');
          sunAura.addColorStop(1, 'rgba(250, 204, 21, 0)');
        }

        ctx.fillStyle = sunAura;
        ctx.beginPath();
        ctx.arc(sunX, sunY, haloRadius, 0, Math.PI * 2);
        ctx.fill();

        // Glowing Sun Core Disc
        ctx.fillStyle = isHorizonSun ? '#fed7aa' : '#ffffff';
        ctx.shadowColor = isHorizonSun ? '#ea580c' : '#fef08a';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
        ctx.fill();

        // Volumetric Sun Rays during Sunrise / Sunset (Gurup ve Şafak Işıkları)
        if (isHorizonSun && state.weather !== 'rain' && state.weather !== 'storm') {
          ctx.save();
          ctx.translate(sunX, sunY);
          const rayAlpha = Math.sin(this.animTimer * 0.8) * 0.05 + 0.12;
          for (let r = 0; r < 6; r++) {
            const angle = (r * Math.PI) / 5 + 0.15;
            ctx.fillStyle = `rgba(254, 240, 138, ${rayAlpha})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle - 0.08) * 280, Math.sin(angle - 0.08) * 280);
            ctx.lineTo(Math.cos(angle + 0.08) * 280, Math.sin(angle + 0.08) * 280);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }

        ctx.restore();
      }
    }

    // 3. Kingdom Two Crowns Style Slow, Majestic Moon Trajectory & Stars (0.74 <= p <= 1.00)
    // Smooth, uninterrupted continuous arc across the night without any skips or jumps
    if (p >= 0.74) {
      const moonProgress = Math.min(1, Math.max(0, (p - 0.74) / 0.26));
      
      // Steady horizontal sweep across the night sky from left to right:
      const moonX = (this.width * 0.08) + moonProgress * (this.width * 0.84) - (camX * 0.015);
      
      // True sinusoidal altitude arc rising from horizon (p=0.74), peaking at midnight (p=0.87), and sinking smoothly below ground at dawn (p=1.00):
      const moonSin = Math.sin(moonProgress * Math.PI);
      const moonPeakHeight = this.groundY * 0.72;
      const moonY = (this.groundY + 28) - (moonSin * moonPeakHeight);

      // Smooth sinusoidal alpha:
      let moonAlpha = Math.sin(moonProgress * Math.PI);
      if (moonProgress < 0.12) {
        moonAlpha = Math.min(1.0, moonProgress / 0.12);
      } else if (moonProgress > 0.88) {
        moonAlpha = Math.min(1.0, (1.0 - moonProgress) / 0.12);
      }
      moonAlpha = Math.max(0, Math.min(1.0, moonAlpha));

      // Stars in Night Sky (Gradual fade-in at dusk, gradual fade-out at morning light)
      const nightAlpha = Math.min(1.0, (p - 0.74) / 0.08) * (p >= 0.96 ? Math.max(0, (1.0 - p) / 0.04) : 1.0);

      if (nightAlpha > 0.02 && state.weather !== 'storm') {
        ctx.save();
        ctx.globalAlpha = nightAlpha;

        // 80 Fixed Scintillating Stars
        for (let i = 0; i < 80; i++) {
          const sx = ((i * 149.3 + camX * 0.015) % this.width + this.width) % this.width;
          const sy = (i * 61.7) % (this.groundY * 0.62);
          const twinkle = Math.sin(this.animTimer * 2.2 + i * 1.7) * 0.5 + 0.5;
          const starSize = (i % 7 === 0) ? 2.5 : ((i % 3 === 0) ? 1.8 : 1.0);

          ctx.fillStyle = (i % 5 === 0) ? '#bfdbfe' : ((i % 9 === 0) ? '#fef08a' : '#ffffff');
          ctx.globalAlpha = nightAlpha * (0.35 + twinkle * 0.65);
          ctx.fillRect(sx, sy, starSize, starSize);

          // Cross sparkle on brightest stars
          if (starSize >= 2.5 && twinkle > 0.7) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillRect(sx - 2, sy + 0.5, 5, 1);
            ctx.fillRect(sx + 0.5, sy - 2, 1, 5);
          }
        }

        // Periodic Shooting Star (Meteor streak)
        const meteorTimer = (this.animTimer * 0.25) % 12;
        if (meteorTimer < 1.2) {
          const mProgress = meteorTimer / 1.2;
          const mStartX = (this.width * 0.75 + camX * 0.02) % this.width;
          const mStartY = 40;
          const mCurX = mStartX - mProgress * 180;
          const mCurY = mStartY + mProgress * 110;

          ctx.strokeStyle = `rgba(254, 240, 138, ${(1 - mProgress) * 0.8 * nightAlpha})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(mCurX + 35, mCurY - 22);
          ctx.lineTo(mCurX, mCurY);
          ctx.stroke();
        }

        ctx.restore();
      }

      // Crescent Moon (Hilal & Lunar Halo with graceful atmospheric fade)
      if (moonY < this.groundY + 24 && moonAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = moonAlpha;

        // Lunar Ethereal Halo
        const moonAura = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 55);
        moonAura.addColorStop(0, 'rgba(224, 242, 254, 0.45)');
        moonAura.addColorStop(0.4, 'rgba(186, 230, 253, 0.15)');
        moonAura.addColorStop(1, 'rgba(186, 230, 253, 0)');
        ctx.fillStyle = moonAura;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 55, 0, Math.PI * 2);
        ctx.fill();

        // Crescent Ottoman Hilal - Rendered with clean arc subtraction so background is never overwritten
        ctx.fillStyle = '#fef9c3';
        ctx.shadowColor = '#bae6fd';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(moonX, moonY, 15, -0.68 * Math.PI, 0.68 * Math.PI, false);
        ctx.arc(moonX + 5.5, moonY - 1.5, 13, 0.68 * Math.PI, -0.68 * Math.PI, true);
        ctx.closePath();
        ctx.fill();

        // Ottoman Star nestled inside crescent
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(moonX + 6, moonY - 1.5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // 4. Parallax Drifting Clouds (Kingdom Two Crowns Atmospheric Cloud Layers)
    this.drawParallaxClouds(camX, p, curTop, curBot);
  }

  // --- Parallax Cloud Layers ---

  private drawParallaxClouds(camX: number, p: number, skyTop: string, skyBot: string) {
    const ctx = this.ctx;
    const isNight = p > 0.70;
    const cloudColor = isNight
      ? 'rgba(15, 23, 42, 0.45)'
      : (p < 0.15 || (p > 0.62 && p <= 0.70)
        ? 'rgba(254, 215, 170, 0.40)'
        : 'rgba(255, 255, 255, 0.45)');

    // Layer 1: High Cirrus Clouds (Parallax 0.04)
    ctx.save();
    ctx.fillStyle = cloudColor;
    for (let c = 0; c < 5; c++) {
      const cloudWorldX = c * 380 + this.animTimer * 8;
      const screenX = ((cloudWorldX - camX * 0.04) % (this.width + 400)) - 100;
      const cloudY = 45 + (c % 3) * 28;

      ctx.beginPath();
      ctx.ellipse(screenX, cloudY, 80, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(screenX + 35, cloudY - 6, 60, 18, 0, 0, Math.PI * 2);
      ctx.ellipse(screenX - 30, cloudY + 4, 50, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Deep Historical 1915 Gallipoli Battlefield & Straits Panorama ---

  private drawStraitsAndHills(state: GameState, camX: number) {
    const ctx = this.ctx;
    const gY = this.groundY;
    const p = state.dayProgress;
    const isNight = p > 0.70;
    const isSunset = p >= 0.62 && p <= 0.70;
    const lvlId = state.level.id;

    // --- 1. Layer 0: Distant Anatolian Mountain Ridges & Peaks (Parallax 0.03) ---
    const p0 = camX * 0.03;
    
    // Rich, atmospheric color schemes per chapter - vibrant, deep, zero dull grey
    let mtnGrad = ctx.createLinearGradient(0, gY - 260, 0, gY);
    if (lvlId === 1) {
      // Seddülbahir & Aegean Coast: Deep Aegean maritime purples and rich deep cobalt
      if (isNight) {
        mtnGrad.addColorStop(0, '#0f172a');
        mtnGrad.addColorStop(1, '#050814');
      } else if (isSunset) {
        mtnGrad.addColorStop(0, '#701a75');
        mtnGrad.addColorStop(0.6, '#9a3412');
        mtnGrad.addColorStop(1, '#431407');
      } else {
        mtnGrad.addColorStop(0, '#1e3a8a');
        mtnGrad.addColorStop(0.5, '#2563eb');
        mtnGrad.addColorStop(1, '#1d4ed8');
      }
    } else if (lvlId === 2) {
      // Kanlısırt / Arıburnu: Rich terracotta crimson & violet clay peaks (Sarıbayır)
      if (isNight) {
        mtnGrad.addColorStop(0, '#1c1017');
        mtnGrad.addColorStop(1, '#0b0609');
      } else if (isSunset) {
        mtnGrad.addColorStop(0, '#881337');
        mtnGrad.addColorStop(0.5, '#9f1239');
        mtnGrad.addColorStop(1, '#4c0519');
      } else {
        mtnGrad.addColorStop(0, '#4c1d24');
        mtnGrad.addColorStop(0.5, '#6b212e');
        mtnGrad.addColorStop(1, '#3b1219');
      }
    } else if (lvlId === 3) {
      // Conkbayırı Zirvesi: Soaring Kaz Dağları & Mt. Ganos towering alpine crags
      if (isNight) {
        mtnGrad.addColorStop(0, '#111827');
        mtnGrad.addColorStop(1, '#030712');
      } else if (isSunset) {
        mtnGrad.addColorStop(0, '#581c87');
        mtnGrad.addColorStop(0.5, '#7c2d12');
        mtnGrad.addColorStop(1, '#3b0764');
      } else {
        mtnGrad.addColorStop(0, '#1e294b');
        mtnGrad.addColorStop(0.5, '#2e385e');
        mtnGrad.addColorStop(1, '#1e2238');
      }
    } else {
      // Anafartalar Zaferi: Expansive Kireçtepe & Kavaktepe ridge under golden victory skies
      if (isNight) {
        mtnGrad.addColorStop(0, '#0c1a16');
        mtnGrad.addColorStop(1, '#030a08');
      } else if (isSunset) {
        mtnGrad.addColorStop(0, '#78350f');
        mtnGrad.addColorStop(0.5, '#92400e');
        mtnGrad.addColorStop(1, '#451a03');
      } else {
        mtnGrad.addColorStop(0, '#164e63');
        mtnGrad.addColorStop(0.5, '#155e75');
        mtnGrad.addColorStop(1, '#115e59');
      }
    }

    ctx.fillStyle = mtnGrad;
    ctx.beginPath();
    ctx.moveTo(0, gY);

    for (let x = 0; x <= this.width; x += 40) {
      const worldX = x + p0;
      let h = 0;
      if (lvlId === 1) {
        // Seddülbahir: Rolling coastal cliffs and distant Gökçeada island mass
        h = Math.sin(worldX * 0.0006) * 70 + Math.cos(worldX * 0.0018) * 35 + 130;
      } else if (lvlId === 2) {
        // Arıburnu / Kanlısırt: Dramatic jagged crags with sharp ravines
        h = Math.sin(worldX * 0.001) * 95 + Math.cos(worldX * 0.0028) * 55 + 165;
      } else if (lvlId === 3) {
        // Conkbayırı: Towering high alpine peaks reaching majestic heights
        h = Math.sin(worldX * 0.0007) * 125 + Math.cos(worldX * 0.0016) * 75 + 210;
      } else {
        // Anafartalar: Broad sweeping mountain ridges embracing the plains
        h = Math.sin(worldX * 0.0005) * 80 + Math.cos(worldX * 0.0012) * 45 + 145;
      }
      ctx.lineTo(x, gY - h);
    }
    ctx.lineTo(this.width, gY);
    ctx.closePath();
    ctx.fill();

    // Distant Island silhouettes for Chapter 1 (Gökçeada & Bozcaada in misty haze)
    if (lvlId === 1) {
      const islandX = 500 - p0 * 0.5;
      if (islandX > -250 && islandX < this.width + 250) {
        ctx.fillStyle = isNight ? 'rgba(15, 23, 42, 0.6)' : (isSunset ? 'rgba(124, 45, 18, 0.45)' : 'rgba(30, 58, 138, 0.35)');
        ctx.beginPath();
        ctx.moveTo(islandX - 160, gY - 60);
        ctx.quadraticCurveTo(islandX, gY - 145, islandX + 160, gY - 60);
        ctx.closePath();
        ctx.fill();
      }
    }

    // --- 2. Layer 1: Çanakkale Boğazı (Dardanelles / Suvla Bay / Saros) & Battleship Fleet (Parallax 0.08) ---
    const p1 = camX * 0.08;
    const waterHorizon = gY - 62;

    // Calm, sparkling Water Strip
    const seaGrad = ctx.createLinearGradient(0, waterHorizon, 0, waterHorizon + 32);
    if (lvlId === 2) {
      // Anzac Cove turquoise & deep indigo
      seaGrad.addColorStop(0, isNight ? '#030712' : (isSunset ? '#831843' : '#0284c7'));
      seaGrad.addColorStop(1, isNight ? '#0f172a' : (isSunset ? '#9f1239' : '#0369a1'));
    } else if (lvlId === 4) {
      // Suvla Bay with salt flat reflections
      seaGrad.addColorStop(0, isNight ? '#040d12' : (isSunset ? '#78350f' : '#0d9488'));
      seaGrad.addColorStop(1, isNight ? '#082f49' : (isSunset ? '#b45309' : '#0f766e'));
    } else {
      // Dardanelles Strait azure
      seaGrad.addColorStop(0, isNight ? '#030712' : (isSunset ? '#7c2d12' : '#1d4ed8'));
      seaGrad.addColorStop(1, isNight ? '#0f172a' : (isSunset ? '#9a3412' : '#1e40af'));
    }
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, waterHorizon, this.width, 32);

    // Dynamic Celestial Water Shimmer
    const celProgress = p <= 0.71 ? (p / 0.70) : (p >= 0.68 ? (p - 0.68) / 0.36 : (p + 0.32) / 0.36);
    const celAngle = Math.min(1, Math.max(0, celProgress)) * Math.PI;
    const celX = (this.width * 0.5) - Math.cos(celAngle) * (this.width * 0.48 + 50) - (camX * 0.015);
    
    if (celX > -60 && celX < this.width + 60) {
      const shimGrad = ctx.createLinearGradient(celX - 35, 0, celX + 35, 0);
      const col = isNight ? 'rgba(224, 242, 254,' : (isSunset ? 'rgba(254, 215, 170,' : 'rgba(254, 240, 138,');
      shimGrad.addColorStop(0, `${col} 0)`);
      shimGrad.addColorStop(0.5, `${col} ${isNight ? '0.35)' : '0.50)'}`);
      shimGrad.addColorStop(1, `${col} 0)`);
      ctx.fillStyle = shimGrad;
      ctx.fillRect(celX - 35, waterHorizon, 70, 26);

      // Shimmer horizontal pixel wavelets
      ctx.fillStyle = isNight ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.7)';
      for (let wy = 0; wy < 6; wy++) {
        const waveX = celX + Math.sin(this.animTimer * 4 + wy * 1.5) * 12;
        ctx.fillRect(waveX - 10 + wy * 1.5, waterHorizon + 4 + wy * 3.5, 20 - wy * 2, 1.5);
      }
    }

    // Distant Allied Warships & Colliers (SS River Clyde, HMS Queen Elizabeth, Bouvet, Nusret)
    for (let b = 0; b < 4; b++) {
      const shipWorldX = 420 + b * 980;
      const screenShipX = shipWorldX - p1;
      if (screenShipX > -180 && screenShipX < this.width + 180) {
        this.drawDistantWarship(screenShipX, waterHorizon + 12, state, b);
      }
    }

    // --- 3. Layer 2: Iconic Gallipoli Ridges & Historical Landmarks (Parallax 0.18) ---
    const p2 = camX * 0.18;
    
    let ridgeColor = '#1e293b';
    if (lvlId === 1) {
      // Seddülbahir sandstone ridge
      ridgeColor = isNight ? '#0b1319' : (isSunset ? '#451a03' : '#334e38');
    } else if (lvlId === 2) {
      // Kanlısırt / Arıburnu terracotta ridge
      ridgeColor = isNight ? '#140c10' : (isSunset ? '#4c0519' : '#57222c');
    } else if (lvlId === 3) {
      // Conkbayırı high limestone ridge
      ridgeColor = isNight ? '#0a0e17' : (isSunset ? '#2e1065' : '#2b3548');
    } else {
      // Anafartalar steppe hills
      ridgeColor = isNight ? '#06130d' : (isSunset ? '#3b1d06' : '#234426');
    }

    ctx.fillStyle = ridgeColor;
    ctx.beginPath();
    ctx.moveTo(0, gY);
    for (let x = 0; x <= this.width; x += 30) {
      const worldX = x + p2;
      let h = 0;
      if (lvlId === 1) {
        h = Math.sin(worldX * 0.0022) * 35 + Math.cos(worldX * 0.005) * 22 + 65;
      } else if (lvlId === 2) {
        // Dramatic steep ravines (Plugge's plateau profile)
        h = Math.sin(worldX * 0.0032) * 55 + Math.cos(worldX * 0.007) * 32 + 85;
      } else if (lvlId === 3) {
        // Conkbayırı high rocky ridge
        h = Math.sin(worldX * 0.0025) * 65 + Math.cos(worldX * 0.0055) * 38 + 95;
      } else {
        // Anafartalar rolling downs
        h = Math.sin(worldX * 0.0018) * 30 + Math.cos(worldX * 0.004) * 18 + 55;
      }
      ctx.lineTo(x, gY - h);
    }
    ctx.lineTo(this.width, gY);
    ctx.closePath();
    ctx.fill();

    // Chapter 2 Special Landmark: The Famous Sphinx Rock (Sfenks Tepesi) of Arıburnu
    if (lvlId === 2) {
      const sphinxWorldX = 1450;
      const sx = sphinxWorldX - p2;
      if (sx > -100 && sx < this.width + 100) {
        const ridgeH = Math.sin(sphinxWorldX * 0.0032) * 55 + Math.cos(sphinxWorldX * 0.007) * 32 + 85;
        const baseY = gY - ridgeH;
        // Sphinx Rock distinctive natural silhouette
        ctx.fillStyle = isNight ? '#0f080c' : (isSunset ? '#5c101f' : '#6b2a36');
        ctx.beginPath();
        ctx.moveTo(sx - 35, baseY + 10);
        ctx.lineTo(sx - 15, baseY - 32);
        ctx.lineTo(sx + 5, baseY - 38);
        ctx.lineTo(sx + 15, baseY - 24);
        ctx.lineTo(sx + 35, baseY + 10);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Chapter 4 Special Landmark: Tuzla Salt Lake (Tuzla Gölü) Shimmer
    if (lvlId === 4) {
      const lakeWorldX = 1800;
      const lx = lakeWorldX - p2;
      if (lx > -150 && lx < this.width + 150) {
        const ridgeH = Math.sin(lakeWorldX * 0.0018) * 30 + Math.cos(lakeWorldX * 0.004) * 18 + 55;
        const baseY = gY - ridgeH + 8;
        ctx.fillStyle = isNight ? 'rgba(224, 242, 254, 0.25)' : (isSunset ? 'rgba(254, 215, 170, 0.45)' : 'rgba(204, 251, 241, 0.55)');
        ctx.beginPath();
        ctx.ellipse(lx, baseY, 85, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Distant Night Artillery Flash Pulses on Ridge
    if (isNight) {
      const artFlashTimer = (this.animTimer * 0.8) % 7;
      if (artFlashTimer < 0.25) {
        const flashX = ((520 + p2 * 0.5) % this.width + this.width) % this.width;
        const flashGrad = ctx.createRadialGradient(flashX, gY - 90, 4, flashX, gY - 90, 95);
        flashGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
        flashGrad.addColorStop(0.4, 'rgba(249, 115, 22, 0.25)');
        flashGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
        ctx.fillStyle = flashGrad;
        ctx.beginPath();
        ctx.arc(flashX, gY - 90, 95, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Historical Ottoman Bastions, Fortress Ruins & Observation Flagstaffs
    for (let fort = 0; fort < 3; fort++) {
      const fortWorldX = 550 + fort * 1350;
      const sx = fortWorldX - p2;
      if (sx > -100 && sx < this.width + 100) {
        const ridgeH = Math.sin(fortWorldX * 0.0025) * 45 + Math.cos(fortWorldX * 0.006) * 25 + 75;
        const baseY = gY - ridgeH;

        if (lvlId === 1) {
          // Seddülbahir Castle Ramparts
          ctx.fillStyle = isNight ? '#080d12' : '#233827';
          ctx.fillRect(sx - 24, baseY - 18, 48, 20);
          ctx.fillRect(sx - 18, baseY - 28, 36, 11);
          // Stone crenellations
          for (let c = 0; c < 4; c++) {
            ctx.fillRect(sx - 16 + c * 9, baseY - 33, 5, 6);
          }
        } else if (lvlId === 3) {
          // Kemal Yeri Command Redoubt on Conkbayırı Ridge
          ctx.fillStyle = isNight ? '#070a11' : '#1e2636';
          ctx.fillRect(sx - 20, baseY - 14, 40, 16);
          ctx.fillRect(sx - 12, baseY - 22, 24, 9);
        } else {
          // Standard Fortified Redoubt
          ctx.fillStyle = isNight ? '#060a08' : '#1a2418';
          ctx.fillRect(sx - 22, baseY - 16, 44, 18);
          ctx.fillRect(sx - 16, baseY - 24, 32, 10);
        }

        // Turkish Observation Flagstaff on High Ridge
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx + 8, baseY - 42, 2, 26);
        // Red Crescent Flag
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(sx + 10, baseY - 42, 12, 8);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx + 14, baseY - 38, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- 4. Layer 3: Rolling Steppe, Olive Groves & Distant Bivouac Tents (Parallax 0.35) ---
    const p3 = camX * 0.35;
    let foreHillColor = '#162812';
    if (lvlId === 1) {
      foreHillColor = isNight ? '#060d0b' : (isSunset ? '#2e1c0c' : '#2d4520');
    } else if (lvlId === 2) {
      foreHillColor = isNight ? '#0f070a' : (isSunset ? '#3b0d14' : '#451a20');
    } else if (lvlId === 3) {
      foreHillColor = isNight ? '#070a10' : (isSunset ? '#1e1138' : '#1f2838');
    } else {
      foreHillColor = isNight ? '#040d07' : (isSunset ? '#261908' : '#1b3816');
    }

    ctx.fillStyle = foreHillColor;
    ctx.beginPath();
    ctx.moveTo(0, gY);
    for (let x = 0; x <= this.width; x += 25) {
      const worldX = x + p3;
      const h = Math.sin(worldX * 0.005) * 25 + Math.cos(worldX * 0.012) * 14 + 38;
      ctx.lineTo(x, gY - h);
    }
    ctx.lineTo(this.width, gY);
    ctx.closePath();
    ctx.fill();

    // Distant Ottoman Field Tents & Olive Trees on hills
    for (let t = 0; t < 20; t++) {
      const tentWorldX = 240 + t * 240;
      const sx = tentWorldX - p3;
      if (sx > -40 && sx < this.width + 40) {
        const hillH = Math.sin(tentWorldX * 0.005) * 25 + Math.cos(tentWorldX * 0.012) * 14 + 38;
        const baseY = gY - hillH;

        if (t % 3 === 0) {
          // White & Olive Wedge Tent
          ctx.fillStyle = isNight ? '#1e293b' : '#cbd5e1';
          ctx.beginPath();
          ctx.moveTo(sx - 9, baseY);
          ctx.lineTo(sx, baseY - 12);
          ctx.lineTo(sx + 9, baseY);
          ctx.closePath();
          ctx.fill();
          // Tent entrance
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.moveTo(sx - 3, baseY);
          ctx.lineTo(sx, baseY - 7);
          ctx.lineTo(sx + 3, baseY);
          ctx.closePath();
          ctx.fill();
        } else {
          // Distant Mediterranean Olive Tree / Steppe Pine
          ctx.fillStyle = isNight ? '#040a04' : '#11220e';
          ctx.fillRect(sx, baseY - 16, 2.5, 16);
          ctx.beginPath();
          ctx.arc(sx + 1, baseY - 20, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // --- Distant Warships Silhouette Engine ---

  private drawDistantWarship(x: number, y: number, state: GameState, shipIdx: number) {
    const ctx = this.ctx;
    const isNight = state.dayProgress > 0.70;
    ctx.save();
    ctx.fillStyle = isNight ? '#0b0f17' : '#1e293b';

    // Ship Hull (Historical Battleship Profile)
    ctx.beginPath();
    ctx.moveTo(x - 52, y);
    ctx.lineTo(x - 62, y - 9);
    ctx.lineTo(x + 62, y - 9);
    ctx.lineTo(x + 52, y);
    ctx.closePath();
    ctx.fill();

    // Superstructure & Gun Barbettes
    ctx.fillRect(x - 30, y - 20, 60, 11);
    ctx.fillRect(x - 14, y - 30, 28, 11);

    // Heavy Main Gun Barrels (Forward & Aft Twin Turrets)
    ctx.fillRect(x - 46, y - 16, 18, 3);
    ctx.fillRect(x + 28, y - 16, 18, 3);

    // Twin Funnels with coal smoke
    ctx.fillRect(x - 16, y - 28, 6, 10);
    ctx.fillRect(x + 4, y - 28, 6, 10);

    // Masts & Rigging
    ctx.fillRect(x - 22, y - 38, 2, 20);
    ctx.fillRect(x + 20, y - 35, 2, 17);

    // Animated Smokestack Coal Plumes
    ctx.fillStyle = 'rgba(71, 85, 105, 0.45)';
    const puffOffset = (this.animTimer * 8 + shipIdx * 4) % 18;
    ctx.beginPath();
    ctx.arc(x - 13 - puffOffset, y - 30 - puffOffset * 0.4, 3 + puffOffset * 0.35, 0, Math.PI * 2);
    ctx.arc(x + 7 - puffOffset, y - 30 - puffOffset * 0.4, 3 + puffOffset * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Night Searchlight Beam (Sweeping across the dark Gallipoli skies)
    if (isNight) {
      const beamAngle = Math.sin(this.animTimer * 0.35 + shipIdx * 2.1) * 0.4 + 0.15;
      ctx.save();
      ctx.translate(x - 10, y - 30);
      ctx.rotate(beamAngle);
      const beamGrad = ctx.createRadialGradient(0, 0, 4, 240, 0, 200);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.4)');
      beamGrad.addColorStop(0.3, 'rgba(254, 240, 138, 0.15)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(340, -45);
      ctx.lineTo(340, 45);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // --- Terrain Base Soil, Geological Strata & Ocean Beach ---

  private drawTerrain(state: GameState, camX: number, slots: BuildSlot[] = []) {
    const ctx = this.ctx;
    const gY = this.groundY;
    const lvlId = state.level.id;

    // Historical Gallipoli Soil adapted per Chapter
    const groundGrad = ctx.createLinearGradient(0, gY, 0, this.height);
    if (state.season === 'winter') {
      groundGrad.addColorStop(0, '#f1f5f9');
      groundGrad.addColorStop(0.1, '#cbd5e1');
      groundGrad.addColorStop(0.35, '#64748b');
      groundGrad.addColorStop(0.7, '#334155');
      groundGrad.addColorStop(1, '#0f172a');
    } else if (state.season === 'autumn') {
      groundGrad.addColorStop(0, '#854d0e');
      groundGrad.addColorStop(0.08, '#713f12');
      groundGrad.addColorStop(0.3, '#572c0c');
      groundGrad.addColorStop(0.7, '#3b1d06');
      groundGrad.addColorStop(1, '#1c0f04');
    } else {
      if (lvlId === 1) {
        // Seddülbahir Coastal Sandstone & Beach Loam
        groundGrad.addColorStop(0, '#5a6828'); // Coastal dune scrub
        groundGrad.addColorStop(0.06, '#785c2c'); // Sandstone topsoil
        groundGrad.addColorStop(0.20, '#664a20'); // Golden coastal sediment
        groundGrad.addColorStop(0.50, '#4a3314'); // Compressed sandstone
        groundGrad.addColorStop(0.80, '#2d1e0a'); // Basal rock
        groundGrad.addColorStop(1, '#140c04');
      } else if (lvlId === 2) {
        // Kanlısırt / Arıburnu Iconic Gallipoli Blood-Red Clay (Kızıl Toprak)
        groundGrad.addColorStop(0, '#4a5e20'); // Pine moss surface
        groundGrad.addColorStop(0.06, '#7c2d12'); // Rich Kanlısırt red clay
        groundGrad.addColorStop(0.20, '#6c240e'); // Deep terracotta strata
        groundGrad.addColorStop(0.50, '#4d1708'); // Dense red mudstone
        groundGrad.addColorStop(0.80, '#2e0b04'); // Dark bedrock
        groundGrad.addColorStop(1, '#150502');
      } else if (lvlId === 3) {
        // Conkbayırı High Mountain Limestone & Scree
        groundGrad.addColorStop(0, '#4b5535'); // High mountain alpine moss
        groundGrad.addColorStop(0.06, '#47473f'); // Limestone gravel topsoil
        groundGrad.addColorStop(0.20, '#383832'); // Rocky shale strata
        groundGrad.addColorStop(0.50, '#282824'); // Hard limestone bedrock
        groundGrad.addColorStop(0.80, '#1c1c19'); // Deep mountain rock
        groundGrad.addColorStop(1, '#0e0e0c');
      } else {
        // Anafartalar Fertile Steppe Soil
        groundGrad.addColorStop(0, '#4d6d24'); // Lush Anatolian steppe grass
        groundGrad.addColorStop(0.06, '#4a3d1b'); // Fertile alluvial loam
        groundGrad.addColorStop(0.20, '#5c481e'); // Silt & clay
        groundGrad.addColorStop(0.50, '#3e2f12'); // Dense siltstone
        groundGrad.addColorStop(0.80, '#281d0a'); // Deep bedrock
        groundGrad.addColorStop(1, '#130d04');
      }
    }

    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, gY, this.width, this.height - gY);

    // Geological Sediment Strata (Sakin, Gözü Yormayan Sabit Jeolojik Katmanlar)
    let strataColors = ['rgba(84, 50, 20, 0.3)', 'rgba(60, 32, 12, 0.35)', 'rgba(35, 18, 6, 0.4)'];
    if (state.season === 'winter') {
      strataColors = ['rgba(148, 163, 184, 0.25)', 'rgba(71, 85, 105, 0.3)', 'rgba(30, 41, 59, 0.35)'];
    } else if (lvlId === 2) {
      strataColors = ['rgba(153, 27, 27, 0.35)', 'rgba(127, 29, 29, 0.4)', 'rgba(69, 10, 10, 0.45)'];
    } else if (lvlId === 3) {
      strataColors = ['rgba(100, 116, 139, 0.3)', 'rgba(71, 85, 105, 0.35)', 'rgba(30, 41, 59, 0.4)'];
    }

    // Stratum 1: Subsurface clay layer
    ctx.fillStyle = strataColors[0];
    ctx.fillRect(0, gY + 12, this.width, 3);
    // Stratum 2: Limestone & chalk sedimentary band
    ctx.fillStyle = strataColors[1];
    ctx.fillRect(0, gY + 36, this.width, 4);
    // Stratum 3: Deep shale bedrock band
    ctx.fillStyle = strataColors[2];
    ctx.fillRect(0, gY + 75, this.width, 5);

    // Sea / Water at map edges (Çanakkale Boğazı & Ege Kıyısı - Realist Dalgalar ve Islak Kum)
    const leftBeachX = 260 - camX;
    const rightBeachX = state.level.worldWidth - 260 - camX;
    const isNight = state.dayProgress > 0.70;

    const waterGrad = ctx.createLinearGradient(0, gY, 0, this.height);
    if (isNight) {
      waterGrad.addColorStop(0, '#0c1527');
      waterGrad.addColorStop(0.4, '#070d18');
      waterGrad.addColorStop(1, '#020408');
    } else {
      waterGrad.addColorStop(0, '#1d4ed8');
      waterGrad.addColorStop(0.3, '#1e3a8a');
      waterGrad.addColorStop(1, '#0f172a');
    }

    if (leftBeachX > 0) {
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, gY, leftBeachX, this.height - gY);

      // Wet Sand Transition
      const wetSandGrad = ctx.createLinearGradient(leftBeachX - 25, gY, leftBeachX, gY);
      wetSandGrad.addColorStop(0, 'rgba(30, 58, 138, 0.4)');
      wetSandGrad.addColorStop(1, 'rgba(194, 165, 114, 0.3)');
      ctx.fillStyle = wetSandGrad;
      ctx.fillRect(leftBeachX - 25, gY, 25, this.height - gY);

      // Multi-layered animated foaming surf breakers
      for (let w = 0; w < 3; w++) {
        const waveX = leftBeachX - 18 + w * 6 + Math.sin(this.animTimer * 2.5 + w * 1.5) * 6;
        ctx.fillStyle = w === 0 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(224, 242, 254, 0.4)';
        ctx.fillRect(waveX, gY, 4, this.height - gY);
      }
    }

    if (rightBeachX < this.width) {
      const seaW = this.width - rightBeachX;
      ctx.fillStyle = waterGrad;
      ctx.fillRect(rightBeachX, gY, seaW, this.height - gY);

      // Wet Sand Transition
      const wetSandGrad = ctx.createLinearGradient(rightBeachX, gY, rightBeachX + 25, gY);
      wetSandGrad.addColorStop(0, 'rgba(194, 165, 114, 0.3)');
      wetSandGrad.addColorStop(1, 'rgba(30, 58, 138, 0.4)');
      ctx.fillStyle = wetSandGrad;
      ctx.fillRect(rightBeachX, gY, 25, this.height - gY);

      // Multi-layered animated foaming surf breakers
      for (let w = 0; w < 3; w++) {
        const waveX = rightBeachX + 18 - w * 6 - Math.sin(this.animTimer * 2.5 + w * 1.5) * 6;
        ctx.fillStyle = w === 0 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(224, 242, 254, 0.4)';
        ctx.fillRect(waveX - 3, gY, 4, this.height - gY);
      }
    }
  }

  // --- Dedicated Forest Grass & Moving Steppe Flora Engine ---

  private drawForestGrass(state: GameState, camX: number, slots: BuildSlot[] = []) {
    const ctx = this.ctx;
    const gY = this.groundY;

    const isWinter = state.season === 'winter';
    const isAutumn = state.season === 'autumn';

    const grassBaseColors = isWinter 
      ? ['#cbd5e1', '#e2e8f0', '#94a3b8'] 
      : (isAutumn 
        ? ['#78350f', '#9a3412', '#b45309'] 
        : ['#14532d', '#15803d', '#3f6212']);

    const grassTipColors = isWinter 
      ? ['#f8fafc', '#ffffff', '#e2e8f0'] 
      : (isAutumn 
        ? ['#d97706', '#f59e0b', '#b45309'] 
        : ['#4d7c0f', '#65a30d', '#84cc16']);

    const forestTrees = (slots || []).filter((s) => s.type === 'scavenge_wood');
    const leftStandingTrees = forestTrees.filter((s) => s.side === 'left' && !s.isScavenged);
    const rightStandingTrees = forestTrees.filter((s) => s.side === 'right' && !s.isScavenged);

    const leftForestEdgeX = leftStandingTrees.length > 0 ? Math.max(...leftStandingTrees.map((t) => t.x)) + 60 : -9999;
    const rightForestEdgeX = rightStandingTrees.length > 0 ? Math.min(...rightStandingTrees.map((t) => t.x)) - 60 : 999999;

    const step = 5;
    const startX = -(camX % step);
    for (let sx = startX; sx < this.width + 15; sx += step) {
      const worldX = sx + camX;
      if (worldX < 285 || worldX > state.level.worldWidth - 285) continue;

      // Base grass presence inside the wild forest bounds (Kurulu hududun dışındaki ormanlık alanlar)
      let forestGrassFactor = 0;
      if (worldX <= leftForestEdgeX && worldX >= 300) {
        const edgeDist = leftForestEdgeX - worldX;
        forestGrassFactor = Math.min(1.0, 0.55 + edgeDist / 70);
      } else if (worldX >= rightForestEdgeX && worldX <= state.level.worldWidth - 300) {
        const edgeDist = worldX - rightForestEdgeX;
        forestGrassFactor = Math.min(1.0, 0.55 + edgeDist / 70);
      }

      // Proximity to individual trees (standing trees enhance lushness; cut trees wither away grass)
      for (let t = 0; t < forestTrees.length; t++) {
        const tree = forestTrees[t];
        const dist = Math.abs(tree.x - worldX);
        if (dist < 120) {
          const proximity = Math.max(0, 1 - dist / 120);
          if (tree.isScavenged) {
            // Cleared stump area: grass withers and disappears as area is cleared
            const clearedProg = tree.clearedProgress ?? 1.0;
            const withering = Math.max(0, 1 - clearedProg);
            const suppression = proximity * (1 - withering);
            forestGrassFactor *= Math.max(0, 1 - suppression);
          } else {
            const treeBonus = proximity * 0.45;
            if (treeBonus > forestGrassFactor) {
              forestGrassFactor = Math.min(1.0, forestGrassFactor + treeBonus);
            }
          }
        }
      }

      if (forestGrassFactor <= 0.04) continue;

      // Realistic multi-frequency wind physics
      const seed = Math.abs(worldX);
      const windSway = Math.sin(this.animTimer * 1.5 + worldX * 0.02) * 3.6 + Math.sin(this.animTimer * 3.0 + worldX * 0.06) * 1.2;
      const baseBladeH = (10 + (seed % 7) + (Math.sin(worldX * 0.07) * 4)) * forestGrassFactor;

      // Cluster Blade 1: Main central blade
      const colorIdx = seed % grassBaseColors.length;
      ctx.strokeStyle = grassTipColors[colorIdx];
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx, gY);
      ctx.quadraticCurveTo(sx + windSway * 0.4, gY - baseBladeH * 0.55, sx + windSway * forestGrassFactor, gY - baseBladeH);
      ctx.stroke();

      // Cluster Blade 2: Left curving blade (darker root shade)
      if (forestGrassFactor > 0.3) {
        const leftH = baseBladeH * 0.78;
        ctx.strokeStyle = grassBaseColors[(colorIdx + 1) % grassBaseColors.length];
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(sx - 2, gY);
        ctx.quadraticCurveTo(sx - 3 + windSway * 0.25, gY - leftH * 0.5, sx - 4 + windSway * 0.7, gY - leftH);
        ctx.stroke();
      }

      // Cluster Blade 3: Right leaning blade (sunlit highlight)
      if (forestGrassFactor > 0.5 && seed % 2 === 0) {
        const rightH = baseBladeH * 0.65;
        ctx.strokeStyle = grassTipColors[(colorIdx + 2) % grassTipColors.length];
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(sx + 2, gY);
        ctx.quadraticCurveTo(sx + 3 + windSway * 0.3, gY - rightH * 0.5, sx + 4 + windSway * 0.8, gY - rightH);
        ctx.stroke();
      }

      // Gelibolu Wild Flora (Authentic Red Steppe Poppies & Field Buttercups)
      if (forestGrassFactor > 0.45 && !isWinter) {
        if (seed % 43 < 3) {
          // Red Poppy (Gelincik)
          const flowerX = sx + windSway * forestGrassFactor * 0.95;
          const flowerY = gY - baseBladeH - 1.5;
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(flowerX, flowerY, 2.5 * forestGrassFactor, 0, Math.PI * 2);
          ctx.fill();
          // Black velvet pistil center
          ctx.fillStyle = '#09090b';
          ctx.fillRect(flowerX - 0.7, flowerY - 0.7, 1.4, 1.4);
        } else if (seed % 67 < 2) {
          // Yellow Buttercup (Düğün Çiçeği)
          const flowerX = sx + windSway * forestGrassFactor * 0.8;
          const flowerY = gY - baseBladeH * 0.85;
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(flowerX, flowerY, 1.8 * forestGrassFactor, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ca8a04';
          ctx.fillRect(flowerX - 0.5, flowerY - 0.5, 1, 1);
        }
      }
    }
  }

  // --- Foreground Grass Layer for Extra Depth ---

  private drawForegroundGrass(state: GameState, camX: number, slots: BuildSlot[] = []) {
    const ctx = this.ctx;
    const gY = this.groundY;
    if (state.season === 'winter') return;

    // Organic foreground tufts along the frontier to frame trenches & fortifications
    const step = 22;
    const startX = -(camX % step);
    for (let sx = startX; sx < this.width + 10; sx += step) {
      const worldX = sx + camX;
      if (worldX < 290 || worldX > state.level.worldWidth - 290) continue;

      const seed = Math.abs(worldX);
      const sway = Math.sin(this.animTimer * 1.5 + worldX * 0.03) * 2.2;
      const h = 6 + (seed % 5);

      ctx.strokeStyle = (seed % 2 === 0) ? '#365314' : '#1e3a0f';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sx, gY + 1);
      ctx.quadraticCurveTo(sx + sway * 0.4, gY - h * 0.5, sx + sway, gY - h);
      ctx.stroke();

      if (seed % 3 === 0) {
        ctx.strokeStyle = '#4d7c0f';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(sx + 2, gY + 1);
        ctx.quadraticCurveTo(sx + 2 + sway * 0.3, gY - h * 0.4, sx + 3 + sway * 0.8, gY - h * 0.7);
        ctx.stroke();
      }
    }
  }

  // --- Dynamic Forest Backdrop (Kingdom Two Crowns Wilderness & Clearing Engine) ---

  private drawForestBackdrop(slots: BuildSlot[], camX: number, state: GameState) {
    const ctx = this.ctx;
    const gY = this.groundY;
    const isNight = state.dayProgress > 0.55;

    // Find active uncut trees on both flanks
    const leftStandingTrees = slots.filter((s) => s.type === 'scavenge_wood' && s.side === 'left' && !s.isScavenged);
    const rightStandingTrees = slots.filter((s) => s.type === 'scavenge_wood' && s.side === 'right' && !s.isScavenged);

    const leftForestEdgeX = leftStandingTrees.length > 0 ? Math.max(...leftStandingTrees.map((t) => t.x)) + 30 : -9999;
    const rightForestEdgeX = rightStandingTrees.length > 0 ? Math.min(...rightStandingTrees.map((t) => t.x)) - 30 : 999999;

    ctx.save();

    // 1. Left Deep Forest Background Layer
    if (leftForestEdgeX > -1000) {
      const edgeScreenX = leftForestEdgeX - camX;
      if (edgeScreenX > -200) {
        const startScreenX = Math.max(-200, 0 - camX);
        const forestW = Math.max(0, edgeScreenX - startScreenX);

        if (forestW > 0) {
          // Forest background canopy silhouette - smoothly tapers down to ground line
          const canopyGrad = ctx.createLinearGradient(0, gY - 260, 0, gY);
          canopyGrad.addColorStop(0, isNight ? '#050c05' : '#0f2411');
          canopyGrad.addColorStop(0.7, isNight ? '#081408' : '#143818');
          canopyGrad.addColorStop(1, isNight ? '#0a1a0c' : '#1b4a20');

          ctx.fillStyle = canopyGrad;
          ctx.beginPath();
          ctx.moveTo(startScreenX, gY);
          for (let wx = 0; wx <= leftForestEdgeX; wx += 35) {
            const sx = wx - camX;
            const distToEdge = leftForestEdgeX - wx;
            const taper = distToEdge < 280 ? Math.sin(Math.max(0, distToEdge / 280) * (Math.PI / 2)) : 1;
            const treeHeight = (160 + (Math.sin(wx * 0.05) * 35) + (Math.cos(wx * 0.02) * 20)) * taper;
            ctx.lineTo(sx, gY - treeHeight);
          }
          ctx.lineTo(edgeScreenX, gY);
          ctx.closePath();
          ctx.fill();

          // Dense timber trunks & layered foliage, fading naturally toward the edge
          for (let wx = 50; wx <= leftForestEdgeX - 10; wx += 60) {
            const sx = wx - camX;
            if (sx < -80 || sx > this.width + 80) continue;
            const distToEdge = leftForestEdgeX - wx;
            const scale = distToEdge < 240 ? Math.max(0.2, distToEdge / 240) : 1;
            const alpha = distToEdge < 220 ? Math.max(0.05, distToEdge / 220) : 1;
            this.drawBackgroundPineTree(sx, gY, wx, isNight, scale, alpha);
          }

          // Ground Level Forest Atmosphere Mist (Only near ground turf, NO full-height vertical sky seams)
          const mistGrad = ctx.createLinearGradient(0, gY - 70, 0, gY);
          mistGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
          mistGrad.addColorStop(1, isNight ? 'rgba(5, 15, 7, 0.45)' : 'rgba(15, 38, 18, 0.30)');
          ctx.fillStyle = mistGrad;
          ctx.beginPath();
          ctx.moveTo(startScreenX, gY);
          ctx.lineTo(startScreenX, gY - 60);
          ctx.lineTo(edgeScreenX, gY - 10);
          ctx.lineTo(edgeScreenX, gY);
          ctx.closePath();
          ctx.fill();

          // Top Screen Forest Canopy Overhang with smooth tapered natural edge (tapering height to 0)
          ctx.fillStyle = isNight ? '#030804' : '#0a1d0d';
          ctx.beginPath();
          ctx.moveTo(startScreenX, 0);
          for (let wx = 0; wx <= leftForestEdgeX; wx += 25) {
            const sx = wx - camX;
            const distToEdge = leftForestEdgeX - wx;
            const taper = distToEdge < 220 ? Math.sin(Math.max(0, distToEdge / 220) * (Math.PI / 2)) : 1;
            const branchH = (45 + Math.sin(wx * 0.08) * 18 + Math.cos(wx * 0.03) * 12) * taper;
            ctx.lineTo(sx, branchH);
          }
          ctx.lineTo(edgeScreenX, 0);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // 2. Right Deep Forest Background Layer
    if (rightForestEdgeX < 900000) {
      const edgeScreenX = rightForestEdgeX - camX;
      const worldEnd = state.level.worldWidth;
      const endScreenX = worldEnd - camX;

      if (edgeScreenX < this.width + 200) {
        // Forest background canopy silhouette - smoothly tapers up from ground line
        const canopyGrad = ctx.createLinearGradient(0, gY - 260, 0, gY);
        canopyGrad.addColorStop(0, isNight ? '#050c05' : '#0f2411');
        canopyGrad.addColorStop(0.7, isNight ? '#081408' : '#143818');
        canopyGrad.addColorStop(1, isNight ? '#0a1a0c' : '#1b4a20');

        ctx.fillStyle = canopyGrad;
        ctx.beginPath();
        ctx.moveTo(edgeScreenX, gY);
        for (let wx = rightForestEdgeX; wx <= worldEnd; wx += 35) {
          const sx = wx - camX;
          const distFromEdge = wx - rightForestEdgeX;
          const taper = distFromEdge < 280 ? Math.sin(Math.max(0, distFromEdge / 280) * (Math.PI / 2)) : 1;
          const treeHeight = (160 + (Math.sin(wx * 0.05) * 35) + (Math.cos(wx * 0.02) * 20)) * taper;
          ctx.lineTo(sx, gY - treeHeight);
        }
        ctx.lineTo(endScreenX, gY);
        ctx.closePath();
        ctx.fill();

        // Dense timber trunks & layered foliage, fading naturally toward the clearing
        for (let wx = rightForestEdgeX + 10; wx <= worldEnd - 50; wx += 60) {
          const sx = wx - camX;
          if (sx < -80 || sx > this.width + 80) continue;
          const distFromEdge = wx - rightForestEdgeX;
          const scale = distFromEdge < 240 ? Math.max(0.2, distFromEdge / 240) : 1;
          const alpha = distFromEdge < 220 ? Math.max(0.05, distFromEdge / 220) : 1;
          this.drawBackgroundPineTree(sx, gY, wx, isNight, scale, alpha);
        }

        // Ground Level Forest Atmosphere Mist (Only near ground turf, NO full-height vertical sky seams)
        const mistGrad = ctx.createLinearGradient(0, gY - 70, 0, gY);
        mistGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        mistGrad.addColorStop(1, isNight ? 'rgba(5, 15, 7, 0.45)' : 'rgba(15, 38, 18, 0.30)');
        ctx.fillStyle = mistGrad;
        ctx.beginPath();
        ctx.moveTo(edgeScreenX, gY);
        ctx.lineTo(edgeScreenX, gY - 10);
        ctx.lineTo(endScreenX, gY - 60);
        ctx.lineTo(endScreenX, gY);
        ctx.closePath();
        ctx.fill();

        // Top Screen Forest Canopy Overhang with smooth tapered natural edge (tapering height from 0)
        ctx.fillStyle = isNight ? '#030804' : '#0a1d0d';
        ctx.beginPath();
        ctx.moveTo(edgeScreenX, 0);
        for (let wx = rightForestEdgeX; wx <= worldEnd; wx += 25) {
          const sx = wx - camX;
          const distFromEdge = wx - rightForestEdgeX;
          const taper = distFromEdge < 220 ? Math.sin(Math.max(0, distFromEdge / 220) * (Math.PI / 2)) : 1;
          const branchH = (45 + Math.sin(wx * 0.08) * 18 + Math.cos(wx * 0.03) * 12) * taper;
          ctx.lineTo(sx, branchH);
        }
        ctx.lineTo(endScreenX, 0);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawBackgroundPineTree(x: number, y: number, seed: number, isNight: boolean, scale = 1, alpha = 1) {
    if (alpha <= 0.02 || scale <= 0.05) return;
    const ctx = this.ctx;
    ctx.save();
    if (alpha < 1) ctx.globalAlpha *= alpha;
    const trunkH = (110 + (seed % 40)) * scale;
    const trunkW = Math.max(2, (6 + (seed % 4)) * scale);

    // Trunk
    ctx.fillStyle = isNight ? '#0f1710' : '#1c2e17';
    ctx.fillRect(x - trunkW / 2, y - trunkH, trunkW, trunkH);

    // Canopy tiers
    const greenDark = isNight ? '#08170a' : '#143818';
    const greenMid = isNight ? '#0c220f' : '#1e4d22';

    for (let layer = 0; layer < 4; layer++) {
      const layerY = y - trunkH * 0.4 - layer * (28 * scale);
      const layerW = (48 - layer * 8) * scale;
      const layerH = 34 * scale;

      ctx.fillStyle = layer % 2 === 0 ? greenDark : greenMid;
      ctx.beginPath();
      ctx.moveTo(x - layerW / 2, layerY);
      ctx.lineTo(x, layerY - layerH);
      ctx.lineTo(x + layerW / 2, layerY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Kingdom Classic Style Stone Monolith Title ("ÇANAKKALE") ---

  private drawStoneTitle(letters: StoneLetter[], camX: number) {
    const ctx = this.ctx;
    const gY = this.groundY;

    for (let index = 0; index < letters.length; index++) {
      const letter = letters[index];
      const sx = letter.x - camX;
      if (sx < -140 || sx > this.width + 140) continue;

      ctx.save();
      ctx.translate(sx, gY);

      // Smooth fading when crumbling
      const alpha = Math.max(0, Math.min(1, letter.opacity ?? 1.0));
      ctx.globalAlpha = alpha;

      if (letter.state === 'standing') {
        // --- Natural Ground Shadow Under Monumental 3D Stone Monolith ---
        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.beginPath();
        ctx.ellipse(4, 2, 42, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // --- Freestanding Colossal 3D Monumental Stone Letter (Kingdom Classic style) ---
        this.renderStoneMonolithLetter(ctx, letter.char, index);

      } else if (letter.state === 'shattering' || letter.state === 'crumbled') {
        // --- Shattered Ground Base ---
        ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
        ctx.beginPath();
        ctx.ellipse(2, 2, 38, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Shattered ragged stone stump on turf
        ctx.fillStyle = '#44403c';
        ctx.beginPath();
        ctx.moveTo(-32, 0);
        ctx.lineTo(-24, -14);
        ctx.lineTo(-10, -8);
        ctx.lineTo(6, -16);
        ctx.lineTo(20, -10);
        ctx.lineTo(32, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.moveTo(-28, 0);
        ctx.lineTo(-22, -11);
        ctx.lineTo(-8, -6);
        ctx.lineTo(4, -12);
        ctx.lineTo(18, -8);
        ctx.lineTo(28, 0);
        ctx.closePath();
        ctx.fill();

        // Fractured highlight ridge
        ctx.strokeStyle = '#d6d3d1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-24, -14);
        ctx.lineTo(-10, -8);
        ctx.lineTo(6, -16);
        ctx.lineTo(20, -10);
        ctx.stroke();

        // Rising dust cloud during the early crumbling phase
        if (letter.shatterTimer < 1.0) {
          const dustAlpha = Math.max(0, (1.0 - letter.shatterTimer) / 1.0) * 0.45;
          ctx.fillStyle = `rgba(168, 162, 158, ${dustAlpha * alpha})`;
          ctx.beginPath();
          ctx.ellipse(0, -20, 48, 24, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // --- Render Physics Stone Chunks & Rubble ---
        for (const chunk of letter.rubble) {
          const rx = chunk.x - letter.x;
          const ry = chunk.y - gY;

          ctx.save();
          ctx.translate(rx, ry);
          ctx.rotate(chunk.rotation);

          // Chunk ground shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(-chunk.width / 2 + 2, -chunk.height / 2 + 2.5, chunk.width, chunk.height);

          // Chunk body
          ctx.fillStyle = chunk.color;
          ctx.fillRect(-chunk.width / 2, -chunk.height / 2, chunk.width, chunk.height);

          // Sunlit beveled highlight
          ctx.fillStyle = '#e7e5e4';
          ctx.fillRect(-chunk.width / 2, -chunk.height / 2, chunk.width, 1.8);
          ctx.fillRect(-chunk.width / 2, -chunk.height / 2, 1.8, chunk.height);

          // Dark bevel
          ctx.fillStyle = '#292524';
          ctx.fillRect(-chunk.width / 2, chunk.height / 2 - 1.8, chunk.width, 1.8);
          ctx.fillRect(chunk.width / 2 - 1.8, -chunk.height / 2, 1.8, chunk.height);

          ctx.restore();
        }
      }

      ctx.restore();
    }
  }

  private renderStoneMonolithLetter(ctx: CanvasRenderingContext2D, char: string, letterIndex: number = 0) {
    ctx.save();

    // Freestanding Colossal 3D Monumental Stone Monolith Letter (Kingdom Classic Aesthetic)
    // Scale: Height ~114px (Kumandanın 3 katı!), Width ~66-72px, deep 3D lateral extrusion
    const depthShadow = '#141210';
    const depthDark = '#292524';
    const depthMid = '#44403c';
    const bodyBase = '#57534e';
    const bodyFace = '#78716c';
    const bodyLight = '#8e8882';
    const highlight = '#f5f5f4';
    const highlightSubtle = '#e7e5e4';
    const mortarColor = '#3a3734';
    const mossDark = '#14532d';
    const mossMid = '#16a34a';
    const mossBright = '#4ade80';

    const renderLetterPath = (ox: number, oy: number) => {
      switch (char) {
        case '1': {
          // Bottom wide plinth
          ctx.rect(-30 + ox, -18 + oy, 60, 18);
          // Vertical pillar
          ctx.rect(-6 + ox, -100 + oy, 20, 82);
          // Top cap block
          ctx.rect(-6 + ox, -114 + oy, 20, 14);
          // Angled beak serif
          ctx.moveTo(-6 + ox, -114 + oy);
          ctx.lineTo(-28 + ox, -86 + oy);
          ctx.lineTo(-28 + ox, -68 + oy);
          ctx.lineTo(-6 + ox, -94 + oy);
          ctx.closePath();
          break;
        }
        case '9': {
          // Top arch
          ctx.rect(-30 + ox, -114 + oy, 60, 18);
          // Left upper vertical spine
          ctx.rect(-30 + ox, -96 + oy, 18, 36);
          // Middle horizontal crossbar
          ctx.rect(-30 + ox, -64 + oy, 60, 18);
          // Right vertical spine (full height backbone)
          ctx.rect(12 + ox, -114 + oy, 18, 96);
          // Bottom curved arch
          ctx.rect(-24 + ox, -18 + oy, 54, 18);
          // Bottom left upturn hook
          ctx.rect(-24 + ox, -32 + oy, 16, 14);
          break;
        }
        case '5': {
          // Top horizontal bar
          ctx.rect(-30 + ox, -114 + oy, 60, 18);
          // Upper left spine
          ctx.rect(-30 + ox, -96 + oy, 18, 36);
          // Middle crossbar
          ctx.rect(-30 + ox, -62 + oy, 58, 18);
          // Lower right spine
          ctx.rect(12 + ox, -50 + oy, 18, 34);
          // Bottom horizontal base
          ctx.rect(-30 + ox, -18 + oy, 60, 18);
          // Bottom left hook
          ctx.rect(-30 + ox, -34 + oy, 16, 16);
          break;
        }
        case '0': {
          ctx.rect(-30 + ox, -114 + oy, 60, 18);
          ctx.rect(-30 + ox, -18 + oy, 60, 18);
          ctx.rect(-30 + ox, -96 + oy, 18, 78);
          ctx.rect(12 + ox, -96 + oy, 18, 78);
          break;
        }
        case 'Ç': {
          // Top arch
          ctx.rect(-34 + ox, -114 + oy, 68, 20);
          // Left vertical spine
          ctx.rect(-34 + ox, -114 + oy, 22, 114);
          // Bottom arch
          ctx.rect(-34 + ox, -20 + oy, 68, 20);
          // Cedilla hook below ground line
          ctx.rect(-5 + ox, 0 + oy, 12, 18);
          ctx.rect(-11 + ox, 10 + oy, 18, 8);
          break;
        }
        case 'A': {
          // Left leg
          ctx.rect(-36 + ox, -114 + oy, 22, 114);
          // Right leg
          ctx.rect(14 + ox, -114 + oy, 22, 114);
          // Top cap connecting
          ctx.rect(-36 + ox, -114 + oy, 72, 22);
          // Crossbar
          ctx.rect(-28 + ox, -56 + oy, 56, 18);
          break;
        }
        case 'N': {
          // Left upright
          ctx.rect(-36 + ox, -114 + oy, 22, 114);
          // Right upright
          ctx.rect(14 + ox, -114 + oy, 22, 114);
          // Thick Diagonal connector
          ctx.moveTo(-26 + ox, -114 + oy);
          ctx.lineTo(-6 + ox, -114 + oy);
          ctx.lineTo(28 + ox, 0 + oy);
          ctx.lineTo(8 + ox, 0 + oy);
          ctx.closePath();
          break;
        }
        case 'K': {
          // Left vertical spine
          ctx.rect(-36 + ox, -114 + oy, 22, 114);
          // Upper diagonal branch
          ctx.moveTo(-16 + ox, -60 + oy);
          ctx.lineTo(22 + ox, -114 + oy);
          ctx.lineTo(38 + ox, -110 + oy);
          ctx.lineTo(-4 + ox, -48 + oy);
          ctx.closePath();
          // Lower diagonal leg
          ctx.moveTo(-14 + ox, -64 + oy);
          ctx.lineTo(36 + ox, 0 + oy);
          ctx.lineTo(16 + ox, 0 + oy);
          ctx.lineTo(-22 + ox, -48 + oy);
          ctx.closePath();
          break;
        }
        case 'L': {
          // Left vertical spine
          ctx.rect(-34 + ox, -114 + oy, 22, 114);
          // Bottom base slab
          ctx.rect(-34 + ox, -20 + oy, 68, 20);
          break;
        }
        case 'E': {
          // Left vertical spine
          ctx.rect(-34 + ox, -114 + oy, 22, 114);
          // Top bar
          ctx.rect(-34 + ox, -114 + oy, 68, 20);
          // Middle bar
          ctx.rect(-34 + ox, -65 + oy, 48, 17);
          // Bottom bar
          ctx.rect(-34 + ox, -20 + oy, 68, 20);
          break;
        }
        default: {
          ctx.rect(-30 + ox, -114 + oy, 60, 114);
          break;
        }
      }
    };

    const renderLetterShapes = (ox: number, oy: number, fill: string) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      renderLetterPath(ox, oy);
      ctx.fill();
    };

    // 1. Multi-layered 3D Volumetric Extrusions (Right + Bottom projection)
    renderLetterShapes(10.0, 10.0, depthShadow);
    renderLetterShapes(8.0, 8.0, depthDark);
    renderLetterShapes(6.0, 6.0, depthMid);
    renderLetterShapes(3.0, 3.0, bodyBase);

    // 2. Main Stone Monolith Face
    renderLetterShapes(0, 0, bodyFace);

    // 3. Chiseled Top Light Shading
    renderLetterShapes(-1.0, -1.0, bodyLight);

    // 4. Carved Ashlar Stone Masonry Seams & Brick Joint Courses (clipped safely inside the carved stone silhouette)
    ctx.save();
    ctx.beginPath();
    renderLetterPath(0, 0);
    ctx.clip();

    ctx.strokeStyle = mortarColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    // Horizontal stone course seams
    for (let courseY = -94; courseY <= -20; courseY += 20) {
      ctx.moveTo(-36, courseY);
      ctx.lineTo(36, courseY);
    }
    // Vertical staggered stone block seams
    ctx.moveTo(-10, -114); ctx.lineTo(-10, -94);
    ctx.moveTo(10, -114); ctx.lineTo(10, -94);
    ctx.moveTo(-20, -94); ctx.lineTo(-20, -74);
    ctx.moveTo(0, -94); ctx.lineTo(0, -74);
    ctx.moveTo(20, -94); ctx.lineTo(20, -74);
    ctx.moveTo(-10, -74); ctx.lineTo(-10, -54);
    ctx.moveTo(10, -74); ctx.lineTo(10, -54);
    ctx.moveTo(-20, -54); ctx.lineTo(-20, -34);
    ctx.moveTo(0, -54); ctx.lineTo(0, -34);
    ctx.moveTo(20, -54); ctx.lineTo(20, -34);
    ctx.moveTo(-10, -34); ctx.lineTo(-10, -18);
    ctx.moveTo(10, -34); ctx.lineTo(10, -18);
    ctx.stroke();

    // Deep Weathering Fracture Fissures (strictly clipped inside the stone)
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-16, -78); ctx.lineTo(-10, -66); ctx.lineTo(-14, -52);
    ctx.moveTo(16, -92); ctx.lineTo(20, -82); ctx.lineTo(14, -70);
    ctx.stroke();

    ctx.restore();

    // 5. Sunlit Beveled Highlights (Top & Left stone facets)
    ctx.fillStyle = highlight;
    switch (char) {
      case '1':
        ctx.fillRect(-6, -114, 20, 4); // Top pillar cap rim
        ctx.fillRect(-28, -86, 5, 18); // Left angled beak facet
        ctx.fillRect(-6, -100, 4, 82); // Left pillar face rim
        ctx.fillStyle = highlightSubtle;
        ctx.fillRect(-30, -18, 60, 3.5); // Plinth base top rim
        break;
      case '9':
        ctx.fillRect(-30, -114, 60, 4); // Top arch
        ctx.fillRect(-30, -96, 4, 36); // Upper left spine rim
        ctx.fillRect(12, -114, 4, 96); // Right backbone face rim
        ctx.fillStyle = highlightSubtle;
        ctx.fillRect(-30, -64, 60, 3); // Middle bar top
        ctx.fillRect(-24, -18, 54, 3); // Bottom arch top
        break;
      case '5':
        ctx.fillRect(-30, -114, 60, 4); // Top horizontal crown
        ctx.fillRect(-30, -96, 4, 36); // Upper left spine rim
        ctx.fillStyle = highlightSubtle;
        ctx.fillRect(-30, -62, 58, 3); // Middle crossbar top
        ctx.fillRect(12, -50, 4, 34); // Lower right belly rim
        ctx.fillRect(-30, -18, 60, 3); // Bottom bar rim
        break;
      case '0':
        ctx.fillRect(-30, -114, 60, 4);
        ctx.fillRect(-30, -96, 4, 78);
        ctx.fillRect(12, -96, 4, 78);
        ctx.fillStyle = highlightSubtle;
        ctx.fillRect(-30, -18, 60, 3);
        break;
      case 'Ç':
        ctx.fillRect(-34, -114, 68, 5); // Top rim
        ctx.fillRect(-34, -114, 5, 114); // Left edge
        ctx.fillStyle = highlightSubtle;
        ctx.fillRect(-34, -20, 68, 3); // Bottom inner rim
        break;
      case 'A':
        ctx.fillRect(-36, -114, 72, 5); // Top peak
        ctx.fillRect(-36, -114, 5, 114); // Left leg edge
        ctx.fillStyle = highlightSubtle;
        ctx.fillRect(-28, -56, 56, 3); // Crossbar top
        break;
      case 'N':
        ctx.fillRect(-36, -114, 22, 5);
        ctx.fillRect(14, -114, 22, 5);
        ctx.fillRect(-36, -114, 5, 114); // Left edge
        break;
      case 'K':
        ctx.fillRect(-36, -114, 22, 5);
        ctx.fillRect(-36, -114, 5, 114); // Left edge
        ctx.fillStyle = highlightSubtle;
        ctx.fillRect(22, -114, 16, 5); // Branch tip
        break;
      case 'L':
        ctx.fillRect(-34, -114, 22, 5);
        ctx.fillRect(-34, -114, 5, 114); // Left edge
        ctx.fillStyle = highlightSubtle;
        ctx.fillRect(-34, -20, 68, 4); // Footing top
        break;
      case 'E':
        ctx.fillRect(-34, -114, 68, 5); // Top bar
        ctx.fillRect(-34, -114, 5, 114); // Left edge
        ctx.fillStyle = highlightSubtle;
        ctx.fillRect(-34, -65, 48, 3); // Middle bar top
        ctx.fillRect(-34, -20, 68, 4); // Bottom bar top
        break;
    }

    // 6. Ancient Verdant Moss & Climbing Lichen on Stone Crevices
    ctx.fillStyle = mossDark;
    ctx.fillRect(-34, -12, 14, 12);
    ctx.fillRect(18, -10, 16, 10);
    ctx.fillStyle = mossMid;
    ctx.fillRect(-32, -8, 9, 7);
    ctx.fillRect(22, -6, 10, 6);
    ctx.fillStyle = mossBright;
    ctx.fillRect(-30, -5, 5, 4);
    ctx.fillRect(24, -4, 6, 3);

    // 7. Blooming Wild Gallipoli Poppies & Crimson Climbing Roses
    const drawPoppy = (px: number, py: number) => {
      // Crimson petals
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(px - 1, py + 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Golden seed center
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(px - 1, py - 1, 2, 2);
    };

    if (char === '1') {
      drawPoppy(-18, -14);
      drawPoppy(18, -14);
      drawPoppy(4, -62);
    } else if (char === '9') {
      drawPoppy(-22, -80);
      drawPoppy(22, -68);
      drawPoppy(-14, -14);
    } else if (char === '5') {
      drawPoppy(-22, -80);
      drawPoppy(22, -36);
      drawPoppy(-18, -14);
    } else {
      drawPoppy(-22, -68);
      drawPoppy(22, -84);
      drawPoppy(-30, -14);
      drawPoppy(26, -12);
    }

    // 8. Floating Golden Celestial Crescent & Star / Imperial Crown Emblem above central letters
    if (letterIndex === 1 || letterIndex === 2 || letterIndex === 4 || letterIndex === 5 || letterIndex === 6) {
      const floatY = -135 + Math.sin(this.animTimer * 2.5 + letterIndex) * 4;

      // Soft Golden Luminous Halo
      const glow = ctx.createRadialGradient(0, floatY, 4, 0, floatY, 24);
      glow.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
      glow.addColorStop(0.5, 'rgba(245, 158, 11, 0.20)');
      glow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, floatY, 24, 0, Math.PI * 2);
      ctx.fill();

      // Golden Hilal & Yıldız (Crescent & Star)
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-2, floatY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78716c'; // Cutout for crescent
      ctx.beginPath();
      ctx.arc(1, floatY - 1, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Golden 5-point star in crescent center
      ctx.fillStyle = '#fde047';
      ctx.fillRect(4, floatY - 2, 3, 3);
      ctx.fillRect(3, floatY - 1, 5, 1);
      ctx.fillRect(5, floatY - 3, 1, 5);
    }

    ctx.restore();
  }

  // --- Build Slots Rendering ---

  private drawDestinationMarker(x: number) {
    const ctx = this.ctx;
    const gY = this.groundY;
    const pulse = (Math.sin(this.animTimer * 6) + 1) * 0.5;

    ctx.save();
    // Expanding glowing beacon ring on ground
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, gY - 2, 16 + pulse * 8, 6 + pulse * 3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Beacon flag
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(x, gY - 32);
    ctx.lineTo(x + 14, gY - 26);
    ctx.lineTo(x, gY - 20);
    ctx.closePath();
    ctx.fill();

    // Flag pole
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(x - 1, gY - 32, 2, 32);
    ctx.restore();
  }

  private drawBuildSlots(slots: BuildSlot[], camX: number, activeSlot: BuildSlot | null) {
    const ctx = this.ctx;
    const gY = this.groundY;

    // Determine current Headquarters Level (1 = Odun/Ahşap, 2 = Gelişmiş Odun/Kütük, 3 = Kesme Taş Tabya)
    const hqSlot = slots.find((s) => s.id === 'hq_main');
    const hqTier = hqSlot ? hqSlot.level : 1;

    // Frontier boundary detection for Kingdom-style defense flags (Düşmana en yakın siper veya tel)
    const leftDefs = slots.filter((s) => s.side === 'left' && (s.type === 'trench' || s.type === 'barbed_wire') && s.level > 0 && !s.underConstruction);
    const rightDefs = slots.filter((s) => s.side === 'right' && (s.type === 'trench' || s.type === 'barbed_wire') && s.level > 0 && !s.underConstruction);
    const leftFrontier = leftDefs.length > 0 ? leftDefs.reduce((min, s) => s.x < min.x ? s : min, leftDefs[0]) : null;
    const rightFrontier = rightDefs.length > 0 ? rightDefs.reduce((max, s) => s.x > max.x ? s : max, rightDefs[0]) : null;

    for (const slot of slots) {
      const sx = slot.x - camX;
      if (sx < -150 || sx > this.width + 150) continue;

      const isFocused = activeSlot && activeSlot.id === slot.id;

      // Slot Highlight Aura when commander is close
      if (isFocused) {
        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(sx, gY - 22, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      switch (slot.type) {
        case 'headquarters':
          this.drawHeadquarters(sx, gY, slot);
          break;
        case 'assault_banner':
          if (hqTier >= 3) {
            this.drawAssaultBanner(sx, gY, slot);
          }
          break;
        case 'wild_horse':
          this.drawWildHorseSlot(sx, gY, slot, isFocused);
          break;
        case 'tethered_horse':
          this.drawTetheredHorseSlot(sx, gY, slot, isFocused);
          break;
        case 'trench':
          this.drawTrench(sx, gY, slot, hqTier);
          break;
        case 'barbed_wire':
          this.drawBarbedWire(sx, gY, slot, hqTier);
          break;
        case 'machine_gun':
          this.drawMachineGunNest(sx, gY, slot, hqTier);
          break;
        case 'artillery':
          this.drawArtilleryEmplacement(sx, gY, slot, hqTier);
          break;
        case 'watchtower':
          this.drawWatchtower(sx, gY, slot, hqTier);
          break;
        case 'hospital':
          this.drawHospital(sx, gY, slot, hqTier);
          break;
        case 'armory':
          this.drawArmory(sx, gY, slot, hqTier);
          break;
        case 'scavenge_wood':
          this.drawTreeGrove(sx, gY, slot);
          break;
        case 'scavenge_iron':
          this.drawIronQuarry(sx, gY, slot);
          break;
        case 'recruit_camp':
          this.drawRecruitCamp(sx, gY, slot, hqTier);
          break;
        case 'shrine_relic':
          this.drawRelicShrine(sx, gY, slot);
          break;
        case 'treasure_chest':
          this.drawTreasureChest(sx, gY, slot);
          break;
      }

      // Frontier Boundary Flag (Düşmana en yakın siper veya telde sınır sancağı)
      if (slot === leftFrontier || slot === rightFrontier) {
        this.drawFrontierFlag(sx, gY, slot.side === 'left' ? 'left' : 'right');
      }

      // Period Kerosene Storm Lantern (Gece siperler ve binalarda döneme uygun gaz lambası aydınlatması)
      if (
        slot.level >= 1 &&
        !slot.underConstruction &&
        (slot.type === 'trench' || slot.type === 'machine_gun' || slot.type === 'artillery' || slot.type === 'hospital' || slot.type === 'armory')
      ) {
        const lanternOffset = slot.side === 'left' ? -26 : 26;
        this.drawGasLantern(sx + lanternOffset, gY - 14);
      }

      // 3-Stage Structural Construction & Billowing Dust Cloud Animation
      if (slot.underConstruction) {
        this.draw3StageConstruction(sx, gY, slot, hqTier);
      }

      // Draw Action Badge Label above Slot for instant player readability
      if (!slot.underConstruction) {
        this.drawSlotActionBadge(sx, gY, slot, isFocused);
      }
    }
  }

  private drawSlotActionBadge(x: number, y: number, slot: BuildSlot, isFocused: boolean | null) {
    // Only show interaction when commander is near the slot (Kingdom style)
    if (!isFocused) return;
    if (slot.isScavenged) return;
    if (slot.underConstruction) return;
    if (slot.isBlockedByForest) return;

    let totalCoins = 0;
    let deposited = slot.coinsDeposited || 0;
    let offsetY = 48;

    if (slot.type === 'shrine_relic') {
      if (slot.level >= 2) return; // Active relic has no sockets
      totalCoins = 8;
      offsetY = 66;
    } else if (slot.type === 'scavenge_wood') {
      if (slot.isMarkedForChop || slot.isScavenged) return;
      totalCoins = 1;
      offsetY = 74;
    } else if (slot.type === 'recruit_camp') {
      if ((slot.availableRecruits ?? 0) > 0) {
        totalCoins = 1;
        offsetY = 46;
      } else {
        if ((slot.coinsDeposited || 0) >= 4) return;
        totalCoins = 1;
        offsetY = 46;
      }
    } else if (slot.type === 'armory') {
      const currentR = slot.availableRifles ?? 0;
      const maxR = slot.maxRifles ?? 6;
      if (currentR >= maxR) return; // Bench full (6/6)
      totalCoins = 2; // 2 coins to add 1 Mauser rifle to the bench!
      offsetY = 62;
    } else if (slot.health < slot.maxHealth && slot.level > 0) {
      totalCoins = 1; // 1 Mecidiye repair coin for damaged structures
      deposited = slot.repairCoinsDeposited || 0;
      if (slot.type === 'watchtower') offsetY = 72;
      else if (slot.id === 'hq_main') offsetY = 74;
      else if (slot.type === 'artillery') offsetY = 52;
      else if (slot.type === 'machine_gun') offsetY = 46;
      else if (slot.type === 'trench') offsetY = 38;
      else if (slot.type === 'barbed_wire') offsetY = 34;
      else if (slot.type === 'hospital') offsetY = 62;
      else offsetY = 48;
    } else if (slot.id === 'hq_main') {
      if (slot.level < slot.maxLevel) {
        totalCoins = slot.costMecidiye;
        offsetY = 74;
      } else {
        totalCoins = 0; // Son seviye karargahta sikke boşluğu görünmez
      }
    } else if (slot.level < slot.maxLevel) {
      totalCoins = slot.costMecidiye;
      if (slot.type === 'watchtower') offsetY = 72;
      else if (slot.type === 'artillery') offsetY = 52;
      else if (slot.type === 'machine_gun') offsetY = 46;
      else if (slot.type === 'trench') offsetY = 38;
      else if (slot.type === 'barbed_wire') offsetY = 34;
      else if (slot.type === 'hospital') offsetY = 62;
      else offsetY = 48;
    }

    if (totalCoins <= 0) return;

    const ctx = this.ctx;
    ctx.save();

    // Kingdom Two Crowns style: Pure empty and filled circular coin sockets hovering overhead
    const spacing = 15;
    const totalW = (totalCoins - 1) * spacing;
    const startX = x - totalW / 2;
    const socketY = y - offsetY;

    for (let i = 0; i < totalCoins; i++) {
      const cx = startX + i * spacing;
      const cy = socketY;
      const isFilled = i < deposited;

      if (isFilled) {
        // Filled with golden Mecidiye coin
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Inner coin core
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Specular glint
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 1.5, cy - 2.5, 1.5, 1.5);
      } else {
        // Kingdom empty coin socket: dark hollow with crisp gold ring
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(254, 240, 138, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Dark hollow indentation
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  /**
   * Realistic Herbivore Grazing Cycle Engine
   * Calculates natural ~8s grazing cycle: Alert surveying -> Smoothly lowers head -> Ground grazing with rhythmic chewing -> Smoothly raises head -> Alert surveying
   */
  private getRealisticGrazingCycle(seed: number = 0, isHorse: boolean = true): {
    grazeBlend: number;
    chewOffset: number;
    isGrazingFloor: boolean;
    earTwitch: number;
  } {
    const cycleUnits = isHorse ? 24.0 : 19.0;
    const progress = ((this.animTimer + Math.abs(seed) * 3.7) % cycleUnits) / cycleUnits;

    let grazeBlend = 0;
    let isGrazingFloor = false;

    if (progress < 0.16) {
      grazeBlend = 0;
    } else if (progress < 0.28) {
      const t = (progress - 0.16) / 0.12;
      grazeBlend = 0.5 - 0.5 * Math.cos(t * Math.PI);
    } else if (progress < 0.72) {
      grazeBlend = 1.0;
      isGrazingFloor = true;
    } else if (progress < 0.84) {
      const t = (progress - 0.72) / 0.12;
      grazeBlend = 0.5 + 0.5 * Math.cos(t * Math.PI);
    } else {
      grazeBlend = 0;
    }

    const chewOffset = isGrazingFloor ? Math.sin(this.animTimer * 1.6 + seed) * 1.4 : 0;
    const earTwitch = Math.sin(this.animTimer * 1.8 + seed * 2) * 1.5;

    return { grazeBlend, chewOffset, isGrazingFloor, earTwitch };
  }

  /**
   * 3-Stage Structural Growth and Billowing Dust Cloud Construction Animation
   * Distinct visuals matching HQ Tier: Odun (Pine Logs), Kütük (Heavy Beams & Sandbags), Taş (Dressed Ashlar Blocks)
   */
  private draw3StageConstruction(x: number, y: number, slot: BuildSlot, hqTier: number = 1) {
    const ctx = this.ctx;
    const prog = Math.min(1.0, Math.max(0.01, slot.constructionProgress || 0));
    ctx.save();

    // Determine Stage
    let stage = 1;
    let stageTitle = '';
    if (prog < 0.35) {
      stage = 1;
      stageTitle = `[1/3] Temel ve Kazı... %${Math.floor(prog * 100)}`;
    } else if (prog < 0.75) {
      stage = 2;
      stageTitle = `[2/3] Gövde ve Tahkimat... %${Math.floor(prog * 100)}`;
    } else {
      stage = 3;
      stageTitle = `[3/3] Üst Tabya ve Parapet... %${Math.floor(prog * 100)}`;
    }

    // Colors according to Karargah Tier
    let dustBase = 'rgba(180, 83, 9, 0.45)';
    let dustSecondary = 'rgba(120, 53, 15, 0.35)';
    let primaryMat = '#78350f';
    let secondaryMat = '#92400e';
    let sparkColor = '#f59e0b';

    if (hqTier === 2) {
      dustBase = 'rgba(146, 64, 14, 0.5)';
      dustSecondary = 'rgba(90, 40, 10, 0.4)';
      primaryMat = '#451a03';
      secondaryMat = '#78350f';
      sparkColor = '#fbbf24';
    } else if (hqTier === 3) {
      dustBase = 'rgba(226, 232, 240, 0.55)';
      dustSecondary = 'rgba(148, 163, 184, 0.45)';
      primaryMat = '#64748b';
      secondaryMat = '#475569';
      sparkColor = '#f8fafc';
    }

    // 1. Excavation Pit & Structural Base Growth
    if (stage === 1) {
      // Stage 1: Ground Pit Trench & Foundation Pickets (15% to 40% height)
      const stageT = prog / 0.35;
      const moundH = 4 + stageT * 8;

      ctx.fillStyle = '#3e1a06';
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 38, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dug dirt berms
      ctx.fillStyle = '#713f12';
      ctx.beginPath();
      ctx.ellipse(x - 22, y - 3, 14, moundH * 0.7, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 22, y - 3, 14, moundH * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Driven foundation pickets / stone footings
      if (hqTier === 3) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(x - 26, y - 10, 12, 10);
        ctx.fillRect(x - 8, y - 12, 16, 12);
        ctx.fillRect(x + 14, y - 10, 12, 10);
      } else {
        ctx.fillStyle = primaryMat;
        ctx.fillRect(x - 25, y - 16, 5, 16);
        ctx.fillRect(x - 10, y - 20, 6, 20);
        ctx.fillRect(x + 5, y - 20, 6, 20);
        ctx.fillRect(x + 20, y - 16, 5, 16);
      }
    } else if (stage === 2) {
      // Stage 2: Structural Framework, Shoring & Scaffolding (40% to 80% height)
      const stageT = (prog - 0.35) / 0.40;
      const structH = 16 + stageT * 18;

      // Base solid structure rising
      if (hqTier === 3) {
        // Cut stone ashlar courses
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x - 30, y - structH, 60, structH);
        ctx.fillStyle = '#334155';
        for (let row = y - structH; row < y; row += 8) {
          ctx.fillRect(x - 30, row, 60, 1.5);
        }
        for (let col = x - 20; col < x + 30; col += 15) {
          ctx.fillRect(col, y - structH, 1.5, structH);
        }
      } else {
        // Timber revetment shoring planks
        ctx.fillStyle = secondaryMat;
        ctx.fillRect(x - 28, y - structH, 56, structH);
        ctx.fillStyle = primaryMat;
        for (let row = y - structH; row < y; row += 6) {
          ctx.fillRect(x - 28, row, 56, 1.5);
        }
        // Vertical support posts
        ctx.fillRect(x - 24, y - structH - 4, 5, structH + 4);
        ctx.fillRect(x - 2, y - structH - 6, 6, structH + 6);
        ctx.fillRect(x + 19, y - structH - 4, 5, structH + 4);
      }

      // Construction timber scaffolding & diagonal cross bracing
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(x - 32, y - structH - 8, 64, structH + 8);
      ctx.beginPath();
      ctx.moveTo(x - 32, y - structH - 8);
      ctx.lineTo(x + 32, y);
      ctx.moveTo(x + 32, y - structH - 8);
      ctx.lineTo(x - 32, y);
      ctx.stroke();
    } else {
      // Stage 3: Upper Parapet, Sandbags, Embrasures & Finishing (80% to 100% height)
      const stageT = (prog - 0.75) / 0.25;

      // Full structure
      if (hqTier === 3) {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x - 32, y - 34, 64, 34);
        ctx.fillStyle = '#475569';
        // Stone embrasures
        ctx.fillRect(x - 32, y - 40, 16, 8);
        ctx.fillRect(x + 16, y - 40, 16, 8);
        // Stone coping cap
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x - 34, y - 42, 68, 4);
      } else {
        ctx.fillStyle = secondaryMat;
        ctx.fillRect(x - 30, y - 30, 60, 30);
        // Parapet sandbags laying in place
        const bagCount = Math.min(5, 2 + Math.floor(stageT * 4));
        ctx.fillStyle = '#a16207';
        for (let b = 0; b < bagCount; b++) {
          ctx.fillRect(x - 28 + b * 11, y - 36, 10, 6);
        }
      }

      // Work mallet / trowel animated
      const strikeAngle = Math.sin(this.animTimer * 8) * 0.4;
      ctx.save();
      ctx.translate(x + 14, y - 40);
      ctx.rotate(strikeAngle);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, -10, 3, 10);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-3, -13, 9, 4);
      ctx.restore();
    }

    // 2. Volumetric Billowing 3-Stage Dust Clouds (Toz Bulutu Sistemi)
    const puffCount = stage === 1 ? 8 : (stage === 2 ? 10 : 6);
    for (let p = 0; p < puffCount; p++) {
      const pPhase = (this.animTimer * 2.0 + p * 0.85) % (Math.PI * 2);
      const puffLife = Math.sin(pPhase);
      if (puffLife > 0.05) {
        const radius = (8 + p * 2.2) * (0.6 + puffLife * 0.7);
        const driftX = Math.sin(this.animTimer * 1.4 + p) * 16 + (p - puffCount / 2) * 7;
        const driftY = -Math.abs(puffLife) * (stage === 1 ? 22 : (stage === 2 ? 36 : 46));

        ctx.fillStyle = p % 2 === 0 ? dustBase : dustSecondary;
        ctx.beginPath();
        ctx.arc(x + driftX, y + driftY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Flying Woodchips, Sawdust & Chisel Sparks
    if (Math.sin(this.animTimer * 12) > 0.2) {
      ctx.fillStyle = sparkColor;
      const sparkY = stage === 1 ? y - 12 : (stage === 2 ? y - 26 : y - 38);
      ctx.fillRect(x - 12 + Math.sin(this.animTimer * 9) * 16, sparkY - 6, 2.5, 2.5);
      ctx.fillRect(x + 8 + Math.cos(this.animTimer * 9) * 16, sparkY - 10, 2, 2);
    }

    ctx.restore();
  }

  private drawHeadquarters(x: number, y: number, slot: BuildSlot) {
    const ctx = this.ctx;
    ctx.save();

    if (slot.level === 1) {
      // Tier 1: Odun Karargahı (Rustic Field Officer Tent with Raw Pine Log Pickets & Flag)
      // Base earth and timber foundation
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - 48, y - 6, 96, 6);

      // Raw wood log frame poles
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 42, y - 48, 5, 42);
      ctx.fillRect(x + 37, y - 48, 5, 42);
      ctx.fillRect(x - 2, y - 58, 4, 52); // Center pole

      // Historic canvas tent body
      ctx.fillStyle = '#d6c8a2';
      ctx.beginPath();
      ctx.moveTo(x, y - 56);
      ctx.lineTo(x - 44, y);
      ctx.lineTo(x + 44, y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Tent Door flap (open revealing wooden map table & oil lamp)
      ctx.fillStyle = '#26160c';
      ctx.beginPath();
      ctx.moveTo(x, y - 42);
      ctx.lineTo(x - 14, y);
      ctx.lineTo(x + 14, y);
      ctx.closePath();
      ctx.fill();

      // Interior warm map lantern glow
      ctx.fillStyle = 'rgba(251, 191, 36, 0.5)';
      ctx.beginPath();
      ctx.arc(x, y - 18, 10, 0, Math.PI * 2);
      ctx.fill();

      // Wooden Map Table inside
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 8, y - 12, 16, 4);

      // Raw Timber stakes along perimeter
      ctx.fillStyle = '#572c0c';
      ctx.fillRect(x - 48, y - 18, 3, 18);
      ctx.fillRect(x + 45, y - 18, 3, 18);

      // Wooden Flagpole & Ottoman Flag
      ctx.fillStyle = '#572c0c';
      ctx.fillRect(x - 2, y - 82, 4, 34);
      this.drawOttomanFlag(x + 2, y - 82, 1.0);
    } else if (slot.level === 2) {
      // Tier 2: Gelişmiş Odun / Kereste & Kütük Tahkimatlı Komuta Bunkeri
      // Heavy timber blockhouse base
      ctx.fillStyle = '#572c0c';
      ctx.fillRect(x - 58, y - 48, 116, 48);

      // Horizontal interlocking timber log walls (Çam kütükleri)
      for (let ly = y - 48; ly < y; ly += 8) {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x - 58, ly, 116, 7);
        ctx.fillStyle = '#3f1f07';
        ctx.fillRect(x - 58, ly + 6, 116, 1); // log groove
        // Log end rings
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.arc(x - 56, ly + 3.5, 3, 0, Math.PI * 2);
        ctx.arc(x + 56, ly + 3.5, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sturdy double-layer log roof with earth turf
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - 62, y - 56, 124, 8);
      this.drawSandbagRow(x - 58, y - 64, 6);

      // Armoured wooden commander door with iron hinges
      ctx.fillStyle = '#3a1e05';
      ctx.fillRect(x - 14, y - 38, 28, 38);
      ctx.fillStyle = '#1e293b'; // Iron bands
      ctx.fillRect(x - 14, y - 30, 28, 3);
      ctx.fillRect(x - 14, y - 12, 28, 3);

      // Field telegraph mast with porcelain insulators
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x + 44, y - 90, 4, 52);
      ctx.fillStyle = '#e2e8f0'; // Porcelain insulators
      ctx.fillRect(x + 36, y - 82, 20, 2);
      ctx.fillRect(x + 38, y - 72, 16, 2);

      // Grand Ottoman Flag
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 2, y - 96, 4, 40);
      this.drawOttomanFlag(x + 2, y - 96, 1.3);
    } else {
      // Tier 3: Kesme Taş ve Mazgallı Ağır Taş Tabya (Stone Fortress Redoubt)
      // Masterwork cut stone block masonry (Kesme taş duvarlar)
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 72, y - 62, 144, 62);

      // Stone block courses and mortar lines
      ctx.fillStyle = '#1e293b';
      const blockH = 10;
      for (let row = 0; row < 6; row++) {
        const by = y - 62 + row * blockH;
        ctx.fillRect(x - 72, by + blockH - 1, 144, 1);
        const offset = (row % 2 === 0) ? 0 : 12;
        for (let bx = x - 72 + offset; bx < x + 72; bx += 24) {
          ctx.fillRect(bx, by, 1.5, blockH);
        }
      }

      // Stone crenellations / battlements on parapet (Mazgallar)
      ctx.fillStyle = '#475569';
      for (let c = -70; c <= 54; c += 24) {
        ctx.fillRect(x + c, y - 72, 16, 10);
      }

      // Parapet walk where 2 elite guards stand
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 72, y - 64, 144, 3);

      // Heavy Vaulted Stone Arch & Iron Studded Door
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y - 36, 16, Math.PI, 0);
      ctx.lineTo(x + 16, y);
      ctx.lineTo(x - 16, y);
      ctx.closePath();
      ctx.fill();

      // Heavy Iron Rivets on Door
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x - 10, y - 28, 20, 2);
      ctx.fillRect(x - 10, y - 14, 20, 2);

      // Stone corner buttresses
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(x - 72, y);
      ctx.lineTo(x - 72, y - 50);
      ctx.lineTo(x - 80, y);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 72, y);
      ctx.lineTo(x + 72, y - 50);
      ctx.lineTo(x + 80, y);
      ctx.closePath();
      ctx.fill();

      // Imperial Gold Crescent Finial Flagpole & Massive Flag
      ctx.fillStyle = '#f59e0b'; // Gold finial
      ctx.beginPath();
      ctx.arc(x, y - 110, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#64748b'; // Steel flagpole
      ctx.fillRect(x - 2, y - 106, 4, 44);
      this.drawOttomanFlag(x + 2, y - 106, 1.6);
    }

    // Health Bar if damaged
    if (slot.health < slot.maxHealth) {
      this.drawHealthBar(x, y - 95, slot.health, slot.maxHealth);
    }

    ctx.restore();
  }

  private drawAssaultBanner(x: number, y: number, slot: BuildSlot) {
    const ctx = this.ctx;
    ctx.save();

    // Stone / Wood pedestal base
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 22, y - 10, 44, 10);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 24, y - 3, 48, 3);

    // Banner Flagpole
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 2, y - 80, 4, 70);

    // Brass Crescent Finial top
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x, y - 82, 5, 0, Math.PI * 2);
    ctx.fill();

    // Red Ottoman Assault Banner
    const wave = Math.sin(this.animTimer * 3.2 + (slot.side === 'left' ? 0.5 : 1.5)) * 2.5;
    const isLeft = slot.side === 'left';
    const flagDir = isLeft ? -1 : 1;

    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(x + 2 * flagDir, y - 80);
    ctx.lineTo(x + 32 * flagDir, y - 70 + wave);
    ctx.lineTo(x + 24 * flagDir, y - 58);
    ctx.lineTo(x + 32 * flagDir, y - 46 + wave);
    ctx.lineTo(x + 2 * flagDir, y - 46);
    ctx.closePath();
    ctx.fill();

    // Crescent and Star on banner
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(x + 14 * flagDir, y - 63 + wave * 0.5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.arc(x + 16 * flagDir, y - 64 + wave * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Label on Pole
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${isLeft ? 'SOL' : 'SAĞ'} TAARRUZ`, x, y - 32);

    // Display Kingdom-style 4 Coin Socket Slots on pedestal
    const coinsDeposited = slot.coinsDeposited || 0;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x - 26, y - 24, 52, 12);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 26, y - 24, 52, 12);

    for (let i = 0; i < 4; i++) {
      const cx = x - 19.5 + i * 13;
      const cy = y - 18;

      // Socket ring
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.stroke();

      if (i < coinsDeposited) {
        // Filled glowing Mecidiye Coin
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx, cy, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx - 1, cy - 1, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Empty coin slot
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawOttomanFlag(x: number, y: number, scale = 1.0) {
    const ctx = this.ctx;
    const wave = Math.sin(this.animTimer * 2.5) * 2;
    const w = 24 * scale;
    const h = 16 * scale;

    ctx.save();
    ctx.fillStyle = '#dc2626'; // Ottoman Red
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + wave);
    ctx.lineTo(x + w, y + h + wave);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();

    // White Crescent & Star
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + w * 0.45, y + h * 0.5 + wave * 0.5, 4 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Cutout
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(x + w * 0.52, y + h * 0.46 + wave * 0.5, 3.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Star
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + w * 0.65, y + h * 0.45 + wave * 0.5, 2 * scale, 2 * scale);
    ctx.restore();
  }

  // --- Frontier Boundary Flag (Kingdom Two Crowns style Border Banner) ---
  private drawFrontierFlag(x: number, y: number, side: 'left' | 'right') {
    const ctx = this.ctx;
    const wave = Math.sin(this.animTimer * 3.5 + (side === 'left' ? 0.8 : 2.2)) * 2.5;
    const poleH = 48;

    ctx.save();
    // Sandbag footing
    this.drawSandbagRow(x - 12, y - 6, 2);

    // Tall sturdy timber flagpole
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 1.5, y - poleH, 3, poleH);

    // Gold brass Hilal finial
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x, y - poleH - 3, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Red Ottoman boundary flag
    const flagW = 28;
    const flagH = 18;
    const flagDir = side === 'left' ? -1 : 1;
    const flagX = x + (flagDir === 1 ? 1.5 : -1.5);

    ctx.fillStyle = '#dc2626'; // Imperial Ottoman Crimson
    ctx.beginPath();
    ctx.moveTo(flagX, y - poleH);
    ctx.lineTo(flagX + flagDir * flagW, y - poleH + wave * 0.6);
    ctx.lineTo(flagX + flagDir * flagW, y - poleH + flagH + wave);
    ctx.lineTo(flagX, y - poleH + flagH);
    ctx.closePath();
    ctx.fill();

    // White Crescent & Star
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(flagX + flagDir * 12, y - poleH + 9 + wave * 0.7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(flagX + flagDir * 14, y - poleH + 8.5 + wave * 0.7, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(flagX + flagDir * 18, y - poleH + 8 + wave * 0.7, 2.5, 2.5);

    // Wooden frontier plaque: "HUDUT"
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 18, y - 22, 36, 12);
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 18, y - 22, 36, 12);

    ctx.font = 'bold 8px "Cinzel", system-ui, sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HUDUT', x, y - 16);

    // Period Gas Lantern at the flag base
    this.drawGasLantern(x + (flagDir === 1 ? 12 : -12), y - 10);

    ctx.restore();
  }

  // --- Historical Period Kerosene Storm Lantern (Döneme Uygun Gaz Lambası) ---
  private drawGasLantern(x: number, y: number) {
    const ctx = this.ctx;
    ctx.save();
    // Iron hanging bracket / hook
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x, y - 8);
    ctx.stroke();

    // Top metal vent cap
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 3, y - 8, 6, 2.5);

    // Glass hurricane chimney
    ctx.fillStyle = 'rgba(254, 240, 138, 0.45)';
    ctx.fillRect(x - 3.5, y - 5.5, 7, 7);

    // Glowing kerosene flame with organic flicker
    const flicker = Math.sin(this.animTimer * 12) * 0.8;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(x, y - 2 + flicker * 0.4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(x, y - 1 + flicker * 0.4, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Brass oil reservoir base
    ctx.fillStyle = '#b45309';
    ctx.fillRect(x - 4, y + 1.5, 8, 3.5);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(x - 5, y + 4, 10, 1.5);

    // Warm radial glow aura around the lantern
    const aura = ctx.createRadialGradient(x, y - 1, 1, x, y - 1, 20);
    aura.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
    aura.addColorStop(0.5, 'rgba(245, 158, 11, 0.22)');
    aura.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y - 1, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- Allied Landing Craft Beachheads (İtilaf Çıkartma Gemisi SS River Clyde & Çıkartma Mevzileri) ---
  private drawLandingCamps(camps: LandingCamp[], camX: number, state?: GameState) {
    const ctx = this.ctx;
    const gY = this.groundY;

    for (const camp of camps) {
      const sx = camp.x - camX;
      if (sx < -200 || sx > this.width + 200) continue;

      const dir = camp.side === 'left' ? 1 : -1;
      const isDestroyed = camp.isDestroyed;

      ctx.save();

      // 1. Shoreline Sandy Embankment & Breakers
      ctx.fillStyle = '#e2d4b7'; // Sand spit
      ctx.beginPath();
      ctx.ellipse(sx, gY + 4, 85, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Water surf lapping against hull & beach
      const waveOffset = Math.sin(this.animTimer * 3 + (camp.x || 0) * 0.005) * 3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(sx - dir * 25, gY + 12 + waveOffset, 55, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. HISTORIC TIMBER JETTY / DOCK PIER (İskele Ahşap Kazıkları ve Rıhtım İskelesi)
      const pierStartX = sx + dir * 35;
      const pierEndX = sx + dir * 96;
      ctx.fillStyle = '#3e1a06'; // Sea-weathered pine pilings
      for (let px = Math.min(pierStartX, pierEndX); px <= Math.max(pierStartX, pierEndX); px += 18) {
        ctx.fillRect(px - 3, gY - 6, 6, 24);
        // Barnacle / green seaweed waterline marks
        ctx.fillStyle = '#166534';
        ctx.fillRect(px - 3, gY + 6, 6, 4);
        ctx.fillStyle = '#3e1a06';
      }

      // Wooden deck planks of the landing pier
      ctx.fillStyle = '#78350f';
      ctx.fillRect(Math.min(pierStartX, pierEndX) - 4, gY - 7, Math.abs(pierEndX - pierStartX) + 8, 5);
      ctx.fillStyle = '#542605';
      for (let px = Math.min(pierStartX, pierEndX); px <= Math.max(pierStartX, pierEndX); px += 6) {
        ctx.fillRect(px, gY - 7, 1.2, 5);
      }

      // Mooring bollard with rope coil on pier
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(pierEndX - dir * 4, gY - 13, 5, 6);
      ctx.fillStyle = '#d97706'; // Manila rope
      ctx.beginPath();
      ctx.arc(pierEndX - dir * 2, gY - 10, 4, 0, Math.PI * 2);
      ctx.stroke();

      // Moored wooden assault cutter boat (Çıkarma Filikası)
      const boatX = sx - dir * 55;
      ctx.fillStyle = '#542605';
      ctx.beginPath();
      ctx.ellipse(boatX, gY + 8, 22, 5, dir * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#78350f';
      ctx.fillRect(boatX - 14, gY + 4, 28, 2.5); // Thwarts/seats
      // Oars resting across
      ctx.fillStyle = '#b45309';
      ctx.fillRect(boatX - 10, gY + 1, 24, 1.5);

      if (!isDestroyed) {
        // --- ACTIVE HISTORIC BRITISH TROOP TRANSPORT "SS RIVER CLYDE" / MASSIVE ARMORED LANDING SHIP ---
        // Significantly enlarged, realistic historical scale (240px wide, 85px high structure)

        // 1. Heavy Battleship Steel Hull (Alt & Üst Borda Gövdesi)
        const hullStartX = sx - dir * 125;
        const hullEndX = sx + dir * 105;
        const bowTipX = sx + dir * 120;
        const sternTipX = sx - dir * 115;

        // Underwater keel & hull shadow
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.moveTo(hullStartX, gY);
        ctx.lineTo(hullEndX, gY);
        ctx.lineTo(bowTipX, gY - 32);
        ctx.lineTo(sternTipX, gY - 32);
        ctx.closePath();
        ctx.fill();

        // Armored Steel Upper Plating (Battleship Dark Slate)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(sternTipX, gY - 32);
        ctx.lineTo(bowTipX, gY - 32);
        ctx.lineTo(bowTipX - dir * 10, gY - 42);
        ctx.lineTo(sternTipX + dir * 10, gY - 42);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Vertical Armor Bulkhead Stiffeners & Rivet Lines
        for (let p = -95; p <= 95; p += 19) {
          const rx = sx + p;
          ctx.fillStyle = '#334155';
          ctx.fillRect(rx, gY - 40, 3, 38);
          // High-contrast steel rivets
          ctx.fillStyle = '#64748b';
          ctx.fillRect(rx, gY - 36, 3, 2.5);
          ctx.fillRect(rx, gY - 26, 3, 2.5);
          ctx.fillRect(rx, gY - 16, 3, 2.5);
          ctx.fillRect(rx, gY - 6, 3, 2.5);
        }

        // 2. Historic Sally Ports (Kömür gemisinin bordasına açılmış çelik taarruz çıkış kapıları)
        ctx.fillStyle = '#0a0f1d';
        ctx.fillRect(sx - dir * 35, gY - 28, 18, 22);
        ctx.fillRect(sx + dir * 25, gY - 28, 18, 22);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - dir * 35, gY - 28, 18, 22);
        ctx.strokeRect(sx + dir * 25, gY - 28, 18, 22);

        // Heavy Steel Assault Ramps (Kumsala uzanan geniş çıkarma rampaları)
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(sx + dir * 25, gY - 6);
        ctx.lineTo(sx + dir * 75, gY + 4);
        ctx.lineTo(sx + dir * 75, gY + 8);
        ctx.lineTo(sx + dir * 25, gY - 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#334155';
        for (let step = 0; step < 4; step++) {
          ctx.fillRect(sx + dir * (35 + step * 10), gY - 3 + step * 2.5, 3, 3);
        }

        // Bow Main Assault Ramp
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(bowTipX - dir * 5, gY - 22);
        ctx.lineTo(bowTipX + dir * 38, gY + 3);
        ctx.lineTo(bowTipX + dir * 38, gY + 7);
        ctx.lineTo(bowTipX - dir * 5, gY - 18);
        ctx.closePath();
        ctx.fill();

        // 3. Two-Tier Armored Superstructure & Bridge (Çift Katlı Kumanda Köprüsü)
        // Lower Deckhouse
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(sx - dir * 70, gY - 60, 52, 20);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(sx - dir * 70, gY - 60, 52, 20);

        // Upper Wheelhouse / Bridge
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx - dir * 65, gY - 76, 38, 18);
        ctx.strokeStyle = '#475569';
        ctx.strokeRect(sx - dir * 65, gY - 76, 38, 18);

        // Bridge Brass Slit Windows
        ctx.fillStyle = '#fde047';
        for (let w = 0; w < 3; w++) {
          ctx.fillRect(sx - dir * (60 - w * 11), gY - 71, 7, 4);
        }

        // 4. Naval Carbon-Arc Searchlight on Bridge Roof (Projektör Işığı)
        const lightX = sx - dir * 50;
        const lightY = gY - 84;
        ctx.fillStyle = '#475569';
        ctx.fillRect(lightX - 4, lightY, 9, 8);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(lightX + dir * 3, lightY + 4, 4, 0, Math.PI * 2);
        ctx.fill();

        // Powerful Searchlight Beam sweeping across the battlefield at night
        const isNight = state && state.dayProgress > 0.55;
        if (isNight) {
          const sweepAngle = Math.sin(this.animTimer * 1.5 + (camp.x || 0) * 0.005) * 0.25;
          ctx.save();
          ctx.translate(lightX + dir * 3, lightY + 4);
          ctx.rotate(dir * (0.35 + sweepAngle));
          const beamGrad = ctx.createLinearGradient(0, 0, 320, 0);
          beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
          beamGrad.addColorStop(0.3, 'rgba(253, 224, 71, 0.2)');
          beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
          ctx.fillStyle = beamGrad;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(320, -55);
          ctx.lineTo(320, 55);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // 5. Massive Coal-Fired Steam Funnel & Puffed Smoke (Buhar Bacası)
        const funnelX = sx - dir * 10;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(funnelX - 8, gY - 72, 18, 32);
        // Red Funnel Band
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(funnelX - 8, gY - 67, 18, 7);
        // Steam Pipe on Funnel Side
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(funnelX + dir * 10, gY - 76, 3, 34);

        // Animated Realistic Puffed Black/Grey Steam Plumes
        for (let i = 0; i < 3; i++) {
          const puffProgress = ((this.animTimer * 4 + i * 1.2) % 3.6);
          const pY = gY - 80 - puffProgress * 15;
          const pX = funnelX + dir * (puffProgress * 10);
          const pR = 8 + puffProgress * 6;
          ctx.fillStyle = `rgba(100, 116, 139, ${Math.max(0, 0.6 - puffProgress * 0.15)})`;
          ctx.beginPath();
          ctx.arc(pX, pY, pR, 0, Math.PI * 2);
          ctx.fill();
        }

        // 6. Suspended Lifeboats on Steel Davits (Mataforalara Asılı Yedek Filikalar)
        const davitX1 = sx - dir * 15;
        const davitX2 = sx + dir * 55;
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        // Davit arms
        ctx.beginPath();
        ctx.moveTo(davitX1 - 10, gY - 42);
        ctx.lineTo(davitX1 - 10, gY - 55);
        ctx.lineTo(davitX1 - 2, gY - 55);
        ctx.moveTo(davitX1 + 14, gY - 42);
        ctx.lineTo(davitX1 + 14, gY - 55);
        ctx.lineTo(davitX1 + 6, gY - 55);
        ctx.stroke();

        // Lifeboat hull
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(davitX1 + 2, gY - 51, 14, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#78350f';
        ctx.fillRect(davitX1 - 8, gY - 53, 20, 1.5);

        // 7. Tall Steel Fore & Aft Masts with Wire Rigging (Yüksek Çelik Direkler)
        const mast1X = sx - dir * 65;
        const mast2X = sx + dir * 50;
        ctx.fillStyle = '#334155';
        ctx.fillRect(mast1X, gY - 102, 3.5, 62);
        ctx.fillRect(mast2X, gY - 92, 3, 52);

        // Cross trees / yard arms
        ctx.fillRect(mast1X - 12, gY - 92, 26, 2.5);
        ctx.fillRect(mast2X - 10, gY - 82, 22, 2.5);

        // Steel rigging stays
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mast1X + 1.5, gY - 102);
        ctx.lineTo(sternTipX + dir * 10, gY - 42);
        ctx.moveTo(mast1X + 1.5, gY - 102);
        ctx.lineTo(funnelX, gY - 42);
        ctx.moveTo(mast2X + 1.5, gY - 92);
        ctx.lineTo(funnelX, gY - 42);
        ctx.moveTo(mast2X + 1.5, gY - 92);
        ctx.lineTo(bowTipX - dir * 10, gY - 42);
        ctx.stroke();

        // 8. British Royal Navy Ensign Flag (Dalgalanan Heybetli İngiliz Sancağı)
        const flagWave = Math.sin(this.animTimer * 4.0 + (camp.x || 0) * 0.005) * 3;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(mast1X + 3, gY - 101);
        ctx.lineTo(mast1X + 3 + dir * 28, gY - 101 + flagWave);
        ctx.lineTo(mast1X + 3 + dir * 28, gY - 84 + flagWave);
        ctx.lineTo(mast1X + 3, gY - 84);
        ctx.closePath();
        ctx.fill();

        // Union Jack Canton
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(mast1X + 3, gY - 101, dir * 13, 9);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mast1X + 3 + (dir === 1 ? 5 : -8), gY - 101, 2.5, 9);
        ctx.fillRect(mast1X + 3, gY - 97, dir * 13, 2.5);

        // 9. Beachhead Fortified Emplacement (Sahil İkmal ve Kum Torbaları)
        this.drawSandbagRow(sx + dir * 65, gY - 7, 4);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx + dir * 45, gY - 12, 16, 11);
        ctx.strokeStyle = '#1e293b';
        ctx.strokeRect(sx + dir * 45, gY - 12, 16, 11);

        // Period ship lantern on bow
        this.drawGasLantern(sx + dir * 95, gY - 34);

        // Health Bar & Camp Title
        const maxHp = camp.maxHealth || 1200;
        const curHp = camp.health;
        this.drawHealthBar(sx, gY - 110, curHp, maxHp, '#ef4444');

        ctx.font = 'bold 10px "Cinzel", system-ui, sans-serif';
        ctx.fillStyle = '#fecaca';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SS RIVER CLYDE - ZIRHLI ÇIKARTMA GEMİSİ', sx, gY - 122);
      } else {
        // --- DESTROYED CHARRED WRECKAGE (İMHA EDİLMİŞ BAZA) ---
        ctx.save();
        ctx.translate(sx, gY);
        ctx.rotate(dir * 0.14);

        ctx.fillStyle = '#18181b'; // Blackened charred steel
        ctx.beginPath();
        ctx.moveTo(-dir * 70, -2);
        ctx.lineTo(dir * 60, 4);
        ctx.lineTo(dir * 66, -12);
        ctx.lineTo(-dir * 64, -15);
        ctx.closePath();
        ctx.fill();

        // Gaping torpedo / artillery explosion breach
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(dir * 12, -4, 12, 0, Math.PI * 2);
        ctx.fill();

        // Jagged metal rips
        ctx.strokeStyle = '#71717a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(dir * 4, -16);
        ctx.lineTo(dir * 10, 2);
        ctx.lineTo(dir * 20, -14);
        ctx.stroke();

        // Collapsed broken mast
        ctx.fillStyle = '#27272a';
        ctx.fillRect(-dir * 35, -16, 32, 2.5);

        ctx.restore();

        // Smoldering fire, embers, and thick billowing black smoke
        for (let sm = 0; sm < 4; sm++) {
          const smokeProg = (this.animTimer * 1.5 + sm * 0.8) % 3;
          const smokeY = gY - 15 - smokeProg * 22;
          const smokeX = sx + (sm - 1.5) * 12 + Math.sin(this.animTimer * 2 + sm) * 6;
          const smokeR = 7 + smokeProg * 6;
          ctx.fillStyle = `rgba(24, 24, 27, ${Math.max(0, 0.7 - smokeProg * 0.22)})`;
          ctx.beginPath();
          ctx.arc(smokeX, smokeY, smokeR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Burning orange embers
        if (Math.sin(this.animTimer * 8) > 0) {
          ctx.fillStyle = '#ea580c';
          ctx.fillRect(sx + 5, gY - 14, 4, 3);
          ctx.fillRect(sx - 18, gY - 10, 3, 3);
        }

        // Prominent Victory Status Label
        ctx.font = 'bold 9px "Cinzel", system-ui, sans-serif';
        ctx.fillStyle = '#4ade80';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡ İMHA EDİLDİ ⚡', sx, gY - 38);
      }

      ctx.restore();
    }
  }

  // Helper to draw realistic Cut Stone Block Masonry rows (Kesme Taş Duvar)
  private drawStoneBlockRow(startX: number, y: number, count: number) {
    const ctx = this.ctx;
    for (let i = 0; i < count; i++) {
      const bx = startX + i * 20;
      // Cut stone block body
      ctx.fillStyle = '#475569'; // Slate stone block
      ctx.fillRect(bx, y, 19, 9);
      // Highlights & dark mortar border
      ctx.fillStyle = '#64748b';
      ctx.fillRect(bx, y, 19, 1.5);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx, y + 7.5, 19, 1.5);
      ctx.fillRect(bx + 17.5, y, 1.5, 9);
    }
  }

  // Realistic Period Sandbag Row (Döneme Uygun Haki Çuval Kum Torbaları - Önde Parapet Olarak)
  private drawSandbagRow(startX: number, y: number, count: number, bagW = 18, bagH = 8) {
    const ctx = this.ctx;
    for (let i = 0; i < count; i++) {
      const bx = startX + i * (bagW - 1);
      // Main burlap fabric body (Khaki desert sand tone)
      ctx.fillStyle = '#caba94';
      ctx.beginPath();
      ctx.roundRect(bx, y, bagW, bagH, 2.5);
      ctx.fill();

      // Top highlight ridge (sunlit edge)
      ctx.fillStyle = '#e4d8b6';
      ctx.fillRect(bx + 1, y, bagW - 2, 1.8);

      // Bottom shadow seam
      ctx.fillStyle = '#8c7b56';
      ctx.fillRect(bx, y + bagH - 1.8, bagW, 1.8);

      // Burlap weave & center binding seam
      ctx.strokeStyle = '#7c6c49';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(bx + 0.5, y + 0.5, bagW - 1, bagH - 1);

      // Tied end / gathering knot
      ctx.fillStyle = '#9f8e67';
      ctx.fillRect(bx + bagW - 2.5, y + bagH * 0.25, 2.5, bagH * 0.5);
    }
  }

  private drawTrench(x: number, y: number, slot: BuildSlot, hqTier: number = 1) {
    const ctx = this.ctx;
    ctx.save();

    const dir = slot.side === 'left' ? -1 : 1; // Enemy direction (-1: left, 1: right)

    if (slot.level === 0) {
      // Unbuilt Plot: Authentic Gallipoli Trench Excavation Plot
      ctx.fillStyle = '#261406';
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 46, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dug trench ditch shadow
      ctx.fillStyle = '#140a03';
      ctx.fillRect(x - 36, y - 5, 72, 6);

      // Wooden trench revetment stakes
      ctx.fillStyle = hqTier === 3 ? '#334155' : (hqTier === 2 ? '#78350f' : '#854d0e');
      ctx.fillRect(x - 32, y - 22, 3.5, 22);
      ctx.fillRect(x - 12, y - 18, 3, 18);
      ctx.fillRect(x + 12, y - 18, 3, 18);
      ctx.fillRect(x + 30, y - 22, 3.5, 22);

      // Surveyor twine marking trench alignment
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 32, y - 15);
      ctx.lineTo(x + 30, y - 15);
      ctx.stroke();

      // Steel Shovel stuck in fresh dirt heap
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x - 14, y - 24, 2.5, 22);
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 17, y - 8, 8, 6);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 16, y - 26, 6, 3);

      // Pickaxe stuck in excavation mound
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x + 14, y - 20, 3, 18);
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(x + 9, y - 20);
      ctx.lineTo(x + 22, y - 18);
      ctx.lineTo(x + 15, y - 15);
      ctx.closePath();
      ctx.fill();
    } else if (hqTier === 3) {
      // TIER 3: KESME TAŞ VE ÇELİK MUHKEM TABYA SİPERİ (Stone Fortress Bastion Trench)
      // 1. Subterranean stone masonry bunker cavity
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(x - 52, y, 104, 38);

      // Gallipoli limestone ashlar back wall
      for (let sy = y; sy < y + 36; sy += 9) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 50, sy, 100, 1.2);
      }
      for (let sx = x - 48; sx < x + 48; sx += 22) {
        ctx.fillStyle = '#334155';
        ctx.fillRect(sx, y, 5, 36);
      }

      // Subterranean shelter dugout entrance in the rear center
      ctx.fillStyle = '#020617';
      ctx.fillRect(x - 18, y + 6, 36, 30);
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 20, y + 4, 40, 4); // Heavy stone lintel
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 20, y + 4, 4, 32); // Left stone pillar
      ctx.fillRect(x + 16, y + 4, 4, 32); // Right stone pillar

      // Warm interior bunker lantern glow
      ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
      ctx.beginPath();
      ctx.ellipse(x, y + 22, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rear stone retaining wall with crenellated parapet behind soldiers
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 52, y - 22, 104, 16);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 52, y - 6, 104, 2);
      // Stone bevel highlights
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 52, y - 22, 104, 1.5);
      for (let bx = x - 50; bx < x + 50; bx += 20) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bx, y - 22, 1.5, 16);
      }

      // Wooden duckboard floor with drainage channel
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 48, y + 32, 96, 5);
      ctx.fillStyle = '#451a03';
      for (let d = x - 46; d < x + 46; d += 8) {
        ctx.fillRect(d, y + 32, 1.5, 5);
      }

      // Raised timber firing banquette (atış sekisi) where soldiers stand
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x - 44, y - 4, 88, 5);

      // Stacked artillery shell cases in rear corner
      ctx.fillStyle = '#ca8a04';
      const shellX = dir === -1 ? x + 34 : x - 42;
      ctx.fillRect(shellX, y - 14, 3, 10);
      ctx.fillRect(shellX + 4, y - 14, 3, 10);
      ctx.fillRect(shellX + 2, y - 20, 3, 10);

      // Ottoman Crescent Pennant flying high on the rear stone post
      const flagX = slot.side === 'left' ? x - 46 : x + 44;
      ctx.fillStyle = '#64748b';
      ctx.fillRect(flagX, y - 56, 3, 56);
      ctx.fillStyle = '#dc2626';
      const fWave = Math.sin(this.animTimer * 5) * 3;
      ctx.beginPath();
      ctx.moveTo(flagX + 3, y - 54);
      ctx.lineTo(flagX + 18 + fWave, y - 48);
      ctx.lineTo(flagX + 3, y - 42);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(flagX + 5, y - 49, 3, 3);
    } else if (hqTier === 2) {
      // TIER 2: AHŞAP KÜTÜK SİPER & ŞARAPNEL SIĞINAĞI (Heavy Timber Trench & Shelter)
      // 1. Ditch cavity below ground
      ctx.fillStyle = '#170c06';
      ctx.fillRect(x - 46, y, 92, 32);

      // Timber revetment wall planks along the rear
      ctx.fillStyle = '#451a03';
      for (let p = x - 44; p < x + 44; p += 9) {
        ctx.fillRect(p, y, 7.5, 30);
      }

      // Heavy vertical timber support posts
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 42, y - 14, 5, 46);
      ctx.fillRect(x + 37, y - 14, 5, 46);
      ctx.fillRect(x - 2, y - 14, 5, 46);

      // Rear splinter-proof dugout shelter roof (şarapnel sığınağı üstü)
      const bunkerSide = dir === -1 ? x + 12 : x - 44;
      ctx.fillStyle = '#271206';
      ctx.fillRect(bunkerSide, y - 18, 32, 16);
      ctx.fillStyle = '#572c0c';
      ctx.fillRect(bunkerSide, y - 18, 32, 3); // log lintel
      // Sandbags on top of the rear shelter roof
      this.drawSandbagRow(bunkerSide + 2, y - 24, 2, 14, 6);

      // Duckboard walkway on the trench floor
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x - 42, y + 26, 84, 5);
      ctx.fillStyle = '#451a03';
      for (let d = x - 40; d < x + 40; d += 8) {
        ctx.fillRect(d, y + 26, 1.5, 5);
      }

      // Raised wooden firing banquette (atış sekisi)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 40, y - 4, 80, 5);

      // Hanging storm kerosene hurricane lantern
      this.drawGasLantern(dir === -1 ? x + 32 : x - 34, y - 10);

      // Wooden ammunition crate in rear
      const crateX = dir === -1 ? x - 38 : x + 24;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(crateX, y - 12, 14, 9);
      ctx.fillStyle = '#451a03';
      ctx.strokeRect(crateX, y - 12, 14, 9);
    } else {
      // TIER 1: GELİBOLU KUM TORBASI VE TOPRAK SİPERİ (Authentic Earthwork & Sandbag Trench)
      // 1. Trench Cavity (Excavated soil depth below ground)
      ctx.fillStyle = '#26160c';
      ctx.fillRect(x - 38, y, 76, 26);

      // Clay and chalk soil strata bands
      ctx.fillStyle = '#3a2011';
      ctx.fillRect(x - 38, y + 8, 76, 3);
      ctx.fillStyle = '#4d3017';
      ctx.fillRect(x - 38, y + 17, 76, 2);

      // Timber revetment planks & fascine hurdles along trench back wall
      ctx.fillStyle = '#451a03';
      for (let p = x - 36; p < x + 34; p += 8) {
        ctx.fillRect(p, y + 1, 6.5, 23);
      }

      // Wooden Duckboards on trench floor with drainage gap
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 36, y + 21, 72, 4.5);
      ctx.fillStyle = '#271206';
      for (let d = x - 34; d < x + 32; d += 7) {
        ctx.fillRect(d, y + 21, 1.2, 4.5);
      }

      // Raised wooden firing banquette (atış sekisi) where soldiers stand
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(x - 34, y - 4, 68, 4.5);

      // Wooden ammunition crate in corner
      const boxX = dir === -1 ? x + 20 : x - 32;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(boxX, y - 11, 12, 8);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(boxX + 2, y - 9, 8, 1);

      // Field telephone wire along trench wall
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 36, y - 2);
      ctx.quadraticCurveTo(x, y + 4, x + 36, y - 2);
      ctx.stroke();
    }

    if (slot.level > 0 && slot.health < slot.maxHealth) {
      this.drawHealthBar(x, y - 45, slot.health, slot.maxHealth);
    }

    ctx.restore();
  }

  // --- Front Parapets (Sandbags, Timber Wall, Stone Wall rendered directly IN FRONT of soldiers) ---
  private drawTrenchFrontParapets(slots: BuildSlot[], camX: number, soldiers: Soldier[] = []) {
    const ctx = this.ctx;
    const gY = this.groundY;

    // Determine HQ Tier
    const hqSlot = slots.find((s) => s.type === 'headquarters');
    const hqTier = hqSlot ? hqSlot.level : 1;

    for (const slot of slots) {
      if (slot.type !== 'trench' || slot.level === 0) continue;
      const sx = slot.x - camX;
      if (sx < -80 || sx > this.width + 80) continue;

      ctx.save();
      const dir = slot.side === 'left' ? -1 : 1;

      if (hqTier === 3) {
        // TIER 3: TAŞ TABYA ÖN SİPERİ (Stone Fortress Bastion Front Parapet)
        const wallW = 96;
        const wallH = 20;
        const startX = sx - wallW / 2;

        // Base foundation berm
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(startX - 2, gY - wallH, wallW + 4, wallH + 4);

        // Ashlar Stone Blocks Pattern
        for (let row = 0; row < 3; row++) {
          const rowY = gY - wallH + row * 6.5;
          const offset = (row % 2) * 12;
          for (let bx = startX - offset; bx < startX + wallW; bx += 24) {
            const blockX = Math.max(startX, bx);
            const blockW = Math.min(23, startX + wallW - blockX);
            if (blockW <= 0) continue;
            ctx.fillStyle = (bx % 48 === 0) ? '#475569' : '#334155';
            ctx.fillRect(blockX, rowY, blockW, 6);
            // Stone bevel highlight
            ctx.fillStyle = '#64748b';
            ctx.fillRect(blockX, rowY, blockW, 1);
            // Shadow base
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(blockX, rowY + 5, blockW, 1);
          }
        }

        // Stone Crenellations / Mazgal Dişleri (Rifle firing notches)
        ctx.fillStyle = '#334155';
        for (let i = 0; i < 4; i++) {
          const merlonX = startX + 4 + i * 24;
          ctx.fillRect(merlonX, gY - wallH - 6, 14, 6);
          ctx.fillStyle = '#64748b';
          ctx.fillRect(merlonX, gY - wallH - 6, 14, 1.2);
          ctx.fillStyle = '#334155';
        }

        // Steel Armoured Firing Shield with rifle slit
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(sx - 16, gY - wallH - 3, 32, 5.5);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(sx - 8, gY - wallH - 1.5, 16, 2.5); // rifle rest slit
        ctx.fillStyle = '#94a3b8'; // Rivets
        ctx.fillRect(sx - 14, gY - wallH - 2, 2, 2);
        ctx.fillRect(sx + 12, gY - wallH - 2, 2, 2);
      } else if (hqTier === 2) {
        // TIER 2: ODUN DUVAR ÖN SİPERİ (Heavy Timber Log Front Parapet)
        const wallW = 88;
        const wallH = 18;
        const startX = sx - wallW / 2;

        // Base dirt mound
        ctx.fillStyle = '#451a03';
        ctx.fillRect(startX - 2, gY - 4, wallW + 4, 6);

        // Vertical Log Stakes
        const logWidth = 7;
        for (let lx = startX; lx < startX + wallW; lx += logWidth) {
          const logH = wallH + ((lx % 14 === 0) ? 2 : 0);
          ctx.fillStyle = (lx % 14 === 0) ? '#78350f' : '#92400e';
          ctx.fillRect(lx, gY - logH, logWidth - 1, logH);

          // Pointed log spear top
          ctx.beginPath();
          ctx.moveTo(lx, gY - logH);
          ctx.lineTo(lx + (logWidth - 1) / 2, gY - logH - 3);
          ctx.lineTo(lx + logWidth - 1, gY - logH);
          ctx.fill();

          // Wood bark highlight
          ctx.fillStyle = '#b45309';
          ctx.fillRect(lx + 1, gY - logH + 2, 1.5, logH - 4);
        }

        // Horizontal Iron-Reinforced Timber Crossbeam
        ctx.fillStyle = '#451a03';
        ctx.fillRect(startX - 2, gY - 12, wallW + 4, 4);
        ctx.fillStyle = '#334155'; // Iron studs/rivets
        for (let rx = startX + 4; rx < startX + wallW; rx += 12) {
          ctx.fillRect(rx, gY - 11, 2, 2);
        }

        // Rifle Firing Port Cutouts between logs
        ctx.fillStyle = '#1c0d02';
        ctx.fillRect(sx - 20, gY - 9, 10, 3);
        ctx.fillRect(sx + 10, gY - 9, 10, 3);
      } else {
        // TIER 1: KUM TORBALARI ÖN SİPERİ (Sandbag Breastwork Front Parapet)
        const bermW = slot.level >= 3 ? 90 : (slot.level === 2 ? 86 : 82);
        const startX = sx - bermW / 2;

        // Earth embankment base with grass & gravel
        ctx.fillStyle = '#4d3017';
        ctx.beginPath();
        ctx.ellipse(sx, gY - 3, bermW / 2 + 2, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Row 1: Bottom sandbag row
        this.drawSandbagRow(startX + 4, gY - 8, 5, 15, 7.5);

        // Row 2: Upper sandbag row with rifle rest notches
        this.drawSandbagRow(startX + 11, gY - 14.5, 4, 15, 7.5);

        // Row 3: Reinforced heavy tier for Level 3
        if (slot.level >= 3) {
          this.drawSandbagRow(startX + 18, gY - 20, 3, 15, 7);
        }
      }

      // Progressive Damage FX strictly styled to HQ materials
      if (slot.maxHealth && slot.health < slot.maxHealth) {
        const w = hqTier === 3 ? 96 : (hqTier === 2 ? 88 : 84);
        this.drawFortificationDamageFX(sx, gY, slot, w, 20, hqTier);
      }

      ctx.restore();
    }
  }

  private drawBarbedWire(x: number, y: number, slot: BuildSlot, hqTier: number = 1) {
    const ctx = this.ctx;
    ctx.save();

    const lvl = slot.level;
    const dir = slot.side === 'left' ? -1 : 1;

    if (lvl === 0) {
      // LEVEL 0: Unbuilt Plot - Neat stakes with yellow surveyor cord, wire roll & mallet
      ctx.fillStyle = '#3e2106';
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 38, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Row of 4 short marker stakes
      ctx.fillStyle = '#78350f';
      for (let i = 0; i < 4; i++) {
        const sx = x - 24 + i * 16;
        ctx.fillRect(sx, y - 18, 3, 18);
      }

      // Yellow surveyor twine
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 24, y - 12);
      ctx.lineTo(x + 24, y - 12);
      ctx.stroke();

      // Galvanized wire spool on the ground
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(x - 6, y - 6, 6, 0, Math.PI * 2);
      ctx.arc(x + 8, y - 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Wooden mallet
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x + 16, y - 16, 2.5, 16);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 13, y - 18, 8, 5);

      // Red triangular survey flag
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(x - 24, y - 18);
      ctx.lineTo(x - 17, y - 14);
      ctx.lineTo(x - 24, y - 10);
      ctx.closePath();
      ctx.fill();

    } else if (hqTier === 3) {
      // HQ TIER 3: KESME TAŞ VE ÇELİK ENGEL (Stone & Steel Fortification Wire)
      if (lvl === 1) {
        // Cut-stone foundation curb with 4 steel corkscrew pickets & 2 wire tiers
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 30, y - 6, 60, 6);
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - 28, y - 6, 56, 3);

        const startX = x - 24;
        for (let i = 0; i < 4; i++) {
          const px = startX + i * 16;
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px, y - 6);
          ctx.lineTo(px, y - 24);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(px, y - 25, 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.3;
        for (const wy of [y - 20, y - 12]) {
          ctx.beginPath();
          ctx.moveTo(startX - 4, wy);
          ctx.lineTo(startX + 52, wy);
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          for (let bx = startX; bx <= startX + 48; bx += 8) {
            ctx.fillRect(bx - 1, wy - 1.5, 2, 3);
            ctx.fillRect(bx - 1.5, wy - 1, 3, 2);
          }
        }
      } else if (lvl === 2) {
        // Cut-stone curb with steel Cheval de Frise crossed rails & 3 wire tiers
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 32, y - 7, 64, 7);
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - 30, y - 7, 60, 3);

        const startX = x - 24;
        for (let i = 0; i < 4; i++) {
          const cx = startX + i * 16;
          ctx.save();
          ctx.translate(cx, y - 14);
          ctx.rotate(0.55);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-1.5, -15, 3, 30);
          ctx.fillStyle = '#475569';
          ctx.fillRect(-1, -15, 2, 30);
          ctx.restore();

          ctx.save();
          ctx.translate(cx, y - 14);
          ctx.rotate(-0.55);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-1.5, -15, 3, 30);
          ctx.fillStyle = '#475569';
          ctx.fillRect(-1, -15, 2, 30);
          ctx.restore();

          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(cx - 1.5, y - 15.5, 3, 3);
        }

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.4;
        for (const wy of [y - 25, y - 14, y - 7]) {
          ctx.beginPath();
          ctx.moveTo(startX - 8, wy);
          ctx.lineTo(startX + 56, wy);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          for (let bx = startX - 4; bx <= startX + 52; bx += 8) {
            ctx.fillRect(bx - 1, wy - 2, 2, 4);
            ctx.fillRect(bx - 2, wy - 1, 4, 2);
          }
        }
      } else if (lvl === 3) {
        // Cut-stone foundation curb, 5 steel corkscrews, dual concertina spiral coils
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 32, y - 8, 64, 8);
        ctx.fillStyle = '#334155';
        ctx.fillRect(x - 30, y - 7, 60, 4);
        ctx.fillStyle = '#0f172a';
        for (let sx = x - 20; sx <= x + 20; sx += 14) {
          ctx.fillRect(sx, y - 8, 1.5, 8);
        }

        const startX = x - 28;
        for (let i = 0; i < 5; i++) {
          const px = startX + i * 14;
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(px, y - 8);
          for (let py = y - 8; py > y - 32; py -= 4) {
            ctx.lineTo(px + ((py % 8 === 0) ? 2 : -2), py);
          }
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(px, y - 33, 2.2, 0, Math.PI * 2);
          ctx.stroke();
        }

        const coilTiers = [{ cy: y - 14, rad: 5.5 }, { cy: y - 24, rad: 6.0 }];
        for (const coil of coilTiers) {
          for (let lx = startX - 4; lx <= startX + 58; lx += 8) {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(lx, coil.cy, 4.5, coil.rad, 0.2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(lx - 1, coil.cy - coil.rad - 1, 2, 2.5);
            ctx.fillRect(lx - 1, coil.cy + coil.rad - 1.5, 2, 2.5);
          }
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(startX - 6, coil.cy);
          ctx.lineTo(startX + 60, coil.cy);
          ctx.stroke();
        }

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(x - 12, y - 23, 2.5, 7);
        ctx.fillRect(x + 14, y - 23, 2.5, 7);
      } else {
        // lvl >= 4: Armored Cut-Stone Parapet with Steel Plate, Czech Hedgehogs & Triple Concertina
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x - 36, y - 11, 72, 11);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 34, y - 10, 68, 8);
        ctx.fillStyle = '#475569';
        ctx.fillRect(x - 36, y - 11, 72, 2.5);
        ctx.fillStyle = '#eab308';
        for (let rx = x - 30; rx <= x + 30; rx += 12) {
          ctx.fillRect(rx, y - 8, 2, 2);
        }

        const startX = x - 30;
        for (let i = 0; i < 4; i++) {
          const px = startX + i * 20;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(px - 2, y - 38, 4, 27);
          ctx.fillStyle = '#475569';
          ctx.fillRect(px - 1.5, y - 38, 3, 27);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(px, y - 35);
          ctx.lineTo(px + (dir * 12), y - 11);
          ctx.stroke();
        }

        for (let i = 0; i < 4; i++) {
          const hx = startX + i * 19;
          ctx.save();
          ctx.translate(hx, y - 10);
          ctx.fillStyle = '#1e293b';
          ctx.rotate(dir * 0.45);
          ctx.fillRect(-2, -18, 4, 22);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(-1.5, -18, 3, 4);
          ctx.restore();

          ctx.save();
          ctx.translate(hx, y - 10);
          ctx.rotate(-dir * 0.45);
          ctx.fillStyle = '#334155';
          ctx.fillRect(-2, -14, 4, 18);
          ctx.restore();
        }

        const tripleTiers = [
          { cy: y - 15, rad: 5.5 },
          { cy: y - 24, rad: 6.0 },
          { cy: y - 33, rad: 6.5 }
        ];
        for (const coil of tripleTiers) {
          for (let lx = startX - 4; lx <= startX + 64; lx += 7) {
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(lx, coil.cy, 4.5, coil.rad, 0.25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(lx - 1.5, coil.cy - coil.rad - 1, 3, 2);
            ctx.fillRect(lx - 1.5, coil.cy + coil.rad - 1, 3, 2);
          }
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(startX - 6, coil.cy);
          ctx.lineTo(startX + 66, coil.cy);
          ctx.stroke();
        }
      }

    } else if (hqTier === 2) {
      // HQ TIER 2: AHŞAP KÜTÜK ENGEL (Timber Log Fortification Wire)
      if (lvl === 1) {
        // Pine log posts with 2 taut wire strands
        ctx.fillStyle = '#3b1905';
        ctx.fillRect(x - 28, y - 5, 56, 5);

        const startX = x - 24;
        for (let i = 0; i < 4; i++) {
          const px = startX + i * 16;
          ctx.fillStyle = '#451a03';
          ctx.fillRect(px, y - 22, 4, 22);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px + 0.5, y - 22, 3, 22);
          ctx.beginPath();
          ctx.moveTo(px, y - 22);
          ctx.lineTo(px + 2, y - 26);
          ctx.lineTo(px + 4, y - 22);
          ctx.fill();
        }

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.3;
        for (const wy of [y - 18, y - 10]) {
          ctx.beginPath();
          ctx.moveTo(startX - 4, wy);
          ctx.lineTo(startX + 52, wy);
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          for (let bx = startX; bx <= startX + 48; bx += 8) {
            ctx.fillRect(bx - 1, wy - 1.5, 2, 3);
            ctx.fillRect(bx - 1.5, wy - 1, 3, 2);
          }
        }
      } else if (lvl === 2) {
        // Cheval de Frise (İspanyol Süvarisi Çapraz Ahşap Kazıkları)
        ctx.fillStyle = '#3b1905';
        ctx.fillRect(x - 30, y - 6, 60, 6);
        ctx.fillStyle = '#5a250a';
        ctx.fillRect(x - 28, y - 5, 56, 3);

        const startX = x - 24;
        for (let i = 0; i < 4; i++) {
          const cx = startX + i * 16;
          ctx.save();
          ctx.translate(cx, y - 14);
          ctx.rotate(0.55);
          ctx.fillStyle = '#3f1c05';
          ctx.fillRect(-2, -15, 4, 30);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-1.5, -15, 3, 30);
          ctx.restore();

          ctx.save();
          ctx.translate(cx, y - 14);
          ctx.rotate(-0.55);
          ctx.fillStyle = '#3f1c05';
          ctx.fillRect(-2, -15, 4, 30);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-1.5, -15, 3, 30);
          ctx.restore();

          ctx.fillStyle = '#1e293b';
          ctx.fillRect(cx - 2, y - 16, 4, 4);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(cx - 1, y - 15, 2, 2);
        }

        ctx.fillStyle = '#5a250a';
        ctx.fillRect(startX - 6, y - 15.5, 58, 3);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(startX - 6, y - 15, 58, 1.5);

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.4;
        for (const wy of [y - 25, y - 14, y - 7]) {
          ctx.beginPath();
          ctx.moveTo(startX - 8, wy);
          ctx.lineTo(startX + 56, wy);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          for (let bx = startX - 4; bx <= startX + 52; bx += 8) {
            ctx.fillRect(bx - 1, wy - 2, 2, 4);
            ctx.fillRect(bx - 2, wy - 1, 4, 2);
          }
        }
      } else if (lvl === 3) {
        // Timber sleeper base log with steel corkscrews and concertina spiral coils
        ctx.fillStyle = '#3b1905';
        ctx.fillRect(x - 32, y - 8, 64, 8);
        ctx.fillStyle = '#5a250a';
        ctx.fillRect(x - 30, y - 7, 60, 4);

        const startX = x - 28;
        for (let i = 0; i < 5; i++) {
          const px = startX + i * 14;
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(px, y - 8);
          for (let py = y - 8; py > y - 30; py -= 4) {
            ctx.lineTo(px + ((py % 8 === 0) ? 2 : -2), py);
          }
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(px, y - 31, 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        const coilTiers = [{ cy: y - 14, rad: 5.5 }, { cy: y - 23, rad: 6.0 }];
        for (const coil of coilTiers) {
          for (let lx = startX - 4; lx <= startX + 58; lx += 8) {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(lx, coil.cy, 4.5, coil.rad, 0.2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(lx - 1, coil.cy - coil.rad - 1, 2, 2.5);
            ctx.fillRect(lx - 1, coil.cy + coil.rad - 1.5, 2, 2.5);
          }
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(startX - 6, coil.cy);
          ctx.lineTo(startX + 60, coil.cy);
          ctx.stroke();
        }
      } else {
        // lvl >= 4: Heavy Interlocking Timber Log Barrier with dense double concertina wire
        ctx.fillStyle = '#291102';
        ctx.fillRect(x - 36, y - 12, 72, 12);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(x - 34, y - 11, 68, 8);

        const startX = x - 30;
        for (let i = 0; i < 4; i++) {
          const px = startX + i * 20;
          ctx.fillStyle = '#291102';
          ctx.fillRect(px - 2.5, y - 36, 5, 26);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px - 1.5, y - 36, 3, 26);
          ctx.beginPath();
          ctx.moveTo(px - 2.5, y - 36);
          ctx.lineTo(px, y - 40);
          ctx.lineTo(px + 2.5, y - 36);
          ctx.fill();
        }

        const doubleTiers = [{ cy: y - 16, rad: 6.0 }, { cy: y - 27, rad: 6.5 }];
        for (const coil of doubleTiers) {
          for (let lx = startX - 4; lx <= startX + 64; lx += 7) {
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(lx, coil.cy, 4.5, coil.rad, 0.25, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(lx - 1.5, coil.cy - coil.rad - 1, 3, 2);
            ctx.fillRect(lx - 1.5, coil.cy + coil.rad - 1, 3, 2);
          }
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(startX - 6, coil.cy);
          ctx.lineTo(startX + 66, coil.cy);
          ctx.stroke();
        }
      }

    } else {
      // HQ TIER 1: GELİBOLU KUM TORBASI VE TOPRAK ENGELİ (Authentic Earth & Timber Pickets)
      if (lvl === 1) {
        // 4 straight upright wooden pickets with pointed tips & 2 taut parallel wires
        this.drawSandbagRow(x - 24, y - 6, 3, 16, 6);

        const startX = x - 24;
        for (let i = 0; i < 4; i++) {
          const px = startX + i * 16;
          ctx.fillStyle = '#451a03';
          ctx.fillRect(px, y - 22, 3.5, 22);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px + 0.5, y - 22, 2.5, 22);
          ctx.beginPath();
          ctx.moveTo(px, y - 22);
          ctx.lineTo(px + 1.75, y - 26);
          ctx.lineTo(px + 3.5, y - 22);
          ctx.fill();
        }

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.3;
        for (const wy of [y - 18, y - 10]) {
          ctx.beginPath();
          ctx.moveTo(startX - 4, wy);
          ctx.lineTo(startX + 52, wy);
          ctx.stroke();
          ctx.fillStyle = '#f8fafc';
          for (let bx = startX; bx <= startX + 48; bx += 8) {
            ctx.fillRect(bx - 1, wy - 1.5, 2, 3);
            ctx.fillRect(bx - 1.5, wy - 1, 3, 2);
          }
        }
      } else if (lvl === 2) {
        // 4 wooden pickets with diagonal timber cross-braces, sandbag base, 3 taut wire strands
        this.drawSandbagRow(x - 28, y - 7, 4, 15, 6);

        const startX = x - 24;
        for (let i = 0; i < 4; i++) {
          const px = startX + i * 16;
          ctx.fillStyle = '#451a03';
          ctx.fillRect(px, y - 26, 3.5, 26);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px + 0.5, y - 26, 2.5, 26);
          // Diagonal support stake
          ctx.beginPath();
          ctx.moveTo(px, y - 16);
          ctx.lineTo(px + (dir * 8), y - 2);
          ctx.strokeStyle = '#572c0c';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.4;
        for (const wy of [y - 23, y - 15, y - 8]) {
          ctx.beginPath();
          ctx.moveTo(startX - 6, wy);
          ctx.lineTo(startX + 54, wy);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          for (let bx = startX - 2; bx <= startX + 50; bx += 8) {
            ctx.fillRect(bx - 1, wy - 1.5, 2, 3);
            ctx.fillRect(bx - 1.5, wy - 1, 3, 2);
          }
        }
      } else if (lvl === 3) {
        // Staggered dual row of 6 sharpened wooden pickets with 4 rows of barbed wire
        this.drawSandbagRow(x - 32, y - 8, 4, 16, 7);
        ctx.fillStyle = '#4d3017';
        ctx.fillRect(x - 30, y - 3, 60, 4);

        const startX = x - 26;
        for (let i = 0; i < 5; i++) {
          const px = startX + i * 13;
          ctx.fillStyle = '#3a1a05';
          ctx.fillRect(px, y - 30, 4, 28);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(px + 0.5, y - 30, 3, 28);
          ctx.beginPath();
          ctx.moveTo(px, y - 30);
          ctx.lineTo(px + 2, y - 34);
          ctx.lineTo(px + 4, y - 30);
          ctx.fill();
        }

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.4;
        for (const wy of [y - 28, y - 21, y - 14, y - 7]) {
          ctx.beginPath();
          ctx.moveTo(startX - 6, wy);
          ctx.lineTo(startX + 58, wy);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          for (let bx = startX - 4; bx <= startX + 54; bx += 7) {
            ctx.fillRect(bx - 1, wy - 1.5, 2, 3);
            ctx.fillRect(bx - 1.5, wy - 1, 3, 2);
          }
        }

        // Red warning cloth flag
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(x - 10, y - 22, 2.5, 6);
        ctx.fillRect(x + 12, y - 22, 2.5, 6);
      } else {
        // lvl >= 4: Deep earth revetment barrier with rows of sharpened wooden abatis stakes & dense wire
        this.drawSandbagRow(x - 36, y - 9, 5, 15, 8);
        ctx.fillStyle = '#3a1a05';
        ctx.fillRect(x - 34, y - 4, 68, 5);

        const startX = x - 28;
        // Sharpened angled abatis stakes pointing forward
        for (let i = 0; i < 4; i++) {
          const ax = startX + i * 18;
          ctx.save();
          ctx.translate(ax, y - 6);
          ctx.rotate(dir * 0.4);
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-2, -22, 4, 24);
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-1.5, -22, 3, 24);
          ctx.beginPath();
          ctx.moveTo(-2, -22);
          ctx.lineTo(0, -26);
          ctx.lineTo(2, -22);
          ctx.fill();
          ctx.restore();
        }

        // 4 Multi-layered wire strands
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        for (const wy of [y - 30, y - 22, y - 15, y - 8]) {
          ctx.beginPath();
          ctx.moveTo(startX - 8, wy);
          ctx.lineTo(startX + 64, wy);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          for (let bx = startX - 6; bx <= startX + 60; bx += 6) {
            ctx.fillRect(bx - 1, wy - 1.5, 2, 3);
            ctx.fillRect(bx - 1.5, wy - 1, 3, 2);
          }
        }
      }
    }

    if (slot.level > 0 && slot.health < slot.maxHealth) {
      this.drawHealthBar(x, y - 38, slot.health, slot.maxHealth);
      this.drawFortificationDamageFX(x, y, slot, 76, 18, hqTier);
    }

    ctx.restore();
  }

  private drawMachineGunNest(x: number, y: number, slot: BuildSlot, hqTier: number = 1) {
    const ctx = this.ctx;
    ctx.save();

    const dir = slot.side === 'left' ? -1 : 1;

    if (slot.level === 0) {
      // LEVEL 0: Unbuilt Machine Gun Nest Blueprint - Half-circle sandbags, Iron Tripod Mount & Green Ammo Tin
      ctx.fillStyle = '#3e2106';
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 36, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Semi-circle curved sandbag foundation
      this.drawSandbagRow(x - 24, y - 8, 3);

      // Heavy Iron Machine Gun Tripod Base already mounted
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - 4, y - 16, 8, 12);
      ctx.fillRect(x - 8, y - 18, 16, 3);
      // Swivel pintle
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 2, y - 22, 4, 6);

      // Olive-green ammo tin crate with brass bullet belt
      ctx.fillStyle = '#365314';
      ctx.fillRect(x + (dir * 12) - 5, y - 10, 11, 8);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x + (dir * 12) - 3, y - 12, 7, 3);

      // Yellow surveyor twine stakes
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 22, y - 18, 2.5, 18);
      ctx.fillRect(x + 20, y - 18, 2.5, 18);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 22, y - 12);
      ctx.lineTo(x + 20, y - 12);
      ctx.stroke();
    } else if (slot.level === 1) {
      // LEVEL 1: Sv. 1 Maxim Makineli Koruganı - Earth Berm & Sandbag Redoubt
      ctx.fillStyle = '#5c3d1e';
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 36, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      this.drawSandbagRow(x - 34, y - 14, 4);
      this.drawSandbagRow(x - 26, y - 22, 3);

      // Heavy Iron Tripod Mount
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - 5, y - 22, 10, 14);

      // Fluted Water-Cooled Maxim Jacket
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 10, y - 27, 24, 7);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x - 7, y - 27, 2, 7);
      ctx.fillRect(x - 2, y - 27, 2, 7);
      ctx.fillRect(x + 3, y - 27, 2, 7);
      ctx.fillRect(x + 8, y - 27, 2, 7);

      // Single Muzzle
      ctx.fillStyle = '#1e293b';
      const muzzleX = dir > 0 ? x + 14 : x - 18;
      ctx.fillRect(muzzleX, y - 25, 14, 3.5);

      // Brass Ammunition Belt & Olive Tin
      ctx.fillStyle = '#365314';
      ctx.fillRect(x - (dir * 14) - 5, y - 21, 10, 8);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x - (dir * 8) - 3, y - 23, 7, 3);

      // Condenser can & hose
      ctx.fillStyle = '#b45309';
      ctx.fillRect(x + (dir * 18), y - 9, 8, 9);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + (dir * 10), y - 24);
      ctx.quadraticCurveTo(x + (dir * 20), y - 18, x + (dir * 20), y - 9);
      ctx.stroke();

      // Spent brass shell casings
      ctx.fillStyle = '#fde047';
      ctx.fillRect(x - 4, y - 15, 2, 1.5);
      ctx.fillRect(x, y - 16, 2, 1.5);
      ctx.fillRect(x + 5, y - 15, 2, 1.5);
    } else if (slot.level === 2) {
      // LEVEL 2: Sv. 2 Zırhlı & Kamufle Korugan - Heavy Timber Bunker with Foliage & Steel Shield
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 40, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Double tier sandbag parapet
      this.drawSandbagRow(x - 36, y - 14, 4);
      this.drawSandbagRow(x - 28, y - 22, 3);

      // Stout dark oak timber pillars and crossbeam
      ctx.fillStyle = '#291102';
      ctx.fillRect(x - 32, y - 40, 6, 26);
      ctx.fillRect(x + 26, y - 40, 6, 26);
      ctx.fillStyle = '#3e1a06';
      ctx.fillRect(x - 38, y - 44, 76, 7);

      // Pine bough camouflage on the timber roof
      ctx.fillStyle = '#166534';
      for (let b = -36; b < 36; b += 5) {
        ctx.fillRect(x + b, y - 49, 6, 7);
      }
      ctx.fillStyle = '#15803d';
      for (let b = -32; b < 32; b += 7) {
        ctx.fillRect(x + b, y - 51, 4, 4);
      }

      // Hanging storm lantern under roof overhang
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 2, y - 42, 4, 3);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(x - 2, y - 39, 4, 5);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(x - 1, y - 37, 2, 2);

      // Heavy Angled Steel Gun Shield
      ctx.fillStyle = '#1e293b';
      const shieldX = dir > 0 ? x + 8 : x - 13;
      ctx.fillRect(shieldX, y - 32, 5, 20);
      // Viewing slot on gun shield
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(shieldX, y - 28, 5, 2.5);

      // Maxim mount & fluted jacket
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - 5, y - 22, 10, 14);
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 10, y - 27, 24, 7);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x - 7, y - 27, 2, 7);
      ctx.fillRect(x - 2, y - 27, 2, 7);
      ctx.fillRect(x + 3, y - 27, 2, 7);
      ctx.fillRect(x + 8, y - 27, 2, 7);

      // Extended heavy barrel
      ctx.fillStyle = '#0f172a';
      const muzzleX = dir > 0 ? x + 14 : x - 22;
      ctx.fillRect(muzzleX, y - 25, 18, 4);

      // Dual ammo boxes and brass belt
      ctx.fillStyle = '#365314';
      ctx.fillRect(x - (dir * 16) - 6, y - 22, 11, 9);
      ctx.fillRect(x - (dir * 25) - 4, y - 18, 9, 8);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x - (dir * 9) - 4, y - 24, 9, 3.5);

      // Brass condenser canister
      ctx.fillStyle = '#b45309';
      ctx.fillRect(x + (dir * 20), y - 10, 9, 10);
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x + (dir * 12), y - 24);
      ctx.quadraticCurveTo(x + (dir * 24), y - 18, x + (dir * 22), y - 10);
      ctx.stroke();

      // Spent shell casings
      ctx.fillStyle = '#fde047';
      ctx.fillRect(x - 5, y - 15, 2.5, 1.5);
      ctx.fillRect(x, y - 16, 2.5, 1.5);
      ctx.fillRect(x + 6, y - 15, 2.5, 1.5);
    } else {
      // LEVEL 3: Sv. 3 Çelik & Beton Ağır Bunker - Cut Stone & Concrete Pillbox with TWIN Maxim Barrels
      // Concrete & Stone Main Bunker Body
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 42, y - 44, 84, 44);

      // Stone & concrete mortar lines
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 42, y - 30, 84, 1.5);
      ctx.fillRect(x - 42, y - 16, 84, 1.5);
      for (let sx = x - 42; sx < x + 42; sx += 14) {
        ctx.fillRect(sx, y - 44, 1.5, 44);
      }

      // Sloped heavy armor mantlet around the firing port
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(x - 30, y - 12);
      ctx.lineTo(x + 30, y - 12);
      ctx.lineTo(x + 22, y - 32);
      ctx.lineTo(x - 22, y - 32);
      ctx.closePath();
      ctx.fill();

      // Firing embrasure slit (dark interior)
      ctx.fillStyle = '#020617';
      const slitX = x + (dir * 10);
      ctx.fillRect(slitX - 16, y - 28, 32, 12);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(slitX - 16, y - 28, 32, 12);

      // TWIN Maxim Water-Cooled Machine Guns (Çift Namlulu Ağır Korugan)
      // Top Barrel
      ctx.fillStyle = '#334155';
      ctx.fillRect(slitX - 10, y - 26, 22, 5);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(slitX - 8, y - 26, 2, 5);
      ctx.fillRect(slitX - 3, y - 26, 2, 5);
      ctx.fillRect(slitX + 2, y - 26, 2, 5);
      ctx.fillRect(slitX + 7, y - 26, 2, 5);
      // Bottom Barrel
      ctx.fillStyle = '#334155';
      ctx.fillRect(slitX - 10, y - 20, 22, 5);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(slitX - 8, y - 20, 2, 5);
      ctx.fillRect(slitX - 3, y - 20, 2, 5);
      ctx.fillRect(slitX + 2, y - 20, 2, 5);
      ctx.fillRect(slitX + 7, y - 20, 2, 5);

      // Protruding Dual Heavy Muzzles with conical flash hiders
      ctx.fillStyle = '#0f172a';
      const dualMuzzleX = dir > 0 ? slitX + 12 : slitX - 26;
      ctx.fillRect(dualMuzzleX, y - 25.5, 18, 3.5);
      ctx.fillRect(dualMuzzleX, y - 19.5, 18, 3.5);
      // Conical flash hider bells
      const bellX = dir > 0 ? dualMuzzleX + 18 : dualMuzzleX - 4;
      ctx.fillRect(bellX, y - 27, 4, 6);
      ctx.fillRect(bellX, y - 21, 4, 6);

      // Rooftop concrete crenellations & sandbag revetments
      for (let c = -40; c <= 28; c += 16) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(x + c, y - 50, 11, 7);
      }
      this.drawSandbagRow(x - 22, y - 51, 3);

      // Brass Trench Periscope poking over rooftop sandbags
      ctx.fillStyle = '#b45309';
      ctx.fillRect(x - (dir * 12), y - 62, 3, 12);
      ctx.fillRect(x - (dir * 12) + (dir * 2), y - 62, 5, 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x - (dir * 12) + (dir * 6), y - 61, 2, 2);

      // Rooftop ventilation pipe with subtle heat shimmer / smoke
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + (dir * 28), y - 56, 4, 8);
      ctx.fillStyle = '#475569';
      ctx.fillRect(x + (dir * 28) - 1.5, y - 58, 7, 2.5);

      // Ottoman Brass Crescent Emblem on bunker facade
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(x - (dir * 24), y - 37, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(x - (dir * 24) + 2, y - 37, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x - (dir * 24) + 4, y - 38, 2, 2);

      // Dual Heavy Brass Ammunition Boxes & Fed Belts
      ctx.fillStyle = '#15803d';
      ctx.fillRect(x - (dir * 26) - 5, y - 20, 12, 10);
      ctx.fillRect(x - (dir * 36) - 4, y - 18, 10, 8);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(slitX - (dir * 16) - 4, y - 24, 12, 4);
      ctx.fillRect(slitX - (dir * 16) - 4, y - 18, 12, 4);

      // Large pile of spent heavy brass casings
      ctx.fillStyle = '#fde047';
      for (let s = 0; s < 6; s++) {
        ctx.fillRect(x - 12 + s * 4, y - 8 - (s % 2) * 2, 2.5, 1.5);
      }
    }

    if (slot.level > 0 && slot.health < slot.maxHealth) {
      const barY = slot.level === 3 ? y - 56 : (slot.level === 2 ? y - 52 : y - 44);
      this.drawHealthBar(x, barY, slot.health, slot.maxHealth);
      const w = slot.level === 3 ? 84 : (slot.level === 2 ? 76 : 72);
      this.drawFortificationDamageFX(x, y, slot, w, 32, hqTier);
    }

    ctx.restore();
  }

  private drawArtilleryEmplacement(x: number, y: number, slot: BuildSlot, hqTier: number = 1) {
    const ctx = this.ctx;
    ctx.save();

    if (slot.level === 0) {
      // LEVEL 0: Unbuilt Artillery Platform Blueprint - Heavy circular timber turntable, ammo crate & artillery shell
      ctx.fillStyle = '#3e2106';
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 44, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Heavy timber turntable circular wheel bed
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 30, y - 6, 60, 5);
      ctx.fillStyle = '#572c0c';
      for (let px = x - 28; px < x + 28; px += 8) {
        ctx.fillRect(px, y - 6, 1.5, 5);
      }

      // Wooden artillery shell chest with brass 75mm shell
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x - 18, y - 16, 18, 11);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - 19, y - 18, 20, 3);
      // Brass 75mm artillery shell ready
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x + 5, y - 14, 5, 12);
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(x + 5, y - 14);
      ctx.lineTo(x + 7.5, y - 19);
      ctx.lineTo(x + 10, y - 14);
      ctx.closePath();
      ctx.fill();

      // Red artillery sighting stake with yellow twine
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x + 24, y - 26, 3, 26);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 24, y - 22, 3, 4);
      ctx.fillRect(x + 24, y - 14, 3, 4);
    } else {
      const dir = slot.side === 'left' ? -1 : 1;

      if (hqTier === 3) {
        // STONE TIER: Kesme Taş Ağır Sahra Topu Tabyası (Stone Artillery Bastion)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(x - 56, y);
        ctx.lineTo(x - 44, y - 28);
        ctx.lineTo(x + 44, y - 28);
        ctx.lineTo(x + 56, y);
        ctx.closePath();
        ctx.fill();

        // Stone masonry lines
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x - 44, y - 18, 88, 1.5);
        ctx.fillRect(x - 44, y - 8, 88, 1.5);

        // Cut stone block row along top parapet
        this.drawStoneBlockRow(x - 42, y - 37, 4);

        // Stone Ammo Niches inside bastion wall
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x - (dir * 38), y - 20, 18, 14);
        ctx.fillStyle = '#eab308'; // Brass shells
        ctx.fillRect(x - (dir * 36), y - 18, 3, 10);
        ctx.fillRect(x - (dir * 31), y - 18, 3, 10);
      } else if (hqTier === 2) {
        // REINFORCED TIMBER TIER: Heavy Timber Casemate & Camouflage Netting
        ctx.fillStyle = '#543619';
        ctx.beginPath();
        ctx.moveTo(x - 52, y);
        ctx.lineTo(x - 40, y - 22);
        ctx.lineTo(x + 40, y - 22);
        ctx.lineTo(x + 52, y);
        ctx.closePath();
        ctx.fill();

        this.drawSandbagRow(x - 42, y - 25, 5);

        // Camouflage netting suspended on posts
        ctx.fillStyle = '#451a03';
        ctx.fillRect(x - 48, y - 44, 4, 30);
        ctx.fillRect(x + 44, y - 44, 4, 30);
        ctx.fillStyle = 'rgba(74, 98, 47, 0.85)';
        ctx.beginPath();
        ctx.moveTo(x - 52, y - 44);
        ctx.quadraticCurveTo(x, y - 49, x + 52, y - 44);
        ctx.lineTo(x + 50, y - 38);
        ctx.quadraticCurveTo(x, y - 43, x - 50, y - 38);
        ctx.closePath();
        ctx.fill();
      } else {
        // WOOD TIER: Earthwork & Wicker Fascine Revetment
        ctx.fillStyle = '#543619';
        ctx.beginPath();
        ctx.moveTo(x - 52, y);
        ctx.lineTo(x - 40, y - 22);
        ctx.lineTo(x + 40, y - 22);
        ctx.lineTo(x + 52, y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#78350f';
        for (let f = -44; f < 44; f += 8) {
          ctx.fillRect(x + f, y - 21, 6, 21);
        }
        this.drawSandbagRow(x - 42, y - 25, 5);
      }

      // Krupp 75mm Sahra Topu (Field Artillery Gun)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.lineTo(x - (dir * 34), y);
      ctx.lineTo(x - (dir * 38), y);
      ctx.lineTo(x, y - 15);
      ctx.closePath();
      ctx.fill();

      // Carriage Wheels with Iron Tires
      const wheelX = x - (dir * 2);
      const wheelY = y - 16;
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(wheelX, wheelY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.5;
      for (let a = 0; a < Math.PI; a += Math.PI / 4) {
        ctx.beginPath();
        ctx.moveTo(wheelX + Math.cos(a) * 14, wheelY + Math.sin(a) * 14);
        ctx.lineTo(wheelX - Math.cos(a) * 14, wheelY - Math.sin(a) * 14);
        ctx.stroke();
      }
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(wheelX, wheelY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Long Gun Barrel
      ctx.save();
      ctx.translate(wheelX, wheelY - 2);
      ctx.rotate(dir * -0.62);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(4, 2, 22, 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-8, -4, 40, 7);
      ctx.fillStyle = '#475569';
      ctx.fillRect(8, -3.5, 24, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(32, -4.5, 6, 8); // Muzzle ring
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-10, -5, 8, 9);
      ctx.restore();

      // Shell crate with polished brass 75mm cartridges
      const crateX = x - (dir * 30);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(crateX, y - 12, 16, 12);
      ctx.strokeStyle = '#451a03';
      ctx.strokeRect(crateX, y - 12, 16, 12);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(crateX + 2, y - 15, 3, 5);
      ctx.fillRect(crateX + 7, y - 15, 3, 5);
      ctx.fillRect(crateX + 12, y - 15, 3, 5);
    }

    if (slot.level > 0 && slot.health < slot.maxHealth) {
      this.drawHealthBar(x, y - 52, slot.health, slot.maxHealth);
      this.drawFortificationDamageFX(x, y, slot, 90, 26, hqTier);
    }

    ctx.restore();
  }

  private drawWatchtower(x: number, y: number, slot: BuildSlot, hqTier: number = 1) {
    const ctx = this.ctx;
    ctx.save();

    if (slot.level === 0) {
      // LEVEL 0: Unbuilt Watchtower Blueprint - 4 Heavy Corner Timber Pillars, Flat Ladder & Brass Telescope on Tripod
      ctx.fillStyle = '#3e2106';
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 42, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4 Heavy square timber foundation corner blocks with iron brackets
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 22, y - 10, 8, 10);
      ctx.fillRect(x + 14, y - 10, 8, 10);
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 23, y - 8, 10, 2);
      ctx.fillRect(x + 13, y - 8, 10, 2);

      // Wooden ladder laid flat on ground ready for erection
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x - 28, y - 6, 56, 1.8);
      ctx.fillRect(x - 28, y - 2, 56, 1.8);
      ctx.fillStyle = '#d97706';
      for (let rx = x - 26; rx < x + 26; rx += 7) {
        ctx.fillRect(rx, y - 6, 1.8, 5);
      }

      // Surveyor's brass spotting scope / telescope on tripod
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - 2, y - 20, 2, 18);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x - 6, y - 23, 10, 3.5);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x + 3, y - 24, 3, 5);
    } else if (hqTier === 3) {
      // STONE TIER: Kesme Taş Gözetleme Burcu (Solid Stone Bastion Tower)
      const height = 88;

      // Solid stone tower shaft
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 22, y - height, 44, height);

      // Stone block masonry lines
      ctx.fillStyle = '#1e293b';
      for (let sy = y - height + 10; sy < y; sy += 12) {
        ctx.fillRect(x - 22, sy, 44, 1.5);
      }
      for (let sy = y - height; sy < y; sy += 12) {
        ctx.fillRect(x - 6, sy, 1.5, 12);
        ctx.fillRect(x + 10, sy + 6, 1.5, 12);
      }

      // Arched stone window opening with spotter binoculars
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y - height + 30, 8, Math.PI, 0);
      ctx.lineTo(x + 8, y - height + 44);
      ctx.lineTo(x - 8, y - height + 44);
      ctx.closePath();
      ctx.fill();

      // Stone crenellations on tower top parapet
      for (let c = -24; c <= 16; c += 10) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(x + c, y - height - 10, 8, 10);
      }

      // Brass Binoculars / Spotting Scope
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 6, y - height - 14, 3, 10);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x + 3, y - height - 17, 9, 3.5);

      // Stone finial with Ottoman Red Crescent Flag
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x - 1, y - height - 38, 2, 28);
      const fWave = Math.sin(this.animTimer * 5) * 2;
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.moveTo(x + 1, y - height - 37);
      ctx.lineTo(x + 16 + fWave, y - height - 32);
      ctx.lineTo(x + 1, y - height - 27);
      ctx.closePath();
      ctx.fill();
    } else {
      // WOOD & REINFORCED TIMBER TIER: Timber Trestle Tower with Ladder
      const height = slot.level === 1 ? 68 : 88;

      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(x - 22, y);
      ctx.lineTo(x - 18, y);
      ctx.lineTo(x - 15, y - height);
      ctx.lineTo(x - 19, y - height);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x + 18, y);
      ctx.lineTo(x + 22, y);
      ctx.lineTo(x + 19, y - height);
      ctx.lineTo(x + 15, y - height);
      ctx.closePath();
      ctx.fill();

      // Diagonal X-Brace timber trusses
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - 20, y);
      ctx.lineTo(x + 17, y - height * 0.48);
      ctx.moveTo(x + 20, y);
      ctx.lineTo(x - 17, y - height * 0.48);
      ctx.moveTo(x - 17, y - height * 0.48);
      ctx.lineTo(x + 16, y - height);
      ctx.moveTo(x + 17, y - height * 0.48);
      ctx.lineTo(x - 16, y - height);
      ctx.stroke();

      ctx.fillStyle = '#572c0c';
      ctx.fillRect(x - 19, y - height * 0.48 - 2, 38, 4);

      // Wooden ladder
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 4, y - height, 1.8, height);
      ctx.fillRect(x + 3, y - height, 1.8, height);
      ctx.fillStyle = '#d97706';
      for (let ry = y - 4; ry > y - height; ry -= 7) {
        ctx.fillRect(x - 4, ry, 8.8, 1.8);
      }

      // Platform & Sniper Parapet
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 26, y - height - 3, 52, 5);
      this.drawSandbagRow(x - 24, y - height - 12, 3);

      // Brass spotting scope
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x + 10, y - height - 16, 3, 10);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x + 7, y - height - 19, 9, 3.5);

      if (slot.level >= 2 || hqTier >= 2) {
        // Pitched Roof
        ctx.fillStyle = '#451a03';
        ctx.fillRect(x - 25, y - height - 24, 3, 22);
        ctx.fillRect(x + 22, y - height - 24, 3, 22);
        ctx.fillStyle = '#3f2008';
        ctx.beginPath();
        ctx.moveTo(x - 30, y - height - 23);
        ctx.lineTo(x, y - height - 40);
        ctx.lineTo(x + 30, y - height - 23);
        ctx.closePath();
        ctx.fill();

        // Ottoman Flag
        ctx.fillStyle = '#d97706';
        ctx.fillRect(x - 1, y - height - 52, 2, 14);
        const fWave = Math.sin(this.animTimer * 5) * 2;
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(x + 1, y - height - 51);
        ctx.lineTo(x + 14 + fWave, y - height - 46);
        ctx.lineTo(x + 1, y - height - 41);
        ctx.closePath();
        ctx.fill();
      }
    }

    if (slot.level > 0 && slot.health < slot.maxHealth) {
      this.drawHealthBar(x, y - 98, slot.health, slot.maxHealth);
    }

    ctx.restore();
  }

  private drawHospital(x: number, y: number, slot: BuildSlot, hqTier: number = 1) {
    const ctx = this.ctx;
    ctx.save();

    if (slot.level === 0) {
      // LEVEL 0: Unbuilt Field Hospital Blueprint - Stretcher Frame, Red Crescent Medical Crate & Canvas Tent Pegs
      ctx.fillStyle = '#3e2106';
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 44, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wooden stretcher frame on ground
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 22, y - 8, 44, 2);
      ctx.fillRect(x - 22, y - 4, 44, 2);
      ctx.fillStyle = '#e2e8f0'; // White linen stretcher bed
      ctx.fillRect(x - 16, y - 7, 32, 4);

      // Medical Supply Box with prominent Red Crescent (Hilal-i Ahmer) emblem
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x - 10, y - 18, 20, 12);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 10, y - 18, 20, 12);

      // Red Crescent Emblem
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(x, y - 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(x + 1.4, y - 12, 3.2, 0, Math.PI * 2);
      ctx.fill();

      // White rolled tent canvas bundle on wooden pallets
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.ellipse(x + 22, y - 6, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.stroke();

      // Perimeter tent pegs
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 36, y - 12, 2.5, 12);
      ctx.fillRect(x + 34, y - 12, 2.5, 12);
    } else if (hqTier === 3) {
      // STONE TIER: Kesme Taş Sahra Hastanesi Binası (Stone Field Hospital)
      // Solid cut stone block walls
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 48, y - 50, 96, 50);

      // Stone block courses and mortar
      ctx.fillStyle = '#1e293b';
      for (let sy = y - 50; sy < y; sy += 10) {
        ctx.fillRect(x - 48, sy, 96, 1.5);
      }
      for (let sy = y - 50; sy < y; sy += 10) {
        ctx.fillRect(x - 24, sy, 1.5, 10);
        ctx.fillRect(x + 20, sy, 1.5, 10);
      }

      // Slate stone pitched roof
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(x - 52, y - 50);
      ctx.lineTo(x, y - 72);
      ctx.lineTo(x + 52, y - 50);
      ctx.closePath();
      ctx.fill();

      // Stone chimney with rising medical sterilizer smoke
      ctx.fillStyle = '#475569';
      ctx.fillRect(x + 30, y - 80, 10, 16);
      const smokeProg = (this.animTimer * 1.5) % 2;
      ctx.fillStyle = 'rgba(241, 245, 249, 0.6)';
      ctx.beginPath();
      ctx.arc(x + 35, y - 84 - smokeProg * 12, 4 + smokeProg * 3, 0, Math.PI * 2);
      ctx.fill();

      // Arched stone doorway
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x, y - 32, 12, Math.PI, 0);
      ctx.lineTo(x + 12, y);
      ctx.lineTo(x - 12, y);
      ctx.closePath();
      ctx.fill();

      // White Marble Hilal-i Ahmer Red Crescent Plaque above door
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x - 14, y - 48, 28, 14);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(x, y - 41, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(x + 1.8, y - 41, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (hqTier === 2 || slot.level >= 2) {
      // REINFORCED TIMBER TIER: Log Cabin Field Hospital
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 46, y - 14, 92, 14);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 44, y - 48, 88, 34);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - 44, y - 36, 88, 2);
      ctx.fillRect(x - 44, y - 24, 88, 2);

      // Pitched timber roof
      ctx.fillStyle = '#3f1f07';
      ctx.beginPath();
      ctx.moveTo(x - 48, y - 48);
      ctx.lineTo(x, y - 66);
      ctx.lineTo(x + 48, y - 48);
      ctx.closePath();
      ctx.fill();

      // Door & Red Crescent Plaque
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 10, y - 30, 20, 30);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 12, y - 44, 24, 12);
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(x, y - 38, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + 1.5, y - 38, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // WOOD TIER: White Canvas Field Hospital Tent
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 42, y - 4, 84, 4);

      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(x, y - 50);
      ctx.lineTo(x - 40, y);
      ctx.lineTo(x + 40, y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Door flap
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(x, y - 38);
      ctx.lineTo(x - 12, y);
      ctx.lineTo(x + 12, y);
      ctx.closePath();
      ctx.fill();

      // Red Crescent
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(x, y - 26, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(x + 3, y - 26, 6.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (slot.level > 0 && slot.health < slot.maxHealth) {
      this.drawHealthBar(x, y - 76, slot.health, slot.maxHealth);
    }

    ctx.restore();
  }

  private drawArmory(x: number, y: number, slot: BuildSlot, hqTier: number = 1) {
    const ctx = this.ctx;
    ctx.save();

    if (slot.level === 0) {
      // LEVEL 0: Unbuilt Armory Blueprint - Stone foundation platform, stacked ammunition crates with iron straps & blueprint stakes
      ctx.fillStyle = '#3e2106';
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 48, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stone & heavy timber sill foundation
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 36, y - 6, 72, 6);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x - 34, y - 6, 68, 2);

      // Stack of 3 wooden munitions crates with black iron bands
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 22, y - 18, 22, 12);
      ctx.fillRect(x + 2, y - 18, 22, 12);
      ctx.fillRect(x - 10, y - 28, 20, 10);
      // Iron bands on crates
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 18, y - 18, 2.5, 12);
      ctx.fillRect(x - 6, y - 18, 2.5, 12);
      ctx.fillRect(x + 6, y - 18, 2.5, 12);
      ctx.fillRect(x + 18, y - 18, 2.5, 12);
      ctx.fillRect(x - 6, y - 28, 2.5, 10);
      ctx.fillRect(x + 4, y - 28, 2.5, 10);

      // Yellow surveyor twine stakes
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 36, y - 22, 3, 22);
      ctx.fillRect(x + 33, y - 22, 3, 22);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x - 36, y - 16);
      ctx.lineTo(x + 33, y - 16);
      ctx.stroke();
    } else if (hqTier === 3) {
      // STONE TIER: Kesme Taş ve Çelik Kasalı Mühimmat Mahzeni (Stone Munitions Vault)
      ctx.fillStyle = '#334155';
      ctx.fillRect(x - 44, y - 48, 88, 48);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 44, y - 32, 88, 1.5);
      ctx.fillRect(x - 44, y - 16, 88, 1.5);
      for (let bx = x - 44; bx < x + 44; bx += 20) {
        ctx.fillRect(bx, y - 48, 1.5, 48);
      }

      // Reinforced steel vault blast door with brass wheel lock
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x - 15, y - 36, 30, 36);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x - 13, y - 32, 26, 2);
      ctx.fillRect(x - 13, y - 18, 26, 2);
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(x, y - 20, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Artillery shell racks on stone roof
      this.drawStoneBlockRow(x - 42, y - 56, 4);
    } else if (hqTier === 2) {
      // REINFORCED TIMBER TIER: Heavy Timber Munitions Bunker with Log Planks & Sandbags
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - 38, y - 42, 76, 42);
      ctx.fillStyle = '#291102';
      ctx.fillRect(x - 42, y - 46, 84, 6);
      for (let bx = x - 36; bx < x + 36; bx += 8) {
        ctx.fillStyle = '#3b1905';
        ctx.fillRect(bx, y - 42, 1.5, 42);
      }
      this.drawSandbagRow(x - 32, y - 51, 4);

      // Iron reinforced door
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x - 14, y - 32, 28, 32);
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 12, y - 28, 24, 2);
      ctx.fillRect(x - 12, y - 16, 24, 2);
    } else {
      // WOOD TIER: Earthwork & Timber Munitions Shed & Crates
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 32, y - 34, 64, 34);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x - 36, y - 38, 72, 6);

      // Wooden ammo crates outside
      ctx.fillStyle = '#92400e';
      ctx.fillRect(x - 22, y - 20, 18, 12);
      ctx.fillRect(x + 4, y - 20, 18, 12);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x - 18, y - 16, 10, 4);
      ctx.fillRect(x + 8, y - 16, 10, 4);
    }

    // --- TÜFEK TEZGAHI (RIFLE RACK BENCH IN FRONT OF ARMORY) ---
    // Crafted wooden/brass gun rack bench holding up to 6 Mauser rifles (visual counting)
    const benchX = x - 28;
    const benchY = y;
    const rifles = Math.min(6, Math.max(0, slot.availableRifles || 0));

    // Shadow under the rifle bench
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(benchX, benchY, 28, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Heavy timber rack base
    ctx.fillStyle = '#291305';
    ctx.fillRect(benchX - 25, benchY - 4, 50, 4);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(benchX - 24, benchY - 4, 48, 2);

    // Left & right A-frame support posts
    ctx.fillStyle = '#572c0c';
    ctx.fillRect(benchX - 23, benchY - 28, 4, 24);
    ctx.fillRect(benchX + 19, benchY - 28, 4, 24);
    // Angled struts
    ctx.fillStyle = '#78350f';
    ctx.fillRect(benchX - 24, benchY - 14, 6, 3);
    ctx.fillRect(benchX + 18, benchY - 14, 6, 3);

    // Double horizontal slotted rifle rails with individual rest notches
    ctx.fillStyle = '#451a03';
    ctx.fillRect(benchX - 23, benchY - 20, 46, 3);
    ctx.fillRect(benchX - 23, benchY - 10, 46, 3);
    // Polished brass corner braces
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(benchX - 24, benchY - 21, 3, 5);
    ctx.fillRect(benchX + 21, benchY - 21, 3, 5);

    // Render 6 Mauser rifle positions on the bench with high visual clarity
    for (let i = 0; i < 6; i++) {
      const rx = benchX - 18 + i * 7.2;
      if (i < rifles) {
        // Detailed Mauser 1893 Rifle standing in rack slot
        // 1. Walnut wooden stock & grip
        ctx.fillStyle = '#78350f';
        ctx.fillRect(rx - 0.5, benchY - 14, 3, 10);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(rx + 0.5, benchY - 14, 1.5, 10);

        // 2. Steel blued long rifle barrel
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(rx, benchY - 30, 2, 17);
        ctx.fillStyle = '#475569';
        ctx.fillRect(rx, benchY - 30, 1, 17);

        // 3. Polished steel bolt-action receiver & trigger guard
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(rx - 1.5, benchY - 16, 5, 2.5);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(rx - 1, benchY - 13.5, 4, 1.5);

        // 4. Golden brass barrel retention bands
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(rx - 0.5, benchY - 22, 3, 1.5);
        ctx.fillRect(rx - 0.5, benchY - 27, 3, 1.5);

        // 5. Gleaming silver bayonet tip pointing high
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(rx + 0.5, benchY - 35);
        ctx.lineTo(rx + 2, benchY - 30);
        ctx.lineTo(rx + 0.5, benchY - 30);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(rx + 0.5, benchY - 30, 1.5, 2);
      } else {
        // Clear empty notch cutout on the wooden rail
        ctx.fillStyle = '#1c0d02';
        ctx.fillRect(rx - 0.5, benchY - 21, 3, 4);
        ctx.fillRect(rx - 0.5, benchY - 11, 3, 4);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(rx - 0.5, benchY - 21, 3, 4);
      }
    }

    if (slot.level > 0 && slot.health < slot.maxHealth) {
      this.drawHealthBar(x, y - 60, slot.health, slot.maxHealth);
    }

    ctx.restore();
  }

  private drawTreeGrove(x: number, y: number, slot: BuildSlot) {
    const ctx = this.ctx;
    ctx.save();

    if (slot.isScavenged) {
      // Chopped Tree Stumps with visible rings and wood chips on cleared meadow
      // Main stump
      ctx.fillStyle = '#572c0c';
      ctx.fillRect(x - 14, y - 10, 12, 10);
      ctx.fillStyle = '#d97706'; // Top ring
      ctx.beginPath();
      ctx.ellipse(x - 8, y - 10, 6, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Second smaller stump
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 5, y - 7, 9, 7);
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(x + 9.5, y - 7, 4.5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Scattered wood chips on flat grass
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(x - 18, y - 3, 3, 2);
      ctx.fillRect(x + 16, y - 4, 4, 2);
      ctx.fillRect(x - 2, y - 2, 3, 2);
    } else {
      // Gallipoli Turkish Pine Trees (Çam Ağaçları) with gentle breeze animation
      const trees = [-18, 0, 18];
      const windSway = Math.sin(this.animTimer * 1.5 + (slot.x || 0) * 0.005) * 2.5;

      for (let i = 0; i < trees.length; i++) {
        const ox = trees[i];
        const tx = x + ox;
        const trunkH = i === 1 ? 48 : 38;
        const foliageScale = i === 1 ? 1.15 : 0.95;

        // Trunk
        ctx.fillStyle = '#451a03';
        ctx.fillRect(tx - 3, y - trunkH, 6, trunkH);

        // Bark texture
        ctx.fillStyle = '#290f02';
        ctx.fillRect(tx - 1, y - trunkH + 8, 2, trunkH - 12);

        // Lower foliage layer
        ctx.fillStyle = '#14532d';
        ctx.beginPath();
        ctx.moveTo(tx - 20 * foliageScale, y - trunkH * 0.45);
        ctx.lineTo(tx + windSway, y - trunkH * 1.1);
        ctx.lineTo(tx + 20 * foliageScale, y - trunkH * 0.45);
        ctx.closePath();
        ctx.fill();

        // Mid foliage layer
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.moveTo(tx - 16 * foliageScale, y - trunkH * 0.8);
        ctx.lineTo(tx + windSway * 1.2, y - trunkH * 1.45);
        ctx.lineTo(tx + 16 * foliageScale, y - trunkH * 0.8);
        ctx.closePath();
        ctx.fill();

        // Top crown layer
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.moveTo(tx - 11 * foliageScale, y - trunkH * 1.15);
        ctx.lineTo(tx + windSway * 1.5, y - trunkH * 1.75);
        ctx.lineTo(tx + 11 * foliageScale, y - trunkH * 1.15);
        ctx.closePath();
        ctx.fill();
      }

      // Kingdom-style Marked Tree: Carved Cross on the central trunk & Overhead Status
      if (slot.isMarkedForChop) {
        const markY = y - 24;
        ctx.save();
        // Carved notch patch on bark
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(x - 6, markY - 6, 12, 12);
        // Red carved cross mark (Kingdom tree felling insignia)
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x - 4.5, markY - 4.5);
        ctx.lineTo(x + 4.5, markY + 4.5);
        ctx.moveTo(x + 4.5, markY - 4.5);
        ctx.lineTo(x - 4.5, markY + 4.5);
        ctx.stroke();

        // If tree is being actively chopped, show cutting progress radial gauge!
        if (slot.chopProgress && slot.chopProgress > 0) {
          const prog = Math.min(1, slot.chopProgress);
          const gy = y - 76;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.beginPath();
          ctx.arc(x, gy, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(x, gy, 15, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
          ctx.stroke();

          const chopSwing = Math.sin(this.animTimer * 12) * 2;
          ctx.fillStyle = '#fde047';
          ctx.font = '12px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🪓', x + chopSwing, gy);
        } else {
          // Waiting for an idle Mehmetçik to arrive
          const bounce = Math.sin(this.animTimer * 5) * 2.5;
          const gy = y - 76 + bounce;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.beginPath();
          ctx.arc(x, gy, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.font = '10px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🪓', x, gy);
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }

  private drawIronQuarry(x: number, y: number, slot: BuildSlot) {
    const ctx = this.ctx;
    ctx.save();

    if (slot.isScavenged) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 15, y - 5, 30, 5);
    } else {
      // Destroyed Allied Ammunition Wagon / Metal Scrap Quarry
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.moveTo(x - 25, y);
      ctx.lineTo(x - 15, y - 24);
      ctx.lineTo(x + 20, y - 20);
      ctx.lineTo(x + 28, y);
      ctx.closePath();
      ctx.fill();

      // Shiny Iron ore / brass scrap veins
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(x - 8, y - 16, 4, 4);
      ctx.fillRect(x + 6, y - 12, 5, 4);

      // Scavenge countdown gauge
      if (slot.scavengeTimer && slot.scavengeTimer > 0) {
        const prog = Math.min(1, slot.scavengeTimer / 0.55);
        const gy = y - 38;
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.beginPath();
        ctx.arc(x, gy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, gy, 14, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛏️', x, gy);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  private drawRecruitCamp(x: number, y: number, slot: BuildSlot, hqTier: number = 1) {
    const ctx = this.ctx;
    ctx.save();

    // --- ANADOLU VE GELİBOLU TARİHİ GÖNÜLLÜ KÖYÜ (Authentic Ottoman Gallipoli Village) ---
    // 1. Village Square Cobblestones & Earth
    ctx.fillStyle = '#6b5847';
    ctx.beginPath();
    ctx.ellipse(x, y - 1, 62, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cobblestone patches
    ctx.fillStyle = '#524335';
    for (let cx = x - 48; cx <= x + 48; cx += 14) {
      ctx.fillRect(cx, y - 3, 5, 2.5);
    }

    // 2. Historic Two-Story Ottoman Village House with Bay Window (Cumbalı Gelibolu Evi)
    const houseX = x - 46;
    const houseW = 42;
    // Ground Floor: Natural Stone Masonry (Zemin Kat Taş Örgü)
    ctx.fillStyle = '#78716c';
    ctx.fillRect(houseX, y - 24, houseW, 24);
    ctx.fillStyle = '#57534e';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.fillRect(houseX + c * 14 + (r % 2) * 5, y - 22 + r * 7, 10, 5);
      }
    }

    // Heavy Timber House Door with Iron Ring
    ctx.fillStyle = '#451a03';
    ctx.fillRect(houseX + 6, y - 14, 10, 14);
    ctx.fillStyle = '#fde047'; // Brass keyhole
    ctx.fillRect(houseX + 13, y - 7, 1.5, 2);

    // Upper Floor: Whitewashed Adobe & Timber Framing (Ahşap Karkas & Cumba)
    const upperY = y - 44;
    ctx.fillStyle = '#f5f5f4'; // Whitewash
    ctx.fillRect(houseX - 2, upperY, houseW + 4, 20);

    // Cantilever Timber Corbel Brackets (Ahşap Cumba Destek Payandaları)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(houseX - 3, y - 24, houseW + 6, 2.5);
    ctx.beginPath();
    ctx.moveTo(houseX, y - 22);
    ctx.lineTo(houseX - 3, y - 24);
    ctx.lineTo(houseX - 1, y - 24);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(houseX + houseW, y - 22);
    ctx.lineTo(houseX + houseW + 3, y - 24);
    ctx.lineTo(houseX + houseW + 1, y - 24);
    ctx.fill();

    // Timber Half-Timbered Frame Beams (Ahşap Hatıllar & Çaprazlar)
    ctx.fillStyle = '#78350f';
    ctx.fillRect(houseX - 2, upperY, 2.5, 20);
    ctx.fillRect(houseX + houseW + 1, upperY, 2.5, 20);
    ctx.fillRect(houseX + 18, upperY, 2.5, 20);
    ctx.fillRect(houseX - 2, upperY + 9, houseW + 4, 2);

    // Traditional Latticed Windows with warm candle glow
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(houseX + 4, upperY + 3, 9, 10);
    ctx.fillRect(houseX + 26, upperY + 3, 9, 10);
    ctx.fillStyle = '#fef08a'; // Warm yellow interior light
    ctx.fillRect(houseX + 5, upperY + 4, 7, 8);
    ctx.fillRect(houseX + 27, upperY + 4, 7, 8);
    // Window mullions (Kafes çıtaları)
    ctx.fillStyle = '#451a03';
    ctx.fillRect(houseX + 8, upperY + 3, 1, 10);
    ctx.fillRect(houseX + 30, upperY + 3, 1, 10);
    ctx.fillRect(houseX + 4, upperY + 8, 9, 1);
    ctx.fillRect(houseX + 26, upperY + 8, 9, 1);

    // Terracotta Clay Tile Roof (Alaturka Kiremit Çatı)
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(houseX - 6, upperY);
    ctx.lineTo(houseX + houseW / 2, upperY - 14);
    ctx.lineTo(houseX + houseW + 6, upperY);
    ctx.closePath();
    ctx.fill();
    // Roof eaves & ridge
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(houseX - 6, upperY - 1, houseW + 12, 2.5);

    // Stone Chimney with Puffed Smoke (Tüten Taş Baca)
    ctx.fillStyle = '#57534e';
    ctx.fillRect(houseX + 28, upperY - 18, 6, 10);
    ctx.fillStyle = '#44403c';
    ctx.fillRect(houseX + 27, upperY - 19, 8, 2);
    // Animated chimney smoke puff
    const smokeY = upperY - 22 - (Math.floor(this.animTimer * 5) % 12);
    ctx.fillStyle = 'rgba(214, 211, 209, 0.5)';
    ctx.beginPath();
    ctx.arc(houseX + 31 + Math.sin(this.animTimer * 3) * 3, smokeY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 3. Historic Stone Village Fountain & Water Trough (Tarihi Köy Çeşmesi & Yalak)
    const fX = x + 34;
    // Back Stone Wall of fountain
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(fX - 8, y - 26, 16, 26);
    // Arch of fountain
    ctx.fillStyle = '#78716c';
    ctx.fillRect(fX - 9, y - 28, 18, 3.5);
    ctx.fillRect(fX - 7, y - 24, 14, 2);
    // Brass Water Spout & Dripping water
    ctx.fillStyle = '#eab308';
    ctx.fillRect(fX - 1.5, y - 16, 3, 4);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(fX - 0.5, y - 12, 1.5, 5); // Stream
    // Stone Basin Trough
    ctx.fillStyle = '#57534e';
    ctx.fillRect(fX - 10, y - 7, 20, 7);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(fX - 8, y - 6, 16, 3); // Basin water

    // 4. Village Sycamore Tree Shade (Ulu Çınar Ağacı)
    const treeX = x + 50;
    ctx.fillStyle = '#451a03';
    ctx.fillRect(treeX, y - 48, 5, 48);
    // Foliage canopy
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(treeX + 2, y - 52, 18, 0, Math.PI * 2);
    ctx.arc(treeX - 10, y - 46, 12, 0, Math.PI * 2);
    ctx.arc(treeX + 12, y - 46, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(treeX + 2, y - 55, 14, 0, Math.PI * 2);
    ctx.fill();

    // 5. Village Square Notice Post & Recruitment Box (Seferberlik Duyurusu & Sandık)
    const postX = x - 4;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(postX - 1.5, y - 28, 3, 28);
    // Red Crescent Mobilization Notice (Kırmızı Hilalli Seferberlik İlanı)
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(postX - 7, y - 28, 14, 10);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(postX - 1, y - 23, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(postX + 0.5, y - 23, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Recruitment Donation Box on bench
    ctx.fillStyle = '#92400e';
    ctx.fillRect(postX - 6, y - 8, 12, 8);
    ctx.strokeStyle = '#451a03';
    ctx.strokeRect(postX - 6, y - 8, 12, 8);

    // Deposited coins visualization
    const deposited = Math.min(2, slot.coinsDeposited || 0);
    if (deposited > 0) {
      for (let c = 0; c < deposited; c++) {
        const coinY = y - 9 - c * 4;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(postX, coinY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.font = 'bold 8.5px "Cinzel", system-ui, sans-serif';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${deposited}/2 🪙 Hazır`, postX, y - 34);
    }

    // Warm Campfire in Square
    this.drawCampfire(x + 14, y);

    // 6. Waiting Volunteer Recruits (Kingdom style vagrants waiting around camp: max 2)
    const recruits = slot.availableRecruits ?? 2;

    for (let i = 0; i < recruits; i++) {
      const rx = x + (i === 0 ? -18 : 6);
      const ry = y;
      const breathe = Math.sin(this.animTimer * 4 + i * 2) * 1.5;

      ctx.save();
      ctx.translate(rx, ry);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, -1, 7, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs / Traditional Ottoman Shalwar Trousers & Puttees (Şalvar ve Çarık)
      ctx.fillStyle = '#44403c';
      ctx.fillRect(-3.5, -8, 3.5, 8);
      ctx.fillRect(0, -8, 3.5, 8);
      ctx.fillStyle = '#292524'; // Leather raw-hide sandals (Çarık)
      ctx.fillRect(-4, -2, 4, 2);
      ctx.fillRect(0, -2, 4, 2);

      // Torso: Embroidered Vest over homespun linen shirt (Cepken Yelek ve Kuşak)
      ctx.fillStyle = i === 0 ? '#854d0e' : '#1e3a8a'; // Wool vest
      ctx.fillRect(-4.5, -18 + breathe, 9, 10);
      ctx.fillStyle = '#dc2626'; // Red woolen sash belt (Kırmızı Kuşak)
      ctx.fillRect(-4.5, -10 + breathe, 9, 2.5);
      ctx.fillStyle = '#f5f5f4'; // Shirt chest V
      ctx.fillRect(-2, -18 + breathe, 4, 5);

      // Head & Face
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(-3, -24 + breathe, 6, 6);
      ctx.fillStyle = '#1c1917'; // Mustache
      ctx.fillRect(-1.5, -20 + breathe, 3.5, 1.5);

      // Traditional Woolen Cap / Enveriye Kabalak (Gönüllü Başlığı)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-4, -27 + breathe, 8, 3.5);
      ctx.fillRect(-2, -25 + breathe, 4, 1.5);

      // Floating Recruit Badge / Coin Prompt above ready recruit
      const coinFloat = Math.sin(this.animTimer * 5 + i * 2) * 2;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(0, -34 + breathe + coinFloat, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    // Status / Count indicator text
    ctx.font = 'bold 9.5px "Cinzel", system-ui, sans-serif';
    ctx.fillStyle = recruits > 0 ? '#38bdf8' : '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      recruits > 0 ? `🪖 Gönüllü Köyü: ${recruits}/2` : (deposited > 0 ? `🪙 ${deposited} Sikke Bırakıldı` : 'Gönüllü Bekleniyor...'),
      x,
      y - 48
    );

    ctx.restore();
  }

  private drawRelicShrine(x: number, y: number, slot: BuildSlot) {
    const ctx = this.ctx;
    ctx.save();

    const isUnlocked = slot.level >= 2;
    const coins = slot.coinsDeposited || 0;
    const maxCoins = 8;
    const isDamage = slot.id.includes('statue_damage');
    const isHealth = slot.id.includes('statue_health');
    const isDefense = slot.id.includes('statue_defense');

    // 1. Grand Stepped Classical Marble Monument Pedestal (Kaide)
    // Bottom plinth
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 30, y - 8, 60, 8);
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 29, y - 7, 58, 2);

    // Middle pedestal body
    ctx.fillStyle = '#475569';
    ctx.fillRect(x - 25, y - 30, 50, 22);
    // Pedestal side pilasters
    ctx.fillStyle = '#334155';
    ctx.fillRect(x - 25, y - 30, 4, 22);
    ctx.fillRect(x + 21, y - 30, 4, 22);

    // Top capital slab / cornice
    ctx.fillStyle = '#64748b';
    ctx.fillRect(x - 28, y - 34, 56, 4);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x - 27, y - 34, 54, 1.5);

    // Pedestal Emblem / Relief Crest
    if (isDamage) {
      // Miniature Crossed Swords Crest
      ctx.fillStyle = isUnlocked ? '#fbbf24' : '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 27);
      ctx.lineTo(x + 6, y - 23);
      ctx.moveTo(x + 6, y - 27);
      ctx.lineTo(x - 6, y - 23);
      ctx.stroke();
    } else if (isHealth) {
      // Miniature Red Crescent Relief
      ctx.fillStyle = isUnlocked ? '#ef4444' : '#e2e8f0';
      ctx.beginPath();
      ctx.arc(x, y - 25, 4, -0.6 * Math.PI, 0.6 * Math.PI, false);
      ctx.arc(x + 1.6, y - 25, 3.2, 0.6 * Math.PI, -0.6 * Math.PI, true);
      ctx.closePath();
      ctx.fill();
    } else if (isDefense) {
      // Miniature Hammer Relief
      ctx.fillStyle = isUnlocked ? '#fbbf24' : '#94a3b8';
      ctx.fillRect(x - 4, y - 27, 8, 3);
      ctx.fillRect(x - 1, y - 24, 2, 4);
    }

    // Coin sockets on pedestal body (2 rows of 4)
    const startCx = x - 18;
    for (let i = 0; i < maxCoins; i++) {
      const cx = startCx + (i % 4) * 11 + 2;
      const cy = y - 18 + Math.floor(i / 4) * 9;

      // Dark carved socket hole
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();

      if (i < coins || isUnlocked) {
        // Gleaming gold coin
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx - 0.7, cy - 0.7, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Subtle socket rim
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // 2. Monument Body (Stele + Sculpted Figures)
    ctx.translate(x, y - 34);

    // Divine Levitation Float when unlocked
    let floatY = 0;
    if (isUnlocked) {
      floatY = Math.sin(this.animTimer * 2.5) * 4;
      ctx.translate(0, floatY);

      // Celestial Aura Radial Glow
      const auraGrad = ctx.createRadialGradient(0, -42, 4, 0, -42, 48);
      auraGrad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
      auraGrad.addColorStop(0.6, 'rgba(251, 191, 36, 0.15)');
      auraGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, -42, 48, 0, Math.PI * 2);
      ctx.fill();

      // Floating blessing dust motes
      for (let m = 0; m < 3; m++) {
        const mx = Math.sin(this.animTimer * 2 + m * 2.1) * 26;
        const my = -30 - ((this.animTimer * 20 + m * 18) % 45);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(mx, my, 2, 2);
      }
    }

    // Architectural Monument Backing Stele (Arched Stele)
    // Ensures the statue stands out clearly and boldly against any terrain or sky!
    ctx.fillStyle = isUnlocked ? '#334155' : '#1e293b';
    ctx.beginPath();
    ctx.moveTo(-24, 0);
    ctx.lineTo(-24, -58);
    ctx.bezierCurveTo(-24, -78, 24, -78, 24, -58);
    ctx.lineTo(24, 0);
    ctx.closePath();
    ctx.fill();

    // Ornate Stele Inscribed Inner Frame
    ctx.strokeStyle = isUnlocked ? '#fbbf24' : '#475569';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-21, 0);
    ctx.lineTo(-21, -56);
    ctx.bezierCurveTo(-21, -74, 21, -74, 21, -56);
    ctx.lineTo(21, 0);
    ctx.stroke();

    // Classical Marble Colors
    const stoneBase = isUnlocked ? '#f8fafc' : '#cbd5e1';
    const stoneShadow = isUnlocked ? '#94a3b8' : '#64748b';
    const stoneDark = isUnlocked ? '#475569' : '#334155';
    const stoneHighlight = isUnlocked ? '#ffffff' : '#f1f5f9';
    const goldTrim = isUnlocked ? '#fbbf24' : '#e2e8f0';

    if (isDamage) {
      // =========================================================================
      // 1. ŞÜHEDA SANCAĞI YADİGARI - ATATÜRK'ÜN ŞAHA KALKMIŞ AT ÜZERİNDE KILIÇLI HEYKELİ
      // =========================================================================
      // Background Red Ottoman & Turkish Crescent Flag (Şüheda Sancağı)
      ctx.fillStyle = isUnlocked ? '#dc2626' : '#991b1b';
      ctx.beginPath();
      ctx.moveTo(-18, -78);
      ctx.lineTo(8, -70);
      ctx.lineTo(-18, -62);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(-10, -70, 2.8, 0, Math.PI * 2);
      ctx.fill();

      // --- REARING BRONZE WAR HORSE (Şaha Kalkmış Süvari Atı) ---
      // Rear legs planted firmly on pedestal base
      ctx.fillStyle = stoneDark;
      ctx.fillRect(-12, -12, 6, 12);
      ctx.fillRect(-4, -10, 6, 10);

      // Angled Rearing Body of Horse
      ctx.save();
      ctx.rotate(-0.35); // 20-degree upward rearing angle

      // Muscle Barrel & Chest
      ctx.fillStyle = stoneShadow;
      ctx.beginPath();
      ctx.ellipse(-4, -22, 12, 18, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Powerful Arched Neck & Head
      ctx.beginPath();
      ctx.moveTo(-8, -32);
      ctx.lineTo(-4, -48);
      ctx.lineTo(4, -46);
      ctx.lineTo(2, -28);
      ctx.closePath();
      ctx.fill();

      // Horse Head & Muzzle
      ctx.beginPath();
      ctx.ellipse(-2, -50, 5, 8, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Rearing Front Legs raised in mid-air!
      ctx.strokeStyle = stoneShadow;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(2, -34);
      ctx.lineTo(14, -44);
      ctx.lineTo(12, -54); // Hoof raised
      ctx.moveTo(-2, -32);
      ctx.lineTo(8, -40);
      ctx.lineTo(6, -50);
      ctx.stroke();

      ctx.restore();

      // --- MAREŞAL GAZI MUSTAFA KEMAL ATATÜRK (Süvari Üniforması & Pelerin) ---
      // Saddle & Cloak
      ctx.fillStyle = isUnlocked ? '#1e293b' : stoneDark;
      ctx.fillRect(-8, -26, 14, 10);

      // Atatürk's Torso & Tunic
      ctx.fillStyle = stoneBase;
      ctx.fillRect(-6, -42, 12, 16);

      // Flowing Officer's Cloak / Pelerin
      ctx.fillStyle = isUnlocked ? '#334155' : stoneShadow;
      ctx.beginPath();
      ctx.moveTo(-8, -42);
      ctx.lineTo(-20, -32);
      ctx.lineTo(-18, -20);
      ctx.lineTo(-6, -28);
      ctx.closePath();
      ctx.fill();

      // Atatürk Head & Kalpak (Kuvayımilliye Kalpağı)
      ctx.fillStyle = stoneBase;
      ctx.fillRect(-4, -50, 8, 8); // Face
      ctx.fillStyle = stoneDark;
      ctx.fillRect(-5, -58, 10, 8); // Ottoman Kalpak
      ctx.fillRect(-6, -52, 12, 2.5); // Rim

      // Raised Arm holding the Ottoman Curved Officer Sword (Gök Yönlü Kavisli Subay Şemşiri)
      ctx.strokeStyle = stoneBase;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(3, -40);
      ctx.lineTo(12, -52);
      ctx.stroke();

      // Curved Sword Blade pointing skywards
      const bladeColor = isUnlocked ? '#fef08a' : stoneHighlight;
      ctx.fillStyle = bladeColor;
      ctx.beginPath();
      ctx.moveTo(11, -53);
      ctx.bezierCurveTo(14, -65, 18, -78, 24, -86); // Sweeping curve up
      ctx.lineTo(21, -85);
      ctx.bezierCurveTo(16, -75, 12, -63, 10, -53);
      ctx.closePath();
      ctx.fill();

      // Gold Crossguard
      ctx.fillStyle = goldTrim;
      ctx.fillRect(8, -54, 8, 3);

    } else if (isHealth) {
      // ====================================================
      // 2. HİLAL HEYKELİ (Elinde Hilal Tutan Asker Hemşiresi)
      // ====================================================
      // Flowing Classical Nurse Gown / Robe
      ctx.fillStyle = stoneShadow;
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(-9, -24);
      ctx.lineTo(9, -24);
      ctx.lineTo(13, 0);
      ctx.closePath();
      ctx.fill();

      // Pure White Marble Apron & Drapery Pleats
      ctx.fillStyle = stoneBase;
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.lineTo(-7, -24);
      ctx.lineTo(7, -24);
      ctx.lineTo(9, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = stoneHighlight;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.lineTo(-3, -22);
      ctx.moveTo(4, 0);
      ctx.lineTo(3, -22);
      ctx.stroke();

      // Torso & Bold Red Crescent (Hilal-i Ahmer) Emblem
      ctx.fillStyle = stoneBase;
      ctx.fillRect(-8, -36, 16, 13);
      // Vivid Red Crescent on chest
      ctx.fillStyle = isUnlocked ? '#ef4444' : '#dc2626';
      ctx.beginPath();
      ctx.arc(0, -30, 4.2, -0.65 * Math.PI, 0.65 * Math.PI, false);
      ctx.arc(1.5, -30, 3.2, 0.65 * Math.PI, -0.65 * Math.PI, true);
      ctx.closePath();
      ctx.fill();

      // Head & Flowing Nurse Headscarf (Hemşire Başörtüsü)
      ctx.fillStyle = stoneShadow;
      ctx.fillRect(-3, -39, 6, 4); // Neck
      ctx.fillStyle = stoneBase;
      ctx.fillRect(-6, -48, 12, 10); // Serene face
      ctx.fillStyle = isUnlocked ? '#fbbf24' : stoneDark;
      ctx.fillRect(-3.5, -45, 2, 2); // Eyes
      ctx.fillRect(1.5, -45, 2, 2);

      // Flowing Veil draped gracefully over head and shoulders
      ctx.fillStyle = stoneHighlight;
      ctx.beginPath();
      ctx.moveTo(-8, -26);
      ctx.lineTo(-8, -52);
      ctx.bezierCurveTo(-8, -56, 8, -56, 8, -52);
      ctx.lineTo(8, -26);
      ctx.lineTo(5, -26);
      ctx.lineTo(4, -40);
      ctx.lineTo(-4, -40);
      ctx.lineTo(-5, -26);
      ctx.closePath();
      ctx.fill();

      // Outstretched Arms raised high holding the sacred Hilal aloft
      ctx.strokeStyle = stoneBase;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-8, -34);
      ctx.lineTo(-4, -48);
      ctx.moveTo(8, -34);
      ctx.lineTo(4, -48);
      ctx.stroke();

      // Hands grasping the crescent base
      ctx.fillStyle = stoneHighlight;
      ctx.fillRect(-5.5, -49, 3.5, 3.5);
      ctx.fillRect(2, -49, 3.5, 3.5);

      // THE SACRED HILAL (Göğe Kaldırılan Büyük Kutsal Hilal & Yıldız)
      const moonX = 0;
      const moonY = -56;
      const moonRadius = 14;

      // Radiant Crescent Moon
      ctx.fillStyle = isUnlocked ? '#fef08a' : goldTrim;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, -0.72 * Math.PI, 0.72 * Math.PI, false);
      ctx.arc(moonX + 4.5, moonY, moonRadius * 0.78, 0.72 * Math.PI, -0.72 * Math.PI, true);
      ctx.closePath();
      ctx.fill();

      // Shining Five-Pointed Star inside the crescent
      ctx.fillStyle = isUnlocked ? '#ffffff' : stoneHighlight;
      ctx.beginPath();
      ctx.arc(moonX + 4.5, moonY, 3, 0, Math.PI * 2);
      ctx.fill();

      if (isUnlocked) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

    } else if (isDefense) {
      // ==========================================================
      // 3. ÇEKİÇ HEYKELİ (Elinde Balyoz Tutan İstihkam Mehmetçiği)
      // ==========================================================
      // Heavy Combat Sapper Boots & Sturdy Legs
      ctx.fillStyle = stoneDark;
      ctx.fillRect(-10, -10, 8, 10);
      ctx.fillRect(3, -10, 8, 10);
      ctx.fillStyle = stoneShadow;
      ctx.fillRect(-9, -20, 6, 11);
      ctx.fillRect(4, -20, 6, 11);

      // Muscular Sapper Torso, Tough Apron & Heavy Tool Belt
      ctx.fillStyle = stoneBase;
      ctx.fillRect(-12, -39, 24, 20);
      // Leather sapper breastplate apron
      ctx.fillStyle = stoneDark;
      ctx.fillRect(-7, -35, 14, 15);
      // Heavy engineer belt with golden brass buckle
      ctx.fillRect(-12, -24, 24, 4.5);
      ctx.fillStyle = goldTrim;
      ctx.fillRect(-2, -24, 4, 4.5);
      // Sapper spikes & pouches
      ctx.fillStyle = stoneShadow;
      ctx.fillRect(-11, -27, 4, 6);
      ctx.fillRect(7, -27, 4, 6);

      // Mehmetçik Head & Proud Moustache
      ctx.fillStyle = stoneShadow;
      ctx.fillRect(-3, -42, 6, 4); // Neck
      ctx.fillStyle = stoneBase;
      ctx.fillRect(-7, -54, 14, 12); // Face
      ctx.fillStyle = isUnlocked ? '#fbbf24' : stoneDark;
      ctx.fillRect(-4.5, -50, 2.5, 2.5); // Eyes
      ctx.fillRect(2, -50, 2.5, 2.5);
      // Bold Ottoman Moustache
      ctx.fillStyle = stoneDark;
      ctx.fillRect(-6, -46, 12, 3.5);

      // Ottoman Kabalak Helmet
      ctx.fillStyle = stoneShadow;
      ctx.beginPath();
      ctx.moveTo(-10, -54);
      ctx.lineTo(0, -66);
      ctx.lineTo(10, -54);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = stoneHighlight;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-9, -56);
      ctx.lineTo(9, -56);
      ctx.stroke();
      ctx.fillStyle = isUnlocked ? '#ef4444' : stoneDark;
      ctx.beginPath();
      ctx.arc(0, -59, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // --- THE GIANT SLEDGEHAMMER (Büyük Ağır İstihkam Balyozu / Çekiç) ---
      // Heavy square hammerhead perched high on ashwood shaft
      const hX = 10;
      const hTopY = -66;

      // Long Ashwood Reinforced Handle
      ctx.fillStyle = stoneDark;
      ctx.fillRect(hX - 2, hTopY + 8, 4, 58);
      // Iron reinforcement bands
      ctx.fillStyle = isUnlocked ? '#fbbf24' : stoneShadow;
      ctx.fillRect(hX - 2.5, hTopY + 16, 5, 2);
      ctx.fillRect(hX - 2.5, hTopY + 32, 5, 2);

      // GIANT SQUARE FORGED IRON SLEDGEHAMMER HEAD
      ctx.fillStyle = isUnlocked ? '#fbbf24' : stoneBase;
      ctx.fillRect(hX - 12, hTopY, 24, 15);
      // Twin hardened silver strike faces
      ctx.fillStyle = isUnlocked ? '#fef08a' : stoneHighlight;
      ctx.fillRect(hX - 12, hTopY, 4, 15);
      ctx.fillRect(hX + 8, hTopY, 4, 15);
      // Center forged iron collar & wedges
      ctx.fillStyle = stoneDark;
      ctx.fillRect(hX - 4, hTopY - 2, 8, 19);
      // Golden bolt heads
      ctx.fillStyle = goldTrim;
      ctx.fillRect(hX - 8, hTopY + 3, 2.5, 2.5);
      ctx.fillRect(hX + 5.5, hTopY + 3, 2.5, 2.5);

      // Strong Sapper Arms & Hands gripping the hammer handle with two hands
      ctx.strokeStyle = stoneShadow;
      ctx.lineWidth = 3.8;
      ctx.beginPath();
      ctx.moveTo(-10, -36);
      ctx.lineTo(hX - 2, -26);
      ctx.moveTo(10, -36);
      ctx.lineTo(hX - 1, -44);
      ctx.stroke();

      // Hands with rolled-up sleeves
      ctx.fillStyle = stoneBase;
      ctx.fillRect(hX - 5, -46, 8, 5);
      ctx.fillRect(hX - 5, -28, 8, 5);
    }

    ctx.restore();
  }

  private drawTreasureChest(x: number, y: number, slot: BuildSlot) {
    const ctx = this.ctx;
    ctx.save();

    if (slot.isScavenged) {
      // Opened, looted wooden chest
      ctx.fillStyle = '#572c0c';
      ctx.fillRect(x - 14, y - 10, 28, 10);
      // Open lid tilted back
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 10);
      ctx.lineTo(x - 12, y - 22);
      ctx.lineTo(x + 14, y - 22);
      ctx.lineTo(x + 14, y - 10);
      ctx.closePath();
      ctx.fill();
      // Empty interior shadow
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(x - 11, y - 9, 22, 5);
    } else {
      // Golden shimmering mystery treasure chest in wilderness
      const float = Math.sin(this.animTimer * 4) * 2;

      // Golden aura
      const aura = ctx.createRadialGradient(x, y - 12 + float, 2, x, y - 12 + float, 22);
      aura.addColorStop(0, 'rgba(251, 191, 36, 0.6)');
      aura.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(x, y - 12 + float, 22, 0, Math.PI * 2);
      ctx.fill();

      // Chest Body (Rich mahogany wood)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x - 14, y - 14 + float, 28, 14);

      // Rounded domed lid
      ctx.fillStyle = '#92400e';
      ctx.beginPath();
      ctx.arc(x, y - 14 + float, 14, Math.PI, 0);
      ctx.fill();

      // Golden metal bands & reinforced corners
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x - 14, y - 14 + float, 4, 14);
      ctx.fillRect(x + 10, y - 14 + float, 4, 14);
      ctx.fillRect(x - 14, y - 3 + float, 28, 3);

      // Golden Lock / Keyhole
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(x, y - 8 + float, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.fillRect(x - 1, y - 8 + float, 2, 3);

      // Sparkle particles
      if (Math.sin(this.animTimer * 6) > 0.5) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - 8, y - 24 + float, 2, 2);
        ctx.fillRect(x + 9, y - 18 + float, 2, 2);
      }
    }

    ctx.restore();
  }

  private drawCoinSocketsOverhead(x: number, y: number, totalNeeded: number, deposited: number) {
    const ctx = this.ctx;
    ctx.save();
    const radius = 6;
    const gap = 16;
    const startX = x - ((totalNeeded - 1) * gap) / 2;

    for (let i = 0; i < totalNeeded; i++) {
      const cx = startX + i * gap;
      const isFilled = i < deposited;

      // Background socket ring
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.arc(cx, y, radius + 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isFilled ? '#fbbf24' : '#64748b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (isFilled) {
        // Shimmering Golden Coin
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(cx - 1.5, y - 1.5, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Empty dark socket
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx, y, radius - 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawWildHorseSlot(x: number, y: number, slot: BuildSlot, isFocused = false) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Weathered 1915 Period Wooden Fence Enclosure (Döneme Uygun Ahşap Çit Çevresi)
    ctx.strokeStyle = '#542605';
    ctx.lineWidth = 2.8;
    // Cross rails with slight slant / weathered sag
    ctx.beginPath();
    ctx.moveTo(x - 42, y - 18);
    ctx.lineTo(x + 42, y - 16);
    ctx.moveTo(x - 42, y - 8);
    ctx.lineTo(x + 42, y - 7);
    ctx.stroke();

    // Weathered Rope bindings on fence
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.2;
    for (let px = x - 36; px <= x + 36; px += 24) {
      ctx.beginPath();
      ctx.moveTo(px - 3, y - 19);
      ctx.lineTo(px + 3, y - 15);
      ctx.moveTo(px - 3, y - 15);
      ctx.lineTo(px + 3, y - 19);
      ctx.stroke();
    }

    // Vertical wooden fence posts
    ctx.fillStyle = '#3e1a06';
    for (let px = x - 36; px <= x + 36; px += 24) {
      ctx.fillRect(px - 2.5, y - 24, 5, 24);
      // Pointed jagged post top
      ctx.beginPath();
      ctx.moveTo(px - 2.5, y - 24);
      ctx.lineTo(px, y - 28);
      ctx.lineTo(px + 2.5, y - 24);
      ctx.fill();
    }

    // Grass & Straw tufts inside enclosure
    ctx.fillStyle = '#15803d';
    ctx.fillRect(x - 22, y - 4, 8, 3);
    ctx.fillRect(x + 12, y - 3, 10, 3);

    // 2. Wild Horse Grazing Inside Enclosure
    if (!slot.isHorseTamed) {
      const horseType = slot.horseType || 'white';
      this.drawRealisticHorse(x, y, 1, horseType, false, false, false, slot.x || x);

      // Coin sockets overhead: ONLY visible when commander is near (isFocused) or coins are deposited!
      const deposited = slot.coinsDeposited || 0;
      if (isFocused || deposited > 0) {
        this.drawCoinSocketsOverhead(x, y - 54, 7, deposited);
      }
    }

    ctx.restore();
  }

  private drawTetheredHorseSlot(x: number, y: number, slot: BuildSlot, isFocused = false) {
    const ctx = this.ctx;
    ctx.save();

    // 1. Weathered Hitching Post with Brass Ring
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 22, y - 26, 5, 26);
    // Post cap
    ctx.beginPath();
    ctx.moveTo(x - 22, y - 26);
    ctx.lineTo(x - 19.5, y - 29);
    ctx.lineTo(x - 17, y - 26);
    ctx.fill();

    // Brass Tether Ring
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x - 19.5, y - 21, 3.5, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Anatomical Realistic Tethered Mount with Crimson Saddle
    const horseType = slot.horseType || 'white';
    this.drawRealisticHorse(x + 14, y, 1, horseType, false, false, true, slot.x || x);

    // 3. Tether Rope from hitching post to bridle bit
    const bitX = x + 40;
    const bitY = y - 24;
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x - 19.5, y - 21);
    ctx.quadraticCurveTo((x - 19.5 + bitX) / 2, Math.max(y - 14, (y - 21 + bitY) / 2 + 6), bitX, bitY);
    ctx.stroke();

    // 4. Coin Sockets Overhead: ONLY visible when commander is near (isFocused) or coins deposited
    const deposited = slot.coinsDeposited || 0;
    if (isFocused || deposited > 0) {
      this.drawCoinSocketsOverhead(x + 14, y - 56, 4, deposited);
    }

    ctx.restore();
  }

  // --- Wild Animals Rendering (Gelibolu Wildlife) ---

  private drawAnimals(animals: WildAnimal[], camX: number) {
    const ctx = this.ctx;
    const gY = this.groundY;

    for (const animal of animals) {
      if (animal.health <= 0) continue;
      const sx = animal.x - camX;
      if (sx < -60 || sx > this.width + 60) continue;

      ctx.save();
      ctx.translate(sx, gY);
      ctx.scale(animal.facing, 1);

      if (animal.type === 'deer') {
        // --- Gelibolu Karacası (Wild Deer) ---
        const hopY = animal.state === 'fleeing' ? Math.sin(animal.hopTimer) * 8 : 0;
        
        // Realistic 6.8s Grazing vs Alert cycle (Kafanın periyodik olarak yere eğiş & otlanma, sonra etrafı kolaçan ediş)
        const { grazeBlend, chewOffset } = this.getRealisticGrazingCycle(animal.x || 0, false);
        const deerGrazeBlend = animal.state === 'grazing' ? grazeBlend : 0;
        const neckAngle = -0.05 + deerGrazeBlend * 0.95;

        // Legs
        ctx.fillStyle = '#78350f';
        const legSwing = animal.state === 'fleeing' ? Math.sin(animal.hopTimer) * 6 : 0;
        ctx.fillRect(-12 + legSwing, -16 + hopY, 3, 16);
        ctx.fillRect(-6 - legSwing, -16 + hopY, 3, 16);
        ctx.fillRect(8 - legSwing, -16 + hopY, 3, 16);
        ctx.fillRect(14 + legSwing, -16 + hopY, 3, 16);

        // Body
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.ellipse(0, -20 + hopY, 18, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // White rump / tail
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(-16, -22 + hopY, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Neck & Head (Periodically lowers all the way down to ground grass)
        ctx.save();
        ctx.translate(12, -18 + hopY);
        ctx.rotate(neckAngle);
        
        // Neck
        ctx.fillStyle = '#92400e';
        ctx.fillRect(0, -4, 15, 7);

        // Head
        ctx.beginPath();
        ctx.ellipse(14, -1, 6.5, 4, 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Antlers (Boynuzlar)
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(11, -3);
        ctx.lineTo(11, -12);
        ctx.lineTo(6, -15);
        ctx.moveTo(11, -8);
        ctx.lineTo(15, -14);
        ctx.stroke();

        // Eye & Snout
        ctx.fillStyle = '#000000';
        ctx.fillRect(18 + chewOffset * 0.3, -2, 2, 2); // Snout
        ctx.fillRect(14, -3, 1.5, 1.5); // Eye

        // Grass bits at mouth when head is down grazing
        if (deerGrazeBlend > 0.65 && Math.sin(this.animTimer * 6 + (animal.x || 0)) > 0.1) {
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(19 + chewOffset, 1, 2, 4);
          ctx.fillRect(17 - chewOffset, 2, 2, 3);
        }
        ctx.restore();
      } else if (animal.type === 'rabbit') {
        // --- Gelibolu Tavşanı (Wild Hare) ---
        const hopY = animal.state === 'fleeing' ? Math.abs(Math.sin(animal.hopTimer)) * -8 : 0;

        // Fluffy Body
        ctx.fillStyle = '#a8a29e';
        ctx.beginPath();
        ctx.ellipse(0, -6 + hopY, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // White cotton tail
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-7, -6 + hopY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#d6d3d1';
        ctx.beginPath();
        ctx.arc(6, -8 + hopY, 4, 0, Math.PI * 2);
        ctx.fill();

        // Long Ears (Twitching)
        ctx.fillStyle = '#e7e5e4';
        const earWiggle = Math.sin(this.animTimer * 10) * 0.15;
        ctx.save();
        ctx.translate(5, -11 + hopY);
        ctx.rotate(-0.2 + earWiggle);
        ctx.fillRect(0, -7, 2, 7);
        ctx.fillRect(-2, -6, 2, 6);
        ctx.restore();

        // Eye
        ctx.fillStyle = '#000000';
        ctx.fillRect(7, -9 + hopY, 1.5, 1.5);
      } else {
        // --- Keklik / Kuş (Wild Partridge) ---
        const hopY = Math.abs(Math.sin(animal.hopTimer)) * -4;

        // Speckled Body
        ctx.fillStyle = '#78716c';
        ctx.beginPath();
        ctx.ellipse(0, -6 + hopY, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Red beak & eye
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(5, -7 + hopY, 3, 2); // beak
        ctx.fillStyle = '#000000';
        ctx.fillRect(3, -8 + hopY, 1.5, 1.5);

        // Legs
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-2, -2, 1.5, 3);
        ctx.fillRect(2, -2, 1.5, 3);
      }

      ctx.restore();
    }
  }

  private drawCampfire(x: number, y: number) {
    const ctx = this.ctx;
    // Logs
    ctx.fillStyle = '#451a03';
    ctx.fillRect(x - 8, y - 4, 16, 4);
    // Fire flames (Animated - steady natural burn frequency)
    const f1 = Math.sin(this.animTimer * 8) * 3;
    const f2 = Math.cos(this.animTimer * 10) * 3;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 3);
    ctx.lineTo(x + f1, y - 18 + f2);
    ctx.lineTo(x + 6, y - 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 3);
    ctx.lineTo(x + f2 * 0.5, y - 12 + f1 * 0.5);
    ctx.lineTo(x + 3, y - 3);
    ctx.closePath();
    ctx.fill();
  }

  // --- Ground Coins Rendering (Kingdom Style) ---

  private drawGroundCoins(coins: GroundCoin[], camX: number) {
    const ctx = this.ctx;
    const gY = this.groundY;

    for (const coin of coins) {
      if (coin.life <= 0) continue;
      const sx = coin.x - camX;
      if (sx < -40 || sx > this.width + 40) continue;

      const sy = coin.y || gY - 4;
      const spin = Math.abs(Math.cos(this.animTimer * 8 + coin.x * 0.1));
      const coinWidth = Math.max(2, 6 * spin);

      ctx.save();
      ctx.translate(sx, sy);

      // Subtle shadow beneath coin
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 5, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden halo aura
      const aura = ctx.createRadialGradient(0, 0, 1, 0, 0, 9);
      aura.addColorStop(0, 'rgba(250, 204, 21, 0.45)');
      aura.addColorStop(1, 'rgba(250, 204, 21, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();

      // Golden coin disc (spinning)
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(0, 0, coinWidth, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shining rim
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Inner embossed detail
      if (spin > 0.5) {
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.ellipse(0, 0, coinWidth * 0.55, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Specular sparkle
      if (Math.sin(this.animTimer * 12 + coin.x * 0.2) > 0.7) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -4, 2, 2);
      }

      ctx.restore();
    }
  }

  // --- Field Artillery Rendering (75mm Krupp Sahra Topu) ---

  private drawFieldArtilleries(artilleries: FieldArtillery[], camX: number) {
    const ctx = this.ctx;
    const gY = this.groundY;

    for (const art of artilleries) {
      if (art.health <= 0) continue;
      const sx = art.x - camX;
      if (sx < -80 || sx > this.width + 80) continue;

      ctx.save();
      ctx.translate(sx, gY);
      ctx.scale(art.facing, 1);

      // 1. Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(0, -2, 28, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Carriage Trail (Trail beams extending backwards to ground)
      ctx.fillStyle = '#292524'; // Dark steel / seasoned wood trail
      ctx.beginPath();
      ctx.moveTo(-4, -18);
      ctx.lineTo(-34, -2);
      ctx.lineTo(-31, 0);
      ctx.lineTo(0, -14);
      ctx.closePath();
      ctx.fill();

      // Spade at end of trail anchored into dirt
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(-35, -4, 5, 6);

      // 3. Gun Barrel (Historical Krupp 7.5 cm Feldkanone)
      // Barrel elevation angle: higher when firing at ship
      const barrelElevation = art.state === 'firing' ? -0.42 : -0.32;
      ctx.save();
      ctx.translate(2, -22);
      ctx.rotate(barrelElevation);

      // Recoil mechanism cradle beneath barrel
      ctx.fillStyle = '#334155';
      ctx.fillRect(-6, 2, 22, 5);

      // Steel gun barrel
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-8, -3, 36, 6);

      // Muzzle ring / muzzle brake
      ctx.fillStyle = '#475569';
      ctx.fillRect(26, -4, 4, 8);

      // Breech block
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-12, -4, 6, 8);

      // Muzzle Flash Blast when firing!
      if (art.muzzleFlashTimer && art.muzzleFlashTimer > 0) {
        ctx.save();
        ctx.translate(32, 0);
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(26, 0);
        ctx.lineTo(0, 7);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(14, 0);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      // 4. Curved Gun Shield (Protects crew from enemy rifle fire)
      ctx.fillStyle = '#334155'; // Dark olive / field gray armor plate
      ctx.beginPath();
      ctx.moveTo(-3, -34);
      ctx.lineTo(8, -32);
      ctx.lineTo(4, -8);
      ctx.lineTo(-6, -10);
      ctx.closePath();
      ctx.fill();

      // Armor plate viewport slit
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, -26, 4, 2);

      // 5. Large Spoked Wheels (14-Spoke heavy artillery wheels with iron rim)
      const wheelR = 17;
      ctx.save();
      ctx.translate(0, -wheelR);
      ctx.rotate(art.wheelRotation || 0);

      // Iron tire rim
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, wheelR - 1, 0, Math.PI * 2);
      ctx.stroke();

      // Wooden felloe ring
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, wheelR - 3.5, 0, Math.PI * 2);
      ctx.stroke();

      // Spokes (8 distinct spokes)
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.6;
      for (let s = 0; s < 8; s++) {
        const ang = (s * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * (wheelR - 4), Math.sin(ang) * (wheelR - 4));
        ctx.stroke();
      }

      // Bronze axle hub cap
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 6. Overhead Health Bar if damaged
      if (art.health < art.maxHealth) {
        const barW = 36;
        const barH = 4;
        const hpRatio = Math.max(0, art.health / art.maxHealth);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-barW / 2, -44, barW, barH);
        ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : (hpRatio > 0.25 ? '#eab308' : '#ef4444');
        ctx.fillRect(-barW / 2, -44, barW * hpRatio, barH);
      }

      ctx.restore();
    }
  }

  // --- Soldiers Rendering (Mehmetçik) ---

  private drawSoldiers(soldiers: Soldier[], camX: number, slots: BuildSlot[] = []) {
    const ctx = this.ctx;
    const gY = this.groundY;

    for (const soldier of soldiers) {
      const sx = soldier.x - camX;
      if (sx < -60 || sx > this.width + 60) continue;

      const assignedSlot = soldier.assignedSlotId ? slots.find((s) => s.id === soldier.assignedSlotId) : null;
      const isNearStation = assignedSlot ? Math.abs(soldier.x - assignedSlot.x) < 45 : false;
      const isTrench = assignedSlot?.type === 'trench' && isNearStation;
      const nearbyTrench = !assignedSlot ? slots.find((s) => s.type === 'trench' && s.level > 0 && Math.abs(soldier.x - s.x) < 55) : null;
      const isBehindTrench = !isTrench && !!nearbyTrench && !soldier.isAssaultSquad;
      const isMG = (soldier.role === 'machinegunner' || assignedSlot?.type === 'machine_gun') && isNearStation;
      const isArtillery = (soldier.role === 'artilleryman' || assignedSlot?.type === 'artillery') && isNearStation;
      const isSniper = soldier.role === 'sniper' || (assignedSlot?.type === 'watchtower' && isNearStation);
      const isStaticPost = soldier.state === 'garrisoned' || soldier.state === 'idle' || soldier.state === 'aiming' || soldier.state === 'shooting' || soldier.state === 'bayonet' || soldier.state === 'healing' || soldier.state === 'digging';
      const isMoving = !isStaticPost && (soldier.state === 'walking' || soldier.state === 'running' || !!soldier.isWalking);

      let sy = soldier.y || gY;
      if (isTrench && !isMoving) {
        // Tucked into trench depth
        sy = gY + 3;
      }

      const isElevated = sy < gY - 10;
      const isClimbing = isElevated && assignedSlot && Math.abs(soldier.x - assignedSlot.x) <= 16 && isMoving;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(soldier.facing, 1);

      if (soldier.state === 'dying') {
        const deathProgress = 1 - Math.max(0, (soldier.deathTimer || 0) / (soldier.maxDeathTimer || 2.4));
        this.drawSoldierRagdollDeath(ctx, soldier, deathProgress, isTrench);
        ctx.restore();
        continue;
      }

      // If idle/reserve soldier is stationed behind a trench, render with soft depth-layering silhouette so trench remains pristine
      if (isBehindTrench && !isMoving) {
        ctx.globalAlpha = 0.88;
      }

      // Walk / Climbing cycle bounce
      const bounce = isMoving ? Math.abs(Math.sin(this.animTimer * 8)) * 3 : 0;
      const legAngle = isClimbing ? Math.sin(this.animTimer * 10) * 0.35 : (isMoving ? Math.sin(this.animTimer * 8) * 0.45 : 0);

      // Morale Buff Glow (when Commander whistles)
      if (soldier.moraleBuffTimer > 0) {
        ctx.fillStyle = 'rgba(234, 179, 8, 0.35)';
        ctx.beginPath();
        ctx.arc(0, -18, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Ground Shadow (omitted if elevated on watchtower or high ladder)
      if (!isElevated) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, -1, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Legs
      if (!isTrench || isMoving) {
        // Left leg
        ctx.save();
        ctx.translate(-3, -10);
        ctx.rotate(legAngle);
        ctx.fillStyle = '#78716c'; // Ottoman Puttees / Dolak
        ctx.fillRect(-2, 0, 4, 10);
        ctx.fillStyle = '#292524'; // Leather Boots
        ctx.fillRect(-2, 8, 5, 3);
        ctx.restore();

        // Right leg
        ctx.save();
        ctx.translate(3, -10);
        ctx.rotate(-legAngle);
        ctx.fillStyle = '#78716c';
        ctx.fillRect(-2, 0, 4, 10);
        ctx.fillStyle = '#292524';
        ctx.fillRect(-2, 8, 5, 3);
        ctx.restore();
      } else {
        // Stationed inside trench - knees bent, crouching behind trench wall
        ctx.fillStyle = '#57534e';
        ctx.fillRect(-4, -8, 8, 8);
      }

      // Torso & Armor
      if (soldier.isAssaultSquad) {
        // --- ⚔️ HEAVY SHOCK TROOP / HÜCUM AKINCISI (KINGDOM KNIGHT ARCHETYPE) ---
        // 1. Camouflage Ottoman Uniform (Haki + Zeytin Yeşili & Kestane Benekli Kamuflaj Pelerini)
        ctx.fillStyle = '#556b2f'; // Olive Drab Base
        ctx.fillRect(-6, -25 - bounce, 12, 16);

        // Camouflage spots / stripes
        ctx.fillStyle = '#2e3b12'; // Dark Forest Green
        ctx.fillRect(-5, -23 - bounce, 4, 3);
        ctx.fillRect(1, -17 - bounce, 4, 4);
        ctx.fillStyle = '#4a3525'; // Earth Brown
        ctx.fillRect(0, -21 - bounce, 4, 3);
        ctx.fillRect(-4, -14 - bounce, 3, 3);

        // 2. Heavy Ottoman Steel Cuirass (Enveriye Çelik Hücum Göğüslüğü / Zırh Plakası)
        ctx.fillStyle = '#334155'; // Dark Steel Plate
        ctx.fillRect(-5, -23 - bounce, 10, 11);
        ctx.fillStyle = '#94a3b8'; // Polished Steel Bevel
        ctx.fillRect(-4, -22 - bounce, 8, 2);

        // Steel Rivets
        ctx.fillStyle = '#f59e0b'; // Brass/Steel Rivets
        ctx.fillRect(-4, -20 - bounce, 1.5, 1.5);
        ctx.fillRect(2.5, -20 - bounce, 1.5, 1.5);
        ctx.fillRect(-4, -15 - bounce, 1.5, 1.5);
        ctx.fillRect(2.5, -15 - bounce, 1.5, 1.5);

        // 3. Double Cross Leather Bandoliers & Stick Grenades (El Bombaları)
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, -23 - bounce);
        ctx.lineTo(5, -13 - bounce);
        ctx.moveTo(5, -23 - bounce);
        ctx.lineTo(-5, -13 - bounce);
        ctx.stroke();

        // German/Ottoman Stielhandgranate (Ahşap Saplı Hücum Bombaları)
        ctx.fillStyle = '#78350f'; // Wood stick
        ctx.fillRect(-7, -19 - bounce, 2, 7);
        ctx.fillStyle = '#1e293b'; // Steel head
        ctx.fillRect(-8, -22 - bounce, 4, 3);

        // 4. Red Ottoman Armband with White Crescent (Hücum Taburu Pazubendi)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(4, -23 - bounce, 3, 5);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(5, -22 - bounce, 1.5, 1.5);

        // 5. Head & Heavy Steel Assault Helmet (Çanakkale Hücum Miğferi)
        ctx.fillStyle = '#fed7aa'; // Face skin tone
        ctx.fillRect(-3, -31 - bounce, 6, 7);

        // Mustache & Intense Eyes
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(1, -29 - bounce, 2, 1.5);
        ctx.fillRect(0, -26 - bounce, 3, 1.5);

        // Steel Assault Helmet with Imperial Brass Crescent Badge
        ctx.fillStyle = '#475569'; // Steel Helmet
        ctx.beginPath();
        ctx.ellipse(0, -33 - bounce, 7.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-6, -34 - bounce, 12, 4);

        // Brass Crescent Emblem on Front
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(2, -33 - bounce, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Standard Khaki Ottoman Uniform
        ctx.fillStyle = '#716b4e';
        ctx.fillRect(-5, -24 - bounce, 10, 15);

        // Red collar tabs & Leather Bandolier (Çapraz Kütüklük)
        ctx.fillStyle = '#dc2626'; // Ottoman Red Collar
        ctx.fillRect(-3, -25 - bounce, 6, 2);

        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, -23 - bounce);
        ctx.lineTo(5, -11 - bounce);
        ctx.stroke();

        // Head & Historical Enveriye Kabalak Hat
        ctx.fillStyle = '#fed7aa'; // Face skin tone
        ctx.fillRect(-3, -31 - bounce, 6, 7);

        // Eyes & Mustache
        ctx.fillStyle = '#292524';
        ctx.fillRect(1, -29 - bounce, 2, 2);
        ctx.fillRect(0, -26 - bounce, 3, 1.5); // Mustache

        // Enveriye Kabalak (Historical Ottoman Sun Helmet with cloth folds)
        ctx.fillStyle = '#857e61';
        ctx.fillRect(-6, -36 - bounce, 12, 6);
        ctx.fillStyle = '#6b6545';
        ctx.fillRect(-6, -32 - bounce, 3, 9); // Neck protection flap
        ctx.fillRect(3, -32 - bounce, 3, 9);
      }

      // Role & Defensive Station Specific Animation
      if (isTrench && !isMoving) {
        // --- 1. SOLDIER INSIDE TRENCH (MEVZİYE GİRMİŞ MEHMETÇİK) ---
        const isShooting = soldier.state === 'shooting' || soldier.weaponState === 'firing';
        const isAiming = soldier.state === 'aiming' || soldier.weaponState === 'ready_aim' || soldier.weaponState === 'reloading';

        if (isShooting || isAiming) {
          // Raising Mauser over sandbags and taking disciplined aim at approaching enemy
          const isFiring = isShooting && (soldier.muzzleFlashTimer || 0) > 0;
          const recoilX = isFiring ? -2.0 : 0;

          ctx.fillStyle = '#451a03'; // Wooden Mauser Stock
          ctx.fillRect(-2 + recoilX, -22, 20, 3.5);
          ctx.fillStyle = '#475569';
          ctx.fillRect(18 + recoilX, -22, 9, 2.5); // Steel barrel
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(26 + recoilX, -21, 6, 1.5); // Bayonet

          // Soldier hands bracing rifle
          ctx.fillStyle = '#fed7aa';
          ctx.fillRect(4 + recoilX, -20, 4, 3);
          ctx.fillRect(12 + recoilX, -20, 4, 3);

          // Muzzle flash when firing from trench
          if (isFiring) {
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(32 + recoilX, -21, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(30 + recoilX, -21, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Peaceful / Resting inside trench with rifle held upright at shoulder
          ctx.save();
          ctx.translate(1, -16);
          ctx.rotate(-0.22);
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-2, -14, 3.5, 20); // Wooden stock
          ctx.fillStyle = '#475569';
          ctx.fillRect(-2, -20, 2.5, 6); // Barrel
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(-2, -26, 2, 6); // Bayonet blade
          ctx.fillStyle = '#fed7aa';
          ctx.fillRect(-3, 0, 3.5, 3.5); // Hand
          ctx.restore();
        }

        // Trench sandbag lip in front of soldier
        ctx.fillStyle = '#ca8a04';
        ctx.beginPath();
        ctx.ellipse(4, -8, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#a16207';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (isMG && !isMoving) {
        // --- 2. SOLDIER MANNING MACHINE GUN (TOP/MAXIM BAŞINDAKİ NİŞANCI) ---
        // Crouched gunner posture holding Maxim spade grips
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(3, -21 - bounce, 6, 3); // Hands on grips
        ctx.fillStyle = '#292524';
        ctx.fillRect(8, -22 - bounce, 4, 5); // Spade handle

        // Ammo belt feeding into gun
        ctx.fillStyle = '#eab308';
        for (let b = 0; b < 4; b++) {
          ctx.fillRect(-2 + b * 3, -16 - bounce + b, 2, 3);
        }

        // MG Muzzle flash (realistic bullet-sized flash)
        if (soldier.muzzleFlashTimer && soldier.muzzleFlashTimer > 0) {
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(30, -22 - bounce, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Ejected shell casing
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-2, -14, 2, 1.5);
        }
      } else if (isArtillery && !isMoving) {
        // --- 3. SOLDIER MANNING ARTILLERY BATTERY (TOPÇU ERLERİ) ---
        // Artilleryman standing holding long wooden rammer rod (Harbi)
        ctx.fillStyle = '#78350f'; // Rammer rod
        ctx.fillRect(4, -38, 2.5, 36);
        ctx.fillStyle = '#475569'; // Sponge end
        ctx.fillRect(3, -42, 4.5, 5);

        // Lanyard cord in hand
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(2, -18);
        ctx.quadraticCurveTo(8, -12, 16, -16);
        ctx.stroke();

        // Artillery shell crate at feet
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-14, -8, 10, 8);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-12, -10, 3, 2); // Brass shell tip

        // Firing blast effects (synchronized strictly with fired artillery shell)
        if (soldier.muzzleFlashTimer && soldier.muzzleFlashTimer > 0) {
          ctx.fillStyle = '#ffedd5';
          ctx.beginPath();
          ctx.arc(26, -24, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(20, -24, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (isSniper) {
        // --- 4. WATCHTOWER SNIPER / SCOUT (GÖZETLEME VE KESKİN NİŞANCI) ---
        const isShooting = soldier.state === 'shooting';
        const isAiming = soldier.state === 'aiming';
        
        ctx.fillStyle = '#451a03';
        if (isShooting || isAiming) {
          ctx.fillRect(0, -23 - bounce, 24, 3);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(6, -26 - bounce, 8, 2.5); // Telescopic Scope
          ctx.fillStyle = '#475569';
          ctx.fillRect(23, -23 - bounce, 10, 2);
        } else {
          // Resting sniper rifle
          ctx.fillRect(4, -28 - bounce, 3, 24);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(1, -22 - bounce, 2.5, 8); // Telescopic Scope sideways
          ctx.fillStyle = '#475569';
          ctx.fillRect(4, -36 - bounce, 2, 10);
        }

        if (soldier.muzzleFlashTimer && soldier.muzzleFlashTimer > 0) {
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(36, -22 - bounce, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (soldier.targetTreeId) {
        // --- 4.5 WOODCUTTER MEHMETÇİK (BALTALI İSTİHKAM / ODUNCU ERİ) ---
        const isChopping = soldier.state === 'digging';
        const chopSwing = isChopping ? Math.sin(this.animTimer * 12) * 0.75 : 0;
        ctx.save();
        ctx.translate(2, -18 - bounce);
        ctx.rotate(chopSwing);
        // Axe wooden handle
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-1.5, -16, 3, 24);
        // Heavy iron axe head
        ctx.fillStyle = '#475569';
        ctx.fillRect(1.5, -18, 7, 7);
        // Sharp silver blade edge
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(7.5, -19, 2, 9);
        ctx.restore();
      } else if (soldier.role === 'engineer') {
        // --- 5. COMBAT ENGINEER (İSTİHKAM ERİ) ---
        ctx.fillStyle = '#78350f';
        ctx.fillRect(2, -24 - bounce, 3, 20);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(1, -7 - bounce, 6, 5); // Shovel blade
      } else if (soldier.role === 'medic') {
        // --- 6. RED CRESCENT MEDIC (HİLAL-İ AHMER SIHHİYE) ---
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-6, -21 - bounce, 4, 5);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-5, -20 - bounce, 2, 3);
        // Medic Kit
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(2, -18 - bounce, 6, 6);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(4, -17 - bounce, 2, 4);
        ctx.fillRect(3, -16 - bounce, 4, 2);
      } else if (soldier.role === 'recruit') {
        // --- 6.5 UNARMED RECRUIT / SİLAHSIZ GÖNÜLLÜ KÖYLÜ (Tüfek almak için Cephaneliğe giden Mehmetçik) ---
        // Peasant volunteer with no rifle in hands, arms swinging naturally
        ctx.fillStyle = '#fed7aa'; // Bare skin hands
        const armSwing = isMoving ? Math.sin(this.animTimer * 8) * 0.45 : 0;
        ctx.save();
        ctx.translate(1, -16 - bounce);
        ctx.rotate(armSwing);
        ctx.fillRect(-1.5, 0, 3, 10);
        ctx.restore();
      } else {
        // --- 7. OPEN FIELD INFANTRYMAN (SAHRA PİYADESİ) ---
        ctx.fillStyle = '#451a03';
        const wState = soldier.weaponState || (soldier.state === 'shooting' ? 'firing' : (soldier.state === 'aiming' ? 'ready_aim' : 'shouldered'));
        const isShooting = soldier.state === 'shooting' || wState === 'firing';
        const isAiming = soldier.state === 'aiming' || wState === 'ready_aim' || wState === 'reloading';
        const isBayonet = soldier.state === 'bayonet';

        // When moving/marching to post, rifle is shouldered with rhythmic march swing unless bayonet lunging
        const isAimOrFire = !isMoving && (isShooting || isAiming);

        if (isAimOrFire) {
          // --- Two-handed disciplined firing stance with raised Mauser 1893 rifle at shoulder level ---
          // "düşman menzile girdiğinde ateş animasyonunun silah aşağıdayken değil, tam omuz hizasında (kaldırılmışken) gerçekleşmesini sağla"
          const isFiring = isShooting && (soldier.muzzleFlashTimer || 0) > 0;
          const recoilX = isFiring ? -2.5 : 0;
          const muzzleClimb = isFiring ? -0.8 : 0;
          
          // Bolt cycling animation when reloading during attack cooldown
          const cd = soldier.attackCooldown || 0;
          const isCyclingBolt = wState === 'reloading' || (!isFiring && cd > 0.35 && cd < 0.70);
          const boltPull = isCyclingBolt ? -2.5 : 0;

          // Rifle wooden stock held firmly against soldier's shoulder
          ctx.fillStyle = '#3f1a04';
          ctx.fillRect(-3 + recoilX, -22 - bounce + muzzleClimb, 8, 4.5); // Stock butt firmly in shoulder pocket
          ctx.fillStyle = '#5c2b0c';
          ctx.fillRect(4 + recoilX, -21.5 - bounce + muzzleClimb, 18, 3.5); // Stock walnut forestock
          
          // Steel receiver, chamber & bolt handle
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(3 + recoilX, -22.5 - bounce + muzzleClimb, 5, 2.5);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(5 + recoilX + boltPull, -23.5 - bounce + muzzleClimb, 2.5, 1.5); // Bolt handle knob

          // Long blued steel barrel & front sight
          ctx.fillStyle = '#334155';
          ctx.fillRect(21 + recoilX, -21.5 - bounce + muzzleClimb, 11, 2.2);
          ctx.fillRect(30 + recoilX, -22.5 - bounce + muzzleClimb, 2, 1.2); // Front sight post

          // Fixed Ottoman sword-bayonet (Enveriye Kasatura)
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(28 + recoilX, -20.8 - bounce + muzzleClimb, 11, 1.6); // Bayonet blade
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(36 + recoilX, -20.8 - bounce + muzzleClimb, 3, 1.2); // Razor sharp tip

          // Soldier hands bracing rifle firmly at eye/shoulder level
          ctx.fillStyle = '#fed7aa'; // Skin tone
          ctx.fillRect(3 + recoilX + boltPull, -20.5 - bounce + muzzleClimb, 3.5, 3.2); // Right trigger/bolt hand
          ctx.fillRect(15 + recoilX, -20.5 - bounce + muzzleClimb, 4.5, 3.2); // Left forestock support hand

          if (isFiring) {
            // Bright realistic multi-layered muzzle flash burst
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(38 + recoilX, -20.5 - bounce + muzzleClimb, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(36 + recoilX, -20.5 - bounce + muzzleClimb, 2.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(35 + recoilX, -20.5 - bounce + muzzleClimb, 1.8, 0, Math.PI * 2);
            ctx.fill();

            // Ejected glowing brass cartridge casing
            ctx.fillStyle = '#facc15';
            ctx.fillRect(1 + recoilX, -25 - bounce, 2, 1.2);
          }
        } else if (isBayonet) {
          // Energetic bayonet lunging thrust
          ctx.fillStyle = '#451a03';
          ctx.fillRect(4, -20 - bounce, 26, 3.5);
          ctx.fillStyle = '#475569';
          ctx.fillRect(28, -20 - bounce, 6, 2.5);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(33, -20.5 - bounce, 12, 2.5);
          // Hands thrusting
          ctx.fillStyle = '#fed7aa';
          ctx.fillRect(8, -19 - bounce, 3.5, 3.5);
          ctx.fillRect(20, -19 - bounce, 3.5, 3.5);
        } else {
          // Standing proud / Marching with rifle resting securely on right shoulder
          const walkArmSwing = isMoving ? Math.sin(this.animTimer * 8) * 0.35 : 0;
          const rifleSway = isMoving ? Math.sin(this.animTimer * 8) * 0.08 : Math.sin(this.animTimer * 2.2 + soldier.x * 0.05) * 0.03;

          // Free left arm swinging naturally while marching or resting at side
          ctx.fillStyle = '#716b4e'; // Ottoman Khaki sleeve
          ctx.save();
          ctx.translate(-2, -20 - bounce);
          ctx.rotate(-walkArmSwing);
          ctx.fillRect(-2, 0, 3.5, 8);
          ctx.fillStyle = '#fed7aa'; // Hand
          ctx.fillRect(-2, 8, 3.5, 3);
          ctx.restore();

          // Right arm and Mauser 1893 rifle resting upright on right shoulder
          ctx.save();
          ctx.translate(2, -18 - bounce);
          ctx.rotate(-0.32 + rifleSway);
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-2, -16, 3.5, 24); // Wooden stock
          ctx.fillStyle = '#475569';
          ctx.fillRect(-2, -22, 2.5, 7); // Barrel
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(-2, -28, 2, 7); // Bayonet blade
          ctx.fillStyle = '#fed7aa';
          ctx.fillRect(-3, 0, 3.5, 3.5); // Hand holding sling/stock
          ctx.restore();
        }
      }

      ctx.restore();

      // Health bar if wounded
      if (soldier.health < soldier.maxHealth) {
        this.drawHealthBar(sx, sy - 44, soldier.health, soldier.maxHealth, '#22c55e');
      }

      // Gold Coin Badge if soldier collected coins (Kingdom style)
      if (soldier.coinsHeld && soldier.coinsHeld > 0) {
        const coinBadgeY = soldier.health < soldier.maxHealth ? sy - 56 : sy - 46;
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(sx, coinBadgeY, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${soldier.coinsHeld}`, sx, coinBadgeY + 0.5);
      }
    }
  }

  // --- Enemies Rendering (Anzac / British) ---

  private drawEnemies(enemies: Enemy[], camX: number) {
    const ctx = this.ctx;
    const gY = this.groundY;

    for (const enemy of enemies) {
      const sx = enemy.x - camX;
      if (sx < -60 || sx > this.width + 60) continue;

      const sy = enemy.y || gY;
      const isDying = enemy.state === 'dying';
      const deathProgress = isDying
        ? Math.min(1, Math.max(0, 1 - (enemy.deathTimer || 0) / (enemy.maxDeathTimer || 1.8)))
        : 0;

      // Smooth cubic ease-out curve for natural physical ragdoll kinematics
      const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 2.8);

      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(enemy.facing, 1);

      // Ground Shadow
      if (!isDying) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, -1, 10, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (enemy.type === 'armoured_car') {
        // Boss: British Lanchester Armoured Car
        this.drawArmouredCar(0, 0, enemy, isDying, deathProgress);
      } else if (isDying) {
        // Dedicated Organic Multi-Joint Ragdoll Death Kinematics
        this.drawEnemyRagdollDeath(ctx, enemy, deathProgress);
      } else {
        const isMoving = enemy.state === 'marching' || enemy.state === 'charging';
        const animSpeed = enemy.type === 'highlander' ? 12 : 8;
        const bounce = isMoving ? Math.abs(Math.sin(this.animTimer * animSpeed)) * 3 : 0;
        const legAngle = isMoving ? Math.sin(this.animTimer * animSpeed) * 0.45 : 0;

        // Legs / Trousers / Kilt
        if (enemy.type === 'highlander') {
          // Scottish Tartan Kilt
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(-6, -17 - bounce, 12, 9);
          ctx.fillStyle = '#15803d';
          ctx.fillRect(-6, -14 - bounce, 12, 2);
          ctx.fillRect(-2, -17 - bounce, 2, 9);
        }

        ctx.fillStyle = '#a16207'; // British Khaki
        // Left leg
        ctx.save();
        ctx.translate(-3, -10);
        ctx.rotate(legAngle);
        ctx.fillRect(-2, 0, 4, 10);
        ctx.fillStyle = '#1c1917'; // Boots
        ctx.fillRect(-2, 8, 5, 3);
        ctx.restore();

        // Right leg
        ctx.save();
        ctx.translate(3, -10);
        ctx.rotate(-legAngle);
        ctx.fillRect(-2, 0, 4, 10);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(-2, 8, 5, 3);
        ctx.restore();

        // Torso
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(-5, -24 - bounce, 10, 15);

        // Head & Hat
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(-3, -31 - bounce, 6, 7);

        if (enemy.type === 'stormtrooper') {
          // --- STORMTROOPER (ÇELİK MASKELİ ŞOK TAARRUZ ERİ) ---
          // Heavy steel trench cuirass / Sappenpanzer body armor
          ctx.fillStyle = '#334155';
          ctx.fillRect(-6, -25 - bounce, 12, 16);
          // Steel rivets
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-5, -24 - bounce, 2, 2);
          ctx.fillRect(3, -24 - bounce, 2, 2);
          ctx.fillRect(-5, -14 - bounce, 2, 2);
          ctx.fillRect(3, -14 - bounce, 2, 2);

          // Back-mounted fuel tank / heavy pack
          ctx.fillStyle = '#991b1b';
          ctx.fillRect(-9, -26 - bounce, 5, 14);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-8, -28 - bounce, 3, 3); // Brass valve

          // Gas Mask face & circular filter canister
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-4, -31 - bounce, 8, 8); // Rubber mask
          ctx.fillStyle = '#38bdf8'; // Glass eyepieces
          ctx.fillRect(0, -30 - bounce, 3, 3);
          ctx.fillStyle = '#0f172a'; // Snout filter
          ctx.fillRect(2, -26 - bounce, 4, 4);

          // Heavy armored trench helmet with brow plate
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.ellipse(0, -34 - bounce, 9, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#475569'; // Stirnpanzer brow reinforcement
          ctx.fillRect(1, -36 - bounce, 7, 3);
        } else if (enemy.type === 'scout') {
          // Anzac Slouch Hat (Tüylü Yan Şapka with cocked side)
          ctx.fillStyle = '#713f12';
          ctx.fillRect(-8, -35 - bounce, 16, 4);
          ctx.fillRect(-8, -39 - bounce, 3, 6); // Folded side brim
          ctx.fillStyle = '#f8fafc'; // White/Grey emu feather
          ctx.fillRect(-9, -40 - bounce, 2, 5);
        } else if (enemy.type === 'highlander') {
          // Scottish Balmoral Bonnet
          ctx.fillStyle = '#1e1b4b';
          ctx.fillRect(-6, -35 - bounce, 12, 5);
          ctx.fillStyle = '#dc2626'; // Red toorie pompom
          ctx.fillRect(-1, -38 - bounce, 4, 4);
        } else if (enemy.type === 'officer') {
          // British Officer Peak Cap
          ctx.fillStyle = '#451a03';
          ctx.fillRect(-6, -35 - bounce, 12, 4);
          ctx.fillStyle = '#1e293b'; // Peak
          ctx.fillRect(0, -32 - bounce, 6, 2);
          ctx.fillStyle = '#eab308'; // Gold badge
          ctx.fillRect(-2, -34 - bounce, 3, 2);
        } else {
          // British Brodie Steel Helmet
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.ellipse(0, -34 - bounce, 8, 3.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Weapon
        ctx.fillStyle = '#334155';
        if (enemy.type === 'stormtrooper') {
          // Heavy trench weapon / Flamethrower lance
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, -22 - bounce, 22, 4);
          ctx.fillStyle = '#f97316'; // Pilot flame ignition tip
          ctx.fillRect(22, -21 - bounce, 4, 2);
          if (enemy.state === 'shooting') {
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.arc(28, -20 - bounce, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(32, -20 - bounce, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (enemy.state === 'shooting') {
          ctx.fillRect(0, -22 - bounce, 20, 3);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(20, -21 - bounce, 6, 1.5);
        } else if (enemy.type === 'grenadier') {
          // Mills Bomb in hand
          ctx.fillStyle = '#14532d';
          ctx.beginPath();
          ctx.arc(8, -20 - bounce, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (enemy.type === 'officer') {
          // Drawn Officer Sabre
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(2, -22 - bounce, 18, 2);
          ctx.fillStyle = '#eab308';
          ctx.fillRect(0, -24 - bounce, 3, 6);
        } else {
          // Charging bayonet
          ctx.fillRect(2, -18 - bounce, 22, 3);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillRect(22, -19 - bounce, 10, 2);
        }
      }

      ctx.restore();

      // Enemy Health Bar (only when alive)
      if (!isDying && enemy.health > 0) {
        this.drawHealthBar(sx, sy - 42, enemy.health, enemy.maxHealth, '#ef4444');
      }
    }
  }

  // --- Organic Multi-Joint Ragdoll Death Animation System ---

  private drawSoldierRagdollDeath(ctx: CanvasRenderingContext2D, soldier: Soldier, deathProgress: number, isTrench: boolean) {
    const t = Math.min(1, Math.max(0, deathProgress));
    const easeCubic = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
    const easeQuart = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 4);
    const animType = soldier.deathAnimType ?? 0;

    // Atmospheric dissipation fade in final rest phase
    if (t > 0.62) {
      const fadeAlpha = Math.max(0, 1 - Math.pow((t - 0.62) / 0.38, 1.4));
      ctx.globalAlpha *= fadeAlpha;
    }

    // Ground Shadow conforming to body collapse
    const shadowStretch = easeCubic(t / 0.45);
    const shadowAlpha = 0.32 * (1 - (t > 0.65 ? (t - 0.65) / 0.35 : 0));
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(animType === 1 ? easeCubic(t / 0.35) * 8 : -easeCubic(t / 0.35) * 8, -1, 11 + shadowStretch * 13, 3 + shadowStretch * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ground impact dust puffs
    if (t >= 0.32 && t <= 0.72) {
      const dustT = (t - 0.32) / 0.4;
      const dustAlpha = Math.sin(dustT * Math.PI) * 0.35;
      ctx.fillStyle = `rgba(120, 113, 108, ${dustAlpha})`;
      ctx.beginPath();
      ctx.ellipse(-12 - dustT * 6, -2, 6 + dustT * 7, 2.5 + dustT * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Role-based uniform colors
    const isMedic = soldier.role === 'medic';
    const isRecruit = soldier.role === 'recruit';
    const isAssault = soldier.isAssaultSquad;
    const tunicColor = isMedic ? '#ffffff' : isRecruit ? '#a8a29e' : isAssault ? '#365314' : '#716b4e';
    const putteesColor = '#78716c';
    const bootColor = '#292524';
    const skinColor = '#fed7aa';

    if (animType === 0) {
      // --- ANIMATION 0: FORWARD KNEE BUCKLE & CHEST FOLD ---
      const knockbackX = -easeCubic(t / 0.35) * 8;
      const hipDrop = easeQuart(t / 0.44) * 13;
      const impactBounce = Math.max(0, 1 - Math.abs(t - 0.44) / 0.12) * 1.4;
      const pelvisX = knockbackX;
      const pelvisY = -10 + hipDrop - impactBounce;
      const pelvisTilt = easeCubic(t / 0.4) * 0.32;

      // Legs folding underneath
      ctx.save();
      ctx.translate(pelvisX, pelvisY);
      ctx.rotate(pelvisTilt);

      // Thighs
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-3, 0, 6, 7.5);
      // Calves bent backward
      ctx.fillStyle = putteesColor;
      ctx.fillRect(-2.5, 6, 5, 6.5);
      ctx.fillStyle = bootColor;
      ctx.fillRect(-2.5, 10.5, 6, 3);
      ctx.restore();

      // Torso folding forward
      ctx.save();
      ctx.translate(pelvisX, pelvisY);
      const torsoAngle = pelvisTilt + easeCubic(Math.max(0, (t - 0.05) / 0.44)) * (Math.PI * 0.46);
      ctx.rotate(torsoAngle);

      ctx.fillStyle = tunicColor;
      ctx.fillRect(-4.5, -14, 9, 14);

      // Enveriye Belt & crossbelts
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-4.5, -3, 9, 2.5);

      // Arms sliding forward
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-2, -13, 3.5, 8);
      ctx.fillStyle = skinColor;
      ctx.fillRect(-2, -5, 3.5, 3);

      // Head dropping forward
      ctx.save();
      ctx.translate(0, -14);
      ctx.rotate(0.35 * easeCubic(t / 0.45));
      ctx.fillStyle = skinColor;
      ctx.fillRect(-3, -7, 6, 7);

      // Ottoman Kabalak Cap
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-4, -10, 8, 4);
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(-5, -8, 10, 2);
      ctx.restore();

      ctx.restore();

      // Dropped Mauser Rifle falling forward
      if (soldier.role !== 'recruit' && soldier.role !== 'medic') {
        ctx.save();
        const wT = Math.min(1, Math.max(0, (t - 0.05) / 0.42));
        const weaponDrop = easeCubic(wT);
        ctx.translate(6 + weaponDrop * 16, -16 + weaponDrop * 18);
        ctx.rotate(weaponDrop * 1.15);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-4, -1.5, 18, 3);
        ctx.fillStyle = '#475569';
        ctx.fillRect(14, -1, 7, 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(21, -1, 6, 1.5);
        ctx.restore();
      }

    } else if (animType === 1) {
      // --- ANIMATION 1: BACKWARDS BLOWBACK & DROP ON BACK ---
      const knockbackX = easeCubic(t / 0.35) * 14;
      const hipDrop = easeQuart(t / 0.42) * 14;
      const impactBounce = Math.max(0, 1 - Math.abs(t - 0.42) / 0.12) * 1.6;
      const pelvisX = -knockbackX;
      const pelvisY = -10 + hipDrop - impactBounce;
      const pelvisTilt = -easeCubic(t / 0.4) * 0.4;

      // Legs splayed forward
      ctx.save();
      ctx.translate(pelvisX, pelvisY);
      ctx.rotate(pelvisTilt);
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-3, 0, 6, 8);
      ctx.fillStyle = putteesColor;
      ctx.fillRect(-2.5, 7, 5, 7);
      ctx.fillStyle = bootColor;
      ctx.fillRect(-2, 12, 6, 3);
      ctx.restore();

      // Torso arching backward onto turf
      ctx.save();
      ctx.translate(pelvisX, pelvisY);
      const torsoAngle = pelvisTilt - easeCubic(Math.max(0, (t - 0.05) / 0.42)) * (Math.PI * 0.48);
      ctx.rotate(torsoAngle);

      ctx.fillStyle = tunicColor;
      ctx.fillRect(-4.5, -14, 9, 14);

      // Enveriye Belt
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-4.5, -3, 9, 2.5);

      // Splayed arms
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-5, -12, 3, 7);
      ctx.fillRect(2, -12, 3, 7);
      ctx.fillStyle = skinColor;
      ctx.fillRect(-5, -5, 3, 3);
      ctx.fillRect(2, -5, 3, 3);

      // Head arching back
      ctx.save();
      ctx.translate(0, -14);
      ctx.rotate(-0.25 * easeCubic(t / 0.45));
      ctx.fillStyle = skinColor;
      ctx.fillRect(-3, -7, 6, 7);

      // Kabalak Cap
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-4, -10, 8, 4);
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(-5, -8, 10, 2);
      ctx.restore();

      ctx.restore();

      // Dropped Mauser Rifle sliding backwards
      if (soldier.role !== 'recruit' && soldier.role !== 'medic') {
        ctx.save();
        const wT = Math.min(1, Math.max(0, (t - 0.05) / 0.42));
        const weaponDrop = easeCubic(wT);
        ctx.translate(-4 - weaponDrop * 18, -16 + weaponDrop * 18);
        ctx.rotate(-weaponDrop * 1.25);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-4, -1.5, 18, 3);
        ctx.fillStyle = '#475569';
        ctx.fillRect(14, -1, 7, 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(21, -1, 6, 1.5);
        ctx.restore();
      }

    } else {
      // --- ANIMATION 2: SIDEWAYS STAGGER & SHOULDER ROLL ---
      const knockbackX = -easeCubic(t / 0.35) * 11;
      const hipDrop = easeQuart(t / 0.44) * 14;
      const pelvisX = knockbackX;
      const pelvisY = -10 + hipDrop;
      const sideRoll = easeCubic(t / 0.42) * (Math.PI * 0.44);

      ctx.save();
      ctx.translate(pelvisX, pelvisY);
      ctx.rotate(sideRoll);

      // Curled legs
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-3, 0, 6, 7);
      ctx.fillStyle = putteesColor;
      ctx.fillRect(-2.5, 5, 5, 6);
      ctx.fillStyle = bootColor;
      ctx.fillRect(-2, 9, 5, 3);

      // Torso curled sideways
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-4.5, -14, 9, 14);

      // Arms curled in fetal posture
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-2, -11, 3.5, 6);
      ctx.fillStyle = skinColor;
      ctx.fillRect(-2, -5, 3.5, 3);

      // Head sideways
      ctx.save();
      ctx.translate(0, -14);
      ctx.fillStyle = skinColor;
      ctx.fillRect(-3, -7, 6, 7);
      // Kabalak Cap
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-4, -10, 8, 4);
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(-5, -8, 10, 2);
      ctx.restore();

      ctx.restore();

      // Dropped Mauser Rifle rolling on grass
      if (soldier.role !== 'recruit' && soldier.role !== 'medic') {
        ctx.save();
        const wT = Math.min(1, Math.max(0, (t - 0.05) / 0.42));
        const weaponDrop = easeCubic(wT);
        ctx.translate(3 + weaponDrop * 14, -14 + weaponDrop * 16);
        ctx.rotate(weaponDrop * 1.5);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-4, -1.5, 18, 3);
        ctx.fillStyle = '#475569';
        ctx.fillRect(14, -1, 7, 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(21, -1, 6, 1.5);
        ctx.restore();
      }
    }
  }

  private drawEnemyRagdollDeath(ctx: CanvasRenderingContext2D, enemy: Enemy, deathProgress: number) {
    const t = Math.min(1, Math.max(0, deathProgress));
    const easeCubic = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
    const easeQuart = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 4);
    const animType = (enemy.deathAnimType ?? 0) % 4;

    // Organic micro-settle bounce on ground contact
    const settle = t > 0.42 ? Math.sin((t - 0.42) * 14) * Math.exp(-(t - 0.42) * 9) * 1.5 : 0;

    // 1. Smooth Atmospheric Dissipation Fade in resting phase
    if (t > 0.68) {
      const fadeAlpha = Math.max(0, 1 - Math.pow((t - 0.68) / 0.32, 1.4));
      ctx.globalAlpha *= fadeAlpha;
    }

    // 2. Soft Organic Ground Shadow & Mud Contact Stain
    const shadowStretch = easeCubic(t / 0.45);
    const shadowAlpha = 0.34 * (1 - (t > 0.7 ? (t - 0.7) / 0.3 : 0));
    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
    ctx.beginPath();
    const shadowOffsetX = animType === 1 ? easeCubic(t / 0.35) * 8 : -easeCubic(t / 0.35) * 6;
    ctx.ellipse(shadowOffsetX, -1, 12 + shadowStretch * 14, 3 + shadowStretch * 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Ground Impact Soft Dust & Earth Kick
    if (t >= 0.34 && t <= 0.72) {
      const dustT = (t - 0.34) / 0.38;
      const dustAlpha = Math.sin(dustT * Math.PI) * 0.32;
      ctx.fillStyle = `rgba(130, 115, 100, ${dustAlpha})`;
      ctx.beginPath();
      ctx.ellipse(-10 - dustT * 8, -2, 7 + dustT * 9, 2.5 + dustT * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Entity classification & styling
    const isHighlander = enemy.type === 'highlander';
    const isStormtrooper = enemy.type === 'stormtrooper';
    const isOfficer = enemy.type === 'officer';

    const trouserColor = isHighlander ? '#1e3a8a' : '#a16207';
    const bootColor = '#1c1917';
    const tunicColor = isStormtrooper ? '#1e293b' : isOfficer ? '#451a03' : '#854d0e';
    const skinColor = '#fbcfe8';

    // Helper to draw headgear
    const drawHeadgear = (c: CanvasRenderingContext2D, tilt = 0) => {
      c.save();
      c.rotate(tilt);
      if (isStormtrooper) {
        c.fillStyle = '#1e293b';
        c.beginPath();
        c.arc(0, -7, 4.8, Math.PI, 0);
        c.fill();
        c.fillRect(-5, -7, 10, 3);
      } else if (isHighlander) {
        c.fillStyle = '#1e3a8a';
        c.beginPath();
        c.ellipse(0, -7.5, 5.5, 2.8, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#dc2626';
        c.fillRect(3, -9, 2.5, 4); // Tartan hackle
      } else if (isOfficer) {
        c.fillStyle = '#451a03';
        c.fillRect(-4.5, -8, 9, 3);
        c.fillStyle = '#ca8a04';
        c.fillRect(-3, -6.5, 6, 1.2);
      } else {
        c.fillStyle = '#713f12';
        c.beginPath();
        c.arc(0, -6.5, 4.6, Math.PI, 0);
        c.fill();
        c.beginPath();
        c.ellipse(0, -6.5, 7.2, 1.8, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    };

    if (animType === 1) {
      // --- ENEMY ANIM 1: BACKWARDS RECOIL DROP ON BACK ---
      const knockbackX = easeCubic(t / 0.35) * 14;
      const hipDrop = easeQuart(t / 0.44) * 14;
      const pelvisX = -knockbackX;
      const pelvisY = -10 + hipDrop - settle;
      const pelvisTilt = -easeCubic(t / 0.4) * 0.38;

      ctx.save();
      ctx.translate(pelvisX, pelvisY);
      ctx.rotate(pelvisTilt);
      ctx.fillStyle = trouserColor;
      ctx.beginPath();
      ctx.roundRect(-3, 0, 6, 8.5, [1, 1, 2, 2]);
      ctx.fill();
      ctx.fillStyle = bootColor;
      ctx.beginPath();
      ctx.roundRect(-2, 7.5, 5.5, 3.2, [1, 1, 2, 1]);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(pelvisX, pelvisY);
      const torsoAngle = pelvisTilt - easeCubic(Math.max(0, (t - 0.05) / 0.42)) * (Math.PI * 0.48);
      ctx.rotate(torsoAngle);

      ctx.fillStyle = tunicColor;
      ctx.beginPath();
      ctx.roundRect(-5.2, -15, 10.4, 15, [2, 2, 1, 1]);
      ctx.fill();

      // Arms flinging out organically to sides
      const armSpread = easeCubic(t / 0.4) * 0.45;
      ctx.save();
      ctx.translate(-4, -13);
      ctx.rotate(-armSpread);
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-1.5, 0, 3, 7.5);
      ctx.fillStyle = skinColor;
      ctx.fillRect(-1.5, 7, 3, 3);
      ctx.restore();

      ctx.save();
      ctx.translate(4, -13);
      ctx.rotate(armSpread);
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-1.5, 0, 3, 7.5);
      ctx.fillStyle = skinColor;
      ctx.fillRect(-1.5, 7, 3, 3);
      ctx.restore();

      // Head arching back with inertia
      ctx.save();
      ctx.translate(0, -15);
      ctx.rotate(-0.28 * easeCubic(t / 0.45));
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.roundRect(-3.2, -8, 6.4, 8, [2, 2, 3, 3]);
      ctx.fill();
      drawHeadgear(ctx, -0.15 * easeCubic(t / 0.5));
      ctx.restore();

      ctx.restore();

    } else if (animType === 2) {
      // --- ENEMY ANIM 2: SIDEWAYS ROTATIONAL SHOULDER ROLL & CURL ---
      const knockbackX = -easeCubic(t / 0.35) * 12;
      const hipDrop = easeQuart(t / 0.44) * 14;
      const pelvisX = knockbackX;
      const pelvisY = -10 + hipDrop - settle;
      const sideRoll = easeCubic(t / 0.44) * (Math.PI * 0.48);

      ctx.save();
      ctx.translate(pelvisX, pelvisY);
      ctx.rotate(sideRoll);

      ctx.fillStyle = trouserColor;
      ctx.beginPath();
      ctx.roundRect(-3, 0, 6, 8, [1, 1, 2, 2]);
      ctx.fill();
      ctx.fillStyle = bootColor;
      ctx.beginPath();
      ctx.roundRect(-2, 7, 5, 3.2, [1, 1, 2, 1]);
      ctx.fill();

      ctx.fillStyle = tunicColor;
      ctx.beginPath();
      ctx.roundRect(-5.2, -15, 10.4, 15, [2, 2, 1, 1]);
      ctx.fill();

      // Arm wrapping around chest in natural fetal curl
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-2, -12, 3.5, 7);
      ctx.fillStyle = skinColor;
      ctx.fillRect(-2, -5, 3.5, 3);

      // Head tilting sideways
      ctx.save();
      ctx.translate(0, -15);
      ctx.rotate(0.18 * easeCubic(t / 0.45));
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.roundRect(-3.2, -8, 6.4, 8, [2, 2, 3, 3]);
      ctx.fill();
      drawHeadgear(ctx, 0.22 * easeCubic(t / 0.5));
      ctx.restore();

      ctx.restore();

    } else if (animType === 3) {
      // --- ENEMY ANIM 3: KINETIC SPRINT STUMBLE & FORWARD SLIDE ---
      const forwardSlide = easeCubic(t / 0.45) * 16;
      const hipDrop = easeQuart(t / 0.42) * 14;
      const pelvisX = forwardSlide;
      const pelvisY = -10 + hipDrop - settle;
      const slidePitch = -easeCubic(t / 0.4) * (Math.PI * 0.42);

      // Trailing leg stretched back
      ctx.save();
      ctx.translate(pelvisX - 6, pelvisY + 2);
      ctx.rotate(0.35 * easeCubic(t / 0.4));
      ctx.fillStyle = trouserColor;
      ctx.fillRect(-2, 0, 4.5, 8);
      ctx.fillStyle = bootColor;
      ctx.fillRect(-2, 7.5, 5, 3);
      ctx.restore();

      ctx.save();
      ctx.translate(pelvisX, pelvisY);
      ctx.rotate(slidePitch);

      ctx.fillStyle = tunicColor;
      ctx.beginPath();
      ctx.roundRect(-5.2, -15, 10.4, 15, [2, 2, 1, 1]);
      ctx.fill();

      // Forward reaching arm
      ctx.save();
      ctx.translate(-3, -12);
      ctx.rotate(0.65 * easeCubic(t / 0.4));
      ctx.fillStyle = tunicColor;
      ctx.fillRect(-1.5, 0, 3, 7);
      ctx.fillStyle = skinColor;
      ctx.fillRect(-1.5, 6.5, 3, 3);
      ctx.restore();

      // Head sliding low
      ctx.save();
      ctx.translate(0, -15);
      ctx.rotate(-0.12 * easeCubic(t / 0.45));
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.roundRect(-3.2, -8, 6.4, 8, [2, 2, 3, 3]);
      ctx.fill();
      drawHeadgear(ctx, -0.28 * easeCubic(t / 0.48));
      ctx.restore();

      ctx.restore();

    } else {
      // --- ENEMY ANIM 0: KNEES-FIRST FORWARD SLUMP & GROUND REST ---
      const knockbackX = -easeCubic(t / 0.35) * 10;
      const hipDrop = easeQuart(t / 0.44) * 14;
      const pelvisX = knockbackX;
      const pelvisY = -10 + hipDrop - settle;
      const pelvisTilt = -easeCubic(t / 0.4) * 0.28;

      // Bent knees underneath
      ctx.save();
      ctx.translate(pelvisX + 2, pelvisY);
      ctx.rotate(pelvisTilt - 0.38 * easeCubic(t / 0.38));
      ctx.fillStyle = trouserColor;
      ctx.beginPath();
      ctx.roundRect(-2.5, 0, 5, 8.5, [1, 1, 2, 2]);
      ctx.fill();
      ctx.translate(0, 7.5);
      ctx.rotate(0.42 * easeCubic(t / 0.42));
      ctx.beginPath();
      ctx.roundRect(-2, 0, 4, 8.5, [1, 1, 2, 2]);
      ctx.fill();
      ctx.fillStyle = bootColor;
      ctx.beginPath();
      ctx.roundRect(-2, 7.5, 5.5, 3.2, [1, 1, 2, 1]);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(pelvisX - 2, pelvisY);
      const frontHipAngle = pelvisTilt + 0.68 * easeCubic(t / 0.4);
      ctx.rotate(frontHipAngle);
      ctx.fillStyle = trouserColor;
      ctx.beginPath();
      ctx.roundRect(-2.8, 0, 5.5, 9, [1.5, 1.5, 2, 2]);
      ctx.fill();
      ctx.translate(0, 8);
      const frontKneeAngle = -1.22 * easeCubic(t / 0.45);
      ctx.rotate(frontKneeAngle);
      ctx.beginPath();
      ctx.roundRect(-2.2, 0, 4.4, 9, [1, 1, 2, 2]);
      ctx.fill();
      ctx.fillStyle = bootColor;
      ctx.beginPath();
      ctx.roundRect(-2.2, 8, 6.2, 3.4, [1, 1, 2, 1]);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(pelvisX, pelvisY);
      const shockJerk = t < 0.16 ? -0.12 * Math.sin((t / 0.16) * Math.PI) : 0;
      const torsoFall = -easeCubic(Math.max(0, (t - 0.05) / 0.44)) * (Math.PI * 0.48);
      const torsoAngle = pelvisTilt + torsoFall + shockJerk;
      ctx.rotate(torsoAngle);

      ctx.fillStyle = tunicColor;
      ctx.beginPath();
      ctx.roundRect(-5.2, -15, 10.4, 15, [3, 3, 1, 1]);
      ctx.fill();

      // Arm clutching torso then sagging to ground
      ctx.save();
      ctx.translate(-4, -13);
      ctx.rotate(0.58 * easeCubic(t / 0.4));
      ctx.fillStyle = tunicColor;
      ctx.beginPath();
      ctx.roundRect(-1.8, 0, 3.6, 7.5, [1, 1, 2, 2]);
      ctx.fill();
      ctx.translate(0, 6.5);
      ctx.rotate(-0.85 * easeCubic(t / 0.45));
      ctx.beginPath();
      ctx.roundRect(-1.5, 0, 3, 7, [1, 1, 1.5, 1.5]);
      ctx.fill();
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(0, 7.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Head leaning forward onto turf
      ctx.save();
      ctx.translate(0, -15);
      const headInertia = Math.sin(Math.min(1, t / 0.52) * Math.PI * 1.15) * 0.26;
      const headAngle = torsoAngle * 0.65 + headInertia;
      ctx.rotate(headAngle);

      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.roundRect(-3.2, -8, 6.4, 8, [2, 2, 3, 3]);
      ctx.fill();
      drawHeadgear(ctx, 0.14 * easeCubic(t / 0.5));
      ctx.restore();

      ctx.restore();
    }

    // Dropped Weapon physical tumble & slide
    ctx.save();
    const wT = Math.min(1, Math.max(0, (t - 0.05) / 0.44));
    const weaponDrop = easeCubic(wT);
    const weaponX = (animType === 1 ? -4 : 4) + (animType === 3 ? 24 : 14) * weaponDrop;
    let weaponY = -18 + weaponDrop * 20;
    if (wT > 0.42 && wT < 0.95) {
      const bounceSub = (wT - 0.42) / 0.53;
      weaponY -= Math.sin(bounceSub * Math.PI) * 4.4;
    }
    const weaponRot = weaponDrop * 1.45;
    ctx.translate(weaponX, weaponY);
    ctx.rotate(weaponRot);

    if (isOfficer) {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(2, -1, 18, 2);
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(1, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#3f1a04';
      ctx.beginPath();
      ctx.roundRect(-4, -1, 18, 3, 1);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.fillRect(14, -0.5, 7, 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(21, -0.5, 8, 1.4);
    }
    ctx.restore();
  }

  private drawArmouredCar(x: number, y: number, _enemy: Enemy, isDying = false, deathProgress = 0) {
    const ctx = this.ctx;
    // Hull (darkens/scorches if destroyed)
    ctx.fillStyle = isDying ? '#1e293b' : '#334155';
    ctx.fillRect(x - 45, y - 35, 90, 25);
    // Slanted armor front
    ctx.beginPath();
    ctx.moveTo(x + 45, y - 10);
    ctx.lineTo(x + 55, y - 15);
    ctx.lineTo(x + 45, y - 35);
    ctx.closePath();
    ctx.fill();

    // Turret & Dual Machine Guns
    ctx.fillStyle = isDying ? '#0f172a' : '#1e293b';
    ctx.fillRect(x - 15, y - 48, 30, 14);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + 10, y - 43, 20, 4);

    // Wheels (4 big spoked wheels)
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(x - 30, y - 8, 12, 0, Math.PI * 2);
    ctx.arc(x + 30, y - 8, 12, 0, Math.PI * 2);
    ctx.fill();

    if (isDying) {
      // Fiery explosion & heavy smoke plume billowing from engine
      ctx.fillStyle = 'rgba(234, 88, 12, 0.7)';
      ctx.beginPath();
      ctx.arc(x - 5, y - 35 - deathProgress * 12, 8 + deathProgress * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(71, 85, 105, 0.6)';
      ctx.beginPath();
      ctx.arc(x + 5, y - 42 - deathProgress * 18, 10 + deathProgress * 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Player Commander Rendering ---

  private drawCommander(commander: PlayerCommander, camX: number, state: GameState) {
    const ctx = this.ctx;
    const gY = this.groundY; // Guaranteed 440
    const sx = commander.x - camX;
    const sy = gY;

    ctx.save();

    // 1. Under-horse Commander Aura & Shadow Ring (ensures visibility on any terrain/lighting)
    const isInvulnerable = commander.invulnerableTimer > 0;
    const isFlashing = isInvulnerable && Math.floor(this.animTimer * 20) % 2 === 0;

    const pulse = (Math.sin(this.animTimer * 5) + 1) * 0.5;
    ctx.fillStyle = isInvulnerable ? 'rgba(239, 68, 68, 0.5)' : 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(sx, sy - 2, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Golden / Red Command Ring
    ctx.strokeStyle = isInvulnerable ? '#ef4444' : commander.isSprinting ? '#fbbf24' : 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = isInvulnerable || commander.isSprinting ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.ellipse(sx, sy - 2, 26 + pulse * 4, 7 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Health Bar like enemies (kumandan yazmasın, sadece can barı olsun)
    const barY = sy - 72 - (commander.isSprinting ? 4 : 0);
    this.drawHealthBar(sx, barY, commander.health ?? 5, commander.maxHealth || 5, '#22c55e');

    // Stamina Bar right beneath health bar if not full
    if (commander.stamina < commander.maxStamina) {
      const stW = 30;
      const stPct = Math.max(0, Math.min(1, commander.stamina / commander.maxStamina));
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(sx - stW / 2 - 1, barY + 5, stW + 2, 3);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(sx - stW / 2, barY + 5.5, stW, 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(sx - stW / 2, barY + 5.5, stW * stPct, 2);
    }

    // Damage flash skip rendering for flicker
    if (isFlashing) {
      ctx.restore();
      return;
    }

    // Translate to commander coordinate with facing scale
    ctx.translate(sx, sy);
    ctx.scale(commander.facing, 1);

    const isMoving = commander.state === 'walking' || commander.state === 'galloping';
    const gallopTimer = this.animTimer * (commander.isSprinting ? 9.2 : 5.8);
    const gallopBob = isMoving ? Math.sin(gallopTimer) * (commander.isSprinting ? 1.2 : 0.5) : 0;

    if (commander.isMounted) {
      const mType = commander.mountType || 'white';
      this.drawRealisticHorse(0, 0, 1, mType, isMoving, commander.isSprinting, true, commander.x || 0, {
        gallopTimer,
      });

      // Classic Leather Reins connecting bit to Commander's hand
      const headNod = isMoving ? (commander.isSprinting ? -Math.sin(gallopTimer % (Math.PI * 2)) * 0.7 : Math.sin(gallopTimer * 2 + 0.6) * 0.35) : 0;
      const bitX = 27;
      const bitY = -29 + gallopBob + headNod;
      const handX = 4;
      const handY = -38 + gallopBob;
      const reinSag = isMoving ? 2 : 5;

      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bitX, bitY);
      ctx.quadraticCurveTo((bitX + handX) / 2, Math.max(handY, (bitY + handY) / 2 + reinSag), handX, handY);
      ctx.stroke();

      // --- Commander Riding Horse (Döneme Uygun Osmanlı Kurmay Subayı) ---
      // Flowing commander cape when moving or galloping
      if (isMoving) {
        const capeWave = Math.sin(gallopTimer * 1.2) * 3;
        ctx.fillStyle = '#7f1d1d'; // Ottoman crimson officer mantle
        ctx.beginPath();
        ctx.moveTo(-6, -42 + gallopBob);
        ctx.lineTo(-24 - (commander.isSprinting ? 8 : 2), -32 + gallopBob + capeWave);
        ctx.lineTo(-22 - (commander.isSprinting ? 8 : 2), -22 + gallopBob + capeWave);
        ctx.lineTo(-4, -34 + gallopBob);
        ctx.closePath();
        ctx.fill();
      }

      // Commander Legs in Saddle
      ctx.fillStyle = '#0f172a'; // High polished black leather riding boots
      ctx.fillRect(-4, -28 + gallopBob, 6, 14);
      // Silver spur on heel
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-5, -16 + gallopBob, 2, 3);

      // Commander Torso (Historical 1915 Ottoman Staff Officer Tunic - Haki Çuha Üniforma)
      ctx.fillStyle = '#4b4b35'; // Historical Ottoman Khaki/Olive Wool
      ctx.fillRect(-6, -44 + gallopBob, 12, 16);

      // Crimson Stand-up Officer Collar with Gold Rank Stars (Kırmızı Yaka Aynası & Rütbe)
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(0, -46 + gallopBob, 5, 4);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(2, -45 + gallopBob, 2, 2); // Gold star

      // Gold Epaulettes (Sırmalı Subay Apoletleri)
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-7, -45 + gallopBob, 4, 3);
      ctx.fillRect(3, -45 + gallopBob, 4, 3);

      // Diagonal Leather Sam Browne Cross-Belt & Officer Binoculars Case (Dürbün Kılıfı & Meşin Kayış)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-5, -43 + gallopBob, 10, 2);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-1, -43 + gallopBob, 3, 2);
      // Leather Field Binoculars Case (Pasha's iconic Carl Zeiss Jena Field Glasses case)
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-6, -39 + gallopBob, 5, 5);
      ctx.fillStyle = '#facc15'; // Brass latch
      ctx.fillRect(-5, -37 + gallopBob, 2, 1.5);

      // Gallipoli Star ("Harp Madalyası" / "Demir Hilal" - Red Enamel with Silver Crescent)
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(2, -41 + gallopBob, 3.5, 3.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, -40.5 + gallopBob, 1.5, 1.5);

      // Gold sash / belt (Subay Kuşağı)
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-6, -33 + gallopBob, 12, 3);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-2, -33 + gallopBob, 4, 3);

      // Arms & Hands holding the reins
      ctx.fillStyle = '#4b4b35';
      ctx.fillRect(0, -42 + gallopBob, 6, 5);
      ctx.fillStyle = '#fef08a'; // Yellow leather gloves
      ctx.fillRect(4, -40 + gallopBob, 4, 4);

      // Head & Face (Mustafa Kemal Paşa: Sarışın/Sarı Bıyıklı, Keskin Mavi Gözlü)
      ctx.fillStyle = '#fed7aa'; // Skin tone
      ctx.fillRect(-4, -52 + gallopBob, 8, 8);

      // Blonde Hair locks under kalpak
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-5, -53 + gallopBob, 3, 4);
      ctx.fillRect(2, -53 + gallopBob, 3, 4);

      // Piercing Blue Eyes (Çanakkale Kahramanı Mavi Gözler)
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(1, -50 + gallopBob, 2, 1.8);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(1.5, -50 + gallopBob, 1, 1);

      // Characteristic 1915 Ottoman Commander Mustache (Sarı-Kestane Bıyık)
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-1, -47.5 + gallopBob, 5, 2);

      // Ottoman Astrakhan Kalpak (Tarihi Mustafa Kemal Paşa Kara Astragan Kalpağı)
      ctx.fillStyle = '#18181b'; // Dense black wool kalpak
      ctx.fillRect(-6, -62 + gallopBob, 12, 11);
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-5, -61 + gallopBob, 10, 4); // Astrakhan curl highlight
      ctx.fillStyle = '#dc2626'; // Red felt crown top (Kalpak tepeliği)
      ctx.fillRect(-4, -63 + gallopBob, 8, 2);
      // Gold Crescent & Star Cockade on front of Kalpak (Ay-Yıldız Subay Kokartı)
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(1, -57 + gallopBob, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Ottoman Commander Curved Shamshir Sword in Scabbard (Altın Kabzalı Kılıç)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-3, -38 + gallopBob, 2, 16); // Steel scabbard
      ctx.fillStyle = '#eab308'; // Curved gold lion hilt
      ctx.fillRect(-5, -40 + gallopBob, 6, 3);
      ctx.fillStyle = '#dc2626'; // Red sword tassel
      ctx.fillRect(-4, -37 + gallopBob, 2, 4);

      // Oil Lantern in hand at night
      if (state.dayProgress > 0.55 || commander.lanternLit) {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(8, -32 + gallopBob, 5, 7);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(9, -30 + gallopBob, 3, 4);
      }
    } else {
      // Commander On Foot (Döneme Uygun Osmanlı Kurmay Subayı - Yaya Modu)
      const walkBounce = isMoving ? Math.abs(Math.sin(this.animTimer * 10)) * 2 : 0;
      const legStep = isMoving ? Math.sin(this.animTimer * 10) * 0.4 : 0;

      // Legs / Polished riding boots
      ctx.save();
      ctx.translate(-2, -14);
      ctx.rotate(legStep);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-2, 0, 4, 14);
      ctx.restore();

      ctx.save();
      ctx.translate(2, -14);
      ctx.rotate(-legStep);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-2, 0, 4, 14);
      ctx.restore();

      // Wool Tunic
      ctx.fillStyle = '#4b4b35';
      ctx.fillRect(-5, -28 - walkBounce, 10, 14);

      // Crimson Stand-up Officer Collar & Gold Epaulettes
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-1, -30 - walkBounce, 4, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-6, -29 - walkBounce, 3, 2);
      ctx.fillRect(3, -29 - walkBounce, 3, 2);

      // Gold sash / belt & Scabbard
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(-5, -19 - walkBounce, 10, 2);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-1, -19 - walkBounce, 3, 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-4, -22 - walkBounce, 2, 12); // Scabbard

      // Head & Face
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(-4, -38 - walkBounce, 8, 8);

      // Piercing Blue Eyes & Blonde Hair
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(1, -36 - walkBounce, 2, 1.8);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(1.5, -36 - walkBounce, 1, 1);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-1, -33 - walkBounce, 4, 1.5); // Mustache

      // Black Astrakhan Kalpak with Crescent & Star
      ctx.fillStyle = '#18181b';
      ctx.fillRect(-6, -48 - walkBounce, 12, 10);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-4, -49 - walkBounce, 8, 2);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(1, -43 - walkBounce, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // --- Projectiles & Particles ---

  private drawProjectiles(projectiles: Projectile[], camX: number, state?: GameState) {
    const ctx = this.ctx;
    const hasDamageBuff = state?.relicsCollected.some(
      (id) => id.includes('statue_damage') || id.includes('relic_damage')
    ) || false;

    for (const p of projectiles) {
      const sx = p.x - camX;
      if (sx < -50 || sx > this.width + 50) continue;

      ctx.save();
      if (p.type === 'bullet' || p.type === 'enemy_bullet' || p.type === 'tracer') {
        const isFriendly = p.source === 'player' || p.source === 'soldier';
        const isTracer = p.type === 'tracer';
        const dirX = p.vx >= 0 ? 1 : -1;
        const tracerLen = isTracer ? 32 : (isFriendly && hasDamageBuff ? 22 : 14);
        const strokeW = isTracer ? 5.5 : (isFriendly && hasDamageBuff ? 3.5 : 2);
        const tipRadius = isTracer ? 4.2 : (isFriendly && hasDamageBuff ? 2.8 : 1.5);

        // Outer Incandescent Glow for Tracer Rounds
        if (isTracer) {
          ctx.strokeStyle = 'rgba(234, 88, 12, 0.4)';
          ctx.lineWidth = strokeW + 4;
          ctx.beginPath();
          ctx.moveTo(sx - dirX * (tracerLen + 6), p.y);
          ctx.lineTo(sx, p.y);
          ctx.stroke();
        }

        // Glowing Core Line
        const grad = ctx.createLinearGradient(sx - dirX * tracerLen, p.y, sx, p.y);
        if (isTracer) {
          grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
          grad.addColorStop(0.2, 'rgba(245, 158, 11, 0.8)');
          grad.addColorStop(0.7, 'rgba(253, 224, 71, 0.95)');
          grad.addColorStop(1, '#ffffff');
        } else if (isFriendly) {
          if (hasDamageBuff) {
            // Enhanced incendiary / tracer stream
            grad.addColorStop(0, 'rgba(234, 88, 12, 0)');
            grad.addColorStop(0.3, 'rgba(245, 158, 11, 0.6)');
            grad.addColorStop(0.7, 'rgba(253, 224, 71, 0.9)');
            grad.addColorStop(1, '#ffffff');
          } else {
            grad.addColorStop(0, 'rgba(253, 224, 71, 0)');
            grad.addColorStop(0.7, 'rgba(251, 191, 36, 0.6)');
            grad.addColorStop(1, '#ffffff');
          }
        } else {
          grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
          grad.addColorStop(0.7, 'rgba(248, 113, 113, 0.6)');
          grad.addColorStop(1, '#fee2e2');
        }

        ctx.strokeStyle = grad;
        ctx.lineWidth = strokeW;
        ctx.beginPath();
        ctx.moveTo(sx - dirX * tracerLen, p.y);
        ctx.lineTo(sx, p.y);
        ctx.stroke();

        // Bright Bullet Tip
        ctx.fillStyle = isTracer ? '#ffffff' : (isFriendly ? (hasDamageBuff ? '#ffffff' : '#fef08a') : '#fca5a5');
        ctx.beginPath();
        ctx.arc(sx, p.y, tipRadius, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'artillery_shell' || p.type === 'naval_shell') {
        // Heavy aerodynamic artillery shell with heat trail
        const angle = Math.atan2(p.vy, p.vx);
        ctx.save();
        ctx.translate(sx, p.y);
        ctx.rotate(angle);

        // Smoke/fire streak behind shell
        ctx.fillStyle = 'rgba(234, 88, 12, 0.6)';
        ctx.beginPath();
        ctx.ellipse(-8, 0, 8, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark iron shell casing
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, -3, 10, 6);
        // Brass/Copper driving band
        ctx.fillStyle = '#d97706';
        ctx.fillRect(-4, -3, 2, 6);
        // Pointed nose cone
        ctx.beginPath();
        ctx.moveTo(4, -3);
        ctx.lineTo(9, 0);
        ctx.lineTo(4, 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      } else if (p.type === 'grenade') {
        // Spinning hand bomb
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(sx, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        // Fuse spark
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx, p.y - 4, 2, 2);
      } else if (p.type === 'flare') {
        // Parachute Flare illuminating the night sky
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(sx, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        // Parachute
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(sx, p.y - 12, 10, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - 10, p.y - 12);
        ctx.lineTo(sx, p.y);
        ctx.lineTo(sx + 10, p.y - 12);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawParticles(particles: Particle[], camX: number) {
    const ctx = this.ctx;

    for (const pt of particles) {
      const sx = pt.x - camX;
      if (sx < -20 || sx > this.width + 20) continue;

      ctx.save();
      ctx.globalAlpha = pt.alpha;
      ctx.fillStyle = pt.color;

      if (pt.type === 'rain') {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, pt.y);
        ctx.lineTo(sx - 4, pt.y + 10);
        ctx.stroke();
      } else if (pt.type === 'snow') {
        ctx.beginPath();
        ctx.arc(sx, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.type === 'coin') {
        // Golden Mecidiye Coin dropping/spinning
        ctx.fillStyle = '#fbbf24';
        ctx.strokeStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(sx, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(sx, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // --- Kingdom Two Crowns Water Reflection ---

  private drawWaterReflection(camX: number, state: GameState) {
    const ctx = this.ctx;
    const waterY = this.height - 45;

    // Draw Water Strip with subtle displacement wave
    const waterGrad = ctx.createLinearGradient(0, waterY, 0, this.height);
    waterGrad.addColorStop(0, state.dayProgress > 0.55 ? '#090d16' : '#1e3a8a');
    waterGrad.addColorStop(1, state.dayProgress > 0.55 ? '#020617' : '#0f172a');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterY, this.width, 45);

    // Inverted Shimmering Reflections of Standing Stone Monoliths (Kingdom Classic reflection)
    if (state.stoneLetters && state.stoneLetters.length > 0) {
      for (const letter of state.stoneLetters) {
        if (letter.state !== 'standing') continue;
        const sx = letter.x - camX;
        if (sx < -80 || sx > this.width + 80) continue;

        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = '#44403c';
        for (let dy = 0; dy < 38; dy += 4) {
          const waveShift = Math.sin(this.animTimer * 3.5 + dy * 0.4 + letter.x * 0.05) * (2.5 + dy * 0.12);
          ctx.fillRect(sx - 28 + waveShift, waterY + 2 + dy, 56, 2.8);
        }
        ctx.restore();
      }
    }

    // Pixel Ripple Lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = 0; i < 15; i++) {
      const rx = ((i * 85 + this.animTimer * 20 - camX * 0.5) % this.width + this.width) % this.width;
      const ry = waterY + 6 + (i % 4) * 8;
      const len = 12 + (i % 5) * 6;
      ctx.fillRect(rx, ry, len, 1.5);
    }
  }

  // --- Dynamic Lighting Engine ---

  private drawLighting(
    state: GameState,
    commander: PlayerCommander,
    slots: BuildSlot[],
    projectiles: Projectile[],
    particles: Particle[],
    camX: number,
    landingCamps: LandingCamp[] = []
  ) {
    const lCtx = this.lightCtx;
    const ctx = this.ctx;
    const progress = state.dayProgress;

    // Determine ambient night darkness level (Smooth, non-linear Hermite curve for Twilight, Dusk, Midnight, and Dawn)
    let ambientDarkness = 0;
    if (progress <= 0.14) {
      // Dawn break: smoothly lighten from night back to daylight
      const t = progress / 0.14;
      const smooth = t * t * (3 - 2 * t);
      ambientDarkness = 0.74 * (1.0 - smooth);
    } else if (progress > 0.14 && progress <= 0.65) {
      // Clear daylight
      ambientDarkness = 0.0;
    } else if (progress > 0.65 && progress <= 0.84) {
      // Gradual dusk / twilight darkening (Akşamüstü ve Alacakaranlık)
      const t = (progress - 0.65) / 0.19;
      const smooth = t * t * (3 - 2 * t);
      ambientDarkness = smooth * 0.74;
    } else if (progress > 0.84 && progress <= 0.94) {
      // Deep starry Gallipoli battle night (Gece Yarısı)
      ambientDarkness = 0.74;
    } else if (progress > 0.94) {
      // Pre-dawn gradual softening (Sabaha Karşı Fecir)
      const t = (progress - 0.94) / 0.06;
      const smooth = t * t * (3 - 2 * t);
      ambientDarkness = 0.74 * (1.0 - smooth * 0.5);
    }

    if (ambientDarkness <= 0.05 && state.weather !== 'storm' && state.weather !== 'fog') {
      return;
    }

    // Clear lighting canvas with ambient darkness
    lCtx.clearRect(0, 0, this.width, this.height);
    const darkColor = state.weather === 'fog' ? 'rgba(30, 41, 59, 0.60)' : `rgba(3, 7, 18, ${ambientDarkness})`;
    lCtx.fillStyle = darkColor;
    lCtx.fillRect(0, 0, this.width, this.height);

    // Punch out lights with blendMode 'destination-out'
    lCtx.globalCompositeOperation = 'destination-out';

    // 1. Commander Lantern Light
    const cmdSX = commander.x - camX;
    const cmdSY = this.groundY - 30;
    this.punchRadialLight(lCtx, cmdSX, cmdSY, 180, 0.95);

    // 2. Headquarters Campfires, Gas Lanterns and Torches
    for (const slot of slots) {
      const sx = slot.x - camX;
      if (sx < -120 || sx > this.width + 120) continue;

      if (slot.type === 'headquarters') {
        this.punchRadialLight(lCtx, sx, this.groundY - 30, 220, 0.9);
      } else if (slot.type === 'recruit_camp') {
        this.punchRadialLight(lCtx, sx, this.groundY - 20, 160, 0.85);
      } else if (slot.type === 'trench' && slot.level >= 1) {
        this.punchRadialLight(lCtx, sx, this.groundY - 14, 130, 0.85); // Warm Gas Lantern glow
      } else if (slot.type === 'machine_gun' && slot.level >= 1) {
        this.punchRadialLight(lCtx, sx, this.groundY - 14, 120, 0.85);
      } else if (slot.type === 'artillery' && slot.level >= 1) {
        this.punchRadialLight(lCtx, sx, this.groundY - 14, 130, 0.85);
      } else if (slot.type === 'hospital' && slot.level >= 1) {
        this.punchRadialLight(lCtx, sx, this.groundY - 20, 150, 0.9);
      } else if (slot.type === 'armory' && slot.level >= 1) {
        this.punchRadialLight(lCtx, sx, this.groundY - 20, 140, 0.85);
      } else if (slot.type === 'watchtower' && slot.level >= 1) {
        this.punchRadialLight(lCtx, sx, this.groundY - 100, 160, 0.9);
      } else if (slot.type === 'barbed_wire' && slot.level >= 1) {
        this.punchRadialLight(lCtx, sx, this.groundY - 14, 110, 0.8);
      } else if (slot.type === 'shrine_relic') {
        this.punchRadialLight(lCtx, sx, this.groundY - 30, 140, 0.95);
      } else if (slot.type === 'scavenge_wood' && slot.isScavenged) {
        // Cleared forest glade illuminated (Kingdom Two Crowns mechanic)
        this.punchRadialLight(lCtx, sx, this.groundY - 40, 160, 0.65);
      }
    }

    // 2.5 Landing Camp Beachhead Lights
    for (const camp of landingCamps) {
      const sx = camp.x - camX;
      if (sx < -160 || sx > this.width + 160) continue;
      if (!camp.isDestroyed) {
        this.punchRadialLight(lCtx, sx, this.groundY - 24, 180, 0.85);
      } else {
        this.punchRadialLight(lCtx, sx, this.groundY - 20, 140, 0.7); // Smoldering wreck
      }
    }

    // 3. Flares and Projectiles
    for (const p of projectiles) {
      const sx = p.x - camX;
      if (p.type === 'flare') {
        this.punchRadialLight(lCtx, sx, p.y, 280, 0.95);
      } else if (p.type === 'artillery_shell' || p.type === 'naval_shell') {
        this.punchRadialLight(lCtx, sx, p.y, 90, 0.8);
      }
    }

    // 4. Muzzle and Explosion Sparks
    for (const pt of particles) {
      if (pt.type === 'muzzle' || pt.type === 'ember') {
        const sx = pt.x - camX;
        this.punchRadialLight(lCtx, sx, pt.y, 40, 0.6);
      }
    }

    // Reset composite operation & draw lighting buffer onto main canvas
    lCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.lightCanvas, 0, 0);
  }

  private punchRadialLight(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    intensity: number
  ) {
    const grad = ctx.createRadialGradient(x, y, radius * 0.1, x, y, radius);
    grad.addColorStop(0, `rgba(0, 0, 0, ${intensity})`);
    grad.addColorStop(0.5, `rgba(0, 0, 0, ${intensity * 0.6})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Fortification Structural Damage, Burning & Debris Visual FX ---

  private drawFortificationDamageFX(x: number, y: number, slot: BuildSlot, width: number, height: number, hqTier: number = 1) {
    if (!slot || slot.level === 0 || !slot.maxHealth) return;
    const hpRatio = Math.max(0, Math.min(1, slot.health / slot.maxHealth));
    if (hpRatio >= 0.88) return; // Pristine structure

    const ctx = this.ctx;
    ctx.save();

    const isStone = hqTier === 3 || slot.level >= 3;
    const isWood = hqTier === 2 || slot.level === 2;
    const seed = Math.abs(slot.x || 123);

    // 1. Bullet Pockmarks & Black Shrapnel Stains (HP < 0.88)
    const scorchCount = hpRatio < 0.35 ? 7 : (hpRatio < 0.65 ? 4 : 2);
    for (let i = 0; i < scorchCount; i++) {
      const ox = ((seed * (i + 1) * 19) % (width - 14)) - width / 2 + 7;
      const oy = ((seed * (i + 2) * 11) % (height - 6)) - height + 4;
      ctx.fillStyle = 'rgba(24, 24, 27, 0.78)';
      ctx.beginPath();
      ctx.ellipse(x + ox, y + oy, 3 + (i % 3), 2 + (i % 2), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Structural Fragmentation, Splintered Timber & Spilling Sand (HP < 0.65)
    if (hpRatio < 0.65) {
      if (isStone) {
        // Jagged stone fissure cracks
        ctx.strokeStyle = '#09090b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 14, y - height + 4);
        ctx.lineTo(x - 6, y - height * 0.6);
        ctx.lineTo(x - 12, y - height * 0.3);
        ctx.lineTo(x - 2, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 16, y - height + 6);
        ctx.lineTo(x + 9, y - height * 0.5);
        ctx.lineTo(x + 18, y - 2);
        ctx.stroke();
      } else if (isWood) {
        // Split splintered timber fractures
        ctx.fillStyle = '#1c0d02';
        ctx.fillRect(x - 10, y - height + 3, 3.5, height - 6);
        ctx.fillRect(x + 14, y - height + 5, 3, height - 8);
        // Splinters jutting out
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(x - 8, y - height * 0.5);
        ctx.lineTo(x - 15, y - height * 0.5 - 4);
        ctx.lineTo(x - 8, y - height * 0.5 + 3);
        ctx.fill();
      } else {
        // Torn sandbag burlap with spilling golden sand mounds
        ctx.fillStyle = '#d97706'; // Sand spill
        ctx.beginPath();
        ctx.ellipse(x - 16, y - 4, 9, 4.5, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 18, y - 4, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fef08a'; // Sand highlight
        ctx.fillRect(x - 18, y - 5, 5, 2);
        ctx.fillRect(x + 16, y - 5, 6, 2);
        // Dark burlap tear hole
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(x - 17, y - 12, 6, 4.5);
        ctx.fillRect(x + 17, y - 14, 7, 4.5);
      }
    }

    // 3. Heavy Damage: Rising Black Battle Smoke & Glowing Embers / Sparks (HP < 0.38)
    if (hpRatio < 0.38) {
      const time = this.animTimer;
      // Rising dark battlefield smoke puffs
      for (let s = 0; s < 3; s++) {
        const sOffset = s * 1.35;
        const smokeProg = ((time * 1.4 + sOffset) % 2.5) / 2.5;
        const smokeX = x + ((s === 0 ? -14 : (s === 1 ? 16 : 0)) + Math.sin(time * 2 + s) * 6);
        const smokeY = y - height * 0.55 - smokeProg * 28;
        const smokeRadius = 4.5 + smokeProg * 8.5;
        const smokeAlpha = (1 - smokeProg) * 0.58;

        ctx.fillStyle = `rgba(30, 41, 59, ${smokeAlpha})`;
        ctx.beginPath();
        ctx.arc(smokeX, smokeY, smokeRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing red / orange embers & flickering fire sparks
      for (let sp = 0; sp < 4; sp++) {
        const sparkX = x + ((sp * 13) % (width - 14)) - width / 2 + 7 + (Math.sin(time * 7 + sp) * 2.5);
        const sparkY = y - 4 - ((sp * 7) % (height * 0.7)) - (Math.cos(time * 9 + sp) * 2.5);
        ctx.fillStyle = (sp % 2 === 0) ? '#ef4444' : '#f97316';
        ctx.fillRect(sparkX, sparkY, 2.5, 2.5);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(sparkX + 0.5, sparkY + 0.5, 1.2, 1.2);
      }

      // Charred Black Scorched Earth Base
      ctx.fillStyle = 'rgba(9, 9, 11, 0.72)';
      ctx.beginPath();
      ctx.ellipse(x, y - 2, width * 0.45, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Ultra-Realistic Arabian / Ottoman Warhorse Rendering Engine
   * Masterfully sculpted equine musculoskeletal anatomy, multi-pass lighting & ambient coat sheen,
   * anatomical 2-joint articulated leg locomotion (bending knees & hocks),
   * organic silken flowing mane and tail with continuous harmonic wave physics,
   * expressive noble equine eye, velvet muzzle, and detailed Ottoman officer tack.
   */
  private drawRealisticHorse(
    x: number,
    y: number,
    facing: number,
    horseType: 'white' | 'brown' | 'black',
    isMoving: boolean,
    isSprinting: boolean,
    hasSaddle: boolean,
    seed: number = 0,
    opts?: {
      gallopTimer?: number;
    }
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);

    // --- Dynamic Physics, Gait Cadence & Kinematics ---
    const gTimer = opts?.gallopTimer ?? (this.animTimer * (isSprinting ? 9.2 : (isMoving ? 5.8 : 2.2)));
    const breathCycle = Math.sin(this.animTimer * 2.2 + seed);
    
    // Vertical bobbing of torso (Kingdom Two Crowns gait feel):
    // Sprinting: smooth, grounded rhythmic canter bounce
    // Walking: gentle rhythmic stride bounce
    // Idle: subtle noble breathing
    let gallopBob = 0;
    let headNod = 0;
    let bodyPitch = 0;

    if (!isMoving) {
      gallopBob = breathCycle * 0.35;
      headNod = 0;
      bodyPitch = 0;
    } else if (isSprinting) {
      // Gallop: smooth, grounded rhythmic canter bounce (Kingdom Two Crowns style graceful stride)
      const gCycle = gTimer % (Math.PI * 2);
      gallopBob = -Math.sin(gCycle) * 1.5;
      headNod = -Math.sin(gCycle) * 0.7;
      bodyPitch = Math.cos(gCycle) * 0.025;
    } else {
      // Walk / Trot: gentle rhythmic bounce
      gallopBob = Math.sin(gTimer * 2) * 0.5;
      headNod = Math.sin(gTimer * 2 + 0.6) * 0.35;
      bodyPitch = 0;
    }

    // --- Dynamic Color & Material Palettes ---
    let coatBase = '#e2e8f0';
    let coatHighlight = '#ffffff';
    let coatMid = '#cbd5e1';
    let coatShadow = '#94a3b8';
    let coatDark = '#64748b';
    let manePrimary = '#f8fafc';
    let maneSecondary = '#e2e8f0';
    let maneDark = '#94a3b8';
    let muzzleTone = '#94a3b8';
    let muzzlePink = '#fbcfe8';
    let hoofBase = '#334155';
    let hoofHighlight = '#64748b';

    if (horseType === 'brown') {
      // Noble Chestnut / Bay Charger (Yağız Al Savaş Atı)
      coatBase = '#9a3412';
      coatHighlight = '#c2410c';
      coatMid = '#7c2d12';
      coatShadow = '#451a03';
      coatDark = '#291104';
      manePrimary = '#18181b';
      maneSecondary = '#27272a';
      maneDark = '#09090b';
      muzzleTone = '#451a03';
      muzzlePink = '#7c2d12';
      hoofBase = '#1c1917';
      hoofHighlight = '#57534e';
    } else if (horseType === 'black') {
      // Midnight Obsidian Stallion (Karayel Yağız At)
      coatBase = '#24272e';
      coatHighlight = '#3f4452';
      coatMid = '#181a20';
      coatShadow = '#0d0e12';
      coatDark = '#050508';
      manePrimary = '#22252a';
      maneSecondary = '#181a20';
      maneDark = '#09090b';
      muzzleTone = '#181a20';
      muzzlePink = '#2d3139';
      hoofBase = '#0d0e12';
      hoofHighlight = '#334155';
    }

    // 1. Soft Dynamic Contact Ground Shadow
    const shadowWidth = isMoving ? (isSprinting ? 30 + Math.sin(gTimer) * 3 : 26) : 25;
    const shadowAlpha = isMoving ? 0.38 - Math.abs(gallopBob) * 0.03 : 0.40;
    const shadowGrad = ctx.createRadialGradient(0, -1, 2, 0, -1, shadowWidth);
    shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowAlpha})`);
    shadowGrad.addColorStop(0.7, `rgba(0, 0, 0, ${shadowAlpha * 0.4})`);
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, -1, shadowWidth, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Helper: Kingdom Two Crowns Authentic Horse Leg Locomotion & Rendering ---
    const drawKingdomHorseLeg = (
      hipX: number,
      hipY: number,
      phaseOffset: number,
      isHind: boolean,
      isFarSide: boolean
    ) => {
      ctx.save();
      const legBase = isFarSide ? coatShadow : coatMid;
      const legHighlight = isFarSide ? coatMid : coatHighlight;
      const legShade = isFarSide ? coatDark : coatShadow;

      // Shoulder / Hip Root (attached to moving torso)
      const rootX = hipX;
      const rootY = hipY + gallopBob;

      let kneeX = rootX;
      let kneeY = rootY + 10;
      let hoofX = rootX;
      let hoofY = 0; // Ground line baseline is y = 0

      if (!isMoving) {
        // IDLE: Standing firm & proud on ground (y = 0)
        if (isHind) {
          hoofX = rootX + (isFarSide ? 2.5 : -1.0);
          kneeX = rootX - (isFarSide ? 2.0 : 3.5);
          kneeY = rootY + 9.5;
        } else {
          hoofX = rootX + (isFarSide ? -1.5 : 1.5);
          kneeX = rootX + (isFarSide ? 0.5 : 2.0);
          kneeY = rootY + 9.5;
        }
        hoofY = 0;
      } else if (isSprinting) {
        // GALLOP (Kingdom Two Crowns iconic rotary gallop)
        const cycle = (gTimer + phaseOffset) % (Math.PI * 2);
        const leapProgress = cycle / (Math.PI * 2);

        if (isHind) {
          // Gallop Hindlegs:
          // In reach/suspension (leapProgress < 0.5): Kick back smoothly
          // In gather/plant (leapProgress >= 0.5): Coil forward naturally under the belly
          const swing = Math.sin(cycle);
          if (swing > 0) {
            // Extension: kicking back smoothly behind the horse
            hoofX = rootX - 7 - swing * 7;
            hoofY = -1 - swing * 2.2;
            kneeX = rootX - 3 - swing * 3;
            kneeY = rootY + 9 - swing * 0.8;
          } else {
            // Collection: tucking forward under abdomen
            const tuck = -swing;
            hoofX = rootX + tuck * 5;
            hoofY = -tuck * 1.2;
            kneeX = rootX - 1 + tuck * 2.5;
            kneeY = rootY + 8 + tuck * 1.2;
          }
        } else {
          // Gallop Forelegs:
          // In reach (cycle around 0..Math.PI): Extend forward gracefully
          // In plant/recovery: Impact ground and sweep back under chest
          const swing = Math.sin(cycle);
          if (swing > 0) {
            // Reach forward!
            hoofX = rootX + 6 + swing * 7;
            hoofY = -1 - swing * 2.0;
            kneeX = rootX + 3 + swing * 3.5;
            kneeY = rootY + 8 - swing * 0.8;
          } else {
            // Ground strike & sweep back
            const push = -swing;
            hoofX = rootX + 5 - push * 8;
            hoofY = 0; // Striking earth
            kneeX = rootX + 3 - push * 3;
            kneeY = rootY + 10;
          }
        }
      } else {
        // WALK / TROT (Kingdom Two Crowns crisp diagonal gait)
        // Stance phase (0..PI): hoof plants firmly on y = 0 and pushes back smoothly
        // Swing phase (PI..2PI): knee lifts up, leg swings forward cleanly
        const legCycle = (gTimer + phaseOffset) % (Math.PI * 2);
        const strideRange = isHind ? 8.5 : 9.5;

        if (legCycle < Math.PI) {
          // Stance Phase: hoof is planted on ground
          const p = legCycle / Math.PI; // 0 to 1
          hoofX = rootX + (0.5 - p) * strideRange * 2;
          hoofY = 0;
          // Knee flexes naturally
          kneeX = rootX + (isHind ? -2.5 : 1.8);
          kneeY = (rootY + hoofY) * 0.5 - 1.2;
        } else {
          // Swing Phase: leg lifts off ground and reaches forward
          const p = (legCycle - Math.PI) / Math.PI; // 0 to 1
          hoofX = rootX + (-0.5 + p) * strideRange * 2;
          const lift = Math.sin(p * Math.PI) * (isHind ? 5.5 : 6.8);
          hoofY = -lift;
          // Knee lifts forward
          kneeX = rootX + (isHind ? -1.0 + p * 2.5 : 2.5 + Math.sin(p * Math.PI) * 3.5);
          kneeY = rootY + 9 - lift * 0.45;
        }
      }

      // --- 1. Draw Upper Leg (Muscular Thigh / Shoulder) ---
      ctx.fillStyle = legBase;
      ctx.beginPath();
      ctx.moveTo(rootX - 3.2, rootY);
      ctx.lineTo(rootX + 3.2, rootY);
      ctx.lineTo(kneeX + 2.0, kneeY);
      ctx.lineTo(kneeX - 2.0, kneeY);
      ctx.closePath();
      ctx.fill();

      // Thigh / Scapula muscle highlight
      if (!isFarSide) {
        ctx.fillStyle = legHighlight;
        ctx.beginPath();
        ctx.ellipse((rootX + kneeX) * 0.5, (rootY + kneeY) * 0.5, isHind ? 3.2 : 2.6, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- 2. Draw Knee / Hock Joint ---
      ctx.fillStyle = legShade;
      ctx.beginPath();
      if (isHind) {
        // Hock joint: characteristic backward calcaneus point
        ctx.arc(kneeX - 0.6, kneeY, 2.4, 0, Math.PI * 2);
      } else {
        // Front knee joint: smooth rounded carpal joint
        ctx.arc(kneeX + 0.2, kneeY, 2.2, 0, Math.PI * 2);
      }
      ctx.fill();

      // --- 3. Draw Cannon Bone (Lower Leg Shaft) ---
      ctx.fillStyle = legBase;
      ctx.beginPath();
      ctx.moveTo(kneeX - 1.6, kneeY);
      ctx.lineTo(kneeX + 1.6, kneeY);
      ctx.lineTo(hoofX + 1.3, hoofY - 3.5);
      ctx.lineTo(hoofX - 1.3, hoofY - 3.5);
      ctx.closePath();
      ctx.fill();

      // --- 4. Fetlock & Pastern ---
      ctx.fillStyle = legShade;
      ctx.beginPath();
      ctx.arc(hoofX, hoofY - 3.5, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // 45-degree sloping pastern
      ctx.fillStyle = legBase;
      ctx.beginPath();
      ctx.moveTo(hoofX - 1.4, hoofY - 3.5);
      ctx.lineTo(hoofX + 1.4, hoofY - 3.5);
      ctx.lineTo(hoofX + 2.2, hoofY - 1.6);
      ctx.lineTo(hoofX - 1.8, hoofY - 1.6);
      ctx.closePath();
      ctx.fill();

      // --- 5. Solid Keratin Hoof & Iron Horseshoe ---
      ctx.fillStyle = hoofBase;
      ctx.beginPath();
      ctx.moveTo(hoofX - 2.8, hoofY - 1.8);
      ctx.lineTo(hoofX + 2.6, hoofY - 1.8);
      ctx.lineTo(hoofX + 3.0, hoofY);
      ctx.lineTo(hoofX - 3.2, hoofY);
      ctx.closePath();
      ctx.fill();

      // Steel Horseshoe Rim
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(hoofX - 3.2, hoofY - 0.8, 6.2, 0.8);
      if (!isFarSide) {
        ctx.fillStyle = hoofHighlight;
        ctx.fillRect(hoofX + 0.8, hoofY - 1.5, 1.2, 0.9);
      }

      ctx.restore();
    };

    // 2. Render Far-Side (Background) Legs with Depth Shading
    // Kingdom Two Crowns diagonal trot & rotary gallop phases
    const farHindPhase = isSprinting ? 0.4 : 0.15;
    const farForePhase = isSprinting ? 0.5 : Math.PI;
    drawKingdomHorseLeg(-13, -19, farHindPhase, true, true);
    drawKingdomHorseLeg(13, -19, farForePhase, false, true);

    // 3. Natural, Aesthetic Equine Tail (Görsel Modellemeye Tam Uyumlu Doğal At Kuyruğu)
    // Anchors cleanly to the croup dock at (-17, -24 + gallopBob)
    ctx.save();
    const tailRootX = -17;
    const tailRootY = -24 + gallopBob;

    // Muscular dock base
    ctx.fillStyle = coatMid;
    ctx.beginPath();
    ctx.moveTo(tailRootX, tailRootY - 2.5);
    ctx.lineTo(tailRootX - 3.2, tailRootY + (isSprinting ? -1.0 : 0.5));
    ctx.lineTo(tailRootX - 1.5, tailRootY + 3.0);
    ctx.lineTo(tailRootX + 1.0, tailRootY + 1.5);
    ctx.closePath();
    ctx.fill();

    if (isSprinting) {
      // --- GALLOP / SPRINT TAIL (Kingdom Two Crowns: Raised high, streaming horizontally behind!) ---
      const tailWave = Math.sin(gTimer * 1.5) * 2.2;
      const tailWave2 = Math.cos(gTimer * 1.5) * 1.5;

      const tipX = tailRootX - 21;
      const tipY = tailRootY + 2 + tailWave;
      const midX = tailRootX - 11;
      const midY = tailRootY - 2 + tailWave2;

      // Layer 1: Dark base silhouette & under-shadow
      ctx.fillStyle = maneDark;
      ctx.beginPath();
      ctx.moveTo(tailRootX - 1, tailRootY - 2);
      ctx.quadraticCurveTo(midX, midY - 3.5, tipX, tipY);
      ctx.lineTo(tipX + 2, tipY + 1.5);
      ctx.quadraticCurveTo(midX + 2, midY + 3.5, tailRootX - 1, tailRootY + 2.5);
      ctx.closePath();
      ctx.fill();

      // Layer 2: Rich midtone flowing horsehair body
      ctx.fillStyle = maneSecondary;
      ctx.beginPath();
      ctx.moveTo(tailRootX - 1.5, tailRootY - 1.2);
      ctx.quadraticCurveTo(midX, midY - 2.0, tipX - 1, tipY);
      ctx.quadraticCurveTo(midX + 1, midY + 2.0, tailRootX - 1.5, tailRootY + 1.8);
      ctx.closePath();
      ctx.fill();

      // Layer 3: Top wind-swept highlight hair locks
      ctx.fillStyle = manePrimary;
      ctx.beginPath();
      ctx.moveTo(tailRootX - 1.5, tailRootY - 1.8);
      ctx.quadraticCurveTo(midX, midY - 2.8, tipX - 4, tipY - 0.5);
      ctx.lineTo(tipX - 6, tipY);
      ctx.quadraticCurveTo(midX - 1, midY - 0.5, tailRootX - 1.5, tailRootY);
      ctx.closePath();
      ctx.fill();
    } else {
      // --- IDLE / WALK TAIL (Natural, elegant drape flowing down gracefully along the rump) ---
      const tailSway = isMoving ? Math.sin(gTimer) * 2.2 : (Math.sin(this.animTimer * 2.0 + seed) * 0.7);

      const tipX = tailRootX - 2 + tailSway;
      const tipY = tailRootY + 21;
      const midX = tailRootX - 4.5 + tailSway * 0.5;
      const midY = tailRootY + 11;

      // Layer 1: Dark base silhouette (depth & form)
      ctx.fillStyle = maneDark;
      ctx.beginPath();
      ctx.moveTo(tailRootX - 1, tailRootY - 1.5);
      ctx.quadraticCurveTo(midX - 3.2, midY, tipX, tipY);
      ctx.lineTo(tipX + 1.8, tipY - 1);
      ctx.quadraticCurveTo(midX + 3.2, midY, tailRootX + 1.5, tailRootY + 1.5);
      ctx.closePath();
      ctx.fill();

      // Layer 2: Lush midtone horsehair body
      ctx.fillStyle = maneSecondary;
      ctx.beginPath();
      ctx.moveTo(tailRootX - 0.8, tailRootY - 0.8);
      ctx.quadraticCurveTo(midX - 2.0, midY, tipX - 0.3, tipY - 1);
      ctx.quadraticCurveTo(midX + 1.8, midY, tailRootX + 1.0, tailRootY + 1.0);
      ctx.closePath();
      ctx.fill();

      // Layer 3: Fine ambient highlight streak along outer curve
      ctx.fillStyle = manePrimary;
      ctx.beginPath();
      ctx.moveTo(tailRootX - 1.2, tailRootY);
      ctx.quadraticCurveTo(midX - 2.4, midY - 2, tipX - 0.5, tipY - 5);
      ctx.lineTo(tipX + 0.2, tipY - 5);
      ctx.quadraticCurveTo(midX - 1.0, midY - 2, tailRootX - 0.2, tailRootY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 4. Masterfully Sculpted Torso, Flanks, Girth & Haunches
    ctx.save();
    if (bodyPitch !== 0) ctx.rotate(bodyPitch);

    // Torso Lighting Gradient: Highlight on upper topline down to shadow underbelly
    const torsoGrad = ctx.createLinearGradient(-16, -34 + gallopBob, 16, -12 + gallopBob);
    torsoGrad.addColorStop(0, coatHighlight);
    torsoGrad.addColorStop(0.35, coatBase);
    torsoGrad.addColorStop(0.75, coatMid);
    torsoGrad.addColorStop(1, coatShadow);

    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    // Anatomical topline: prominent withers, spine dip, muscular croup, athletic flank tuck, deep ribcage
    ctx.moveTo(13, -28 + gallopBob); // Withers
    ctx.quadraticCurveTo(0, -29 + gallopBob, -14, -28 + gallopBob); // Back / Spine
    ctx.quadraticCurveTo(-22, -27 + gallopBob, -20, -18 + gallopBob); // Muscular Croup / Haunch
    ctx.quadraticCurveTo(-18, -12 + gallopBob, -10, -14 + gallopBob); // Flank / Stifle fold
    ctx.quadraticCurveTo(0, -12 + gallopBob, 10, -16 + gallopBob); // Deep barrel / Girth
    ctx.quadraticCurveTo(18, -18 + gallopBob, 16, -26 + gallopBob); // Muscular Chest & Shoulder
    ctx.closePath();
    ctx.fill();

    // Defined Muscular Scapula (Omuz Kası / Kürek Kemiği Kabartması)
    ctx.fillStyle = coatHighlight;
    ctx.beginPath();
    ctx.ellipse(12, -24 + gallopBob, 7.5, 6.0, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Defined Muscular Croup & Haunch (Sağrı / Arka Kas Yapısı)
    ctx.fillStyle = coatBase;
    ctx.beginPath();
    ctx.ellipse(-14, -23 + gallopBob, 8.5, 7.5, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Underbelly Depth Shading (Karın Altı Gölgelendirmesi)
    ctx.fillStyle = coatShadow;
    ctx.beginPath();
    ctx.ellipse(0, -14 + gallopBob, 14, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 5. Render Near-Side (Foreground) Legs with High Detail & Shading
    const nearHindPhase = isSprinting ? 0 : Math.PI + 0.15;
    const nearForePhase = 0;
    drawKingdomHorseLeg(-13, -19, nearHindPhase, true, false);
    drawKingdomHorseLeg(13, -19, nearForePhase, false, false);

    // 6. Proud, Arched Muscular Neck, Silken Mane & Sculpted Arabian Head
    const headBob = gallopBob + headNod;

    // Muscular Arched Neck with Volumetric Light Gradient
    const neckGrad = ctx.createLinearGradient(6, -25 + gallopBob, 22, -44 + headBob);
    neckGrad.addColorStop(0, coatBase);
    neckGrad.addColorStop(0.5, coatHighlight);
    neckGrad.addColorStop(1, coatMid);

    ctx.fillStyle = neckGrad;
    ctx.beginPath();
    ctx.moveTo(7, -26 + gallopBob); // Base of withers
    ctx.quadraticCurveTo(10, -38 + headBob, 19, -44 + headBob); // Muscular Arched Crest (Boyun Sırtı)
    ctx.lineTo(25, -40 + headBob); // Throatlatch & Jaw connection
    ctx.quadraticCurveTo(18, -30 + headBob, 16, -17 + gallopBob); // Lower neck / Trachea
    ctx.quadraticCurveTo(10, -21 + gallopBob, 7, -26 + gallopBob);
    ctx.closePath();
    ctx.fill();

    // Layered Silken Mane along the Crest (Katmanlı İpeksi Yele)
    // Dynamic mane flutter when moving
    const maneFlutter = isMoving ? Math.sin(gTimer * 1.2) * (isSprinting ? 2.8 : 1.4) : Math.sin(this.animTimer * 2.2) * 0.8;

    // Mane shadow layer
    ctx.fillStyle = maneDark;
    ctx.beginPath();
    ctx.moveTo(5, -28 + gallopBob);
    ctx.quadraticCurveTo(9 - maneFlutter, -40 + headBob, 18, -46 + headBob);
    ctx.lineTo(15, -41 + headBob);
    ctx.quadraticCurveTo(8 - maneFlutter, -34 + headBob, 12, -22 + gallopBob);
    ctx.closePath();
    ctx.fill();

    // Mane main flowing locks
    ctx.fillStyle = maneSecondary;
    ctx.beginPath();
    ctx.moveTo(4, -27 + gallopBob);
    ctx.quadraticCurveTo(8 - maneFlutter * 0.8, -38 + headBob, 17, -45 + headBob);
    ctx.lineTo(13, -39 + headBob);
    ctx.quadraticCurveTo(7 - maneFlutter * 0.8, -32 + headBob, 10, -21 + gallopBob);
    ctx.closePath();
    ctx.fill();

    // Mane top fine highlight strands
    ctx.fillStyle = manePrimary;
    ctx.beginPath();
    ctx.moveTo(5, -29 + gallopBob);
    ctx.quadraticCurveTo(10 - maneFlutter * 0.6, -41 + headBob, 18, -46 + headBob);
    ctx.lineTo(17, -43 + headBob);
    ctx.quadraticCurveTo(11 - maneFlutter * 0.6, -37 + headBob, 8, -27 + gallopBob);
    ctx.closePath();
    ctx.fill();

    // Forelock (Alın Yelesi)
    ctx.fillStyle = manePrimary;
    ctx.beginPath();
    ctx.moveTo(17, -45 + headBob);
    ctx.quadraticCurveTo(22, -44 + headBob, 20, -39 + headBob);
    ctx.lineTo(18, -42 + headBob);
    ctx.closePath();
    ctx.fill();

    // Sculpted Head: Jowl / Ganashe & Zygomatic Ridge (Asil Çene & Yanak Kemeri)
    ctx.fillStyle = coatHighlight;
    ctx.beginPath();
    ctx.ellipse(20.5, -38.5 + headBob, 5.8, 4.6, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Sculpted Tapering Muzzle & Forehead (Kavisli Alın ve Burun Kemiği)
    ctx.fillStyle = coatBase;
    ctx.beginPath();
    ctx.moveTo(18, -43 + headBob); // Forehead / Poll
    ctx.quadraticCurveTo(24, -39 + headBob, 29, -32 + headBob); // Nasal bridge
    ctx.lineTo(27, -27 + headBob); // Chin pad
    ctx.quadraticCurveTo(22, -31 + headBob, 19, -34 + headBob); // Lower jaw line
    ctx.closePath();
    ctx.fill();

    // Soft Velvet Muzzle (Kadife Burun ve Dudak Geçişi)
    ctx.fillStyle = muzzleTone;
    ctx.beginPath();
    ctx.moveTo(26, -34 + headBob);
    ctx.lineTo(30, -32 + headBob);
    ctx.lineTo(28.5, -28 + headBob);
    ctx.lineTo(25, -29.5 + headBob);
    ctx.closePath();
    ctx.fill();

    // Pinkish soft muzzle highlight
    ctx.fillStyle = muzzlePink;
    ctx.fillRect(27.5, -31.5 + headBob, 2.0, 2.0);

    // Flared Anatomical Nostril (Burun Deliği)
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(28.2, -30.5 + headBob, 1.4, 1.0, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Ultra-Realistic Equine Eye (Gerçekçi Derin At Gözü)
    // Dark outer eyelid contour
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.ellipse(20, -40 + headBob, 2.2, 1.6, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Deep warm iris & horizontal pupil
    ctx.fillStyle = horseType === 'white' ? '#451a03' : '#1c1917';
    ctx.beginPath();
    ctx.arc(20, -40 + headBob, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Dual Specular Glints (Göz Işıltısı)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20.3, -40.6 + headBob, 0.7, 0.7);
    ctx.fillRect(19.4, -39.8 + headBob, 0.4, 0.4);

    // Finely Modeled Alert Ears (Dik Uyanık Kulaklar)
    ctx.save();
    ctx.translate(16, -43 + headBob);
    ctx.rotate(isMoving ? -0.08 : 0);

    // Far ear
    ctx.fillStyle = coatShadow;
    ctx.beginPath();
    ctx.moveTo(-1, 0);
    ctx.lineTo(0.5, -6.5);
    ctx.lineTo(2.2, 0);
    ctx.closePath();
    ctx.fill();

    // Near ear with realistic pink cartilage lining
    ctx.fillStyle = coatBase;
    ctx.beginPath();
    ctx.moveTo(1, 0);
    ctx.lineTo(2.8, -7.0);
    ctx.lineTo(4.5, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = muzzlePink;
    ctx.fillRect(2.2, -5.5, 1.0, 4.0);
    ctx.restore();

    // 7. Masterpiece Ottoman Embroidered Shabraque & Crimson Saddle (Tarihi Subay Eyeri & Sırmalı Şabrak)
    if (hasSaddle) {
      // Historical Cavalry Leather Bridle & Headstall (Deri Başlık, Burunluk ve Gem Halkası)
      ctx.strokeStyle = '#451a03'; // Dark brown harness leather
      ctx.lineWidth = 1.1;

      // Cheekpiece & Crownpiece (Yanak ve Tepe Kayışı)
      ctx.beginPath();
      ctx.moveTo(17, -42 + headBob); // Crown behind ears
      ctx.lineTo(26, -30 + headBob); // Down to bit ring
      ctx.stroke();

      // Browband (Alınlık)
      ctx.beginPath();
      ctx.moveTo(16, -41 + headBob);
      ctx.lineTo(21, -40 + headBob);
      ctx.stroke();

      // Noseband / Cavesson (Burun Kayışı)
      ctx.beginPath();
      ctx.moveTo(23, -34 + headBob);
      ctx.lineTo(25, -31 + headBob);
      ctx.stroke();

      // Polished Brass Bit Ring (Pirinç Gem Halkası)
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(26.5, -29.5 + headBob, 1.8, 0, Math.PI * 2);
      ctx.stroke();

      // Ottoman Crimson Wool Shabraque (Sırmalı Çuha Eyer Örtüsü)
      ctx.fillStyle = '#881337'; // Deep Ottoman imperial crimson
      ctx.beginPath();
      ctx.roundRect(-10, -31 + gallopBob, 20, 10, 2);
      ctx.fill();

      // Gold bullion embroidered borders & palmette details
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-10, -22 + gallopBob, 20, 2); // Gold bullion fringe
      ctx.fillRect(-9, -30 + gallopBob, 2, 8); // Gold trim border
      ctx.fillRect(7, -30 + gallopBob, 2, 8);

      // Gold Ottoman Star/Crescent Crest on Saddle Pad
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(6, -26 + gallopBob, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Ergonomic English/Ottoman Cavalry Leather Saddle
      ctx.fillStyle = '#451a03'; // Rich dark saddle leather
      ctx.beginPath();
      ctx.moveTo(-8, -32 + gallopBob);
      ctx.quadraticCurveTo(-1, -36 + gallopBob, 6, -32 + gallopBob); // Cantle to pommel curve
      ctx.lineTo(7, -29 + gallopBob);
      ctx.lineTo(-9, -29 + gallopBob);
      ctx.closePath();
      ctx.fill();

      // Saddle Girth Strap (Kolon Kayışı)
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-1, -28 + gallopBob, 2.5, 14);

      // Polished Brass Stirrup & Leather Stirrup Leather (Pirinç Üzengi & Meşin Kayış)
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-1.5, -29 + gallopBob, 1.2, 10.5);
      ctx.fillStyle = '#eab308'; // Polished brass stirrup iron
      ctx.fillRect(-3, -19 + gallopBob, 4.2, 4.5);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-2, -18 + gallopBob, 2.2, 2.5); // Stirrup foot opening
    }

    ctx.restore();
  }

  // --- UI Helpers & Floating Texts ---

  private drawHealthBar(x: number, y: number, current: number, max: number, color = '#22c55e') {
    if (max <= 0) return;
    const ctx = this.ctx;
    const barWidth = 32;
    const barHeight = 3;
    const pct = Math.max(0, Math.min(1, current / max));

    // Outer dark border & shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(x - barWidth / 2 - 1, y - 1, barWidth + 2, barHeight + 2);

    // Empty dark background
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);

    // Current health fill
    ctx.fillStyle = color;
    ctx.fillRect(x - barWidth / 2, y, barWidth * pct, barHeight);

    // Subtle highlight on top edge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(x - barWidth / 2, y, barWidth * pct, 1);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private drawFloatingTexts(texts: FloatingText[], camX: number) {
    // Pure visual feedback without floating numbers or gain/loss text popups
    return;
  }
}
