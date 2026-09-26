import { describe, expect, it } from 'vitest';
import { BubbleBoard } from './board';
import { levels } from './levels';

describe('gift levels', () => {
  it('all load with bee targets and a forgiving shot budget', () => {
    expect(levels).toHaveLength(6);
    for (const level of levels) {
      const board = new BubbleBoard(level.rows);
      expect(board.beeCount()).toBeGreaterThan(0);
      expect(level.shots).toBeGreaterThan(board.beeColors().length * 5);
      expect(board.availableColors().every((color) => level.colors.includes(color))).toBe(true);
    }
  });
});
