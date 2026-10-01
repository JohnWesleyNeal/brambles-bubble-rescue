import type { Bubble, TileKind } from './board';

export type RuleId = 'match' | 'bee' | 'bank' | 'drop' | 'pollen' | 'honeycomb' | 'dew' | 'wind' | 'bloom' | 'bud' | 'echo';
export interface RuleDefinition { id: RuleId; name: string; symbol: string; short: string; detail: string; appears: number }

export const rules: RuleDefinition[] = [
  { id: 'match', name: 'Colored bubbles', symbol: '♥', short: 'Match three of one color.', detail: 'Your shot counts as one of the three. Swap if the next color gives you a better match.', appears: 1 },
  { id: 'bee', name: 'Bee friends', symbol: '🐝', short: 'Free every bee to finish.', detail: 'Pop a bee bubble or drop it by clearing its support. Bees can also be inside special bubbles.', appears: 1 },
  { id: 'drop', name: 'Hanging bubbles', symbol: '↓', short: 'Clear a support to drop what hangs below.', detail: 'Any bubbles no longer connected to the top fall away. Dropped bees count as rescued.', appears: 3 },
  { id: 'pollen', name: 'Golden pollen', symbol: '✺', short: 'Gives back two shots.', detail: 'Pop or drop the pollen bubble to add two bubbles to your remaining shots.', appears: 5 },
  { id: 'bank', name: 'Wall banks', symbol: '↗', short: 'Shots bounce off the side walls.', detail: 'Follow the dotted guide to reach groups behind a barrier.', appears: 6 },
  { id: 'honeycomb', name: 'Honeycomb', symbol: '⬢', short: 'Blocks shots and cannot color match.', detail: 'Drop it by clearing its support, or use Bonk to remove it directly.', appears: 8 },
  { id: 'dew', name: 'Dew shell', symbol: '❄', short: 'Crack it, then clear it.', detail: 'A matching or neighboring pop cracks the shell. The bubble remains until another clear or drop. Bonk removes it directly.', appears: 11 },
  { id: 'wind', name: 'Breezy strip', symbol: '→', short: 'Tries to move every two shots.', detail: 'The marked row shifts one space in the arrow’s direction if that space is open. Unsupported bubbles may fall afterward.', appears: 16 },
  { id: 'bud', name: 'Two-tone bud', symbol: '◒', short: 'Match its front color, then its revealed color.', detail: 'The large face is the current color; the small inner petal shows the fixed second color. A matching clear reveals that second layer and leaves the bee in place. Bloom also opens one layer. It never changes just because a shot passes. Drop the whole bud by clearing its support, or remove it directly with Bonk.', appears: 31 },
  { id: 'echo', name: 'Echo petals', symbol: '❋', short: 'A neighboring pop lends its color to the cluster.', detail: 'Pop beside an Echo petal and every touching Echo petal takes that popped color. A connected group of three or more then clears in the same shot and can pass the color to another cluster. Each Echo changes once, then becomes an ordinary bubble. You can also match its shown color directly.', appears: 41 },
  { id: 'bloom', name: 'Chameleon flower', symbol: '↻', short: 'Switches between two colors each shot.', detail: 'Match the color it shows now. It changes after every resolved shot, including booster shots.', appears: 19 }
];

export const ruleById = Object.fromEntries(rules.map((rule) => [rule.id, rule])) as Record<RuleId, RuleDefinition>;

export function ruleForBubble(bubble: Bubble): RuleId {
  return bubble.kind === 'normal' ? bubble.bee ? 'bee' : 'match' : bubble.kind as Exclude<TileKind, 'normal'>;
}
