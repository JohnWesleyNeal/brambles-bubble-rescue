import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { BubbleBoard, type Bubble } from '../src/board';
import { GameEngine } from '../src/engine';
import { chapters, levels } from '../src/levels';
import { campaignRoutesV6 } from '../src/campaign-routes-v6';
import { chapterChoices, chapterIndexForLevel, chapterTheme, chapterThemes, colorNames, inspectedBubbleDetail, isChapterEnd, previewShotOutcome, transformationFeedback, transformedTileKinds } from '../src/campaign-presentation';

const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

describe('hundred-meadow presentation', () => {
  it('gives all ten chapters a coherent, safe scenery palette', () => {
    expect(chapterThemes).toHaveLength(chapters.length);
    for (const [index, level] of levels.entries()) {
      const chapter = chapters[chapterIndexForLevel(index)];
      expect(level.id).toBeGreaterThanOrEqual(chapter.first);
      expect(level.id).toBeLessThanOrEqual(chapter.last);
      expect(chapterTheme(index)).toMatchObject({ name: chapter.name.toUpperCase(), fill: expect.any(Number), line: expect.any(Number), ink: expect.any(String), symbol: expect.any(String) });
    }
    for (const invalid of [-1, 100, NaN, Infinity]) expect(chapterTheme(invalid)).toEqual(chapterTheme(0));
  });
  it('marks chapter locks, current selection, and completion independently', () => {
    const stars = Array.from({ length: 100 }, (_, i) => i < 30 ? 3 : 0);
    const choices = chapterChoices(3, 31, stars);
    expect(choices).toHaveLength(10);
    expect(choices.filter(choice => choice.unlocked)).toHaveLength(4);
    expect(choices.filter(choice => choice.selected).map(choice => choice.first)).toEqual([31]);
    expect(choices.map(choice => choice.complete)).toEqual([10, 10, 10, 0, 0, 0, 0, 0, 0, 0]);
    expect(chapterChoices(8, 31, stars)[8]).toMatchObject({ selected: true, unlocked: false, first: 81, last: 90 });
    expect(chapterChoices(999, 100, stars)[9].selected).toBe(true);
    expect(chapterChoices(NaN, 1, [])[0].selected).toBe(true);
  });
  it('celebrates every chapter boundary, keeping the hundredth finale separate', () => {
    expect(levels.map((_, index) => index).filter(isChapterEnd)).toEqual([9, 19, 29, 39, 49, 59, 69, 79, 89]);
    expect(isChapterEnd(99)).toBe(false);
  });
  it('uses the campaign total, modern side runs and v5/v6 lessons at the integration points', () => {
    expect(main).toContain('${complete} of ${levels.length} meadows complete');
    expect(main).toContain('aria-valuemax="${levels.length}"');
    expect(main).toContain('${progress.flowers} / ${levels.length} meadows blooming');
    expect(main).toContain('new GameEngine(level, 6, activity)');
    expect(main).toContain('scene.engine.rulesVersion >= 5 ? lessonFor');
    expect(main).toContain("['pollen', 'honeycomb', 'dew', 'bloom', 'bud', 'echo']");
    // Original side-adventure invitations and garden resident milestones are preserved.
    expect(main).toContain('won && (index === 19 || index === 29)');
  });
  it('keeps chapter scrolling, keyboard navigation and minimum touch geometry explicit', () => {
    expect(main).toContain('aria-label="Choose a chapter"');
    expect(main).toContain('aria-pressed="${item.selected}"');
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) expect(main).toContain(`event.key === '${key}'`);
    expect(main).toContain('focus({ preventScroll: true })');
    expect(css).toContain('scroll-snap-type: x proximity');
    expect(css).toContain('minmax(44px, 1fr)');
    expect(css).toContain('repeat(4, minmax(44px, 1fr))');
    expect(css).toContain('min-width: 44px; min-height: 44px; height: 44px');
  });
});

describe('new tile inspection and reveal feedback', () => {
  it('names active and fixed next colors and keeps a bee reminder', () => {
    const detail = inspectedBubbleDetail({ kind: 'bud', color: 'R', nextColor: 'G', bee: true });
    expect(detail).toContain('Front: red. Fixed next color: green.');
    expect(detail).toContain('small inner petal');
    expect(detail).toContain('bee friend');
    expect(inspectedBubbleDetail({ kind: 'echo', color: 'P', bee: false })).toContain('Shown color: purple');
    expect(inspectedBubbleDetail({ kind: 'bloom', color: 'G', alternate: 'P', bee: true })).toContain('after the next shot it will be purple');
    expect(inspectedBubbleDetail()).toBe('');
    expect(Object.keys(colorNames)).toHaveLength(6);
  });
  it('calls out both a completed Echo wave and a borrowed color that stays on the board', () => {
    for (const [rows, specials, expected] of [
      [['RRbBG....', '.BBG....'], [{ row: 0, col: 2, kind: 'echo' }, { row: 0, col: 3, kind: 'echo' }, { row: 1, col: 1, kind: 'echo' }, { row: 1, col: 2, kind: 'echo' }], 'Echo chain ×1 ❋'],
      [['RRBGG....', '........'], [{ row: 0, col: 2, kind: 'echo' }], 'Echo petals borrowed a color ❋']
    ] as const) {
      const board = new BubbleBoard([...rows], specials.map(special => ({ ...special })));
      const before = board.entries();
      const result = { trace: { path: [], angle: 0, placement: null, impact: null }, settled: board.settle({ row: 1, col: 0 }, { kind: 'normal', color: 'R', bee: false }), color: 'R', wild: false, won: false, lost: false } as ReturnType<GameEngine['fire']>;
      expect(transformedTileKinds(before, result).echoes).toBeGreaterThan(0);
      expect(transformationFeedback(before, result)).toContain(expected);
    }
  });
  it('uses original tile kinds for same-color layer openings and consumed Echo petals', () => {
    const board = new BubbleBoard(['RRrBB....'], [{ row: 0, col: 2, kind: 'bud', nextColor: 'R' }, { row: 0, col: 3, kind: 'echo' }, { row: 0, col: 4, kind: 'echo' }]);
    const before = board.entries();
    const result = { trace: { path: [], angle: 0, placement: null, impact: null }, settled: board.settle({ row: 1, col: 0 }, { kind: 'normal', color: 'R', bee: false }), color: 'R', wild: false, won: false, lost: false } as ReturnType<GameEngine['fire']>;
    const transforms = transformedTileKinds(before, result);
    expect(transforms.buds).toBe(1);
    expect(transformationFeedback(before, result)[0]).toBe('Bud opened · match its new color ◒');
    expect(main).toContain('previous.bubble.kind !== cell.bubble.kind');
    expect(main).toContain('buildPopPresentation(result, before, reducedMotion.matches)');
    expect(main).toContain('this.sparkleBudget = 48');
  });
});

