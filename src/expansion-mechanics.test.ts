import { describe, expect, it } from 'vitest';
import { BubbleBoard, type Bubble, type Cell } from './board';
import { GameEngine } from './engine';
import { levels } from './levels';
import { levels as edition5 } from './levels-v5';
import { restoreActiveRun } from './run';

const red: Bubble = { color: 'R', bee: false, kind: 'normal' };
const unique = (cells: Cell[]) => new Set(cells.map(cell => `${cell.row}:${cell.col}`)).size;

describe('Two-tone buds', () => {
  it('reveals its fixed second face, keeps its bee, and does not cycle on turns', () => {
    const board = new BubbleBoard(['RRrGG....', '........'], [{ row: 0, col: 2, kind: 'bud', nextColor: 'G' }]);
    const first = board.settle({ row: 1, col: 0 }, red);
    expect(first.transformed).toEqual([{ row: 0, col: 2 }]);
    expect(first.beesFreed).toBe(0);
    expect(board.get({ row: 0, col: 2 })).toEqual({ color: 'G', bee: true, kind: 'normal' });
    board.advanceTurn(1); board.advanceTurn(2);
    expect(board.get({ row: 0, col: 2 })?.color).toBe('G');
    const second = board.settle({ row: 1, col: 2 }, { ...red, color: 'G' });
    expect(second.beesFreed).toBe(1);
    expect(board.beeCount()).toBe(0);
  });

  it('lets an earned Bloom burst open one layer while Bonk still removes it', () => {
    const board = new BubbleBoard(['rGG......'], [{ row: 0, col: 0, kind: 'bud', nextColor: 'B' }]);
    const result = board.bloomBurst({ row: 0, col: 1 });
    expect(result.beesFreed).toBe(0);
    expect(board.get({ row: 0, col: 0 })).toEqual({ color: 'B', bee: true, kind: 'normal' });
    expect(() => board.bonk({ row: 0, col: 1 })).toThrow('Bonk needs a tile');
  });

  it('only reveals on its own match and still drops with its support', () => {
    const board = new BubbleBoard(['RR.GG....', 'b.......'], [{ row: 1, col: 0, kind: 'bud', nextColor: 'Y' }]);
    const result = board.settle({ row: 1, col: 1 }, red);
    expect(result.transformed).toEqual([]);
    expect(result.dropped[0].bubble).toEqual({ color: 'B', nextColor: 'Y', bee: true, kind: 'bud' });
    expect(result.beesFreed).toBe(1);
  });

  it('advertises a future layer to queue/validation and Bonk removes it directly', () => {
    const board = new BubbleBoard(['r........'], [{ row: 0, col: 0, kind: 'bud', nextColor: 'G' }]);
    expect(board.availableColors()).toEqual(['R', 'G']);
    expect(() => board.bonk({ row: 0, col: 1 })).toThrow('Bonk needs a tile');
    expect(board.bonk({ row: 0, col: 0 }).beesFreed).toBe(1);
    expect(board.entries()).toEqual([]);
    expect(() => new BubbleBoard(['R........'], [{ row: 0, col: 0, kind: 'bud', nextColor: 'Q' as 'R' }])).toThrow();
  });
});

