/** Offline bounded beam search. This proves collision-path solvability, not fun
 * or human aiming difficulty. No browser, gifts, wild, Bloom, or top-ups. */
import { GameEngine } from '../src/engine';
import { levels } from '../src/levels';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

type Node = { game: GameEngine; route: string[]; score: number };
const startId = Number(process.argv[2] ?? 31);
const lastId = Number(process.argv[3] ?? 100);
const width = Number(process.argv[4] ?? 36);
const output = 'scripts/campaign-routes-v6.json';
const routes: Record<number, string> = existsSync(output) ? JSON.parse(readFileSync(output, 'utf8')) : {};
const key = (g: GameEngine): string => JSON.stringify([g.board.entries(), g.currentColor, g.nextColor, (g as any).rng.state, g.board.windPosition(), g.turns % 2, g.flightStep]);
function score(g: GameEngine): number {
  const entries = g.board.entries();
  const protectedTiles = entries.filter(c => c.bubble.kind === 'bud' || c.bubble.kind === 'dew').length;
  const echoed = entries.filter(c => c.bubble.kind === 'echo').length;
  return g.freedBees * 1200 + g.flightStep * 500 - entries.length * 14 - protectedTiles * 26 - echoed * 2
    - Math.max(...entries.map(c => c.row), 0) * 5 + g.shots * 0.1;
}
function solve(level: typeof levels[number]): string | undefined {
  let beam: Node[] = [{ game: new GameEngine(level, 6), route: [], score: 0 }];
  const seen = new Map<string, number>();
  for (let depth = 0; depth < level.par; depth++) {
    const next = new Map<string, Node>();
    for (const node of beam) {
      // A stable angle representative for each real collision placement.
      const angles = new Map<string, number>();
      for (let step = -50; step <= 50; step++) {
        const angle = step * .025;
        const trace = node.game.preview(angle);
        if (trace.placement) {
          const k = `${trace.placement.row}:${trace.placement.col}`;
          if (!angles.has(k) || Math.abs(angles.get(k)!) > Math.abs(angle)) angles.set(k, angle);
        }
      }
      for (const swap of [false, true]) {
        if (swap && node.game.currentColor === node.game.nextColor) continue;
        for (const angle of angles.values()) {
          const trial = node.game.clone();
          if (swap) trial.swap();
          trial.fire(angle);
          const route = [...node.route, `${Number(angle.toFixed(3))}${swap ? 's' : ''}`];
          if (trial.won) return route.join(' ');
          if (trial.lost || trial.awaitingTopUp) continue;
          const k = key(trial);
          if ((seen.get(k) ?? Infinity) <= depth) continue;
          const candidate = { game: trial, route, score: score(trial) };
          if (!next.has(k) || next.get(k)!.score < candidate.score) next.set(k, candidate);
        }
      }
    }
    beam = [...next.values()].sort((a, b) => b.score - a.score).slice(0, width);
    for (const node of beam) seen.set(key(node.game), depth);
    if (!beam.length) break;
  }
}
for (const level of levels.filter(l => l.id >= startId && l.id <= lastId)) {
  const before = Date.now();
  const found = solve(level);
  if (found) routes[level.id] = found;
  console.log(`${level.id}: ${found ?? 'NO ROUTE'} (${Date.now() - before}ms, par ${level.par})`);
  writeFileSync(output, JSON.stringify(routes, null, 2) + '\n');
}
