import type { BubbleColor } from './board';
import type { BoosterId } from './boosters';
import { GameEngine } from './engine';
import type { LevelDefinition } from './levels';

export type RunAction =
  | { type: 'swap' }
  | { type: 'wild'; color: BubbleColor }
  | { type: 'booster'; id: BoosterId; color?: BubbleColor }
  | { type: 'cancel' }
  | { type: 'fire'; angle: number };

export interface ActiveRun { version: 1; levelId: number; actions: RunAction[] }
export interface RestoredRun { engine: GameEngine; actions: RunAction[] }

const colors = new Set(['R', 'O', 'Y', 'G', 'B', 'P']);
const boosters = new Set(['rainbow', 'double', 'bonk']);

// Replaying a short action log lets the engine rebuild its seeded queue and board
// without persisting Phaser objects or private board internals.
export function restoreActiveRun(value: unknown, levels: LevelDefinition[], unlocked: number): RestoredRun | null {
  if (!value || typeof value !== 'object') return null;
  const run = value as Record<string, unknown>;
  if (run.version !== 1 || !Number.isInteger(run.levelId) || Number(run.levelId) < 1 || Number(run.levelId) > unlocked || !Array.isArray(run.actions) || run.actions.length > 250) return null;
  const level = levels[Number(run.levelId) - 1];
  if (!level || level.id !== run.levelId) return null;
  const engine = new GameEngine(level);
  const actions: RunAction[] = [];
  try {
    for (const raw of run.actions) {
      if (!raw || typeof raw !== 'object' || engine.won || engine.lost) return null;
      const action = raw as Record<string, unknown>;
      if (action.type === 'swap') { engine.swap(); actions.push({ type: 'swap' }); }
      else if (action.type === 'wild' && colors.has(String(action.color))) {
        const color = action.color as BubbleColor;
        if (!engine.chooseWild(color)) return null;
        actions.push({ type: 'wild', color });
      } else if (action.type === 'booster' && boosters.has(String(action.id))) {
        const id = action.id as BoosterId;
        const color = action.color as BubbleColor | undefined;
        if (id === 'rainbow' ? !colors.has(String(color)) : color !== undefined) return null;
        if (!engine.armBooster(id, color)) return null;
        actions.push({ type: 'booster', id, ...(color ? { color } : {}) });
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
