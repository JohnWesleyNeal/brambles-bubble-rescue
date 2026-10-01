import { describe, expect, it } from 'vitest';
import { BubbleBoard } from './board';
import { levels } from './levels';

describe('gift levels', () => {
  it('gives lessons practice space and isolates the first wind encounter', () => {
    expect(levels[3].tutorial).toBeUndefined();
    expect(levels.slice(0, 4).every(level => !level.specials.length)).toBe(true);
    expect(levels[4].specials.some(tile => tile.kind === 'pollen')).toBe(true);
    expect(levels[13].flightPath).toBeDefined();
    expect(levels[14].flightPath).toBeDefined();
    expect(levels[15].wind).toBeDefined();
    expect(levels[15].specials).toEqual([]);
    expect(levels[15].shots).toBeGreaterThan(levels[16].shots);
    expect(levels.slice(20, 30).every(({ shots, par }) => shots - par <= 2)).toBe(true);
  });

  it('all 100 levels load with bee targets and valid specials', () => {
    expect(levels).toHaveLength(100);
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
