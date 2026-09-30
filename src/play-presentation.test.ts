import { describe, expect, it } from 'vitest';
import { giftReadout, nextBubblePoint } from './play-presentation';
import { launcherPoint, aimCancelRadius } from './aim-controls';
describe('quiet shooting dock', () => {
  const inventory = { rainbow: 2, double: 3, bonk: 4 };
  it('counts only unlocked gifts and keeps a free refill discoverable', () => {
    expect(giftReadout(inventory, 1, true)).toMatchObject({ text: '2', equipped: false });
    expect(giftReadout(inventory, 5, true).text).toBe('5');
    expect(giftReadout(inventory, 8, true).text).toBe('9');
    expect(giftReadout({ rainbow: 0, double: 0, bonk: 0 }, 30, true)).toMatchObject({ text: '+', label: expect.stringContaining('Free refills') });
  });
  it('shows the equipped gift and respects challenge restrictions', () => {
    expect(giftReadout(inventory, 8, true, 'rainbow')).toMatchObject({ text: 'Ready', equipped: true, label: expect.stringContaining('Rainbow Pop equipped') });
    expect(giftReadout(inventory, 8, false)).toMatchObject({ text: 'Off', equipped: false });
  });
  it('keeps Next outside the unchanged launcher cancellation target', () => {
    expect(launcherPoint).toEqual({ x: 195, y: 690 });
    expect(Math.hypot(nextBubblePoint.x - launcherPoint.x, nextBubblePoint.y - launcherPoint.y)).toBeGreaterThan(aimCancelRadius + 22);
  });
});
