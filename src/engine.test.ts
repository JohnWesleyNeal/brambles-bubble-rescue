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
});
