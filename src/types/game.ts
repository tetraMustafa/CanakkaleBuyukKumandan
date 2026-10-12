/**
 * Çanakkale 1915: Siper Savunması - Type Definitions
 */

export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherType = 'clear' | 'rain' | 'fog' | 'storm' | 'snow';

export type TimePhase = 'dawn' | 'day' | 'dusk' | 'night' | 'midnight';

export type SoldierRole = 
  | 'recruit'        // Gönüllü Mehmetçik (henüz silahlandırılmamış)
  | 'engineer'       // İstihkam Eri (siper kazar, odun/demir toplar, onarım yapar)
  | 'infantry'       // Piyade Tüfekçi (Mauser 1893 tüfekli, süngü hücumu)
  | 'machinegunner'  // Makineli Tüfekçi (Maxim/Hotchkiss siper savunması)
  | 'artilleryman'   // Topçu Eri (Sahra/Havan topu bataryası)
  | 'medic'          // Hilal-i Ahmer Sıhhiyecisi (yaralıları kurtarır)
  | 'sniper';        // Keskin Nişancı (Gözetleme kulesinde)

export type EnemyType =
  | 'scout'          // Anzak Öncü Eri (hızlı, hafif tüfek)
  | 'infantry'       // Britanya Piyadesi (yaylım ateşi)
  | 'highlander'     // İskoç Taarruz Kıtası (süngü hücumu, dayanıklı)
  | 'grenadier'      // Bombalı Hücum Eri (siperlere el bombası fırlatır)
  | 'officer'        // İtilaf Yüzbaşısı (düdük çalar, düşmanları hızlandırır/güçlendirir)
  | 'naval_spotter'  // Donanma Ateş İdarecisi (gemiden top mermisi yağdırır)
  | 'stormtrooper'   // Alev Silahlı & Çelik Zırhlı Şok Hücum Kıtası (ileri günlerde taarruz)
  | 'armoured_car';  // Zırhlı Gece Taarruz Aracı (Boss)

export type MountType = 'white' | 'brown' | 'black';

export type SlotType =
  | 'headquarters'   // Karargah Çadırı / Kumanda Merkezi
  | 'assault_banner' // Sol / Sağ Taarruz Sancağı (Hücum Taburu Akıncısı Donatma Noktası)
  | 'artillery_workshop' // Sahra Topçu Atölyesi (Karargah Sv. 3'te açılır, 8 Sikke ile yürüyen Sahra Topu döker)
  | 'trench'         // Siper Mevzisi
  | 'barbed_wire'    // Dikenli Tel & Kum Torbası Engeli
  | 'machine_gun'    // Makineli Tüfek Koruganı
  | 'artillery'      // Sahra Topu / Havan Mevzisi
  | 'watchtower'     // Gözetleme & Keskin Nişancı Kulesi
  | 'hospital'       // Hilal-i Ahmer Sahra Hastanesi
  | 'armory'         // Cephanelik Deposu
  | 'scavenge_wood'  // Çam Ağaçlığı (Odun kesme)
  | 'scavenge_iron'  // Maden / Mühimmat Enkazı (Demir/Hurda çıkarma)
  | 'treasure_chest' // Terkedilmiş Hazine Sandığı (Keşif)
  | 'recruit_camp'   // İkmal Çadırı / İskele (Yeni asker sevkiyatı)
  | 'shrine_relic'   // Tarihi Yadigar (Seyit Onbaşı, 57. Alay Sancağı, Nusret Mayını)
  | 'wild_horse'     // Ormanda Otlayan Yabani At (7 Sikke ile Evcilleştir)
  | 'tethered_horse';// Terkedilmiş/Otlaya Bırakılmış At (4 Sikke ile Tekrar Bin)

export type AnimalType = 'rabbit' | 'deer' | 'partridge';

export interface WildAnimal {
  id: string;
  type: AnimalType;
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
  state: 'wandering' | 'fleeing' | 'grazing' | 'alert';
  health: number;
  maxHealth: number;
  bountyMecidiye: number;
  fleeTimer: number;
  hopTimer: number;
  isDead?: boolean;
}

