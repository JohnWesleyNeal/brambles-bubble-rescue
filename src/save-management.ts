import { migrateSave, storeSave, type JourneyData, type SaveData } from './progress';
import { levels } from './levels';
import { restoreActiveRun } from './run';

export function snapshotJourney(save: SaveData): JourneyData {
  const { previousJourney: _previous, ...journey } = save;
  return JSON.parse(JSON.stringify(journey)) as JourneyData;
}

export function freshJourney(save: SaveData): JourneyData {
  return { ...migrateSave(null), gardenName: save.gardenName, muted: save.muted,
    musicVolume: save.musicVolume, effectsVolume: save.effectsVolume };
}

/** Both journeys are stored in one write. Failure never changes the live save. */
export function replaceJourney(save: SaveData, next: JourneyData, storage: Pick<Storage, 'setItem'> = localStorage): boolean {
  const replacement: SaveData = { ...snapshotJourney(next), previousJourney: snapshotJourney(save) };
  if (!storeSave(replacement, storage)) return false;
  for (const key of Object.keys(save)) delete (save as unknown as Record<string, unknown>)[key];
  Object.assign(save, replacement);
  return true;
}

export function exportJourney(save: SaveData): string {
  return JSON.stringify({ game: 'brambles-bubble-rescue', format: 1, journey: snapshotJourney(save) }, null, 2);
}

export function importJourney(text: string): JourneyData {
  if (text.length > 2_000_000) throw new Error('That file is too large to be a garden backup.');
  let envelope: Record<string, unknown>;
  try { envelope = JSON.parse(text); } catch { throw new Error('This file is not a readable garden backup.'); }
  if (!envelope || envelope.game !== 'brambles-bubble-rescue' || envelope.format !== 1) throw new Error('Choose a Bramble garden backup file.');
  const data = envelope.journey as Record<string, unknown> | undefined;
  if (!data || data.version !== 4) throw new Error('This backup needs a different game version. Update the game before restoring it.');
  const integer = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0;
  const counts = (a: unknown): a is number[] => Array.isArray(a) && a.length <= levels.length && a.every(integer);
  const inventory = data.inventory as Record<string, unknown> | undefined;
  if (!integer(data.unlocked) || data.unlocked < 1 || data.unlocked > levels.length ||
      !counts(data.stars) || data.stars.some((s) => s > 3) || !counts(data.failures) ||
      typeof data.gardenName !== 'string' || data.gardenName.length > 40 ||
      typeof data.muted !== 'boolean' || !integer(data.savedAt) ||
      !Array.isArray(data.tutorialsSeen) || !data.tutorialsSeen.every((v) => typeof v === 'string') ||
      !inventory || !['rainbow', 'double', 'bonk'].every((id) => integer(inventory[id])) ||
      !['musicVolume', 'effectsVolume'].every((key) => typeof data[key] === 'number' && Number.isFinite(data[key]) && Number(data[key]) >= 0 && Number(data[key]) <= 1)) {
    throw new Error('This backup is incomplete or damaged. Your current garden has not changed.');
  }
  const result = snapshotJourney(migrateSave(data));
  if (data.activeRun && !restoreActiveRun(data.activeRun, levels, result.unlocked)) throw new Error('The unfinished meadow in this backup cannot be restored. Your current garden has not changed.');
  if (data.activeSideRun && (!restoreActiveRun(data.activeSideRun, levels, result.unlocked) || !result.activeSideRun?.activity)) throw new Error('The side adventure in this backup cannot be restored.');
  return result;
}
