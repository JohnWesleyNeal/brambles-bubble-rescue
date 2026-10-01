import { describe, expect, it } from 'vitest';
import { BubbleBoard, type Bubble, type Cell, type OccupiedCell } from './board';
import { GameEngine, type FireResult } from './engine';
import { levels } from './levels';
import { campaignRoutesV6 } from './campaign-routes-v6';
import { buildPopPresentation, POP_EFFECT_LIMIT, popMotion } from './pop-presentation';

const red: Bubble = { color: 'R', bee: false, kind: 'normal' };
const cell = (row: number, col: number, bubble: Bubble = red): OccupiedCell => ({ row, col, bubble: { ...bubble } });
const address = ({ row, col }: Cell) => `${row}:${col}`;
const result = (popped: OccupiedCell[], dropped: OccupiedCell[] = [], extra: Partial<FireResult> = {}): FireResult => ({
  trace: { path: [], placement: { row: 1, col: 0 }, impact: { row: 0, col: 0 }, angle: 0 },
  color: 'R', wild: false, won: false, lost: false,
  settled: { placed: { row: 1, col: 0 }, popped, dropped, cracked: [], beesFreed: 0, bonusShots: 0 }, ...extra
});
const totalObjects = (plan: ReturnType<typeof buildPopPresentation>) => [...plan.pops, ...plan.drops, ...plan.accents]
  .reduce((sum, cue) => sum + cue.beadCount + Number(cue.ring) + Number(cue.pollen), 0);

function freeze<T>(value: T): T {
  if (value && typeof value === 'object') { Object.freeze(value); for (const child of Object.values(value)) freeze(child); }
  return value;
}

