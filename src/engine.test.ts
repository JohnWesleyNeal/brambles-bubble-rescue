import { describe, expect, it } from 'vitest';
import { GameEngine } from './engine';
import { levels } from './levels';

describe('repeatable shots', () => {
  it('starts with the same queue and landing on retry', () => {
    const first = new GameEngine(levels[6]);
    const second = new GameEngine(levels[6]);
    expect([first.currentColor, first.nextColor]).toEqual([second.currentColor, second.nextColor]);
    expect(first.preview(-0.27).placement).toEqual(second.preview(-0.27).placement);
    const a = first.fire(-0.27);
    const b = second.fire(-0.27);
    expect([a.color, a.settled?.beesFreed, first.shots]).toEqual([b.color, b.settled?.beesFreed, second.shots]);
  });

  it('lets a wild shot choose an available color at no regular-shot cost', () => {
    const engine = new GameEngine(levels[0]);
    expect(engine.chooseWild('R')).toBe(true);
    engine.fire(-0.28);
    expect(engine.shots).toBe(levels[0].shots);
    expect(engine.wildUsed).toBe(true);
    expect(engine.chooseWild('G')).toBe(false);
  });

  it('preserves the original chosen-color Rainbow under legacy rules', () => {
    const level = { ...levels[0], rows: ['...gg....', '........'], specials: [], shots: 5 };
    const engine = new GameEngine(level, 1);
    engine.currentColor = 'R';
    engine.nextColor = 'R';
    expect(engine.armBooster('rainbow', 'G')).toBe(true);
    expect(engine.shotColor()).toBe('G');
    const result = engine.fire(0);
    expect(result.booster).toBe('rainbow');
    expect(result.color).toBe('G');
    expect(result.won).toBe(true);
    expect(engine.shots).toBe(4);
  });

  it('consumes a regular shot when Bonk directly frees a bee', () => {
    const level = { ...levels[0], rows: ['....r....', '........'], specials: [], shots: 5 };
    const engine = new GameEngine(level);
    expect(engine.armBooster('bonk')).toBe(true);
    const result = engine.fire(0);
    expect(result.booster).toBe('bonk');
    expect(result.settled?.placed).toBeNull();
    expect(result.settled?.beesFreed).toBe(1);
    expect(engine.shots).toBe(4);
    expect(engine.armedBooster).toBeUndefined();
  });

  it('can cancel an armed booster before firing', () => {
    const engine = new GameEngine(levels[7]);
    expect(engine.armBooster('double')).toBe(true);
    engine.cancelSpecialShot();
    expect(engine.armedBooster).toBeUndefined();
    expect(engine.turns).toBe(0);
  });
});
