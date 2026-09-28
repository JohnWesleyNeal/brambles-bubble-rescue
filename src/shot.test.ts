import { describe, expect, it } from 'vitest';
import { BubbleBoard } from './board';
import { traceShot } from './shot';

describe('narrow openings', () => {
  const board = new BubbleBoard(['.........', '........', '...R.R...']);

  it('lets a centered shot pass through a real one-cell opening', () => {
    const trace = traceShot(board, .002);
    expect(trace.impact).toBeNull();
    expect(trace.placement).toEqual({ row: 0, col: 4 });
    expect(trace.path.some(point => point.y < 250)).toBe(true);
  });

  it('still stops a shot that grazes a bubble', () => {
    expect(traceShot(board, -.015).impact).not.toBeNull();
  });

  it('preserves the old collision for saved action logs', () => {
    expect(traceShot(board, .002, true).impact).not.toBeNull();
  });
});
