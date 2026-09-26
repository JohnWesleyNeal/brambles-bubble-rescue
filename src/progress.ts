import { boosterById, type BoosterId } from './boosters';
import { levels } from './levels';

export interface SaveData {
  version: 3;
  unlocked: number;
  stars: number[];
  muted: boolean;
  failures: number[];
  tutorialsSeen: string[];
  hearts: number;
  inventory: Record<BoosterId, number>;
}

export const saveKey = 'bramble-bubbles-save-v3';
export const previousSaveKey = 'bramble-bubbles-save-v2';
export const legacySaveKey = 'bramble-bubbles-save-v1';

const count = (value: unknown): number => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
function numberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.slice(0, levels.length).map(count) : [];
}

export function migrateSave(value: unknown): SaveData {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const stars = numberArray(data.stars).map((star) => Math.min(3, star));
  let completed = 0;
  while (completed < levels.length && stars[completed] > 0) completed += 1;
  const requested = Math.max(count(data.unlocked) || 1, completed + 1);
  const prior = Number(data.version) >= 2;
  const inventory = data.version === 3 && data.inventory && typeof data.inventory === 'object'
    ? data.inventory as Record<string, unknown> : {};
  return {
    version: 3,
    unlocked: Math.min(levels.length, Math.max(1, requested)),
    stars,
    muted: Boolean(data.muted),
    failures: prior ? numberArray(data.failures) : [],
    tutorialsSeen: prior && Array.isArray(data.tutorialsSeen)
      ? data.tutorialsSeen.filter((item): item is string => typeof item === 'string') : [],
    hearts: data.version === 3 ? count(data.hearts) : 12,
    inventory: {
      rainbow: data.version === 3 ? count(inventory.rainbow) : 1,
      double: data.version === 3 ? count(inventory.double) : 1,
      bonk: data.version === 3 ? count(inventory.bonk) : 1
    }
  };
}

export function loadSave(storage: Pick<Storage, 'getItem'> = localStorage): SaveData {
  for (const key of [saveKey, previousSaveKey, legacySaveKey]) {
    try {
      const raw = storage.getItem(key);
      if (raw) return migrateSave(JSON.parse(raw));
    } catch { /* Try the next older save. */ }
  }
  return migrateSave(null);
}

export function storeSave(save: SaveData, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try { storage.setItem(saveKey, JSON.stringify(save)); } catch { /* Play continues without storage. */ }
}

export function recordWin(save: SaveData, levelIndex: number, stars: number): void {
  if (!save.stars[levelIndex]) save.hearts += 4;
  save.stars[levelIndex] = Math.max(save.stars[levelIndex] || 0, stars);
  save.unlocked = Math.max(save.unlocked, Math.min(levels.length, levelIndex + 2));
}

export function recordLoss(save: SaveData, levelIndex: number): void {
  save.failures[levelIndex] = (save.failures[levelIndex] || 0) + 1;
}

export function refillHearts(save: SaveData): void { save.hearts += 12; }

export function buyBooster(save: SaveData, id: BoosterId): boolean {
  const booster = boosterById[id];
  if (save.unlocked < booster.unlockLevel || save.hearts < booster.price) return false;
  save.hearts -= booster.price;
  save.inventory[id] += 1;
  return true;
}

export function consumeBooster(save: SaveData, id: BoosterId): boolean {
  if (save.inventory[id] < 1) return false;
  save.inventory[id] -= 1;
  return true;
}
