import { levels } from './levels';

export interface SaveData {
  version: 2;
  unlocked: number;
  stars: number[];
  muted: boolean;
  failures: number[];
  tutorialsSeen: string[];
}

export const saveKey = 'bramble-bubbles-save-v2';
export const legacySaveKey = 'bramble-bubbles-save-v1';

function numberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.slice(0, levels.length).map((item) => Math.max(0, Number(item) || 0)) : [];
}

export function migrateSave(value: unknown): SaveData {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const stars = numberArray(data.stars).map((star) => Math.min(3, star));
  let completed = 0;
  while (completed < levels.length && stars[completed] > 0) completed += 1;
  const requested = Math.max(Number(data.unlocked) || 1, completed + 1);
  return {
    version: 2,
    unlocked: Math.min(levels.length, Math.max(1, Math.floor(requested))),
    stars,
    muted: Boolean(data.muted),
    failures: data.version === 2 ? numberArray(data.failures) : [],
    tutorialsSeen: data.version === 2 && Array.isArray(data.tutorialsSeen)
      ? data.tutorialsSeen.filter((item): item is string => typeof item === 'string') : []
  };
}

export function loadSave(storage: Pick<Storage, 'getItem'> = localStorage): SaveData {
  try {
    const raw = storage.getItem(saveKey) ?? storage.getItem(legacySaveKey);
    return migrateSave(raw ? JSON.parse(raw) : null);
  } catch { return migrateSave(null); }
}

export function storeSave(save: SaveData, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try { storage.setItem(saveKey, JSON.stringify(save)); } catch { /* Play continues without storage. */ }
}

export function recordWin(save: SaveData, levelIndex: number, stars: number): void {
  save.stars[levelIndex] = Math.max(save.stars[levelIndex] || 0, stars);
  save.unlocked = Math.max(save.unlocked, Math.min(levels.length, levelIndex + 2));
}

export function recordLoss(save: SaveData, levelIndex: number): void {
  save.failures[levelIndex] = (save.failures[levelIndex] || 0) + 1;
}
