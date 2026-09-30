export type AimGuideMode = 'short' | 'full';
export type AimOutcome = 'fire' | 'cancel' | 'ignore';

export interface AimPoint { x: number; y: number }

export const aimGuidePreferenceKey = 'bramble-bubble-aim-guide-v1';
export const launcherPoint: AimPoint = { x: 195, y: 690 };
export const aimCancelRadius = 48;

export function loadAimGuideMode(storage?: Pick<Storage, 'getItem'>): AimGuideMode {
  try { return (storage ?? globalThis.localStorage).getItem(aimGuidePreferenceKey) === 'full' ? 'full' : 'short'; }
  catch { return 'short'; }
}

export function storeAimGuideMode(mode: AimGuideMode, storage?: Pick<Storage, 'setItem'>): boolean {
  try { (storage ?? globalThis.localStorage).setItem(aimGuidePreferenceKey, mode); return true; }
  catch { return false; }
}

export function isAimCancelPoint(point: AimPoint): boolean {
  return Math.hypot(point.x - launcherPoint.x, point.y - launcherPoint.y) <= aimCancelRadius;
}

export function canFireAimAt(point: AimPoint): boolean {
  return point.x >= 19 && point.x <= 371 && point.y >= 145 && point.y <= 775 && !isAimCancelPoint(point);
}

/** A quiet, fixed-length direction cue: it never reveals the eventual collision or landing point. */
export function shortAimPoints(angle: number, length = 140, spacing = 18): AimPoint[] {
  const steps = Math.ceil(length / spacing);
  return Array.from({ length: steps + 1 }, (_, step) => {
    const distance = Math.min(length, step * spacing);
    return { x: launcherPoint.x + Math.sin(angle) * distance, y: launcherPoint.y - Math.cos(angle) * distance };
  });
}

/** Tracks one provisional shot; only a matching, in-bounds release commits it. */
export class AimGesture {
  private pointerId: number | undefined;

  get active(): boolean { return this.pointerId !== undefined; }
  matches(pointerId: number): boolean { return pointerId === this.pointerId; }

  begin(pointerId: number): boolean {
    if (this.active) return false;
    this.pointerId = pointerId;
    return true;
  }

  release(pointerId: number, point: AimPoint): AimOutcome {
    if (pointerId !== this.pointerId) return 'ignore';
    this.pointerId = undefined;
    return canFireAimAt(point) ? 'fire' : 'cancel';
  }

  cancel(pointerId?: number): boolean {
    if (!this.active || (pointerId !== undefined && pointerId !== this.pointerId)) return false;
    this.pointerId = undefined;
    return true;
  }
}
