import { describe, expect, it } from 'vitest';
import { BUBBLE_TEXTURE_SIZE, bubbleMaterialTint, paintBubbleMaterial } from '../src/bubble-material';

const styles = [
  { fill: 0xf48b87, edge: 0xa94e65 }, { fill: 0xf6b765, edge: 0xb8793e },
  { fill: 0xf4e982, edge: 0xb8a64f }, { fill: 0x91d6a4, edge: 0x4d9672 },
  { fill: 0x89cbe9, edge: 0x4e8caf }, { fill: 0xc9a1dc, edge: 0x8d67a1 }
];

function recordingContext() {
  const calls: { method: string; args: unknown[] }[] = [];
  const gradients: { method: string; stops: { position: number; color: string }[] }[] = [];
  const properties: Record<string, unknown> = {};
  const context = new Proxy({}, {
    get: (_, method: string) => (...args: unknown[]) => {
      calls.push({ method, args });
      if (method.startsWith('create')) {
        const stops: { position: number; color: string }[] = [];
        gradients.push({ method, stops });
        return { addColorStop: (position: number, color: string) => stops.push({ position, color }) };
      }
    },
    set: (_, property: string, value: unknown) => { properties[property] = value; return true; }
  }) as CanvasRenderingContext2D;
  return { context, calls, gradients, properties };
}

const hue = (color: readonly number[]): number => {
  const high = Math.max(...color), low = Math.min(...color), span = high - low;
  if (!span) return 0;
  return high === color[0] ? ((color[1] - color[2]) / span + 6) % 6
    : high === color[1] ? (color[2] - color[0]) / span + 2 : (color[0] - color[1]) / span + 4;
};

describe('cached bubble glass material', () => {
  it('keeps the established hue identities while increasing pastel color readability', () => {
    for (const { fill } of styles) {
      const before = [(fill >>> 16) & 255, (fill >>> 8) & 255, fill & 255];
      const after = bubbleMaterialTint(fill);
      expect(after.every(channel => Number.isInteger(channel) && channel >= 0 && channel <= 255)).toBe(true);
      expect(Math.abs(hue(after) - hue(before))).toBeLessThan(.025);
      expect(Math.max(...after) - Math.min(...after)).toBeGreaterThan(Math.max(...before) - Math.min(...before));
    }
    expect(bubbleMaterialTint(0x999999)).toEqual([153, 153, 153]);
  });

  it('preserves the 128px cached footprint and leaves the overlay layer out of the material', () => {
    const { context, calls, gradients } = recordingContext();
    paintBubbleMaterial(context, styles[0]);
    expect(BUBBLE_TEXTURE_SIZE).toBe(128);
    expect(calls[0]).toEqual({ method: 'save', args: [] });
    expect(calls.at(-1)).toEqual({ method: 'restore', args: [] });
    expect(calls.find(call => call.method === 'setTransform')?.args).toEqual([1, 0, 0, 1, 0, 0]);
    expect(calls.find(call => call.method === 'clearRect')?.args).toEqual([0, 0, 128, 128]);
    expect(calls.find(call => call.method === 'arc')?.args).toEqual([64, 64, 59, 0, Math.PI * 2]);
    expect(calls.some(call => ['fillText', 'strokeText', 'drawImage'].includes(call.method))).toBe(false);
    expect(gradients).toHaveLength(3);
    for (const gradient of gradients) {
      expect(gradient.stops[0].position).toBe(0);
      expect(gradient.stops.at(-1)?.position).toBe(1);
      expect(gradient.stops.map(stop => stop.position)).toEqual(gradient.stops.map(stop => stop.position).sort());
    }
  });

  it('scales only the drawing transform for an optional texture size', () => {
    const { context, calls } = recordingContext();
    paintBubbleMaterial(context, styles[4], 256);
    expect(calls.find(call => call.method === 'setTransform')?.args).toEqual([2, 0, 0, 2, 0, 0]);
    expect(calls.filter(call => call.method === 'arc').every(call => (call.args[2] as number) <= 59)).toBe(true);
  });
});
