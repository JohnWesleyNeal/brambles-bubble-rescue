import { boosters, boosterById, type BoosterId } from './boosters';
/** Presentation only: the shot origin and every board coordinate stay unchanged. */
export const nextBubblePoint = { x: 314, y: 706 };
export function giftReadout(inventory: Record<BoosterId, number>, unlocked: number, allowed: boolean, armed?: BoosterId): { text: string; label: string; equipped: boolean } {
  if (!allowed) return { text: 'Off', label: 'Open gifts, packed away for this challenge', equipped: false };
  if (armed) return { text: 'Ready', label: `Open gifts, ${boosterById[armed].name} equipped`, equipped: true };
  const count = boosters.filter(gift => gift.unlockLevel <= unlocked).reduce((total, gift) => total + inventory[gift.id], 0);
  return { text: count ? String(count) : '+', label: `Open gifts, ${count} available. Free refills inside`, equipped: false };
}
