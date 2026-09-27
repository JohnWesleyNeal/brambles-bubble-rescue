import { describe, expect, it } from 'vitest';
import { BubbleBoard } from './board';
import { GameEngine } from './engine';
import { levels, legacyLevels } from './levels-v3';
import { replays } from './replay-fixtures';
import { restoreActiveRun, type RunAction } from './run';
import { migrateSave, recordMastery } from './progress';
import { exportJourney, importJourney } from './save-management';
import { friendsCards, styleChoices, masteryLabels } from './friends';

const edition3Engine = (level: typeof levels[number]) => new GameEngine(level, 3);

const refreshed: Record<number, string> = {
  7: '-1.2 -1.2', 9: '-1.2s -1.2', 12: '-1.15s 0.4s',
  14: '-1.2s -1.2s -1.2 -1.2 -1s -1 -0.7',
  18: '-1.05 -1.2s', 23: '-1.2 0.35s -1.1s -0.75s'
};

function play(engine: GameEngine, route: string, actions: RunAction[] = []): void {
  for (const move of route.split(' ')) {
    if (move.endsWith('s')) { engine.swap(); actions.push({ type: 'swap' }); }
    const angle = Number.parseFloat(move);
    engine.fire(angle); actions.push({ type: 'fire', angle });
    if (engine.won) break;
  }
}

describe('new meadow edition', () => {
  for (const level of levels) it(`level ${level.id} wins with normal shots and its original allowance`, () => {
    const engine = edition3Engine(level);
    play(engine, refreshed[level.id] ?? replays[level.id - 1]);
    expect(engine.won).toBe(true);
    expect(engine.shots).toBeGreaterThanOrEqual(0);
    expect(engine.usedHelp).toBe(false);
    expect(engine.freedBees).toBe(engine.totalBees);
  });

  it('restores both older rules editions on the original layout, including fired Rainbow', () => {
    for (const version of [1, 2] as const) {
      const actions: RunAction[] = [{ type: 'booster', id: 'rainbow', ...(version === 1 ? { color: 'O' as const } : {}) }, { type: 'fire', angle: 0 }];
      const original = new GameEngine(legacyLevels[13], version);
      original.armBooster('rainbow', version === 1 ? 'O' : undefined); original.fire(0);
      const restored = restoreActiveRun({ version, levelId: 14, actions }, levels, 30)!;
      expect(restored.engine.board.entries()).toEqual(original.board.entries());
      expect(restored.engine.level.rows).toEqual(legacyLevels[13].rows);
      expect(restored.engine.flightPath).toBeUndefined();
      expect(restored.engine.bloomUnlocked).toBe(false);
    }
  });

  it('keeps Mabel waiting at a blocked gate and restores charge and path movement', () => {
    const engine = edition3Engine(levels[13]);
    expect(engine.totalBees).toBe(1);
    expect(engine.flightStep).toBe(1);
    expect(engine.won).toBe(false);
    const actions: RunAction[] = [];
    play(engine, '-1.2s -1.2s', actions);
    expect(engine.flightStep).toBeGreaterThan(1);
    expect(engine.freedBees).toBe(0);
    const restored = restoreActiveRun({ version: 3, levelId: 14, actions }, levels, 30)!.engine;
    expect([restored.flightStep, restored.bloomCharge, restored.currentColor, restored.shots]).toEqual([engine.flightStep, engine.bloomCharge, engine.currentColor, engine.shots]);
    expect(restored.board.entries()).toEqual(engine.board.entries());
  });

  it('awards Mabel exactly once and winning takes precedence over the last shot', () => {
    const engine = edition3Engine({ ...levels[13], rows: ['....rr...'], specials: [], shots: 1, flightPath: [{ row: 1, col: 4 }, { row: 0, col: 4 }] });
    engine.currentColor = 'R';
    const result = engine.fire(0);
    expect(result.flight?.arrived).toBe(true);
    expect(result.won).toBe(true);
    expect(engine.freedBees).toBe(3);
    expect(engine.awaitingTopUp).toBe(false);
    expect(() => engine.fire(0)).toThrow();
  });
});

