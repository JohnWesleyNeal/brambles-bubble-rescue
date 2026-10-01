import { cellPosition, neighborCells, type Bubble, type Cell, type OccupiedCell } from './board';
import type { FireResult } from './engine';

/** Decorative objects share one budget; bubbles and rescued bees are gameplay readouts. */
export const POP_EFFECT_LIMIT = 48;
export const popMotion = {
  plumpMs: 48, pinchMs: 90,
  plumpX: 1.11, plumpY: 1.06, pinchX: .18, pinchY: .32,
  maxDelayMs: 168, dropMs: 340, dropReleaseMs: 38, beeMs: 850,
  ringMs: 260, beadMs: 300, pollenMs: 480,
  ringStartRadius: 11, ringEndRadius: 27,
  maxResolveMs: 1200
} as const;

interface EffectAllocation { beadCount: number; ring: boolean; pollen: boolean }
export interface PopCue extends EffectAllocation {
  cell: OccupiedCell;
  /** Presentation inference, never fed back into matching or saves. */
  wave: number;
  rank: number;
  delayMs: number;
  burstAtMs: number;
  endMs: number;
}
export interface DropCue extends EffectAllocation {
  cell: OccupiedCell;
  support?: Cell;
  source: 'support' | 'wind';
  delayMs: number;
  releaseAtMs: number;
  endMs: number;
  driftX: number;
  angle: number;
}
export interface PopAccent extends EffectAllocation {
  kind: 'impact' | 'dew' | 'bud' | 'echo';
  cell: Cell;
  delayMs: number;
}
export interface PopPresentation {
  reducedMotion: boolean;
  pops: PopCue[];
  drops: DropCue[];
  accents: PopAccent[];
  /** Includes every planned bead, ring and travelling pollen mote. */
  effectCount: number;
  durationMs: number;
}

const key = ({ row, col }: Cell): string => `${row}:${col}`;
const compare = (a: Cell, b: Cell): number => a.row - b.row || a.col - b.col;
const copyCell = (cell: OccupiedCell): OccupiedCell => ({ row: cell.row, col: cell.col, bubble: { ...cell.bubble } });
const blank = (): EffectAllocation => ({ beadCount: 0, ring: false, pollen: false });
const distance = (a: Cell, b: Cell): number => {
  const p = cellPosition(a), q = cellPosition(b);
  return Math.hypot(p.x - q.x, p.y - q.y);
};
function unique<T extends Cell>(cells: readonly T[]): T[] {
  return [...new Map(cells.map(cell => [key(cell), cell])).values()];
}

/** Initial matching membership is inferred from the before-picture, without a board mutation. */
function initialPops(result: FireResult, before: readonly OccupiedCell[], popped: readonly OccupiedCell[]): Cell[] {
  const origin = result.settled?.placed ?? result.trace.impact;
  if (!origin) return [];
  if (result.booster === 'bonk') return popped.filter(cell => key(cell) === key(origin));
  if (result.bloom) {
    const initial = new Set([origin, ...neighborCells(origin)].map(key));
    return popped.filter(cell => initial.has(key(cell)));
  }
  const tiles = new Map<string, Bubble>(before.map(cell => [key(cell), cell.bubble]));
  if (result.settled?.placed) tiles.set(key(result.settled.placed), { color: result.color, bee: false, kind: 'normal' });
  const color = tiles.get(key(origin))?.color ?? result.color;
  const visited = new Set<string>(), queue: Cell[] = [origin];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i], address = key(cell);
    if (visited.has(address) || tiles.get(address)?.color !== color) continue;
    visited.add(address);
    queue.push(...neighborCells(cell).filter(next => !visited.has(key(next))));
  }
  return popped.filter(cell => visited.has(key(cell)));
}

/** Converted Echo components cost one extra beat; an ordinary bridge costs none.
 * SettleResult has only a chain count, not exact per-wave membership. These ranks
 * are conservative visual ordering, not a second implementation of the rules. */
