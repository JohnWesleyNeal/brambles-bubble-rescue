import type { ShotTrace } from './shot';

/** Presentation never invents a flight curve: interpolate the engine's exact trace. */
export function shotPathPoint(path: ShotTrace['path'], index: number): { x: number; y: number } {
  if (!path.length) return { x: 195, y: 690 };
  const cursor = Math.max(0, Math.min(path.length - 1, index));
  const from = path[Math.floor(cursor)];
  const to = path[Math.min(path.length - 1, Math.floor(cursor) + 1)];
  const fraction = cursor - Math.floor(cursor);
  return { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction };
}

/** A small release acceleration, integrated analytically so frame rate cannot alter cadence. */
export function shotPathIndex(pathLength: number, elapsedMs: number, reducedMotion = false): number {
  const speed = Math.max(900, pathLength * 4 / .75) / 4;
  const time = Math.max(0, elapsedMs) / 1000;
  const release = .095;
  const t = Math.min(time / release, 1);
  // Start moving immediately at 55% speed; reach full speed within 95 ms.
  const traveled = reducedMotion ? time : time - .45 * release * (t - t * t * t + .5 * t * t * t * t);
  return Math.max(0, Math.min(pathLength - 1, traveled * speed));
}
