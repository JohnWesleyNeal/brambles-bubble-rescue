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
    const result = board.settle({ row: 1, col: 0 }, { color: 'R', bee: false, kind: 'normal' });
    expect(result.popped).toHaveLength(4);
    expect(result.beesFreed).toBe(1);
    expect(board.beeCount()).toBe(0);
  });

  it('drops bubbles no longer connected to the ceiling', () => {
    const board = new BubbleBoard(['.RR......', 'g.......', '.........']);
    const result = board.settle({ row: 1, col: 1 }, { color: 'R', bee: false, kind: 'normal' });
    expect(result.popped).toHaveLength(3);
    expect(result.dropped).toHaveLength(1);
    expect(result.beesFreed).toBe(1);
  });

  it('snaps a shot beside the bubble it struck', () => {
    const board = new BubbleBoard(['...R.....', '........']);
    const cell = board.placementFor(177, 214, { row: 0, col: 3 });
    expect(board.get(cell!)).toBeUndefined();
    expect(cell).not.toBeNull();
    expect(neighborCells({ row: 0, col: 3 })).toContainEqual(cell);
  });

  it('grants pollen shots and drops unsupported honeycomb', () => {
    const board = new BubbleBoard(['.RR......', '........'], [
      { row: 0, col: 1, kind: 'pollen' },
      { row: 1, col: 0, kind: 'honeycomb' }
    ]);
    const result = board.settle({ row: 1, col: 1 }, { color: 'R', bee: false, kind: 'normal' });
    expect(result.popped).toHaveLength(3);
    expect(result.dropped.some(({ bubble }) => bubble.kind === 'honeycomb')).toBe(true);
    expect(result.bonusShots).toBe(2);
  });

  it('cracks dew before a bee can be freed', () => {
    const board = new BubbleBoard(['RRr......', '........'], [{ row: 0, col: 2, kind: 'dew' }]);
    const result = board.settle({ row: 1, col: 0 }, { color: 'R', bee: false, kind: 'normal' });
    expect(result.cracked).toContainEqual({ row: 0, col: 2 });
    expect(board.get({ row: 0, col: 2 })?.kind).toBe('normal');
    expect(board.beeCount()).toBe(1);
  });

  it('alternates a bloom and shifts a wind strip on every second shot', () => {
    const board = new BubbleBoard(['RRR......', '.RRR....'], [{ row: 0, col: 1, kind: 'bloom', alternate: 'G' }]);
    const wind = { row: 1, start: 1, length: 3 };
    board.advanceTurn(1, wind);
    expect(board.get({ row: 0, col: 1 })?.color).toBe('G');
    expect(board.windPosition()).toBe(0);
    board.advanceTurn(2, wind);
    expect(board.get({ row: 0, col: 1 })?.color).toBe('R');
    expect(board.windPosition()).toBe(1);
    expect(board.get({ row: 1, col: 4 })?.color).toBe('R');
  });
});