describe('earned Bloom', () => {
  it('fills from cleared bubbles, survives cancel, and round trips an equipped flower', () => {
    const engine = edition3Engine(levels[13]);
    const actions: RunAction[] = [];
    play(engine, '-1.2s -1.2s -1.2', actions);
    expect(engine.bloomCharge).toBe(12);
    expect(engine.armBloom()).toBe(true); actions.push({ type: 'bloom' });
    const restored = restoreActiveRun({ version: 3, levelId: 14, actions }, levels, 30)!.engine;
    expect(restored.bloomArmed).toBe(true);
    restored.cancelSpecialShot();
    expect(restored.bloomCharge).toBe(12);
    expect(restored.armBloom()).toBe(true);
    const shots = restored.shots;
    const result = restored.fire(0);
    expect(result.bloom).toBe(true);
    expect(result.booster).toBeUndefined();
    expect(restored.bloomCharge).toBe(0);
    expect(restored.shots).toBe(shots - 1);
    expect(restored.usedHelp).toBe(false);
  });

  it('cannot equip early and does not spend a charged flower on a blocked target', () => {
    const engine = edition3Engine({ ...levels[6], rows: ['r........'], specials: [{ row: 0, col: 4, kind: 'honeycomb' }] });
    expect(engine.armBloom()).toBe(false);
    engine.bloomCharge = 12; expect(engine.armBloom()).toBe(true);
    const shots = engine.shots;
    expect(engine.canFire(0)).toBe(false);
    expect(() => engine.fire(0)).toThrow();
    expect(engine.bloomCharge).toBe(12);
    expect(engine.shots).toBe(shots);
    expect(engine.bloomArmed).toBe(true);
  });

  it('bursts neighboring colors, cracks dew, preserves honeycomb, and awards support drops and pollen', () => {
    const board = new BubbleBoard(['...RG....', '...yp...'], [{ row: 0, col: 3, kind: 'dew' }, { row: 0, col: 5, kind: 'honeycomb' }, { row: 1, col: 4, kind: 'pollen' }]);
    const group = board.bloomGroup({ row: 0, col: 4 });
    expect(group).not.toContainEqual({ row: 0, col: 5 });
    const result = board.bloomBurst({ row: 0, col: 4 });
    expect(result.cracked).toContainEqual({ row: 0, col: 3 });
    expect(board.get({ row: 0, col: 3 })?.kind).toBe('normal');
    expect(board.get({ row: 0, col: 5 })?.kind).toBe('honeycomb');
    expect(result.bonusShots).toBe(2);
    expect(result.beesFreed).toBe(2);
    const hanging = new BubbleBoard(['....R....', '...yp...']);
    const dropped = hanging.bloomBurst({ row: 1, col: 3 });
    expect(dropped.beesFreed).toBe(2);
  });

  it('mutually excludes inventory gifts and the retry assist', () => {
    const engine = edition3Engine(levels[6]); engine.bloomCharge = 12;
    engine.armBloom(); engine.armBooster('rainbow');
    expect(engine.bloomArmed).toBe(false);
    engine.armBloom(); expect(engine.armedBooster).toBeUndefined();
    engine.chooseWild('R'); expect(engine.bloomArmed).toBe(false);
    expect(engine.bloomCharge).toBe(12);
  });
});

describe('permanent little rewards', () => {
  it('migrates old gardens without invented mastery or lost progress', () => {
    const save = migrateSave({ version: 4, stars: Array(10).fill(3), unlocked: 11 });
    expect(save.records).toEqual([]); expect(save.gardenStyle).toBe('meadow');
    expect(friendsCards(save.stars)).toContain('Head of extremely small security');
    expect(styleChoices(save)).toContain('Lavender evening');
    expect(migrateSave(save)).toEqual(save);
  });

  it('keeps best records across replays, and backs up cosmetics and keepsakes', () => {
    const save = migrateSave(null); save.stars = Array(10).fill(3); save.unlocked = 11; save.gardenStyle = 'twilight';
    recordMastery(save, 6, { turns: 6, usedHelp: false, largestDrop: 8, bankRescue: false });
    recordMastery(save, 6, { turns: 9, usedHelp: true, largestDrop: 2, bankRescue: true });
    expect(save.records[6]).toEqual({ best: 6, unaided: true, cascade: true, bank: true });
    expect(masteryLabels(save.records[6])).toHaveLength(3);
    const restored = importJourney(exportJourney(save));
    expect(restored.gardenStyle).toBe('twilight');
    expect(restored.records[6]).toEqual(save.records[6]);
    expect(restored.stars).toEqual(save.stars);
  });
});
