/** Painted character presentation only. The board and launch physics stay unchanged. */
export const brambleArt = {
  ready: 'characters/bramble-ready.webp',
  lift: 'characters/bramble-lift.webp',
  toss: 'characters/bramble-toss.webp',
  recover: 'characters/bramble-recover.webp'
} as const;
export type BrambleArtFrame = keyof typeof brambleArt;
export const brambleArtSource = { width: 1145, height: 1374 };
export const brambleArtCup = { x: 740, y: 675 };
export const brambleArtSize = { width: 126 * brambleArtSource.width / brambleArtSource.height, height: 126 };
export const brambleArtOrigin = { x: brambleArtCup.x / brambleArtSource.width, y: brambleArtCup.y / brambleArtSource.height };
export const brambleArtGround = { x: 187, y: 750 };
/** Foreground mattes show the SAME untouched painting over the real colored bubble. */
export const bramblePawMattes = [
  [[508, 725], [521, 699], [551, 683], [597, 674], [641, 679], [672, 697], [680, 712], [708, 726], [718, 747], [710, 776], [693, 799], [660, 816], [610, 825], [559, 812], [525, 791], [509, 761]],
  [[808, 707], [821, 690], [854, 686], [883, 698], [905, 721], [911, 751], [901, 780], [879, 805], [852, 821], [821, 815], [795, 798], [779, 779], [774, 758], [783, 735], [797, 719]]
] as const;
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
export const brambleGesture = { releaseMs: 85, settleMs: 360, receiveMs: 160, readyMs: 520 } as const;
/** Keep the approved face and grounded stance still while the painted forearms change. */
export const brambleTorsoBand = { top: 540, bottom: 1010 } as const;
export function brambleArtPose(elapsedMs?: number, reducedMotion = false, bubbleLoaded = true, aiming: boolean | number = false, releaseAnticipation = 0): {
  weights: Record<BrambleArtFrame, number>; rise: number; lean: number; scaleX: number; scaleY: number; bubbleAlpha: number;
} {
  const steady = { weights: { ready: 1, lift: 0, toss: 0, recover: 0 }, rise: 0, lean: 0, scaleX: 1, scaleY: 1, bubbleAlpha: 1 };
  if (reducedMotion) return steady;
  const amount = bubbleLoaded ? Math.max(0, Math.min(1, Number(aiming))) : 0;
  if (elapsedMs === undefined) return { ...steady,
    weights: bubbleLoaded ? steady.weights : { ready: .82, lift: .18, toss: 0, recover: 0 },
    rise: -amount * .8, lean: -amount * .25, scaleX: 1 + amount * .004, scaleY: 1 - amount * .012 };
  const time = Math.max(0, elapsedMs);
  const weights: Record<BrambleArtFrame, number> = { ready: 0, lift: 0, toss: 0, recover: 0 };
  // A small palm-opening and natural settling gesture keeps the short paws intact.
  // The larger old toss/recover paintings remain available for non-playing artwork.
  const open = time < 85 ? smooth(time / 85) : time < 145 ? 1 : 1 - .82 * smooth((time - 145) / 215);
  const receive = bubbleLoaded ? smooth((time - brambleGesture.settleMs) / brambleGesture.receiveMs) : 0;
  weights.lift = open * (1 - receive);
  weights.ready = 1 - weights.lift;
  const anticipation = Math.max(0, Math.min(1, releaseAnticipation)) * (1 - smooth(time / 85));
  const lift = Math.sin(Math.PI * Math.min(1, time / brambleGesture.settleMs)) * 1.4;
  return { weights, rise: lift - anticipation * .8, lean: -lift * .2 - anticipation * .25,
    scaleX: 1 + anticipation * .004, scaleY: 1 - anticipation * .012,
    bubbleAlpha: bubbleLoaded ? smooth((time - brambleGesture.settleMs) / brambleGesture.receiveMs) : 0 };
}
export function brambleArtPoint(point: { x: number; y: number }, cup: { x: number; y: number }, width: number, height: number, angle: number): { x: number; y: number } {
  const radians = angle * Math.PI / 180;
  const x = (point.x / brambleArtSource.width - brambleArtOrigin.x) * width;
  const y = (point.y / brambleArtSource.height - brambleArtOrigin.y) * height;
  return { x: cup.x + x * Math.cos(radians) - y * Math.sin(radians), y: cup.y + x * Math.sin(radians) + y * Math.cos(radians) };
}
