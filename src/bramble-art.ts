/** Painted character presentation only. The board and launch physics stay unchanged. */
export const brambleArt = {
  ready: 'characters/bramble-ready.webp',
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
export function brambleArtPose(elapsedMs?: number, reducedMotion = false, bubbleLoaded = true, aiming = false): {
  weights: Record<BrambleArtFrame, number>; rise: number; lean: number; scaleX: number; scaleY: number;
} {
  const steady = { weights: { ready: 1, toss: 0, recover: 0 }, rise: 0, lean: 0, scaleX: 1, scaleY: 1 };
  if (reducedMotion) return steady;
  if (elapsedMs === undefined) {
    const amount = aiming && bubbleLoaded ? 1 : 0;
    return { weights: bubbleLoaded ? steady.weights : { ready: 0, toss: 0, recover: 1 },
      rise: -amount * 1.2, lean: -amount * .6, scaleX: 1 + amount * .01, scaleY: 1 - amount * .025 };
  }
  const time = Math.max(0, elapsedMs);
  const toss = smooth(time / 70);
  const recovery = smooth((time - 170) / 140);
  const reload = bubbleLoaded ? smooth((time - 360) / 160) : 0;
  const lift = Math.sin(Math.PI * Math.max(0, Math.min(1, time / 360))) * 2;
  return { weights: { ready: (1 - toss) + reload, toss: toss * (1 - recovery), recover: recovery - reload },
    rise: lift, lean: -lift * .35, scaleX: 1, scaleY: 1 };
}
export function brambleArtPoint(point: { x: number; y: number }, cup: { x: number; y: number }, width: number, height: number, angle: number): { x: number; y: number } {
  const radians = angle * Math.PI / 180;
  const x = (point.x / brambleArtSource.width - brambleArtOrigin.x) * width;
  const y = (point.y / brambleArtSource.height - brambleArtOrigin.y) * height;
  return { x: cup.x + x * Math.cos(radians) - y * Math.sin(radians), y: cup.y + x * Math.sin(radians) + y * Math.cos(radians) };
}