describe('Echo petals', () => {
  it('converts an entire touching cluster and follows on into a real three-match', () => {
    const board = new BubbleBoard(['RRbBG....', '.BBG....'], [
      { row: 0, col: 2, kind: 'echo' }, { row: 0, col: 3, kind: 'echo' },
      { row: 1, col: 1, kind: 'echo' }, { row: 1, col: 2, kind: 'echo' }
    ]);
    const result = board.settle({ row: 1, col: 0 }, red);
    expect(result.chains).toBe(1);
    expect(result.transformed).toHaveLength(4);
    expect(result.popped.filter(cell => cell.bubble.color === 'R')).toHaveLength(7);
    expect(result.beesFreed).toBe(1);
    expect(board.entries().every(cell => cell.bubble.kind !== 'echo')).toBe(true);
  });

  it('passes a chain through an ordinary bridge into a second Echo cluster', () => {
    const board = new BubbleBoard(['RRBBRBBGG', '.....B..'], [
      { row: 0, col: 2, kind: 'echo' }, { row: 0, col: 3, kind: 'echo' },
      { row: 0, col: 5, kind: 'echo' }, { row: 0, col: 6, kind: 'echo' }, { row: 1, col: 5, kind: 'echo' }
    ]);
    const result = board.settle({ row: 1, col: 0 }, red);
    expect(result.chains).toBe(2);
    expect(result.transformed).toHaveLength(5);
    expect(result.popped).toHaveLength(9);
    expect(unique(result.popped)).toBe(9);
  });

  it('leaves a short converted cluster in place as ordinary colored bubbles', () => {
    const board = new BubbleBoard(['RRBGG....', '........'], [{ row: 0, col: 2, kind: 'echo' }]);
    const result = board.settle({ row: 1, col: 0 }, red);
    expect(result.chains).toBe(0);
    expect(board.get({ row: 0, col: 2 })).toEqual({ color: 'R', bee: false, kind: 'normal' });
    board.advanceTurn(2);
    expect(board.get({ row: 0, col: 2 })?.color).toBe('R');
  });

  it('deduplicates converging waves, dew cracks, bees, pollen and final drops', () => {
    const specials = [
      { row: 0, col: 2, kind: 'echo' as const }, { row: 0, col: 3, kind: 'echo' as const },
      { row: 1, col: 1, kind: 'echo' as const }, { row: 1, col: 2, kind: 'echo' as const },
      { row: 0, col: 4, kind: 'dew' as const }, { row: 1, col: 3, kind: 'pollen' as const }
    ];
    const board = new BubbleBoard(['RRbBg....', '.BBG....', '..g......'], specials);
    const copy = board.clone();
    const result = board.settle({ row: 1, col: 0 }, red);
    expect(result).toEqual(copy.settle({ row: 1, col: 0 }, red));
    expect(unique(result.popped)).toBe(result.popped.length);
    expect(unique(result.dropped)).toBe(result.dropped.length);
    expect(unique([...result.popped, ...result.dropped])).toBe(result.popped.length + result.dropped.length);
    expect(unique(result.cracked)).toBe(result.cracked.length);
    expect(result.beesFreed).toBe([...result.popped, ...result.dropped].filter(cell => cell.bubble.bee).length);
    expect(result.bonusShots).toBe([...result.popped, ...result.dropped].filter(cell => cell.bubble.kind === 'pollen').length * 2);
    expect(result.chains).toBeLessThanOrEqual(10);
  });

  it('rechecks a candidate after a later opposing trigger changes its color', () => {
    const board = new BubbleBoard(['...B.RGG.', '...BR..G', '....BgGG.'], [
      { row: 0, col: 7, kind: 'echo' }, { row: 2, col: 5, kind: 'echo' }
    ]);
    const result = board.bloomBurst({ row: 0, col: 5 });
    expect(result.popped).toHaveLength(7);
    expect(result.dropped).toHaveLength(0);
    expect(result.transformed).toHaveLength(2);
    expect(result.chains).toBe(1);
    expect(result.beesFreed).toBe(0);
    expect(board.get({ row: 2, col: 5 })).toEqual({ color: 'R', bee: true, kind: 'normal' });
  });

  it('resolves opposing adjacent colors in board order without changing twice', () => {
    const board = new BubbleBoard(['...BBG...', '..RG....', '...Y.....'], [
      { row: 0, col: 3, kind: 'echo' }, { row: 0, col: 4, kind: 'echo' }
    ]);
    const copy = board.clone();
    const result = board.bloomBurst({ row: 2, col: 3 });
    expect(result).toEqual(copy.bloomBurst({ row: 2, col: 3 }));
    expect(result.transformed).toEqual([{ row: 0, col: 3 }, { row: 0, col: 4 }]);
    expect(board.get({ row: 0, col: 3 })).toEqual({ color: 'R', bee: false, kind: 'normal' });
    expect(board.get({ row: 0, col: 4 })?.color).toBe('R');
    expect(result.chains).toBe(0);
  });
});

describe('edition compatibility', () => {
  it('keeps every original published field and v5 physics path intact', () => {
    expect(levels.slice(0, 30)).toEqual(edition5);
    for (let index = 0; index < 30; index++) {
      const old = new GameEngine(edition5[index], 5);
      old.swap(); old.fire(-0.4);
      const restored = restoreActiveRun({ version: 5, levelId: index + 1, actions: [{ type: 'swap' }, { type: 'fire', angle: -0.4 }] }, levels, 100);
      if (old.won || old.lost) expect(restored).toBeNull();
      else {
        expect(restored!.engine.board.entries()).toEqual(old.board.entries());
        expect([restored!.engine.shots, restored!.engine.currentColor, restored!.engine.nextColor, restored!.engine.freedBees]).toEqual([old.shots, old.currentColor, old.nextColor, old.freedBees]);
      }
    }
  });

  it('restores an edition-six revealed layer with queue, Bloom charge and help state intact', () => {
    const level = { ...levels[0], id: 31, seed: 1, rows: ['RRrGG....', '........'], specials: [{ row: 0, col: 2, kind: 'bud' as const, nextColor: 'G' as const }] };
    const campaign = [...edition5, level];
    const game = new GameEngine(level);
    const swap = game.currentColor !== 'R';
    if (swap) game.swap();
    expect(game.currentColor).toBe('R');
    let angle = 0;
    for (let step = -50; step <= 50; step++) {
      const trial = game.clone();
      const candidate = step * .025;
      trial.fire(candidate);
      if (trial.board.get({ row: 0, col: 2 })?.kind === 'normal' && !trial.won) { angle = candidate; break; }
    }
    const result = game.fire(angle);
    expect(result.settled?.transformed).toContainEqual({ row: 0, col: 2 });
    const actions = [...(swap ? [{ type: 'swap' as const }] : []), { type: 'fire' as const, angle }];
    const restored = restoreActiveRun({ version: 6, levelId: 31, actions }, campaign, 31)!.engine;
    expect(restored.board.entries()).toEqual(game.board.entries());
    expect([restored.currentColor, restored.nextColor, restored.shots, restored.turns, restored.bloomCharge, restored.usedHelp]).toEqual([game.currentColor, game.nextColor, game.shots, game.turns, game.bloomCharge, game.usedHelp]);
    expect(restored.fire(.2)).toEqual(game.fire(.2));
  });

  it('rejects new tile mechanics when replaying an older rules edition', () => {
    expect(() => new BubbleBoard(['R........'], [{ row: 0, col: 0, kind: 'echo' }], false)).toThrow();
    expect(restoreActiveRun({ version: 5, levelId: 31, actions: [] }, levels, 100)).toBeNull();
  });
});
