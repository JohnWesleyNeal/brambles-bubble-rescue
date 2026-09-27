import { describe, expect, it } from 'vitest';
import { consumeBooster, migrateSave, recordLoss, recordWin, refillGifts, gardenProgress } from './progress';

describe('saved journey', () => {
  it('retains all six published stars and opens level seven', () => {
    const save = migrateSave({ version: 1, unlocked: 6, stars: [3, 2, 3, 1, 2, 3], muted: true });
    expect(save.stars.slice(0, 6)).toEqual([3, 2, 3, 1, 2, 3]);
    expect(save.unlocked).toBe(7);
    expect(save.muted).toBe(true);
    recordWin(save, 6, 2);
    expect(save.unlocked).toBe(8);
  });

  it('offers help after the second loss without resetting progress', () => {
    const save = migrateSave(null);
    recordLoss(save, 11);
    recordLoss(save, 11);
    expect(save.failures[11]).toBe(2);
    expect(save.unlocked).toBe(1);
  });

  it('migrates a v2 journey with stars and failures intact', () => {
    const save = migrateSave({ version: 2, unlocked: 16, stars: Array(15).fill(2), failures: [0, 3], tutorialsSeen: ['6'], muted: true });
    expect(save.version).toBe(4);
    expect(save.unlocked).toBe(16);
    expect(save.stars[14]).toBe(2);
    expect(save.failures[1]).toBe(3);
    expect(save.tutorialsSeen).toEqual(['6']);
    expect(save.inventory).toEqual({ rainbow: 1, double: 1, bonk: 1 });
    expect(save.hearts).toBe(0);
  });

  it('gifts only first clears and refills unlocked stock without lowering larger counts', () => {
    const save = migrateSave(null);
    recordWin(save, 0, 2);
    expect(save.inventory).toEqual({ rainbow: 2, double: 1, bonk: 1 });
    recordWin(save, 0, 3);
    expect(save.inventory.rainbow).toBe(2);
    expect(consumeBooster(save, 'rainbow')).toBe(true);
    refillGifts(save);
    expect(save.inventory).toEqual({ rainbow: 3, double: 1, bonk: 1 });
    save.unlocked = 8; save.inventory.rainbow = 10;
    refillGifts(save);
    expect(save.inventory).toEqual({ rainbow: 10, double: 3, bonk: 3 });
    save.inventory.bonk = 0;
    expect(consumeBooster(save, 'bonk')).toBe(false);
  });

  it('converts v3 hearts exactly once and preserves muted audio preferences', () => {
    const save = migrateSave({ version: 3, hearts: 10, inventory: { rainbow: 2, double: 4, bonk: 5 }, muted: true });
    expect(save.inventory).toEqual({ rainbow: 6, double: 4, bonk: 5 });
    expect(save.musicVolume).toBe(0); expect(save.effectsVolume).toBe(0);
    expect(migrateSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });

  it('derives unique garden rewards from clears, not stars or replays', () => {
    expect(gardenProgress([])).toEqual({ flowers: 0, decorations: 0, hive: 0, bees: 0 });
    expect(gardenProgress(Array(10).fill(1))).toEqual({ flowers: 10, decorations: 2, hive: 1, bees: 8 });
    expect(gardenProgress(Array(30).fill(3))).toEqual({ flowers: 30, decorations: 6, hive: 3, bees: 8 });
    expect(gardenProgress([0, ...Array(9).fill(3), 1]).hive).toBe(0);
    const sparse: number[] = []; sparse[9] = 3;
    expect(gardenProgress(sparse).hive).toBe(0);
  });

  it('retains a paused attempt alongside existing v3 stars and inventory', () => {
    const saved = migrateSave({
      version: 3, unlocked: 2, stars: [3], hearts: 9,
      inventory: { rainbow: 2, double: 1, bonk: 1 },
      activeRun: { version: 1, levelId: 2, actions: [{ type: 'swap' }] }
    });
    expect(saved.stars[0]).toBe(3);
    expect(saved.inventory.rainbow).toBe(5);
    expect(saved.activeRun?.actions).toEqual([{ type: 'swap' }]);
  });
});