describe('cascade aim preview', () => {
  for (const id of [31, 41, 51, 71, 91]) it(`uses real collision and cascade results without mutating Level ${id}`, () => {
    const engine = new GameEngine(levels[id - 1]);
    const token = campaignRoutesV6[id].split(' ')[0];
    const shot = { angle: parseFloat(token), swap: token.endsWith('s') };
    if (shot.swap) engine.swap();
    const before = { cells: engine.board.entries(), current: engine.currentColor, next: engine.nextColor, shots: engine.shots, turns: engine.turns, bloom: engine.bloomCharge };
    const preview = previewShotOutcome(engine, shot.angle)!;
    expect({ cells: engine.board.entries(), current: engine.currentColor, next: engine.nextColor, shots: engine.shots, turns: engine.turns, bloom: engine.bloomCharge }).toEqual(before);
    expect(engine.fire(shot.angle)).toEqual(preview);
  });
  it('previews a layer-opening Bloom burst and rejects invalid targets without mutation', () => {
    const engine = new GameEngine(levels[30]);
    engine.bloomCharge = engine.bloomGoal;
    engine.armBloom();
    const angle = -.12;
    const preview = previewShotOutcome(engine, angle);
    expect(engine.bloomArmed).toBe(true);
    expect(preview).toEqual(engine.clone().fire(angle));
    engine.won = true;
    expect(previewShotOutcome(engine, 0)).toBeUndefined();
  });
});

// Invoke the production method with drawing spies, rather than duplicating tile art.
describe('production bud and Echo drawing', () => {
  const draw = main.slice(main.indexOf('  private makeBubble('), main.indexOf('  private drawBoard('));
  const colors = main.slice(main.indexOf('const palette:'), main.indexOf('const normalBubble'));
  const js = stripTypeScriptTypes(`${colors}\nclass Renderer { ${draw} }`);
  const Renderer = new Function('BUBBLE_RADIUS', `${js}; return Renderer;`)(17);
  const drawBubble = (bubble: Bubble) => {
    const calls: { type: string; args: unknown[] }[] = [];
    const add = new Proxy({}, { get: (_, type: string) => (...args: unknown[]) => {
      calls.push({ type, args });
      const object = new Proxy({}, { get: (_, method: string) => (...chainArgs: unknown[]) => {
        calls.push({ type: `${type}.${method}`, args: chainArgs }); return object;
      } });
      return object;
    } });
    const renderer = new Renderer(); renderer.add = add;
    renderer.makeBubble(0, 0, bubble);
    return calls;
  };
  it('draws a fixed next-color petal with its own colorblind glyph and two calyx leaves', () => {
    const calls = drawBubble({ kind: 'bud', color: 'R', nextColor: 'G', bee: true });
    expect(calls.filter(call => call.type === 'ellipse')).toHaveLength(3); // shadow + two leaves
    expect(calls.some(call => call.type === 'circle' && call.args[3] === 0x91d6a4)).toBe(true);
    expect(calls.some(call => call.type === 'text' && call.args[2] === '✿')).toBe(true);
    expect(calls.some(call => call.type === 'image' && call.args[2] === 'bee')).toBe(true);
    expect(calls.some(call => call.type === 'text' && call.args[2] === '↻')).toBe(false);
  });
  it('draws five Echo petals and ripple arcs while keeping the ordinary color glyph', () => {
    const calls = drawBubble({ kind: 'echo', color: 'B', bee: false });
    expect(calls.filter(call => call.type === 'ellipse')).toHaveLength(6);
    expect(calls.filter(call => call.type === 'graphics.arc')).toHaveLength(2);
    expect(calls.some(call => call.type === 'text' && call.args[2] === '●')).toBe(true);
  });
  it('removes all special marks after a layer or Echo conversion becomes normal', () => {
    const calls = drawBubble({ kind: 'normal', color: 'G', bee: true });
    expect(calls.filter(call => call.type === 'ellipse')).toHaveLength(1);
    expect(calls.some(call => call.type === 'circle' || call.type === 'graphics.arc')).toBe(false);
    expect(calls.some(call => call.type === 'image' && call.args[2] === 'bee')).toBe(true);
  });
});
