export interface LevelHighScore {
  levelId: number;
  maxEnemiesDefeated: number;
  bestDay: number;
  updatedAt: string;
}

const HIGH_SCORE_KEY = 'canakkale_1915_level_highscores';
const UNLOCKED_LEVEL_KEY = 'canakkale_unlocked_level';
const SELECTED_LEVEL_KEY = 'canakkale_selected_level';
const CHAPTER1_TUTORIAL_SEEN_KEY = 'canakkale_chapter1_tutorial_seen';
const INGAME_TUTORIAL_COMPLETED_KEY = 'canakkale_walkthrough_tutorial_v2_done';

export function hasCompletedInGameTutorial(): boolean {
  try {
    return localStorage.getItem(INGAME_TUTORIAL_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setCompletedInGameTutorial(completed: boolean): void {
  try {
    localStorage.setItem(INGAME_TUTORIAL_COMPLETED_KEY, completed ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function hasSeenChapter1Tutorial(): boolean {
  try {
    return localStorage.getItem(CHAPTER1_TUTORIAL_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSeenChapter1Tutorial(seen: boolean): void {
  try {
    localStorage.setItem(CHAPTER1_TUTORIAL_SEEN_KEY, seen ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export function getUnlockedLevel(): number {
  try {
    const raw = localStorage.getItem(UNLOCKED_LEVEL_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 0) return 0;
    return Math.min(parsed, 3); // Max chapter index is 3 (Chapter 4)
  } catch {
    return 0;
  }
}

export function setUnlockedLevel(level: number): void {
  try {
    const valid = Math.max(0, Math.min(level, 3));
    localStorage.setItem(UNLOCKED_LEVEL_KEY, valid.toString());
  } catch {
    // ignore
  }
}

export function getSelectedLevel(): number {
  try {
    const unlocked = getUnlockedLevel();
    const raw = localStorage.getItem(SELECTED_LEVEL_KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 0) return 0;
    return Math.min(parsed, unlocked);
  } catch {
    return 0;
  }
}

export function setSelectedLevel(level: number): void {
  try {
    const unlocked = getUnlockedLevel();
    const valid = Math.max(0, Math.min(level, unlocked));
    localStorage.setItem(SELECTED_LEVEL_KEY, valid.toString());
  } catch {
    // ignore
  }
}

export function resetCampaignProgress(): void {
  try {
    localStorage.setItem(UNLOCKED_LEVEL_KEY, '0');
    localStorage.setItem(SELECTED_LEVEL_KEY, '0');
    localStorage.removeItem(INGAME_TUTORIAL_COMPLETED_KEY);
    localStorage.removeItem(CHAPTER1_TUTORIAL_SEEN_KEY);
  } catch {
    // ignore
  }
}

export function getLevelHighScore(levelId: number): LevelHighScore | null {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (!raw) return null;
    const scores: Record<number, LevelHighScore> = JSON.parse(raw);
    return scores[levelId] || null;
  } catch {
    return null;
  }
}

export function getAllHighScores(): Record<number, LevelHighScore> {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function recordLevelScore(levelId: number, enemiesDefeated: number, daysSurvived: number): boolean {
  try {
    const scores = getAllHighScores();
    const current = scores[levelId];
    
    let isNewHigh = false;
    if (!current || enemiesDefeated > current.maxEnemiesDefeated) {
      scores[levelId] = {
        levelId,
        maxEnemiesDefeated: enemiesDefeated,
        bestDay: Math.max(current?.bestDay || 0, daysSurvived),
        updatedAt: new Date().toISOString(),
      };
      isNewHigh = true;
    } else if (daysSurvived > current.bestDay) {
      scores[levelId].bestDay = daysSurvived;
      scores[levelId].updatedAt = new Date().toISOString();
    }

    localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
    return isNewHigh;
  } catch {
    return false;
  }
}