export interface BuildSlot {
  id: string;
  x: number;
  y?: number;
  type: SlotType;
  level: number;       // 0 = unbuilt/unclaimed, 1 = Tier 1, 2 = Tier 2, 3 = Tier 3
  maxLevel: number;
  health: number;
  maxHealth: number;
  side: 'left' | 'right' | 'center';
  costMecidiye: number;
  costTimber?: number;
  costIron?: number;
  upgradeDescription: string;
  titleTr: string;
  assignedSoldierIds: string[];
  maxSoldiers: number;
  lastRepairedAt?: number;
  underConstruction?: boolean;
  constructionProgress?: number; // 0 to 1
  constructionDuration?: number; // in seconds
  isScavenged?: boolean; // For trees / rocks / chests
  scavengeTimer?: number; // Accumulated wait time to chop/gather
  isBlockedByForest?: boolean; // Cannot be built until surrounding forest trees are chopped
  forestZoneId?: string; // For tree clearing zones
  relicClaimed?: boolean;
  relicEffect?: string;
  isMarkedForChop?: boolean; // Kingdom style: 1 coin deposited to mark tree for felling
  chopProgress?: number;     // 0 to 1 progress while soldier is actively chopping
  assignedWoodcutterId?: string | null;
  availableRecruits?: number; // Kingdom vagrant camp: max 2 recruits waiting at camp
  recruitSpawnTimer?: number; // Timer to spawn next recruit up to 2
  maxRecruitsTotal?: number;  // Difficulty-balanced total recruits that can emerge from this village
  recruitsSpawnedTotal?: number; // Total recruits spawned from this village so far
  coinsDeposited?: number; // Pre-dropped coins waiting for recruits or building
  repairCoinsDeposited?: number; // Coins deposited specifically for building repairs
  availableRifles?: number; // Kingdom armory: 0 to 6 rifles resting on the rifle bench
  maxRifles?: number; // Maximum rifles on the bench (default 6)
  availableAssaultArmors?: number; // Assault banner armor suits waiting for soldiers to equip
  horseType?: MountType; // 'white' | 'brown' | 'black'
  isHorseTamed?: boolean;
  clearedProgress?: number; // 0 to 1 as felled trees clear out and grass withers
}

export interface FieldArtillery {
  id: string;
  x: number;
  y: number;
  facing: 1 | -1;
  side: 'left' | 'right';
  health: number;
  maxHealth: number;
  crewSoldierIds: string[]; // 2 assault soldiers manning the gun
  targetCampId: string | null;
  state: 'moving' | 'unlimbering' | 'firing' | 'reloading' | 'idle';
  reloadCooldown: number;
  speed: number;
  wheelRotation: number;
  muzzleFlashTimer?: number;
}

export type WeaponState = 'shouldered' | 'ready_aim' | 'firing' | 'reloading';

export interface GroundCoin {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  bounceCount?: number;
  collected?: boolean;
  pickupDelay?: number;
}

export interface Soldier {
  id: string;
  x: number;
  y: number;
  role: SoldierRole;
  health: number;
  maxHealth: number;
  facing: 1 | -1;
  state: 'idle' | 'walking' | 'running' | 'digging' | 'shooting' | 'aiming' | 'bayonet' | 'healing' | 'wounded' | 'retreating' | 'garrisoned' | 'dying';
  weaponState?: WeaponState;
  assignedSlotId: string | null;
  targetEnemyId: string | null;
  attackCooldown: number;
  bayonetDamage: number;
  ammoInClip: number;
  maxAmmoInClip: number;
  speed: number;
  name: string;
  moraleBuffTimer: number;
  muzzleFlashTimer?: number;
  coinsHeld?: number;
  isRetinue?: boolean;
  isAssaultSquad?: boolean;
  isAssaultHeavyArmor?: boolean;
  assaultOrder?: number;
  targetEquipSlotId?: string | null;
  assaultSide?: 'left' | 'right';
  targetCampId?: string | null;
  targetTreeId?: string | null;
  huntCooldown?: number;
  coinDropTimer?: number;
  isArtilleryCrew?: boolean;
  artilleryId?: string | null;
  isReturningFromAssault?: boolean;
  defenseFlank?: 'left' | 'right';
  isWalking?: boolean;
  assaultCoinsDeposited?: number;
  assaultState?: 'defending' | 'charging'; // Kingdom knight style: defense until ordered with 1 coin
  huntAimTimer?: number; // Pre-firing rifle aim timer when hunting animals
  huntAimTargetId?: string | null;
  deathTimer?: number;
  maxDeathTimer?: number;
  deathAnimType?: number; // 0: Forward kneel & fold, 1: Backwards blowback recoil, 2: Sideways stagger roll
}

export interface LandingCamp {
  id: string;
  side: 'left' | 'right';
  x: number;
  health: number;
  maxHealth: number;
  isDestroyed: boolean;
  nameTr: string;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  facing: 1 | -1;
  state: 'marching' | 'shooting' | 'charging' | 'throwing_bomb' | 'dying' | 'bayonet';
  attackCooldown: number;
  damage: number;
  range: number;
  targetSoldierId?: string | null;
  targetSlotId?: string | null;
  bombTimer?: number;
  bountyMecidiye: number;
  coinsHeld?: number;
  deathTimer?: number;
  maxDeathTimer?: number;
  deathAnimType?: number; // 0: Forward kneel, 1: Backwards drop, 2: Side roll
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'bullet' | 'enemy_bullet' | 'artillery_shell' | 'grenade' | 'flare' | 'naval_shell' | 'tracer';
  damage: number;
  radius: number;
  source: 'player' | 'soldier' | 'enemy' | 'assault_squad';
  life: number;
  targetX?: number;
  targetY?: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'spark' | 'smoke' | 'dirt' | 'blood' | 'coin' | 'muzzle' | 'debris' | 'rain' | 'snow' | 'ember' | 'flare_light';
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  life: number;
}