function popRanks(result: FireResult, before: readonly OccupiedCell[], popped: readonly OccupiedCell[], origin: Cell): Map<string, { wave: number; rank: number }> {
  const cells = new Map(popped.map(cell => [key(cell), cell]));
  const prior = new Map(before.map(cell => [key(cell), cell]));
  const converted = new Set(popped.filter(cell => prior.get(key(cell))?.bubble.kind === 'echo' && cell.bubble.kind !== 'echo').map(key));
  const components = new Map<string, number>();
  let component = 0;
  for (const cell of popped) {
    if (!converted.has(key(cell)) || components.has(key(cell))) continue;
    const queue: Cell[] = [cell];
    for (let i = 0; i < queue.length; i++) {
      const current = queue[i], address = key(current);
      if (!converted.has(address) || components.has(address)) continue;
      components.set(address, component);
      queue.push(...neighborCells(current));
    }
    component++;
  }
  const initial = initialPops(result, before, popped);
  const nearest = popped.slice().sort((a, b) => distance(a, origin) - distance(b, origin) || compare(a, b));
  const roots = initial.length ? initial : nearest.slice(0, 1);
  const wave = new Map<string, number>(roots.map(cell => [key(cell), 0]));
  const queue = roots.slice();
  // A small, deterministic 0/1 relaxation. No random numbers or mutable board state.
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i], from = key(current);
    for (const neighbor of neighborCells(current)) {
      const to = key(neighbor);
      if (!cells.has(to)) continue;
      const crossing = components.has(to) && components.get(to) !== components.get(from);
      const proposed = wave.get(from)! + (crossing ? 1 : 0);
      if (proposed < (wave.get(to) ?? Infinity)) { wave.set(to, proposed); queue.push(neighbor); }
    }
  }
  // Breadth first propagation begins at the actual contact, not insertion order.
  const rank = new Map<string, number>();
  const firstDistance = nearest[0] ? distance(nearest[0], origin) : 0;
  const near = nearest.filter(cell => Math.abs(distance(cell, origin) - firstDistance) < .01);
  const breadth: Cell[] = near.slice();
  for (const cell of near) rank.set(key(cell), 0);
  for (let i = 0; i < breadth.length; i++) {
    const current = breadth[i];
    for (const neighbor of neighborCells(current)) {
      const address = key(neighbor);
      if (!cells.has(address) || rank.has(address)) continue;
      rank.set(address, rank.get(key(current))! + 1); breadth.push(neighbor);
    }
  }
  const chains = Math.max(0, result.settled?.chains ?? 0);
  return new Map(popped.map(cell => [key(cell), {
    wave: Math.min(chains, wave.get(key(cell)) ?? chains),
    rank: rank.get(key(cell)) ?? Math.ceil(distance(cell, origin) / 36)
  }]));
}

