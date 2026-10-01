import { describe, expect, it } from 'vitest';
import { BubbleBoard, columnsInRow, MAX_ROWS, neighborCells } from './board';
import { GameEngine } from './engine';
import { levels, chapters } from './levels';
import { levels as edition5 } from './levels-v5';
import { restoreActiveRun, type RunAction } from './run';
import { suggestShot } from './advice';
import { campaignRoutesV6 } from './campaign-routes-v6';

const key = (cell: { row: number; col: number }) => `${cell.row}:${cell.col}`;
const shape = (level: typeof levels[number]) => new BubbleBoard(level.rows, level.specials).entries().map(key).sort().join('|');

function replay(level: typeof levels[number]) {
  const game = new GameEngine(level, 6);
  const actions: RunAction[] = [];
  const results = [];
  for (const move of campaignRoutesV6[level.id].split(' ')) {
    if (move.endsWith('s')) { game.swap(); actions.push({ type: 'swap' }); }
    const angle = parseFloat(move);
    results.push(game.fire(angle)); actions.push({ type: 'fire', angle });
    if (game.won) break;
    expect(game.lost || game.awaitingTopUp).toBe(false);
  }
  return { game, actions, results };
}

describe('hundred-meadow authored data', () => {
  it('appends exactly seventy levels and seven ten-meadow chapters', () => {
    expect(levels).toHaveLength(100); expect(chapters).toHaveLength(10);
    expect(levels.slice(0, 30)).toEqual(edition5);
    expect(levels.map(level => level.id)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    for (const [index, chapter] of chapters.entries()) {
      expect([chapter.first, chapter.last]).toEqual([index * 10 + 1, index * 10 + 10]);
      expect(levels.slice(chapter.first - 1, chapter.last).every(level => level.chapter === chapter.id)).toBe(true);
    }
  });

  it('has distinct silhouettes and authored names, goals and hints', () => {
    expect(new Set(levels.map(shape)).size).toBeGreaterThanOrEqual(90);
    for (const chapter of chapters.slice(3)) expect(new Set(levels.slice(chapter.first - 1, chapter.last).map(shape)).size).toBeGreaterThanOrEqual(8);
    expect(new Set(levels.slice(30).map(shape)).size).toBe(70);
    expect(new Set(levels.map(level => level.name)).size).toBe(100);
    expect(new Set(levels.slice(30).map(level => level.hint)).size).toBe(70);
    expect(new Set(levels.slice(30).map(level => JSON.stringify([level.rows, level.specials, level.flightPath, level.wind]))).size).toBe(70);
  });

  for (const level of levels.slice(30)) it(`validates level ${level.id} targets and routes`, () => {
    const board = new BubbleBoard(level.rows, level.specials);
    expect(level.rows.length).toBeLessThanOrEqual(MAX_ROWS - 2);
    expect(board.isOverflowing()).toBe(false);
    expect(Number.isSafeInteger(level.shots) && Number.isSafeInteger(level.par)).toBe(true);
    expect(level.par).toBeGreaterThan(0); expect(level.shots).toBeGreaterThan(level.par);
    expect(board.beeCount() + Number(Boolean(level.flightPath))).toBeGreaterThan(0);
    expect(new Set(level.specials.map(key)).size).toBe(level.specials.length);
    expect(board.availableColors().every(color => level.colors.includes(color))).toBe(true);
    expect(level.hint.length).toBeGreaterThan(30);
    const anchored = new Set(board.entries().filter(cell => cell.row === 0).map(key));
    const queue = board.entries().filter(cell => cell.row === 0);
    while (queue.length) {
      const from = queue.shift()!;
      for (const cell of neighborCells(from)) {
        const bubble = board.get(cell);
        if (bubble && !anchored.has(key(cell))) { anchored.add(key(cell)); queue.push({ ...cell, bubble }); }
      }
    }
    expect(anchored.size).toBe(board.entries().length);
    for (const cell of level.flightPath ?? []) {
      expect(cell.row >= 0 && cell.row < MAX_ROWS && cell.col >= 0 && cell.col < columnsInRow(cell.row)).toBe(true);
    }
    if (level.flightPath) {
      expect(new Set(level.flightPath.map(key)).size).toBe(level.flightPath.length);
      expect(level.flightPath.some(cell => Boolean(board.get(cell)))).toBe(true);
      for (let i = 1; i < level.flightPath.length; i++) expect(neighborCells(level.flightPath[i - 1])).toContainEqual(level.flightPath[i]);
    }
    if (level.wind) {
      expect(level.wind.length).toBeGreaterThan(0);
      expect(level.wind.start).toBeGreaterThanOrEqual(0);
      expect(level.wind.start + level.wind.length).toBeLessThan(columnsInRow(level.wind.row));
      expect(board.get({ row: level.wind.row, col: level.wind.start + level.wind.length })).toBeUndefined();
    }
  });

  it('introduces both tricks before mixing them and keeps ceiling-layer bee targets', () => {
    for (const index of [30, 31]) {
      expect(levels[index].specials.some(tile => tile.kind === 'bud' && tile.row === 0 && new BubbleBoard(levels[index].rows, levels[index].specials).get(tile)?.bee)).toBe(true);
      expect(levels[index].specials.every(tile => tile.kind === 'bud')).toBe(true);
    }
    for (const index of [40, 41]) {
      expect(levels[index].specials.some(tile => tile.kind === 'echo')).toBe(true);
      expect(levels[index].specials.every(tile => tile.kind === 'echo')).toBe(true);
    }
    expect(levels.slice(30, 40).every(level => !level.specials.some(tile => tile.kind === 'echo'))).toBe(true);
    expect(levels.slice(40, 50).every(level => !level.specials.some(tile => tile.kind === 'bud'))).toBe(true);
  });
});

describe('edition six real-collision campaign', () => {
  for (const level of levels) it(`rescues all friends in ${level.id} within par using regular shots`, () => {
    expect(campaignRoutesV6[level.id]).toBeTruthy();
    const { game, results } = replay(level);
    expect(results.every(result => !result.bloom)).toBe(true);
    expect(game.bloomArmed).toBe(false);
    expect(game.won).toBe(true);
    expect(game.turns).toBeLessThanOrEqual(level.par);
    expect(game.usedHelp).toBe(false);
    expect(game.wildUsed).toBe(false);
    expect(game.shots).toBeGreaterThanOrEqual(0);
    expect(game.freedBees).toBe(game.totalBees);
  });

  it('makes the teaching routes actually reveal Buds and trigger Echo chains', () => {
    for (const index of [30, 31]) expect(replay(levels[index]).results.some(result => Boolean(result.settled?.transformed?.length))).toBe(true);
    for (const index of [40, 41]) expect(replay(levels[index]).results.some(result => (result.settled?.chains ?? 0) > 0)).toBe(true);
  });

  it('replays paused expanded runs deterministically without changing their new tiles or queue', () => {
    for (const id of [31, 42, 60, 76, 90, 100]) {
      const level = levels[id - 1];
      const route = campaignRoutesV6[id].split(' ');
      const original = new GameEngine(level, 6);
      const actions: RunAction[] = [];
      const first = route[0];
      if (first.endsWith('s')) { original.swap(); actions.push({ type: 'swap' }); }
      original.fire(parseFloat(first)); actions.push({ type: 'fire', angle: parseFloat(first) });
      expect(original.won).toBe(false);
      const restored = restoreActiveRun({ version: 6, levelId: id, actions }, levels, 100)!.engine;
      expect(restored.board.entries()).toEqual(original.board.entries());
      expect([restored.shots, restored.freedBees, restored.flightStep, restored.bloomCharge, restored.currentColor, restored.nextColor]).toEqual([original.shots, original.freedBees, original.flightStep, original.bloomCharge, original.currentColor, original.nextColor]);
      const move = route[1]; if (move.endsWith('s')) { restored.swap(); original.swap(); }
      expect(restored.fire(parseFloat(move))).toEqual(original.fire(parseFloat(move)));
    }
  });

  it('uses the real new cascade rules for hints without spending or mutating the live run', () => {
    for (const id of [31, 41, 60, 100]) {
      const game = new GameEngine(levels[id - 1]);
      const copy = game.clone();
      expect(suggestShot(game)?.message).toBeTruthy();
      expect(game.board.entries()).toEqual(copy.board.entries());
      expect(game.fire(.2)).toEqual(copy.fire(.2));
    }
  });
});
