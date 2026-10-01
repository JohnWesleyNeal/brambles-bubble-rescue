import { describe, expect, it } from 'vitest';
import { brambleIdlePose, brambleMotionAllowed, brambleTossPose, brambleArmJoint, brambleBodyPoint, giftReadout, nextBubblePoint } from './play-presentation';
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

describe('Bramble at the launcher', () => {
  it('cups the loaded bubble and follows the aim without moving its origin', () => {
    expect(brambleTossPose(0)).toEqual({ handX: 195, handY: 711, lean: 0, lift: 0 });
    expect(brambleTossPose(1).handX).toBeLessThan(195);
    expect(brambleTossPose(-1).handX).toBeGreaterThan(195);
    expect(launcherPoint).toEqual({ x: 195, y: 690 });
  });
  it('lifts through release and recovers to the ready pose', () => {
    expect(brambleTossPose(0, 0)).toEqual(brambleTossPose(0));
    expect(brambleTossPose(0, 180).handY).toBe(685);
    expect(brambleTossPose(0, 180).lift).toBe(2.5);
    expect(brambleTossPose(0, 360).handY).toBeCloseTo(711);
  });
  it('keeps all paw poses clear of the board and Next bubble', () => {
    for (const angle of [-2, -1.25, 0, 1.25, 2]) for (let time = 0; time <= 360; time += 20) {
      const pose = brambleTossPose(angle, time);
      expect(pose.handX).toBeGreaterThanOrEqual(185);
      expect(pose.handX).toBeLessThanOrEqual(205);
      expect(pose.handY).toBeGreaterThan(680);
      expect(pose.handY).toBeLessThanOrEqual(711);
      expect(pose.handX + 10).toBeLessThan(nextBubblePoint.x - 24);
    }
  });
  it('keeps the whole launch gesture still with reduced motion', () => {
    for (const angle of [-1, 0, 1]) for (const time of [0, 90, 180, 360]) expect(brambleTossPose(angle, time, true)).toEqual({ handX: 195, handY: 711, lean: 0, lift: 0 });
  });
});


describe('Bramble’s full-body stance', () => {
  it('stands closer to the bubble, leaving the unchanged launch and Next spaces open', () => {
    expect(brambleBodyPoint).toEqual({ x: 143, y: 694 });
    expect(launcherPoint).toEqual({ x: 195, y: 690 });
    expect(brambleBodyPoint.x + 46).toBeLessThan(nextBubblePoint.x - 24);
  });
  it('keeps a bent elbow instead of a straight horizontal lever', () => {
    const shoulder = { x: 163, y: 704 };
    const elbow = brambleArmJoint(shoulder, { x: 195, y: 711 });
    expect(elbow.x).toBeCloseTo(173.24);
    expect(elbow.y).toBe(722);
    expect(elbow.y).toBeGreaterThan(shoulder.y);
    expect(elbow.y).toBeGreaterThan(711);
  });
  it('keeps both limb segments short through aim, release and recovery', () => {
    for (const aim of [-1.25, 0, 1.25]) for (let time = 0; time <= 360; time += 20) {
      const paw = brambleTossPose(aim, time);
      const shoulder = { x: 163, y: 704 - paw.lift };
      const elbow = brambleArmJoint(shoulder, { x: paw.handX, y: paw.handY });
      expect(Math.hypot(elbow.x - shoulder.x, elbow.y - shoulder.y)).toBeLessThan(27);
      expect(Math.hypot(paw.handX - elbow.x, paw.handY - elbow.y)).toBeLessThan(36);
      expect(elbow.y).toBeGreaterThan(700);
      expect(elbow.y).toBeLessThanOrEqual(724);
    }
  });
});
