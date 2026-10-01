import { boosters, boosterById, type BoosterId } from './boosters';
/** Presentation only: the shot origin and every board coordinate stay unchanged. */
export const playHeight = 892;
export const brambleBodyPoint = { x: 195, y: 700 };
export const brambleDisplaySize = { width: 138, height: 144 };
export const bramblePawScale = 1.5;
export const brambleGroundPoint = { x: 195, y: 773 };
export const nextBubblePoint = { x: 314, y: 706 };
export function giftReadout(inventory: Record<BoosterId, number>, unlocked: number, allowed: boolean, armed?: BoosterId): { text: string; label: string; equipped: boolean } {
  if (!allowed) return { text: 'Off', label: 'Open gifts, packed away for this challenge', equipped: false };
  if (armed) return { text: 'Ready', label: `Open gifts, ${boosterById[armed].name} equipped`, equipped: true };
  const count = boosters.filter(gift => gift.unlockLevel <= unlocked).reduce((total, gift) => total + inventory[gift.id], 0);
  return { text: count ? String(count) : '+', label: `Open gifts, ${count} available. Free refills inside`, equipped: false };
}

export function brambleMotionAllowed(state: { aiming: boolean; menuOpen: boolean; pageHidden: boolean; reducedMotion: boolean }): boolean {
  return !state.aiming && !state.menuOpen && !state.pageHidden && !state.reducedMotion;
}

export function brambleIdlePose(elapsedMs: number, strength = 1): { rise: number; angle: number; scaleX: number; scaleY: number; blink: boolean } {
  const amount = Math.max(0, Math.min(1, strength));
  if (!amount) return { rise: 0, angle: 0, scaleX: 1, scaleY: 1, blink: false };
  const breath = Math.sin(elapsedMs / 750) * amount;
  const phase = elapsedMs % 5100;
  return { rise: Math.sin(elapsedMs / 900) * 2 * amount, angle: Math.sin(elapsedMs / 1250) * 2.2 * amount,
    scaleX: 1 - breath * .012, scaleY: 1 + breath * .03, blink: amount > .95 && phase > 4700 && phase < 4840 };
}

/** Two matched, short forepaws rotate at fixed shoulders without ever stretching. */
export const bramblePawLength = 24;
export const brambleShoulderPoints = [{ x: 72, y: 158 }, { x: 148, y: 158 }] as const;
// Local cubic silhouettes shared by the live renderer and the pose-review script.
// Each tuple is endpoint, first control point, second control point.
export const bramblePawOutline = {
  start: [-3, -4] as const,
  curves: [[13, -5, 1, -6, 7, -6], [23, 0, 20, -6, 23, -4],
    [13, 5, 23, 4, 20, 6], [-3, 4, 7, 6, 1, 6], [-3, -4, -6, 3, -6, -3]] as const
};
export const brambleSleeveOutline = {
  start: [-5, -6] as const,
  curves: [[5, -6, -2, -8, 3, -8], [7, 5, 8, -4, 9, 3],
    [-5, 6, 3, 8, -3, 8], [-5, -6, -7, 3, -7, -3]] as const
};
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
/** Presentation only: the bubble still leaves the real launch point at (195, 690). */
export function brambleTossPose(angle: number, elapsedMs?: number, reducedMotion = false, bubbleLoaded = true): { pawAngle: number; lean: number; lift: number; shiftX: number; scaleY: number } {
  const aim = reducedMotion ? 0 : Math.max(-1.25, Math.min(1.25, angle));
  const readyAngle = -90, restingAngle = 65;
  if (reducedMotion || elapsedMs === undefined) return { pawAngle: reducedMotion || bubbleLoaded ? readyAngle : restingAngle, lean: aim * .4 || 0, lift: 0, shiftX: aim * .5, scaleY: 1 };
  const time = Math.max(0, elapsedMs);
  const anticipation = time < 70 ? Math.sin(Math.PI * time / 70) : 0;
  const release = time < 70 ? 0 : time < 160 ? smooth((time - 70) / 90) : 1 - smooth((time - 200) / 160);
  const pawAngle = time <= 200 ? readyAngle + anticipation * 3 - release * 5
    : time < 360 ? -95 + (restingAngle + 95) * smooth((time - 200) / 160)
    : bubbleLoaded ? restingAngle + (readyAngle - restingAngle) * smooth((time - 360) / 160) : restingAngle;
  return { pawAngle,
    lean: aim * .4,
    lift: -anticipation * 1.6 + release * 3,
    shiftX: aim * .5, scaleY: 1 - anticipation * .04 };
}

/** The same body-space shoulder is used for every pose, including breathing and lean. */
export function brambleShoulder(center: { x: number; y: number }, width: number, height: number, angle: number, side: 0 | 1): { x: number; y: number } {
  const radians = angle * Math.PI / 180;
  const dx = (brambleShoulderPoints[side].x - 110) * width / 220;
  const dy = (brambleShoulderPoints[side].y - 115) * height / 230;
  return { x: center.x + dx * Math.cos(radians) - dy * Math.sin(radians),
    y: center.y + dx * Math.sin(radians) + dy * Math.cos(radians) };
}
