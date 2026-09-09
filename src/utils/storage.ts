export interface LevelHighScore {
  levelId: number;
  maxEnemiesDefeated: number;
  bestDay: number;
  updatedAt: string;
}

const HIGH_SCORE_KEY = 'canakkale_1915_level_highscores';

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
