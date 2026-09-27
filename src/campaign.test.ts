import { describe, expect, it } from 'vitest';
import { GameEngine } from './engine';
import { levels } from './levels';
import { levels as edition3 } from './levels-v3';
import { restoreActiveRun, type RunAction } from './run';
import { suggestShot } from './advice';

// Regular bubbles only, through the real collision path. No gifts or top-ups.
const routes = [
  '-1.2 -1.1', '-1.2s -1.1s', '-1.2s -1.2', '-1.2s -1.1 -1.2s',
  '-1.2 -1.2 -1.2 -0.7s -1.1s -1.1', '-1.2s -1.1s -1 -0.9s -0.9s -0.9',
  '-1.2s -1.2 -1.2s -1.2 -1.2', '-1.1s -1.1 -1.2s -1.2',
  '-1.2s -1.1s -1 -0.9s -0.9s -0.9', '-0.4 0.4 -1.2 -1.2s',
  '-1.2 -1.1 -0.8', '-1.15s 0.4s', '-1.2s -1.1 -1.2 -1.2',
  '-1.2s -1.2s -1.2 -1.2 -1s -1 -0.7', '-1.2 0.35s -1.1s -0.75s',
  '-1.2s -0.4s -1.1 -1.1', '0.4s -0.4 -1.2s -1.2s',
  '-1 -1.2s -1.2s -1.1s', '-1.1s -1 -1 -1s -1.2s -1.1s -1.1',
  '-0.4 0.4s -1.1 -1.2 -1', '-1.2 0.3s -1.2 -1.2 -1.2',
  '-0.4 -1.1 0.4s -0.5 -0.4s', '-1.1s -1.2s -0.8',
  '-0.4 0.9 -1.1 -0.4 0.3 -1.2 -1.2s -1.1s -0.7 -1.1s',
  '-0.4s 0.9s 0.3 -0.4s -1.2 -1.2 -1.1 -0.7 -1.1s',
  '0.3s -1.1s -1.1s -0.4s -1.1 -1.1 -1.1 -1 -1.2s',
  '-0.4s -0.9 -1 -1 -1.2 -1.2 -1.1s -1.1 -1.1s',
  '0.3s -1.2s -1.1s -1.2 -0.4 -0.3 -1.2 -0.7 -1.1s',
  '0.3 0.9 -1.2 0 -1.2 0.1 -1.1 -1.1 -1.2 -1.2 -0.7 -1.1s',
  '-0.4s 0.9s -1.2 -1.1 -1 -1 -1.2s -1 -1.1 -0.7 -1.1s'
];

describe('edition four campaign', () => {
  for (const level of levels) it(`level ${level.id} has a normal-shot three-star route`, () => {
    const game = new GameEngine(level);
    for (const move of routes[level.id - 1].split(' ')) {
      if (move.endsWith('s')) game.swap();
      game.fire(parseFloat(move));
      if (game.won) break;
      expect(game.lost || game.awaitingTopUp).toBe(false);
    }
    expect(game.won).toBe(true);
    expect(game.turns).toBeLessThanOrEqual(level.par);
    expect(game.usedHelp).toBe(false);
  });

  it('makes Bloom available before its teaching board ends', () => {
    const game = new GameEngine(levels[8]);
    for (const move of routes[8].split(' ')) {
      if (move.endsWith('s')) game.swap();
      game.fire(parseFloat(move));
      if (game.bloomCharge === game.bloomGoal) break;
    }
    expect(game.won).toBe(false);
    expect(game.armBloom()).toBe(true);
  });

  it('keeps an edition-three attempt on its original board and allowance', () => {
    const old = new GameEngine(edition3[2], 3); old.fire(0);
    const restored = restoreActiveRun({ version: 3, levelId: 3, actions: [{ type: 'fire', angle: 0 }] }, levels, 30)!.engine;
    expect(restored.board.entries()).toEqual(old.board.entries());
    expect(restored.shots).toBe(old.shots);
    expect(restored.level.rows).not.toEqual(levels[2].rows);
  });

  it('restores a new Mabel route with charge, queue and progress intact', () => {
    const game = new GameEngine(levels[14]);
    const actions: RunAction[] = [{ type: 'fire', angle: -1.2 }]; game.fire(-1.2);
    const restored = restoreActiveRun({ version: 4, levelId: 15, actions }, levels, 30)!.engine;
    expect(restored.board.entries()).toEqual(game.board.entries());
    expect([restored.flightStep, restored.bloomCharge, restored.shots, restored.nextColor]).toEqual([game.flightStep, game.bloomCharge, game.shots, game.nextColor]);
  });

  it('contextual hints do not mutate the board, wind, gifts or random queue', () => {
    const game = new GameEngine(levels[19]); game.armBooster('rainbow');
    const untouched = game.clone();
    expect(suggestShot(game)?.message).toBeTruthy();
    expect(game.board.entries()).toEqual(untouched.board.entries());
    expect(game.armedBooster).toEqual(untouched.armedBooster);
    expect(game.fire(-.4)).toEqual(untouched.fire(-.4));
    expect(game.nextColor).toBe(untouched.nextColor);
    expect(game.board.windPosition()).toBe(untouched.board.windPosition());
  });
});
