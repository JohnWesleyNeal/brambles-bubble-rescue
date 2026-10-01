import { describe, expect, it } from 'vitest';
import { BRAMBLE_GESTURE_STEPS, brambleGestureFrame, brambleGestureTextureSize, paintBrambleGesture } from './bramble-gesture-texture';

describe('opaque, fixed painted gesture cache', () => {
  it('uses a small fixed cache with subpixel hand steps at game size', () => {
    expect(BRAMBLE_GESTURE_STEPS).toBe(16);
    expect(brambleGestureTextureSize.width * brambleGestureTextureSize.height * 4 * 17).toBeLessThan(4 * 1024 * 1024);
    for (let t = 0; t <= 1; t += .01) expect(Math.abs(brambleGestureFrame(t) / BRAMBLE_GESTURE_STEPS - t)).toBeLessThanOrEqual(1 / 32 + .00001);
    expect(brambleGestureFrame(-1)).toBe(0); expect(brambleGestureFrame(5)).toBe(16);
  });
  it('adds weighted painting pixels on transparent cache and restores original face/feet', () => {
    const draws: { image: unknown; blend: string; alpha: number }[] = [];
    const events: string[] = [];
    const ready = {} as CanvasImageSource, lift = {} as CanvasImageSource;
    const context = {
      globalAlpha: 1, globalCompositeOperation: 'source-over',
      save: () => events.push('save'), restore: () => events.push('restore'),
      clearRect: () => events.push('clear'), beginPath: () => events.push('begin'),
      rect: () => events.push('protected'), clip: () => events.push('clip'),
      drawImage(image: unknown) { draws.push({ image, blend: this.globalCompositeOperation, alpha: this.globalAlpha }); }
    };
    paintBrambleGesture(context as unknown as CanvasRenderingContext2D, ready, lift, .5);
    expect(draws).toEqual([
      { image: ready, blend: 'lighter', alpha: .5 },
      { image: lift, blend: 'lighter', alpha: .5 },
      { image: ready, blend: 'source-over', alpha: 1 }
    ]);
    expect(events.filter(event => event === 'protected')).toHaveLength(2);
    expect(events[0]).toBe('save'); expect(events.at(-1)).toBe('restore');
  });
});
