import { describe, expect, it } from 'vitest';
import { activityLevel, activityUnlocked, challenges, type Activity } from './activities';
import { GameEngine } from './engine';
import { recordActivityResult } from './activity-progress';
import { migrateSave } from './progress';
import { exportJourney, importJourney } from './save-management';
import { restoreActiveRun, type RunAction } from './run';
import { levels } from './levels';
import { suggestShot } from './advice';

const challengeRoutes = [
  '-1.2s -1.2', '-1.2s -1.1s -1 -0.9s -0.9s -0.9',
  '-1.2s -1.1s -1 -0.9s -0.9s -0.9', '-0.4 0.4 -1.2 -1.2s',
  '-1.15s 0.4s', '-1.2 0.3s -1.2 -1.2 -1.2'
];
const bossRoutes = [
  ['-1.2 -1.2', '-1.2 0.3s -1.2 -1.2 -1.2', '-1.2s -1.2s -1.2 -1.2 -1s -1 -0.7'],
  ['-1.2 -1.2s -1.1 -1.1s -1.2 -1.2', '-0.4s 0.9s -1.2 -1.1 -1 -1 -1.2s -1 -1.1 -0.7 -1.1s', '-1.2 0.35s -1.1s -0.75s']
];
function play(game: GameEngine, route: string): RunAction[] {
  const actions: RunAction[] = [];
  for (const move of route.split(' ')) {
    if (move.endsWith('s')) { game.swap(); actions.push({ type: 'swap' }); }
    game.fire(parseFloat(move)); actions.push({ type: 'fire', angle: parseFloat(move) });
    if (game.won || game.lost || game.awaitingTopUp) break;
  }
  return actions;
}
const create = (activity: Activity) => new GameEngine(activityLevel(activity), 4, activity);

describe('six curated challenges', () => {
  challenges.forEach((c, i) => it(`${c.id} has a regular-shot medal route`, () => {
    const game = create({ kind: 'challenge', id: c.id }); play(game, challengeRoutes[i]);
    expect(game.won).toBe(true);
    expect(game.challengeComplete, `bank rescues ${game.bankBees}`).toBe(true);
    expect(game.usedHelp).toBe(false);
  }));
  it('Travel Light rejects gifts, wilds and refills, but allows earned Bloom', () => {
    const game = create({ kind: 'challenge', id: 'light-bloom' });
    for (const gift of ['rainbow', 'bonk', 'double'] as const) expect(game.armBooster(gift)).toBe(false);
    expect(game.chooseWild(game.currentColor)).toBe(false);
    game.bloomCharge = 12; expect(game.armBloom()).toBe(true);
    game.awaitingTopUp = true; game.shots = 0;
    expect(game.topUp()).toBe(false);
    expect(game.relaxChallenge()).toBe(true);
    expect(game.topUp()).toBe(true);
    expect(game.armBooster('rainbow')).toBe(true);
    expect(game.challengeComplete).toBe(false);
  });
  it('Trust Your Paw disables hint suggestions and keeps its restriction on reload', () => {
    const activity: Activity = { kind: 'challenge', id: 'paw-picnic' };
    const game = create(activity); expect(game.guideHidden).toBe(true);
    expect(suggestShot(game)).toBeUndefined();
    const restored = restoreActiveRun({ version: 4, levelId: 3, activity, actions: [] }, levels, 30)!.engine;
    expect(restored.guideHidden).toBe(true);
    expect(restored.armBooster('rainbow')).toBe(true);
  });
  it('relaxing a challenge retains its board and persists the loss of medal eligibility', () => {
    const activity: Activity = { kind: 'challenge', id: 'paw-picnic' };
    const game = create(activity); game.swap(); game.fire(-1.2);
    const before = game.board.entries(); game.relaxChallenge();
    const restored = restoreActiveRun({ version: 4, levelId: 3, activity, actions: [{ type: 'swap' }, { type: 'fire', angle: -1.2 }, { type: 'relax' }] }, levels, 30)!.engine;
    expect(restored.board.entries()).toEqual(before);
    expect(restored.guideHidden).toBe(false);
    restored.fire(-1.2); expect(restored.won).toBe(true); expect(restored.challengeComplete).toBe(false);
  });
  it('Perfect Picnic counts turns even with pollen refunds or wild shots', () => {
    const activity: Activity = { kind: 'challenge', id: 'perfect-party' };
    const source = activityLevel(activity);
    const game = new GameEngine({ ...source, rows: ['...RR...g'], specials: [{ row: 0, col: 3, kind: 'pollen' }], shots: 1 }, 4, activity);
    game.turns = 4; game.currentColor = 'R'; game.fire(0);
    expect(game.shots).toBe(0); expect(game.awaitingTopUp).toBe(true); expect(game.topUp()).toBe(false);
    const wild = create(activity); wild.turns = 4; wild.chooseWild('R'); wild.fire(0);
    expect(wild.shots).toBe(0);
  });
});

