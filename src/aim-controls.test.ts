import { describe, expect, it } from 'vitest';
import {
  AimGesture, aimGuidePreferenceKey, canFireAimAt, isAimCancelPoint, loadAimGuideMode,
  shortAimPoints, storeAimGuideMode
} from './aim-controls';

describe('aim gesture cancellation', () => {
  it('fires once on a deliberate in-playfield release', () => {
    const gesture = new AimGesture();
    expect(gesture.begin(7)).toBe(true);
    expect(gesture.begin(8)).toBe(false);
    expect(gesture.release(7, { x: 220, y: 560 })).toBe('fire');
    expect(gesture.active).toBe(false);
    expect(gesture.release(7, { x: 220, y: 560 })).toBe('ignore');
  });

  it('cancels when the drag returns to the launcher', () => {
    const gesture = new AimGesture();
    gesture.begin(7);
    expect(isAimCancelPoint({ x: 237, y: 713 })).toBe(true);
    expect(gesture.release(7, { x: 237, y: 713 })).toBe('cancel');
  });

  it.each([
    { x: 18, y: 500 }, { x: 372, y: 500 }, { x: 200, y: 144 }, { x: 200, y: 776 }
  ])('cancels a release outside the playfield: $x,$y', (point) => {
    const gesture = new AimGesture();
    gesture.begin(3);
    expect(canFireAimAt(point)).toBe(false);
    expect(gesture.release(3, point)).toBe('cancel');
  });

  it.each(['pointercancel', 'Escape', 'focus loss', 'resize', 'modal'])('cancels after %s and makes a later release inert', () => {
    const gesture = new AimGesture();
    gesture.begin(3);
    expect(gesture.release(4, { x: 210, y: 500 })).toBe('ignore');
    expect(gesture.active).toBe(true);
    expect(gesture.matches(3)).toBe(true);
    expect(gesture.matches(4)).toBe(false);
    expect(gesture.cancel(4)).toBe(false);
    expect(gesture.cancel()).toBe(true); // each interruption aborts the provisional shot
    expect(gesture.active).toBe(false);
    expect(gesture.release(3, { x: 210, y: 500 })).toBe('ignore');
  });
});

describe('aim guide preference', () => {
  function memoryStorage(initial?: string) {
    const values = new Map<string, string>();
    if (initial) values.set(aimGuidePreferenceKey, initial);
    return {
      values,
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); }
    };
  }

  it('defaults to short, persists full assist independently, and ignores invalid values', () => {
    const storage = memoryStorage();
    expect(loadAimGuideMode(storage)).toBe('short');
    expect(storeAimGuideMode('full', storage)).toBe(true);
    expect(storage.values.get(aimGuidePreferenceKey)).toBe('full');
    expect(loadAimGuideMode(storage)).toBe('full');
    storage.setItem(aimGuidePreferenceKey, 'surprise');
    expect(loadAimGuideMode(storage)).toBe('short');
  });

  it('keeps the default when browser storage is unavailable', () => {
    const blockedStorage = {
      getItem: () => { throw new Error('storage unavailable'); },
      setItem: () => { throw new Error('storage unavailable'); }
    };
    expect(loadAimGuideMode(blockedStorage)).toBe('short');
    expect(storeAimGuideMode('full', blockedStorage)).toBe(false);
  });

  it('catches a throwing global localStorage getter', () => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    try {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('storage getter denied'); } });
      expect(loadAimGuideMode()).toBe('short');
      expect(storeAimGuideMode('full')).toBe(false);
    } finally {
      if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('renders a short direction stem that ends well before a likely landing point', () => {
    const points = shortAimPoints(Math.PI / 6);
    const first = points[0];
    const last = points.at(-1)!;
    expect(first).toEqual({ x: 195, y: 690 });
    expect(Math.hypot(last.x - first.x, last.y - first.y)).toBeCloseTo(140, 5);
    expect(last.y).toBeGreaterThan(500);
  });
});