/** Pure, bounded animation schedule. Nothing here changes engine timing or outcomes. */
export function buildPopPresentation(result: FireResult, before: readonly OccupiedCell[], reducedMotion = false): PopPresentation {
  const popped = unique(result.settled?.popped ?? []).map(copyCell);
  // A breeze may move a second bubble into a just-cleared coordinate. Keep both
  // physical tiles and their bee/pollen readouts, deduplicating only within a phase.
  const settledDrops = unique(result.settled?.dropped ?? []).map(copyCell);
  const turnDrops = unique(result.turn?.dropped ?? []).map(copyCell);
  const dropCells = [...settledDrops, ...turnDrops];
  const origin = result.trace.impact ?? result.settled?.placed ?? popped.slice().sort(compare)[0] ?? dropCells.slice().sort(compare)[0];
  if (reducedMotion) return { reducedMotion: true, pops: [], drops: [], accents: [], effectCount: 0, durationMs: 100 };
  const ranks = origin ? popRanks(result, before, popped, origin) : new Map<string, { wave: number; rank: number }>();
  const raw = (cell: Cell): number => { const rank = ranks.get(key(cell)); return (rank?.wave ?? 0) * 110 + Math.min(rank?.rank ?? 0, 4) * 22; };
  const largestDelay = Math.max(1, ...popped.map(raw));
  const compress = Math.min(1, popMotion.maxDelayMs / largestDelay);
  const pops: PopCue[] = popped.sort((a, b) => raw(a) - raw(b) || (origin ? distance(a, origin) - distance(b, origin) : 0) || compare(a, b)).map(cell => {
    const delayMs = Math.round(raw(cell) * compress);
    return { cell, ...ranks.get(key(cell))!, delayMs, burstAtMs: delayMs + popMotion.plumpMs,
      endMs: delayMs + popMotion.plumpMs + popMotion.pinchMs, ...blank() };
  });
  const popByKey = new Map(pops.map(cue => [key(cue.cell), cue]));
  const drops: DropCue[] = [];
  for (const batch of [{ cells: settledDrops, wind: false }, { cells: turnDrops, wind: true }]) {
    const dropByKey = new Map(batch.cells.map(cell => [key(cell), cell]));
    const dropped = new Set<string>();
    for (const root of batch.cells.slice().sort(compare)) {
      if (dropped.has(key(root))) continue;
      const group: OccupiedCell[] = [], queue: OccupiedCell[] = [root];
      for (let i = 0; i < queue.length; i++) {
        const cell = queue[i], address = key(cell);
        if (dropped.has(address)) continue;
        dropped.add(address); group.push(cell);
        for (const neighbor of neighborCells(cell)) {
          const tile = dropByKey.get(key(neighbor));
          if (tile && !dropped.has(key(tile))) queue.push(tile);
        }
      }
      // A detached component waits for its latest adjacent support to burst.
      const support = batch.wind ? undefined : group.flatMap(cell => neighborCells(cell).flatMap(neighbor => popByKey.get(key(neighbor)) ?? []))
        .sort((a, b) => b.burstAtMs - a.burstAtMs || compare(a.cell, b.cell))[0];
      const top = Math.min(...group.map(cell => cell.row));
      for (const cell of group) {
        const depth = Math.min(3, Math.max(0, cell.row - top));
        const wind = batch.wind;
        const delayMs = Math.min(popMotion.maxResolveMs - popMotion.dropReleaseMs - popMotion.beeMs - 20,
          Math.max(support ? support.burstAtMs + 24 : pops.length ? Math.max(...pops.map(cue => cue.burstAtMs)) + 24 : 70,
            wind ? 260 : 0) + depth * 12);
        const side = cellPosition(cell).x < 195 ? -1 : 1;
        drops.push({ cell, source: wind ? 'wind' : 'support', support: support ? { row: support.cell.row, col: support.cell.col } : undefined,
          delayMs, releaseAtMs: delayMs + popMotion.dropReleaseMs, endMs: delayMs + popMotion.dropMs,
          driftX: side * (7 + depth * 2), angle: side * (9 + depth * 3), ...blank() });
      }
    }
  }
  drops.sort((a, b) => a.delayMs - b.delayMs || compare(a.cell, b.cell));
  const nearbyBurst = (cell: Cell): number => {
    const touching = neighborCells(cell).flatMap(neighbor => popByKey.get(key(neighbor)) ?? []);
    return touching.length ? Math.min(...touching.map(cue => cue.burstAtMs)) + 8 : 0;
  };
  const beforeByKey = new Map(before.map(cell => [key(cell), cell]));
  const accents: PopAccent[] = [];
  if (origin) accents.push({ kind: 'impact', cell: { row: origin.row, col: origin.col }, delayMs: 0, ...blank() });
  for (const cell of unique(result.settled?.cracked ?? []).sort(compare)) accents.push({ kind: 'dew', cell: { ...cell }, delayMs: nearbyBurst(cell), ...blank() });
  for (const cell of unique(result.settled?.transformed ?? []).sort(compare)) {
    const kind = beforeByKey.get(key(cell))?.bubble.kind;
    if (kind === 'bud' || kind === 'echo') accents.push({ kind, cell: { ...cell }, delayMs: nearbyBurst(cell), ...blank() });
  }
  let remaining: number = POP_EFFECT_LIMIT;
  const reserve = (cue: EffectAllocation, count: number): void => {
    cue.beadCount = Math.min(count, remaining); remaining -= cue.beadCount;
  };
  // Gameplay-related pollen signals first; all still obey the same object cap.
  for (const cue of [...pops, ...drops]) if (cue.cell.bubble.kind === 'pollen' && remaining) { cue.pollen = true; remaining--; }
  // At most six restrained rings on the entire board, including the contact ring.
  for (const cue of accents.slice(0, 6)) if (remaining) { cue.ring = true; remaining--; }
  const impact = accents[0]?.kind === 'impact' ? accents[0] : undefined;
  if (impact && (result.bloom || result.booster)) reserve(impact, result.booster === 'bonk' ? 6 : 4);
  for (const cue of pops.slice(0, 8)) reserve(cue, cue.cell.bubble.kind === 'honeycomb' ? 3 : 2);
  for (const cue of accents.filter(cue => cue.kind !== 'impact').slice(0, 6)) reserve(cue, 2);
  for (const cue of drops.slice(0, 4)) reserve(cue, 1);
  const effectEnd = Math.max(0, ...accents.filter(cue => cue.ring || cue.beadCount).map(cue => cue.delayMs + Math.max(cue.ring ? popMotion.ringMs : 0, cue.beadCount ? popMotion.beadMs : 0)),
    ...pops.map(cue => cue.burstAtMs + Math.max(cue.beadCount ? popMotion.beadMs : 0, cue.pollen ? popMotion.pollenMs : 0)),
    ...drops.map(cue => cue.releaseAtMs + Math.max(cue.beadCount ? popMotion.beadMs : 0, cue.pollen ? popMotion.pollenMs : 0)));
  const beeEnd = Math.max(0, ...pops.filter(cue => cue.cell.bubble.bee).map(cue => cue.burstAtMs + popMotion.beeMs),
    ...drops.filter(cue => cue.cell.bubble.bee).map(cue => cue.releaseAtMs + popMotion.beeMs));
  const durationMs = Math.min(popMotion.maxResolveMs, Math.max(340, effectEnd, beeEnd, ...pops.map(cue => cue.endMs), ...drops.map(cue => cue.endMs)) + 20);
  return { reducedMotion: false, pops, drops, accents, effectCount: POP_EFFECT_LIMIT - remaining, durationMs };
}
