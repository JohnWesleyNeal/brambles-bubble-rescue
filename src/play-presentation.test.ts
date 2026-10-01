import { describe, expect, it } from 'vitest';
import { brambleIdlePose, brambleMotionAllowed, brambleTossPose, brambleShoulder, brambleShoulderPoints, bramblePawLength, bramblePawOutline, brambleBodyPoint, brambleDisplaySize, playHeight, giftReadout, nextBubblePoint } from './play-presentation';
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

describe('Bramble’s two-paw cradle', () => {
  const ready = { pawAngle: -90, lean: 0, lift: 0, shiftX: 0, scaleY: 1 };
  const geometry = (aim: number, time?: number, side: 0 | 1 = 0, idleTime?: number, bubbleLoaded = true) => {
    const pose = brambleTossPose(aim, time, false, bubbleLoaded);
    const idle = brambleIdlePose(idleTime ?? 0, idleTime === undefined ? 0 : 1);
    const center = { x: brambleBodyPoint.x + pose.shiftX, y: brambleBodyPoint.y - pose.lift - idle.rise };
    const width = brambleDisplaySize.width * idle.scaleX * (1 + (1 - pose.scaleY) * .5), height = brambleDisplaySize.height * idle.scaleY * pose.scaleY;
    const angle = idle.angle + pose.lean;
    const shoulder = brambleShoulder(center, width, height, angle, side);
    const radians = (angle + (side === 0 ? -180 - pose.pawAngle : pose.pawAngle)) * Math.PI / 180;
    return { pose, shoulder, paw: { x: shoulder.x + bramblePawLength * Math.cos(radians), y: shoulder.y + bramblePawLength * Math.sin(radians) } };
  };
  it('stands centered beneath the unchanged bubble and cups it with matching paws', () => {
    expect(brambleBodyPoint).toEqual({ x: 195, y: 700 });
    expect(brambleTossPose(0)).toEqual(ready);
    const left = geometry(0, undefined, 0), right = geometry(0, undefined, 1);
    expect(left.paw.x + right.paw.x).toBeCloseTo(launcherPoint.x * 2);
    expect(left.paw.y).toBeCloseTo(right.paw.y);
    expect(left.paw.x).toBeGreaterThan(169);
    expect(left.paw.x).toBeLessThan(173);
    expect(left.paw.y).toBeGreaterThan(700);
    expect(left.paw.y).toBeLessThan(708);
    expect(brambleTossPose(1).pawAngle).toBe(ready.pawAngle);
    expect(brambleTossPose(-1).pawAngle).toBe(ready.pawAngle);
    expect(launcherPoint).toEqual({ x: 195, y: 690 });
  });
  it('uses a gentle body crouch, upward toss and settled recovery', () => {
    expect(brambleTossPose(0, 0)).toEqual(ready);
    expect(brambleTossPose(0, 35).scaleY).toBe(.96);
    expect(brambleTossPose(0, 35).lift).toBe(-1.6);
    expect(brambleTossPose(0, 180)).toEqual({ pawAngle: -95, lean: 0, lift: 3, shiftX: 0, scaleY: 1 });
    expect(brambleTossPose(0, 300).pawAngle).toBeGreaterThan(-95);
    expect(brambleTossPose(0, 360, false, false)).toEqual({ ...ready, pawAngle: 65 });
    expect(brambleTossPose(0, 440, false, true).pawAngle).toBeCloseTo(-12.5);
    expect(brambleTossPose(0, 520)).toEqual(ready);
    expect(brambleTossPose(0, undefined, false, false).pawAngle).toBe(65);
  });
  it('keeps matched fixed shoulders and constant short reach throughout every pose', () => {
    expect(brambleShoulderPoints).toEqual([{ x: 72, y: 158 }, { x: 148, y: 158 }]);
    expect(bramblePawLength).toBe(24);
    for (const aim of [-1.25, 0, 1.25]) for (let time = 0; time <= 520; time += 5) for (const side of [0, 1] as const) {
      const { pose, paw, shoulder } = geometry(aim, time, side, time * 27);
      expect(Math.hypot(paw.x - shoulder.x, paw.y - shoulder.y)).toBeCloseTo(bramblePawLength, 8);
      expect(paw.y - 10).toBeGreaterThan(653);
      expect(paw.x + 10).toBeLessThan(nextBubblePoint.x - 24);
      expect(paw.x - 14).toBeGreaterThan(130);
      expect(Math.abs(pose.lean)).toBeLessThanOrEqual(.5);
    }
    // Both sides use this one continuous broad outline, with no separate finger or wrist shapes.
    expect(bramblePawOutline.curves).toHaveLength(5);
    for (const curve of bramblePawOutline.curves) for (let i = 0; i < curve.length; i += 2) {
      expect(curve[i]).toBeLessThanOrEqual(23);
      expect(Math.abs(curve[i + 1])).toBeLessThanOrEqual(6);
    }
  });
  it('keeps both arms symmetric through anticipation, release and recovery', () => {
    for (let time = 0; time <= 520; time += 5) {
      const left = geometry(0, time, 0), right = geometry(0, time, 1);
      expect(left.shoulder.x + right.shoulder.x).toBeCloseTo(launcherPoint.x * 2);
      expect(left.shoulder.y).toBeCloseTo(right.shoulder.y);
      expect(left.paw.x + right.paw.x).toBeCloseTo(launcherPoint.x * 2);
      expect(left.paw.y).toBeCloseTo(right.paw.y);
    }
  });
  it('keeps the relaxed paws above the instructions and outside the Bloom nook', () => {
    for (let idleTime = 0; idleTime < 20000; idleTime += 50) for (const side of [0, 1] as const) {
      const { paw } = geometry(0, 360, side, idleTime, false);
      expect(paw.y + 14).toBeLessThan(779);
      expect(playHeight).toBe(892);
      expect(brambleDisplaySize).toEqual({ width: 138, height: 144 });
      expect(paw.x - 9).toBeGreaterThan(100);
    }
  });
  it('holds both paws down until the next bubble is loaded', () => {
    for (const time of [360, 440, 520, 1000]) expect(brambleTossPose(0, time, false, false)).toEqual({ ...ready, pawAngle: 65 });
  });
  it('keeps the whole gesture still with reduced motion', () => {
    for (const angle of [-1, 0, 1]) for (const time of [0, 35, 90, 180, 360]) expect(brambleTossPose(angle, time, true)).toEqual(ready);
  });
});
