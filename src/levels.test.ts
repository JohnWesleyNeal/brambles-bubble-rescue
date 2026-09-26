import { describe, expect, it } from 'vitest';
import { BubbleBoard } from './board';
import { levels } from './levels';

describe('gift levels', () => {
  it('preserves the published six layouts and shot counts', () => {
    expect(levels.slice(0, 6).map(({ rows, shots }) => ({ rows, shots }))).toEqual([
      { rows: ['RRRYYYGGG', 'rrYYgg..', 'RRRYYYGGG'], shots: 25 },
      { rows: ['OOOGGGBBB', 'ooGGbbYY', 'OOOGGGBBB', '..YYGG..'], shots: 27 },
      { rows: ['RRRPPPGGG', 'rrPPggYY', 'RRRPPPGGG', '..YYY...'], shots: 29 },
      { rows: ['BBBOOOPPP', 'bbOOppYY', 'BBBOOOPPP', '.YYGGGG.', '.YYYGGG..'], shots: 32 },
      { rows: ['YYYRRRGGG', 'yyRRggPP', 'YYYRRRGGG', '..PPPBBB', '...PPBBBB'], shots: 34 },
      { rows: ['RRROOOGGG', 'rrOOggBB', 'RRROOOGGG', 'PPPPYYYY', 'PPPBBYYYY', '..PBBY..'], shots: 38 }
    ]);
  });

  it('all 30 levels load with bee targets and valid specials', () => {
    expect(levels).toHaveLength(30);
    for (const level of levels) {
      let board: BubbleBoard;
      try { board = new BubbleBoard(level.rows, level.specials); }
      catch (error) { throw new Error(`Level ${level.id}: ${String(error)}`); }
      expect(board.beeCount()).toBeGreaterThan(0);
      expect(level.shots).toBeGreaterThan(level.par);
      expect(board.availableColors().every((color) => level.colors.includes(color))).toBe(true);
      if (level.wind) {
        expect(level.wind.start + level.wind.length).toBeLessThan(level.wind.row % 2 === 0 ? 9 : 8);
        expect(board.get({ row: level.wind.row, col: level.wind.start + level.wind.length })).toBeUndefined();
      }
    }
  });
});
