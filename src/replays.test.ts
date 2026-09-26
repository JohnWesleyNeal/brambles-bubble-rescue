import { describe, expect, it } from 'vitest';
import { GameEngine } from './engine';
import { levels } from './levels';

// Human-repeatable winning shots through the same collision path used in game.
// An `s` after an angle means swap before firing. No wild shots are used.
const replays = [
  '-1.25s -1.15',
  '-0.85s -1.05s',
  '-0.85s -1.05',
  '-1.25 -1.25 -0.85 -0.75s -1.15s -1.25',
  '-1.25 -1.25 -1.15s -1.25 -1.25',
  '-1.25 -1.25 -1.25 -1.15s -1.15s -1.25',
  '-0.85 -1.25 -1.25',
  '-1.25s -1.25 -1.15s -1.25',
  '-1.25s -0.85s -1.25 -1.25s -1.25',
  '-0.35 -0.85 -1.25 -0.85s',
  '-0.85 -1.05 -1.05',
  '-1.05s -1.15 -0.85s -1.05',
  '-1.05s -0.85s -1.05',
  '-1.05s -1.05s -0.85s',
  '-0.85s -1.05 -1.25 -1.05',
  '-0.85s -0.35s -1.15 -1.05',
  '-0.85 -1.15 -1.25s -1.05s -1.05s',
  '-0.85 -0.85 -1.25 0.45 -1.25 -1.25 -1.15s -1.25',
  '-1.15s -1.25 -0.95 -1.25s -1.15s -1.25s -1.25',
  '-1.15s -0.45 -1.15 -0.85 -1.25',
  '-1.15 -0.85s -1.25 -1.25 -1.25',
  '-1.25s -1.05 -0.85s -1.05',
  '-0.85 -0.35s -0.85s',
  '-0.35 -1.25s -0.85s -1.05s',
  '-0.35s 0.85s -0.85',
  '-0.85s -1.25 -1.05s -1.05',
  '-0.35s 0.15 -1.25s',
  '-0.35s -0.85s -1.25 -1.05',
  '-0.85 -0.35 -1.25 -1.05',
  '-0.35s -0.85s -1.25 -1.05'
];

describe('authored level replays', () => {
  it('covers exactly 30 levels', () => expect(replays).toHaveLength(levels.length));

  for (const [index, replay] of replays.entries()) {
    it(`clears level ${index + 1} with its regular shot budget`, () => {
      const game = new GameEngine(levels[index]);
      const effects = { pollen: 0, honeycomb: 0, dew: 0, wind: 0, bloom: 0 };
      for (const move of replay.split(' ')) {
        if (move.endsWith('s')) game.swap();
        const result = game.fire(Number.parseFloat(move));
        effects.pollen += (result.settled?.bonusShots ?? 0) + (result.turn?.bonusShots ?? 0);
        effects.honeycomb += [...(result.settled?.dropped ?? []), ...(result.turn?.dropped ?? [])].filter(({ bubble }) => bubble.kind === 'honeycomb').length;
        effects.dew += result.settled?.cracked.length ?? 0;
        effects.wind += result.turn?.moved ? 1 : 0;
        effects.bloom += result.turn?.changed.length ?? 0;
        expect(result.trace.placement).not.toBeNull();
        if (result.won) break;
        expect(result.lost).toBe(false);
      }
      expect(game.won).toBe(true);
      expect(game.wildUsed).toBe(false);
      expect(game.shots).toBeGreaterThanOrEqual(0);
      if (index === 8) expect(effects.pollen).toBeGreaterThan(0);
      if (index === 10) expect(effects.honeycomb).toBeGreaterThan(0);
      if (index === 14) expect(effects.dew).toBeGreaterThan(0);
      if (index === 20) expect(effects.wind).toBeGreaterThan(0);
      if (index === 24) expect(effects.bloom).toBeGreaterThan(0);
      if (index === 29) expect([effects.pollen, effects.honeycomb, effects.wind, effects.bloom].every(Boolean)).toBe(true);
    });
  }
});
