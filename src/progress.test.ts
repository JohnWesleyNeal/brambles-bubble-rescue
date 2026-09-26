import { describe, expect, it } from 'vitest';
import { migrateSave, recordLoss, recordWin } from './progress';

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
});
