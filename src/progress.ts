import { boosters, type BoosterId } from './boosters';
import { levels } from './levels';
import type { ActiveRun } from './run';

export interface JourneyData {
  gardenName: string;
  savedAt: number;
  version: 4;
  musicVolume: number;
  effectsVolume: number;
  convertedHearts: number;
  unlocked: number;
  stars: number[];
  muted: boolean;
  failures: number[];
  tutorialsSeen: string[];
  hearts: number;
  inventory: Record<BoosterId, number>;
  gardenStyle: 'meadow' | 'rose' | 'twilight';
  records: { best: number; unaided: boolean; cascade: boolean; bank: boolean }[];
  activeRun?: ActiveRun;
}

export interface SaveData extends JourneyData {
  previousJourney?: JourneyData;
}

export const saveKey = 'bramble-bubbles-save-v4';
export const v3SaveKey = 'bramble-bubbles-save-v3';
export const previousSaveKey = 'bramble-bubbles-save-v2';
export const legacySaveKey = 'bramble-bubbles-save-v1';

const volume = (value: unknown, fallback: number): number => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
const count = (value: unknown): number => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
function numberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.slice(0, levels.length).map(count) : [];
}

function migrateJourney(value: unknown): JourneyData {
  const data = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const stars = numberArray(data.stars).map((star) => Math.min(3, star));
  let completed = 0;
  while (completed < levels.length && stars[completed] > 0) completed += 1;
  const requested = Math.max(count(data.unlocked) || 1, completed + 1);
  const prior = Number(data.version) >= 2;
  const inventory = Number(data.version) >= 3 && data.inventory && typeof data.inventory === 'object'
    ? data.inventory as Record<string, unknown> : {};
  return {
    version: 4,
    gardenName: typeof data.gardenName === 'string' ? data.gardenName.trim().slice(0, 40) || 'My Garden' : 'My Garden',
    savedAt: count(data.savedAt),
    gardenStyle: data.gardenStyle === 'rose' || data.gardenStyle === 'twilight' ? data.gardenStyle : 'meadow',
    records: Array.isArray(data.records) ? data.records.slice(0, levels.length).map((item) => {
      const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return { best: count(record.best), unaided: record.unaided === true, cascade: record.cascade === true, bank: record.bank === true };
    }) : [],
    unlocked: Math.min(levels.length, Math.max(1, requested)),
    stars,
    muted: Boolean(data.muted),
    musicVolume: volume(data.musicVolume, data.muted ? 0 : .22),
    effectsVolume: volume(data.effectsVolume, data.muted ? 0 : .5),
    convertedHearts: data.version === 3 ? count(data.hearts) : count(data.convertedHearts),
    failures: prior ? numberArray(data.failures) : [],
    tutorialsSeen: prior && Array.isArray(data.tutorialsSeen)
      ? data.tutorialsSeen.filter((item): item is string => typeof item === 'string') : [],
    hearts: 0,
    inventory: {
      rainbow: Number(data.version) >= 3 ? count(inventory.rainbow) + (data.version === 3 ? Math.ceil(count(data.hearts) / 3) : 0) : 1,
      double: Number(data.version) >= 3 ? count(inventory.double) : 1,
      bonk: Number(data.version) >= 3 ? count(inventory.bonk) : 1
    },
    ...(Number(data.version) >= 3 && data.activeRun && typeof data.activeRun === 'object'
      ? { activeRun: data.activeRun as ActiveRun } : {})
  };
}

export function recordMastery(save: SaveData, index: number, attempt: { turns: number; usedHelp: boolean; largestDrop: number; bankRescue: boolean }): void {
  const prior = save.records[index];
  save.records[index] = {
    best: prior?.best ? Math.min(prior.best, attempt.turns) : attempt.turns,
    unaided: Boolean(prior?.unaided || !attempt.usedHelp),
    cascade: Boolean(prior?.cascade || attempt.largestDrop >= 8),
    bank: Boolean(prior?.bank || attempt.bankRescue)
  };
}

export function migrateSave(value: unknown): SaveData {
  const current = migrateJourney(value);
  const previous = value && typeof value === 'object' ? (value as Record<string, unknown>).previousJourney : undefined;
  return { ...current, ...(previous && typeof previous === 'object' ? { previousJourney: migrateJourney(previous) } : {}) };
}

export function loadSave(storage: Pick<Storage, 'getItem'> = localStorage): SaveData {
  for (const key of [saveKey, v3SaveKey, previousSaveKey, legacySaveKey]) {
    try {
      const raw = storage.getItem(key);
      if (raw) return migrateSave(JSON.parse(raw));
    } catch { /* Try the next older save. */ }
  }
  return migrateSave(null);
}

export let lastSaveSucceeded = true;
export function storeSave(save: SaveData, storage: Pick<Storage, 'setItem'> = localStorage): boolean {
  const savedAt = Date.now();
  try {
    storage.setItem(saveKey, JSON.stringify({ ...save, savedAt }));
    save.savedAt = savedAt;
    lastSaveSucceeded = true;
    return true;
  } catch { lastSaveSucceeded = false; return false; }
}

export function recordWin(save: SaveData, levelIndex: number, stars: number): void {
  const first = !save.stars[levelIndex];
  save.stars[levelIndex] = Math.max(save.stars[levelIndex] || 0, stars);
  save.unlocked = Math.max(save.unlocked, Math.min(levels.length, levelIndex + 2));
  if (first) for (const booster of boosters) if (save.unlocked >= booster.unlockLevel) save.inventory[booster.id] += 1;
}

export function recordLoss(save: SaveData, levelIndex: number): void {
  save.failures[levelIndex] = (save.failures[levelIndex] || 0) + 1;
}

export function refillGifts(save: SaveData): void {
  for (const booster of boosters) if (save.unlocked >= booster.unlockLevel) save.inventory[booster.id] = Math.max(3, save.inventory[booster.id]);
}

export function gardenProgress(stars: number[]): { flowers: number; decorations: number; hive: number; bees: number } {
  const flowers = stars.slice(0, 30).filter(Boolean).length;
  const hive = [0, 10, 20].filter((start) => Array.from({ length: 10 }, (_, i) => stars[start + i] ?? 0).every((s) => s > 0)).length;
  return { flowers, decorations: Math.floor(flowers / 5), hive, bees: Math.min(8, flowers) };
}

export function consumeBooster(save: SaveData, id: BoosterId): boolean {
  if (save.inventory[id] < 1) return false;
  save.inventory[id] -= 1;
  return true;
}
