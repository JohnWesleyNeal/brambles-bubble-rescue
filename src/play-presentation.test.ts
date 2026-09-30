import { describe, expect, it } from 'vitest';
import { brambleIdlePose, brambleMotionAllowed, giftReadout, nextBubblePoint } from './play-presentation';
import { launcherPoint, aimCancelRadius } from './aim-controls';
import { GameEngine } from './engine';
import { levels } from './levels';
import { coaching } from './advice';
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
  it('points equipped-shot coaching at the visible cancel label', () => {
    const engine = new GameEngine(levels[0]);
    engine.armBooster('rainbow');
    expect(coaching(engine)).toBe('Gift ready · tap its label above to cancel');
  });
  it('keeps Next outside the unchanged launcher cancellation target', () => {
    expect(launcherPoint).toEqual({ x: 195, y: 690 });
    expect(Math.hypot(nextBubblePoint.x - launcherPoint.x, nextBubblePoint.y - launcherPoint.y)).toBeGreaterThan(aimCancelRadius + 22);
  });
});

describe('Bramble’s quiet company', () => {
  const playing = { aiming: false, menuOpen: false, pageHidden: false, reducedMotion: false };
  it('moves only during active, motion-friendly play', () => {
    expect(brambleMotionAllowed(playing)).toBe(true);
    for (const key of Object.keys(playing)) expect(brambleMotionAllowed({ ...playing, [key]: true })).toBe(false);
  });
  it('settles completely and never blinks when motion is suppressed', () => {
    expect(brambleIdlePose(4750, 0)).toEqual({ rise: 0, angle: 0, scaleX: 1, scaleY: 1, blink: false });
  });
  it('keeps breathing and sway small enough to stay within the corner', () => {
    for (let time = 0; time < 20000; time += 100) {
      const pose = brambleIdlePose(time);
      expect(Math.abs(pose.rise)).toBeLessThanOrEqual(2);
      expect(Math.abs(pose.angle)).toBeLessThanOrEqual(2.2);
      expect(pose.scaleX).toBeGreaterThanOrEqual(.988);
      expect(pose.scaleX).toBeLessThanOrEqual(1.012);
      expect(pose.scaleY).toBeGreaterThanOrEqual(.97);
      expect(pose.scaleY).toBeLessThanOrEqual(1.03);
    }
    expect(brambleIdlePose(4750).blink).toBe(true);
    expect(brambleIdlePose(4950).blink).toBe(false);
  });
});
