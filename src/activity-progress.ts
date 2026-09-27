import type { GameEngine } from './engine';
import type { SaveData } from './progress';

// Called at shot resolution, before the celebration can be interrupted.
export function recordActivityResult(save: SaveData, game: GameEngine): void {
  const activity = game.activity;
  if (!activity || (!game.won && !game.lost)) return;
  delete save.activeSideRun;
  if (!game.won) return;
  if (activity.kind === 'challenge') {
    if (game.challengeComplete && !save.medals.includes(activity.id)) save.medals.push(activity.id);
  } else {
    const checkpoint = activity.rematch ? 'rematchCheckpoint' : 'bossCheckpoint';
    save[checkpoint] = activity.phase < 2 ? activity.phase + 1 : 0;
    if (activity.phase === 2) save[activity.rematch ? 'rematchCleared' : 'bossCleared'] = true;
  }
}
