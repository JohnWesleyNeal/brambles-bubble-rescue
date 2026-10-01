import { describe, expect, it } from 'vitest';
import { brambleArt, brambleArtCup, brambleArtSource, brambleArtSize, brambleArtOrigin, brambleArtPose, brambleArtPoint, bramblePawMattes } from './bramble-art';
import { launcherPoint } from './aim-controls';

describe('painted Bramble presentation', () => {
  it('loads three full-body painted poses as small cacheable assets', () => {
    expect(Object.keys(brambleArt)).toEqual(['ready', 'toss', 'recover']);
    for (const path of Object.values(brambleArt)) expect(path).toMatch(/^characters\/bramble-(ready|toss|recover)\.webp$/);
  });
  it('anchors the empty painted cup to the unchanged real launch point', () => {
    expect(launcherPoint).toEqual({ x: 195, y: 690 });
    expect(brambleArtPoint(brambleArtCup, launcherPoint, brambleArtSize.width, brambleArtSize.height, 0)).toEqual(launcherPoint);
    expect(brambleArtSize.height).toBe(126);
    expect(brambleArtOrigin).toEqual({ x: 740 / 1145, y: 675 / 1374 });
  });
  it('keeps the registration exact through every allowed squash and lean', () => {
    for (const angle of [-2, 0, 2]) for (const scale of [.97, 1, 1.03]) {
      const point = brambleArtPoint(brambleArtCup, launcherPoint, brambleArtSize.width * scale, brambleArtSize.height * scale, angle);
      expect(point.x).toBeCloseTo(195); expect(point.y).toBeCloseTo(690);
    }
  });
  it('uses original painted paw pixels for foreground occlusion, never separate drawn limbs', () => {
    expect(bramblePawMattes).toHaveLength(2);
    for (const matte of bramblePawMattes) for (const [x, y] of matte) {
      expect(x).toBeGreaterThan(450); expect(x).toBeLessThan(brambleArtSource.width);
      expect(y).toBeGreaterThan(650); expect(y).toBeLessThan(850);
      const point = brambleArtPoint({ x, y }, launcherPoint, brambleArtSize.width, brambleArtSize.height, 0);
      expect(point.y).toBeGreaterThan(687); expect(point.y).toBeLessThan(707);
    }
  });
  it('keeps the face above the loaded bubble and the feet above the instructions', () => {
    const smile = brambleArtPoint({ x: 700, y: 448 }, launcherPoint, brambleArtSize.width, brambleArtSize.height, 0);
    const feet = brambleArtPoint({ x: 640, y: 1310 }, launcherPoint, brambleArtSize.width, brambleArtSize.height, 0);
    expect(smile.y).toBeLessThan(690 - 17);
    expect(feet.y).toBeLessThan(752);
  });
  it('starts ready, lifts in a cohesive toss, settles, then receives the next bubble', () => {
    expect(brambleArtPose().weights).toEqual({ ready: 1, toss: 0, recover: 0 });
    expect(brambleArtPose(110, false, false).weights.toss).toBe(1);
    expect(brambleArtPose(320, false, false).weights.recover).toBe(1);
    expect(brambleArtPose(520, false, true).weights.ready).toBe(1);
  });
  it('waits in the relaxed pose when the bubble is still away', () => {
    for (const time of [360, 440, 520, 2000]) expect(brambleArtPose(time, false, false).weights).toEqual({ ready: 0, toss: 0, recover: 1 });
  });
  it('keeps every crossfade bounded, normalized and quiet', () => {
    for (const loaded of [false, true]) for (let time = 0; time <= 900; time += 5) {
      const pose = brambleArtPose(time, false, loaded);
      for (const alpha of Object.values(pose.weights)) { expect(alpha).toBeGreaterThanOrEqual(0); expect(alpha).toBeLessThanOrEqual(1); }
      expect(Object.values(pose.weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
      expect(pose.rise).toBeGreaterThanOrEqual(0); expect(pose.rise).toBeLessThanOrEqual(2);
    }
  });
  it('anticipates while aiming without moving the actual bubble', () => {
    const pose = brambleArtPose(undefined, false, true, true);
    expect(pose.weights.ready).toBe(1); expect(pose.rise).toBe(-1.2); expect(pose.scaleY).toBe(.975);
    expect(launcherPoint).toEqual({ x: 195, y: 690 });
  });
  it('suppresses pose changes and decoration with reduced motion', () => {
    const steady = brambleArtPose(undefined, true);
    for (const time of [0, 110, 180, 320, 440, 900]) for (const loaded of [false, true]) expect(brambleArtPose(time, true, loaded, true)).toEqual(steady);
  });
});
