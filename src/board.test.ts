import { describe, expect, it } from 'vitest';
import { BubbleBoard, neighborCells } from './board';

describe('BubbleBoard', () => {
  it('uses six neighbors in the staggered grid', () => {
    expect(neighborCells({ row: 2, col: 4 })).toHaveLength(6);
    expect(neighborCells({ row: 3, col: 4 })).toHaveLength(6);
    expect(neighborCells({ row: 0, col: 0 })).toHaveLength(2);
  });

  it('pops three matching bubbles and frees a bee', () => {
    const board = new BubbleBoard(['RRr......', '........']);
    const result = board.settle({ row: 1, col: 0 }, { color: 'R', bee: false });
    expect(result.popped).toHaveLength(4);
    expect(result.beesFreed).toBe(1);
    expect(board.beeCount()).toBe(0);
  });

  it('drops bubbles no longer connected to the ceiling', () => {
    const board = new BubbleBoard(['.RR......', 'g.......', '.........']);
    const result = board.settle({ row: 1, col: 1 }, { color: 'R', bee: false });
    expect(result.popped).toHaveLength(3);
    expect(result.dropped).toHaveLength(1);
    expect(result.beesFreed).toBe(1);
  });

  it('snaps a shot beside the bubble it struck', () => {
    const board = new BubbleBoard(['...R.....', '........']);
    const cell = board.placementFor(177, 214, { row: 0, col: 3 });
    expect(board.get(cell)).toBeUndefined();
    expect(neighborCells({ row: 0, col: 3 })).toContainEqual(cell);
  });
});
