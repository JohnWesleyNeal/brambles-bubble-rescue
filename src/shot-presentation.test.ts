import { describe, expect, it } from 'vitest';
import { shotPathIndex, shotPathPoint } from './shot-presentation';

describe('continuous visual shot release', () => {
  it('interpolates the engine path without cutting a bank corner', () => {
    const path = [{ x: 195, y: 690 }, { x: 339, y: 500 }, { x: 337, y: 498 }];
    expect(shotPathPoint(path, 1)).toEqual(path[1]);
    expect(shotPathPoint(path, 1.5)).toEqual({ x: 338, y: 499 });
    expect(shotPathPoint(path, 99)).toEqual(path[2]);
    expect(shotPathPoint(path, -2)).toEqual(path[0]);
  });
  it('emits immediately and reaches every impact exactly, including short shots', () => {
    for (const length of [1, 2, 5, 20, 100, 500, 800]) {
      expect(shotPathIndex(length, 0)).toBe(0);
      if (length > 1) expect(shotPathIndex(length, 1)).toBeGreaterThan(0);
      let previous = 0;
      for (let time = 0; time <= 1200; time += 2) {
        const index = shotPathIndex(length, time);
        expect(index).toBeGreaterThanOrEqual(previous);
        expect(index).toBeLessThanOrEqual(length - 1);
        previous = index;
      }
      expect(previous).toBe(length - 1);
    }
  });
  it('uses elapsed time rather than rounded sample positions or frame increments', () => {
    expect(shotPathIndex(100, 16)).not.toBe(Math.floor(shotPathIndex(100, 16)));
    expect(shotPathIndex(100, 95)).toBeLessThan(shotPathIndex(100, 95, true));
    const afterRelease = shotPathIndex(800, 200) - shotPathIndex(800, 100);
    expect(afterRelease).toBeCloseTo(800 / .75 * .1);
  });
});
