import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { GameEngine } from '../src/engine';
import { levels } from '../src/levels';
import { shotPathIndex, shotPathPoint } from '../src/shot-presentation';
import { brambleArtPose, brambleGesture } from '../src/bramble-art';

const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const start = main.indexOf('  private fire(): void {');
const end = main.indexOf('  private destroyPaintedBramble(): void {', start);
const production = stripTypeScriptTypes(`class Renderer { ${main.slice(start, end)} }`);

describe('production release-to-contact integration', () => {
  for (const [name, level, angle] of [
    ['straight', levels[1], 0],
    ['bank', levels[5], -1.2],
    ['near launcher', { ...levels[0], rows: Array.from({ length: 15 }, (_, row) => row % 2 ? '...R....' : '....R....'), specials: [] }, 0]
  ] as const) it(`applies a ${name} shot only at its visible exact impact`, () => {
    const motion = { matches: false };
    const Renderer = new Function('shotPathIndex', 'shotPathPoint', 'overlay', 'reducedMotion', 'playSound', 'notice', 'palette',
      `${production}; return Renderer;`)(shotPathIndex, shotPathPoint, { classList: { contains: () => true } }, motion, () => {}, () => {}, {});
    const renderer = new Renderer();
    const engine = new GameEngine({ ...level, rows: [...level.rows], specials: [...level.specials] });
    if (name === 'near launcher') engine.currentColor = 'R';
    const trace = engine.preview(angle), before = engine.shots;
    let visible = { x: 195, y: 690 }, landed = false;
    const sprite = { setDepth: () => sprite, setPosition: (x: number, y: number) => { visible = { x, y }; } };
    Object.assign(renderer, {
      engine, aimAngle: angle, brambleAimStrength: .6,
      shooterBubble: { setVisible: () => {} }, aimGraphics: { clear: () => {} },
      makeShotBubble: () => sprite, animateBramble: () => {},
      land: () => { expect(visible).toEqual(trace.path.at(-1)); engine.fire(angle); landed = true; renderer.flying = undefined; }
    });
    renderer.fire();
    expect(engine.shots).toBe(before);
    expect(renderer.flying.trace).toEqual(trace);
    for (let time = 0; time < 1600 && !landed; time += 1000 / 60) {
      renderer.update(time, 1000 / 60);
      if (!landed) expect(engine.shots).toBe(before);
    }
    expect(landed).toBe(true);
    expect(engine.shots).toBe(before - 1);
  });

  it('keeps receive invisible only while input is still busy, then reveals the ready bubble', () => {
    const land = main.slice(main.indexOf('  private land(): void {'), main.indexOf('  private showShotFeedback('));
    expect(land).toContain('this.resolving = true');
    expect(land).toContain('Math.max(this.animateCleared(result, before), this.animateFlight(result), receiveTime)');
    expect(land).toContain('this.shooterBubble?.setAlpha(1)');
    for (const landedAt of [35, 120, 450, 750]) {
      const clockAtLand = Math.min(landedAt, brambleGesture.settleMs);
      const receiveRemaining = brambleGesture.readyMs - clockAtLand;
      expect(brambleArtPose(clockAtLand + receiveRemaining, false, true).bubbleAlpha).toBe(1);
      expect(brambleArtPose(clockAtLand + receiveRemaining, false, true).weights.ready).toBe(1);
    }
  });
});
