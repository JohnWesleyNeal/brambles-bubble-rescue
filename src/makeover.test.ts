import { describe, expect, it } from 'vitest';
import { BubbleBoard } from './board';
import { GameEngine } from './engine';
import { levels, legacyLevels } from './levels';
import { restoreActiveRun, type RunAction } from './run';

describe('Rainbow burst', () => {
  it('pops a single colored target without placing a normal bubble', () => {
    const engine = new GameEngine({ ...levels[0], rows: ['....g....'], specials: [] });
    engine.armBooster('rainbow');
    const result = engine.fire(0);
    expect(result.settled?.placed).toBeNull();
    expect(result.settled?.popped).toHaveLength(1);
    expect(result.won).toBe(true);
    expect(engine.turns).toBe(1);
  });
  it('uses the same connected group for preview and clearing, including support drops and pollen', () => {
    const board = new BubbleBoard(['...RR....', '...gy...'], [{ row: 0, col: 3, kind: 'pollen' }]);
    expect(board.rainbowGroup({ row: 0, col: 4 })).toHaveLength(2);
    const result = board.rainbow({ row: 0, col: 4 });
    expect(result.popped).toHaveLength(2);
    expect(result.dropped).toHaveLength(2);
    expect(result.beesFreed).toBe(2);
    expect(result.bonusShots).toBe(2);
  });
  it('cracks dew instead of destroying it directly', () => {
    const board = new BubbleBoard(['....g....'], [{ row: 0, col: 4, kind: 'dew' }]);
    const result = board.rainbow({ row: 0, col: 4 });
    expect(result.popped).toHaveLength(0);
    expect(result.cracked).toEqual([{ row: 0, col: 4 }]);
    expect(board.get({ row: 0, col: 4 })).toMatchObject({ bee: true, kind: 'normal' });
  });
  it('rejects honeycomb and empty targets without spending a shot or changing the queue', () => {
    for (const specials of [[], [{ row: 0, col: 4, kind: 'honeycomb' as const }]]) {
      const engine = new GameEngine({ ...levels[0], rows: ['r........'], specials });
      engine.armBooster('rainbow');
      const before = [engine.shots, engine.turns, engine.currentColor, engine.nextColor];
      expect(engine.canFire(0)).toBe(false);
      expect(() => engine.fire(0)).toThrow();
      expect([engine.shots, engine.turns, engine.currentColor, engine.nextColor]).toEqual(before);
      expect(engine.armedBooster?.id).toBe('rainbow');
    }
  });
});

describe('free bubble top-ups and run compatibility', () => {
  const level = { ...levels[7], id: 1, shots: 1 };
  it('saves and restores an exhausted board and repeatable top-ups without resetting turns', () => {
    const engine = new GameEngine(level);
    const actions: RunAction[] = [];
    engine.fire(0); actions.push({ type: 'fire', angle: 0 });
    expect(engine.awaitingTopUp).toBe(true);
    expect(engine.lost).toBe(false);
    expect(engine.canFire(0)).toBe(false);
    let restored = restoreActiveRun({ version: engine.rulesVersion, levelId: 1, actions }, [level], 1)!;
    expect(restored.engine.awaitingTopUp).toBe(true);
    expect(restored.engine.board.entries()).toEqual(engine.board.entries());
    const queue = [engine.currentColor, engine.nextColor];
    expect(engine.topUp()).toBe(true); actions.push({ type: 'topup' });
    expect(engine.topUp()).toBe(false);
    expect([engine.currentColor, engine.nextColor]).toEqual(queue);
    expect(engine.turns).toBe(1);
    for (const angle of [-1.2, 1.2, -1, 1, 0]) { engine.fire(angle); actions.push({ type: 'fire', angle }); }
    expect(engine.awaitingTopUp).toBe(true);
    expect(engine.topUp()).toBe(true); actions.push({ type: 'topup' });
    restored = restoreActiveRun({ version: engine.rulesVersion, levelId: 1, actions }, [level], 1)!;
    expect(restored.engine.shots).toBe(5);
    expect(restored.engine.turns).toBe(6);
    expect(restored.engine.board.entries()).toEqual(engine.board.entries());
  });
  it('winning on the final shot takes precedence over top-up', () => {
    const engine = new GameEngine({ ...levels[0], shots: 1, rows: ['....r....'], specials: [] });
    engine.armBooster('rainbow'); engine.fire(0);
    expect(engine.won).toBe(true);
    expect(engine.awaitingTopUp).toBe(false);
    expect(engine.topUp()).toBe(false);
  });
  it('overflow remains a loss and cannot be rescued with a top-up', () => {
    const rows: string[] = Array.from({ length: 15 }, (_, row) => row % 2 ? '....R...' : '....R....');
    rows[0] = '....r....';
    const engine = new GameEngine({ ...levels[0], shots: 1, rows, specials: [] });
    engine.currentColor = 'B';
    engine.fire(0);
    expect(engine.lost).toBe(true);
    expect(engine.awaitingTopUp).toBe(false);
    expect(engine.topUp()).toBe(false);
  });
  it('legacy fired Rainbow reconstructs the original board and stays on legacy rules', () => {
    const engine = new GameEngine(legacyLevels[7], 1);
    engine.armBooster('rainbow', 'R'); engine.fire(-1.1);
    const restored = restoreActiveRun({ version: 1, levelId: 8, actions: [{ type: 'booster', id: 'rainbow', color: 'R' }, { type: 'fire', angle: -1.1 }] }, levels, 8)!;
    expect(restored.engine.rulesVersion).toBe(1);
    expect(restored.engine.board.entries()).toEqual(engine.board.entries());
    expect(restored.engine.shots).toBe(engine.shots);
  });
  it('restores an equipped new Rainbow with no color picker', () => {
    const restored = restoreActiveRun({ version: 2, levelId: 1, actions: [{ type: 'booster', id: 'rainbow' }] }, levels, 1)!;
    expect(restored.engine.armedBooster?.id).toBe('rainbow');
    expect(restored.engine.rulesVersion).toBe(2);
  });
});
