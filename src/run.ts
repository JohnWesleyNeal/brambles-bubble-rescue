import { activityLevel, validActivity, type Activity } from './activities';
import type { BubbleColor } from './board';
import type { BoosterId } from './boosters';
import { GameEngine } from './engine';
import { legacyLevels, type LevelDefinition } from './levels';
import { levels as edition3 } from './levels-v3';

export type RunAction =
  | { type: 'relax' }
  | { type: 'swap' }
  | { type: 'wild'; color: BubbleColor }
  | { type: 'booster'; id: BoosterId; color?: BubbleColor }
  | { type: 'cancel' }
  | { type: 'topup' }
  | { type: 'bloom' }
  | { type: 'fire'; angle: number };

export interface ActiveRun { version: 1 | 2 | 3 | 4 | 5; levelId: number; actions: RunAction[]; activity?: Activity }
export interface RestoredRun { engine: GameEngine; actions: RunAction[] }

const colors = new Set(['R', 'O', 'Y', 'G', 'B', 'P']);
const boosters = new Set(['rainbow', 'double', 'bonk']);

// Replaying a short action log lets the engine rebuild its seeded queue and board
// without persisting Phaser objects or private board internals.
export function restoreActiveRun(value: unknown, levels: LevelDefinition[], unlocked: number): RestoredRun | null {
  if (!value || typeof value !== 'object') return null;
  const run = value as Record<string, unknown>;
  if ((run.version !== 1 && run.version !== 2 && run.version !== 3 && run.version !== 4 && run.version !== 5) || !Number.isInteger(run.levelId) || Number(run.levelId) < 1 || Number(run.levelId) > unlocked || !Array.isArray(run.actions) || run.actions.length > 100000) return null;
  let level = (run.version < 3 ? legacyLevels : run.version === 3 ? edition3 : levels)[Number(run.levelId) - 1];
  if (run.activity !== undefined) {
    if (Number(run.version) < 4 || !validActivity(run.activity)) return null;
    level = activityLevel(run.activity, Number(run.version));
  }
  if (!level || level.id !== run.levelId) return null;
  // The v2 Rainbow already used a burst; its old color-picker lesson was stale.
  if (run.version === 2 && run.levelId === 2) level = { ...level, hint: edition3[1].hint, tutorial: edition3[1].tutorial };
  const engine = new GameEngine(level, run.version, run.activity as Activity | undefined);
  const actions: RunAction[] = [];
  try {
    for (const raw of run.actions) {
      if (!raw || typeof raw !== 'object' || engine.won || engine.lost) return null;
      const action = raw as Record<string, unknown>;
      if (action.type === 'relax') { if (!engine.relaxChallenge()) return null; actions.push({ type: 'relax' }); }
      else if (action.type === 'swap') { engine.swap(); actions.push({ type: 'swap' }); }
      else if (action.type === 'wild' && colors.has(String(action.color))) {
        const color = action.color as BubbleColor;
        if (!engine.chooseWild(color)) return null;
        actions.push({ type: 'wild', color });
      } else if (action.type === 'booster' && boosters.has(String(action.id))) {
        const id = action.id as BoosterId;
        const color = action.color as BubbleColor | undefined;
        if (id === 'rainbow' && run.version === 1 ? !colors.has(String(color)) : color !== undefined) return null;
        if (!engine.armBooster(id, color)) return null;
        actions.push({ type: 'booster', id, ...(color ? { color } : {}) });
      } else if (action.type === 'bloom' && run.version >= 3) {
        if (!engine.armBloom()) return null;
        actions.push({ type: 'bloom' });
      } else if (action.type === 'topup' && run.version >= 2) {
        if (!engine.topUp()) return null;
        actions.push({ type: 'topup' });
      } else if (action.type === 'cancel') {
        engine.cancelSpecialShot();
        actions.push({ type: 'cancel' });
      } else if (action.type === 'fire' && typeof action.angle === 'number' && Number.isFinite(action.angle) && Math.abs(action.angle) <= 1.25) {
        engine.fire(action.angle);
        actions.push({ type: 'fire', angle: action.angle });
      } else return null;
    }
  } catch { return null; }
  return engine.won || engine.lost ? null : { engine, actions };
}
