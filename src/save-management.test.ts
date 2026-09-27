import { describe, expect, it } from 'vitest';
import { exportJourney, freshJourney, importJourney, replaceJourney, snapshotJourney } from './save-management';
import { migrateSave, recordWin, saveKey } from './progress';

const storage = () => {
  const values = new Map<string, string>();
  return { values, setItem: (key: string, value: string) => { values.set(key, value); } };
};
const journey = () => migrateSave({ version: 4, gardenName: 'Our little garden', unlocked: 8,
  stars: [3, 2, 1], muted: false, musicVolume: .3, effectsVolume: .4,
  inventory: { rainbow: 9, double: 4, bonk: 1 }, failures: [0, 2], tutorialsSeen: ['0'],
  activeRun: { version: 2, levelId: 8, actions: [{ type: 'swap' }] } });

describe('My Garden saves', () => {
  it('round-trips progress, settings, gifts and unfinished board in a portable backup', () => {
    const save = journey();
    expect(importJourney(exportJourney(save))).toEqual(save);
  });
  it('starts at level one while retaining name and audio settings', () => {
    const save = journey(); const fresh = freshJourney(save);
    expect(fresh).toMatchObject({ gardenName: save.gardenName, muted: false, musicVolume: .3, effectsVolume: .4,
      unlocked: 1, stars: [], inventory: { rainbow: 1, double: 1, bonk: 1 }, failures: [], tutorialsSeen: [] });
    expect(fresh.activeRun).toBeUndefined();
    expect(save.activeRun).toBeDefined();
  });
  it('atomically keeps the old journey and can swap back without losing the new journey', () => {
    const save = journey(); const original = snapshotJourney(save); const disk = storage();
    expect(replaceJourney(save, freshJourney(save), disk)).toBe(true);
    expect(save.previousJourney).toEqual(original);
    expect(JSON.parse(disk.values.get(saveKey)!).previousJourney).toEqual(original);
    recordWin(save, 0, 2);
    expect(replaceJourney(save, save.previousJourney!, disk)).toBe(true);
    expect(save.stars).toEqual(original.stars);
    expect(save.activeRun).toEqual(original.activeRun);
    expect(save.previousJourney!.stars).toEqual([2]);
    expect('previousJourney' in save.previousJourney!).toBe(false);
    expect(migrateSave(JSON.parse(disk.values.get(saveKey)!))).toEqual(save);
  });
  it('leaves both journeys and the in-memory save intact when storage fails', () => {
    const save = journey(); save.previousJourney = freshJourney(save);
    const before = JSON.stringify(save);
    expect(replaceJourney(save, freshJourney(save), { setItem: () => { throw new Error('quota'); } })).toBe(false);
    expect(JSON.stringify(save)).toBe(before);
  });
  it('exports only the selected journey, with no recursively nested recovery copies', () => {
    const save = journey(); save.previousJourney = freshJourney(save);
    expect(importJourney(exportJourney(save))).toEqual(snapshotJourney(save));
  });
  it('rejects unrelated, newer, damaged and oversized backups', () => {
    for (const text of ['null', '{}', '{', 'x'.repeat(2_000_001),
      JSON.stringify({ game: 'brambles-bubble-rescue', format: 2, journey: journey() }),
      JSON.stringify({ game: 'brambles-bubble-rescue', format: 1, journey: { ...journey(), version: 5 } }),
      JSON.stringify({ game: 'brambles-bubble-rescue', format: 1, journey: { ...journey(), stars: [9] } }),
      JSON.stringify({ game: 'brambles-bubble-rescue', format: 1, journey: { ...journey(), activeRun: { version: 2, levelId: 1, actions: [{ type: 'fire', angle: 99 }] } } })]) {
      expect(() => importJourney(text)).toThrow();
    }
  });
  it('preserves an old-rule unfinished attempt on import', () => {
    const save = journey(); save.activeRun = { version: 1, levelId: 8, actions: [{ type: 'booster', id: 'rainbow', color: 'R' }] };
    expect(importJourney(exportJourney(save)).activeRun).toEqual(save.activeRun);
  });
});
