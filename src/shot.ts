import { BUBBLE_RADIUS, BubbleBoard, cellPosition, GRID_LEFT, GRID_TOP, type Cell } from './board';

export interface ShotTrace { angle: number; path: { x: number; y: number }[]; placement: Cell | null; impact: Cell | null }

// Keep the original sampling rules for saved action logs from editions 1-4.
function traceLegacyShot(board: BubbleBoard, requestedAngle: number): ShotTrace {
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
      return { angle, path, placement: board.placementFor(x, y, impact), impact: impact ? { row: impact.row, col: impact.col } : null };
    }
  }
  return { angle, path, placement: null, impact: null };
}

// Continuous circle sweeps let a 34-unit-wide shot pass through a genuine
// 38-unit opening. The same trace drives the aim guide and visible projectile.
export function traceShot(board: BubbleBoard, requestedAngle: number, legacy = false): ShotTrace {
  if (legacy) return traceLegacyShot(board, requestedAngle);
  const angle = Math.max(-1.25, Math.min(1.25, requestedAngle));
  let x = 195;
  let y = 690;
  let vx = Math.sin(angle);
  const vy = -Math.cos(angle);
  const path = [{ x, y }];
  const targets = board.entries().map((cell) => ({ cell, point: cellPosition(cell) }));
  const radius = BUBBLE_RADIUS * 2;
  for (let step = 0; step < 800; step++) {
    let remaining = 4;
    while (remaining > 0.0001) {
      let fraction = 1;
      let impact: Cell | null = null;
      let boundary: 'wall' | 'top' | null = null;
      if (vx < 0 && x + vx * remaining <= GRID_LEFT) {
        fraction = (GRID_LEFT - x) / (vx * remaining); boundary = 'wall';
      } else if (vx > 0 && x + vx * remaining >= 339) {
        fraction = (339 - x) / (vx * remaining); boundary = 'wall';
      }
      if (y + vy * remaining <= GRID_TOP) {
        const top = (GRID_TOP - y) / (vy * remaining);
        if (top < fraction) { fraction = top; boundary = 'top'; }
      }
      for (const target of targets) {
        const dx = x - target.point.x;
        const dy = y - target.point.y;
        const projection = dx * vx + dy * vy;
        const discriminant = projection * projection - (dx * dx + dy * dy - radius * radius);
        if (discriminant < 0) continue;
        const distance = -projection - Math.sqrt(discriminant);
        const hit = distance / remaining;
        if (hit >= 0 && hit <= fraction) { fraction = hit; boundary = null; impact = target.cell; }
      }
      fraction = Math.max(0, Math.min(1, fraction));
      const traveled = remaining * fraction;
      x += vx * traveled;
      y += vy * traveled;
      path.push({ x, y });
      if (impact || boundary === 'top') {
        return { angle, path, placement: board.placementFor(x, y, impact ?? undefined), impact };
      }
      remaining -= traveled;
      if (boundary === 'wall') { vx *= -1; if (remaining < 0.0001) break; }
      else break;
    }
  }
  return { angle, path, placement: null, impact: null };
}
