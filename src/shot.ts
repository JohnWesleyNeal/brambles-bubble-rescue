import { BubbleBoard, GRID_LEFT, GRID_TOP, type Cell } from './board';

export interface ShotTrace { angle: number; path: { x: number; y: number }[]; placement: Cell | null }

// One collision implementation is shared by the visible projectile and replay checks.
export function traceShot(board: BubbleBoard, requestedAngle: number): ShotTrace {
  const angle = Math.max(-1.25, Math.min(1.25, requestedAngle));
  let x = 195;
  let y = 690;
  let vx = Math.sin(angle);
  const vy = -Math.cos(angle);
  const path = [{ x, y }];
  for (let step = 0; step < 800; step += 1) {
    x += vx * 4;
    y += vy * 4;
    if (x <= GRID_LEFT || x >= 339) {
      x = Math.max(GRID_LEFT, Math.min(339, x));
      vx *= -1;
    }
    path.push({ x, y });
    const impact = board.nearestOccupied(x, y);
    if (y <= GRID_TOP || impact) {
      return { angle, path, placement: board.placementFor(x, y, impact) };
    }
  }
  return { angle, path, placement: null };
}