describe('restrained pop cadence', () => {
  it('orders a real match out from impact, independent of insertion order', () => {
    const popped = [cell(0, 3), cell(0, 1), cell(0, 0), cell(0, 2), cell(1, 0)];
    const before = popped.filter(tile => tile.row !== 1);
    const first = buildPopPresentation(result(popped), before);
    const second = buildPopPresentation(result(popped.slice().reverse()), before.slice().reverse());
    expect(first).toEqual(second);
    expect(first.pops[0].cell).toMatchObject({ row: 0, col: 0 });
    expect(first.pops.map(cue => cue.rank)).toEqual([0, 1, 1, 2, 3]);
    expect(first.pops.map(cue => cue.delayMs)).toEqual([0, 22, 22, 44, 66]);
  });

  it('has a quick plump followed by a pinched burst, with beads released at burst', () => {
    const plan = buildPopPresentation(result([cell(0, 0), cell(0, 1), cell(1, 0)]), [cell(0, 0), cell(0, 1)]);
    expect(popMotion.plumpX).toBeGreaterThan(1);
    expect(popMotion.plumpX).toBeLessThan(1.2);
    expect(popMotion.pinchX).toBeLessThan(.4);
    expect(popMotion.pinchY).toBeLessThan(.5);
    for (const cue of plan.pops) {
      expect(cue.burstAtMs).toBe(cue.delayMs + popMotion.plumpMs);
      expect(cue.endMs).toBe(cue.burstAtMs + popMotion.pinchMs);
    }
    expect(popMotion.ringEndRadius).toBeLessThan(34);
  });

  it('gives follow-on Echo clusters separate, bounded visual beats', () => {
    const board = new BubbleBoard(['RRBBRBBGG', '.....B..'], [
      { row: 0, col: 2, kind: 'echo' }, { row: 0, col: 3, kind: 'echo' },
      { row: 0, col: 5, kind: 'echo' }, { row: 0, col: 6, kind: 'echo' }, { row: 1, col: 5, kind: 'echo' }
    ]);
    const before = board.entries();
    const shot = result([]); shot.settled = board.settle({ row: 1, col: 0 }, red);
    expect(shot.settled.chains).toBe(2);
    const plan = buildPopPresentation(shot, before);
    const waves = [0, 1, 2].map(wave => plan.pops.filter(cue => cue.wave === wave));
    expect(waves.map(cues => cues.length)).toEqual([3, 3, 3]);
    for (let wave = 1; wave < 3; wave++) expect(Math.min(...waves[wave].map(cue => cue.delayMs)))
      .toBeGreaterThan(Math.max(...waves[wave - 1].map(cue => cue.delayMs)));
    expect(Math.max(...plan.pops.map(cue => cue.delayMs))).toBeLessThanOrEqual(popMotion.maxDelayMs);
    expect(plan.pops.find(cue => address(cue.cell) === '0:4')?.wave).toBe(1);
    expect(plan.pops.find(cue => address(cue.cell) === '0:5')?.wave).toBe(2);
  });

  it('lets an entire detached component fall after its latest adjacent support bursts', () => {
    const popped = [cell(0, 0), cell(1, 0), cell(1, 1), cell(0, 1)];
    const dropped = [cell(2, 0, { ...red, color: 'B' }), cell(2, 1, { ...red, color: 'B' }), cell(3, 0, { ...red, color: 'B' })];
    const plan = buildPopPresentation(result(popped, dropped), [...popped, ...dropped]);
    const lastSupport = Math.max(...plan.pops.filter(cue => cue.cell.row === 1).map(cue => cue.burstAtMs));
    expect(plan.drops).toHaveLength(3);
    for (const cue of plan.drops) {
      expect(cue.delayMs).toBeGreaterThan(lastSupport);
      expect(cue.support).toBeDefined();
      expect(cue.endMs).toBe(cue.delayMs + popMotion.dropMs);
    }
    expect(plan.drops[2].delayMs).toBeGreaterThan(plan.drops[0].delayMs);
  });

  it('waits for a breeze shift before its dropped tiles fall', () => {
    const shot = result([], [], { turn: { moved: true, changed: [], moves: [], dropped: [cell(6, 1)], beesFreed: 0, bonusShots: 0 } });
    const plan = buildPopPresentation(shot, [cell(6, 1)]);
    expect(plan.drops[0].delayMs).toBeGreaterThanOrEqual(260);
  });

  it('preserves two tiles when a breeze moves one into a previously dropped coordinate', () => {
    const first = cell(3, 2, { ...red, bee: true });
    const later = cell(3, 2, { ...red, color: 'B', bee: true });
    const shot = result([], [first], { turn: { moved: true, changed: [], moves: [{ from: { row: 3, col: 1 }, to: later }], dropped: [later], beesFreed: 1, bonusShots: 0 } });
    const plan = buildPopPresentation(shot, [first, cell(3, 1, later.bubble)]);
    expect(plan.drops).toHaveLength(2);
    expect(plan.drops.map(cue => cue.source)).toEqual(['support', 'wind']);
    expect(plan.drops.map(cue => cue.cell.bubble.color)).toEqual(['R', 'B']);
  });

  it('waits for the last rescue callback even in a deep breeze-triggered drop', () => {
    const fallen = [1, 2, 3, 4, 5].map(row => cell(row, 2, { ...red, bee: true }));
    const shot = result([], [], { turn: { moved: true, changed: [], moves: [], dropped: fallen, beesFreed: 5, bonusShots: 0 } });
    const plan = buildPopPresentation(shot, fallen);
    for (const cue of plan.drops) expect(cue.releaseAtMs + popMotion.beeMs).toBeLessThan(plan.durationMs);
    expect(plan.durationMs).toBeLessThanOrEqual(popMotion.maxResolveMs);
  });

  it('caps every decorative object including rings and pollen in a huge special clear', () => {
    const tiles = Array.from({ length: 9 }, (_, col) => cell(0, col, { ...red, kind: 'pollen', bee: true }));
    const fallen = Array.from({ length: 8 }, (_, col) => cell(1, col, { ...red, kind: 'pollen', bee: true }));
    const shot = result(tiles, fallen, { booster: 'bonk', bloom: true });
    shot.settled!.cracked = tiles;
    shot.settled!.transformed = fallen;
    const before = [...tiles, ...fallen.map(tile => ({ ...tile, bubble: { ...tile.bubble, kind: 'echo' as const } }))];
    const plan = buildPopPresentation(shot, before);
    expect(totalObjects(plan)).toBe(plan.effectCount);
    expect(plan.effectCount).toBeLessThanOrEqual(POP_EFFECT_LIMIT);
    expect(plan.effectCount).toBe(POP_EFFECT_LIMIT);
    expect(plan.accents.filter(cue => cue.ring).length).toBeLessThanOrEqual(6);
    expect(plan.pops.every(cue => cue.pollen)).toBe(true);
    expect(plan.durationMs).toBeLessThanOrEqual(popMotion.maxResolveMs);
    for (const cue of [...plan.pops, ...plan.drops]) {
      expect(plan.durationMs).toBeGreaterThan(cue.endMs);
      expect(plan.durationMs).toBeGreaterThan((('burstAtMs' in cue) ? cue.burstAtMs : cue.releaseAtMs) + popMotion.beeMs);
    }
  });

  it('removes deformation, particle, ring and flight schedules for reduced motion', () => {
    const shot = result([cell(0, 0, { ...red, bee: true, kind: 'pollen' })]);
    expect(buildPopPresentation(shot, [], true)).toEqual({ reducedMotion: true, pops: [], drops: [], accents: [], effectCount: 0, durationMs: 100 });
  });

  it('is pure and preserves every engine result and before-picture', () => {
    const before = freeze([cell(0, 0), cell(0, 1), cell(2, 0, { ...red, bee: true })]);
    const shot = freeze(result([before[0], before[1], cell(1, 0)], [before[2]]));
    const snapshot = JSON.stringify({ before, shot });
    const plan = buildPopPresentation(shot, before);
    expect(JSON.stringify({ before, shot })).toBe(snapshot);
    expect(plan).toEqual(buildPopPresentation(shot, before));
    expect(plan.pops[0].cell).not.toBe(shot.settled!.popped[0]);
    expect(plan.pops[0].cell.bubble).not.toBe(shot.settled!.popped[0].bubble);
  });

  it('keeps every authored campaign shot bounded, readable and engine-neutral', () => {
    let shots = 0;
    for (const level of levels) {
      const engine = new GameEngine(level);
      for (const move of campaignRoutesV6[level.id].split(' ')) {
        if (move.endsWith('s')) engine.swap();
        const before = engine.board.entries();
        const shot = engine.fire(Number.parseFloat(move));
        const snapshot = JSON.stringify({ before, shot, after: engine.board.entries() });
        const plan = buildPopPresentation(shot, before);
        expect(JSON.stringify({ before, shot, after: engine.board.entries() })).toBe(snapshot);
        expect(plan.pops.length).toBe(shot.settled?.popped.length ?? 0);
        expect(plan.drops.length).toBe((shot.settled?.dropped.length ?? 0) + (shot.turn?.dropped.length ?? 0));
        expect(totalObjects(plan)).toBe(plan.effectCount);
        expect(plan.effectCount).toBeLessThanOrEqual(POP_EFFECT_LIMIT);
        expect(plan.durationMs).toBeLessThanOrEqual(popMotion.maxResolveMs);
        expect(plan.durationMs).toBeGreaterThanOrEqual(340);
        for (const cue of [...plan.pops, ...plan.drops]) {
          expect(Number.isFinite(cue.delayMs)).toBe(true);
          expect(cue.delayMs).toBeGreaterThanOrEqual(0);
          expect(cue.endMs).toBeLessThan(plan.durationMs);
          if (cue.cell.bubble.bee) expect((('burstAtMs' in cue) ? cue.burstAtMs : cue.releaseAtMs) + popMotion.beeMs).toBeLessThan(plan.durationMs);
        }
        shots++;
        if (engine.won) break;
      }
      expect(engine.won).toBe(true);
    }
    expect(shots).toBeGreaterThan(300);
  });

  it('handles empty and transformation-only results without malformed timings', () => {
    expect(buildPopPresentation({ ...result([]), settled: undefined }, []).durationMs).toBe(360);
    const shot = result([]); shot.settled!.transformed = [{ row: 0, col: 0 }];
    const plan = buildPopPresentation(shot, [cell(0, 0, { ...red, kind: 'bud', nextColor: 'B' })]);
    expect(plan.accents.some(cue => cue.kind === 'bud')).toBe(true);
    expect(plan.durationMs).toBeGreaterThanOrEqual(popMotion.beadMs);
  });
});
