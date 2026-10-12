/**
 * Çanakkale 1915: Siper Savunması - Core Game Engine & Simulation Loop
 */

import { soundEngine } from '../audio/soundEngine';
import { CAMPAIGN_LEVELS } from '../data/levels';
import { hasCompletedInGameTutorial, setCompletedInGameTutorial } from '../utils/storage';
import {
  AnimalType,
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
  SeasonType,
  SlotType,
  Soldier,
  StoneLetter,
  WeatherType,
  WildAnimal
} from '../types/game';

export class GameEngine {
  public state: GameState;
  public commander: PlayerCommander;
  public slots: BuildSlot[] = [];
  public soldiers: Soldier[] = [];
  public enemies: Enemy[] = [];
  public animals: WildAnimal[] = [];
  public landingCamps: LandingCamp[] = [];
  public fieldArtilleries: FieldArtillery[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public groundCoins: GroundCoin[] = [];
  
  public activeSlotNearCommander: BuildSlot | null = null;
  public isHoldingInteract: boolean = false;
  private interactHoldTimer: number = 0;
  public viewWidth: number = 1200;
  private prevTimePhase: string = 'dawn';
  public totalGameTime: number = 0;
  
  private lastTime: number = 0;
  private spawnTimer: number = 0;
  private nightWavesSpawnedCount: number = 0;
  private maxNightWaves: number = 2;
  private animalSpawnTimer: number = 0;
  private assignmentCheckTimer: number = 0;
  private weatherTimer: number = 0;
  private targetWeatherIntensity: number = 0;
  private gallopCadenceTimer: number = 0;
  private soldierIdCounter: number = 1;
  private enemyIdCounter: number = 1;
  private animalIdCounter: number = 1;
  private projIdCounter: number = 1;
  private coinIdCounter: number = 1;
  private artIdCounter: number = 1;
  private lastRadioDay: number = 0;
  private plannedNightWave: { flank: 'left' | 'right' | 'both'; squadSize: number; hasHeavyUnits: boolean; text: string } | null = null;

  constructor(levelIndex: number = 0, carriedOverSoldiers?: Array<{ role: Soldier['role']; name?: string }>) {
    const levelConfig = CAMPAIGN_LEVELS[levelIndex] || CAMPAIGN_LEVELS[0];
    
    this.state = {
      level: levelConfig,
      dayNumber: 1,
      dayProgress: 0.05, // Start at dawn
      timePhase: 'dawn',
      season: 'spring',
      weather: 'clear',
      weatherIntensity: 0,
      isGameOver: false,
      isVictory: false,
      isPaused: false,
      hqHealth: 500,
      maxHqHealth: 500,
      score: 0,
      enemiesDefeated: 0,
      daysSurvived: 0,
      totalMecidiyeEarned: levelConfig.startingMecidiye,
      relicsCollected: [],
      cameraX: Math.max(0, (levelIndex === 0 ? (levelConfig.worldWidth / 2 - 1750) : levelConfig.worldWidth / 2) - 550),
      speedMultiplier: 1,
      radioIntercept: {
        isActive: false,
        targetFrequency: 720,
        currentFrequency: 450,
        signalStrength: 0,
        isDecoded: false,
        isOpenUI: false,
        morseTimer: 0,
      },
    };

    const isChapterOne = levelIndex === 0;
    const hqX = levelConfig.worldWidth / 2;
    if (isChapterOne) {
      this.state.inGameTutorial = {
        enabled: true,
        step: 'goto_hq',
        stepTimer: 0,
        isStepCompleted: false,
        fadeAlpha: 1,
        targetX: hqX,
      };
    }
    // In Chapter 1, commander starts far away in the deep pine forest on the left flank (1750px away from HQ)
    // as requested ("karargahtan uzakta ormanın içinde başlasın ilk bölüm")
    const spawnX = isChapterOne ? (hqX - 1750) : hqX;

    this.commander = {
      x: spawnX,
      y: 440,
      vx: 0,
      facing: 1, // Facing towards the camp / HQ
      isMounted: true,
      health: 5,
      maxHealth: 5,
      horseHealth: 5,
      maxHorseHealth: 5,
      stamina: 100,
      maxStamina: 100,
      isSprinting: false,
      state: 'idle',
      mecidiye: 0, // Starts with 0 coins in purse; 5-6 starting coins placed on the ground near HQ
      maxMecidiye: 30,
      invulnerableTimer: 0,
      whistleCooldown: 0,
      specialAbilityCharge: 20,
      lanternLit: false,
      activeBuff: null,
      buffTimer: 0,
      targetDestinationX: null,
      targetSlotId: null,
      hoverInteractTimer: 0,
      sprintLockout: false,
      retinueSoldierIds: [],
    };

    const leftCampX = 180;
    const rightCampX = levelConfig.worldWidth - 180;
    const campHealth = 2600 + levelIndex * 400; // More durable historical invasion ships (user request)
    this.landingCamps = [
      {
        id: 'landing_camp_left',
        side: 'left',
        x: leftCampX,
        health: campHealth,
        maxHealth: campHealth,
        isDestroyed: false,
        nameTr: 'İtilaf Sol Sahil Çıkartma Mavnası',
      },
      {
        id: 'landing_camp_right',
        side: 'right',
        x: rightCampX,
        health: campHealth,
        maxHealth: campHealth,
        isDestroyed: false,
        nameTr: 'İtilaf Sağ Sahil Çıkartma Mavnası',
      },
    ];
    this.state.landingCamps = this.landingCamps;
    this.state.fieldArtilleries = this.fieldArtilleries;

    this.initLevelSlots(levelConfig);
    this.initStartingTroops(carriedOverSoldiers);
    this.initWildAnimals(levelConfig);
    this.initStoneTitle(levelIndex);

    // Initial Starting Coins placed scattered on the ground near HQ (ready for pickup)
    const totalStartCoins = isChapterOne ? 8 : Math.max(6, levelConfig.startingMecidiye || (6 + levelIndex * 2));
    for (let i = 0; i < totalStartCoins; i++) {
      const scatterOffset = -90 + (i / (Math.max(1, totalStartCoins - 1))) * 180 + (Math.random() - 0.5) * 18;
      this.groundCoins.push({
        id: `coin_${this.coinIdCounter++}`,
        x: hqX + scatterOffset,
        y: 440,
        vx: 0,
        vy: 0,
        bounceCount: 0,
        life: 300,
        pickupDelay: 0.1, // Ready for pickup when arriving at HQ
      });
    }
  }

  public recruitRetinueSoldier() {
    const isNight = this.state.timePhase === 'night' || this.state.timePhase === 'midnight';
    if (isNight) {
      this.addFloatingText(this.commander.x, 380, 'Gece taarruz varken hücum kıtası toplanamaz!', '#ef4444');
      return;
    }

    const currentRetinue = this.soldiers.filter((s) => s.isRetinue);
    if (currentRetinue.length >= 6) {
      this.addFloatingText(this.commander.x, 380, 'Hücum Kıtası Dolu (Maksimum 6 Nefer)', '#f59e0b');
      return;
    }

    // Find candidate soldier: unassigned recruit or idle soldier, or engineer
    let candidate = this.soldiers.find((s) => !s.assignedSlotId && !s.isRetinue && s.health > 0);
    if (!candidate) {
      const hqX = this.state.level.worldWidth / 2;
      if (Math.abs(this.commander.x - hqX) < 220 && this.commander.mecidiye >= 1) {
        this.commander.mecidiye -= 1;
        soundEngine.playCoinPay();
        candidate = this.spawnSoldier('recruit', this.commander.x + 20, null);
      } else {
        this.addFloatingText(this.commander.x, 380, 'Boşta asker yok! Karargah yakınında sevk et veya iskeleden çağır.', '#ef4444');
        return;
      }
    }

    candidate.isRetinue = true;
    candidate.role = 'infantry';
    candidate.assignedSlotId = null;
    candidate.maxAmmoInClip = 5;
    candidate.ammoInClip = 5;
    candidate.speed = 1.35;
    if (!this.commander.retinueSoldierIds) this.commander.retinueSoldierIds = [];
    if (!this.commander.retinueSoldierIds.includes(candidate.id)) {
      this.commander.retinueSoldierIds.push(candidate.id);
    }

    soundEngine.playWhistle();
    const total = currentRetinue.length + 1;
    this.addFloatingText(this.commander.x, 340, `⚔️ Hücum Kıtasına Katıldı! (${total}/6 Nefer)`, '#22c55e');
  }

  public setViewport(width: number, _height: number = 600) {
    this.viewWidth = Math.max(800, width);
  }

  // --- Initialization ---

  private initLevelSlots(level: typeof CAMPAIGN_LEVELS[0]) {
    const w = level.worldWidth;
    const hqX = w / 2;
    this.slots = [];

    // Spacing scale: comfortable, natural distances expanding moderately per chapter difficulty
    const lvlSpacing = 1.0 + (level.id - 1) * 0.15;
    const hospX = hqX - Math.round(220 * lvlSpacing);
    const armoryX = hqX + Math.round(220 * lvlSpacing);
    const inTrenchOff = Math.round(480 * lvlSpacing);
    const inWireOff = Math.round(600 * lvlSpacing);
    const mgOff = Math.round(860 * lvlSpacing);
    const midWireOff = Math.round(980 * lvlSpacing);
    const artWorkOff = Math.round(1200 * lvlSpacing);
    const artOff = Math.round(1450 * lvlSpacing);
    const outTrenchOff = Math.round(1720 * lvlSpacing);
    const outWireOff = Math.round(1860 * lvlSpacing);
    const towerOff = Math.round(2140 * lvlSpacing);

    // 1. Headquarters (Karargah & Campfire) in center
    this.slots.push({
      id: 'hq_main',
      x: hqX,
      type: 'headquarters',
      level: 1,
      maxLevel: 3,
      health: 500,
      maxHealth: 500,
      side: 'center',
      costMecidiye: 4,
      upgradeDescription: 'Karargahı Ahşap Tahkimata Yükselt (4 Sikke)',
      titleTr: 'Karargah Kumanda Çadırı',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    // 1.1 Left and Right Assault Banners (Active when HQ reaches Level 3 Fortress)
    this.slots.push({
      id: 'hq_assault_left',
      x: hqX - 85,
      type: 'assault_banner',
      level: 0,
      maxLevel: 1,
      health: 400,
      maxHealth: 400,
      side: 'left',
      costMecidiye: 4,
      upgradeDescription: 'Sol Sahile Hücum Taburu Akıncısı Donat (4 Sikke -> Azami 4 Nefer)',
      titleTr: 'Sol Taarruz Sancağı',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    this.slots.push({
      id: 'hq_assault_right',
      x: hqX + 85,
      type: 'assault_banner',
      level: 0,
      maxLevel: 1,
      health: 400,
      maxHealth: 400,
      side: 'right',
      costMecidiye: 4,
      upgradeDescription: 'Sağ Sahile Hücum Taburu Akıncısı Donat (4 Sikke -> Azami 4 Nefer)',
      titleTr: 'Sağ Taarruz Sancağı',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    // 2. Base Amenities (Hilal-i Ahmer Hospital & Central Armory)
    this.slots.push({
      id: 'hospital_main',
      x: hospX,
      type: 'hospital',
      level: 1,
      maxLevel: 2,
      health: 300,
      maxHealth: 300,
      side: 'left',
      costMecidiye: 3,
      upgradeDescription: 'Hilal-i Ahmer Hastane Çadırını Büyüt (3 Sikke)',
      titleTr: 'Hilal-i Ahmer Sahra Hastanesi',
      assignedSoldierIds: [],
      maxSoldiers: 1,
    });

    this.slots.push({
      id: 'armory_main',
      x: armoryX,
      type: 'armory',
      level: 1,
      maxLevel: 1,
      health: 300,
      maxHealth: 300,
      side: 'right',
      costMecidiye: 2,
      upgradeDescription: 'Mauser Tüfeği Bırak (2 Sikke -> Tezgaha 1 Tüfek, Maks 6)',
      titleTr: 'Cephanelik & Tüfek Tezgahı',
      assignedSoldierIds: [],
      maxSoldiers: 0,
      availableRifles: 0,
      maxRifles: 6,
    });

    // 3. Inner Defensive Line (Chapter 1 starts unbuilt for tutorial, later chapters start fortified)
    const isCh1 = level.id === 1;
    this.slots.push({
      id: 'trench_0',
      x: hqX - inTrenchOff,
      type: 'trench',
      level: isCh1 ? 0 : 1,
      maxLevel: 3,
      health: isCh1 ? 0 : 300,
      maxHealth: 300,
      side: 'left',
      costMecidiye: isCh1 ? 2 : 3,
      upgradeDescription: isCh1 ? 'Sv. 1 Siper Kaz ve Tahkim Et (2 Sikke)' : 'Sv. 2 Ahşap Kütük Siperini İnşa Et (3 Sikke)',
      titleTr: isCh1 ? 'Boş Siper Mevzisi' : 'Sv. 1 Kum Torbası Siperi',
      assignedSoldierIds: [],
      maxSoldiers: isCh1 ? 0 : 2,
    });

    this.slots.push({
      id: 'trench_1',
      x: hqX + inTrenchOff,
      type: 'trench',
      level: isCh1 ? 0 : 1,
      maxLevel: 3,
      health: isCh1 ? 0 : 300,
      maxHealth: 300,
      side: 'right',
      costMecidiye: isCh1 ? 2 : 3,
      upgradeDescription: isCh1 ? 'Sv. 1 Siper Kaz ve Tahkim Et (2 Sikke)' : 'Sv. 2 Ahşap Kütük Siperini İnşa Et (3 Sikke)',
      titleTr: isCh1 ? 'Boş Siper Mevzisi' : 'Sv. 1 Kum Torbası Siperi',
      assignedSoldierIds: [],
      maxSoldiers: isCh1 ? 0 : 2,
    });

    // Dikenli Tel & Kazık Engelleri (Chapter 1 starts unbuilt for tutorial)
    this.slots.push({
      id: 'wire_0',
      x: hqX - inWireOff,
      type: 'barbed_wire',
      level: isCh1 ? 0 : 1,
      maxLevel: 4,
      health: isCh1 ? 0 : 200,
      maxHealth: 200,
      side: 'left',
      costMecidiye: isCh1 ? 2 : 3,
      upgradeDescription: isCh1 ? 'Sv. 1 Dikenli Tel ve Kazık Engeli Kur (2 Sikke)' : 'Sv. 2 İspanyol Süvarisi Çapraz Kazıklar & Tel Engeli (3 Sikke)',
      titleTr: isCh1 ? 'Tel ve Engel Mevzisi' : 'Sv. 1 Dikenli Tel & Kazık Engeli',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    this.slots.push({
      id: 'wire_1',
      x: hqX + inWireOff,
      type: 'barbed_wire',
      level: isCh1 ? 0 : 1,
      maxLevel: 4,
      health: isCh1 ? 0 : 200,
      maxHealth: 200,
      side: 'right',
      costMecidiye: isCh1 ? 2 : 3,
      upgradeDescription: isCh1 ? 'Sv. 1 Dikenli Tel ve Kazık Engeli Kur (2 Sikke)' : 'Sv. 2 İspanyol Süvarisi Çapraz Kazıklar & Tel Engeli (3 Sikke)',
      titleTr: isCh1 ? 'Tel ve Engel Mevzisi' : 'Sv. 1 Dikenli Tel & Kazık Engeli',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    // 4. Mid Defensive Line (Machine Gun Nests & Mid Wire)
    this.slots.push({
      id: 'mg_0',
      x: hqX - mgOff,
      type: 'machine_gun',
      level: 0,
      maxLevel: 3,
      health: 350,
      maxHealth: 350,
      side: 'left',
      costMecidiye: 3,
      upgradeDescription: 'Sv. 1 Maxim Makineli Tüfek Mevzisi Kur (3 Sikke)',
      titleTr: 'Makineli Tüfek Koruganı',
      assignedSoldierIds: [],
      maxSoldiers: 1,
    });

    this.slots.push({
      id: 'mg_1',
      x: hqX + mgOff,
      type: 'machine_gun',
      level: 0,
      maxLevel: 3,
      health: 350,
      maxHealth: 350,
      side: 'right',
      costMecidiye: 3,
      upgradeDescription: 'Sv. 1 Maxim Makineli Tüfek Mevzisi Kur (3 Sikke)',
      titleTr: 'Makineli Tüfek Koruganı',
      assignedSoldierIds: [],
      maxSoldiers: 1,
    });

    this.slots.push({
      id: 'wire_2',
      x: hqX - midWireOff,
      type: 'barbed_wire',
      level: 0,
      maxLevel: 4,
      health: 200,
      maxHealth: 200,
      side: 'left',
      costMecidiye: 2,
      upgradeDescription: 'Orta Hat Dikenli Tel Engeli Kur (2 Sikke)',
      titleTr: 'Dikenli Tel & Kazık Engeli',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    this.slots.push({
      id: 'wire_3',
      x: hqX + midWireOff,
      type: 'barbed_wire',
      level: 0,
      maxLevel: 4,
      health: 200,
      maxHealth: 200,
      side: 'right',
      costMecidiye: 2,
      upgradeDescription: 'Orta Hat Dikenli Tel Engeli Kur (2 Sikke)',
      titleTr: 'Dikenli Tel & Kazık Engeli',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    // 4b. Sahra Topçu Atölyesi
    this.slots.push({
      id: 'artillery_workshop_left',
      x: hqX - artWorkOff,
      type: 'artillery_workshop',
      level: 0,
      maxLevel: 1,
      health: 450,
      maxHealth: 450,
      side: 'left',
      costMecidiye: 4,
      upgradeDescription: 'Sahra Topçu Atölyesi Kur (4 Sikke - Karargâh Sv. 3 Şartı)',
      titleTr: 'Sahra Topçu Atölyesi',
      assignedSoldierIds: [],
      maxSoldiers: 0,
      coinsDeposited: 0,
    });

    this.slots.push({
      id: 'artillery_workshop_right',
      x: hqX + artWorkOff,
      type: 'artillery_workshop',
      level: 0,
      maxLevel: 1,
      health: 450,
      maxHealth: 450,
      side: 'right',
      costMecidiye: 4,
      upgradeDescription: 'Sahra Topçu Atölyesi Kur (4 Sikke - Karargâh Sv. 3 Şartı)',
      titleTr: 'Sahra Topçu Atölyesi',
      assignedSoldierIds: [],
      maxSoldiers: 0,
      coinsDeposited: 0,
    });

    // 5. Heavy Outer Defense (Artillery Batteries, Outer Trenches & Outer Wire)
    this.slots.push({
      id: 'artillery_0',
      x: hqX - artOff,
      type: 'artillery',
      level: 0,
      maxLevel: 2,
      health: 350,
      maxHealth: 350,
      side: 'left',
      costMecidiye: 5,
      upgradeDescription: '75mm Sahra Topu Bataryası Yerleştir (5 Sikke)',
      titleTr: 'Sahra Topçu Mevzisi',
      assignedSoldierIds: [],
      maxSoldiers: 1,
    });

    this.slots.push({
      id: 'artillery_1',
      x: hqX + artOff,
      type: 'artillery',
      level: 0,
      maxLevel: 2,
      health: 350,
      maxHealth: 350,
      side: 'right',
      costMecidiye: 5,
      upgradeDescription: '75mm Sahra Topu Bataryası Yerleştir (5 Sikke)',
      titleTr: 'Sahra Topçu Mevzisi',
      assignedSoldierIds: [],
      maxSoldiers: 1,
    });

    this.slots.push({
      id: 'trench_2',
      x: hqX - outTrenchOff,
      type: 'trench',
      level: 0,
      maxLevel: 3,
      health: 300,
      maxHealth: 300,
      side: 'left',
      costMecidiye: 2,
      upgradeDescription: 'İleri Hat Siperini Kaz ve Kum Torbasıyla Kur (2 Sikke)',
      titleTr: 'İleri Siper Savunma Mevzisi',
      assignedSoldierIds: [],
      maxSoldiers: 2,
    });

    this.slots.push({
      id: 'trench_3',
      x: hqX + outTrenchOff,
      type: 'trench',
      level: 0,
      maxLevel: 3,
      health: 300,
      maxHealth: 300,
      side: 'right',
      costMecidiye: 2,
      upgradeDescription: 'İleri Hat Siperini Kaz ve Kum Torbasıyla Kur (2 Sikke)',
      titleTr: 'İleri Siper Savunma Mevzisi',
      assignedSoldierIds: [],
      maxSoldiers: 2,
    });

    this.slots.push({
      id: 'wire_4',
      x: hqX - outWireOff,
      type: 'barbed_wire',
      level: 0,
      maxLevel: 4,
      health: 200,
      maxHealth: 200,
      side: 'left',
      costMecidiye: 2,
      upgradeDescription: 'İleri Hat Dikenli Tel Engeli Kur (2 Sikke)',
      titleTr: 'Dikenli Tel & Kazık Engeli',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    this.slots.push({
      id: 'wire_5',
      x: hqX + outWireOff,
      type: 'barbed_wire',
      level: 0,
      maxLevel: 4,
      health: 200,
      maxHealth: 200,
      side: 'right',
      costMecidiye: 2,
      upgradeDescription: 'İleri Hat Dikenli Tel Engeli Kur (2 Sikke)',
      titleTr: 'Dikenli Tel & Kazık Engeli',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    // 6. Watchtowers (High Observation & Sniper Posts)
    this.slots.push({
      id: 'watchtower_0',
      x: hqX - towerOff,
      type: 'watchtower',
      level: 0,
      maxLevel: 2,
      health: 200,
      maxHealth: 200,
      side: 'left',
      costMecidiye: 3,
      upgradeDescription: 'Ahşap Gözetleme Kulesi İnşa Et (3 Sikke)',
      titleTr: 'Gözetleme Kulesi',
      assignedSoldierIds: [],
      maxSoldiers: 1,
    });

    this.slots.push({
      id: 'watchtower_1',
      x: hqX + towerOff,
      type: 'watchtower',
      level: 0,
      maxLevel: 2,
      health: 200,
      maxHealth: 200,
      side: 'right',
      costMecidiye: 3,
      upgradeDescription: 'Ahşap Gözetleme Kulesi İnşa Et (3 Sikke)',
      titleTr: 'Gözetleme Kulesi',
      assignedSoldierIds: [],
      maxSoldiers: 1,
    });

    // 6b. Level-Specific Unique Slot Allocations (Distinct tactical layouts per campaign map)
    if (level.id === 2) {
      // Kanlısırt: Deep forward trench fortifications
    } else if (level.id === 3) {
      // Conkbayırı: Heavy artillery batteries on the high ridges
      this.slots.push({
        id: 'artillery_2',
        x: hqX - 1850,
        type: 'artillery',
        level: 0,
        maxLevel: 2,
        health: 350,
        maxHealth: 350,
        side: 'left',
        costMecidiye: 5,
        upgradeDescription: 'Conkbayırı Zirve Sahra Topu (5 Sikke)',
        titleTr: 'Zirve Topçu Bataryası',
        assignedSoldierIds: [],
        maxSoldiers: 1,
      });
      this.slots.push({
        id: 'artillery_3',
        x: hqX + 1850,
        type: 'artillery',
        level: 0,
        maxLevel: 2,
        health: 350,
        maxHealth: 350,
        side: 'right',
        costMecidiye: 5,
        upgradeDescription: 'Conkbayırı Zirve Sahra Topu (5 Sikke)',
        titleTr: 'Zirve Topçu Bataryası',
        assignedSoldierIds: [],
        maxSoldiers: 1,
      });
    } else if (level.id === 4) {
      // Anafartalar: Extended multi-tiered grand battlefield trenches
      this.slots.push({
        id: 'trench_4',
        x: hqX - 2800,
        type: 'trench',
        level: 0,
        maxLevel: 3,
        health: 200,
        maxHealth: 200,
        side: 'left',
        costMecidiye: 2,
        upgradeDescription: 'Anafartalar Dış Savunma Siperi (2 Sikke)',
        titleTr: 'Anafartalar İleri Siperi',
        assignedSoldierIds: [],
        maxSoldiers: 2,
      });
      this.slots.push({
        id: 'trench_5',
        x: hqX + 2800,
        type: 'trench',
        level: 0,
        maxLevel: 3,
        health: 200,
        maxHealth: 200,
        side: 'right',
        costMecidiye: 2,
        upgradeDescription: 'Anafartalar Dış Savunma Siperi (2 Sikke)',
        titleTr: 'Anafartalar İleri Siperi',
        assignedSoldierIds: [],
        maxSoldiers: 2,
      });
    }

    // 7. Distinct Pine Tree Distributions per Level (Orman çıkarma gemilerine kadar uzanır)
    const baseTreeStart = inWireOff + 160;
    const treeSpacing = 155;
    let leftTreeOffsets: number[] = [];
    let rightTreeOffsets: number[] = [];

    // User: "Ayrıca ağaçlar hemen bitmesin çıkarma gemilerinin yanına kadar olsun"
    // Trees extend continuously from outer defense perimeter all the way to coastal beach landing camps
    for (let off = baseTreeStart; hqX - off >= 340; off += treeSpacing) {
      leftTreeOffsets.push(off);
    }
    for (let off = baseTreeStart; hqX + off <= w - 340; off += treeSpacing) {
      rightTreeOffsets.push(off);
    }

    leftTreeOffsets.forEach((off, i) => {
      const treeX = hqX - off;
      const collidesWithSlot = this.slots.some((s) => Math.abs(s.x - treeX) < 65);
      if (!collidesWithSlot && treeX >= 330) {
        this.slots.push({
          id: `tree_l_${i}`,
          x: treeX,
          type: 'scavenge_wood',
          level: 1,
          maxLevel: 1,
          health: 100,
          maxHealth: 100,
          side: 'left',
          costMecidiye: 1,
          upgradeDescription: 'Ağacı İşaretle (1 Sikke -> Mehmetçik Keser, +3 Sikke Düşer)',
          titleTr: 'Gelibolu Çam Ağacı',
          assignedSoldierIds: [],
          maxSoldiers: 0,
          isMarkedForChop: false,
          chopProgress: 0,
        });
      }
    });

    rightTreeOffsets.forEach((off, i) => {
      const treeX = hqX + off;
      const collidesWithSlot = this.slots.some((s) => Math.abs(s.x - treeX) < 65);
      if (!collidesWithSlot && treeX <= w - 330) {
        this.slots.push({
          id: `tree_r_${i}`,
          x: treeX,
          type: 'scavenge_wood',
          level: 1,
          maxLevel: 1,
          health: 100,
          maxHealth: 100,
          side: 'right',
          costMecidiye: 1,
          upgradeDescription: 'Ağacı İşaretle (1 Sikke -> Mehmetçik Keser, +3 Sikke Düşer)',
          titleTr: 'Gelibolu Çam Ağacı',
          assignedSoldierIds: [],
          maxSoldiers: 0,
          isMarkedForChop: false,
          chopProgress: 0,
        });
      }
    });

    // 8. Ammunition Salvage Wrecks (Scavenge Iron)
    const ironLeftOffsets = [1420, 2220, 3350, 4200];
    const ironRightOffsets = [1420, 2220, 3350, 4200];

    ironLeftOffsets.forEach((off, i) => {
      const ironX = hqX - off;
      if (ironX >= 150) {
        this.slots.push({
          id: `iron_l_${i}`,
          x: ironX,
          type: 'scavenge_iron',
          level: 1,
          maxLevel: 1,
          health: 100,
          maxHealth: 100,
          side: 'left',
          costMecidiye: 0,
          upgradeDescription: 'Mühimmat Enkazını Aç (Ücretsiz -> +4 Sikke)',
          titleTr: 'Mühimmat Enkazı',
          assignedSoldierIds: [],
          maxSoldiers: 0,
        });
      }
    });

    ironRightOffsets.forEach((off, i) => {
      const ironX = hqX + off;
      if (ironX <= w - 150) {
        this.slots.push({
          id: `iron_r_${i}`,
          x: ironX,
          type: 'scavenge_iron',
          level: 1,
          maxLevel: 1,
          health: 100,
          maxHealth: 100,
          side: 'right',
          costMecidiye: 0,
          upgradeDescription: 'Mühimmat Enkazını Aç (Ücretsiz -> +4 Sikke)',
          titleTr: 'Mühimmat Enkazı',
          assignedSoldierIds: [],
          maxSoldiers: 0,
        });
      }
    });

    // 9. Abandoned Treasure Chests
    this.slots.push({
      id: 'chest_left_1',
      x: Math.max(280, hqX - 2850),
      type: 'treasure_chest',
      level: 1,
      maxLevel: 1,
      health: 100,
      maxHealth: 100,
      side: 'left',
      costMecidiye: 0,
      upgradeDescription: 'Terkedilmiş Askeri Sandığı Aç (+6 Sikke Kazan!)',
      titleTr: 'Terkedilmiş İkmal Sandığı',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    this.slots.push({
      id: 'chest_left_2',
      x: Math.max(160, hqX - 4400),
      type: 'treasure_chest',
      level: 1,
      maxLevel: 1,
      health: 100,
      maxHealth: 100,
      side: 'left',
      costMecidiye: 0,
      upgradeDescription: 'Gizli Sahil Hazinesini Aç (+8 Sikke Kazan!)',
      titleTr: 'Gizli Altın Sandığı',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    this.slots.push({
      id: 'chest_right_1',
      x: Math.min(w - 280, hqX + 2850),
      type: 'treasure_chest',
      level: 1,
      maxLevel: 1,
      health: 100,
      maxHealth: 100,
      side: 'right',
      costMecidiye: 0,
      upgradeDescription: 'Terkedilmiş Askeri Sandığı Aç (+6 Sikke Kazan!)',
      titleTr: 'Terkedilmiş İkmal Sandığı',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    this.slots.push({
      id: 'chest_right_2',
      x: Math.min(w - 160, hqX + 4400),
      type: 'treasure_chest',
      level: 1,
      maxLevel: 1,
      health: 100,
      maxHealth: 100,
      side: 'right',
      costMecidiye: 0,
      upgradeDescription: 'Düşmandan Kalan Askeri Sandığı Aç (+8 Sikke Kazan!)',
      titleTr: 'Gizli Altın Sandığı',
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    // 10. Outposts & Volunteer Recruitment Points (Köy / Gönüllü Çadırı)
    // User: "köylerden doğacak askerler bölümün zorluğuna göre sınırlı olsun onun dengesini iyi kur"
    const villageQuota = level.id === 1 ? 16 : level.id === 2 ? 13 : level.id === 3 ? 11 : 9;
    const recruitDist = Math.round(2550 * lvlSpacing);
    const recruitLeftX = Math.max(300, hqX - recruitDist);
    const recruitRightX = Math.min(w - 300, hqX + recruitDist);

    this.slots.push({
      id: 'recruit_left',
      x: recruitLeftX,
      type: 'recruit_camp',
      level: 1,
      maxLevel: 1,
      health: 9999,
      maxHealth: 9999,
      side: 'left',
      costMecidiye: 1,
      upgradeDescription: 'Köyden Gönüllü Al (1 Sikke)',
      titleTr: 'Köy',
      assignedSoldierIds: [],
      maxSoldiers: 0,
      availableRecruits: 2,
      recruitSpawnTimer: 0,
      maxRecruitsTotal: villageQuota,
      recruitsSpawnedTotal: 0,
    });

    this.slots.push({
      id: 'recruit_right',
      x: recruitRightX,
      type: 'recruit_camp',
      level: 1,
      maxLevel: 1,
      health: 9999,
      maxHealth: 9999,
      side: 'right',
      costMecidiye: 1,
      upgradeDescription: 'Köyden Gönüllü Al (1 Sikke)',
      titleTr: 'Köy',
      assignedSoldierIds: [],
      maxSoldiers: 0,
      availableRecruits: 2,
      recruitSpawnTimer: 0,
      maxRecruitsTotal: villageQuota,
      recruitsSpawnedTotal: 0,
    });

    // 10. Historical Relics (Rastgele Dağılım & Sıfır Tekrar Kuralı)
    // 3 Çeşit Yadigar: Kılıç (Taarruz), Hilal (Metanet), Çekiç (İstihkam)
    const ALL_RELIC_TEMPLATES = [
      {
        relicType: 'statue_damage',
        titleTr: '⚔️ Kılıç Heykeli (Taarruz Yadigârı)',
        desc: 'Tüm askerlerin mermilerini güçlendirir; düşmana %50 daha fazla hasar verdirir.',
      },
      {
        relicType: 'statue_health',
        titleTr: '🌙 Hilal Heykeli (Metanet Yadigârı)',
        desc: 'Bütün Mehmetçiklerin ve kumandanın azami canını %40 artırıp anında iyileştirir.',
      },
      {
        relicType: 'statue_defense',
        titleTr: '🔨 Çekiç Heykeli (İstihkam Yadigârı)',
        desc: 'Mevzilerin, siperlerin ve binaların azami dayanıklılığını %50 artırır.',
      }
    ];

    // Bölüme göre yadigar sayısı belirleme:
    // - 1. Bölüm: 1 adet yadigar
    // - 2. Bölüm: Bazen 1, bazen 2 yadigar (rastgele)
    // - Diğer Bölümler: 2 adet yadigar (asla aynı bölümde 2 aynı yadigar tekrar etmez)
    let relicCount = 2;
    if (level.id === 1) {
      relicCount = 1;
    } else if (level.id === 2) {
      relicCount = Math.random() < 0.5 ? 1 : 2;
    } else {
      relicCount = 2;
    }

    // AYNI YADİGARDAN 2 TANE OLMAMASI İÇİN Fisher-Yates karıştırma ve tekleme:
    const shuffledTemplates = [...ALL_RELIC_TEMPLATES];
    for (let i = shuffledTemplates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffledTemplates[i];
      shuffledTemplates[i] = shuffledTemplates[j];
      shuffledTemplates[j] = temp;
    }
    // Seçilen benzersiz yadigarlar (asla tekrar etmez)
    const selectedRelics = shuffledTemplates.slice(0, relicCount);

    // Konumlandırma koordinatları (haritadaki açık ve ferah keşif mevkileri - rastgele kanat ve mesafe):
    // 1 adet ise: Sol veya sağ taraf rastgele seçilir (2400-3200px mesafe)
    // 2 adet ise: Biri sol kanatta, biri sağ kanatta rastgele dağıtılır
    const relicPositions: number[] = [];
    if (relicCount === 1) {
      const sideSign = Math.random() < 0.5 ? -1 : 1;
      const randDist = 2400 + Math.floor(Math.random() * 900);
      relicPositions.push(Math.max(450, Math.min(w - 450, hqX + sideSign * randDist)));
    } else if (relicCount === 2) {
      const leftDist = 2300 + Math.floor(Math.random() * 900);
      const rightDist = 2300 + Math.floor(Math.random() * 900);
      const leftPos = Math.max(450, hqX - leftDist);
      const rightPos = Math.min(w - 450, hqX + rightDist);
      // Hangi yadigârın sola, hangisinin sağa düşeceği de rastgele karıştırılır
      if (Math.random() < 0.5) {
        relicPositions.push(leftPos);
        relicPositions.push(rightPos);
      } else {
        relicPositions.push(rightPos);
        relicPositions.push(leftPos);
      }
    } else {
      const leftDist = 2300 + Math.floor(Math.random() * 700);
      const rightDist = 2300 + Math.floor(Math.random() * 700);
      relicPositions.push(Math.max(450, hqX - leftDist));
      relicPositions.push(Math.min(w - 450, hqX + rightDist));
      const deepSide = Math.random() < 0.5 ? -1 : 1;
      const deepDist = Math.min(w / 2 - 600, 4200 + Math.random() * 800);
      relicPositions.push(Math.max(350, Math.min(w - 350, hqX + deepSide * deepDist)));
    }

    // Seviye konfigürasyonundaki mevcut yadigarları da senkronize et
    level.relicsAvailable = selectedRelics.map((relicDef, idx) => ({
      id: `${relicDef.relicType}_${level.id}_${idx}`,
      titleTr: relicDef.titleTr,
      descriptionTr: relicDef.desc,
      x: relicPositions[idx],
    }));

    selectedRelics.forEach((relicDef, idx) => {
      const posX = relicPositions[idx];
      this.slots.push({
        id: `relic_${relicDef.relicType}_${level.id}_${idx}`,
        x: posX,
        type: 'shrine_relic',
        level: 1, // 1 = locked, 2 = unlocked
        maxLevel: 2,
        health: 9999,
        maxHealth: 9999,
        side: posX < hqX ? 'left' : 'right',
        costMecidiye: 8,
        upgradeDescription: `${relicDef.titleTr}: ${relicDef.desc}`,
        titleTr: relicDef.titleTr,
        assignedSoldierIds: [],
        maxSoldiers: 0,
      });
    });

    // 11. Ormanda Çitlerle Çevrili Otlayan Yabani At (Sadece Brown Hızlı Yağız veya Black Dayanıklı Karayel At)
    const wildHorseTypes: ('brown' | 'black')[] = ['brown', 'black'];
    const chosenHorseType = wildHorseTypes[Math.floor(Math.random() * wildHorseTypes.length)];
    const horseSide = Math.random() < 0.5 ? -1 : 1;
    const wildHorseX = Math.max(300, Math.min(w - 300, hqX + horseSide * (1450 + Math.random() * 600)));

    this.slots.push({
      id: 'wild_horse_main',
      x: wildHorseX,
      type: 'wild_horse',
      level: 1,
      maxLevel: 1,
      health: 100,
      maxHealth: 100,
      side: horseSide < 0 ? 'left' : 'right',
      costMecidiye: 7,
      horseType: chosenHorseType,
      upgradeDescription: '7 Sikke ile bu yaban atını evcilleştirip binek yapın. Eski atınız bekleyecektir.',
      titleTr: chosenHorseType === 'brown' ? '🐎 Otlayan Yağız Aygır (Aşırı Hızlı)' : (chosenHorseType === 'black' ? '🐎 Otlayan Karayel Siyah At (Dayanıklı)' : '🐎 Otlayan Aydınlık Kır At'),
      assignedSoldierIds: [],
      maxSoldiers: 0,
    });

    // Enforce strict minimum spacing between all slots so nothing overlaps or merges!
    this.ensureSlotSpacing(95);
  }

  private ensureSlotSpacing(minDistance = 95) {
    // Separate HQ and fixed central structures, adjust environment & defense slots
    const nonHqSlots = this.slots.filter((s) => s.id !== 'hq_main');
    nonHqSlots.sort((a, b) => a.x - b.x);

    for (let i = 1; i < nonHqSlots.length; i++) {
      const prev = nonHqSlots[i - 1];
      const curr = nonHqSlots[i];
      const gap = curr.x - prev.x;
      if (gap < minDistance) {
        curr.x = prev.x + minDistance;
      }
    }
  }

  private initWildAnimals(level: typeof CAMPAIGN_LEVELS[0]) {
    const w = level.worldWidth;
    const hqX = w / 2;
    this.animals = [];

    // Spawn 12-16 animals across the wilderness left and right
    const animalTypes: AnimalType[] = ['rabbit', 'rabbit', 'deer', 'partridge'];

    for (let i = 0; i < 14; i++) {
      const type = animalTypes[i % animalTypes.length];
      const side = i % 2 === 0 ? -1 : 1;
      const minDistance = 1200; // outside main trenches
      const maxDistance = w / 2 - 400;
      const dist = minDistance + Math.random() * (maxDistance - minDistance);
      // User: "kumandan geçmiyor evet denize ama hayvanlar geçiyor hiçbir canlı geçmesin denize"
      const x = Math.max(340, Math.min(w - 340, hqX + side * dist));

      this.spawnAnimal(type, x);
    }
  }

  public spawnAnimal(type: AnimalType, x: number) {
    let health = 15;
    let bounty = 1;
    if (type === 'deer') {
      health = 45;
      bounty = 3;
    } else if (type === 'partridge') {
      health = 10;
      bounty = 1;
    }

    this.animals.push({
      id: `animal_${this.animalIdCounter++}`,
      type,
      x,
      y: 440,
      vx: (Math.random() - 0.5) * 20,
      facing: Math.random() < 0.5 ? 1 : -1,
      state: Math.random() < 0.5 ? 'grazing' : 'wandering',
      health,
      maxHealth: health,
      bountyMecidiye: bounty,
      fleeTimer: 0,
      hopTimer: Math.random() * 2,
    });
  }

  private initStartingTroops(carriedOverSoldiers?: Array<{ role: Soldier['role']; name?: string }>) {
    const hqX = this.state.level.worldWidth / 2;
    this.soldiers = [];

    if (this.state.level.id === 1) {
      // Chapter 1 (Level 1: Seddülbahir): Starts with strictly 2 unarmed recruits (Mehmetçik) at HQ
      // as requested ("1. bölümde başlangıçta sadece 2 tane silahsız mehmetcik olsun")
      this.spawnSoldier('recruit', hqX - 40, null);
      this.spawnSoldier('recruit', hqX + 40, null);
    } else {
      // Other chapters have starting veteran garrison squad
      const trench0 = this.slots.find((s) => s.id === 'trench_0');
      const trench1 = this.slots.find((s) => s.id === 'trench_1');
      const hospital = this.slots.find((s) => s.id === 'hospital_main');

      this.spawnSoldier('infantry', trench0 ? trench0.x : hqX - 480, 'trench_0');
      this.spawnSoldier('infantry', trench1 ? trench1.x : hqX + 480, 'trench_1');
      this.spawnSoldier('engineer', hqX - 60, null);
      this.spawnSoldier('medic', hospital ? hospital.x : hqX - 220, 'hospital_main');
    }

    // Kingdom Two Crowns style: Veterancy & troops carried over from previous victoriously cleared front
    if (carriedOverSoldiers && carriedOverSoldiers.length > 0) {
      carriedOverSoldiers.forEach((troop, idx) => {
        const spawnX = hqX - 70 + (idx % 2 === 0 ? -1 : 1) * (30 + idx * 18);
        const soldier = this.spawnSoldier(troop.role, spawnX, null);
        soldier.name = troop.name || (troop.role === 'infantry' ? `Gazi Mehmetçik ${idx + 1}` : soldier.name);
        soldier.moraleBuffTimer = 20; // 20s morale boost from arriving victoriously
      });

      this.addFloatingText(
        hqX,
        340,
        `🇹🇷 Önceki Cepheden ${carriedOverSoldiers.length} Nefer İntikal Etti!`,
        '#38bdf8'
      );
    }
  }

  public spawnSoldier(role: Soldier['role'], x: number, assignedSlotId: string | null = null) {
    const id = `soldier_${this.soldierIdCounter++}`;
    const soldier: Soldier = {
      id,
      x,
      y: 440, // Ground level
      role,
      health: 100,
      maxHealth: 100,
      facing: x < this.state.level.worldWidth / 2 ? 1 : -1,
      state: 'idle',
      assignedSlotId,
      targetEnemyId: null,
      attackCooldown: 0,
      bayonetDamage: role === 'infantry' ? 35 : (role === 'recruit' ? 0 : 20),
      ammoInClip: role === 'recruit' ? 0 : 5,
      maxAmmoInClip: role === 'recruit' ? 0 : 5,
      speed: 1.2,
      name: role === 'recruit' ? `Gönüllü Nefer ${this.soldierIdCounter}` : `Mehmetçik ${this.soldierIdCounter}`,
      moraleBuffTimer: 0,
    };

    if (assignedSlotId) {
      const slot = this.slots.find((s) => s.id === assignedSlotId);
      if (slot) {
        slot.assignedSoldierIds.push(id);
      }
    }

    this.soldiers.push(soldier);
    return soldier;
  }

  // --- Main Tick Loop ---

  public update(dt: number, moveDir: number, isSprinting: boolean) {
    if (this.state.isGameOver || this.state.isVictory || this.state.isPaused) {
      return;
    }

    const scaledDt = dt * this.state.speedMultiplier;
    this.totalGameTime += scaledDt;

    // 1. Advance Day/Night Cycle & Seasons
    this.updateTimeAndWeather(scaledDt);

    // 2. Update Player Commander Physics & Input
    this.updateCommander(scaledDt, moveDir, isSprinting);

    // 3. Update Camera Tracking
    this.updateCamera(scaledDt);

    // 4. Update Build Slots & Repair Logic
    this.updateBuildSlots(scaledDt);

    // 5. Update Soldiers (AI, shooting, bayonet, digging, healing)
    this.updateSoldiers(scaledDt);

    // 5.5 Update Mobile Field Artillery (75mm Krupp Sahra Topu)
    this.updateFieldArtilleries(scaledDt);

    // 6. Spawn and Update Enemies
    this.updateEnemies(scaledDt);

    // 7. Update Wild Animals (Rabbits, Deer, Partridges) & Hunting
    this.updateAnimals(scaledDt);

    // 8. Update Projectiles & Explosions
    this.updateProjectiles(scaledDt);

    // 9. Update Ground Coins (Kingdom style pickup & physics)
    this.updateGroundCoins(scaledDt);

    // 9.5 Update Stone Title (Kingdom Classic crumbling monoliths)
    this.updateStoneTitle(scaledDt);

    // 10. Update Particles & Floating Text
    this.updateParticles(scaledDt);

    // 10.5 Update In-Game Tutorial
    this.updateInGameTutorial(scaledDt, moveDir, isSprinting);

    // 11. Check Victory & Defeat Conditions
    this.checkGameConditions();
  }

  private updateInGameTutorial(dt: number, _moveDir: number, _isSprinting: boolean) {
    const tut = this.state.inGameTutorial;
    if (!tut || !tut.enabled) return;

    tut.stepTimer += dt;
    const hqX = this.state.level.worldWidth / 2;

    // Safeguard for Chapter 1 tutorial: If player has less than 2 coins and needs to build/chop, spawn safety coin at HQ so player never gets soft-locked
    if (tut.enabled && tut.step !== 'goto_hq' && tut.step !== 'collect_coins' && tut.step !== 'done' && tut.step !== 'use_whistle') {
      const hqCoins = this.groundCoins.filter((c) => Math.abs(c.x - hqX) < 220).length;
      if (this.commander.mecidiye < 2 && hqCoins === 0) {
        this.spawnGroundCoin(hqX, 2, false, 0.2);
        this.addFloatingText(hqX, 360, '🪙 İkmal Sandığından 2 İlave Sikke Geldi!', '#fbbf24');
      }
    }

    switch (tut.step) {
      case 'goto_hq': {
        tut.targetX = hqX;
        const dist = Math.abs(this.commander.x - hqX);
        if (!tut.isStepCompleted) {
          if (dist < 140) {
            tut.isStepCompleted = true;
            tut.stepTimer = 0;
            soundEngine.playCoinCollect();
          }
        } else if (tut.stepTimer >= 0.7) {
          tut.step = 'collect_coins';
          tut.isStepCompleted = false;
          tut.stepTimer = 0;
        }
        break;
      }
      case 'collect_coins': {
        tut.targetX = hqX;
        if (!tut.isStepCompleted) {
          if (this.commander.mecidiye >= 3) {
            tut.isStepCompleted = true;
            tut.stepTimer = 0;
            soundEngine.playCoinCollect();
          }
        } else if (tut.stepTimer >= 0.7) {
          tut.step = 'buy_rifle';
          tut.isStepCompleted = false;
          tut.stepTimer = 0;
        }
        break;
      }
      case 'buy_rifle': {
        const armory = this.slots.find((s) => s.type === 'armory');
        if (armory) tut.targetX = armory.x;
        if (!tut.isStepCompleted) {
          const hasRifleBought = this.slots.some((s) => s.type === 'armory' && ((s.availableRifles || 0) > 0 || (s.coinsDeposited || 0) > 0)) ||
            this.soldiers.some((s) => s.role === 'infantry');
          if (hasRifleBought) {
            tut.isStepCompleted = true;
            tut.stepTimer = 0;
            soundEngine.playCoinCollect();
          }
        } else if (tut.stepTimer >= 0.7) {
          tut.step = 'recruit_soldier';
          tut.isStepCompleted = false;
          tut.stepTimer = 0;
        }
        break;
      }
      case 'recruit_soldier': {
        const villageSlots = this.slots.filter((s) => s.type === 'recruit_camp');
        if (villageSlots.length > 0) {
          let nearest = villageSlots[0];
          let minDist = Math.abs(this.commander.x - nearest.x);
          for (const s of villageSlots) {
            const d = Math.abs(this.commander.x - s.x);
            if (d < minDist) {
              minDist = d;
              nearest = s;
            }
          }
          tut.targetX = nearest.x;
        }
        if (!tut.isStepCompleted) {
          const hasRecruited = this.soldiers.length > 2 ||
            this.slots.some((s) => s.type === 'recruit_camp' && ((s.coinsDeposited || 0) > 0 || (s.recruitsSpawnedTotal || 0) > 0));
          if (hasRecruited) {
            tut.isStepCompleted = true;
            tut.stepTimer = 0;
            soundEngine.playCoinCollect();
          }
        } else if (tut.stepTimer >= 0.7) {
          tut.step = 'chop_tree';
          tut.isStepCompleted = false;
          tut.stepTimer = 0;
        }
        break;
      }
      case 'chop_tree': {
        const uncutTrees = this.slots.filter((s) => s.type === 'scavenge_wood' && !s.isScavenged);
        if (uncutTrees.length > 0) {
          let nearest = uncutTrees[0];
          let minDist = Math.abs(this.commander.x - nearest.x);
          for (const t of uncutTrees) {
            const d = Math.abs(this.commander.x - t.x);
            if (d < minDist) {
              minDist = d;
              nearest = t;
            }
          }
          tut.targetX = nearest.x;
        }
        if (!tut.isStepCompleted) {
          const hasMarkedTree = this.slots.some((s) => s.type === 'scavenge_wood' && (s.isMarkedForChop || s.isScavenged));
          if (hasMarkedTree) {
            tut.isStepCompleted = true;
            tut.stepTimer = 0;
            soundEngine.playCoinCollect();
          }
        } else if (tut.stepTimer >= 0.7) {
          tut.step = 'build_trench';
          tut.isStepCompleted = false;
          tut.stepTimer = 0;
        }
        break;
      }
      case 'build_trench': {
        const trenchSlots = this.slots.filter((s) => s.type === 'trench');
        if (trenchSlots.length > 0) {
          let nearest = trenchSlots[0];
          let minDist = Math.abs(this.commander.x - nearest.x);
          for (const s of trenchSlots) {
            const d = Math.abs(this.commander.x - s.x);
            if (d < minDist) {
              minDist = d;
              nearest = s;
            }
          }
          tut.targetX = nearest.x;
        }
        if (!tut.isStepCompleted) {
          const hasBuiltTrench = this.slots.some((s) => s.type === 'trench' && (s.underConstruction || s.level > 0 || (s.coinsDeposited || 0) > 0));
          if (hasBuiltTrench) {
            tut.isStepCompleted = true;
            tut.stepTimer = 0;
            soundEngine.playCoinCollect();
          }
        } else if (tut.stepTimer >= 0.7) {
          tut.step = 'build_wire';
          tut.isStepCompleted = false;
          tut.stepTimer = 0;
        }
        break;
      }
      case 'build_wire': {
        const wireSlots = this.slots.filter((s) => s.type === 'barbed_wire');
        if (wireSlots.length > 0) {
          let nearest = wireSlots[0];
          let minDist = Math.abs(this.commander.x - nearest.x);
          for (const s of wireSlots) {
            const d = Math.abs(this.commander.x - s.x);
            if (d < minDist) {
              minDist = d;
              nearest = s;
            }
          }
          tut.targetX = nearest.x;
        }
        if (!tut.isStepCompleted) {
          const hasBuiltWire = this.slots.some((s) => s.type === 'barbed_wire' && (s.underConstruction || s.level > 0 || (s.coinsDeposited || 0) > 0));
          if (hasBuiltWire) {
            tut.isStepCompleted = true;
            tut.stepTimer = 0;
            soundEngine.playCoinCollect();
          }
        } else if (tut.stepTimer >= 0.7) {
          tut.step = 'use_whistle';
          tut.isStepCompleted = false;
          tut.stepTimer = 0;
        }
        break;
      }
      case 'use_whistle': {
        tut.targetX = undefined;
        if (!tut.isStepCompleted) {
          if (this.commander.activeBuff || this.commander.whistleCooldown > 0) {
            tut.isStepCompleted = true;
            tut.stepTimer = 0;
            soundEngine.playVictoryFanfare();
          }
        } else if (tut.stepTimer >= 0.8) {
          tut.step = 'done';
          tut.isStepCompleted = true;
          tut.stepTimer = 0;
          setCompletedInGameTutorial(true);
        }
        break;
      }
      case 'done': {
        tut.targetX = undefined;
        if (tut.stepTimer >= 3.5) {
          tut.fadeAlpha = Math.max(0, 1 - (tut.stepTimer - 3.5) / 1.0);
          if (tut.fadeAlpha <= 0) {
            tut.enabled = false;
          }
        }
        break;
      }
    }
  }

  private updateTimeAndWeather(dt: number) {
    // Kingdom Two Crowns pacing: 1 full daytime cycle = 180 seconds (3 full minutes of calm daylight & exploration)
    const isNight = this.state.timePhase === 'night' || this.state.timePhase === 'midnight';
    const dayDuration = 180;

    // Advance time during daytime normally.
    // Gece kuralı: "düşman askerler bitmeden veya taaruz bitmeden gece bitmesin tüm askerler bitince gündüz olsun."
    // All night waves must have spawned AND all alive enemies must be eliminated AND player charging squads completed!
    const allWavesSpawned = this.nightWavesSpawnedCount >= this.maxNightWaves;
    const anyChargingAssault = this.soldiers.some((s) => s.isAssaultSquad && s.assaultState === 'charging');
    const nightEnemiesCleared = allWavesSpawned && !this.enemies.some((e) => e.health > 0 && e.state !== 'dying') && !anyChargingAssault;

    if (!isNight) {
      this.state.dayProgress += dt / dayDuration;
    } else {
      // During night, progress smoothly advances up to midnight apex (0.87) where the Moon shines at top of sky
      if (this.state.dayProgress < 0.87) {
        this.state.dayProgress += dt / (dayDuration * 0.45);
      }
      // Night NEVER advances beyond midnight while any enemy is alive or charging assault is ongoing!
      if (nightEnemiesCleared) {
        // As soon as all enemies are eliminated, advance into dawn at a gentle, majestic pace
        this.state.dayProgress = Math.min(1.0, this.state.dayProgress + dt * 0.015);
      }
    }

    // Gece ancak ve ancak tüm düşman askerleri bittiğinde ve taarruz dalgaları bittiğinde sona erer!
    const shouldDawnTrigger = isNight && nightEnemiesCleared && this.state.dayProgress >= 0.999;

    if (shouldDawnTrigger) {
      this.state.dayProgress = 0.0; // Reset smoothly to 0.0 at dawn
      this.state.timePhase = 'dawn';
      this.state.dayNumber += 1;
      this.state.daysSurvived += 1;
      this.nightWavesSpawnedCount = 0;
      this.maxNightWaves = 1;

      // New Day Rewards (Reinforcements and supply shipment dropped at HQ)
      this.spawnGroundCoin(this.state.level.worldWidth / 2, 4, false, 0.4);
      this.addFloatingText(this.commander.x, 380, `🌅 Şafak Söktü! Karargâha İkmal Sandığı Ulaştı (+4 Sikke)`, '#fde047');
      soundEngine.playBugleCharge();

      // Check Season progression (every 2 days)
      const seasons: SeasonType[] = ['spring', 'summer', 'autumn', 'winter'];
      const currentSeasonIndex = Math.floor((this.state.dayNumber - 1) / 2) % seasons.length;
      this.state.season = seasons[currentSeasonIndex];

      if (this.state.radioIntercept) {
        this.state.radioIntercept.isActive = false;
        this.state.radioIntercept.isDecoded = false;
        this.state.radioIntercept.isOpenUI = false;
        this.state.radioIntercept.intelReport = undefined;
      }
      this.plannedNightWave = null;
    }

    // Determine Time Phase (Extended daytime for scouting, hunting & building)
    const p = this.state.dayProgress;
    if (isNight && !nightEnemiesCleared) {
      // Strictly remain at midnight as long as enemy soldiers are on the field!
      this.state.timePhase = 'midnight';
    } else if (p < 0.12) {
      this.state.timePhase = 'dawn';
    } else if (p < 0.70) {
      this.state.timePhase = 'day';
    } else if (p < 0.76) {
      this.state.timePhase = 'dusk';
    } else if (p < 0.86) {
      this.state.timePhase = 'night';
    } else {
      this.state.timePhase = 'midnight';
    }

    // Sabah olunca istihbarat HUD'ı ve telsiz modalı kapanır (Kullanıcı: "sabah olunca istihbarat hudu kapanmadı")
    if (this.state.timePhase === 'dawn' || this.state.timePhase === 'day') {
      if (this.state.radioIntercept) {
        this.state.radioIntercept.isActive = false;
        this.state.radioIntercept.isDecoded = false;
        this.state.radioIntercept.isOpenUI = false;
        this.state.radioIntercept.intelReport = undefined;
      }
      this.plannedNightWave = null;
    }

    // Dusk Warning Alert: When evening arrives, warn the commander and signal soldiers behind frontier!
    if (this.state.timePhase === 'dusk' && this.prevTimePhase !== 'dusk') {
      soundEngine.playBugleCharge();
      this.addFloatingText(this.commander.x, 340, '🌆 Akşam Oluyor! Askerler Hudut Gerisinde Savunma Mevzilerine Geçiyor!', '#f59e0b');
    }

    // Her gecede (1. gece, 2. gece, vb.) telsiz istihbarat sinyali yakalanır (Kullanıcı: "2. gecede telsiz gelmedi")
    const isEveningOrNight = this.state.timePhase === 'dusk' || this.state.timePhase === 'night' || this.state.timePhase === 'midnight';
    if (isEveningOrNight && this.lastRadioDay !== this.state.dayNumber) {
      this.lastRadioDay = this.state.dayNumber;
      this.plannedNightWave = null;
      this.prepareNightRadioIntercept();
    }

    // Music Transitions & Nightfall Warning Alert
    if (this.state.timePhase === 'night' || this.state.timePhase === 'midnight') {
      soundEngine.playMusic('night');
      if (this.prevTimePhase !== 'night' && this.prevTimePhase !== 'midnight') {
        this.nightWavesSpawnedCount = 0;
        this.maxNightWaves = 1;
        soundEngine.playBugleCharge();
        const isBloodMoon = this.state.dayNumber % 3 === 0;
        const msg = isBloodMoon
          ? '🩸 KIZIL GECE! DÜŞMAN ELİT ŞOK TAARRUZU BAŞLADI!'
          : '⚠️ DÜŞMAN GECE TAARRUZU BAŞLADI! MEVZİLERİ SAVUNUN!';
        this.addFloatingText(this.commander.x, 340, msg, '#ef4444');
        this.spawnTimer = 999; // trigger immediate squad spawn
      }
    } else {
      soundEngine.playMusic('day');

      // Daytime animal respawn: ONLY in uncleared dark forest areas (Kingdom style ecosystem)
      this.animalSpawnTimer += dt;
      if (this.animalSpawnTimer > 10 && this.animals.length < 8) {
        this.animalSpawnTimer = 0;
        const { leftForestEdgeX, rightForestEdgeX } = this.getForestEdges();
        const w = this.state.level.worldWidth;

        const leftCamp = this.landingCamps.find((c) => c.side === 'left');
        const rightCamp = this.landingCamps.find((c) => c.side === 'right');
        const safeMinX = (leftCamp && !leftCamp.isDestroyed) ? leftCamp.x + 800 : 380;
        const safeMaxX = (rightCamp && !rightCamp.isDestroyed) ? rightCamp.x - 800 : w - 380;

        const availableSides: ('left' | 'right')[] = [];
        if (leftForestEdgeX > safeMinX + 100) availableSides.push('left');
        if (rightForestEdgeX < safeMaxX - 100) availableSides.push('right');

        if (availableSides.length > 0) {
          const chosenSide = availableSides[Math.floor(Math.random() * availableSides.length)];
          let spawnX: number;
          if (chosenSide === 'left') {
            spawnX = Math.max(safeMinX + 60, leftForestEdgeX - 80 - Math.random() * 500);
          } else {
            spawnX = Math.min(safeMaxX - 60, rightForestEdgeX + 80 + Math.random() * 500);
          }
          const types: AnimalType[] = ['rabbit', 'rabbit', 'deer', 'partridge'];
          this.spawnAnimal(types[Math.floor(Math.random() * types.length)], spawnX);
        }
      }
    }
    this.prevTimePhase = this.state.timePhase;

    // Periodic check to auto-fill defensive slots with available soldiers
    this.assignmentCheckTimer += dt;
    if (this.assignmentCheckTimer >= 1.5) {
      this.assignmentCheckTimer = 0;
      this.recheckSoldierAssignments();
    }

    // Dynamic Weather Changes & Atmospheric Fog / Rain Transitions
    this.weatherTimer += dt;
    // Smooth weather intensity ramp
    if (Math.abs(this.targetWeatherIntensity - this.state.weatherIntensity) > 0.005) {
      const blend = 1 - Math.exp(-1.4 * dt);
      this.state.weatherIntensity += (this.targetWeatherIntensity - this.state.weatherIntensity) * blend;
      soundEngine.updateWeatherAmbience(this.state.weather, this.state.weatherIntensity);
    }

    // Kar hava durumu kesinlikle sadece kış mevsiminde çalışabilir
    if (this.state.season !== 'winter' && this.state.weather === 'snow') {
      this.state.weather = 'rain';
    }

    if (this.weatherTimer > 35) {
      this.weatherTimer = 0;
      if (this.state.weather === 'clear') {
        const roll = Math.random();
        // Early morning / dawn has higher likelihood of coastal mist / fog
        const isDawnOrDusk = this.state.timePhase === 'dawn' || this.state.timePhase === 'dusk';
        if (roll < (isDawnOrDusk ? 0.45 : 0.26)) {
          this.state.weather = 'fog';
          this.targetWeatherIntensity = 0.5 + Math.random() * 0.45;
        } else if (roll < 0.60) {
          this.state.weather = this.state.season === 'winter' ? 'snow' : 'rain';
          this.targetWeatherIntensity = 0.4 + Math.random() * 0.45;
        }
      } else {
        // If weather is already fog or rain, 60% chance to clear up smoothly
        if (Math.random() < 0.60) {
          this.targetWeatherIntensity = 0;
          if (this.state.weatherIntensity < 0.08) {
            this.state.weather = 'clear';
          }
        }
      }
      soundEngine.updateWeatherAmbience(this.state.weather, this.state.weatherIntensity);
    }
  }

  public prepareNightRadioIntercept() {
    if (!this.state.radioIntercept) {
      this.state.radioIntercept = {
        isActive: false,
        targetFrequency: 720,
        currentFrequency: 450,
        signalStrength: 0,
        isDecoded: false,
        isOpenUI: false,
        morseTimer: 0,
      };
    }

    if (this.plannedNightWave) return;

    const isBloodMoon = this.state.dayNumber % 3 === 0;

    // Pick flank
    let flank: 'left' | 'right' | 'both';
    if (isBloodMoon || Math.random() < 0.35 + this.state.dayNumber * 0.1) {
      flank = 'both';
    } else {
      flank = Math.random() < 0.5 ? 'left' : 'right';
    }

    const leftCamp = this.landingCamps.find((c) => c.side === 'left');
    const rightCamp = this.landingCamps.find((c) => c.side === 'right');
    if (flank === 'left' && leftCamp && leftCamp.isDestroyed) flank = 'right';
    if (flank === 'right' && rightCamp && rightCamp.isDestroyed) flank = 'left';

    const squadSize = this.state.dayNumber === 1
      ? 5
      : Math.min(20, 5 + Math.floor(this.state.dayNumber * 1.8) + (isBloodMoon ? 5 : 0));
    const totalCount = flank === 'both' ? squadSize * 2 : squadSize;
    const hasHeavyUnits = this.state.dayNumber >= 3;

    let text = '';
    if (flank === 'left') {
      text = `İngiliz Anzac Kolordusu telsiz emri çözüldü: "Sol kanat (Arıburnu yönü) siperlerine ${totalCount} neferlik taarruz tertibatı alındı. Sağ cenaha takviye yoktur."`;
    } else if (flank === 'right') {
      text = `İngiliz 29. Tümen şifresi çözüldü: "Sağ cenah (Seddülbahir yönü) mevzilerine ${totalCount} kişilik gece hücumu başlatılacaktır. Sol cenaha takviye yoktur."`;
    } else {
      text = `Müttefik Karargâh telsiz şifresi çözüldü: "Her iki cenaha eş zamanlı kıskaç hücumu icra edilsin! Toplam ${totalCount} asker (${squadSize} sol, ${squadSize} sağ) sevk edildi."`;
    }

    const possibleFreqs = [520, 620, 680, 740, 820, 880, 940, 1020, 1100];
    const targetFreq = possibleFreqs[Math.floor(Math.random() * possibleFreqs.length)];

    this.plannedNightWave = {
      flank,
      squadSize,
      hasHeavyUnits,
      text,
    };

    this.state.radioIntercept.isActive = true;
    this.state.radioIntercept.isDecoded = false;
    this.state.radioIntercept.targetFrequency = targetFreq;
    this.state.radioIntercept.currentFrequency = 450;
    this.state.radioIntercept.signalStrength = 0;
    this.state.radioIntercept.intelReport = {
      text,
      flank,
      enemyCount: totalCount,
      hasHeavyUnits,
      timestamp: Date.now(),
    };

    soundEngine.playRadioChatter();
    this.addFloatingText(this.commander.x, 360, '📻 Düşman Telsiz Sinyali Yakalandı! [T] ile Şifreyi Çözün', '#38bdf8');
  }

  public tuneRadioFrequency(freq: number) {
    if (!this.state.radioIntercept) return;
    this.state.radioIntercept.currentFrequency = freq;
    const diff = Math.abs(freq - this.state.radioIntercept.targetFrequency);
    this.state.radioIntercept.signalStrength = Math.max(0, 1 - diff / 90);
  }

  public decodeRadioSignal() {
    if (!this.state.radioIntercept) return;
    this.state.radioIntercept.isDecoded = true;
    this.state.radioIntercept.signalStrength = 1.0;
    soundEngine.playRadioDecode();
    const rep = this.state.radioIntercept.intelReport;
    if (rep) {
      const flankName = rep.flank === 'left' ? 'SOL KANAT' : rep.flank === 'right' ? 'SAĞ KANAT' : 'HER İKİ KANAT';
      this.addFloatingText(this.commander.x, 320, `🎯 ŞİFRE ÇÖZÜLDÜ! Düşman ${flankName}tan saldıracak (${rep.enemyCount} er)!`, '#4ade80');
    }
  }

  public toggleRadioTelegraph(open?: boolean) {
    if (!this.state.radioIntercept) return;
    if (open !== undefined) {
      this.state.radioIntercept.isOpenUI = open;
    } else {
      this.state.radioIntercept.isOpenUI = !this.state.radioIntercept.isOpenUI;
    }
    if (this.state.radioIntercept.isOpenUI) {
      soundEngine.playRadioChatter();
    }
  }

  private updateCommander(dt: number, moveDir: number, isSprinting: boolean) {
    const cmd = this.commander;

    // If player is manually controlling, clear automatic destination
    if (moveDir !== 0) {
      cmd.targetDestinationX = null;
      cmd.targetSlotId = null;
    } else if (cmd.targetDestinationX !== null) {
      // Auto move towards targetDestinationX
      const diff = cmd.targetDestinationX - cmd.x;
      if (Math.abs(diff) < 15) {
        // Arrived at target
        cmd.targetDestinationX = null;
        if (cmd.targetSlotId) {
          const slot = this.slots.find((s) => s.id === cmd.targetSlotId);
          if (slot && !slot.isScavenged && !slot.relicClaimed) {
            this.executeSlotAction(slot);
          }
          cmd.targetSlotId = null;
        }
      } else {
        moveDir = Math.sign(diff);
        if (Math.abs(diff) > 200) {
          isSprinting = true;
        }
      }
    }

    // Invulnerability Timer
    if (cmd.invulnerableTimer > 0) {
      cmd.invulnerableTimer -= dt;
    }

    // Passive Hospital & Campfire Healing for Commander during Day
    if (this.state.timePhase === 'day' && cmd.health < cmd.maxHealth) {
      const hqX = this.state.level.worldWidth / 2;
      const nearHospital = Math.abs(cmd.x - (hqX - 320)) < 110;
      const nearHQ = Math.abs(cmd.x - hqX) < 100;
      if (nearHospital || nearHQ) {
        if (Math.random() < 0.35 * dt) {
          cmd.health = Math.min(cmd.maxHealth, cmd.health + 1);
          soundEngine.playHeal();
          this.addFloatingText(cmd.x, 360, `💚 +1 Can (${cmd.health}/${cmd.maxHealth}) - Sıhhiye Tedavisi`, '#22c55e');
          this.spawnDebris(cmd.x, 420, '#22c55e', 4);
        }
      }
    }

    // Buff Timer
    if (cmd.buffTimer > 0) {
      cmd.buffTimer -= dt;
      if (cmd.buffTimer <= 0) cmd.activeBuff = null;
    }

    // Whistle Cooldown
    if (cmd.whistleCooldown > 0) {
      cmd.whistleCooldown -= dt;
    }

    // Stamina & Gallop
    if (cmd.stamina <= 0) {
      cmd.sprintLockout = true;
    } else if (cmd.stamina > 15) {
      cmd.sprintLockout = false;
    }

    // Horse mount type speed & stamina modifiers
    const mount = cmd.mountType || 'white';
    let speedMounted = cmd.isSprinting ? 320 : 185;
    let staminaDrain = dt * 22;

    if (mount === 'brown') {
      // Fast Arabian Charger (Yağız Aygır)
      speedMounted = cmd.isSprinting ? 365 : 205;
      staminaDrain = dt * 24;
    } else if (mount === 'black') {
      // High endurance horse (Siyah Karayel - stamina drops 2.5x slower)
      speedMounted = cmd.isSprinting ? 300 : 175;
      staminaDrain = dt * 11;
    }

    if (isSprinting && moveDir !== 0 && !cmd.sprintLockout && cmd.stamina > 0) {
      cmd.isSprinting = true;
      cmd.stamina = Math.max(0, cmd.stamina - staminaDrain);
    } else {
      cmd.isSprinting = false;
      const isStopped = moveDir === 0 && cmd.targetDestinationX === null;
      // Durunca daha hızlı dolsun (36), yürürken biraz daha yavaş dolsun (12)
      const regenRate = isStopped ? 36 : 12;
      cmd.stamina = Math.min(cmd.maxStamina, cmd.stamina + dt * regenRate);
    }

    // Speed calculation
    const baseSpeed = cmd.isMounted ? speedMounted : (cmd.isSprinting ? 200 : 130);
    // Mud / Season penalties
    const weatherMult = this.state.season === 'autumn' ? 0.9 : (this.state.season === 'winter' ? 0.85 : 1.0);
    const targetVx = moveDir * baseSpeed * weatherMult;

    // Smooth, responsive physics: exponential smoothing for organic acceleration and braking without jitter
    const accelRate = (moveDir === 0 && cmd.targetDestinationX === null) ? 28 : 22;
    const accelBlend = 1 - Math.exp(-accelRate * dt);
    cmd.vx += (targetVx - cmd.vx) * accelBlend;

    if (Math.abs(cmd.vx) < 1.5 && moveDir === 0 && cmd.targetDestinationX === null) {
      cmd.vx = 0;
      cmd.isSprinting = false;
      cmd.state = 'idle';
      this.gallopCadenceTimer = 0;
    } else {
      if (moveDir > 0) cmd.facing = 1;
      else if (moveDir < 0) cmd.facing = -1;
      cmd.state = cmd.isSprinting ? 'galloping' : 'walking';
      
      // Rhythmic horse hoof cadence: synchronized with horse gait cycle without random audio bursts
      this.gallopCadenceTimer += dt;
      const cadenceInterval = cmd.isSprinting ? 0.24 : 0.44;
      if (this.gallopCadenceTimer >= cadenceInterval) {
        this.gallopCadenceTimer = 0;
        soundEngine.playGallop();
      }

      // Dynamic running & galloping dust puffs beneath horse hooves
      if (cmd.isSprinting && Math.random() < 0.35) {
        const hoofX = cmd.x - cmd.facing * 18 + (Math.random() - 0.5) * 8;
        const dustCol = this.state.season === 'winter' ? '#e2e8f0' : (this.state.level.id === 2 ? '#991b1b' : '#854d0e');
        this.spawnDebris(hoofX, 439, dustCol, 2);
      } else if (!cmd.isSprinting && Math.random() < 0.08) {
        const hoofX = cmd.x - cmd.facing * 14;
        const dustCol = this.state.season === 'winter' ? '#f1f5f9' : '#a16207';
        this.spawnDebris(hoofX, 439, dustCol, 1);
      }
    }
    cmd.x += cmd.vx * dt;

    // Boundaries: Kumandan sahil kumsalının ucunda durur; denize veya çıkarma gemisine geçemez
    const minX = 290;
    const maxX = this.state.level.worldWidth - 290;
    cmd.x = Math.max(minX, Math.min(maxX, cmd.x));

    // Proximity Wait-To-Gather (Kingdom style intentional harvesting)
    // Standing or waiting near a tree, iron scrap, or chest for ~0.55s harvests it.
    // Galloping or running past will NOT accidentally trigger collection!
    let activeScavengeNear: BuildSlot | null = null;
    for (const slot of this.slots) {
      if (slot.isScavenged || slot.relicClaimed) continue;
      const isScavengeable = slot.type === 'scavenge_iron' || slot.type === 'treasure_chest';
      if (!isScavengeable) continue;

      const dist = Math.abs(slot.x - cmd.x);
      const isClose = (slot.type === 'scavenge_iron' && dist < 52) ||
                      (slot.type === 'treasure_chest' && dist < 48);

      if (isClose) {
        activeScavengeNear = slot;
        break;
      }
    }

    if (activeScavengeNear) {
      // Must be slow or stopped near the resource (not running/galloping away)
      const isSlowOrStopped = Math.abs(cmd.vx) < 110 && !cmd.isSprinting;
      if (isSlowOrStopped) {
        activeScavengeNear.scavengeTimer = (activeScavengeNear.scavengeTimer || 0) + dt;
        cmd.nearScavengeSlotId = activeScavengeNear.id;
        cmd.nearScavengeProgress = Math.min(1, activeScavengeNear.scavengeTimer / 0.55);

        if (activeScavengeNear.scavengeTimer >= 0.55) {
          activeScavengeNear.scavengeTimer = 0;
          cmd.nearScavengeSlotId = null;
          cmd.nearScavengeProgress = 0;
          this.executeSlotAction(activeScavengeNear);
        }
      } else {
        // Slowing down or passing through rapidly - decay timer
        activeScavengeNear.scavengeTimer = Math.max(0, (activeScavengeNear.scavengeTimer || 0) - dt * 2.5);
        cmd.nearScavengeProgress = Math.min(1, activeScavengeNear.scavengeTimer / 0.55);
      }
    } else {
      cmd.nearScavengeSlotId = null;
      cmd.nearScavengeProgress = 0;
      for (const s of this.slots) {
        if (s.scavengeTimer) s.scavengeTimer = 0;
      }
    }

    // Find nearest build slot for interaction (EXCLUDE scavenged, opened chests & claimed relics)
    // Hysteresis threshold: if currently active on a slot, maintain focus until 115px away to prevent jitter/flickering while running
    const currentActive = this.activeSlotNearCommander;
    let bestSlot: BuildSlot | null = null;
    let bestDist = 9999;
    let hqTier = 1;
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].id === 'hq_main') {
        hqTier = this.slots[i].level;
        break;
      }
    }

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      // Exclude already completed / scavenged / claimed slots so they never stay selected!
      if (slot.isScavenged) continue;
      if (slot.relicClaimed) continue;
      if (slot.underConstruction) continue;
      if (slot.type === 'scavenge_wood' && slot.isMarkedForChop) continue;
      if (slot.type === 'armory' && (slot.availableRifles ?? 0) >= (slot.maxRifles ?? 6) && slot.health >= slot.maxHealth) {
        continue;
      }
      if (slot.type === 'assault_banner' && hqTier < 3) {
        continue;
      }

      if (
        slot.level >= slot.maxLevel &&
        slot.health >= slot.maxHealth &&
        slot.type !== 'recruit_camp' &&
        slot.type !== 'headquarters' &&
        slot.type !== 'scavenge_wood' &&
        slot.type !== 'armory' &&
        slot.type !== 'assault_banner' &&
        slot.type !== 'wild_horse' &&
        slot.type !== 'tethered_horse'
      ) {
        continue;
      }

      const dist = Math.abs(slot.x - cmd.x);
      const threshold = (currentActive && currentActive.id === slot.id) ? 115 : 80;

      if (dist <= threshold && dist < bestDist) {
        bestDist = dist;
        bestSlot = slot;
      }
    }
    this.activeSlotNearCommander = bestSlot;

    // Kingdom Refund Mechanic: If commander walks away from a slot before completing deposit, refund the coins back to the ground
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot.type === 'recruit_camp' || slot.type === 'scavenge_wood') continue;
      if (slot.coinsDeposited && slot.coinsDeposited > 0 && !slot.underConstruction) {
        const dist = Math.abs(slot.x - cmd.x);
        if (dist > 115) {
          const refundCount = slot.coinsDeposited;
          slot.coinsDeposited = 0; // Clear immediately so refund triggers only once
          this.spawnGroundCoin(slot.x, refundCount, false, 0.4);
          soundEngine.playCoinPay();
          this.addFloatingText(slot.x, 370, `🪙 ${refundCount} Mecidiye İade Edildi`, '#fbbf24');
        }
      }
    }

    // Manual Hold Interact Logic (Instant trigger on keypress)
    if (this.isHoldingInteract) {
      if (this.sendAssaultSquadToOtherCamp()) {
        this.interactHoldTimer = 0;
        this.isHoldingInteract = false;
      } else if (this.activeSlotNearCommander) {
        this.interactHoldTimer += dt;
        if (this.interactHoldTimer >= 0.22) {
          this.interactHoldTimer = 0;
          this.executeSlotAction(this.activeSlotNearCommander);
        }
      }
    } else {
      this.interactHoldTimer = 0;
    }
  }

  public isSlotBlockedByForest(slot: BuildSlot): boolean {
    if (
      slot.type === 'scavenge_wood' ||
      slot.type === 'scavenge_iron' ||
      slot.type === 'treasure_chest' ||
      slot.type === 'shrine_relic' ||
      slot.type === 'recruit_camp' ||
      slot.type === 'headquarters' ||
      slot.type === 'hospital' ||
      slot.type === 'armory'
    ) {
      return false;
    }

    if (slot.side === 'left') {
      // Is there any uncut tree at or between this slot and the HQ?
      return this.slots.some(
        (s) => s.type === 'scavenge_wood' && s.side === 'left' && !s.isScavenged && s.x >= slot.x - 30
      );
    } else if (slot.side === 'right') {
      // Is there any uncut tree at or between this slot and the HQ?
      return this.slots.some(
        (s) => s.type === 'scavenge_wood' && s.side === 'right' && !s.isScavenged && s.x <= slot.x + 30
      );
    }
    return false;
  }

  public getForestEdges(): { leftForestEdgeX: number; rightForestEdgeX: number } {
    let leftForestEdgeX = 100;
    let rightForestEdgeX = this.state.level.worldWidth - 100;
    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (s.type === 'scavenge_wood' && !s.isScavenged) {
        if (s.side === 'left' && s.x > leftForestEdgeX) leftForestEdgeX = s.x;
        if (s.side === 'right' && s.x < rightForestEdgeX) rightForestEdgeX = s.x;
      }
    }
    return { leftForestEdgeX, rightForestEdgeX };
  }

  public isPositionInForest(x: number): boolean {
    const { leftForestEdgeX, rightForestEdgeX } = this.getForestEdges();
    return x <= leftForestEdgeX || x >= rightForestEdgeX;
  }

  public setTargetDestination(targetWorldX: number, slotId: string | null = null) {
    soundEngine.resume();
    this.commander.targetDestinationX = Math.max(60, Math.min(this.state.level.worldWidth - 60, targetWorldX));
    this.commander.targetSlotId = slotId;
    if (Math.abs(this.commander.targetDestinationX - this.commander.x) > 40) {
      soundEngine.playGallop();
    }
  }

  public advanceToNight() {
    if (this.state.dayProgress < 0.65) {
      this.state.dayProgress = 0.66;
      this.state.timePhase = 'night';
      this.addFloatingText(this.commander.x, 340, 'Gece Taarruzu Başladı! Siperleri Tutun!', '#ef4444');
      soundEngine.playBugleCharge();
    }
  }

  public moveToNearestSlotType(type: SlotType) {
    const candidates = this.slots.filter((s) => {
      if (s.type !== type) return false;
      if (type === 'scavenge_wood' || type === 'scavenge_iron') return !s.isScavenged;
      if (type === 'shrine_relic') return !s.relicClaimed;
      return true;
    });

    if (candidates.length === 0) {
      this.addFloatingText(this.commander.x, 380, 'Bu türde mevcut mevzi bulunamadı', '#94a3b8');
      return;
    }

    // Sort by distance to commander
    candidates.sort((a, b) => Math.abs(a.x - this.commander.x) - Math.abs(b.x - this.commander.x));
    const target = candidates[0];
    this.setTargetDestination(target.x, target.id);
    this.addFloatingText(this.commander.x, 380, `${target.titleTr} Mevzisine Gidiliyor...`, '#38bdf8');
  }

  private updateCamera(dt: number) {
    const halfWidth = this.viewWidth / 2;
    const targetCamX = this.commander.x - halfWidth;
    const maxCamX = Math.max(0, this.state.level.worldWidth - this.viewWidth);
    const clampedCamX = Math.max(0, Math.min(maxCamX, targetCamX));
    // Direct, rock-solid camera tracking centered on commander (Kingdom Classic / Two Crowns style)
    // Eliminates all micro-stutter, frame-rate lag oscillations and screen vibrating during running/sprinting
    this.state.cameraX = clampedCamX;
  }

  // --- Ground Coins Management (Kingdom style) ---

  public spawnGroundCoin(x: number, count = 1, isLoss = false, pickupDelay = 0, targetDir?: number) {
    for (let i = 0; i < count; i++) {
      let vx: number;
      let vy: number;
      if (targetDir !== undefined && targetDir !== 0) {
        vx = targetDir * (70 + Math.random() * 80) + (Math.random() - 0.5) * 20;
        vy = -140 - Math.random() * 60;
      } else {
        const angle = (Math.random() - 0.5) * 1.6;
        const speed = isLoss ? (120 + Math.random() * 140) : (80 + Math.random() * 100);
        vx = Math.sin(angle) * speed;
        vy = -Math.abs(Math.cos(angle)) * speed - 80;
      }
      this.groundCoins.push({
        id: `coin_${this.coinIdCounter++}`,
        x: x + (Math.random() - 0.5) * 6,
        y: 430,
        vx,
        vy,
        bounceCount: 0,
        life: 60, // stays for 60 seconds
        pickupDelay,
      });
    }
  }

  private updateGroundCoins(dt: number) {
    const groundY = 440;
    const cmd = this.commander;
    const hqX = this.state.level.worldWidth / 2;

    // Defense perimeter: coins inside the base perimeter are exclusively for the Commander
    const defSlots = this.slots.filter((s) => s.level > 0 && !s.underConstruction && (s.type === 'trench' || s.type === 'barbed_wire' || s.type === 'machine_gun' || s.type === 'artillery'));
    const leftDefs = defSlots.filter((s) => s.side === 'left');
    const rightDefs = defSlots.filter((s) => s.side === 'right');
    const leftmostDefX = leftDefs.length > 0 ? leftDefs.reduce((min, s) => s.x < min.x ? s : min, leftDefs[0]).x : hqX - 350;
    const rightmostDefX = rightDefs.length > 0 ? rightDefs.reduce((max, s) => s.x > max.x ? s : max, rightDefs[0]).x : hqX + 350;

    for (const coin of this.groundCoins) {
      coin.life -= dt;
      if ((coin as any).pickupDelay && (coin as any).pickupDelay > 0) {
        (coin as any).pickupDelay -= dt;
      }
      coin.vy += 450 * dt; // gravity
      coin.x += coin.vx * dt;
      coin.y += coin.vy * dt;

      // Ground collision and friction
      if (coin.y >= groundY) {
        coin.y = groundY;
        if (Math.abs(coin.vy) > 40) {
          coin.vy = -coin.vy * 0.45;
          coin.vx *= 0.7;
        } else {
          coin.vy = 0;
          coin.vx *= 0.5;
        }
      }

      const canBePickedUp = !(coin as any).pickupDelay || (coin as any).pickupDelay <= 0;

      // Magnetic attraction to Commander when close (Kingdom classic feel)
      // as requested ("sikke için manyetik çekim güzeldi onu geri getir eski haline", "kumandanın zaten manyetik çekimi var")
      const cmdX = cmd.x;
      const cmdY = cmd.y ?? groundY;
      const distToCmd = Math.abs(coin.x - cmdX);
      const dyToCmd = Math.abs(coin.y - cmdY);
      const hasSpace = cmd.mecidiye < cmd.maxMecidiye;
      if (canBePickedUp && hasSpace && distToCmd < 90 && dyToCmd < 65) {
        const pullDir = Math.sign(cmdX - coin.x);
        coin.vx += pullDir * 450 * dt;
      }

      // Commander pickup check (when near coin and pouch has room)
      if (canBePickedUp && distToCmd < 34 && dyToCmd < 38) {
        if (hasSpace) {
          cmd.mecidiye += 1;
          this.state.totalMecidiyeEarned += 1;
          coin.life = 0; // mark collected
          soundEngine.playCoinCollect();
          continue;
        }
      }

      // Friendly soldiers pick up ground coins (Kingdom Classic mechanic)
      // CRITICAL RULES to prevent continuous coin pickup loops and phantom sounds:
      // 1. If Commander is nearby (distToCmd < 90), Commander has absolute priority!
      // 2. Soldiers NEVER pick up coins that are inside the base/Karargâh perimeter! All coins at base are for the Commander.
      // 3. Only active daytime hunters outside base can pick up coins (no recruits, engineers, or garrisoned troops).
      // 4. Sound effect only plays if near Commander/Camera so player doesn't hear distant pickups ("ben ilerdeyken").
      const isCoinInsideBase = (coin.x >= leftmostDefX - 30 && coin.x <= rightmostDefX + 30);
      if (canBePickedUp && coin.life > 0 && distToCmd >= 90 && !isCoinInsideBase) {
        for (const soldier of this.soldiers) {
          if (
            soldier.health > 0 &&
            soldier.state !== 'dying' &&
            (soldier.role === 'infantry' || soldier.role === 'sniper') &&
            !soldier.assignedSlotId &&
            !soldier.isRetinue &&
            !soldier.isAssaultSquad
          ) {
            const sY = soldier.y ?? groundY;
            const distToSoldier = Math.abs(coin.x - soldier.x);
            const dyToSoldier = Math.abs(coin.y - sY);
            const maxCarry = soldier.role === 'sniper' ? 12 : (soldier.role === 'infantry' ? 8 : 4);
            const canCarry = (!soldier.coinsHeld || soldier.coinsHeld < maxCarry);

            // Magnetic attraction towards friendly soldier
            if (canCarry && distToSoldier < 65 && dyToSoldier < 45) {
              const pullDir = Math.sign(soldier.x - coin.x);
              coin.vx += pullDir * 350 * dt;
            }

            // Coin pickup by friendly soldier
            if (canCarry && distToSoldier < 28 && dyToSoldier < 35) {
              soldier.coinsHeld = (soldier.coinsHeld || 0) + 1;
              coin.life = 0; // mark collected
              // Spatial audio: only play sound if within audible range of the commander/camera
              if (Math.abs(soldier.x - cmd.x) < 600) {
                soundEngine.playCoin();
              }
              this.addFloatingText(soldier.x, sY - 32, `🪙 +1 (${soldier.coinsHeld})`, '#fbbf24');
              break;
            }
          }
        }
      }

      // Marching enemies steal ground coins if they walk directly over them
      if (canBePickedUp && coin.life > 0) {
        for (const enemy of this.enemies) {
          if (enemy.health > 0 && Math.abs(coin.x - enemy.x) < 22 && Math.abs(coin.y - (enemy.y || groundY)) < 30) {
            enemy.coinsHeld = (enemy.coinsHeld || 0) + 1;
            coin.life = 0;
            this.addFloatingText(enemy.x, (enemy.y || groundY) - 30, '🪙 Düşman Sikkeyi Çaldı!', '#ef4444');
            soundEngine.playCoinPay();
            break;
          }
        }
      }
    }

    // Tick pickup delay on ground coins
    for (const coin of this.groundCoins) {
      if ((coin as any).pickupDelay && (coin as any).pickupDelay > 0) {
        (coin as any).pickupDelay -= dt;
      }
    }

    let coinWrite = 0;
    for (let i = 0; i < this.groundCoins.length; i++) {
      const c = this.groundCoins[i];
      if (c.life > 0) {
        this.groundCoins[coinWrite++] = c;
      }
    }
    this.groundCoins.length = coinWrite;
  }

  // --- Wild Animals Simulation & Daytime Hunting ---

  private updateAnimals(dt: number) {
    const gY = 440;
    const cmd = this.commander;
    const isDay = this.state.timePhase === 'day' || this.state.timePhase === 'dawn' || this.state.timePhase === 'dusk';

    for (const animal of this.animals) {
      animal.y = gY;
      animal.hopTimer += dt * (animal.state === 'fleeing' ? 8 : 3);

      const distToCmd = Math.abs(animal.x - cmd.x);
      const fleeRadius = animal.type === 'deer' ? 160 : (animal.type === 'rabbit' ? 100 : 80);

      // Flee from commander if too close
      if (distToCmd < fleeRadius) {
        animal.state = 'fleeing';
        animal.fleeTimer = 3.0;
        animal.facing = animal.x > cmd.x ? 1 : -1;
      } else if (animal.fleeTimer > 0) {
        animal.fleeTimer -= dt;
        if (animal.fleeTimer <= 0) {
          animal.state = Math.random() < 0.6 ? 'grazing' : 'wandering';
        }
      } else {
        // Random grazing / wandering behaviors
        if (Math.random() < 0.02) {
          animal.state = Math.random() < 0.6 ? 'grazing' : 'wandering';
          if (Math.random() < 0.3) animal.facing = animal.facing === 1 ? -1 : 1;
        }
      }

      // Movement physics
      if (animal.state === 'fleeing') {
        const speed = animal.type === 'deer' ? 140 : (animal.type === 'rabbit' ? 110 : 85);
        animal.x += animal.facing * speed * dt;
      } else if (animal.state === 'wandering') {
        const speed = animal.type === 'deer' ? 30 : (animal.type === 'rabbit' ? 20 : 15);
        animal.x += animal.facing * speed * dt;
      }

      // World boundaries: Hiçbir canlı denize geçemez (kumsal sınırında geri döner)
      // User: "kumandan geçmiyor evet denize ama hayvanlar geçiyor hiçbir canlı geçmesin denize"
      const minX = 310;
      const maxX = this.state.level.worldWidth - 310;
      if (animal.x < minX) {
        animal.x = minX;
        animal.facing = 1;
      } else if (animal.x > maxX) {
        animal.x = maxX;
        animal.facing = -1;
      }

      // Soldier Hunting AI: friendly armed soldiers aim rifle before firing at roaming animals in range
      if (animal.health > 0) {
        for (const soldier of this.soldiers) {
          // Unarmed soldiers (recruits, medics) cannot hunt! Only armed infantry & snipers can hunt with rifles
          const isArmed = soldier.role === 'infantry' || soldier.role === 'sniper';
          if (isArmed && soldier.state !== 'digging' && soldier.state !== 'dying') {
            const dist = Math.abs(soldier.x - animal.x);
            const huntRange = soldier.role === 'sniper' ? 450 : 220;
            if (dist < huntRange) {
              soldier.facing = animal.x > soldier.x ? 1 : -1;
              if (soldier.huntAimTargetId !== animal.id) {
                soldier.huntAimTargetId = animal.id;
                soldier.huntAimTimer = 0;
              }
              soldier.huntAimTimer = (soldier.huntAimTimer || 0) + dt;
              const aimRequired = soldier.role === 'sniper' ? 0.65 : 0.45;

              if (soldier.huntAimTimer < aimRequired) {
                // Raise rifle and take aim first!
                soldier.state = 'aiming';
                soldier.weaponState = 'ready_aim';
                break;
              }

              if (soldier.attackCooldown <= 0) {
                soldier.huntAimTimer = 0;
                soldier.attackCooldown = soldier.role === 'sniper' ? 1.8 : 1.2;
                soldier.state = 'shooting';
                soldier.weaponState = 'firing';
                soundEngine.playGunshot(false);

                // Spawn bullet accurately directed towards animal
                const startX = soldier.x + soldier.facing * 18;
                const startY = (soldier.y || gY) - 20;
                const targetX = animal.x;
                const targetY = (animal.y || gY) - 14;
                const dx = targetX - startX;
                const dy = targetY - startY;
                const dist = Math.hypot(dx, dy) || 1;

                this.spawnProjectile({
                  id: `hunt_${this.projIdCounter++}`,
                  x: startX,
                  y: startY,
                  vx: (dx / dist) * 820,
                  vy: (dy / dist) * 820,
                  type: 'bullet',
                  damage: soldier.role === 'sniper' ? 45 : 20,
                  radius: 4,
                  source: 'soldier',
                  life: 1.2,
                });
                break;
              }
            }
          }
        }
      }

      // Check bullet collisions with animals
      for (const p of this.projectiles) {
        if ((p.type === 'bullet' || p.type === 'tracer') && p.source === 'soldier' && p.life > 0) {
          const animalTop = (animal.y || gY) - 28;
          const animalBottom = (animal.y || gY) + 12;
          if (Math.abs(p.x - animal.x) < 24 && p.y >= animalTop && p.y <= animalBottom) {
            p.life = 0;
            animal.health -= p.damage;
            this.spawnBlood(animal.x, gY - 10, 3);
            animal.state = 'fleeing';
            animal.fleeTimer = 4.0;

            if (animal.health <= 0) {
              this.onAnimalHunted(animal);
              break;
            }
          }
        }
      }
    }

    this.animals = this.animals.filter((a) => a.health > 0);

    // Dynamic Wildlife Respawning in Active Forest Areas (Kingdom style renewable hunting economy)
    if (isDay && this.animals.length < 8) {
      const leftTrees = this.slots.filter((s) => s.type === 'scavenge_wood' && s.side === 'left' && !s.isScavenged);
      const rightTrees = this.slots.filter((s) => s.type === 'scavenge_wood' && s.side === 'right' && !s.isScavenged);

      // Only spawn if there is still standing forest
      if ((leftTrees.length > 0 || rightTrees.length > 0) && Math.random() < 0.12 * dt) {
        const side = leftTrees.length > 0 && rightTrees.length > 0 ? (Math.random() < 0.5 ? 'left' : 'right') : (leftTrees.length > 0 ? 'left' : 'right');
        const treePool = side === 'left' ? leftTrees : rightTrees;
        const randomTree = treePool[Math.floor(Math.random() * treePool.length)];

        const leftCamp = this.landingCamps.find((c) => c.side === 'left');
        const rightCamp = this.landingCamps.find((c) => c.side === 'right');
        const safeMinX = (leftCamp && !leftCamp.isDestroyed) ? leftCamp.x + 800 : 380;
        const safeMaxX = (rightCamp && !rightCamp.isDestroyed) ? rightCamp.x - 800 : this.state.level.worldWidth - 380;

        const types: ('rabbit' | 'deer' | 'partridge')[] = ['rabbit', 'rabbit', 'deer', 'partridge'];
        const type = types[Math.floor(Math.random() * types.length)];
        const bounty = type === 'deer' ? 4 : (type === 'rabbit' ? 1 : 2);
        const health = type === 'deer' ? 35 : (type === 'rabbit' ? 10 : 15);

        const spawnX = Math.max(safeMinX, Math.min(safeMaxX, randomTree.x + (Math.random() - 0.5) * 80));

        this.animals.push({
          id: `animal_${this.animalIdCounter++}`,
          x: spawnX,
          y: gY,
          vx: 0,
          type,
          health,
          maxHealth: health,
          bountyMecidiye: bounty,
          facing: side === 'left' ? 1 : -1,
          state: 'wandering',
          hopTimer: Math.random() * 5,
          fleeTimer: 0,
        });
      }
    }
  }

  private onAnimalHunted(animal: WildAnimal) {
    const animalName = animal.type === 'deer' ? 'Gelibolu Karacası' : (animal.type === 'rabbit' ? 'Tavşan' : 'Keklik');
    
    // Spawn ground coin directly at the hunted animal's position (Kingdom style magnetic pickup!)
    this.spawnGroundCoin(animal.x, animal.bountyMecidiye);
    this.addFloatingText(animal.x, 390, `+${animal.bountyMecidiye} Sikke (${animalName} Avlandı!)`, '#4ade80');
    soundEngine.playCoin();
    this.spawnDebris(animal.x, 435, '#854d0e', 6);
  }

  // --- Building & Economy Interactions ---

  public executeSlotAction(slot: BuildSlot) {
    const cmd = this.commander;

    if (this.state.inGameTutorial?.enabled) {
      if (this.state.inGameTutorial.step === 'buy_rifle' && slot.type === 'armory') {
        this.state.inGameTutorial.isStepCompleted = true;
        this.state.inGameTutorial.stepTimer = 0;
      }
      if (this.state.inGameTutorial.step === 'recruit_soldier' && slot.type === 'recruit_camp') {
        this.state.inGameTutorial.isStepCompleted = true;
        this.state.inGameTutorial.stepTimer = 0;
      }
      if (this.state.inGameTutorial.step === 'chop_tree' && slot.type === 'scavenge_wood') {
        this.state.inGameTutorial.isStepCompleted = true;
        this.state.inGameTutorial.stepTimer = 0;
      }
      if (this.state.inGameTutorial.step === 'build_trench' && slot.type === 'trench') {
        this.state.inGameTutorial.isStepCompleted = true;
        this.state.inGameTutorial.stepTimer = 0;
      }
      if (this.state.inGameTutorial.step === 'build_wire' && slot.type === 'barbed_wire') {
        this.state.inGameTutorial.isStepCompleted = true;
        this.state.inGameTutorial.stepTimer = 0;
      }
    }

    // 0. Cancel active construction if currently under construction (Refunds 50% of cost)
    if (slot.underConstruction) {
      slot.underConstruction = false;
      slot.constructionProgress = 0;
      const refund = Math.floor(slot.costMecidiye * 0.5);
      if (refund > 0) {
        this.spawnGroundCoin(slot.x, refund);
        this.addFloatingText(slot.x, 360, `İnşaat Durduruldu! (${refund} Sikke İade)`, '#f87171');
      } else {
        this.addFloatingText(slot.x, 360, 'İnşaat Durduruldu!', '#f87171');
      }
      soundEngine.playDigOrChop('hammer');
      this.recheckSoldierAssignments();
      return;
    }

    // 1. Relic Shrines (8 Coins to unlock, deposited 1 by 1)
    if (slot.type === 'shrine_relic' && slot.level === 1) {
      if (cmd.mecidiye >= 1 && (slot.coinsDeposited || 0) < 8) {
        cmd.mecidiye -= 1;
        slot.coinsDeposited = (slot.coinsDeposited || 0) + 1;
        soundEngine.playCoinPay();
        
        if (slot.coinsDeposited >= 8) {
          slot.level = 2; // Unlocked!
          slot.coinsDeposited = 0;
          this.state.relicsCollected.push(slot.id);
          soundEngine.playVictoryFanfare();
          this.applyRelicPerk(slot.id);
        }
      } else if ((slot.coinsDeposited || 0) >= 8) {
         // Already unlocked
      } else {
        this.addFloatingText(slot.x, 380, 'Eksik Sikke!', '#ef4444');
      }
      return;
    }

    // 2. Abandoned Treasure Chests (Keşif Hazine Sandığı -> Free / +6-8 Mecidiye!)
    if (slot.type === 'treasure_chest' && !slot.isScavenged) {
      slot.isScavenged = true;
      const coinCount = slot.id.includes('2') ? 8 : 6;
      soundEngine.playChestOpen();
      this.spawnGroundCoin(slot.x, coinCount);
      this.addFloatingText(slot.x, 360, `🎁 Hazine Sandığı Açıldı! +${coinCount} Sikke!`, '#fbbf24');
      this.spawnDebris(slot.x, 430, '#f59e0b', 14);
      return;
    }

    // 3. Resource Harvesting: Tree Cutting (Kingdom style: 1 Coin deposited to mark tree for felling by a free soldier)
    if (slot.type === 'scavenge_wood') {
      if (slot.isScavenged) return;
      if (slot.isMarkedForChop) {
        this.addFloatingText(slot.x, 380, 'Ağaç Zaten İşaretlendi! Mehmetçik Yolda...', '#38bdf8');
        return;
      }

      if (cmd.mecidiye >= 1) {
        cmd.mecidiye -= 1;
        slot.coinsDeposited = 1;
        slot.isMarkedForChop = true;
        slot.chopProgress = 0;
        slot.assignedWoodcutterId = null;
        soundEngine.playCoinPay();
        this.spawnDebris(slot.x, 420, '#fbbf24', 4);
        this.addFloatingText(slot.x, 370, '🪓 Ağaç İşaretlendi! Mehmetçik Geliyor...', '#fbbf24');
        this.assignWoodcutterToTree(slot);
        this.recheckSoldierAssignments();
      } else {
        this.addFloatingText(slot.x, 380, 'Ağaç Kesimi İçin 1 Sikke Gerekli', '#ef4444');
      }
      return;
    }

    if (slot.type === 'scavenge_iron' && !slot.isScavenged) {
      slot.isScavenged = true;
      soundEngine.playDigOrChop('pickaxe');
      this.spawnDebris(slot.x, 430, '#475569', 14);
      this.spawnGroundCoin(slot.x, 4);
      this.addFloatingText(slot.x, 370, '📦 Mühimmat Enkazı Açıldı! (+4 Sikke)', '#38bdf8');
      return;
    }

    // 4. Recruitment Camp (Kingdom style: 1 Coin -> 1 Volunteer recruit from camp, max 2 coins deposited)
    // User: "köyden çıkacak askerler bitince köye sikke bırakılamasın"
    if (slot.type === 'recruit_camp') {
      const maxQuota = slot.maxRecruitsTotal ?? (this.state.level.id === 1 ? 16 : this.state.level.id === 2 ? 13 : this.state.level.id === 3 ? 11 : 9);
      const spawnedTotal = slot.recruitsSpawnedTotal ?? 0;
      const recruits = slot.availableRecruits ?? 0;

      // When the village quota is fully exhausted and no recruits remain
      if (spawnedTotal >= maxQuota && recruits <= 0) {
        this.addFloatingText(slot.x, 370, '🛑 Köy Nüfusu Tükendi! Sikke Bırakılamaz', '#ef4444');
        return;
      }

      if (recruits <= 0) {
        // Stop accepting coins if pre-deposited coins + spawned total would exceed quota
        if (spawnedTotal + (slot.coinsDeposited || 0) >= maxQuota) {
          this.addFloatingText(slot.x, 370, '🛑 Köyün Kalan Nüfus Sınırına Ulaşıldı', '#f59e0b');
          return;
        }
        if (cmd.mecidiye >= 1 && (slot.coinsDeposited || 0) < 2) {
          cmd.mecidiye -= 1;
          slot.coinsDeposited = (slot.coinsDeposited || 0) + 1;
          soundEngine.playCoinPay();
          this.spawnDebris(slot.x, 430, '#fbbf24', 5);
        }
        return;
      }

      if (cmd.mecidiye >= slot.costMecidiye) {
        cmd.mecidiye -= slot.costMecidiye;
        slot.availableRecruits = Math.max(0, recruits - 1);
        slot.recruitsSpawnedTotal = (slot.recruitsSpawnedTotal || 0) + 1;
        soundEngine.playCoinPay();
        const jitterX = (Math.random() - 0.5) * 24;
        const soldier = this.spawnSoldier('recruit', slot.x + jitterX, null);
        // Auto-assign keeps them as recruit so they seek a rifle from the armory!
        this.autoAssignSoldier(soldier);

        const remainingTotal = maxQuota - (slot.recruitsSpawnedTotal || 0);
        if (remainingTotal <= 0 && slot.availableRecruits <= 0) {
          this.addFloatingText(slot.x, 370, '🪖 Köyün Son Gönüllüsü Orduya Katıldı! Nüfus Tükendi', '#eab308');
        }
      }
      return;
    }

    // 4.1 Armory Rifle Bench (Tüfek Tezgahı: 2 Sikke -> 1 Mauser Tüfeği Bırak, Maksimum 6)
    if (slot.type === 'armory') {
      const currentRifles = slot.availableRifles ?? 0;
      const maxR = slot.maxRifles ?? 6;
      if (currentRifles >= maxR) {
        return;
      }

      if (cmd.mecidiye >= 1) {
        cmd.mecidiye -= 1;
        slot.coinsDeposited = (slot.coinsDeposited || 0) + 1;
        soundEngine.playCoinPay();

        if (slot.coinsDeposited >= 2) {
          slot.coinsDeposited = 0;
          slot.availableRifles = currentRifles + 1;
          soundEngine.playReload();
          this.spawnDebris(slot.x - 26, 420, '#d97706', 7);
          this.spawnDebris(slot.x - 26, 420, '#64748b', 6);
          this.recheckSoldierAssignments();
        }
      }
      return;
    }

    // 4.5 Assault Banners (4 Coins -> Equip idle volunteer or leave armor on stand, max 4 per side)
    if (slot.type === 'assault_banner') {
      const hq = this.slots.find((s) => s.id === 'hq_main');
      if (!hq || hq.level < 3) {
        this.addFloatingText(slot.x, 380, '🏰 Önce Karargahı 3. Seviye Taş Tabyaya Yükseltmelisiniz!', '#eab308');
        return;
      }

      const side = (slot.side as 'left' | 'right') || 'left';
      const currentAssaultCount = this.soldiers.filter((s) => s.isAssaultSquad && s.assaultSide === side && s.health > 0).length;
      const walkingCount = this.soldiers.filter((s) => s.targetEquipSlotId === slot.id && s.health > 0).length;
      const armorsOnStand = slot.availableAssaultArmors || 0;
      if (currentAssaultCount + walkingCount + armorsOnStand >= 4) {
        this.addFloatingText(slot.x, 380, `⚔️ ${side === 'left' ? 'Sol' : 'Sağ'} Taarruz Kıtası ve Zırh Sehpası Dolu (Azami 4)!`, '#f59e0b');
        return;
      }

      if (cmd.mecidiye >= 1 && (slot.coinsDeposited || 0) < 4) {
        cmd.mecidiye -= 1;
        slot.coinsDeposited = (slot.coinsDeposited || 0) + 1;
        soundEngine.playCoinPay();

        if (slot.coinsDeposited >= 4) {
          slot.coinsDeposited = 0;
          slot.availableAssaultArmors = (slot.availableAssaultArmors || 0) + 1;
          soundEngine.playArmorEquip();

          // Check if an unassigned soldier or recruit is available to equip the armor immediately
          const assignedCandidate = this.soldiers.find((s) => s.health > 0 && !s.targetEquipSlotId && !s.isAssaultSquad && (s.role === 'recruit' || (!s.assignedSlotId && !s.isRetinue && !s.targetTreeId && !s.isArtilleryCrew))) ||
                                    this.soldiers.find((s) => s.health > 0 && !s.targetEquipSlotId && !s.isAssaultSquad && !s.isRetinue && !s.isArtilleryCrew);
          if (assignedCandidate) {
            // Order the soldier to walk directly to the assault banner stand to equip armor!
            assignedCandidate.targetEquipSlotId = slot.id;
            if (assignedCandidate.assignedSlotId) {
              const oldSlot = this.slots.find((s) => s.id === assignedCandidate.assignedSlotId);
              if (oldSlot) {
                oldSlot.assignedSoldierIds = oldSlot.assignedSoldierIds.filter((id) => id !== assignedCandidate.id);
              }
              assignedCandidate.assignedSlotId = null;
            }
            assignedCandidate.targetTreeId = null;
            assignedCandidate.state = 'walking';
            assignedCandidate.facing = (assignedCandidate.x < slot.x ? 1 : -1) as 1 | -1;

            soundEngine.playAssaultShout();
            this.addFloatingText(assignedCandidate.x, 370, '🛡️ Taarruz Zırhını Kuşanmaya Gidiyor...', '#fde047');
            this.addFloatingText(slot.x, 350, `🇹🇷 ${side === 'left' ? 'Sol' : 'Sağ'} Taarruz Zırhı Hazırlandı! (${currentAssaultCount + walkingCount + armorsOnStand + 1}/4)`, '#4ade80');
          } else {
            // Armor rests on the stand waiting for recruits! Cephanelikteki gibi!
            this.addFloatingText(slot.x, 350, `🛡️ Taarruz Zırhı Sehpaya Bırakıldı! (${slot.availableAssaultArmors}/4) Boş nefer gelince kuşanacak`, '#fbbf24');
          }
          this.recheckSoldierAssignments();
        }
      } else if ((slot.coinsDeposited || 0) < 4) {
        this.addFloatingText(slot.x, 380, 'Eksik Sikke! (4 Sikke Gerekli)', '#ef4444');
      }
      return;
    }

    // 4.6 Headquarters Max Level Info (Directs player to the Left / Right Banners)
    if (slot.id === 'hq_main' && slot.level >= slot.maxLevel) {
      this.addFloatingText(slot.x, 380, '🏰 Karargah Azami Seviyede! Sol veya Sağ Sancaktan Taarruz Akıncısı Donatın (4🪙)', '#38bdf8');
      return;
    }

    // 4.65 Sahra Topçu Atölyesi (Workshop: Level 0 -> Build with 4 coins if HQ Tier 3. Level 1 -> Deposit 8 coins to forge mobile 75mm Field Artillery)
    if (slot.type === 'artillery_workshop') {
      const hq = this.slots.find((s) => s.id === 'hq_main');
      if (slot.level === 0) {
        if (!hq || hq.level < 3) {
          this.addFloatingText(slot.x, 380, '🏰 Sahra Topçu Atölyesi İçin Karargâh 3. Seviye Olmalıdır!', '#eab308');
          return;
        }

        if (cmd.mecidiye >= 1 && (slot.coinsDeposited || 0) < slot.costMecidiye) {
          cmd.mecidiye -= 1;
          slot.coinsDeposited = (slot.coinsDeposited || 0) + 1;
          soundEngine.playCoinPay();

          if (slot.coinsDeposited >= slot.costMecidiye) {
            slot.coinsDeposited = 0;
            slot.underConstruction = true;
            slot.constructionProgress = 0;
            slot.constructionDuration = 4.0;
            soundEngine.playHammer('wood');
            this.addFloatingText(slot.x, 370, '🔨 Sahra Topçu Atölyesi İnşası Başladı!', '#38bdf8');
          }
        } else if ((slot.coinsDeposited || 0) < slot.costMecidiye) {
          this.addFloatingText(slot.x, 380, `Eksik Sikke! (${slot.costMecidiye} Sikke Gerekli)`, '#ef4444');
        }
        return;
      }

      // Level 1: Forge 75mm Krupp Sahra Topu with 8 coins!
      if (slot.level >= 1) {
        const side = (slot.side as 'left' | 'right') || 'left';
        const existingActiveArt = this.fieldArtilleries.find((fa) => fa.side === side && fa.health > 0);
        if (existingActiveArt) {
          this.addFloatingText(slot.x, 380, `⚙️ ${side === 'left' ? 'Sol' : 'Sağ'} Sahra Topu Bataryası Zaten Mevzide!`, '#f59e0b');
          return;
        }

        if (cmd.mecidiye >= 1 && (slot.coinsDeposited || 0) < 8) {
          cmd.mecidiye -= 1;
          slot.coinsDeposited = (slot.coinsDeposited || 0) + 1;
          soundEngine.playCoinPay();

          if (slot.coinsDeposited >= 8) {
            slot.coinsDeposited = 0;
            const artId = `field_art_${this.artIdCounter++}`;
            const targetCamp = this.landingCamps.find((c) => c.side === side && !c.isDestroyed) || this.landingCamps.find((c) => !c.isDestroyed);
            const newArt: FieldArtillery = {
              id: artId,
              x: slot.x,
              y: 440,
              facing: side === 'left' ? -1 : 1,
              side,
              health: 1200,
              maxHealth: 1200,
              crewSoldierIds: [],
              targetCampId: targetCamp ? targetCamp.id : null,
              state: 'idle',
              reloadCooldown: 0,
              speed: 38,
              wheelRotation: 0,
            };

            // Check if there are unassigned assault soldiers on this side to crew it immediately!
            const availableAssaults = this.soldiers.filter((s) => s.isAssaultSquad && s.assaultSide === side && !s.isArtilleryCrew && s.health > 0);
            for (let i = 0; i < Math.min(2, availableAssaults.length); i++) {
              const sol = availableAssaults[i];
              newArt.crewSoldierIds.push(sol.id);
              sol.isArtilleryCrew = true;
              sol.artilleryId = newArt.id;
            }

            this.fieldArtilleries.push(newArt);
            soundEngine.playHammer('metal');
            soundEngine.playConstructionFinish();
            this.spawnDebris(slot.x, 430, '#d97706', 15);
            this.spawnDebris(slot.x, 430, '#1e293b', 12);
            this.addFloatingText(slot.x, 360, '💥 75mm Krupp Sahra Topu Döküldü!', '#facc15');
            if (newArt.crewSoldierIds.length < 2) {
              this.addFloatingText(slot.x, 340, '🪖 Karargâhtan Taarruz Akıncısı Donatarak Mürettebatı Tamamlayın! (2 Nefer)', '#38bdf8');
            } else {
              this.addFloatingText(slot.x, 340, '🪖 2 Akıncı Top Başı Yaptı! Batarya İleri!', '#4ade80');
            }
          }
        } else if ((slot.coinsDeposited || 0) < 8) {
          this.addFloatingText(slot.x, 380, 'Top Bataryası Dökümü İçin 8 Sikke Gerekli', '#ef4444');
        }
        return;
      }
    }

    // 4.7 Wild Horse Taming (7 Coins) & Tethered Horse Mounting (4 Coins)
    if (slot.type === 'wild_horse' || slot.type === 'tethered_horse') {
      const requiredCoins = slot.costMecidiye || (slot.type === 'wild_horse' ? 7 : 4);
      if (cmd.mecidiye >= 1 && (slot.coinsDeposited || 0) < requiredCoins) {
        cmd.mecidiye -= 1;
        slot.coinsDeposited = (slot.coinsDeposited || 0) + 1;
        soundEngine.playCoinPay();

        if (slot.coinsDeposited >= requiredCoins) {
          slot.coinsDeposited = 0;
          const oldMount = cmd.mountType || 'white';
          const oldX = cmd.x;

          // Mount the new horse
          cmd.mountType = slot.horseType || 'brown';
          cmd.isMounted = true;

          // Leave the old horse tethered at the previous position
          this.slots.push({
            id: `tethered_horse_${Date.now()}`,
            x: oldX,
            type: 'tethered_horse',
            level: 1,
            maxLevel: 1,
            health: 100,
            maxHealth: 100,
            side: 'center',
            costMecidiye: 4,
            horseType: oldMount,
            upgradeDescription: '4 Sikke ödeyerek bu sahipsiz ata tekrar binebilirsiniz.',
            titleTr: oldMount === 'brown' ? '🐎 Sahipsiz Yağız At (Hızlı)' : (oldMount === 'black' ? '🐎 Sahipsiz Siyah Karayel At (Dayanıklı)' : '🐎 Sahipsiz Kır At'),
            assignedSoldierIds: [],
            maxSoldiers: 0,
          });

          // Remove the slot that was mounted
          this.slots = this.slots.filter((s) => s.id !== slot.id);

          soundEngine.playGallop();
          this.spawnDebris(cmd.x, 430, '#fbbf24', 10);
          this.addFloatingText(
            cmd.x,
            360,
            `🐎 ${cmd.mountType === 'brown' ? 'Hızlı Yağız' : (cmd.mountType === 'black' ? 'Dayanıklı Karayel' : 'Aydınlık Kır')} Ata Binildi!`,
            '#f59e0b'
          );
        }
      } else if ((slot.coinsDeposited || 0) < requiredCoins) {
        this.addFloatingText(slot.x, 380, `Eksik Sikke! (${requiredCoins} Sikke Gerekli)`, '#ef4444');
      }
      return;
    }

    // Check if slot is blocked by surrounding uncleared forest trees!
    if (this.isSlotBlockedByForest(slot)) {
      soundEngine.playDigOrChop('wood');
      this.addFloatingText(slot.x, 380, '🌲 Bu mevzi orman içinde! Önce ağaçları kesmelisin.', '#eab308');
      return;
    }

    // 5. Damaged Structure Repair (Requires 1 Mecidiye coin to dispatch daytime repair crews)
    if (slot.level > 0 && slot.health < slot.maxHealth) {
      if ((slot.repairCoinsDeposited || 0) >= 1) {
        this.addFloatingText(slot.x, 380, '🛠️ Onarım Emri Zaten Verildi! Gündüz Neferler Onarıyor', '#38bdf8');
        return;
      }
      if (cmd.mecidiye >= 1) {
        cmd.mecidiye -= 1;
        slot.repairCoinsDeposited = 1;
        soundEngine.playCoinPay();
        this.addFloatingText(slot.x, 360, '🪙 Onarım Emri Verildi! Neferler Tamire Başlıyor', '#38bdf8');
        this.recheckSoldierAssignments();
      } else {
        this.addFloatingText(slot.x, 380, 'Eksik Sikke! (Onarım İçin 1 Sikke Gerekli)', '#ef4444');
      }
      return;
    }

    // 6. Upgrading Slots with Timed Construction (Kingdom-Style Coin Deposit System for healthy structures)
    if (slot.level < slot.maxLevel) {
      if (slot.underConstruction) {
        this.addFloatingText(slot.x, 380, 'İnşaat Devam Ediyor...', '#38bdf8');
        return;
      }

      const targetCoins = slot.costMecidiye;
      if (cmd.mecidiye >= 1 && (slot.coinsDeposited || 0) < targetCoins) {
        cmd.mecidiye -= 1;
        slot.coinsDeposited = (slot.coinsDeposited || 0) + 1;
        soundEngine.playCoinPay();

        // If the final coin has been placed into the socket
        if (slot.coinsDeposited >= targetCoins) {
          slot.coinsDeposited = 0;
          slot.underConstruction = true;
          slot.constructionProgress = 0;
          
          let buildSecs = 6 + slot.level * 4;
          if (slot.type === 'trench') buildSecs = 8 + slot.level * 5;
          else if (slot.type === 'machine_gun') buildSecs = 10 + slot.level * 6;
          else if (slot.type === 'artillery') buildSecs = 14 + slot.level * 8;
          else if (slot.type === 'watchtower') buildSecs = 10 + slot.level * 5;
          else if (slot.type === 'headquarters' || slot.type === 'hospital' || (slot.type as string) === 'armory') buildSecs = 12 + slot.level * 6;

          slot.constructionDuration = buildSecs; // Kingdom-style laborious construction requiring engineer/soldier help

          soundEngine.playDigOrChop('hammer');
          this.addFloatingText(slot.x, 360, `${slot.titleTr} İnşaatı Başladı!`, '#f59e0b');
          this.spawnDebris(slot.x, 430, '#eab308', 8);

          // Notify engineers
          this.recheckSoldierAssignments();
        }
      } else if ((slot.coinsDeposited || 0) < targetCoins) {
        this.addFloatingText(slot.x, 380, 'Eksik Sikke!', '#ef4444');
      }
    }
  }

  private applyRelicPerk(relicId: string) {
    if (relicId.includes('statue_health')) {
      // Hilal-i Ahmer Metanet Yadigârı: Bütün Mehmetçikleri ve kumandanı iyileştir ve azami canı %40 artır
      this.soldiers.forEach((s) => {
        s.maxHealth = Math.round(s.maxHealth * 1.4);
        s.health = s.maxHealth;
        this.spawnBlood(s.x, s.y || 440, 6); // visual burst
      });
      this.commander.maxHealth = Math.min(10, this.commander.maxHealth + 2);
      this.commander.health = this.commander.maxHealth;
    } else if (relicId.includes('statue_damage')) {
      // 57. Alay Şüheda Sancağı: Askerlerin mermileri güçlendi ve izli mermi kazandı
      this.soldiers.forEach((s) => {
        s.moraleBuffTimer = 9999;
      });
    } else if (relicId.includes('statue_defense')) {
      // Mecidiye Tabyası İstihkâm Yadigârı: Tüm mevzi ve binaların azami canını %50 artır ve eksiksiz doldur/onar
      this.slots.forEach((s) => {
        if (s.type !== 'shrine_relic' && s.type !== 'recruit_camp' && s.type !== 'scavenge_wood' && s.type !== 'scavenge_iron' && s.type !== 'treasure_chest') {
          if (!(s as any).relicBuffedDefense) {
            s.maxHealth = Math.round(s.maxHealth * 1.5);
            (s as any).relicBuffedDefense = true;
          }
          // Binaların canını yeni azami canına eşitle (hasar barı veya tamir yuvası açılmaz)
          s.health = s.maxHealth;
        }
      });
    }
  }

  private autoAssignSoldier(soldier: Soldier) {
    // If the soldier is already firmly stationed in an active defensive position, never remove them!
    // They only leave if their defensive structure is destroyed.
    if (soldier.assignedSlotId) {
      const currentSlot = this.slots.find((s) => s.id === soldier.assignedSlotId);
      if (currentSlot && currentSlot.level > 0 && currentSlot.health > 0) {
        return;
      }
    }

    // Unarmed recruits cannot be assigned to combat defense until they pick up a rifle from the Armory!
    if (soldier.role === 'recruit') {
      soldier.assignedSlotId = null;
      return;
    }

    const hqX = this.state.level.worldWidth / 2;

    // 1. Headquarters Garrison (Tier 3 allows 2 elite guards)
    const hq = this.slots.find((s) => s.id === 'hq_main' && s.level === 3 && s.assignedSoldierIds.length < (s.maxSoldiers || 2));
    if (hq) {
      soldier.role = 'infantry';
      soldier.assignedSlotId = hq.id;
      hq.assignedSoldierIds.push(soldier.id);
      return;
    }

    // 2. Defensive slots in order of priority: Outermost Trench -> Outermost Machine Gun -> Watchtower -> Artillery -> Hospital
    // ALWAYS prioritize the outermost frontline slots (furthest from HQ) first!
    const emptyTrenches = this.slots
      .filter((s) => s.type === 'trench' && s.level > 0 && !s.underConstruction && s.assignedSoldierIds.length < s.maxSoldiers)
      .sort((a, b) => Math.abs(b.x - hqX) - Math.abs(a.x - hqX));
    if (emptyTrenches.length > 0) {
      const bestTrench = emptyTrenches[0];
      soldier.role = 'infantry';
      soldier.assignedSlotId = bestTrench.id;
      bestTrench.assignedSoldierIds.push(soldier.id);
      return;
    }

    const emptyMGs = this.slots
      .filter((s) => s.type === 'machine_gun' && s.level > 0 && !s.underConstruction && s.assignedSoldierIds.length < s.maxSoldiers)
      .sort((a, b) => Math.abs(b.x - hqX) - Math.abs(a.x - hqX));
    if (emptyMGs.length > 0) {
      const bestMG = emptyMGs[0];
      soldier.role = 'machinegunner';
      soldier.assignedSlotId = bestMG.id;
      bestMG.assignedSoldierIds.push(soldier.id);
      return;
    }

    const emptyTowers = this.slots
      .filter((s) => s.type === 'watchtower' && s.level > 0 && !s.underConstruction && s.assignedSoldierIds.length < s.maxSoldiers)
      .sort((a, b) => Math.abs(b.x - hqX) - Math.abs(a.x - hqX));
    if (emptyTowers.length > 0) {
      const bestTower = emptyTowers[0];
      soldier.role = 'sniper';
      soldier.assignedSlotId = bestTower.id;
      bestTower.assignedSoldierIds.push(soldier.id);
      return;
    }

    const emptyArts = this.slots
      .filter((s) => s.type === 'artillery' && s.level > 0 && !s.underConstruction && s.assignedSoldierIds.length < s.maxSoldiers)
      .sort((a, b) => Math.abs(b.x - hqX) - Math.abs(a.x - hqX));
    if (emptyArts.length > 0) {
      const bestArt = emptyArts[0];
      soldier.role = 'artilleryman';
      soldier.assignedSlotId = bestArt.id;
      bestArt.assignedSoldierIds.push(soldier.id);
      return;
    }

    const emptyHosp = this.slots.find((s) => s.type === 'hospital' && s.level > 0 && !s.underConstruction && s.assignedSoldierIds.length < s.maxSoldiers);
    if (emptyHosp) {
      soldier.role = 'medic';
      soldier.assignedSlotId = emptyHosp.id;
      emptyHosp.assignedSoldierIds.push(soldier.id);
      return;
    }

    // If defensive slots are fully occupied, infantry with rifles remain reserve infantry!
    // Recruits without rifles or unequipped roles become combat engineers.
    if (soldier.role !== 'infantry' && soldier.role !== 'sniper') {
      soldier.role = 'engineer';
    }
    soldier.assignedSlotId = null;
    this.assignFlankForUnassignedSoldier(soldier);
  }

  public assignFlankForUnassignedSoldier(soldier: Soldier): 'left' | 'right' {
    const leftCampAlive = this.landingCamps.some((c) => c.side === 'left' && !c.isDestroyed);
    const rightCampAlive = this.landingCamps.some((c) => c.side === 'right' && !c.isDestroyed);

    // User: "Bir taraftaki çıkarma gemisi yıkılınca gece savunmaya geçen askerler düşmanın geleceği diğer hudutu korusun düşman gelmeyen hudutun arkasında beklemesin"
    if (!leftCampAlive && rightCampAlive) {
      soldier.defenseFlank = 'right';
      return 'right';
    }
    if (leftCampAlive && !rightCampAlive) {
      soldier.defenseFlank = 'left';
      return 'left';
    }

    if (soldier.defenseFlank) {
      return soldier.defenseFlank;
    }
    const unassigned = this.soldiers.filter((s) => !s.assignedSlotId && !s.isRetinue && !s.isAssaultSquad && s.id !== soldier.id);
    const leftCount = unassigned.filter((s) => s.defenseFlank === 'left').length;
    const rightCount = unassigned.filter((s) => s.defenseFlank === 'right').length;
    soldier.defenseFlank = leftCount <= rightCount ? 'left' : 'right';
    return soldier.defenseFlank;
  }

  public balanceUnassignedSoldiersToFlanks() {
    const leftCampAlive = this.landingCamps.some((c) => c.side === 'left' && !c.isDestroyed);
    const rightCampAlive = this.landingCamps.some((c) => c.side === 'right' && !c.isDestroyed);

    const unassigned = this.soldiers.filter((s) => !s.assignedSlotId && !s.isRetinue && !s.isAssaultSquad && s.role !== 'recruit');
    unassigned.sort((a, b) => a.id.localeCompare(b.id));

    if (!leftCampAlive && rightCampAlive) {
      for (let i = 0; i < unassigned.length; i++) {
        unassigned[i].defenseFlank = 'right';
      }
    } else if (leftCampAlive && !rightCampAlive) {
      for (let i = 0; i < unassigned.length; i++) {
        unassigned[i].defenseFlank = 'left';
      }
    } else {
      for (let i = 0; i < unassigned.length; i++) {
        unassigned[i].defenseFlank = (i % 2 === 0) ? 'left' : 'right';
      }
    }
  }

  public assignWoodcutterToTree(treeSlot: BuildSlot) {
    if (treeSlot.assignedWoodcutterId) return;

    // ONLY consider free, unassigned soldiers (recruits or reserve engineers)
    // Soldiers garrisoned in defensive positions (trenches, towers, MGs, artillery, hospital) NEVER leave their defense!
    let candidate = this.soldiers.find((s) => !s.assignedSlotId && !s.isRetinue && !s.isAssaultSquad && (s.role === 'engineer' || s.role === 'recruit') && !s.targetTreeId && s.state !== 'dying' && s.health > 0);

    if (!candidate) {
      candidate = this.soldiers.find((s) => !s.assignedSlotId && !s.isRetinue && !s.isAssaultSquad && !s.targetTreeId && s.state !== 'dying' && s.health > 0);
    }

    if (candidate) {
      treeSlot.assignedWoodcutterId = candidate.id;
      candidate.targetTreeId = treeSlot.id;
    }
  }

  private recheckSoldierAssignments() {
    // 1. Clean up dead soldier IDs from all slot assignment arrays
    const aliveSoldierIds = new Set(this.soldiers.map((s) => s.id));
    for (const slot of this.slots) {
      slot.assignedSoldierIds = slot.assignedSoldierIds.filter((id) => aliveSoldierIds.has(id));
      if (slot.assignedWoodcutterId && !aliveSoldierIds.has(slot.assignedWoodcutterId)) {
        slot.assignedWoodcutterId = null;
      }
    }

    // Clean up soldier tree targets if tree is already felled or no longer marked
    const markedTrees = this.slots.filter((s) => s.type === 'scavenge_wood' && s.isMarkedForChop && !s.isScavenged);
    const markedTreeIds = new Set(markedTrees.map((s) => s.id));
    for (const soldier of this.soldiers) {
      if (soldier.targetTreeId && !markedTreeIds.has(soldier.targetTreeId)) {
        soldier.targetTreeId = null;
      }
    }

    // Assign any marked trees that do not yet have a woodcutter
    for (const tree of markedTrees) {
      if (!tree.assignedWoodcutterId) {
        this.assignWoodcutterToTree(tree);
      }
    }

    // 1.5 Check if any assault banner has available assault armors waiting on the stand!
    const bannersWithArmor = this.slots.filter((s) => s.type === 'assault_banner' && (s.availableAssaultArmors || 0) > 0);
    for (const banner of bannersWithArmor) {
      const neededArmorCount = banner.availableAssaultArmors || 0;
      const walkingCount = this.soldiers.filter((s) => s.targetEquipSlotId === banner.id && s.health > 0).length;
      if (walkingCount < neededArmorCount) {
        const candidate = this.soldiers.find((s) =>
          s.health > 0 &&
          !s.targetEquipSlotId &&
          !s.isAssaultSquad &&
          !s.isRetinue &&
          !s.isArtilleryCrew &&
          (s.role === 'recruit' || (!s.assignedSlotId && !s.targetTreeId))
        );
        if (candidate) {
          candidate.targetEquipSlotId = banner.id;
          if (candidate.assignedSlotId) {
            const oldSlot = this.slots.find((s) => s.id === candidate.assignedSlotId);
            if (oldSlot) oldSlot.assignedSoldierIds = oldSlot.assignedSoldierIds.filter((id) => id !== candidate.id);
            candidate.assignedSlotId = null;
          }
          candidate.targetTreeId = null;
          candidate.state = 'walking';
          candidate.facing = (candidate.x < banner.x ? 1 : -1) as 1 | -1;
        }
      }
    }

    // 2. Find any free armed soldiers and garrison empty defensive slots
    const availableSoldiers = this.soldiers.filter((s) => !s.assignedSlotId && s.role !== 'recruit' && !s.isRetinue && !s.isAssaultSquad && !s.targetTreeId);
    for (const soldier of availableSoldiers) {
      this.autoAssignSoldier(soldier);
    }
  }

  // --- Assault Squad Charge Order (1 Coin paid to Heavy Vanguard at the border to order charge) ---
  public orderAssaultSquadToCharge(): boolean {
    const cmd = this.commander;

    // 1. Check if commander is near a defending heavy vanguard at the border
    const defendingVanguard = this.soldiers.find((s) => 
      s.isAssaultHeavyArmor && 
      s.health > 0 && 
      s.assaultState === 'defending' && 
      Math.abs(s.x - cmd.x) < 55
    );

    if (defendingVanguard) {
      if (cmd.mecidiye < 1) {
        this.addFloatingText(defendingVanguard.x, 370, '1 Sikke Gerekli! (Taarruz Emri)', '#ef4444');
        return true; // Intercept interaction
      }

      cmd.mecidiye -= 1;
      soundEngine.playCoinPay();
      soundEngine.playBugleCharge();
      soundEngine.playAssaultShout();

      const flank = defendingVanguard.assaultSide;
      const squad = this.soldiers.filter((s) => s.isAssaultSquad && s.assaultSide === flank && s.health > 0);
      for (const s of squad) {
        s.assaultState = 'charging';
        s.isWalking = true;
        s.state = 'walking';
        s.weaponState = 'shouldered';
      }

      this.spawnDebris(defendingVanguard.x, 420, '#fbbf24', 10);
      this.addFloatingText(defendingVanguard.x, 330, '🇹🇷 "ALLAH ALLAH! DÜŞMAN GEMİSİNE TAARRUZ!"', '#22c55e');
      return true;
    }

    // 2. Check if commander is near a vanguard without target camp (e.g. initial camp destroyed, redirect to other camp)
    const otherCamp = this.landingCamps.find((c) => !c.isDestroyed);
    if (otherCamp) {
      const idleVanguard = this.soldiers.find((s) => 
        s.isAssaultHeavyArmor && 
        s.health > 0 && 
        !s.targetCampId && 
        Math.abs(s.x - cmd.x) < 55
      );

      if (idleVanguard) {
        if (cmd.mecidiye < 1) {
          this.addFloatingText(idleVanguard.x, 370, '1 Sikke Gerekli! (Diğer Gemiye Hücum)', '#ef4444');
          return true;
        }

        cmd.mecidiye -= 1;
        soundEngine.playCoinPay();
        soundEngine.playBugleCharge();
        soundEngine.playAssaultShout();

        const squad = this.soldiers.filter((s) => s.isAssaultSquad && s.health > 0 && !s.targetCampId);
        for (const s of squad) {
          s.targetCampId = otherCamp.id;
          s.assaultSide = otherCamp.side;
          s.assaultState = 'charging';
          s.isReturningFromAssault = false;
          s.isWalking = true;
          s.state = 'walking';
          s.weaponState = 'shouldered';
          s.facing = (otherCamp.x > s.x ? 1 : -1) as 1 | -1;
        }

        this.spawnDebris(idleVanguard.x, 420, '#fbbf24', 8);
        this.addFloatingText(idleVanguard.x, 340, '🇹🇷 "Emredersiniz Kumandanım! Diğer Gemiye Hücum!"', '#22c55e');
        return true;
      }
    }

    return false;
  }

  public sendAssaultSquadToOtherCamp(): boolean {
    return this.orderAssaultSquadToCharge();
  }

  // --- Commander Special Whistle (Q) & Abilities ---

  public useCommanderWhistle() {
    if (this.state.inGameTutorial?.enabled && this.state.inGameTutorial.step === 'use_whistle') {
      this.commander.whistleCooldown = 12;
      this.commander.buffTimer = 8;
      this.commander.activeBuff = 'Hücum Emri & Yüksek Moral';
      soundEngine.playWhistle();
      soundEngine.playBugleCharge();
      this.addFloatingText(this.commander.x, 340, '📯 Talim Hücumu! Mehmetçik Şahlandı!', '#f59e0b');
      this.state.inGameTutorial.isStepCompleted = true;
      this.state.inGameTutorial.stepTimer = 0;
      for (const s of this.soldiers) {
        s.moraleBuffTimer = 8;
      }
      return;
    }

    if (this.commander.whistleCooldown > 0) {
      this.addFloatingText(this.commander.x, 380, `Düdük Doluyor... (${Math.ceil(this.commander.whistleCooldown)}s)`, '#94a3b8');
      return;
    }
    if (this.commander.mecidiye < 3) {
      this.addFloatingText(this.commander.x, 380, 'Taarruz Düdüğü için 3 Sikke Gerekli', '#ef4444');
      return;
    }

    this.commander.mecidiye -= 3;
    soundEngine.playCoinPay();
    this.commander.whistleCooldown = 15; // 15 second cooldown
    this.commander.buffTimer = 8;
    this.commander.activeBuff = 'Hücum Emri & Yüksek Moral';

    soundEngine.playWhistle();
    soundEngine.playBugleCharge();
    this.addFloatingText(this.commander.x, 340, '📯 Taarruz Düdüğü! Mehmetçik Şahlandı (+%50 Ateş Hızı)!', '#f59e0b');

    // Buff all soldiers
    for (const s of this.soldiers) {
      s.moraleBuffTimer = 8;
      s.health = Math.min(s.maxHealth, s.health + 25); // Healing boost
    }

    // Fire an illumination parachute flare over active frontline
    this.spawnProjectile({
      id: `flare_${this.projIdCounter++}`,
      x: this.commander.x,
      y: 200,
      vx: (Math.random() - 0.5) * 10,
      vy: 15,
      type: 'flare',
      damage: 0,
      radius: 200,
      source: 'player',
      life: 12,
    });
  }

  public triggerCampDestruction(camp: LandingCamp) {
    soundEngine.playExplosion(true);
    this.spawnDebris(camp.x, 420, '#dc2626', 30);
    this.addFloatingText(camp.x, 320, '💥 DÜŞMAN CEPHE BUNKERE İMHA EDİLDİ! ZAFER!', '#22c55e');
    this.spawnGroundCoin(camp.x, 12);

    if (this.landingCamps.every((c) => c.isDestroyed)) {
      setTimeout(() => {
        this.state.isVictory = true;
        soundEngine.playVictoryFanfare();
      }, 1500);
    }
  }

  // --- Entity AI Simulations ---

  private updateBuildSlots(dt: number) {
    const hasDefenseRelic = this.slots.some(s => s.type === 'shrine_relic' && s.level === 2 && s.id.includes('statue_defense'));

    // HQ health mirror
    const hq = this.slots.find((s) => s.id === 'hq_main');
    if (hq) {
      this.state.hqHealth = hq.health;
      this.state.maxHqHealth = hq.maxHealth;
      if (hq.level === 3 && (hq.maxSoldiers || 0) < 2) {
        hq.maxSoldiers = 2;
        this.recheckSoldierAssignments();
      }
    }

    // Construction Timers & Progression
    for (const slot of this.slots) {
      // Apply Defense Relic once per slot
      if (hasDefenseRelic && slot.type !== 'shrine_relic' && slot.type !== 'recruit_camp' && slot.type !== 'scavenge_wood' && slot.type !== 'scavenge_iron' && slot.type !== 'treasure_chest' && !(slot as any).relicBuffedDefense) {
        slot.maxHealth = Math.floor(slot.maxHealth * 1.5);
        slot.health = slot.maxHealth;
        (slot as any).relicBuffedDefense = true;
      }

      slot.isBlockedByForest = this.isSlotBlockedByForest(slot);

      // Grass withering on cleared forest plots over time (approx 12 seconds to completely wither)
      if (slot.type === 'scavenge_wood' && slot.isScavenged) {
        if (slot.clearedProgress === undefined) {
          slot.clearedProgress = 1.0;
        } else if (slot.clearedProgress < 1.0) {
          slot.clearedProgress = Math.min(1.0, slot.clearedProgress + dt / 12);
        }
      }

      // Kingdom Vagrant Camp: Spawn up to 2 waiting recruits over time (limited by level quota)
      if (slot.type === 'recruit_camp') {
        const maxQuota = slot.maxRecruitsTotal ?? (this.state.level.id === 1 ? 16 : this.state.level.id === 2 ? 13 : this.state.level.id === 3 ? 11 : 9);
        const spawnedTotal = slot.recruitsSpawnedTotal ?? 0;
        const remainingToSpawn = Math.max(0, maxQuota - spawnedTotal);

        if (slot.availableRecruits === undefined) slot.availableRecruits = Math.min(2, remainingToSpawn);

        if (slot.availableRecruits < 2 && remainingToSpawn > slot.availableRecruits) {
          slot.recruitSpawnTimer = (slot.recruitSpawnTimer || 0) + dt;
          if (slot.recruitSpawnTimer >= 35) {
            slot.recruitSpawnTimer = 0;
            slot.availableRecruits += 1;
            this.addFloatingText(slot.x, 370, `🪖 Yeni Gönüllü Geldi! (${slot.availableRecruits}/2 Hazır)`, '#38bdf8');
          }
        }

        // Auto-recruit when volunteer arrives and coins were pre-deposited!
        if (slot.availableRecruits > 0 && slot.coinsDeposited && slot.coinsDeposited > 0) {
          slot.availableRecruits -= 1;
          slot.coinsDeposited -= 1;
          slot.recruitsSpawnedTotal = (slot.recruitsSpawnedTotal || 0) + 1;
          soundEngine.playCoinPay();
          const jitterX = (Math.random() - 0.5) * 24;
          const soldier = this.spawnSoldier('recruit', slot.x + jitterX, null);
          this.addFloatingText(slot.x, 360, '🪖 Bırakılan Sikkeyle Yeni Gönüllü Nefer Oldu!', '#4ade80');
          this.autoAssignSoldier(soldier);
        }
      }

      // Building Repair Logic (Kingdom-Style: Requires 1 pre-deposited coin AND daytime idle soldiers to repair!)
      if (slot.repairCoinsDeposited && slot.repairCoinsDeposited > 0 && slot.health < slot.maxHealth) {
        const isDaytime = this.state.timePhase === 'day' || this.state.timePhase === 'dawn';
        if (isDaytime) {
          const helpers = this.soldiers.filter((s) => s.state === 'digging' && Math.abs(s.x - slot.x) < 45).length;
          if (helpers > 0) {
            slot.health = Math.min(slot.maxHealth, slot.health + helpers * 45 * dt);
            if (slot.health >= slot.maxHealth) {
              slot.health = slot.maxHealth;
              slot.repairCoinsDeposited = 0; // Repair complete!
              soundEngine.playDigOrChop('hammer');
              this.addFloatingText(slot.x, 350, `🛠️ ${slot.titleTr} Tamamen Onarıldı!`, '#22c55e');
              this.recheckSoldierAssignments();
            }
          }
        }
      }

      if (slot.underConstruction) {
        // Count how many engineers/helpers are actively building this slot
        const helpers = this.soldiers.filter((s) => s.state === 'digging' && Math.abs(s.x - slot.x) < 40).length;
        const helperSpeedup = 1 + helpers * 0.75;
        const duration = slot.constructionDuration || 4.0;

        slot.constructionProgress = (slot.constructionProgress || 0) + (dt / duration) * helperSpeedup;

        if (slot.constructionProgress >= 1.0) {
          slot.underConstruction = false;
          slot.constructionProgress = 0;
          slot.level += 1;

          if (slot.type === 'barbed_wire') {
            const wireHpByLevel = [0, 200, 380, 600, 900];
            const wireCosts = [0, 3, 4, 6, 0];
            const titles = [
              'Dikenli Tel & Kazık Engeli',
              'Sv. 1 Dikenli Tel & Kazık Engeli',
              'Sv. 2 İspanyol Süvarisi Çapraz Kazıklar',
              'Sv. 3 Çelik Burgu Kazıklar & Helezon Tel',
              'Sv. 4 Ağır Kirpi İstihkâmı',
            ];
            const descriptions = [
              'Dikenli Tel ve Kazık Engeli Kur (2 Sikke)',
              'Sv. 2 İspanyol Süvarisi Çapraz Kazıklar & Tel Engeli (3 Sikke)',
              'Sv. 3 Çelik Burgulu Kazıklar & Dairesel Helezon Tel (4 Sikke)',
              'Sv. 4 Çelik Ray Kirpileri & Üç Sıra Jiletli Helezon Ağı (6 Sikke)',
              'Maksimum Seviye (Derin Muhkem İstihkâm Hattı)',
            ];
            slot.maxHealth = wireHpByLevel[slot.level] || 900;
            slot.health = slot.maxHealth;
            slot.costMecidiye = wireCosts[slot.level] || 0;
            slot.titleTr = titles[slot.level] || 'Ağır Kirpi İstihkâmı';
            slot.upgradeDescription = descriptions[slot.level] || 'Maksimum Seviye';
          } else if (slot.type === 'trench') {
            const trenchHpByLevel = [0, 300, 550, 900];
            const trenchCosts = [0, 3, 5, 0];
            const trenchTitles = [
              'Siper Savunma Mevzisi',
              'Sv. 1 Kum Torbası Siperi',
              'Sv. 2 Ahşap Kütük Siperi',
              'Sv. 3 Kesme Taş & Çelik Tabya Siperi',
            ];
            const trenchDescs = [
              'Sv. 1 Siperi Kaz ve Kum Torbasıyla Kur (2 Sikke)',
              'Sv. 2 Ahşap Kütük Siperini İnşa Et (3 Sikke)',
              'Sv. 3 Kesme Taş & Çelik Tabya Siperi (5 Sikke)',
              'Maksimum Seviye (Muhkem Tabya Siperi)',
            ];
            slot.maxHealth = trenchHpByLevel[slot.level] || 900;
            slot.health = slot.maxHealth;
            slot.costMecidiye = trenchCosts[slot.level] || 0;
            slot.titleTr = trenchTitles[slot.level] || 'Muhkem Tabya Siperi';
            slot.upgradeDescription = trenchDescs[slot.level] || 'Maksimum Seviye';
            slot.maxSoldiers = slot.level === 3 ? 3 : (slot.level === 2 ? 2 : 2);
          } else if (slot.type === 'machine_gun') {
            const mgHpByLevel = [0, 700, 1200, 1800];
            const mgCosts = [0, 4, 6, 0];
            const mgTitles = [
              'Makineli Tüfek Koruganı',
              'Sv. 1 Maxim Makineli Koruganı',
              'Sv. 2 Zırhlı & Kamufle Korugan',
              'Sv. 3 Çelik & Beton Ağır Bunker'
            ];
            const mgDescs = [
              'Sv. 1 Maxim Makineli Tüfek Mevzisi Kur (3 Sikke)',
              'Sv. 2 Çelik Zırhlı & Kamufle Çatılı Ağır Korugan (4 Sikke)',
              'Sv. 3 Beton Tahkimatlı Çift Namlulu Çelik Bunker (6 Sikke)',
              'Maksimum Seviye (Çelik Makineli Bunkeri)'
            ];
            slot.maxHealth = mgHpByLevel[slot.level] || 1800;
            slot.health = slot.maxHealth;
            slot.costMecidiye = mgCosts[slot.level] || 0;
            slot.titleTr = mgTitles[slot.level] || 'Ağır Makineli Bunkeri';
            slot.upgradeDescription = mgDescs[slot.level] || 'Maksimum Seviye';
            slot.maxSoldiers = slot.level >= 2 ? 2 : 1;
          } else {
            slot.maxHealth += 100;
            slot.health = slot.maxHealth;
            slot.costMecidiye = Math.floor(slot.costMecidiye * 1.6) + 1;
          }

          if (hasDefenseRelic) {
            slot.maxHealth = Math.floor(slot.maxHealth * 1.5);
            slot.health = slot.maxHealth;
            (slot as any).relicBuffedDefense = true;
          }

          if (slot.id === 'hq_main' && slot.level === 3) {
            slot.maxSoldiers = 2;
          }
          if (slot.type === 'trench') {
            slot.maxSoldiers = slot.level === 3 ? 3 : (slot.level === 2 ? 2 : 1);
          }

          soundEngine.playConstructionFinish();
          this.addFloatingText(slot.x, 350, `🎉 ${slot.titleTr} (Sv. ${slot.level}) Tamamlandı!`, '#22c55e');
          this.spawnDebris(slot.x, 430, '#eab308', 16);
          this.recheckSoldierAssignments();
        }
      }
    }
  }

  private updateSoldiers(dt: number) {
    const gY = 440;
    const cmd = this.commander;
    const hqX = this.state.level.worldWidth / 2;
    const isNightOrThreat = this.state.timePhase === 'night' || this.state.timePhase === 'midnight' || this.state.timePhase === 'dusk' || this.enemies.some((e) => e.health > 0 && e.state !== 'dying');

    const hasHealthRelic = this.slots.some(s => s.type === 'shrine_relic' && s.level === 2 && s.id.includes('statue_health'));
    const hasDamageRelic = this.slots.some(s => s.type === 'shrine_relic' && s.level === 2 && s.id.includes('statue_damage'));

    // Find active outermost defense lines (trench, wire, mg, artillery) marking the boundary flag
    const defSlots = this.slots.filter((s) => s.level > 0 && !s.underConstruction && (s.type === 'trench' || s.type === 'barbed_wire' || s.type === 'machine_gun' || s.type === 'artillery'));
    const leftDefs = defSlots.filter((s) => s.side === 'left');
    const rightDefs = defSlots.filter((s) => s.side === 'right');
    const leftFrontierSlot = leftDefs.length > 0 ? leftDefs.reduce((min, s) => s.x < min.x ? s : min, leftDefs[0]) : null;
    const rightFrontierSlot = rightDefs.length > 0 ? rightDefs.reduce((max, s) => s.x > max.x ? s : max, rightDefs[0]) : null;
    const leftmostDefX = leftFrontierSlot ? leftFrontierSlot.x : hqX - 350;
    const rightmostDefX = rightFrontierSlot ? rightFrontierSlot.x : hqX + 350;

    // Detect if one landing camp is destroyed
    const leftCampAlive = this.landingCamps.some((c) => c.side === 'left' && !c.isDestroyed);
    const rightCampAlive = this.landingCamps.some((c) => c.side === 'right' && !c.isDestroyed);
    const clearedFlank: 'left' | 'right' | null = (!leftCampAlive && rightCampAlive) ? 'left' : (leftCampAlive && !rightCampAlive) ? 'right' : null;
    const activeThreatFlank: 'left' | 'right' | null = clearedFlank === 'left' ? 'right' : clearedFlank === 'right' ? 'left' : null;

    // Find slots under construction to send engineers
    const activeBuildSlot = this.slots.find((s) => s.underConstruction);

    // Balance unassigned armed soldiers equally between flanks (or focus 100% on active threat)
    this.balanceUnassignedSoldiersToFlanks();

    for (const soldier of this.soldiers) {
      if (soldier.state === 'dying') {
        soldier.deathTimer = (soldier.deathTimer || 0) - dt;
        continue;
      }
      if (soldier.health <= 0) {
        this.onSoldierDefeated(soldier);
        continue;
      }

      // Apply Health Relic once per soldier
      if (hasHealthRelic && !(soldier as any).relicBuffedHealth) {
        soldier.maxHealth = Math.floor(soldier.maxHealth * 1.4);
        soldier.health = Math.floor(soldier.health * 1.4);
        (soldier as any).relicBuffedHealth = true;
      }

      // --- KINGDOM MECHANIC: ALL SOLDIERS TOSS COINS TO GROUND WHEN COMMANDER APPROACHES ---
      // As requested: "boştaki askerlerin ve siperlerdeki askerlerin yani tüm askerlerin kumandan gelince sikkeleri yere dökmesi bozulmuş onu düzelt. sikke verme de bozulmuş yere atsınlar kingdomdaki gibi kumandanın zaten manyetik çekimi var"
      if (soldier.coinsHeld && soldier.coinsHeld > 0) {
        const distToCmd = Math.abs(soldier.x - cmd.x);
        const dyToCmd = Math.abs((soldier.y || gY) - (cmd.y || gY));

        if (distToCmd < 85 && dyToCmd < 65) {
          soldier.coinDropTimer = (soldier.coinDropTimer || 0) - dt;
          if (soldier.coinDropTimer <= 0) {
            soldier.coinDropTimer = 0.12; // Pleasant rhythmic toss cadence (like Kingdom archers)
            soldier.coinsHeld -= 1;

            const tossDir = Math.sign(cmd.x - soldier.x) || (soldier.facing || 1);
            // Spawn coin on ground with an arc towards Commander; Commander's magnetic pull attracts it!
            this.spawnGroundCoin(soldier.x, 1, false, 0.1, tossDir);
            soundEngine.playCoinPay();

            if (soldier.state !== 'shooting' && soldier.state !== 'digging') {
              soldier.facing = tossDir as 1 | -1;
            }

            if (soldier.coinsHeld === 0) {
              this.addFloatingText(soldier.x, (soldier.y || gY) - 36, '🪙 Kumandana Verildi!', '#fbbf24');
            }
          }
        }
      }

      let stationSlot: BuildSlot | null = null;
      let isAtStation = false;

      // User: "Askerler orman içinde koşmasın biraz daha yavaş yürüsün"
      const inForest = soldier.x < leftmostDefX || soldier.x > rightmostDefX || !!soldier.targetTreeId;
      const marchSpeed = inForest ? soldier.speed * 44 : soldier.speed * 75;

      if (soldier.moraleBuffTimer > 0) soldier.moraleBuffTimer -= dt;
      if (soldier.attackCooldown > 0) soldier.attackCooldown -= dt;
      if (soldier.muzzleFlashTimer && soldier.muzzleFlashTimer > 0) {
        soldier.muzzleFlashTimer -= dt;
        if (soldier.muzzleFlashTimer <= 0) {
          soldier.muzzleFlashTimer = 0;
          if (soldier.state === 'shooting') {
            // If enemies remain alive within scouting range, seamlessly hold aiming/reloading stance
            const hasNearbyEnemy = this.enemies.some((e) => e.health > 0 && e.state !== 'dying' && Math.abs(e.x - soldier.x) < 1100);
            soldier.state = hasNearbyEnemy ? 'aiming' : (soldier.assignedSlotId ? 'garrisoned' : 'idle');
            soldier.weaponState = hasNearbyEnemy ? 'reloading' : 'shouldered';
          }
        }
      }

      // 0. RETURNING FROM ASSAULT (Gemi imha edildikten sonra zırhlarını çıkarmadan karargaha yürüyerek dönen akıncılar)
      if (soldier.isReturningFromAssault) {
        soldier.assignedSlotId = null;
        soldier.targetTreeId = null;
        soldier.state = 'walking';
        soldier.isWalking = true;
        soldier.weaponState = 'shouldered';
        soldier.facing = (soldier.x > hqX ? -1 : 1) as 1 | -1;
        soldier.x += soldier.facing * marchSpeed * dt;

        // Once back inside headquarters perimeter, take up defensive guard positions without losing armor
        if ((soldier.x >= leftmostDefX - 40 && soldier.x <= rightmostDefX + 40) || Math.abs(soldier.x - hqX) < 250) {
          soldier.isReturningFromAssault = false;
          soldier.isWalking = false;
          soldier.state = 'idle';
          soldier.weaponState = 'shouldered';
          // User: "gemiyi yıktıktan sonra zırhları ve taaruz askerleri normal askere dönüşüyor dönüşmesin aynı kalsın"
          // Keep assault armor and status intact!
        }
        continue;
      }

      // 0. SOLDIER WALKING TO EQUIP ASSAULT ARMOR AT BANNER STAND
      if (soldier.targetEquipSlotId) {
        const equipSlot = this.slots.find((s) => s.id === soldier.targetEquipSlotId);
        if (!equipSlot || equipSlot.health <= 0) {
          soldier.targetEquipSlotId = null;
          this.recheckSoldierAssignments();
          continue;
        }

        const distToSlot = Math.abs(soldier.x - equipSlot.x);
        if (distToSlot > 12) {
          soldier.state = 'walking';
          soldier.weaponState = 'shouldered';
          soldier.facing = (equipSlot.x > soldier.x ? 1 : -1) as 1 | -1;
          soldier.x += soldier.facing * marchSpeed * dt;
          continue;
        } else {
          // Arrived at the assault armor rack to equip!
          soldier.x = equipSlot.x;
          soldier.targetEquipSlotId = null;
          if ((equipSlot.availableAssaultArmors || 0) > 0) {
            equipSlot.availableAssaultArmors = Math.max(0, (equipSlot.availableAssaultArmors || 0) - 1);
          }

          const side = (equipSlot.side as 'left' | 'right') || 'left';
          // Check existing assault soldiers on this flank
          const flankAssaults = this.soldiers.filter((s) => s.isAssaultSquad && s.assaultSide === side && s.health > 0 && s.id !== soldier.id);
          const isFirstVanguard = flankAssaults.length === 0 || !flankAssaults.some((s) => s.isAssaultHeavyArmor);

          soldier.role = 'infantry';
          soldier.isAssaultSquad = true;
          soldier.assaultSide = side;
          soldier.assignedSlotId = null;
          soldier.targetTreeId = null;
          soldier.ammoInClip = 5;
          soldier.maxAmmoInClip = 5;
          soldier.state = 'idle';

          if (isFirstVanguard) {
            // First assault soldier on this flank: FULL WWI HEAVY TRENCH ARMOR & STEEL SHIELD
            soldier.isAssaultHeavyArmor = true;
            soldier.assaultOrder = 0;
            soldier.maxHealth = 850;
            soldier.health = 850;
            soldier.bayonetDamage = 90;
            soundEngine.playArmorEquip();
            this.spawnDebris(soldier.x, gY - 20, '#94a3b8', 12);
            this.spawnDebris(soldier.x, gY - 20, '#1e293b', 8);
            this.addFloatingText(soldier.x, 340, '🛡️ Tam Zırhlı Taarruz Öncüsü Kuşandı! (Siper Zırhı & Çelik Kalkan)', '#f59e0b');
          } else {
            // 2nd and subsequent soldiers: Normal assault shock troop appearance
            soldier.isAssaultHeavyArmor = false;
            soldier.assaultOrder = flankAssaults.length;
            soldier.maxHealth = 420;
            soldier.health = 420;
            soldier.bayonetDamage = 60;
            soundEngine.playArmorEquip();
            this.spawnDebris(soldier.x, gY - 20, '#556b2f', 8);
            this.addFloatingText(soldier.x, 340, '⚔️ Taarruz Askeri Kuşandı!', '#22c55e');
          }

          soldier.assaultState = 'defending';
          const targetCamp = this.landingCamps.find((c) => c.side === side && !c.isDestroyed) || this.landingCamps.find((c) => !c.isDestroyed);
          soldier.targetCampId = targetCamp ? targetCamp.id : null;

          // Check if there is an active FieldArtillery on this flank waiting for crew
          const targetArt = this.fieldArtilleries.find((fa) => fa.side === side && fa.health > 0 && fa.crewSoldierIds.length < 2);
          if (targetArt) {
            targetArt.crewSoldierIds.push(soldier.id);
            soldier.isArtilleryCrew = true;
            soldier.artilleryId = targetArt.id;
            this.addFloatingText(soldier.x, 320, `🪖 Akıncı Sahra Topu Mürettebatına Katıldı! (${targetArt.crewSoldierIds.length}/2)`, '#facc15');
          }
          continue;
        }
      }

      // 1. ASSAULT SQUAD / KUŞATMA AKINCISI (Takes absolute priority over garrisoning)
      // Relentlessly marches to the enemy landing camp (SS River Clyde) at map edge and attacks until destroyed!
      // Does NOT stop at any friendly trench, slot, or garrison station!
      if (soldier.isAssaultSquad) {
        if (soldier.isArtilleryCrew) {
          // Crew movement & animation is synced directly with the Field Artillery
          continue;
        }

        soldier.assignedSlotId = null;
        if (soldier.y < gY) {
          soldier.y = Math.min(gY, soldier.y + dt * 65);
        } else {
          soldier.y = gY;
        }

        // Find active enemy landing camp
        let targetCamp = this.landingCamps.find((c) => !c.isDestroyed && (!soldier.targetCampId || c.id === soldier.targetCampId));
        if (!targetCamp) {
          targetCamp = this.landingCamps.find((c) => !c.isDestroyed);
        }

        if (targetCamp) {
          soldier.targetCampId = targetCamp.id;
          soldier.facing = (targetCamp.x > soldier.x ? 1 : -1) as 1 | -1;
          const distToCamp = Math.abs(soldier.x - targetCamp.x);

          // Get squad members on this flank and sort so Heavy Vanguard is always at the front (index 0)
          const squad = this.soldiers.filter((s) => s.isAssaultSquad && s.assaultSide === soldier.assaultSide && s.health > 0);
          squad.sort((a, b) => {
            if (a.isAssaultHeavyArmor && !b.isAssaultHeavyArmor) return -1;
            if (!a.isAssaultHeavyArmor && b.isAssaultHeavyArmor) return 1;
            return a.id.localeCompare(b.id);
          });
          const rankIndex = Math.max(0, squad.indexOf(soldier));
          const vanguard = squad[0] || soldier;
          soldier.assaultOrder = rankIndex;

          if (!soldier.assaultState) {
            soldier.assaultState = 'defending';
          }

          // Case A: Defending within base borders
          if (soldier.assaultState === 'defending') {
            const flankSlots = this.slots.filter(
              (s) => s.side === soldier.assaultSide && s.level > 0 && s.health > 0 && (s.type === 'trench' || s.type === 'barbed_wire' || s.type === 'machine_gun')
            );
            let frontierX: number;
            if (flankSlots.length > 0) {
              frontierX = soldier.assaultSide === 'left'
                ? Math.min(...flankSlots.map((s) => s.x))
                : Math.max(...flankSlots.map((s) => s.x));
            } else {
              frontierX = hqX + (soldier.assaultSide === 'left' ? -260 : 260);
            }

            const flankDir = soldier.assaultSide === 'left' ? -1 : 1;
            const targetX = frontierX - flankDir * (rankIndex * 32);
            const distToTarget = Math.abs(soldier.x - targetX);

            // Check if any enemy is attacking or near the frontier
            const threatEnemy = this.enemies.find((e) => {
              if (e.health <= 0 || e.state === 'dying') return false;
              return Math.abs(e.x - soldier.x) < 280 && (e.x - soldier.x) * flankDir > -40;
            });

            if (threatEnemy) {
              soldier.isWalking = false;
              soldier.facing = (threatEnemy.x > soldier.x ? 1 : -1) as 1 | -1;
              const enemyDist = Math.abs(threatEnemy.x - soldier.x);
              if (enemyDist < 44) {
                soldier.state = 'bayonet';
                soldier.weaponState = 'firing';
                if (soldier.attackCooldown <= 0) {
                  soldier.attackCooldown = 0.65;
                  const meleeDmg = soldier.isAssaultHeavyArmor ? 90 : 60;
                  threatEnemy.health -= meleeDmg;
                  this.spawnBlood(threatEnemy.x, gY - 18, 4);
                  soundEngine.playBayonetClash();
                  if (threatEnemy.health <= 0) this.onEnemyDefeated(threatEnemy);
                }
              } else {
                soldier.state = 'shooting';
                if (soldier.attackCooldown <= 0) {
                  soldier.weaponState = 'firing';
                  soldier.attackCooldown = soldier.isAssaultHeavyArmor ? 1.0 : 0.85;
                  soldier.muzzleFlashTimer = 0.12;
                  soundEngine.playGunshot(false);
                  this.spawnProjectile({
                    id: `bullet_${this.projIdCounter++}`,
                    x: soldier.x + soldier.facing * 18,
                    y: gY - 20,
                    vx: soldier.facing * 880,
                    vy: 0,
                    type: 'bullet',
                    damage: soldier.isAssaultHeavyArmor ? 45 : 55,
                    radius: 4,
                    source: 'soldier',
                    life: 1.5,
                  });
                } else {
                  soldier.weaponState = soldier.attackCooldown > 0.4 ? 'reloading' : 'ready_aim';
                }
              }
            } else {
              // Move to assigned frontier station position in clean ordered file
              if (distToTarget > 6) {
                soldier.isWalking = true;
                soldier.state = 'walking';
                soldier.weaponState = 'shouldered';
                soldier.facing = (targetX > soldier.x ? 1 : -1) as 1 | -1;
                soldier.x += soldier.facing * marchSpeed * dt;
              } else {
                soldier.isWalking = false;
                soldier.state = 'idle';
                soldier.weaponState = 'ready_aim';
                soldier.facing = flankDir as 1 | -1;
              }
            }
            continue;
          }

          // Case B: Charging towards enemy landing camp
          // Check if there are ANY enemies blocking the road or in close proximity!
          const blockingEnemy = this.enemies.find((e) => {
            if (e.health <= 0 || e.state === 'dying') return false;
            const dist = Math.abs(e.x - soldier.x);
            const inFront = (e.x - soldier.x) * soldier.facing > -40;
            return dist < 260 && inFront;
          });

          if (blockingEnemy) {
            // HALT! Stand ground and fight enemy until eliminated. NEVER walk through them!
            soldier.isWalking = false;
            const enemyDist = Math.abs(blockingEnemy.x - soldier.x);
            soldier.facing = (blockingEnemy.x > soldier.x ? 1 : -1) as 1 | -1;

            if (enemyDist < 44) {
              // Melee range: Bayonet lunge & heavy melee strike!
              soldier.state = 'bayonet';
              soldier.weaponState = 'firing';
              if (soldier.attackCooldown <= 0) {
                soldier.attackCooldown = 0.65;
                const meleeDmg = soldier.isAssaultHeavyArmor ? 90 : 60;
                blockingEnemy.health -= meleeDmg;
                this.spawnBlood(blockingEnemy.x, gY - 18, 4);
                soundEngine.playBayonetClash();
                if (soldier.isAssaultHeavyArmor) {
                  this.spawnDebris(blockingEnemy.x, gY - 18, '#94a3b8', 6);
                }
                if (blockingEnemy.health <= 0) {
                  this.onEnemyDefeated(blockingEnemy);
                }
              }
            } else {
              // Range combat: disciplined shoulder-level rifle firing stance
              soldier.state = 'shooting';
              if (soldier.attackCooldown <= 0) {
                soldier.weaponState = 'firing';
                soldier.attackCooldown = soldier.isAssaultHeavyArmor ? 1.0 : 0.85;
                soldier.muzzleFlashTimer = 0.12;
                soundEngine.playGunshot(false);
                this.spawnProjectile({
                  id: `bullet_${this.projIdCounter++}`,
                  x: soldier.x + soldier.facing * 18,
                  y: gY - 20,
                  vx: soldier.facing * 880,
                  vy: 0,
                  type: 'bullet',
                  damage: soldier.isAssaultHeavyArmor ? 45 : 55,
                  radius: 4,
                  source: 'soldier',
                  life: 1.5,
                });
              } else {
                soldier.weaponState = soldier.attackCooldown > 0.4 ? 'reloading' : 'ready_aim';
              }
            }
          } else {
            // Road is clear of enemies! March towards camp or bombard ship
            const sideArtillery = this.fieldArtilleries.find((fa) => fa.side === soldier.assaultSide && fa.health > 0 && fa.crewSoldierIds.length >= 2);
            const isTooFarAheadOfGun = sideArtillery && ((soldier.x - sideArtillery.x) * sideArtillery.facing > 110) && distToCamp > 320;

            // Staggered non-overlapping stopping distances when bombarding ship!
            const stopDist = 195 + rankIndex * 35;

            if (isTooFarAheadOfGun) {
              soldier.isWalking = false;
              soldier.state = 'idle';
              soldier.weaponState = 'ready_aim';
              soldier.facing = (targetCamp.x > soldier.x ? 1 : -1) as 1 | -1;
            } else if (distToCamp > stopDist + 6) {
              // March toward the enemy landing camp in strict queued single-file column (arda arda sıralı)
              if (rankIndex === 0) {
                soldier.isWalking = true;
                soldier.state = 'walking';
                soldier.weaponState = 'shouldered';
                soldier.x += soldier.facing * marchSpeed * dt;
              } else {
                const targetX = vanguard.x - vanguard.facing * (rankIndex * 32);
                const distToTarget = Math.abs(soldier.x - targetX);
                if (distToTarget > 4) {
                  soldier.isWalking = true;
                  soldier.state = 'walking';
                  soldier.weaponState = 'shouldered';
                  soldier.facing = vanguard.facing;
                  const step = Math.min(distToTarget, marchSpeed * dt * (distToTarget > 45 ? 1.25 : 1.0));
                  soldier.x += Math.sign(targetX - soldier.x) * step;
                } else {
                  soldier.isWalking = vanguard.isWalking;
                  soldier.state = vanguard.state;
                  soldier.facing = vanguard.facing;
                  soldier.weaponState = vanguard.weaponState;
                }
              }
            } else {
              // In position at designated firing line! Aim rifle firmly at shoulder level and bombard ship
              soldier.isWalking = false;
              soldier.state = 'shooting';
              soldier.facing = (targetCamp.x > soldier.x ? 1 : -1) as 1 | -1;

              if (soldier.attackCooldown <= 0) {
                soldier.weaponState = 'firing';
                soldier.attackCooldown = 1.0 + (rankIndex % 3) * 0.3; // natural staggered firing rhythm
                soldier.muzzleFlashTimer = 0.12;
                soundEngine.playGunshot(false);

                // 18% stick grenade chance, 82% rifle shot
                if (Math.random() < 0.18) {
                  const dx = (targetCamp.x + (Math.random() - 0.5) * 35) - soldier.x;
                  const flightTime = 1.15;
                  const vx = dx / flightTime;
                  const vy = -170;
                  this.spawnProjectile({
                    id: `grenade_${this.projIdCounter++}`,
                    x: soldier.x + soldier.facing * 16,
                    y: gY - 22,
                    vx,
                    vy,
                    type: 'grenade',
                    damage: 85,
                    radius: 80,
                    source: 'assault_squad',
                    life: flightTime + 0.1,
                    targetX: targetCamp.x,
                    targetY: gY - 20,
                  });
                } else {
                  this.spawnProjectile({
                    id: `bullet_${this.projIdCounter++}`,
                    x: soldier.x + soldier.facing * 18,
                    y: gY - 20,
                    vx: soldier.facing * 880,
                    vy: 0,
                    type: 'bullet',
                    damage: 55,
                    radius: 4,
                    source: 'assault_squad',
                    life: 1.5,
                  });
                }
              } else {
                // While waiting for next shot, maintain steady aim at ship or cycle bolt
                soldier.weaponState = soldier.attackCooldown > 0.5 ? 'reloading' : 'ready_aim';
              }
            }
          }
        } else {
          // Target camp destroyed! User: "gemiyi yıktıktan sonra zırhları ve taaruz askerleri normal askere dönüşüyor dönüşmesin aynı kalsın"
          // Keep assault armor! March victoriously back to headquarters or defend inside headquarters
          soldier.targetCampId = null;
          if (Math.abs(soldier.x - hqX) > 220) {
            soldier.isReturningFromAssault = true;
            soldier.isWalking = true;
            soldier.state = 'walking';
            soldier.weaponState = 'shouldered';
            soldier.facing = (soldier.x > hqX ? -1 : 1) as 1 | -1;
            soldier.x += soldier.facing * marchSpeed * dt;
          } else {
            // Stationed inside headquarters!
            soldier.isReturningFromAssault = false;
            soldier.isWalking = false;

            // Defend headquarters actively against night wave threats
            const nearbyDefEnemy = this.enemies.find((e) => e.health > 0 && e.state !== 'dying' && Math.abs(e.x - soldier.x) < 260);
            if (nearbyDefEnemy) {
              soldier.facing = (nearbyDefEnemy.x > soldier.x ? 1 : -1) as 1 | -1;
              const enemyDist = Math.abs(nearbyDefEnemy.x - soldier.x);
              if (enemyDist < 44) {
                soldier.state = 'bayonet';
                soldier.weaponState = 'firing';
                if (soldier.attackCooldown <= 0) {
                  soldier.attackCooldown = 0.65;
                  const meleeDmg = soldier.isAssaultHeavyArmor ? 90 : 60;
                  nearbyDefEnemy.health -= meleeDmg;
                  this.spawnBlood(nearbyDefEnemy.x, gY - 18, 4);
                  soundEngine.playBayonetClash();
                  if (soldier.isAssaultHeavyArmor) {
                    this.spawnDebris(nearbyDefEnemy.x, gY - 18, '#94a3b8', 6);
                  }
                  if (nearbyDefEnemy.health <= 0) {
                    this.onEnemyDefeated(nearbyDefEnemy);
                  }
                }
              } else {
                soldier.state = 'shooting';
                if (soldier.attackCooldown <= 0) {
                  soldier.weaponState = 'firing';
                  soldier.attackCooldown = soldier.isAssaultHeavyArmor ? 1.0 : 0.85;
                  soldier.muzzleFlashTimer = 0.12;
                  soundEngine.playGunshot(false);
                  this.spawnProjectile({
                    id: `bullet_${this.projIdCounter++}`,
                    x: soldier.x + soldier.facing * 18,
                    y: gY - 20,
                    vx: soldier.facing * 880,
                    vy: 0,
                    type: 'bullet',
                    damage: soldier.isAssaultHeavyArmor ? 45 : 55,
                    radius: 4,
                    source: 'soldier',
                    life: 1.5,
                  });
                } else {
                  soldier.weaponState = soldier.attackCooldown > 0.4 ? 'reloading' : 'ready_aim';
                }
              }
            } else {
              // Idle defensive stance guarding headquarters
              soldier.state = 'idle';
              soldier.weaponState = 'shouldered';
              soldier.facing = (soldier.assaultSide === 'left' ? -1 : 1) as 1 | -1;
            }
          }
        }
        continue;
      } else if (soldier.targetTreeId) {
        // 2. DESIGNATED WOODCUTTER (AĞAÇ KESME GÖREVİNDEKİ MEHMETÇİK)
        const myTree = this.slots.find((s) => s.id === soldier.targetTreeId && s.type === 'scavenge_wood' && s.isMarkedForChop && !s.isScavenged);
        if (!myTree) {
          soldier.targetTreeId = null;
          this.recheckSoldierAssignments();
        } else {
          // If elevated on a tower, climb down to ground first!
          if (soldier.y < gY) {
            soldier.y = Math.min(gY, soldier.y + dt * 65);
          } else {
            soldier.y = gY;
          }

          const targetX = myTree.x + (soldier.id.charCodeAt(0) % 2 === 0 ? -12 : 12);
          if (Math.abs(soldier.x - targetX) > 12) {
            soldier.state = 'walking';
            soldier.facing = (Math.sign(targetX - soldier.x) || 1) as 1 | -1;
            soldier.x += Math.sign(targetX - soldier.x) * soldier.speed * 80 * dt;
          } else {
            soldier.state = 'digging'; // Woodcutter chopping animation with axe
            soldier.facing = myTree.x >= soldier.x ? 1 : -1;
            myTree.chopProgress = (myTree.chopProgress || 0) + dt / 2.8; // ~2.8s felling time

            if (Math.random() < 0.08) {
              soundEngine.playDigOrChop('wood');
              this.spawnDebris(myTree.x, 420, '#d97706', 3);
              this.spawnDebris(myTree.x, 410, '#15803d', 2);
            }

            if (myTree.chopProgress >= 1.0) {
              // Tree felled!
              myTree.isScavenged = true;
              myTree.clearedProgress = 0.01; // Begins gradual withering/clearing of forest grass
              myTree.isMarkedForChop = false;
              myTree.chopProgress = 0;
              myTree.assignedWoodcutterId = null;
              soldier.targetTreeId = null;
              soldier.state = 'walking';
              soldier.facing = soldier.x > hqX ? -1 : 1;

              soundEngine.playTreeFall();
              soundEngine.playDigOrChop('wood');
              this.spawnDebris(myTree.x, 430, '#15803d', 16);
              this.spawnDebris(myTree.x, 440, '#78350f', 8);

              // Exactly 3 coins drop out as requested: "ve ağaçtan 3 sikke düşsün"
              this.spawnGroundCoin(myTree.x, 3);
              this.addFloatingText(myTree.x, 370, '🌲 Çam Kesildi! Arazi Açıldı (+3 Sikke)', '#22c55e');

              this.recheckSoldierAssignments();
            }
          }
        }
      } else if (soldier.assignedSlotId) {
        stationSlot = this.slots.find((s) => s.id === soldier.assignedSlotId) || null;

        // User: "Bir taraftaki çıkarma gemisi yıkılınca gece savunmaya geçen askerler düşmanın geleceği diğer hudutu korusun düşman gelmeyen hudutun arkasında beklemesin"
        // If assigned to a defensive position on a cleared flank, vacate at night to defend the active frontier!
        if (isNightOrThreat && clearedFlank && activeThreatFlank && stationSlot && stationSlot.side === clearedFlank && stationSlot.type !== 'hospital' && stationSlot.id !== 'hq_main') {
          stationSlot = null;
          soldier.defenseFlank = activeThreatFlank;
        }

        if (stationSlot) {
          let targetX = stationSlot.x;
          let targetY = gY;

          if (stationSlot.id === 'hq_main') {
            // HQ Level 3 Parapet Guards
            const idx = stationSlot.assignedSoldierIds.indexOf(soldier.id);
            targetX = stationSlot.x + (idx <= 0 ? -32 : 32);
            targetY = gY - 48; // Elevated on HQ Fortress Roof!
          } else if (stationSlot.type === 'trench') {
            const idx = stationSlot.assignedSoldierIds.indexOf(soldier.id);
            const total = stationSlot.assignedSoldierIds.length;
            const offset = total > 1 ? (idx - (total - 1) / 2) * 22 : 0;
            targetX = stationSlot.x + offset;
            targetY = gY;
          } else if (stationSlot.type === 'machine_gun') {
            targetX = stationSlot.x + (stationSlot.side === 'left' ? 8 : -8);
            targetY = gY;
          } else if (stationSlot.type === 'artillery') {
            targetX = stationSlot.x + (stationSlot.side === 'left' ? 18 : -18);
            targetY = gY;
          } else if (stationSlot.type === 'hospital') {
            targetX = stationSlot.x - 14;
            targetY = gY;
          } else if (stationSlot.type === 'watchtower') {
            targetX = stationSlot.x;
            targetY = gY - (stationSlot.level === 1 ? 55 : 75);
          }

          const isElevatedPost = targetY < gY;

          if (Math.abs(soldier.x - targetX) > 8) {
            // Soldier walks strictly on the ground towards the station!
            if (soldier.y < gY) {
              // If previously elevated on a tower, climb down to ground first!
              soldier.y = Math.min(gY, soldier.y + dt * 65);
            } else {
              soldier.y = gY;
            }
            soldier.isWalking = true;
            soldier.state = 'walking';
            soldier.facing = Math.sign(targetX - soldier.x) as 1 | -1 || 1;
            soldier.x += Math.sign(targetX - soldier.x) * marchSpeed * dt;
          } else {
            // Reached the base of the structure!
            soldier.x = targetX;

            if (isElevatedPost) {
              // Climb vertically up the ladder/stairs to the elevated post!
              if (soldier.y > targetY) {
                soldier.y = Math.max(targetY, soldier.y - dt * 50);
                soldier.isWalking = true;
                soldier.state = 'walking'; // Climbing animation
              } else {
                soldier.y = targetY;
                isAtStation = true;
                soldier.isWalking = false;
                soldier.state = 'garrisoned';
              }
            } else {
              // Ground level station (trench, mg, artillery, hospital)
              if (soldier.y < gY) {
                soldier.y = Math.min(gY, soldier.y + dt * 65);
                soldier.isWalking = true;
                soldier.state = 'walking';
              } else {
                soldier.y = gY;
                isAtStation = true;
                soldier.isWalking = false;
                soldier.state = 'garrisoned';
              }
            }
          }
        }
      } else if (soldier.isRetinue) {
        // RETINUE TROOP BEHAVIOR: Escorts Commander on offensive sorties
        const cmd = this.commander;
        const retinueTroops = this.soldiers.filter((s) => s.isRetinue);
        const rIdx = retinueTroops.indexOf(soldier);
        const followOffset = (rIdx % 2 === 0 ? -1 : 1) * (Math.floor(rIdx / 2) * 28 + 26) * cmd.facing;
        const targetX = cmd.x + followOffset;

        if (Math.abs(soldier.x - targetX) > 12) {
          soldier.state = 'walking';
          soldier.facing = Math.sign(targetX - soldier.x) as 1 | -1 || cmd.facing;
          soldier.x += Math.sign(targetX - soldier.x) * soldier.speed * 90 * dt;
        } else {
          soldier.state = 'idle';
          soldier.facing = cmd.facing;
        }
      } else {
        // UNASSIGNED / RESERVE VOLUNTEER BEHAVIOR (Kingdom style economy & defense)
        const cmd = this.commander;
        // If elevated, first descend to ground before moving anywhere!
        if (soldier.y < gY) {
          soldier.y = Math.min(gY, soldier.y + dt * 65);
        } else {
          soldier.y = gY;
        }

        // Check for marked trees requiring a woodcutter
        const markedTrees = this.slots.filter((s) => s.type === 'scavenge_wood' && s.isMarkedForChop && !s.isScavenged);
        let myTree: BuildSlot | null = null;

        if (soldier.targetTreeId) {
          myTree = markedTrees.find((t) => t.id === soldier.targetTreeId) || null;
          if (!myTree) {
            soldier.targetTreeId = null;
          }
        }

        // If not assigned to a tree, claim an available marked tree
        if (!myTree && markedTrees.length > 0 && !activeBuildSlot) {
          const availableTree = markedTrees.find((t) => !t.assignedWoodcutterId || t.assignedWoodcutterId === soldier.id);
          if (availableTree) {
            myTree = availableTree;
            myTree.assignedWoodcutterId = soldier.id;
            soldier.targetTreeId = myTree.id;
          }
        } else if (!myTree && markedTrees.length > 0 && soldier.role !== 'engineer') {
          // Recruits and reserve infantry can also fell trees while engineers work on buildings
          const availableTree = markedTrees.find((t) => !t.assignedWoodcutterId || t.assignedWoodcutterId === soldier.id);
          if (availableTree) {
            myTree = availableTree;
            myTree.assignedWoodcutterId = soldier.id;
            soldier.targetTreeId = myTree.id;
          }
        }

        if (myTree) {
          // Move towards the marked tree and chop it down!
          const targetX = myTree.x + (soldier.id.charCodeAt(0) % 2 === 0 ? -12 : 12);
          if (Math.abs(soldier.x - targetX) > 10) {
            soldier.state = 'walking';
            soldier.facing = Math.sign(targetX - soldier.x) as 1 | -1 || 1;
            soldier.x += Math.sign(targetX - soldier.x) * marchSpeed * dt;
          } else {
            soldier.state = 'digging'; // Woodcutter chopping animation with axe
            soldier.facing = myTree.x >= soldier.x ? 1 : -1;
            myTree.chopProgress = (myTree.chopProgress || 0) + dt / 3.2; // 3.2s of chopping

            if (Math.random() < 0.08) {
              soundEngine.playDigOrChop('wood');
              this.spawnDebris(myTree.x, 420, '#d97706', 3);
              this.spawnDebris(myTree.x, 410, '#15803d', 2);
            }

            if (myTree.chopProgress >= 1.0) {
              // Tree felled!
              myTree.isScavenged = true;
              myTree.clearedProgress = 0.01; // Begins gradual withering/clearing of forest grass
              myTree.isMarkedForChop = false;
              myTree.chopProgress = 0;
              myTree.assignedWoodcutterId = null;
              soldier.targetTreeId = null;
              soldier.state = 'walking';
              soldier.facing = soldier.x > hqX ? -1 : 1;

              soundEngine.playTreeFall();
              soundEngine.playDigOrChop('wood');
              this.spawnDebris(myTree.x, 430, '#15803d', 16);
              this.spawnDebris(myTree.x, 440, '#78350f', 8);

              // Exactly 3 coins drop out as requested: "ve ağaçtan 3 sikke düşsün"
              this.spawnGroundCoin(myTree.x, 3);
              this.addFloatingText(myTree.x, 370, '🌲 Çam Kesildi! Arazi Açıldı (+3 Sikke)', '#22c55e');

              this.recheckSoldierAssignments();
            }
          }
        } else if (soldier.role === 'recruit') {
          // UNARMED RECRUIT: Go to the Armory Rifle Bench (Tüfek Tezgahı) to equip a Mauser!
          const armorySlot = this.slots.find((s) => s.type === 'armory');
          const benchX = armorySlot ? armorySlot.x - 26 : hqX + 294;

          const distToBench = Math.abs(soldier.x - benchX);
          if (distToBench > 12) {
            soldier.state = 'walking';
            soldier.facing = Math.sign(benchX - soldier.x) as 1 | -1 || 1;
            soldier.x += Math.sign(benchX - soldier.x) * marchSpeed * dt;
          } else {
            soldier.x = benchX;
            // Check if there is an available rifle on the bench
            if (armorySlot && (armorySlot.availableRifles || 0) > 0) {
              armorySlot.availableRifles = (armorySlot.availableRifles || 0) - 1;
              soldier.role = 'infantry';
              soldier.ammoInClip = 5;
              soldier.maxAmmoInClip = 5;
              soldier.bayonetDamage = 35;
              soldier.state = 'idle';
              soundEngine.playReload();
              this.spawnDebris(benchX, 420, '#fbbf24', 8);
              this.spawnDebris(benchX, 420, '#78350f', 6);
              this.addFloatingText(soldier.x, 360, '🎖️ Tüfek Kuşandı! (Piyade Oldu)', '#4ade80');
              this.autoAssignSoldier(soldier);
            } else {
              // Wait near the bench / headquarters for commander to place rifles
              soldier.state = 'idle';
              soldier.facing = 1;
              if (Math.random() < 0.02) {
                soldier.facing = Math.random() < 0.5 ? -1 : 1;
              }
            }
          }
        } else if (activeBuildSlot && soldier.role === 'engineer') {
          // 1. Move to help active construction
          const targetX = activeBuildSlot.x + (soldier.id.charCodeAt(0) % 2 === 0 ? -22 : 22);
          if (Math.abs(soldier.x - targetX) > 10) {
            soldier.state = 'walking';
            soldier.facing = Math.sign(targetX - soldier.x) as 1 | -1 || 1;
            soldier.x += Math.sign(targetX - soldier.x) * soldier.speed * 65 * dt;
          } else {
            soldier.state = 'digging';
            soldier.facing = activeBuildSlot.x > soldier.x ? 1 : -1;
            if (Math.random() < 0.05) {
              soundEngine.playDigOrChop('hammer');
            }
          }
        } else if (!isNightOrThreat && this.slots.some((s) => s.level > 0 && (s.repairCoinsDeposited || 0) > 0 && s.health < s.maxHealth && !s.underConstruction)) {
          // 2. Daytime Repair: Boştaki neferler sikkesi ödenmiş hasarlı binaları gündüz onarsın
          let closestSlot: BuildSlot | null = null;
          let closestDist = Infinity;
          for (const s of this.slots) {
            if (s.level > 0 && (s.repairCoinsDeposited || 0) > 0 && s.health < s.maxHealth && !s.underConstruction) {
              const d = Math.abs(s.x - soldier.x);
              if (d < closestDist) {
                closestDist = d;
                closestSlot = s;
              }
            }
          }

          if (closestSlot) {
            const damagedSlot = closestSlot;
            const targetX = damagedSlot.x + (soldier.id.charCodeAt(0) % 2 === 0 ? -16 : 16);
            if (Math.abs(soldier.x - targetX) > 12) {
              soldier.state = 'walking';
              soldier.facing = Math.sign(targetX - soldier.x) as 1 | -1 || 1;
              soldier.x += Math.sign(targetX - soldier.x) * marchSpeed * dt;
            } else {
              soldier.state = 'digging'; // Repairing animation with hammer
              soldier.facing = damagedSlot.x >= soldier.x ? 1 : -1;
              damagedSlot.health = Math.min(damagedSlot.maxHealth, damagedSlot.health + dt * 35);

              if (Math.random() < 0.08) {
                soundEngine.playDigOrChop('hammer');
                this.spawnDebris(damagedSlot.x, 430, '#94a3b8', 2);
              }

              if (damagedSlot.health >= damagedSlot.maxHealth) {
                damagedSlot.health = damagedSlot.maxHealth;
                damagedSlot.repairCoinsDeposited = 0; // Repair complete!
                soundEngine.playDigOrChop('hammer');
                this.addFloatingText(damagedSlot.x, 370, `🛡️ ${damagedSlot.titleTr} Tamamen Onarıldı!`, '#38bdf8');
                soldier.state = 'idle';
                this.recheckSoldierAssignments();
              }
            }
          }
        } else if ((!soldier.assignedSlotId || (isNightOrThreat && clearedFlank)) && !soldier.isRetinue && !soldier.isAssaultSquad && (soldier.role === 'infantry' || soldier.role === 'sniper' || soldier.role === 'machinegunner' || soldier.role === 'artilleryman')) {
          // 3. RESERVE & ACTIVE FRONTIER DEFENDERS / DAYTIME FOREST HUNTERS
          // Eşit şekilde sağ ve sol hudut arkasına dağılıp savunma hattını tutarlar!
          // Ancak bir tarafın çıkarma gemisi yıkılmışsa, gece savunmadaki askerler düşmanın geleceği diğer hududu korur!
          let assignSide: 'left' | 'right' = (clearedFlank && activeThreatFlank) ? activeThreatFlank : (soldier.defenseFlank || this.assignFlankForUnassignedSoldier(soldier));
          soldier.defenseFlank = assignSide;

          const sameFlankTroops = this.soldiers.filter((s) => (!s.assignedSlotId || (isNightOrThreat && clearedFlank)) && !s.isRetinue && !s.isAssaultSquad && (s.role === 'infantry' || s.role === 'sniper' || s.role === 'machinegunner' || s.role === 'artilleryman') && s.defenseFlank === assignSide);
          const flankIdx = Math.max(0, sameFlankTroops.indexOf(soldier));

          // Soft anti-clumping repulsion among comrades on the same flank ("dip dibe gitmesin")
          for (const other of sameFlankTroops) {
            if (other !== soldier && other.health > 0 && other.state !== 'dying') {
              const dx = soldier.x - other.x;
              if (Math.abs(dx) < 38) {
                const push = dx >= 0 ? 1 : -1;
                soldier.x += push * 24 * dt;
              }
            }
          }

          // Deposit collected hunting coins on ground at Karargâh / defense line when night arrives or returning inside base
          // User: "ayrıca avladıkları hayvanların sikkelerini de toplasın karargaha dönecekleri zaman"
          if (soldier.coinsHeld && soldier.coinsHeld > 0) {
            const hqSlot = this.slots.find((s) => s.id === 'hq_main');
            const hqXPos = hqSlot ? hqSlot.x : this.state.level.worldWidth / 2;
            const distToHq = Math.abs(soldier.x - hqXPos);
            const isInsideBase = (soldier.x >= leftmostDefX - 40 && soldier.x <= rightmostDefX + 40);

            if ((isNightOrThreat || distToHq < 160) && isInsideBase) {
              const count = soldier.coinsHeld;
              soldier.coinsHeld = 0;
              this.spawnGroundCoin(soldier.x, count, false, 0.4);
              if (Math.abs(soldier.x - cmd.x) < 600) {
                soundEngine.playCoinPay();
              }
              this.addFloatingText(soldier.x, (soldier.y || gY) - 38, `🪙 ${count} Av Geliri Karargâha Bırakıldı!`, '#4ade80');
            }
          }

          // Individualized soldier hash and movement speed variance (staggered departures & pace)
          const soldierHash = soldier.id.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffff, 0);
          const indSpeedMult = 0.84 + ((soldierHash % 32) / 100); // 0.84 to 1.15 varied pace
          const soldierMarchSpeed = marchSpeed * indSpeedMult;

          // Outermost frontier defense position
          const baseDefX = assignSide === 'left' ? leftmostDefX : rightmostDefX;
          const defStandX = assignSide === 'left'
            ? (baseDefX + 26 + flankIdx * 18)
            : (baseDefX - 26 - flankIdx * 18);

          // Landing Camp safe boundaries: Even during daytime, hunting soldiers must NEVER get too close to the enemy landing ships!
          // User: "Gündüzleri boştaki askerler orman içinde doğan hayvanları avlamaya çıksın ama çıkarma gemisine çok yaklaşamasın gündüz olsa da!"
          const leftCamp = this.landingCamps.find((c) => c.side === 'left');
          const rightCamp = this.landingCamps.find((c) => c.side === 'right');
          const safeMinX = (leftCamp && !leftCamp.isDestroyed) ? leftCamp.x + 800 : 380;
          const safeMaxX = (rightCamp && !rightCamp.isDestroyed) ? rightCamp.x - 800 : this.state.level.worldWidth - 380;

          const isHunter = !isNightOrThreat && (soldier.role === 'infantry' || soldier.role === 'sniper');

          if (isHunter) {
            // --- DAYTIME WILDLIFE HUNTING PATROL ---
            // User: "gündüz ava çıkan askerler rastgele çıksın dip dibe gitmesin ayrıca avladıkları hayvanların sikkelerini de toplasın karargaha dönecekleri zaman"
            
            // 0. If soldier has collected a full pouch of coins (>= 4 coins), head back to Karargâh to deposit them!
            const hqSlot = this.slots.find((s) => s.id === 'hq_main');
            const hqXPos = hqSlot ? hqSlot.x : this.state.level.worldWidth / 2;
            const hasFullBounty = (soldier.coinsHeld || 0) >= 4;

            if (hasFullBounty) {
              const distToHq = Math.abs(soldier.x - hqXPos);
              if (distToHq > 120) {
                soldier.isWalking = true;
                soldier.state = 'walking';
                soldier.weaponState = 'shouldered';
                const moveDir = Math.sign(hqXPos - soldier.x) as 1 | -1;
                soldier.facing = moveDir || (assignSide === 'left' ? 1 : -1);
                soldier.x += moveDir * soldierMarchSpeed * dt;
              } else {
                const count = soldier.coinsHeld!;
                soldier.coinsHeld = 0;
                this.spawnGroundCoin(soldier.x, count, false, 0.4);
                if (Math.abs(soldier.x - cmd.x) < 600) {
                  soundEngine.playCoinPay();
                }
                this.addFloatingText(soldier.x, (soldier.y || gY) - 38, `🪙 ${count} Av Geliri Karargâha Bırakıldı!`, '#4ade80');
              }
              continue;
            }

            // 1. Pick up ground coins in forest proximity (from freshly killed animals) before shooting new ones
            // Exclude coins near Commander and coins inside base perimeter (base coins are for Commander)
            const nearbyGroundCoin = this.groundCoins.find(
              (c) =>
                c.life > 0 &&
                Math.abs(c.x - soldier.x) < 260 &&
                c.x >= safeMinX &&
                c.x <= safeMaxX &&
                Math.abs(c.x - cmd.x) >= 90 &&
                (c.x < leftmostDefX - 30 || c.x > rightmostDefX + 30)
            );

            if (nearbyGroundCoin && (!soldier.coinsHeld || soldier.coinsHeld < 10)) {
              const distToCoin = Math.abs(soldier.x - nearbyGroundCoin.x);
              if (distToCoin > 14) {
                soldier.isWalking = true;
                soldier.state = 'walking';
                soldier.weaponState = 'shouldered';
                const moveDir = Math.sign(nearbyGroundCoin.x - soldier.x) as 1 | -1;
                soldier.facing = moveDir || (assignSide === 'left' ? -1 : 1);
                soldier.x += moveDir * soldierMarchSpeed * dt;
                soldier.x = Math.max(safeMinX, Math.min(safeMaxX, soldier.x));
              } else {
                soldier.isWalking = false;
                soldier.state = 'idle';
              }
            } else {
              // 2. Locate live wild animals (rabbits, deer, partridges) spawned in the forest
              const huntableAnimals = this.animals.filter((a) => a.health > 0 && a.x >= safeMinX - 100 && a.x <= safeMaxX + 100);
              const flankAnimals = huntableAnimals.filter((a) => assignSide === 'left' ? a.x <= hqX : a.x >= hqX);
              const animalCandidates = flankAnimals.length > 0 ? flankAnimals : huntableAnimals;

              let chosenAnimal: WildAnimal | null = null;
              if (animalCandidates.length > 0) {
                // Distribute target animals among hunters so they don't all chase the exact same animal!
                const targetIdx = (flankIdx + (soldierHash % 5)) % animalCandidates.length;
                chosenAnimal = animalCandidates[targetIdx] || animalCandidates[0];
              }

              const jitterOffset = (((soldierHash * 17) % 9) - 4) * 16;
              const huntRange = (soldier.role === 'sniper' ? 420 : 220) + jitterOffset;

              if (chosenAnimal) {
                const distToAnimal = Math.abs(soldier.x - chosenAnimal.x);
                if (distToAnimal <= huntRange) {
                  // In range! Halt, take aim first, and fire rifle at the wild animal
                  soldier.isWalking = false;
                  soldier.facing = chosenAnimal.x > soldier.x ? 1 : -1;

                  if (soldier.huntAimTargetId !== chosenAnimal.id) {
                    soldier.huntAimTargetId = chosenAnimal.id;
                    soldier.huntAimTimer = 0;
                  }

                  soldier.huntAimTimer = (soldier.huntAimTimer || 0) + dt;
                  const aimRequired = soldier.role === 'sniper' ? 0.65 : 0.45;

                  if (soldier.huntAimTimer < aimRequired) {
                    // Visible aiming stance! Arms raise rifle to shoulder, sighting down the barrel
                    soldier.state = 'aiming';
                    soldier.weaponState = 'ready_aim';
                  } else if (soldier.attackCooldown <= 0) {
                    soldier.huntAimTimer = 0;
                    soldier.attackCooldown = soldier.role === 'sniper' ? 1.6 : 1.15;
                    soldier.muzzleFlashTimer = 0.08;
                    soldier.state = 'shooting';
                    soldier.weaponState = 'firing';
                    soundEngine.playGunshot(false);

                    const startX = soldier.x + soldier.facing * 18;
                    const startY = gY - 20;
                    const targetX = chosenAnimal.x;
                    const targetY = gY - 14;
                    const dx = targetX - startX;
                    const dy = targetY - startY;
                    const dist = Math.hypot(dx, dy) || 1;

                    this.spawnProjectile({
                      id: `hunt_${this.projIdCounter++}`,
                      x: startX,
                      y: startY,
                      vx: (dx / dist) * 850,
                      vy: (dy / dist) * 850,
                      type: 'bullet',
                      damage: soldier.role === 'sniper' ? 50 : 25,
                      radius: 4,
                      source: 'soldier',
                      life: 1.2,
                    });
                  } else {
                    soldier.state = 'idle';
                    soldier.weaponState = 'ready_aim';
                  }
                } else {
                  // Move towards animal to get within rifle range, strictly respecting landing ship safe limits
                  const approachOffset = (((soldierHash * 7) % 7) - 3) * 20;
                  const desiredX = chosenAnimal.x > soldier.x
                    ? chosenAnimal.x - (huntRange - 40) + approachOffset
                    : chosenAnimal.x + (huntRange - 40) + approachOffset;
                  const clampedTargetX = Math.max(safeMinX, Math.min(safeMaxX, desiredX));
                  const distToMove = Math.abs(soldier.x - clampedTargetX);

                  if (distToMove > 8) {
                    soldier.isWalking = true;
                    soldier.state = 'walking';
                    soldier.weaponState = 'shouldered';
                    const moveDir = Math.sign(clampedTargetX - soldier.x) as 1 | -1;
                    soldier.facing = moveDir || (assignSide === 'left' ? -1 : 1);
                    soldier.x += moveDir * soldierMarchSpeed * dt;
                    soldier.x = Math.max(safeMinX, Math.min(safeMaxX, soldier.x));
                  } else {
                    soldier.isWalking = false;
                    soldier.state = 'idle';
                    soldier.facing = chosenAnimal.x > soldier.x ? 1 : -1;
                  }
                }
              } else {
                // No live animals spotted yet: patrol independently into the forest
                // User: "gündüz ava çıkan askerler rastgele çıksın dip dibe gitmesin"
                const { leftForestEdgeX, rightForestEdgeX } = this.getForestEdges();
                const cycleTime = this.totalGameTime + (soldierHash % 100);
                const patrolDepth = 100 + ((soldierHash * 67) % 520); // Each soldier spreads 100 to 620px into the forest
                const wanderDrift = Math.sin(cycleTime * 0.35) * 55;

                let forestPatrolX: number;
                if (assignSide === 'left') {
                  const forestOutX = Math.min(baseDefX - 70, leftForestEdgeX);
                  forestPatrolX = Math.max(safeMinX + 60, forestOutX - patrolDepth + wanderDrift);
                } else {
                  const forestOutX = Math.max(baseDefX + 70, rightForestEdgeX);
                  forestPatrolX = Math.min(safeMaxX - 60, forestOutX + patrolDepth + wanderDrift);
                }

                // Periodic scouting pause to scan the woods (staggered departures & natural hunting pace)
                const isScanningWoods = (cycleTime % 8.5) < 1.8;
                const distToPatrol = Math.abs(soldier.x - forestPatrolX);

                if (!isScanningWoods && distToPatrol > 12) {
                  soldier.isWalking = true;
                  soldier.state = 'walking';
                  soldier.weaponState = 'shouldered';
                  const moveDir = Math.sign(forestPatrolX - soldier.x) as 1 | -1;
                  soldier.facing = moveDir || (assignSide === 'left' ? -1 : 1);
                  soldier.x += moveDir * soldierMarchSpeed * dt;
                  soldier.x = Math.max(safeMinX, Math.min(safeMaxX, soldier.x));
                } else {
                  soldier.isWalking = false;
                  soldier.state = 'idle';
                  soldier.weaponState = isScanningWoods ? 'ready_aim' : 'shouldered';
                  soldier.facing = assignSide === 'left' ? -1 : 1;
                }
              }
            }
          } else {
            // --- NIGHT DEFENSE / MACHINEGUNNERS / ARTILLERYMEN ---
            // Guard strictly at the frontier defense lines behind sandbags/trenches
            const distToTarget = Math.abs(soldier.x - defStandX);
            if (distToTarget > 6) {
              soldier.isWalking = true;
              soldier.state = 'walking';
              soldier.weaponState = 'shouldered';
              soldier.facing = Math.sign(defStandX - soldier.x) as 1 | -1 || (assignSide === 'left' ? -1 : 1);
              soldier.x += Math.sign(defStandX - soldier.x) * soldierMarchSpeed * dt;
            } else {
              soldier.x = defStandX;
              soldier.isWalking = false;
              soldier.facing = assignSide === 'left' ? -1 : 1;
              if (soldier.state === 'walking' || soldier.state === 'running') {
                soldier.state = 'idle';
                soldier.weaponState = 'shouldered';
              }
            }
          }
        } else {
          // 4. Engineers and Unarmed Recruits: Help with active construction or coin-funded repairs
          const activeWorkSlot = this.slots.find((s) => 
            s.underConstruction || ((s.repairCoinsDeposited || 0) > 0 && s.health < s.maxHealth)
          );

          if (activeWorkSlot) {
            const distToWork = Math.abs(soldier.x - activeWorkSlot.x);
            soldier.facing = activeWorkSlot.x > soldier.x ? 1 : -1;
            if (distToWork > 28) {
              soldier.isWalking = true;
              soldier.state = 'walking';
              soldier.x += soldier.facing * marchSpeed * dt;
            } else {
              soldier.isWalking = false;
              soldier.state = 'digging'; // Hammering & building/repairing
              if (activeWorkSlot.repairCoinsDeposited && activeWorkSlot.repairCoinsDeposited > 0 && activeWorkSlot.health < activeWorkSlot.maxHealth) {
                activeWorkSlot.health = Math.min(activeWorkSlot.maxHealth, activeWorkSlot.health + dt * 45);
                if (Math.random() < 0.08) {
                  soundEngine.playDigOrChop('hammer');
                  this.spawnDebris(activeWorkSlot.x, 430, '#94a3b8', 2);
                }
                if (activeWorkSlot.health >= activeWorkSlot.maxHealth) {
                  activeWorkSlot.health = activeWorkSlot.maxHealth;
                  activeWorkSlot.repairCoinsDeposited = 0;
                  soundEngine.playDigOrChop('hammer');
                  this.addFloatingText(activeWorkSlot.x, 370, `🛡️ ${activeWorkSlot.titleTr} Tamamen Onarıldı!`, '#38bdf8');
                  soldier.state = 'idle';
                  this.recheckSoldierAssignments();
                }
              }
            }
          } else {
            // Natural idle stance with occasional slow steps near HQ
            if (!soldier.isWalking) {
              soldier.state = 'idle';
              if (Math.random() < 0.008) {
                soldier.isWalking = true;
                soldier.state = 'walking';
                soldier.facing = Math.random() < 0.5 ? -1 : 1;
              }
            } else {
              const roamOffset = ((soldier.id.charCodeAt(soldier.id.length - 1) % 9) - 4) * 20;
              if (Math.abs(soldier.x - (hqX + roamOffset)) > 140) {
                soldier.facing = Math.sign(hqX + roamOffset - soldier.x) as 1 | -1;
              }
              soldier.x += soldier.facing * 18 * dt;
              if (Math.random() < 0.02) {
                soldier.isWalking = false;
                soldier.state = 'idle';
              }
            }
          }
        }
      }

      // Medic healing nearby wounded soldiers
      if (soldier.role === 'medic') {
        const wounded = this.soldiers.find((s) => s.id !== soldier.id && s.health < s.maxHealth && Math.abs(s.x - soldier.x) < 140);
        if (wounded) {
          wounded.health = Math.min(wounded.maxHealth, wounded.health + dt * 25);
          if (Math.random() < 0.1) this.spawnDebris(wounded.x, gY - 20, '#ef4444', 1);
        }
      }

      // Soldier Combat Behavior (Find closest visible enemy)
      // Unarmed recruits and medics have no weapons and do not engage in rifle combat
      if (soldier.role === 'recruit' || soldier.role === 'medic') {
        continue;
      }

      // If soldier is actively marching to their post and no enemy is immediately dangerously close (<140px), keep marching smoothly!
      const immediateDangerEnemy = this.enemies.find((e) => e.health > 0 && e.state !== 'dying' && Math.abs(e.x - soldier.x) < 140);
      if (soldier.isWalking && !immediateDangerEnemy) {
        soldier.state = 'walking';
        soldier.weaponState = 'shouldered';
        continue;
      }

      let closestEnemy: Enemy | null = null;
      const trueRange = soldier.role === 'artilleryman' ? 950 : (soldier.role === 'sniper' ? 850 : (soldier.role === 'machinegunner' ? 620 : 580));
      const aimRange = 1100; // Far-sight scouting range: raise Mausers as soon as enemy approaches!
      let closestDist = aimRange;

      for (const enemy of this.enemies) {
        if (enemy.health <= 0 || enemy.state === 'dying') continue;
        const dist = Math.abs(enemy.x - soldier.x);
        if (dist < closestDist) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }

      if (closestEnemy) {
        soldier.facing = closestEnemy.x > soldier.x ? 1 : -1;

        if (closestDist > trueRange) {
          // --- 1. APPROACHING IN DISTANCE: RAISE WEAPON TO SHOULDER / EYE LEVEL ---
          // "Düşman menzile girmeden önce silahın hazır konumda beklemesini... sağla"
          soldier.state = 'aiming';
          soldier.weaponState = 'ready_aim';
        } else if (closestDist < 30 && soldier.role === 'infantry' && (!stationSlot || stationSlot.type !== 'trench')) {
          // Bayonet Charge (Süngü Savaşı) - open field only
          soldier.state = 'bayonet';
          soldier.weaponState = 'ready_aim';
          if (soldier.attackCooldown <= 0) {
            soldier.attackCooldown = 0.6;
            const dmg = soldier.bayonetDamage * (soldier.moraleBuffTimer > 0 ? 1.5 : 1.0);
            closestEnemy.health -= dmg;
            soundEngine.playBayonetClash();
            this.spawnBlood(closestEnemy.x, closestEnemy.y || gY, 4);

            if (closestEnemy.health <= 0) {
              this.onEnemyDefeated(closestEnemy);
            }
          }
        } else if (soldier.attackCooldown <= 0) {
          // --- 2. ENEMY IN FIRING RANGE: DISCHARGE DIRECTLY FROM RAISED SHOULDER LEVEL ---
          // "düşman menzile girdiğinde ateş animasyonunun silah aşağıdayken değil, tam omuz hizasında (kaldırılmışken) gerçekleşmesini sağla"
          soldier.state = 'shooting';
          soldier.weaponState = 'firing';
          soldier.facing = closestEnemy.x > soldier.x ? 1 : -1;

          const startX = soldier.x + soldier.facing * 20;
          const startY = (soldier.y || gY) - 20;
          const targetX = closestEnemy.x;
          const targetY = (closestEnemy.y || gY) - 18;
          const dx = targetX - startX;
          const dy = targetY - startY;
          const dist = Math.hypot(dx, dy) || 1;

          const dmgMult = hasDamageRelic ? 1.5 : 1.0;
          const bulletRadius = hasDamageRelic ? 6 : 4;

          if (soldier.role === 'machinegunner') {
            const mgLevel = stationSlot?.level || 1;
            const baseCooldown = mgLevel === 3 ? 0.25 : (mgLevel === 2 ? 0.18 : 0.35);
            const baseDmg = (mgLevel === 3 ? 140 : (mgLevel === 2 ? 48 : 30)) * dmgMult;
            const bRadius = mgLevel === 3 ? 8 : (hasDamageRelic ? 6 : 4);

            soldier.attackCooldown = baseCooldown;
            soldier.muzzleFlashTimer = 0.07;
            soundEngine.playGunshot(true);

            this.spawnProjectile({
              id: `bullet_${this.projIdCounter++}`,
              x: startX,
              y: startY,
              vx: (dx / dist) * 980,
              vy: (dy / dist) * 980 + (Math.random() - 0.5) * (mgLevel === 3 ? 8 : 14),
              type: mgLevel === 3 ? 'tracer' : 'bullet',
              damage: baseDmg,
              radius: bRadius,
              source: 'soldier',
              life: 1.6,
            });
          } else if (soldier.role === 'artilleryman') {
            soldier.attackCooldown = 3.4;
            soldier.muzzleFlashTimer = 0.12;
            soundEngine.playExplosion(true);

            const artStartX = soldier.x + soldier.facing * 28;
            const artStartY = (soldier.y || gY) - 26;
            const distToEnemy = Math.abs(closestEnemy.x - soldier.x);
            const launchVy = distToEnemy < 280 ? -190 : (distToEnemy < 550 ? -240 : -285);
            const gravity = 260;
            const a = 0.5 * gravity;
            const b = launchVy;
            const c = artStartY - gY;
            const disc = b * b - 4 * a * c;
            const flightTime = Math.max(0.4, (-b + Math.sqrt(Math.max(0, disc))) / (2 * a));

            const isEnemyMoving = closestEnemy.state === 'marching' || closestEnemy.state === 'charging';
            const enemyLeadX = closestEnemy.x + (isEnemyMoving ? closestEnemy.facing * closestEnemy.speed * 32 * flightTime : 0);
            const launchVx = (enemyLeadX - artStartX) / flightTime;

            this.spawnProjectile({
              id: `art_${this.projIdCounter++}`,
              x: artStartX,
              y: artStartY,
              vx: launchVx,
              vy: launchVy,
              type: 'artillery_shell',
              damage: 180 * dmgMult,
              radius: 145 * (hasDamageRelic ? 1.2 : 1),
              source: 'soldier',
              life: flightTime + 0.8,
              targetX: enemyLeadX,
              targetY: gY,
            });
          } else if (soldier.role === 'sniper') {
            soldier.attackCooldown = 1.6;
            soldier.muzzleFlashTimer = 0.06;
            soundEngine.playGunshot(false);
            this.spawnProjectile({
              id: `bullet_${this.projIdCounter++}`,
              x: startX,
              y: startY,
              vx: (dx / dist) * 1050,
              vy: (dy / dist) * 1050,
              type: 'bullet',
              damage: 65 * dmgMult,
              radius: bulletRadius,
              source: 'soldier',
              life: 1.8,
            });
          } else {
            // Standard Mauser 1893 Rifle
            soldier.attackCooldown = 0.95;
            soldier.muzzleFlashTimer = 0.08;
            soundEngine.playGunshot(false);
            this.spawnProjectile({
              id: `bullet_${this.projIdCounter++}`,
              x: startX,
              y: startY,
              vx: (dx / dist) * 850,
              vy: (dy / dist) * 850,
              type: 'bullet',
              damage: 44 * dmgMult,
              radius: bulletRadius,
              source: 'soldier',
              life: 1.6,
            });
          }
        } else {
          // --- 3. RELOADING / BOLT CYCLING DURING ATTACK COOLDOWN ---
          // Weapon stays leveled at shoulder height!
          soldier.state = 'aiming';
          soldier.weaponState = (soldier.attackCooldown > 0.35) ? 'reloading' : 'ready_aim';
        }
      } else {
        // --- 4. NO ENEMY DETECTED IN SCOUTING RANGE ---
        // Lower rifle back to shouldered posture, at ease or garrisoned
        if (soldier.state === 'shooting' || soldier.state === 'aiming' || soldier.state === 'bayonet') {
          soldier.state = isAtStation ? 'garrisoned' : 'idle';
          soldier.weaponState = 'shouldered';
        }
        if (isAtStation && stationSlot) {
          soldier.facing = stationSlot.side === 'left' ? -1 : 1;
        } else if (soldier.defenseFlank) {
          soldier.facing = soldier.defenseFlank === 'left' ? -1 : 1;
        }
      }

        // Daytime automatic hospital visit for wounded unassigned soldiers
        const isDaytime = this.state.timePhase === 'day' || this.state.timePhase === 'dawn';
        if (isDaytime && soldier.health < soldier.maxHealth && !soldier.assignedSlotId && !soldier.isRetinue && !soldier.isAssaultSquad) {
          const hospital = this.slots.find((s) => s.type === 'hospital' && s.level > 0);
          if (hospital) {
            if (Math.abs(soldier.x - hospital.x) > 40) {
              soldier.state = 'walking';
              soldier.facing = hospital.x > soldier.x ? 1 : -1;
              soldier.x += soldier.facing * soldier.speed * 60 * dt;
            } else {
              soldier.state = 'idle'; // Wait at hospital to be healed
            }
          }
        }

        // User: "hiçbir canlı geçmesin denize" (askerler kumsal sınırında durur)
        soldier.x = Math.max(320, Math.min(this.state.level.worldWidth - 320, soldier.x));
      }

      // Clean dead soldiers after realistic death animation completes
      this.soldiers = this.soldiers.filter((s) => s.health > 0 || (s.state === 'dying' && (s.deathTimer || 0) > 0));
    }

  private updateFieldArtilleries(dt: number) {
    const gY = 440;
    const hq = this.slots.find((s) => s.id === 'hq_main');
    const hqX = hq ? hq.x : 2500;

    for (let i = this.fieldArtilleries.length - 1; i >= 0; i--) {
      const art = this.fieldArtilleries[i];
      if (art.health <= 0) {
        for (const cid of art.crewSoldierIds) {
          const s = this.soldiers.find((sol) => sol.id === cid);
          if (s) {
            s.isArtilleryCrew = false;
            s.artilleryId = undefined;
          }
        }
        this.fieldArtilleries.splice(i, 1);
        continue;
      }

      if (art.muzzleFlashTimer && art.muzzleFlashTimer > 0) {
        art.muzzleFlashTimer -= dt;
      }
      if (art.reloadCooldown > 0) {
        art.reloadCooldown -= dt;
      }

      // Check crew: filter for living soldiers
      art.crewSoldierIds = art.crewSoldierIds.filter((cid) => {
        const s = this.soldiers.find((sol) => sol.id === cid && sol.health > 0);
        return !!s;
      });

      const isFullyCrewed = art.crewSoldierIds.length >= 2;
      const crewSoldiers = art.crewSoldierIds.map((cid) => this.soldiers.find((s) => s.id === cid)!).filter(Boolean);

      // Find active enemy landing camp
      let targetCamp = this.landingCamps.find((c) => !c.isDestroyed && (!art.targetCampId || c.id === art.targetCampId));
      if (!targetCamp) {
        targetCamp = this.landingCamps.find((c) => !c.isDestroyed);
      }

      if (!targetCamp) {
        // Target camps destroyed! Return back to headquarters
        art.state = 'moving';
        art.facing = art.x > hqX ? -1 : 1;
        const distToHq = Math.abs(art.x - hqX);
        if (distToHq > 260) {
          art.x += art.facing * art.speed * 42 * dt;
          art.wheelRotation = (art.wheelRotation || 0) + art.facing * dt * 4;
        } else {
          art.state = 'idle';
        }

        crewSoldiers.forEach((crew, idx) => {
          crew.state = art.state === 'moving' ? 'walking' : 'idle';
          crew.facing = art.facing;
          crew.x = art.x - art.facing * (16 + idx * 18);
          crew.y = gY;
        });
        continue;
      }

      art.targetCampId = targetCamp.id;
      art.facing = targetCamp.x > art.x ? 1 : -1;
      const distToCamp = Math.abs(art.x - targetCamp.x);

      if (!isFullyCrewed) {
        // Awaiting 2nd gunner before advancing
        art.state = 'idle';
        crewSoldiers.forEach((crew, idx) => {
          crew.state = 'idle';
          crew.facing = art.facing;
          crew.x = art.x - art.facing * (16 + idx * 18);
          crew.y = gY;
        });
        continue;
      }

      // User directive: "taaruz askerleri ile beraber gitsin top da atsın ama top başında asker varsa diğer taaruz askerleri topu beklesin tabii top biraz yavaş olacağından taaruz askerleri topun biraz önünde top da arkada saldırmaya gitsin"
      // Artillery optimal bombardment range: 350 - 450 px from enemy landing ship
      const maxFiringRange = 440;

      if (distToCamp > maxFiringRange) {
        // Rolling forward with carriage wheels turning
        art.state = 'moving';
        art.x += art.facing * art.speed * 48 * dt;
        art.wheelRotation = (art.wheelRotation || 0) + art.facing * dt * 4.2;

        crewSoldiers.forEach((crew, idx) => {
          crew.state = 'walking';
          crew.facing = art.facing;
          crew.x = art.x - art.facing * (16 + idx * 18);
          crew.y = gY;
        });
      } else {
        // In bombardment position!
        art.state = art.reloadCooldown > 1.2 ? 'reloading' : 'firing';

        if (crewSoldiers[0]) {
          crewSoldiers[0].state = 'aiming';
          crewSoldiers[0].facing = art.facing;
          crewSoldiers[0].x = art.x - art.facing * 16;
          crewSoldiers[0].y = gY;
        }
        if (crewSoldiers[1]) {
          crewSoldiers[1].state = art.reloadCooldown > 0.8 ? 'digging' : 'idle';
          crewSoldiers[1].facing = art.facing;
          crewSoldiers[1].x = art.x - art.facing * 34;
          crewSoldiers[1].y = gY;
        }

        // Fire 75mm Krupp high-explosive shell at landing camp ship
        if (art.reloadCooldown <= 0) {
          art.reloadCooldown = 3.2;
          art.muzzleFlashTimer = 0.16;
          soundEngine.playGunshot(false);
          soundEngine.playExplosion(false);

          const startX = art.x + art.facing * 28;
          const startY = gY - 26;
          const targetX = targetCamp.x + (Math.random() - 0.5) * 35;
          const targetY = gY - 18;
          const dx = targetX - startX;
          const flightTime = 1.3;
          const vx = dx / flightTime;
          const vy = -210; // High arc ballistic trajectory

          this.spawnProjectile({
            id: `field_art_${this.projIdCounter++}`,
            x: startX,
            y: startY,
            vx,
            vy,
            type: 'artillery_shell',
            damage: 220, // Heavy siege damage against landing invasion craft
            radius: 95,
            source: 'soldier',
            life: flightTime + 0.15,
            targetX,
            targetY,
          });

          this.spawnDebris(startX, startY, '#f59e0b', 8);
          this.spawnDebris(startX, startY, '#78350f', 6);
        }
      }
    }
  }

  private updateEnemies(dt: number) {
    const isNight = this.state.timePhase === 'night' || this.state.timePhase === 'midnight';
    const gY = 440;
    const hqX = this.state.level.worldWidth / 2;
    const cmd = this.commander;

    // Spawn Enemy Waves during Nighttime (up to maxNightWaves per night)
    if (isNight && this.nightWavesSpawnedCount < this.maxNightWaves) {
      this.spawnTimer += dt;
      const isBloodMoon = this.state.dayNumber % 3 === 0;
      const spawnInterval = isBloodMoon ? 3.2 : Math.max(3.8, 8.0 - this.state.dayNumber * 0.7);

      if (this.spawnTimer > spawnInterval) {
        this.spawnTimer = 0;
        this.spawnEnemyWave();
      }
    }

    // Assess defensive perimeter and weak points on both flanks
    const leftFlankSlots = this.slots.filter((s) => s.x < hqX && (s.type === 'trench' || s.type === 'barbed_wire' || s.type === 'machine_gun'));
    const rightFlankSlots = this.slots.filter((s) => s.x > hqX && (s.type === 'trench' || s.type === 'barbed_wire' || s.type === 'machine_gun'));

    // Find weakest active fortification on each flank (lowest HP ratio)
    const getWeakestSlot = (flankSlots: typeof leftFlankSlots) => {
      const active = flankSlots.filter((s) => s.level > 0 && s.health > 0);
      if (active.length === 0) return null;
      return active.reduce((min, cur) => (cur.health / cur.maxHealth < min.health / min.maxHealth ? cur : min), active[0]);
    };

    const leftWeakSlot = getWeakestSlot(leftFlankSlots);
    const rightWeakSlot = getWeakestSlot(rightFlankSlots);

    // Check if there is an intact officer on each flank coordinating the raid
    const leftOfficer = this.enemies.find((e) => e.type === 'officer' && e.x < hqX && e.health > 0 && e.state !== 'dying');
    const rightOfficer = this.enemies.find((e) => e.type === 'officer' && e.x > hqX && e.health > 0 && e.state !== 'dying');

    for (const enemy of this.enemies) {
      enemy.y = gY;

      // If enemy is dying, update their death timer and spawn battlefield smoke/dust dissipation particles
      if (enemy.state === 'dying') {
        enemy.deathTimer = (enemy.deathTimer || 0) - dt;
        if (Math.random() < 0.28) {
          this.particles.push({
            id: `smoke_${Math.random()}`,
            x: enemy.x + (Math.random() - 0.5) * 20,
            y: gY - 10 - Math.random() * 16,
            vx: (Math.random() - 0.5) * 16,
            vy: -15 - Math.random() * 25,
            color: enemy.type === 'armoured_car' ? '#334155' : '#cbd5e1',
            size: 3 + Math.random() * 3,
            alpha: 0.6,
            life: 0.65,
            maxLife: 0.65,
            type: 'smoke',
          });
        }
        continue;
      }
      
      // Kingdom Two Crowns enemy mechanics:
      // 1. Forest speed: inside uncleared tree canopy, enemies move swiftly (1.85x speed)
      // 2. Open plains / light speed: in cleared territory, enemies march at normal speed (1.0x)
      // 3. Daytime sunlight: enemies DO NOT instantly disappear! They become weakened and slowed down (0.42x)
      const inForest = this.isPositionInForest(enemy.x);
      const isDaytime = this.state.timePhase === 'day' || this.state.timePhase === 'dawn';

      // Squad Officer Proximity Buff (+25% speed & morale during tactical raid)
      const isNearOfficer = (enemy.x < hqX && leftOfficer && Math.abs(enemy.x - leftOfficer.x) < 240) ||
                            (enemy.x > hqX && rightOfficer && Math.abs(enemy.x - rightOfficer.x) < 240);
      const squadBuffMult = isNearOfficer ? 1.25 : 1.0;

      const terrainSpeedMult = inForest ? 1.85 : 1.0;
      const daySpeedMult = isDaytime ? 0.42 : 1.0;
      const effectiveSpeed = enemy.speed * terrainSpeedMult * daySpeedMult * squadBuffMult;

      // Daylight weakens attack recovery slightly and produces disoriented smoke particles
      const cooldownRecoveryRate = isDaytime ? 0.6 : (isNearOfficer ? 1.2 : 1.0);
      if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt * cooldownRecoveryRate;
      if (isDaytime && Math.random() < 0.03) {
        this.spawnDebris(enemy.x, gY - 18, '#fbbf24', 1);
      }

      // Enemy target: march towards HQ center
      const targetDir = enemy.x > hqX ? -1 : 1;
      enemy.facing = targetDir;

      // Distance to Commander
      const distToCmd = Math.abs(enemy.x - cmd.x);

      // Melee attack Commander if in close proximity
      if (distToCmd < 36 && cmd.invulnerableTimer <= 0 && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = 1.0;
        cmd.invulnerableTimer = 1.8; // grace period / red flash
        cmd.health = Math.max(0, cmd.health - 1);
        soundEngine.playCommanderHurt();
        soundEngine.playHorseWhinny();
        this.spawnBlood(cmd.x, gY - 30, 6);

        if (cmd.mecidiye > 0) {
          const dropped = Math.min(3, cmd.mecidiye);
          cmd.mecidiye -= dropped;
          this.spawnGroundCoin(cmd.x, dropped, true);
          this.addFloatingText(cmd.x, 370, `💔 -1 Can! (${cmd.health}/${cmd.maxHealth}) Sikkeler Saçıldı!`, '#ef4444');
        } else {
          this.addFloatingText(cmd.x, 370, `💔 -1 Can! (${cmd.health}/${cmd.maxHealth})`, '#ef4444');
        }

        if (cmd.health <= 0) {
          cmd.isMounted = false;
          cmd.state = 'hit';
          this.state.isGameOver = true;
          this.state.isVictory = false;
          this.addFloatingText(cmd.x, 340, 'KUMANDAN VE ATI DÜŞTÜ! MAĞLUBİYET!', '#ef4444');
          soundEngine.playMusic('defeat');
        }
      }

      // Check if an intact barbed wire & sandbags barrier stands in front of enemy blocking line of fire
      const blockingWire = this.slots.find((s) => {
        if (s.type !== 'barbed_wire' || s.level <= 0 || s.health <= 0) return false;
        if (enemy.x < hqX) {
          return s.x > enemy.x && s.x <= hqX + 30;
        } else {
          return s.x < enemy.x && s.x >= hqX - 30;
        }
      });

      // Targeted weak fortification for tactical raid
      const flankWeakSlot = enemy.x < hqX ? leftWeakSlot : rightWeakSlot;

      // Enemy Ranged Shooting / Grenade Lobbing at Defense Lines or Commander
      if (enemy.attackCooldown <= 0) {
        // If blocking wire exists, commander and soldiers behind the wire CANNOT be targeted directly by small arms
        const canShootCmd = !blockingWire && distToCmd < 260 && distToCmd > 40;
        const canShootSoldier = this.soldiers.some((s) => {
          if (Math.abs(s.x - enemy.x) >= 270) return false;
          if (blockingWire) {
            if (enemy.x < hqX && s.x >= blockingWire.x - 15) return false;
            if (enemy.x > hqX && s.x <= blockingWire.x + 15) return false;
          }
          return true;
        });

        if (enemy.type === 'grenadier') {
          // Smart Grenadier: Target identified weak point or nearest manned trench
          const targetSlot = flankWeakSlot && Math.abs(flankWeakSlot.x - enemy.x) < 320
            ? flankWeakSlot
            : this.slots.find((s) => (s.type === 'trench' || s.type === 'barbed_wire') && s.level > 0 && Math.abs(s.x - enemy.x) < 280);
          
          if (canShootCmd || canShootSoldier || targetSlot) {
            enemy.attackCooldown = 3.0;
            enemy.state = 'shooting';
            soundEngine.playExplosion(false);
            const targetX = targetSlot ? targetSlot.x : (canShootCmd ? cmd.x : enemy.x + enemy.facing * 180);
            this.spawnProjectile({
              id: `egrenade_${this.projIdCounter++}`,
              x: enemy.x + enemy.facing * 12,
              y: gY - 26,
              vx: enemy.facing * 230,
              vy: -210,
              type: 'grenade',
              damage: 55,
              radius: 55,
              source: 'enemy',
              life: 1.8,
              targetX,
              targetY: gY,
            });
          }
        } else if (enemy.type === 'stormtrooper') {
          // Stormtrooper: Rapid suppressive cover bursts to pin down defenders
          if (distToCmd < 200 || this.soldiers.some((s) => Math.abs(s.x - enemy.x) < 200) || (flankWeakSlot && Math.abs(flankWeakSlot.x - enemy.x) < 200)) {
            enemy.attackCooldown = 1.1;
            enemy.state = 'shooting';
            soundEngine.playGunshot(true);
            this.spawnDebris(enemy.x + enemy.facing * 20, gY - 20, '#f97316', 6);
            this.spawnProjectile({
              id: `ebullet_${this.projIdCounter++}`,
              x: enemy.x + enemy.facing * 16,
              y: gY - 20,
              vx: enemy.facing * 700,
              vy: (Math.random() - 0.5) * 16,
              type: 'enemy_bullet',
              damage: 32,
              radius: 5,
              source: 'enemy',
              life: 0.95,
            });
          }
        } else if (enemy.type === 'infantry' || enemy.type === 'scout' || enemy.type === 'officer' || enemy.type === 'highlander') {
          if (canShootCmd || canShootSoldier || (flankWeakSlot && Math.abs(flankWeakSlot.x - enemy.x) < 240)) {
            enemy.attackCooldown = enemy.type === 'scout' ? 1.4 : 2.0;
            enemy.state = 'shooting';
            soundEngine.playGunshot(false);
            this.spawnProjectile({
              id: `ebullet_${this.projIdCounter++}`,
              x: enemy.x + enemy.facing * 16,
              y: gY - 22,
              vx: enemy.facing * 710,
              vy: (Math.random() - 0.5) * 10,
              type: 'enemy_bullet',
              damage: 18,
              radius: 3.5,
              source: 'enemy',
              life: 1.2,
            });
          }
        }
      }

      // Check physical obstacles in front (Barbed wire, manned trenches, headquarters)
      const obstacle = this.slots.find((s) => {
        if (s.level <= 0 || s.health <= 0) return false;
        if (Math.abs(s.x - enemy.x) >= 28) return false;
        if (s.type === 'barbed_wire' || s.type === 'headquarters') return true;
        if (s.type === 'trench' && s.assignedSoldierIds.length > 0) return true;
        return false;
      });

      // Ground soldiers in front (assault squads, garrison, or vanguard)
      // User: "düşman askeri kalkana doğru koşuyor ve sürekli koşma animasyonunda oluyor onlarda çatışsın taaruz askerleriyle içinden geçmeye çalışmasın"
      const soldierInFront = this.soldiers.find((s) => {
        if (s.health <= 0 || s.state === 'dying') return false;
        if (s.y < gY - 15) return false; // In watchtower or high roof position
        const dist = Math.abs(s.x - enemy.x);
        const inFront = (s.x - enemy.x) * enemy.facing >= -25;
        return dist < 220 && inFront;
      });

      if (obstacle && obstacle.health > 0) {
        // Attack obstacle with dynamic damage feedback & splinter FX
        enemy.state = 'shooting';
        if (enemy.attackCooldown <= 0) {
          enemy.attackCooldown = 0.9;
          
          // Heavy damage reduction for stone/tier-3 structures against armored/heavy enemies
          const dmgReduction = obstacle.level >= 3 ? 0.3 : 1.0;
          obstacle.health -= (enemy.damage * dmgReduction);
          
          soundEngine.playGunshot(false);

          // Progressive visual damage particles (Torn burlap sandbags, wood splinters, sparks)
          if (obstacle.type === 'barbed_wire') {
            this.spawnDebris(obstacle.x, gY - 12, '#94a3b8', 4); // Metal wire sparks
            this.spawnDebris(obstacle.x, gY - 8, '#78350f', 3);  // Wooden stake splinters
          } else if (obstacle.type === 'trench') {
            this.spawnDebris(obstacle.x, gY - 15, '#ca8a04', 5); // Sandbag sand dust
            this.spawnDebris(obstacle.x, gY - 10, '#451a03', 4); // Trench timber splinters
          }

          // Barbed wire reflected thorns damage to attackers (higher tier wire damages attacking infantry)
          if (obstacle.type === 'barbed_wire' && obstacle.level >= 2) {
            enemy.health -= obstacle.level * 4;
            this.spawnDebris(enemy.x, gY - 14, '#991b1b', 4);
            if (Math.random() < 0.25) soundEngine.playBayonetClash();
          }

          if (obstacle.health <= 0) {
            obstacle.level = 0;
            obstacle.health = 0;
            obstacle.underConstruction = false;
            obstacle.constructionProgress = 0;
            obstacle.coinsDeposited = 0;
            obstacle.repairCoinsDeposited = 0;
            
            // Spawn heavy destruction explosion & debris
            this.spawnDebris(obstacle.x, gY - 15, '#ea580c', 16);
            this.spawnDebris(obstacle.x, gY - 15, '#1e293b', 14);
            this.spawnDebris(obstacle.x, gY - 15, '#ca8a04', 12);
            
            // Reset to Level 1 rebuilding cost
            if (obstacle.type === 'barbed_wire') obstacle.costMecidiye = 2;
            else if (obstacle.type === 'trench') obstacle.costMecidiye = 2;
            else if (obstacle.type === 'machine_gun') obstacle.costMecidiye = 2;
            else if (obstacle.type === 'watchtower') obstacle.costMecidiye = 2;
            else if (obstacle.type === 'artillery') obstacle.costMecidiye = 3;
            else obstacle.costMecidiye = 1;

            this.addFloatingText(obstacle.x, 380, `💥 ${obstacle.titleTr} Yıkıldı! Sikkelerle Tekrar Kurulabilir`, '#ef4444');
            soundEngine.playExplosion(false);
          }
        }
      } else if (soldierInFront) {
        // HALT IMMEDIATELY! Do not run through friendly troops!
        // Face the soldier and engage in combat until defeated
        const sDist = Math.abs(soldierInFront.x - enemy.x);
        enemy.facing = (soldierInFront.x > enemy.x ? 1 : -1) as 1 | -1;

        if (sDist < 42) {
          // Melee range combat: Bayonet / club / trench spade attack
          enemy.state = 'bayonet';
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 0.8;
            let appliedDmg = enemy.damage;
            if (soldierInFront.isAssaultHeavyArmor) {
              // Authentic WWI Sappenpanzer heavy steel armor deflects 60% of melee damage!
              appliedDmg = Math.max(4, Math.round(enemy.damage * 0.4));
              soundEngine.playBayonetClash();
              this.spawnDebris(soldierInFront.x, gY - 18, '#94a3b8', 4);
            } else {
              soundEngine.playBayonetClash();
              this.spawnBlood(soldierInFront.x, gY - 20, 3);
            }
            soldierInFront.health -= appliedDmg;
            if (soldierInFront.health <= 0) {
              this.onSoldierDefeated(soldierInFront);
            }
          }
        } else {
          // Ranged combat: Stand firm, raise rifle and shoot at soldier!
          enemy.state = 'shooting';
          if (enemy.attackCooldown <= 0) {
            const cooldowns: Record<string, number> = {
              stormtrooper: 1.1,
              scout: 1.4,
              officer: 1.6,
              highlander: 1.8,
              grenadier: 2.8,
              infantry: 1.9,
            };
            enemy.attackCooldown = cooldowns[enemy.type] || 1.8;
            soundEngine.playGunshot(enemy.type === 'stormtrooper');
            this.spawnProjectile({
              id: `ebullet_${this.projIdCounter++}`,
              x: enemy.x + enemy.facing * 16,
              y: gY - 22,
              vx: enemy.facing * 710,
              vy: (Math.random() - 0.5) * 10,
              type: 'enemy_bullet',
              damage: enemy.damage || 18,
              radius: 3.5,
              source: 'enemy',
              life: 1.2,
            });
          }
        }
      } else {
        // March forward through open ground and past watchtowers (scaled by forest canopy and daytime)
        // Ensure enemies march in disciplined single file / sequential column without overlapping ("peş peşe gelsin")
        const sameFlankAhead = this.enemies.find((other) => {
          if (other.id === enemy.id || other.health <= 0 || other.state === 'dying') return false;
          const isAhead = enemy.facing === 1 ? (other.x > enemy.x && other.x - enemy.x < 36) : (other.x < enemy.x && enemy.x - other.x < 36);
          return isAhead;
        });

        const queueSpeedMult = sameFlankAhead ? 0.45 : 1.0;
        enemy.state = 'marching';
        enemy.x += enemy.facing * effectiveSpeed * queueSpeedMult * 45 * dt;
      }
    }

    this.enemies = this.enemies.filter((e) => e.health > 0 || (e.state === 'dying' && (enemy => (enemy.deathTimer || 0) > 0)(e)));
  }

  private spawnEnemyWave() {
    this.nightWavesSpawnedCount += 1;
    const w = this.state.level.worldWidth;
    const isBloodMoon = this.state.dayNumber % 3 === 0;
    // Determine spawn flanks (use planned radio wave if decoded/planned, or default formula)
    const sides: ('left' | 'right')[] = [];
    if (this.plannedNightWave) {
      if (this.plannedNightWave.flank === 'both') {
        sides.push('left', 'right');
      } else {
        sides.push(this.plannedNightWave.flank);
      }
    } else if (isBloodMoon || Math.random() < 0.35 + this.state.dayNumber * 0.1) {
      sides.push('left', 'right'); // Pincer assault!
    } else {
      sides.push(Math.random() < 0.5 ? 'left' : 'right');
    }

    const enemyTypes: Enemy['type'][] = ['scout', 'infantry', 'highlander'];
    if (this.state.dayNumber >= 2) enemyTypes.push('grenadier');
    if (this.state.dayNumber >= 3) enemyTypes.push('officer');
    if (this.state.dayNumber >= 4) enemyTypes.push('stormtrooper');
    if (this.state.dayNumber >= 5 && Math.random() < 0.35) enemyTypes.push('armoured_car');

    const bloodMultiplier = isBloodMoon ? 1.35 : 1.0;
    const hpMultiplier = this.state.level.baseEnemyMultiplier * (1 + this.state.dayNumber * 0.35) * bloodMultiplier;
    // Sequential wave per night: squad size scales continuously with days or matches planned intelligence
    const squadSize = this.plannedNightWave
      ? this.plannedNightWave.squadSize
      : (this.state.dayNumber === 1
        ? 5
        : Math.min(20, 5 + Math.floor(this.state.dayNumber * 1.8) + (isBloodMoon ? 5 : 0)));

    for (const spawnSide of sides) {
      const camp = this.landingCamps.find((c) => c.side === spawnSide);
      if (camp && camp.isDestroyed) {
        // Destroyed coastal beachhead! No landings can occur on this flank
        continue;
      }
      const baseSpawnX = camp ? camp.x : (spawnSide === 'left' ? 180 : w - 180);

      for (let i = 0; i < squadSize; i++) {
        const type = i === 0 && this.state.dayNumber >= 3 && Math.random() < 0.4
          ? 'officer'
          : enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

        let maxHealth = 130 * hpMultiplier;
        let damage = 20;
        let speed = 1.0;
        let bounty = 1;

        if (type === 'scout') {
          maxHealth = 95 * hpMultiplier;
          damage = 16;
          speed = 1.35;
          bounty = 1;
        } else if (type === 'highlander') {
          maxHealth = 240 * hpMultiplier;
          damage = 32;
          speed = 1.25;
          bounty = 2;
        } else if (type === 'officer') {
          maxHealth = 300 * hpMultiplier;
          damage = 28;
          speed = 1.1;
          bounty = 3;
        } else if (type === 'stormtrooper') {
          maxHealth = 440 * hpMultiplier;
          damage = 42;
          speed = 1.05;
          bounty = 4;
        } else if (type === 'armoured_car') {
          maxHealth = 750 * hpMultiplier;
          damage = 52;
          speed = 0.7;
          bounty = 5;
        } else if (type === 'grenadier') {
          maxHealth = 180 * hpMultiplier;
          damage = 35;
          speed = 0.95;
          bounty = 2;
        }

        // Staggered sequential formation (peş peşe intizamlı yürüyüş)
        const offset = spawnSide === 'left' ? -i * 54 : i * 54;
        const xPos = baseSpawnX + offset;

        this.enemies.push({
          id: `enemy_${this.enemyIdCounter++}`,
          x: xPos,
          y: 440,
          type,
          health: maxHealth,
          maxHealth,
          speed,
          facing: spawnSide === 'left' ? 1 : -1,
          state: 'marching',
          attackCooldown: 0,
          damage,
          range: 150,
          bountyMecidiye: bounty,
        });
      }
    }

    if (this.plannedNightWave) {
      // Güvenilir istihbarat: Telsiz ne dediyse tam o kadar ve o kanattan geldi, ilave bilinmeyen dalga çıkmaz!
      this.nightWavesSpawnedCount = this.maxNightWaves;
    }
  }

  public onSoldierDefeated(soldier: Soldier) {
    if (soldier.state === 'dying') return;
    soldier.health = 0;
    soldier.state = 'dying';
    soldier.isWalking = false;
    soldier.deathTimer = 2.4;
    soldier.maxDeathTimer = 2.4;
    // 3 Distinct Realistic Death Animations (0: Forward kneel/collapse, 1: Backwards impact recoil, 2: Sideways stagger roll)
    soldier.deathAnimType = Math.floor(Math.random() * 3);

    // Detach from structures immediately
    if (soldier.assignedSlotId) {
      const slot = this.slots.find((s) => s.id === soldier.assignedSlotId);
      if (slot) {
        slot.assignedSoldierIds = slot.assignedSoldierIds.filter((id) => id !== soldier.id);
      }
      soldier.assignedSlotId = null;
    }
    soldier.targetTreeId = null;
    soldier.isAssaultSquad = false;
    soldier.isArtilleryCrew = false;

    // Drop collected coins on ground so they aren't lost
    if (soldier.coinsHeld && soldier.coinsHeld > 0) {
      this.spawnGroundCoin(soldier.x, soldier.coinsHeld, false, 0.3);
      soldier.coinsHeld = 0;
    }

    this.spawnBlood(soldier.x, (soldier.y || 440) - 18, 6);
    this.spawnDebris(soldier.x, (soldier.y || 440) - 10, '#78350f', 3);
    this.addFloatingText(soldier.x, (soldier.y || 440) - 35, '🇹🇷 Bir Neferimiz Şehit Düştü!', '#ef4444');
    soundEngine.playCommanderHurt();
  }

  private onEnemyDefeated(enemy: Enemy) {
    if (enemy.state === 'dying') return;
    enemy.health = 0;
    enemy.state = 'dying';
    enemy.deathTimer = 1.8;
    enemy.maxDeathTimer = 1.8;
    // 4 Distinct Organic Death Animations:
    // 0: Knees-first forward slump (chest hit)
    // 1: Backwards stumble & collapse onto back
    // 2: Sideways rotational shoulder drop & curl
    // 3: Kinetic sprint stumble & forward slide
    enemy.deathAnimType = Math.floor(Math.random() * 4);

    this.state.enemiesDefeated += 1;
    this.state.score += (enemy.bountyMecidiye || 1) * 100;

    // Defeat sound & immediate ground impact effects
    if (enemy.type === 'armoured_car') {
      soundEngine.playExplosion(true);
      this.spawnDebris(enemy.x, (enemy.y || 440) - 25, '#1e293b', 16);
      this.spawnDebris(enemy.x, (enemy.y || 440) - 25, '#ea580c', 14);
    } else {
      this.spawnBlood(enemy.x, (enemy.y || 440) - 16, 5);
      this.spawnDebris(enemy.x, (enemy.y || 440) - 4, '#78350f', 4);
    }

    // User directive: Defeated enemies do not generate free coins automatically.
    // Coins ONLY drop if the enemy picked up/held coins while marching on the path!
    if (enemy.coinsHeld && enemy.coinsHeld > 0) {
      this.spawnGroundCoin(enemy.x, enemy.coinsHeld);
      this.addFloatingText(enemy.x, 400, `🪙 ${enemy.coinsHeld} Çalıntı Sikke Geri Alındı!`, '#fbbf24');
      soundEngine.playCoin();

      // Spawn coin sparkle particle
      this.particles.push({
        id: `coin_${Math.random()}`,
        x: enemy.x,
        y: 430,
        vx: (Math.random() - 0.5) * 60,
        vy: -120,
        color: '#fbbf24',
        size: 4,
        alpha: 1,
        life: 1.0,
        maxLife: 1.0,
        type: 'coin',
      });
      enemy.coinsHeld = 0;
    }
  }

  private updateProjectiles(dt: number) {
    const gY = 440;
    const cmd = this.commander;

    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      // Gravity for shells & grenades
      if (p.type === 'artillery_shell' || p.type === 'grenade' || p.type === 'naval_shell') {
        p.vy += 260 * dt;
      }

      // Direct hit on enemy mid-air or hit ground
      let shellDetonated = false;
      if (p.type === 'artillery_shell' || p.type === 'grenade' || p.type === 'naval_shell') {
        for (const e of this.enemies) {
          if (e.health <= 0 || e.state === 'dying') continue;
          if (Math.abs(e.x - p.x) < 32 && Math.abs((e.y || gY) - 20 - p.y) < 32) {
            shellDetonated = true;
            break;
          }
        }
      }

      // Hit Ground or Target
      if (p.y >= gY || p.life <= 0 || shellDetonated) {
        p.life = 0;

        if (p.type === 'artillery_shell' || p.type === 'grenade' || p.type === 'naval_shell') {
          soundEngine.playExplosion(p.type !== 'grenade');
          this.spawnDebris(p.x, gY, '#ea580c', 22);

          // Area of effect damage to marching enemies
          for (const e of this.enemies) {
            if (e.health <= 0 || e.state === 'dying') continue;
            const dist = Math.abs(e.x - p.x);
            if (dist < p.radius) {
              e.health -= p.damage * Math.max(0.4, 1 - dist / p.radius);
              this.spawnBlood(e.x, (e.y || gY) - 15, 3);
              if (e.health <= 0) this.onEnemyDefeated(e);
            }
          }

          // Explosive damage to landing camp ship / beachhead fortifications
          if (p.source === 'assault_squad' || p.source === 'soldier') {
            for (const camp of this.landingCamps) {
              if (camp.isDestroyed) continue;
              const distToCamp = Math.abs(p.x - camp.x);
              if (distToCamp < (p.radius || 75) + 60) {
                const blastDmg = p.damage * Math.max(0.6, 1 - distToCamp / ((p.radius || 75) + 60));
                camp.health -= blastDmg;
                this.spawnDebris(p.x, gY - 20, '#ea580c', 12);
                this.spawnDebris(p.x, gY - 20, '#e2e8f0', 8);

                if (camp.health <= 0) {
                  camp.health = 0;
                  camp.isDestroyed = true;
                  soundEngine.playExplosion(true);
                  this.spawnDebris(camp.x, gY - 30, '#1e293b', 35);
                  this.spawnDebris(camp.x, gY - 30, '#ea580c', 30);

                  // All participating soldiers return together safely without vanishing or losing armor
                  const hq = this.slots.find((s) => s.id === 'hq_main');
                  const hqX = hq ? hq.x : 2500;
                  for (const sol of this.soldiers) {
                    if (sol.isAssaultSquad && (sol.targetCampId === camp.id || !this.landingCamps.some((c) => !c.isDestroyed))) {
                      sol.targetCampId = null;
                      sol.isReturningFromAssault = true;
                      sol.isWalking = true;
                      sol.state = 'walking';
                      sol.weaponState = 'shouldered';
                      sol.facing = sol.x > hqX ? -1 : 1;
                    }
                  }

                  const allDestroyed = this.landingCamps.every((c) => c.isDestroyed);
                  if (allDestroyed) {
                    this.state.isVictory = true;
                    soundEngine.playMusic('victory');
                    this.addFloatingText(camp.x, 330, '🏆 BÜYÜK ZAFER! TÜM İTİLAF ÇIKARTMA ÜSLERİ İMHA EDİLDİ!', '#22c55e');
                  } else {
                    this.addFloatingText(camp.x, 340, `💥 ${camp.nameTr} İMHA EDİLDİ! Diğer Sahili de Patlat!`, '#fbbf24');
                  }
                }
              }
            }
          }
        }
      }

      // Friendly bullet or shell hitting enemy
      if (p.source === 'soldier' || p.source === 'player') {
        // 1. Hit Enemies
        if (p.type === 'bullet' || p.type === 'tracer') {
          for (const e of this.enemies) {
            if (e.health <= 0 || e.state === 'dying') continue;
            const enemyTop = (e.y || gY) - 45;
            const enemyBottom = (e.y || gY) + 12;
            if (Math.abs(e.x - p.x) < 24 && p.y >= enemyTop && p.y <= enemyBottom) {
              p.life = 0;
              e.health -= p.damage;
              this.spawnBlood(e.x, (e.y || gY) - 20, 3);
              if (e.health <= 0) this.onEnemyDefeated(e);
              break;
            }
          }
        }
      }

      // 2. Direct Hit on Enemy Landing Camps (Invasion barges at map edges)
      if (p.source === 'assault_squad' || p.source === 'soldier') {
        for (const camp of this.landingCamps) {
          if (camp.isDestroyed) continue;
          if (Math.abs(p.x - camp.x) < 115 && Math.abs(p.y - (gY - 25)) < 70) {
            p.life = 0;
            // Steel ship hull resists light rifle bullets (15 damage), explosive shells and grenades deal full impact
            const actualDamage = (p.type === 'bullet' || p.type === 'tracer') ? Math.min(15, p.damage) : p.damage;
            camp.health -= actualDamage;
            soundEngine.playExplosion(false);
            this.spawnDebris(p.x, gY - 20, '#e2e8f0', 5);
            this.spawnDebris(p.x, gY - 20, '#ea580c', 4);

            if (camp.health <= 0) {
              camp.health = 0;
              camp.isDestroyed = true;
              soundEngine.playExplosion(true);
              this.spawnDebris(camp.x, gY - 30, '#1e293b', 30);
              this.spawnDebris(camp.x, gY - 30, '#ea580c', 25);

              // All participating soldiers return together safely without vanishing or losing armor
              const hq = this.slots.find((s) => s.id === 'hq_main');
              const hqX = hq ? hq.x : 2500;
              for (const sol of this.soldiers) {
                if (sol.isAssaultSquad && (sol.targetCampId === camp.id || !this.landingCamps.some((c) => !c.isDestroyed))) {
                  sol.targetCampId = null;
                  sol.isReturningFromAssault = true;
                  sol.isWalking = true;
                  sol.state = 'walking';
                  sol.weaponState = 'shouldered';
                  sol.facing = sol.x > hqX ? -1 : 1;
                }
              }

              // Check if both camps are destroyed!
              const allDestroyed = this.landingCamps.every((c) => c.isDestroyed);
              if (allDestroyed) {
                this.state.isVictory = true;
                soundEngine.playMusic('victory');
                this.addFloatingText(camp.x, 330, '🏆 BÜYÜK ZAFER! TÜM İTİLAF ÇIKARTMA ÜSLERİ İMHA EDİLDİ!', '#22c55e');
              } else {
                this.addFloatingText(camp.x, 340, `💥 ${camp.nameTr} İMHA EDİLDİ! Diğer Sahili de Patlat!`, '#fbbf24');
              }
            }
            break;
          }
        }
      }

      // Enemy bullet hitting Commander
      if (p.type === 'enemy_bullet') {
        if (Math.abs(p.x - cmd.x) < 24 && Math.abs(p.y - (gY - 26)) < 30) {
          p.life = 0;
          if (cmd.invulnerableTimer <= 0) {
            cmd.invulnerableTimer = 1.8;
            cmd.health = Math.max(0, cmd.health - 1);
            soundEngine.playCommanderHurt();
            soundEngine.playHorseWhinny();
            this.spawnBlood(cmd.x, gY - 30, 6);

            if (cmd.mecidiye > 0) {
              const dropped = Math.min(3, cmd.mecidiye);
              cmd.mecidiye -= dropped;
              this.spawnGroundCoin(cmd.x, dropped, true);
              this.addFloatingText(cmd.x, 370, `💔 -1 Can! (${cmd.health}/${cmd.maxHealth}) Sikkeler Saçıldı!`, '#ef4444');
            } else {
              this.addFloatingText(cmd.x, 370, `💔 -1 Can! (${cmd.health}/${cmd.maxHealth})`, '#ef4444');
            }

            if (cmd.health <= 0) {
              cmd.isMounted = false;
              cmd.state = 'hit';
              this.state.isGameOver = true;
              this.state.isVictory = false;
              this.addFloatingText(cmd.x, 340, 'KUMANDAN VE ATI DÜŞTÜ! MAĞLUBİYET!', '#ef4444');
              soundEngine.playMusic('defeat');
            }
          }
        } else {
          // Check if enemy bullet hits an active barbed wire & sandbags barrier or trench
          let wireHit = false;
          for (const slot of this.slots) {
            if ((slot.type === 'barbed_wire' || slot.type === 'trench') && slot.level > 0 && slot.health > 0) {
              if (Math.abs(slot.x - p.x) < 32 && Math.abs(gY - 20 - p.y) < 34) {
                p.life = 0;
                const dmgReduction = slot.level >= 3 ? 0.3 : 1.0;
                slot.health -= (p.damage * 0.5 * dmgReduction); // Absorb impact with tier scaling
                this.spawnDebris(slot.x, gY - 15, slot.type === 'trench' ? '#78350f' : '#d6c8a2', 3);
                wireHit = true;
                if (slot.health <= 0) {
                  slot.level = 0;
                  // Kick assigned soldiers out of destroyed trench
                  for (const s of this.soldiers) {
                    if (s.assignedSlotId === slot.id) {
                      s.assignedSlotId = null;
                      s.role = 'engineer';
                    }
                  }
                  slot.assignedSoldierIds = [];
                  this.addFloatingText(slot.x, 380, `${slot.titleTr} Yıkıldı!`, '#ef4444');
                  soundEngine.playExplosion(false);
                }
                break;
              }
            }
          }

          if (!wireHit) {
            // Check heavy armored vanguard first to act as a shield for the squad behind them
            let hitSoldier: typeof this.soldiers[0] | null = null;
            for (const s of this.soldiers) {
              if (s.state === 'dying' || s.health <= 0) continue;
              if (Math.abs(s.x - p.x) < 20 && Math.abs(gY - 20 - p.y) < 24) {
                if (s.isAssaultHeavyArmor) {
                  hitSoldier = s;
                  break;
                } else if (!hitSoldier) {
                  hitSoldier = s;
                }
              }
            }

            if (hitSoldier) {
              p.life = 0;
              if (hitSoldier.isAssaultHeavyArmor) {
                // WWI Heavy Sappenpanzer & ballistic shield deflects 75% of incoming bullet damage!
                const deflectedDamage = Math.max(2, Math.round(p.damage * 0.25));
                hitSoldier.health -= deflectedDamage;
                soundEngine.playRicochet();
                this.spawnDebris(hitSoldier.x + hitSoldier.facing * 8, gY - 20, '#fef08a', 4);
                this.spawnDebris(hitSoldier.x + hitSoldier.facing * 8, gY - 20, '#94a3b8', 3);
              } else {
                hitSoldier.health -= p.damage;
                this.spawnBlood(hitSoldier.x, gY - 20, 2);
              }

              if (hitSoldier.health <= 0) {
                this.onSoldierDefeated(hitSoldier);
              }
            }
          }
        }
      }
    }

    let projWrite = 0;
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      if (p.life > 0) {
        this.projectiles[projWrite++] = p;
      }
    }
    this.projectiles.length = projWrite;
  }

  private updateParticles(dt: number) {
    // In-place compaction: completely eliminates GC allocations and frame drops
    let pWrite = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      pt.alpha = pt.life / pt.maxLife;
      if (pt.life > 0) {
        this.particles[pWrite++] = pt;
      }
    }
    this.particles.length = pWrite;

    let tWrite = 0;
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const txt = this.floatingTexts[i];
      txt.y -= 25 * dt;
      txt.life -= dt;
      txt.alpha = Math.max(0, txt.life);
      if (txt.life > 0) {
        this.floatingTexts[tWrite++] = txt;
      }
    }
    this.floatingTexts.length = tWrite;
  }

  private checkGameConditions() {
    const hq = this.slots.find((s) => s.id === 'hq_main');
    if (hq && hq.health <= 0) {
      this.state.isGameOver = true;
      soundEngine.playMusic('defeat');
    }

    // Victory ONLY if all enemy invasion landing units/camps are destroyed!
    const bothCampsDestroyed = this.landingCamps.length > 0 && this.landingCamps.every((c) => c.isDestroyed);
    if (bothCampsDestroyed && !this.state.isGameOver) {
      if (!this.state.isVictory) {
        this.state.isVictory = true;
        soundEngine.playMusic('victory');
      }
    }
  }

  // --- Helper Spawn Functions ---

  private spawnBlood(x: number, y: number, count = 4) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        id: `blood_${Math.random()}`,
        x,
        y,
        vx: (Math.random() - 0.5) * 80,
        vy: -Math.random() * 80,
        color: '#dc2626',
        size: 3,
        alpha: 1,
        life: 0.5,
        maxLife: 0.5,
        type: 'blood',
      });
    }
  }

  private spawnDebris(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        id: `debris_${Math.random()}`,
        x,
        y,
        vx: (Math.random() - 0.5) * 160,
        vy: -Math.random() * 140,
        color,
        size: 3 + Math.random() * 3,
        alpha: 1,
        life: 0.8,
        maxLife: 0.8,
        type: 'debris',
      });
    }
  }

  public addFloatingText(x: number, y: number, text: string, color = '#ffffff') {
    this.floatingTexts.push({
      id: `txt_${Math.random()}`,
      x,
      y,
      text,
      color,
      alpha: 1,
      life: 1.8,
    });
  }

  public spawnProjectile(proj: Projectile) {
    this.projectiles.push(proj);
  }

  // --- Kingdom Classic Style Stone Title System ("ÇANAKKALE") ---

  public initStoneTitle(levelIndex: number = 0) {
    // Only created in Chapter 1 (Level 1: Seddülbahir) as requested ("1. bölümün başında")
    if (levelIndex !== 0) {
      this.state.stoneLetters = [];
      this.state.stoneTitleEnabled = false;
      return;
    }

    const hqX = this.state.level.worldWidth / 2;
    // In Chapter 1, commander starts far away in the deep forest at spawnX (hqX - 1750)
    // Stones start right ahead of commander and lead out through the forest towards HQ
    // as requested ("karargahtan uzakta ormanın içinde başlasın ilk bölüm")
    const spawnX = hqX - 1750;
    // Chapter 1 opening colossal 3D stone monolith letters: "1915"
    const word = ['1', '9', '1', '5'];
    const startX = spawnX + 80;
    const spacing = 110; // Spacing for colossal 3D stone monolith digits (Kumandanın 3 katı büyüklüğünde)

    this.state.stoneTitleEnabled = true;
    this.state.stoneLetters = word.map((char, index) => ({
      id: `stone_title_${index}`,
      char,
      x: startX + index * spacing,
      y: 440,
      state: 'standing',
      shatterTimer: 0,
      rubble: [],
      opacity: 1.0,
    }));
  }

  private updateStoneTitle(dt: number) {
    if (this.state.stoneTitleEnabled === false || !this.state.stoneLetters || this.state.stoneLetters.length === 0) return;
    const gY = 440;
    const cmd = this.commander;

    for (const letter of this.state.stoneLetters) {
      if (letter.state === 'standing') {
        // Trigger crumble when commander approaches or rides past the monumental stone letter
        const dist = Math.abs(cmd.x - letter.x);
        const passedRight = cmd.facing > 0 && cmd.x >= letter.x - 30 && cmd.x <= letter.x + 80;
        const passedLeft = cmd.facing < 0 && cmd.x <= letter.x + 30 && cmd.x >= letter.x - 80;

        if (dist < 48 || passedRight || passedLeft) {
          letter.state = 'shattering';
          letter.shatterTimer = 0;
          letter.opacity = 1.0;
          soundEngine.playHammer('stone');
          soundEngine.playDigOrChop('pickaxe');
          this.spawnDebris(letter.x, gY - 30, '#78716c', 16);
          this.spawnDebris(letter.x, gY - 70, '#a8a29e', 14);
          this.spawnDebris(letter.x, gY - 100, '#d6d3d1', 12);
          this.spawnDebris(letter.x, gY - 15, '#44403c', 14);

          // Spawn 22 physical stone rubble chunks matching 3x colossal monolith scale
          const count = 22;
          const blockColors = ['#57534e', '#78716c', '#a8a29e', '#44403c', '#d6d3d1', '#292524'];
          for (let i = 0; i < count; i++) {
            const spreadX = (Math.random() - 0.5) * 56;
            const spreadY = -Math.random() * 95 - 10;
            const dir = (Math.random() - 0.5) * 180;
            letter.rubble.push({
              x: letter.x + spreadX,
              y: gY + spreadY,
              vx: dir + cmd.vx * 0.2,
              vy: -Math.random() * 150 - 60,
              rotation: Math.random() * Math.PI * 2,
              rotSpeed: (Math.random() - 0.5) * 8,
              width: 8 + Math.random() * 12,
              height: 7 + Math.random() * 11,
              color: blockColors[Math.floor(Math.random() * blockColors.length)],
            });
          }
        }
      } else if (letter.state === 'shattering' || letter.state === 'crumbled') {
        letter.shatterTimer += dt;
        let anyMoving = false;
        for (const chunk of letter.rubble) {
          if (chunk.y < gY - 2 || Math.abs(chunk.vy) > 10 || Math.abs(chunk.vx) > 5) {
            anyMoving = true;
            chunk.vy += 520 * dt; // Gravity
            chunk.x += chunk.vx * dt;
            chunk.y += chunk.vy * dt;
            chunk.rotation += chunk.rotSpeed * dt;

            // Ground collision & bounce
            if (chunk.y >= gY - 2) {
              chunk.y = gY - 2;
              if (Math.abs(chunk.vy) > 35) {
                chunk.vy = -chunk.vy * 0.35;
                chunk.vx *= 0.65;
                chunk.rotSpeed *= 0.6;
              } else {
                chunk.vy = 0;
                chunk.vx *= 0.2;
                chunk.rotSpeed = 0;
              }
            }
          }
        }
        if (!anyMoving && letter.shatterTimer > 0.5) {
          letter.state = 'crumbled';
        }

        // Kingdom Classic fading: after 2.6s, fade out smoothly and disappear completely at 3.5s
        if (letter.shatterTimer >= 2.6) {
          letter.opacity = Math.max(0, 1 - (letter.shatterTimer - 2.6) / 0.9);
        } else {
          letter.opacity = 1.0;
        }
      }
    }

    // Remove letters whose rubble has completely faded out after 3.5 seconds
    this.state.stoneLetters = this.state.stoneLetters.filter((l) => l.shatterTimer < 3.5);
    if (this.state.stoneLetters.length === 0) {
      this.state.stoneTitleEnabled = false;
    }
  }
}
