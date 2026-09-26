import { describe, expect, it } from 'vitest';
import { GameEngine } from './engine';
import { levels } from './levels';
import { restoreActiveRun, type ActiveRun } from './run';

describe('paused level', () => {
  it('rebuilds the exact board, queue, shots, and armed booster from saved actions', () => {
    const original = new GameEngine(levels[7]);
    original.swap();
    original.armBooster('double');
    original.fire(-1.1);
    original.armBooster('rainbow', 'R');
    const run: ActiveRun = { version: 1, levelId: 8, actions: [
      { type: 'swap' }, { type: 'booster', id: 'double' }, { type: 'fire', angle: -1.1 },
      { type: 'booster', id: 'rainbow', color: 'R' }
    ] };
    const restored = restoreActiveRun(JSON.parse(JSON.stringify(run)), levels, 8);
    expect(restored).not.toBeNull();
    expect(restored!.engine.board.entries()).toEqual(original.board.entries());
    expect([restored!.engine.currentColor, restored!.engine.nextColor, restored!.engine.shots, restored!.engine.turns, restored!.engine.freedBees, restored!.engine.armedBooster])
      .toEqual([original.currentColor, original.nextColor, original.shots, original.turns, original.freedBees, original.armedBooster]);
  });

  it('rejects corrupt or no longer playable saved attempts', () => {
    expect(restoreActiveRun({ version: 1, levelId: 20, actions: [] }, levels, 3)).toBeNull();
    expect(restoreActiveRun({ version: 1, levelId: 1, actions: [{ type: 'fire', angle: 99 }] }, levels, 1)).toBeNull();
    expect(restoreActiveRun({ version: 1, levelId: 1, actions: [{ type: 'booster', id: 'rainbow', color: 'Z' }] }, levels, 1)).toBeNull();
  });
});
