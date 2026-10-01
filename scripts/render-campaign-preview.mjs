/** Offline composition QA. Production tile drawing + real initial engine state.
 * This is a rendered preview, never a browser screenshot or playtest.
 * Orb textures and HTML HUD controls are SVG approximations; painted assets,
 * tile decorations, board coordinates and chapter palettes use production data.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { rolldown } from 'rolldown';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const output = process.argv[2] ?? '/tmp/bramble-campaign-previews';
await fs.mkdir(output, { recursive: true });
const entry = path.join(output, 'model.ts');
await fs.writeFile(entry, `export { GameEngine } from ${JSON.stringify(root + '/src/engine.ts')};\nexport { levels } from ${JSON.stringify(root + '/src/levels.ts')};\nexport { chapterTheme } from ${JSON.stringify(root + '/src/campaign-presentation.ts')};\nexport * from ${JSON.stringify(root + '/src/bramble-art.ts')};\n`);
const bundle = await rolldown({ input: entry, platform: 'node' });
const model = path.join(output, 'model.mjs');
await bundle.write({ file: model, format: 'esm' }); await bundle.close();
const { GameEngine, levels, chapterTheme, brambleArt, brambleArtSize, brambleArtOrigin, brambleArtGround, brambleArtPoint, bramblePawMattes } = await import(model);
const main = await fs.readFile(path.join(root, 'src/main.ts'), 'utf8');
const method = main.slice(main.indexOf('  private makeBubble('), main.indexOf('  private drawBoard('));
const paletteSource = main.slice(main.indexOf('const palette:'), main.indexOf('const normalBubble'));
class Vector { constructor(x, y) { this.x = x; this.y = y; } clone() { return new Vector(this.x, this.y); } scale(n) { this.x *= n; this.y *= n; return this; } }
const { Renderer, palette } = new Function('BUBBLE_RADIUS', 'Phaser', `${stripTypeScriptTypes(`${paletteSource}\nclass Renderer { ${method} }`)};return { Renderer, palette };`)(17, { Math: { Vector2: Vector } });
const hex = n => `#${n.toString(16).padStart(6, '0')}`;
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const assets = {};
for (const [key, file] of Object.entries({ bee: 'bee.png', ready: brambleArt.ready })) assets[key] = 'data:image/png;base64,' + (await sharp(path.join(root, 'public', file)).png().toBuffer()).toString('base64');
// The same minimal drawing surface used by production-method tests.
function object(type, args) {
  const item = { type, args, children: [], angle: 0, rotation: 0, origin: [.5, .5], commands: [] };
  const proxy = new Proxy(item, { get(target, method) {
    if (method in target) return target[method];
    if (!['add', 'setOrigin', 'setDisplaySize', 'setStrokeStyle', 'setAngle', 'setRotation', 'lineStyle', 'beginPath', 'arc', 'moveTo', 'lineTo', 'strokePath'].includes(method)) return undefined;
    return (...values) => {
      if (method === 'add') item.children.push(...(Array.isArray(values[0]) ? values[0] : [values[0]]));
      else if (method === 'setOrigin') item.origin = [values[0], values[1] ?? values[0]];
      else if (method === 'setDisplaySize') item.size = values;
      else if (method === 'setStrokeStyle') item.stroke = { width: values[0], color: values[1], alpha: values[2] ?? 1 };
      else if (method === 'setAngle') item.angle = values[0];
      else if (method === 'setRotation') item.rotation = values[0] * 180 / Math.PI;
      else if (method === 'lineStyle') item.pen = { width: values[0], color: values[1], alpha: values[2] ?? 1 };
      else if (method === 'beginPath') item.current = [];
      else if (['arc', 'moveTo', 'lineTo'].includes(method)) item.current.push([method, values]);
      else if (method === 'strokePath') item.commands.push({ pen: item.pen, path: item.current });
      else throw new Error(`Unsupported draw operation ${type}.${String(method)}`);
      return proxy;
    };
  } });
  return proxy;
}
const renderer = new Renderer();
renderer.add = new Proxy({}, { get: (_, type) => (...args) => object(type, args) });
function svgObject(item) {
  const [x, y, ...a] = item.args;
  const stroke = item.stroke ? ` stroke="${hex(item.stroke.color)}" stroke-width="${item.stroke.width}" stroke-opacity="${item.stroke.alpha}"` : '';
  let shape = '';
  if (item.type === 'container') shape = item.children.map(svgObject).join('');
  else if (item.type === 'image') {
    const [w, h] = item.size;
    if (a[0].startsWith('orb-')) shape = `<circle r="${w / 2 * .922}" fill="url(#${a[0]})" stroke="${hex(palette[a[0].slice(4)].edge)}" stroke-width="1"/><circle r="${w / 2 * .84}" fill="none" stroke="#ffffff66" stroke-width=".6"/><path d="M${-w * .34} ${-h * .16}Q${-w * .22} ${-h * .4} ${w * .04} ${-h * .36}" fill="none" stroke="#ffffffe6" stroke-width="1.7" stroke-linecap="round"/>`;
    else shape = `<image x="${-w * item.origin[0]}" y="${-h * item.origin[1]}" width="${w}" height="${h}" href="${assets[a[0]]}"/>`;
  } else if (item.type === 'ellipse') shape = `<ellipse rx="${a[0] / 2}" ry="${a[1] / 2}" fill="${hex(a[2])}" fill-opacity="${a[3] ?? 1}"${stroke}/>`;
  else if (item.type === 'circle') shape = `<circle r="${a[0]}" fill="${a[1] === undefined ? 'none' : hex(a[1])}" fill-opacity="${a[2] ?? 1}"${stroke}/>`;
  else if (item.type === 'polygon') shape = `<polygon points="${a[0].map(p => p.x + ',' + p.y).join(' ')}" fill="${hex(a[1])}"${stroke}/>`;
  else if (item.type === 'triangle') shape = `<polygon points="${a.slice(0, 6).map((v, i) => i % 2 ? v + ' ' : v + ',').join('')}" fill="${hex(a[6])}" fill-opacity="${a[7] ?? 1}"${stroke}/>`;
  else if (item.type === 'star') { const [points, inner, outer, color] = a; shape = `<polygon points="${Array.from({ length: points * 2 }, (_, i) => { const t = i * Math.PI / points - Math.PI / 2, r = i % 2 ? inner : outer; return `${Math.cos(t) * r},${Math.sin(t) * r}`; }).join(' ')}" fill="${hex(color)}"${stroke}/>`; }
  else if (item.type === 'text') { const style = a[1]; shape = `<text text-anchor="middle" dominant-baseline="central" font-family="${esc(style.fontFamily ?? 'sans-serif')}" font-size="${style.fontSize}" font-weight="${style.fontStyle === 'bold' ? 'bold' : 'normal'}" fill="${style.color}"${style.stroke ? ` stroke="${style.stroke}" stroke-width="${style.strokeThickness}" paint-order="stroke"` : ''}>${esc(a[0])}</text>`; }
  else if (item.type === 'graphics') {
    shape = item.commands.map(({ pen, path }) => {
      const d = path.map(([op, values]) => {
        if (op === 'moveTo') return `M${values[0]} ${values[1]}`;
        if (op === 'lineTo') return `L${values[0]} ${values[1]}`;
        const [cx, cy, r, start, end] = values;
        return `M${cx + Math.cos(start) * r} ${cy + Math.sin(start) * r}A${r} ${r} 0 ${end - start > Math.PI ? 1 : 0} 1 ${cx + Math.cos(end) * r} ${cy + Math.sin(end) * r}`;
      }).join(' ');
      return `<path d="${d}" fill="none" stroke="${hex(pen.color)}" stroke-width="${pen.width}" stroke-opacity="${pen.alpha}"/>`;
    }).join('');
  } else throw new Error(`Unsupported object ${item.type}`);
  const position = item.type === 'graphics' ? [0, 0] : [x, y];
  return `<g transform="translate(${position[0]} ${position[1]}) rotate(${item.angle + item.rotation})">${shape}</g>`;
}
const orb = (x, y, bubble, r = 17) => svgObject(renderer.makeBubble(x, y, bubble, r));
const gradients = Object.entries(palette).map(([color, style]) => `<radialGradient id="orb-${color}" cx="35%" cy="28%" r="70%"><stop stop-color="#fff8e3"/><stop offset=".45" stop-color="${hex(style.fill)}"/><stop offset="1" stop-color="${hex(style.edge)}"/></radialGradient>`).join('');
const scenery = (await fs.readFile(path.join(root, 'public/scene.svg'), 'utf8')).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
for (const id of [31, 41]) for (const [vw, vh, size] of [[400, 606, 'phone'], [900, 1000, 'desktop']]) {
  const engine = new GameEngine(levels[id - 1]); const theme = chapterTheme(id - 1);
  const s = Math.min(vw / 390, vh / 892, 460 / 390), pw = 390 * s, ph = 892 * s, ox = (vw - pw) / 2, oy = (vh - ph) / 2, compact = pw <= 330;
  const font = n => n / s;
  const text = (x, y, value, px, color = '#315340', weight = 'bold') => `<text x="${x}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${px}" fill="${color}" font-weight="${weight}">${esc(value)}</text>`;
  const round = (x, y, w, h, r, fill, stroke = '#ffffffaa') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}"><defs>${gradients}<clipPath id="game"><rect width="390" height="892" rx="14"/></clipPath></defs><rect width="100%" height="100%" fill="#193b32"/><g transform="translate(${ox} ${oy}) scale(${s})" clip-path="url(#game)"><g transform="translate(-11 0) scale(${892 / 844})">${scenery}</g>`;
  svg += round(19, 164, 352, 495, 22, '#234b3d22', 'none') + round(19, 159, 352, 494, 22, hex(theme.fill), '#fff9e5') + round(24, 164, 342, 484, 18, 'none', hex(theme.line) + '3b');
  svg += text(84, 644, `${theme.symbol}  ${theme.name}  ${theme.symbol}`, 8, theme.ink);
  svg += round(19, 668, 352, 210, 23, '#244f402e', 'none') + round(19, 664, 352, 210, 23, '#fff6dff7', '#ffffffcc');
  for (const cell of engine.board.entries()) svg += orb(51 + cell.col * 36 + (cell.row % 2 ? 18 : 0), 188 + cell.row * 31.18, cell.bubble);
  svg += `<ellipse cx="${brambleArtGround.x}" cy="${brambleArtGround.y}" rx="36" ry="4" fill="#7a6845" opacity=".11"/>`;
  const { width: w, height: h } = brambleArtSize, cup = { x: 195, y: 690 };
  const painted = `<image x="${195 - brambleArtOrigin.x * w}" y="${690 - brambleArtOrigin.y * h}" width="${w}" height="${h}" href="${assets.ready}"/>`;
  svg += painted + orb(195, 690, { kind: 'normal', color: engine.currentColor, bee: false });
  svg += `<defs><clipPath id="paws">${bramblePawMattes.map(matte => `<polygon points="${matte.map(([x, y]) => { const p = brambleArtPoint({ x, y }, cup, w, h, 0); return `${p.x},${p.y}`; }).join(' ')}"/>`).join('')}</clipPath></defs><g clip-path="url(#paws)">${painted}</g>`;
  svg += text(314, 680, 'NEXT', 9, '#71826a') + '<circle cx="314" cy="707" r="24" fill="#e6e9cfcc" stroke="#b6c4a5"/>' + orb(314, 706, { kind: 'normal', color: engine.nextColor, bee: false }, 18);
  const top = (compact ? 1.8 : 3.9) * 3.9, bh = font(44);
  svg += round(15.6, top, bh, bh, font(15), '#285342') + round(374.4 - bh, top, bh, bh, font(15), '#285342');
  svg += text(15.6 + bh / 2, top + bh * .65, 'Ⅱ', font(23), '#fff5d8') + text(374.4 - bh / 2, top + bh * .65, '⚑', font(23), '#fff5d8');
  svg += text(195, top + font(9), `LEVEL ${id}`, font(9), '#5b745d') + text(195, top + font(29), engine.level.name, font(compact ? 13 : 16), '#274c3a');
  const sy = (compact ? 19.65 : 20.13) * 3.9, sh = font(compact ? 34 : 45), sx = 58.5, gap = font(8), sw = (273 - gap) / 2;
  for (const [i, count, caption] of [[0, `0/${engine.totalBees}`, 'friends freed'], [1, engine.shots, 'bubbles left']]) {
    const x = sx + i * (sw + gap); svg += round(x, sy, sw, sh, font(14), '#fff9e7f2', '#fffdf1') + text(x + sw * .55, sy + font(compact ? 15 : 20), count, font(compact ? 14 : 16)) + text(x + sw * .57, sy + font(compact ? 27 : 35), caption, font(compact ? 8 : 9), '#6a7b60');
  }
  svg += text(195, (compact ? 33.59 : 33.54) * 3.9 + font(8), `★ ★ ★ in ${engine.level.par} shots · taken 0`, font(compact ? 9 : 10), '#57714f');
  const chip = id === 31 ? '◒ Two-tone' : '❋ Echo', cy = (compact ? 38.11 : 37.87) * 3.9, ch = font(compact ? 14 : 20), cw = font(70);
  svg += round(195 - cw / 2, cy, cw, ch, font(12), '#edf1dce8', '#bccbac') + text(195, cy + ch * .72, chip, font(compact ? 8 : 9), '#61724f');
  svg += round(27.3, 171.3 * 3.9, Math.max(62.4, font(44)), font(44), font(12), '#f1dce2', '#d8b6c3') + text(60, 171.3 * 3.9 + font(18), '✿', font(20), '#987082') + text(60, 171.3 * 3.9 + font(35), '0/12', font(8), '#987082');
  const by = 892 * .979 - font(44), gx = 27.3, total = 335.4, bg = font(7), unit = (total - 2 * bg) / 3.22;
  svg += text(195, by - font(11), 'Drag to aim · release to pop · pull back to cancel', font(compact ? 9.5 : 10), '#637558');
  for (const [i, label, ratio] of [[0, '? Hint', 1], [1, '✦ Gifts', 1.22], [2, '↔ Swap', 1]]) {
    const x = gx + (i === 0 ? 0 : i === 1 ? unit + bg : unit * 2.22 + 2 * bg), bw = unit * ratio;
    svg += round(x, by, bw, font(44), font(14), i === 1 ? '#f3dfad' : '#e6ebd3', i === 1 ? '#d7bd86' : '#b6c4a6') + text(x + bw / 2, by + font(26), label, font(11), i === 1 ? '#86613d' : '#46634b');
  }
  svg += '</g></svg>';
  const name = `level-${id}-${size}`; await fs.writeFile(path.join(output, name + '.svg'), svg); await sharp(Buffer.from(svg)).png().toFile(path.join(output, name + '.png'));
}
console.log(`Rendered Level 31/41 production tile previews in ${output}`);