export interface PlayerCommander {
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
  isMounted: boolean; // At sırtında mı?
  mountType?: MountType; // 'white' (standard), 'brown' (swift), 'black' (enduring)
  health: number; // Kumandanın Canı (5 Kalp)
  maxHealth: number;
  horseHealth: number; // Atın Dayanıklılığı
  maxHorseHealth: number;
  horsePanicTimer?: number;
  stamina: number;
  maxStamina: number;
  isSprinting: boolean;
  state: 'idle' | 'walking' | 'galloping' | 'whistling' | 'chopping' | 'mining' | 'interacting' | 'hit';
  mecidiye: number;     // Altın / Mecidiye sikkesi
  maxMecidiye: number;
  invulnerableTimer: number; // Hasar aldığında dokunulmazlık ve parlama süresi
  timber?: number;
  iron?: number;
  ammunition?: number;
  maxTimber?: number;
  maxIron?: number;
  maxAmmunition?: number;
  whistleCooldown: number; // Q tuşu - Taarruz/Savunma düdüğü
  specialAbilityCharge: number; // 0 to 100
  lanternLit: boolean;
  activeBuff: string | null;
  buffTimer: number;
  hoverInteractTimer: number;
  nearScavengeSlotId?: string | null;
  nearScavengeProgress?: number;
  sprintLockout: boolean;
  targetDestinationX: number | null;
  targetSlotId: string | null;
  retinueSoldierIds?: string[];
}

export interface LevelConfig {
  id: number;
  nameTr: string;
  locationTr: string;
  historicalDateTr: string;
  descriptionTr: string;
  loreTr: string;
  worldWidth: number;
  daysToWin: number;
  baseEnemyMultiplier: number;
  navalSupportAllowed: boolean;
  startingMecidiye: number;
  startingTimber?: number;
  startingIron?: number;
  startingAmmo?: number;
  relicsAvailable: {
    id: string;
    titleTr: string;
    descriptionTr: string;
    x: number;
  }[];
}

export type InGameTutorialStep =
  | 'goto_hq'
  | 'collect_coins'
  | 'buy_rifle'
  | 'recruit_soldier'
  | 'chop_tree'
  | 'build_trench'
  | 'build_wire'
  | 'use_whistle'
  | 'done';

export interface RadioIntelReport {
  text: string;
  flank: 'left' | 'right' | 'both';
  enemyCount: number;
  hasHeavyUnits: boolean;
  timestamp: number;
}

export interface RadioInterceptState {
  isActive: boolean; // Signals transmitting during dusk/night
  targetFrequency: number; // e.g. 840 kHz
  currentFrequency: number; // 400 - 1200 kHz
  signalStrength: number; // 0 to 1 based on frequency tuning
  isDecoded: boolean;
  isOpenUI: boolean; // Field wireless telegraph console modal open
  intelReport?: RadioIntelReport;
  morseTimer: number;
}

export interface InGameTutorialState {
  enabled: boolean;
  step: InGameTutorialStep;
  stepTimer: number;
  isStepCompleted: boolean;
  fadeAlpha: number;
  targetX?: number;
}

export interface GameState {
  level: LevelConfig;
  dayNumber: number;
  dayProgress: number; // 0.0 to 1.0 (0.0 = dawn, 0.25 = noon, 0.5 = dusk, 0.75 = midnight)
  timePhase: TimePhase;
  season: SeasonType;
  weather: WeatherType;
  weatherIntensity: number; // 0 to 1
  isGameOver: boolean;
  isVictory: boolean;
  isPaused: boolean;
  hqHealth: number;
  maxHqHealth: number;
  score: number;
  enemiesDefeated: number;
  daysSurvived: number;
  totalMecidiyeEarned: number;
  relicsCollected: string[];
  cameraX: number;
  speedMultiplier: number; // 1 or 2
  landingCamps?: LandingCamp[];
  fieldArtilleries?: FieldArtillery[];
  stoneTitleEnabled?: boolean;
  stoneLetters?: StoneLetter[];
  inGameTutorial?: InGameTutorialState;
  radioIntercept?: RadioInterceptState;
}

export interface StoneChunk {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  width: number;
  height: number;
  color: string;
}

export interface StoneLetter {
  id: string;
  char: string;
  x: number;
  y: number;
  state: 'standing' | 'shattering' | 'crumbled';
  shatterTimer: number;
  rubble: StoneChunk[];
  opacity?: number;
}
