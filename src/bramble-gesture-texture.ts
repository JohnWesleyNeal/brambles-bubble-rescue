import { brambleArtSource, brambleTorsoBand } from './bramble-art';

/** A small, fixed cache. Composite matching painted pixels once, never deform anatomy. */
export const BRAMBLE_GESTURE_STEPS = 16;
export const brambleGestureTextureSize = { width: 212, height: 254 };

export function brambleGestureFrame(blend: number): number {
  return Math.round(Math.max(0, Math.min(1, blend)) * BRAMBLE_GESTURE_STEPS);
}

export function paintBrambleGesture(context: CanvasRenderingContext2D, ready: CanvasImageSource, lift: CanvasImageSource, blend: number): void {
  const { width, height } = brambleGestureTextureSize;
  const top = brambleTorsoBand.top / brambleArtSource.height * height;
  const bottom = brambleTorsoBand.bottom / brambleArtSource.height * height;
  const t = Math.max(0, Math.min(1, blend));
  context.save();
  context.clearRect(0, 0, width, height);
  // Add weighted premultiplied pixels on a transparent cache: overlapping painted
  // shirt pixels remain opaque, unlike two source-over alpha sprites on the game.
  context.globalCompositeOperation = 'lighter';
  context.globalAlpha = 1 - t;
  context.drawImage(ready, 0, 0, width, height);
  context.globalAlpha = t;
  context.drawImage(lift, 0, 0, width, height);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  // The accepted head, eyes, stance and feet are the exact original ready art.
  context.clearRect(0, 0, width, top);
  context.clearRect(0, bottom, width, height - bottom);
  context.beginPath();
  context.rect(0, 0, width, top);
  context.rect(0, bottom, width, height - bottom);
  context.clip();
  context.drawImage(ready, 0, 0, width, height);
  context.restore();
}
