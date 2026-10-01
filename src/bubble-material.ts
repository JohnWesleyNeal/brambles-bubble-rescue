/** Static soap-glass finish. Paint each 128px texture once, then reuse it as a sprite. */
export const BUBBLE_TEXTURE_SIZE = 128;

export interface BubbleMaterialStyle {
  fill: number;
  edge: number;
}

type RGB = readonly [number, number, number];
const rgb = (color: number): RGB => [(color >>> 16) & 255, (color >>> 8) & 255, color & 255];
const mix = (from: RGB, to: RGB, amount: number): RGB => from.map((channel, index) => Math.round(channel * (1 - amount) + to[index] * amount)) as unknown as RGB;
const css = (color: RGB, alpha = 1): string => `rgba(${color.join(',')},${alpha})`;
const ivory: RGB = [255, 253, 242];

/** Preserve the palette hue while bringing pastel fills into a more readable glass tint. */
export function bubbleMaterialTint(fill: number): RGB {
  const channels = rgb(fill).map(channel => channel / 255);
  const high = Math.max(...channels), low = Math.min(...channels), span = high - low;
  const lightness = (high + low) / 2;
  if (span === 0) return rgb(fill);
  const saturation = span / (1 - Math.abs(2 * lightness - 1));
  const hue = high === channels[0]
    ? ((channels[1] - channels[2]) / span + 6) % 6
    : high === channels[1] ? (channels[2] - channels[0]) / span + 2 : (channels[0] - channels[1]) / span + 4;
  const l = Math.min(.68, Math.max(.61, lightness - .06));
  const s = Math.min(.92, Math.max(.62, saturation + .08));
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const secondary = chroma * (1 - Math.abs(hue % 2 - 1));
  const sector: RGB = hue < 1 ? [chroma, secondary, 0] : hue < 2 ? [secondary, chroma, 0]
    : hue < 3 ? [0, chroma, secondary] : hue < 4 ? [0, secondary, chroma]
      : hue < 5 ? [secondary, 0, chroma] : [chroma, 0, secondary];
  return sector.map(channel => Math.round((channel + l - chroma / 2) * 255)) as unknown as RGB;
}

/**
 * Draw the shell only: the game retains its existing glyph, bee and special-tile overlays.
 * A quiet, translucent middle gives those marks room; the thin rim carries the glass depth.
 * The canonical footprint matches the previous texture (center 64, radius 59).
 */
export function paintBubbleMaterial(context: CanvasRenderingContext2D, style: BubbleMaterialStyle, size = BUBBLE_TEXTURE_SIZE): void {
  const tint = bubbleMaterialTint(style.fill);
  const edge = rgb(style.edge);
  context.save();
  context.setTransform(size / BUBBLE_TEXTURE_SIZE, 0, 0, size / BUBBLE_TEXTURE_SIZE, 0, 0);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.shadowBlur = 0;
  context.shadowOffsetX = context.shadowOffsetY = 0;
  context.setLineDash([]);
  context.clearRect(0, 0, BUBBLE_TEXTURE_SIZE, BUBBLE_TEXTURE_SIZE);

  // Colored transmission, with the darkening held close to the silhouette rather than the glyph.
  const body = context.createRadialGradient(47, 39, 5, 64, 65, 60);
  body.addColorStop(0, css(mix(tint, ivory, .37), .97));
  body.addColorStop(.38, css(mix(tint, ivory, .21), .92));
  body.addColorStop(.66, css(mix(tint, ivory, .08), .93));
  body.addColorStop(.81, css(tint, .98));
  body.addColorStop(.92, css(mix(tint, edge, .34)));
  body.addColorStop(1, css(mix(tint, edge, .64)));
  context.beginPath();
  context.arc(64, 64, 59, 0, Math.PI * 2);
  context.fillStyle = body;
  context.fill();

  // A fine outer contour makes adjoining colors easy to separate without a heavy cartoon outline.
  const contour = context.createLinearGradient(28, 18, 98, 112);
  contour.addColorStop(0, css(mix(edge, ivory, .5), .85));
  contour.addColorStop(.48, css(mix(tint, edge, .48), .86));
  contour.addColorStop(1, css(mix(edge, tint, .17), .9));
  context.strokeStyle = contour;
  context.lineWidth = 1.75;
  context.stroke();

  // The inner membrane and a soft lower caustic imply a hollow shell, not an opaque ball.
  context.beginPath();
  context.arc(64, 64, 54.5, 0, Math.PI * 2);
  context.strokeStyle = css(ivory, .22);
  context.lineWidth = 1.15;
  context.stroke();
  const caustic = context.createRadialGradient(81, 93, 0, 81, 93, 23);
  caustic.addColorStop(0, css(mix(tint, ivory, .77), .25));
  caustic.addColorStop(1, css(ivory, 0));
  context.beginPath();
  context.arc(81, 93, 23, 0, Math.PI * 2);
  context.fillStyle = caustic;
  context.fill();

  context.lineCap = 'round';
  const arc = (radius: number, start: number, end: number, width: number, color: string): void => {
    context.beginPath();
    context.arc(64, 64, radius, start, end);
    context.strokeStyle = color;
    context.lineWidth = width;
    context.stroke();
  };
  // Reflection stays outside the center's 60px readability zone.
  arc(57.9, 3.58, 4.86, 1.25, css(ivory, .8));
  arc(52.4, 3.72, 4.69, 3.5, css(ivory, .88));
  arc(53.2, .37, 1.42, 2.7, css(mix(tint, ivory, .7), .58));
  arc(57.1, .55, 1.73, 1.2, css(ivory, .55));
  arc(55.7, 5.07, 5.59, 1.25, css(ivory, .23));

  context.beginPath();
  context.ellipse(42, 35, 7, 3.1, -.61, 0, Math.PI * 2);
  context.fillStyle = css(ivory, .79);
  context.fill();
  context.beginPath();
  context.ellipse(51, 26, 2.2, 1.3, -.4, 0, Math.PI * 2);
  context.fillStyle = css(ivory, .77);
  context.fill();
  context.restore();
}
