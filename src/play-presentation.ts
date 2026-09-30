import { boosters, boosterById, type BoosterId } from './boosters';
/** Presentation only: the shot origin and every board coordinate stay unchanged. */
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

/** Visual paw motion only: the real launch point remains (195, 690). */
export function brambleTossPose(angle: number, elapsedMs?: number, reducedMotion = false): { handX: number; handY: number; lean: number; lift: number } {
  if (reducedMotion) return { handX: 195, handY: 711, lean: 0, lift: 0 };
  const aim = Math.max(-1.25, Math.min(1.25, angle));
  const release = elapsedMs === undefined ? 0 : Math.sin(Math.PI * Math.max(0, Math.min(1, elapsedMs / 360)));
  return { handX: 195 - Math.sin(aim) * 10 + Math.sin(aim) * release * 6,
    handY: 711 - Math.abs(Math.sin(aim)) * 4 - release * 26,
    lean: aim * .7 + release * 3.5, lift: release * 2.5 };
}
