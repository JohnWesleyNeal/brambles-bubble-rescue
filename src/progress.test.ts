import { describe, expect, it } from 'vitest';
import { buyBooster, consumeBooster, migrateSave, recordLoss, recordWin, refillHearts } from './progress';

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
    expect(save.version).toBe(3);
    expect(save.unlocked).toBe(16);
    expect(save.stars[14]).toBe(2);
    expect(save.failures[1]).toBe(3);
    expect(save.tutorialsSeen).toEqual(['6']);
    expect(save.inventory).toEqual({ rainbow: 1, double: 1, bonk: 1 });
    expect(save.hearts).toBe(12);
  });

  it('awards first clears and allows unlimited free refills with spent boosters', () => {
    const save = migrateSave(null);
    recordWin(save, 0, 2);
    expect(save.hearts).toBe(16);
    recordWin(save, 0, 3);
    expect(save.hearts).toBe(16);
    expect(buyBooster(save, 'rainbow')).toBe(true);
    expect(save.hearts).toBe(13);
    expect(save.inventory.rainbow).toBe(2);
    expect(consumeBooster(save, 'rainbow')).toBe(true);
    expect(save.inventory.rainbow).toBe(1);
    refillHearts(save);
    expect(save.hearts).toBe(25);
  });

  it('retains a paused attempt alongside existing v3 stars and inventory', () => {
    const saved = migrateSave({
      version: 3, unlocked: 2, stars: [3], hearts: 9,
      inventory: { rainbow: 2, double: 1, bonk: 1 },
      activeRun: { version: 1, levelId: 2, actions: [{ type: 'swap' }] }
    });
    expect(saved.stars[0]).toBe(3);
    expect(saved.inventory.rainbow).toBe(2);
    expect(saved.activeRun?.actions).toEqual([{ type: 'swap' }]);
  });
});
