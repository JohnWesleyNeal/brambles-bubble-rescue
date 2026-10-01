import { GameEngine } from './engine';

const names = { R: 'red ♥', O: 'orange ◆', Y: 'yellow ✦', G: 'green ✿', B: 'blue ●', P: 'purple ★' };

// A helpful next move, not a promise of an optimal whole-board solution.
export function suggestShot(engine: GameEngine) {
  if (engine.guideHidden || engine.won || engine.lost || engine.awaitingTopUp) return undefined;
  let best: { angle: number; swap: boolean; score: number; message: string } | undefined;
  for (const swap of [false, true]) {
    for (let step = -24; step <= 24; step++) {
      const angle = step * .05;
      const trial = engine.clone();
      if (swap) trial.swap();
      if (!trial.canFire(angle)) continue;
      const color = trial.shotColor();
      const result = trial.fire(angle);
      if (result.lost) continue;
      const drops = (result.settled?.dropped.length ?? 0) + (result.turn?.dropped.length ?? 0);
      const pops = result.settled?.popped.length ?? 0;
      const cracks = result.settled?.cracked.length ?? 0;
      const changes = result.settled?.transformed?.length ?? 0;
      const chains = result.settled?.chains ?? 0;
      const bees = trial.freedBees - engine.freedBees;
      const path = trial.flightStep - engine.flightStep;
      const score = Number(result.won) * 10000 + bees * 100 + path * 60 + drops * 3 + pops * 2 + cracks * 4 + changes * 5 + chains * 7 - Math.abs(angle) - Number(swap) * .1;
      if (best && best.score >= score) continue;
      const bank = result.trace.path.some((p, i, a) => i > 1 && (p.x - a[i - 1].x) * (a[i - 1].x - a[i - 2].x) < 0);
      const direction = angle < 0 ? 'to the left' : angle > 0 ? 'to the right' : 'up the middle';
      const aim = bank ? `off the ${angle < 0 ? 'left' : 'right'} wall` : direction;
      const benefit = bees ? `rescue ${bees} ${bees === 1 ? 'bee' : 'bees'}` : path ? 'open Mabel’s route' : chains ? 'start an Echo cascade' : drops ? 'drop a hanging group' : changes ? 'reveal a bud or lend Echo petals a color' : cracks ? 'crack a dew shell' : pops ? 'clear a matching group' : '';
      const equipped = engine.bloomArmed ? 'your Bloom shot' : engine.armedBooster ? 'your equipped gift' : `the ${names[color]} bubble`;
      best = { angle, swap, score, message: benefit
        ? `${swap ? 'Swap, then aim' : 'Aim'} ${equipped} ${aim} to ${benefit}.`
        : 'No clear yet. Build a same-color pair or try a free gift.' };
    }
  }
  return best;
}

export function coaching(engine: GameEngine): string {
  if (engine.bloomArmed) return 'Bloom equipped · tap its flower again to cancel';
  if (engine.armedBooster) return 'Gift ready · tap its label above to cancel';
  if (engine.bloomUnlocked && engine.bloomCharge === engine.bloomGoal) return '✿ Bloom ready · tap the flower to equip';
  if (engine.flightPath) return 'Clear the dotted route for Mabel';
  if (engine.level.wind) return `Breeze in ${2 - engine.turns % 2} shots · Swap costs no turns`;
  if (engine.level.id === 2) return '↔ Try Swap · it costs no shots';
  if (engine.level.id === 3 || engine.level.id === 4) return 'Cut a support · hanging bubbles fall';
  if (engine.level.id === 6) return 'Bounce off a wall · follow the dotted guide';
  if (engine.shots <= 3) return 'Need a hand? Gifts refills are free';
  return 'Drag to aim · release to pop · pull back to cancel';
}
