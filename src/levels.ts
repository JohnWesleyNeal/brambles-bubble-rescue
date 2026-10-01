import { levels as original } from './levels-v5';
import { expansionLevels } from './levels-expansion';
export { chapters } from './chapters';
export { legacyLevels, campaignOrder } from './levels-v5';
export type { Chapter, LevelDefinition } from './levels-v3';

// Append only: the published first thirty retain every board, seed and allowance.
export const levels = [...original, ...expansionLevels];
