import { describe, expect, it } from 'vitest';
import { BubbleBoard } from './board';
import { levels } from './levels';

describe('gift levels', () => {
  it('introduces new tricks across the first six levels', () => {
    expect(levels.slice(0, 6).map(({ shots }) => shots)).toEqual([25, 19, 17, 18, 18, 20]);
    expect(levels.slice(0, 6).every(({ tutorial }) => Boolean(tutorial))).toBe(true);
    expect(levels[3].specials.some(({ kind }) => kind === 'pollen')).toBe(true);
    expect(levels[2].rows.join('')).toContain('y');
  });

  it('makes the later chapters tighter and gives them deeper bee targets', () => {
    expect(levels.slice(15).every(({ shots, par }) => shots - par <= 4)).toBe(true);
    expect(levels.slice(20).every(({ rows }) => rows.length >= 7)).toBe(true);
    expect(levels[15].wind).toBeDefined();
    expect(levels[18].specials.some(({ kind }) => kind === 'bloom')).toBe(true);
  });

  it('all 30 levels load with bee targets and valid specials', () => {
    expect(levels).toHaveLength(30);
    for (const level of levels) {
      let board: BubbleBoard;
      try { board = new BubbleBoard(level.rows, level.specials); }
      catch (error) { throw new Error(`Level ${level.id}: ${String(error)}`); }
      expect(board.beeCount() + (level.flightPath ? 1 : 0)).toBeGreaterThan(0);
      expect(level.shots).toBeGreaterThan(level.par);
      expect(board.availableColors().every((color) => level.colors.includes(color))).toBe(true);
      if (level.wind) {
        expect(level.wind.start + level.wind.length).toBeLessThan(level.wind.row % 2 === 0 ? 9 : 8);
        expect(board.get({ row: level.wind.row, col: level.wind.start + level.wind.length })).toBeUndefined();
      }
    }
  });
});
