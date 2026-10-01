import { chapters as original, type Chapter } from './levels-v3';
import { expansionChapters } from './levels-expansion';

export interface ChapterDefinition { id: Chapter; name: string; subtitle: string; first: number; last: number }

/** The original three chapters and their level boundaries stay unchanged. */
export const chapters: ChapterDefinition[] = [...original, ...expansionChapters];
