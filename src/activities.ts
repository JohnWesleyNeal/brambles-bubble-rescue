import { levels, type LevelDefinition } from './levels';
import { levels as edition3 } from './levels-v3';

export type Activity = { kind: 'challenge'; id: string } | { kind: 'boss'; phase: number; rematch: boolean };
export interface Challenge {
  id: string; level: number; name: string; description: string;
  noGuide?: boolean; noGifts?: boolean; shotLimit?: number; bankGoal?: number;
}
export const challenges: Challenge[] = [
  { id: 'paw-picnic', level: 3, name: 'Trust Your Paw', description: 'Short aim line only. Gifts allowed.', noGuide: true },
  { id: 'bend-home', level: 6, name: 'Around the Bend', description: 'Rescue 2 bees with wall bounces.', bankGoal: 2 },
  { id: 'light-bloom', level: 9, name: 'Travel Light', description: 'No gifts, wild shots or refills. Bloom allowed.', noGifts: true },
  { id: 'perfect-party', level: 10, name: 'Perfect Picnic', description: 'Bring everyone home in 5 shots.', shotLimit: 5 },
  { id: 'paw-windows', level: 12, name: 'Trust Your Paw · Hedge Windows', description: 'Find the gaps with only a short aim line.', noGuide: true },
  { id: 'bend-windmill', level: 21, name: 'Around the Bend · Windmill', description: 'Rescue 4 bees with wall bounces.', bankGoal: 4 }
];
export function challengeFor(activity?: Activity): Challenge | undefined {
  return activity?.kind === 'challenge' ? challenges.find(c => c.id === activity.id) : undefined;
}
export const bossPhases = [
  { name: 'Open the Basket', objective: 'Crack both clasp shells. Free the bees.', line: '“Borrowed! I distinctly said borrowed.”', response: '“Those were decorative clasps. Obviously.”' },
  { name: 'Outsmart the Magpie', objective: 'Outplay the moving screen. Bonk can stall it.', line: '“You cannot possibly get around my very clever screen.”', response: '“A temporary setback in picnic security.”' },
  { name: 'Bring the Picnic Home', objective: 'Clear Mabel’s route. Watch the changing gate.', line: '“One last little detour. For scenic purposes.”', response: '“Very well. May I at least keep a sandwich?”' }
];
export function validActivity(value: unknown): value is Activity {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  return a.kind === 'challenge' ? challenges.some(c => c.id === a.id)
    : a.kind === 'boss' && Number.isInteger(a.phase) && Number(a.phase) >= 0 && Number(a.phase) < 3 && typeof a.rematch === 'boolean';
}
export function activityLevel(activity: Activity, edition = 5): LevelDefinition {
  if (activity.kind === 'challenge') {
    const c = challengeFor(activity)!;
    return { ...levels[c.level - 1], name: c.name, tutorial: c.description,
      shots: c.shotLimit ?? levels[c.level - 1].shots };
  }
  const { phase, rematch } = activity;
  const source = phase === 0 ? edition3[6] : phase === 1 ? levels[rematch ? 29 : 20] : levels[rematch ? 14 : 13];
  const level = { ...source, specials: [...source.specials], id: rematch ? 30 : 20, chapter: rematch ? 'hard' as const : 'intermediate' as const,
    name: bossPhases[phase].name, tutorial: bossPhases[phase].objective,
    hint: `${bossPhases[phase].objective} ${source.hint}`, shots: phase === 0 ? 9 : phase === 1 ? rematch ? 15 : 11 : rematch ? 11 : 15 };
  if (phase === 0 && rematch) {
    level.rows = level.rows.map((r, i) => i === 0 ? r[0].toLowerCase() + r.slice(1, -1) + r.at(-1)!.toLowerCase() : r.toUpperCase());
    level.specials = [{ row: 0, col: 0, kind: 'dew' }, { row: 0, col: 8, kind: 'dew' }];
  }
  if (edition >= 5 && phase === 0) {
    if (!rematch) {
      level.rows = level.rows.map((row, i) => i === 0 ? row[0].toLowerCase() + row.slice(1, -1) + row.at(-1)!.toLowerCase() : row);
      level.specials.push({ row: 0, col: 0, kind: 'dew' }, { row: 0, col: 8, kind: 'dew' });
    } else for (const col of [1, 7]) level.specials.push({ row: 2, col, kind: 'dew' });
    level.shots += 4;
  }
  if (edition >= 5 && phase === 2) {
    level.specials.push({ row: 3, col: 4, kind: 'bloom', alternate: 'G' });
    if (rematch) level.specials.push({ row: 2, col: 4, kind: 'bloom', alternate: 'P' });
    level.shots += rematch ? 3 : 2;
  }
  return level;
}
export function activityUnlocked(activity: Activity, stars: number[]): boolean {
  return activity.kind === 'challenge' ? Boolean(stars[challengeFor(activity)!.level - 1])
    : stars.slice(0, activity.rematch ? 30 : 20).filter(Boolean).length >= (activity.rematch ? 30 : 20);
}
