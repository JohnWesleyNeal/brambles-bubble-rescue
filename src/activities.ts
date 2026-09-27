import { levels, type LevelDefinition } from './levels';
import { levels as edition3 } from './levels-v3';

export type Activity = { kind: 'challenge'; id: string } | { kind: 'boss'; phase: number; rematch: boolean };
export interface Challenge {
  id: string; level: number; name: string; description: string;
  noGuide?: boolean; noGifts?: boolean; shotLimit?: number; bankGoal?: number;
}
export const challenges: Challenge[] = [
  { id: 'paw-picnic', level: 3, name: 'Trust Your Paw', description: 'Rescue the picnic with only a short direction line. No landing preview or aiming hints. Gifts are welcome.', noGuide: true },
  { id: 'bend-home', level: 6, name: 'Around the Bend', description: 'Rescue at least 2 bees with wall-bounced shots, then finish the meadow. Drops from those shots count.', bankGoal: 2 },
  { id: 'light-bloom', level: 9, name: 'Travel Light', description: 'Finish with no gifts, wild shots or extra bubbles. Your earned Bloom is welcome.', noGifts: true },
  { id: 'perfect-party', level: 10, name: 'Perfect Picnic', description: 'Bring everyone home in 5 shots. Gifts are welcome, but pollen and refills cannot extend the five-turn target.', shotLimit: 5 },
  { id: 'paw-windows', level: 12, name: 'Trust Your Paw · Hedge Windows', description: 'Find the openings without the trajectory or match preview. Your gifts still work.', noGuide: true },
  { id: 'bend-windmill', level: 21, name: 'Around the Bend · Windmill', description: 'Rescue at least 4 bees with wall-bounced shots and finish the meadow. Watch the breeze.', bankGoal: 4 }
];
export function challengeFor(activity?: Activity): Challenge | undefined {
  return activity?.kind === 'challenge' ? challenges.find(c => c.id === activity.id) : undefined;
}
export const bossPhases = [
  { name: 'Open the Basket', objective: 'Free both clasp bees to undo the basket.', line: '“Borrowed! I distinctly said borrowed.”', response: '“Those were decorative clasps. Obviously.”' },
  { name: 'Outsmart the Magpie', objective: 'Rescue the bees around his moving screen. It tries to shift every two shots.', line: '“You cannot possibly get around my very clever screen.”', response: '“A temporary setback in picnic security.”' },
  { name: 'Bring the Picnic Home', objective: 'Clear the dotted route so Mabel can reclaim the picnic.', line: '“One last little detour. For scenic purposes.”', response: '“Very well. May I at least keep a sandwich?”' }
];
export function validActivity(value: unknown): value is Activity {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  return a.kind === 'challenge' ? challenges.some(c => c.id === a.id)
    : a.kind === 'boss' && Number.isInteger(a.phase) && Number(a.phase) >= 0 && Number(a.phase) < 3 && typeof a.rematch === 'boolean';
}
export function activityLevel(activity: Activity): LevelDefinition {
  if (activity.kind === 'challenge') {
    const c = challengeFor(activity)!;
    return { ...levels[c.level - 1], name: c.name, tutorial: c.description,
      shots: c.shotLimit ?? levels[c.level - 1].shots };
  }
  const { phase, rematch } = activity;
  const source = phase === 0 ? edition3[6] : phase === 1 ? levels[rematch ? 29 : 20] : levels[rematch ? 14 : 13];
  const level = { ...source, id: rematch ? 30 : 20, chapter: rematch ? 'hard' as const : 'intermediate' as const,
    name: bossPhases[phase].name, tutorial: bossPhases[phase].objective,
    hint: `${bossPhases[phase].objective} ${source.hint}`, shots: phase === 0 ? 9 : phase === 1 ? rematch ? 15 : 11 : rematch ? 11 : 15 };
  if (phase === 0 && rematch) {
    level.rows = level.rows.map((r, i) => i === 0 ? r[0].toLowerCase() + r.slice(1, -1) + r.at(-1)!.toLowerCase() : r.toUpperCase());
    level.specials = [{ row: 0, col: 0, kind: 'dew' }, { row: 0, col: 8, kind: 'dew' }];
  }
  return level;
}
export function activityUnlocked(activity: Activity, stars: number[]): boolean {
  return activity.kind === 'challenge' ? Boolean(stars[challengeFor(activity)!.level - 1])
    : stars.slice(0, activity.rematch ? 30 : 20).filter(Boolean).length >= (activity.rematch ? 30 : 20);
}
