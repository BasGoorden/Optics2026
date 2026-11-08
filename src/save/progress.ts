/** Progress and settings saved in localStorage. Every access is guarded: storage may be unavailable. */
import type { Quality } from '../render/stage';

export interface Settings {
  quality: Quality;
  muted: boolean;
  unlockAll: boolean;
  overlay: boolean;
}

interface SaveData {
  stars: Record<string, number>;
  settings: Settings;
  seenIntro: Record<string, boolean>;
}

const KEY = 'optics2026.save.v1';

const defaults = (): SaveData => ({
  stars: {},
  settings: { quality: 'medium', muted: false, unlockAll: false, overlay: false },
  seenIntro: {},
});

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const d = JSON.parse(raw) as Partial<SaveData>;
    const base = defaults();
    return {
      stars: d.stars ?? base.stars,
      settings: { ...base.settings, ...d.settings },
      seenIntro: d.seenIntro ?? base.seenIntro,
    };
  } catch {
    return defaults();
  }
}

const data = load();

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: progress lasts for this visit only */
  }
}

export const progress = {
  stars: (levelId: string): number => data.stars[levelId] ?? 0,
  /** Records stars; returns true if it is a new best. */
  recordStars(levelId: string, stars: number): boolean {
    if (stars <= (data.stars[levelId] ?? 0)) return false;
    data.stars[levelId] = stars;
    persist();
    return true;
  },
  totalStars: (): number => Object.values(data.stars).reduce((a, b) => a + b, 0),
  settings: (): Settings => data.settings,
  updateSettings(s: Partial<Settings>): void {
    Object.assign(data.settings, s);
    persist();
  },
  seenIntro: (levelId: string): boolean => !!data.seenIntro[levelId],
  markIntroSeen(levelId: string): void {
    data.seenIntro[levelId] = true;
    persist();
  },
  resetAll(): void {
    data.stars = {};
    data.seenIntro = {};
    persist();
  },
};