describe('Monty’s picnic heist', () => {
  for (const rematch of [false, true]) for (let phase = 0; phase < 3; phase++) it(`${rematch ? 'rematch' : 'first picnic'} phase ${phase + 1} has a regular-shot win`, () => {
    const game = create({ kind: 'boss', phase, rematch });
    play(game, bossRoutes[Number(rematch)][phase]);
    expect(game.won, `turns ${game.turns}, bees ${game.freedBees}/${game.totalBees}`).toBe(true);
    expect(game.usedHelp).toBe(false);
  });
  it('unlocks from completed meadows and preserves the campaign on a phase clear', () => {
    const save = migrateSave({ version: 4, stars: Array(20).fill(3), unlocked: 21 });
    const activity: Activity = { kind: 'boss', phase: 0, rematch: false };
    expect(activityUnlocked(activity, save.stars)).toBe(true);
    expect(activityUnlocked({ ...activity, rematch: true }, save.stars)).toBe(false);
    save.activeRun = { version: 4, levelId: 21, actions: [{ type: 'swap' }] };
    save.activeSideRun = { version: 4, levelId: 20, activity, actions: [] };
    const campaign = JSON.stringify([save.activeRun, save.stars, save.inventory]);
    const game = create(activity); play(game, bossRoutes[0][0]); recordActivityResult(save, game);
    expect(save.bossCheckpoint).toBe(1); expect(save.activeSideRun).toBeUndefined();
    expect(JSON.stringify([save.activeRun, save.stars, save.inventory])).toBe(campaign);
    const restored = importJourney(exportJourney(save)); expect(restored.bossCheckpoint).toBe(1);
    const failed = create({ ...activity, phase: 1 }); failed.lost = true; recordActivityResult(save, failed);
    expect(save.bossCheckpoint).toBe(1);
  });
  it('saves picnic completion before animation and never awards campaign stars', () => {
    const save = migrateSave(null); const game = create({ kind: 'boss', phase: 2, rematch: false });
    play(game, bossRoutes[0][2]); recordActivityResult(save, game);
    expect(save.bossCleared).toBe(true); expect(save.bossCheckpoint).toBe(0); expect(save.stars).toEqual([]);
  });
});

it('backs up both unfinished boards and medals; rejects malformed side runs', () => {
  const save = migrateSave({ version: 4, stars: Array(30).fill(3), unlocked: 30 });
  const activity: Activity = { kind: 'challenge', id: 'bend-home' };
  save.activeRun = { version: 4, levelId: 4, actions: [] };
  save.activeSideRun = { version: 4, levelId: 6, activity, actions: [{ type: 'swap' }] };
  save.medals = ['paw-picnic'];
  expect(importJourney(exportJourney(save))).toEqual(save);
  expect(restoreActiveRun({ version: 4, levelId: 6, activity: { kind: 'boss', phase: 99, rematch: false }, actions: [] }, levels, 30)).toBeNull();
  expect(restoreActiveRun({ version: 3, levelId: 6, activity, actions: [] }, levels, 30)).toBeNull();
  const light: Activity = { kind: 'challenge', id: 'light-bloom' };
  expect(restoreActiveRun({ version: 4, levelId: 9, activity: light, actions: [{ type: 'booster', id: 'rainbow' }] }, levels, 30)).toBeNull();
});

it('awards each challenge medal once and retains previous medals on a practice clear', () => {
  const save = migrateSave(null); const game = create({ kind: 'challenge', id: 'paw-picnic' });
  play(game, challengeRoutes[0]); recordActivityResult(save, game); recordActivityResult(save, game);
  expect(save.medals).toEqual(['paw-picnic']); expect(save.stars).toEqual([]);
  game.challengeRelaxed = true; recordActivityResult(save, game); expect(save.medals).toEqual(['paw-picnic']);
});
