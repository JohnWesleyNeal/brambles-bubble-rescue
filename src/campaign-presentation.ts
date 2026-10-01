import type { Bubble, BubbleColor, Cell, OccupiedCell } from './board';
import { GameEngine, type FireResult } from './engine';
import { chapters, levels } from './levels';

export const colorNames: Record<BubbleColor, string> = {
  R: 'red', O: 'orange', Y: 'yellow', G: 'green', B: 'blue', P: 'purple'
};

export const chapterThemes = [
  { fill: 0xfaf5dc, line: 0x3a866b, ink: '#346c5b', symbol: '✿' },
  { fill: 0xffedca, line: 0xa9804d, ink: '#89613c', symbol: '⬢' },
  { fill: 0xe1eff0, line: 0x5c8d99, ink: '#397281', symbol: '↗' },
  { fill: 0xf7e7df, line: 0xb87983, ink: '#895c67', symbol: '◒' },
  { fill: 0xede8f5, line: 0x967caf, ink: '#77628c', symbol: '❋' },
  { fill: 0xe2f0e8, line: 0x67988f, ink: '#477c73', symbol: '≈' },
  { fill: 0xffedd1, line: 0xb88c55, ink: '#94703e', symbol: '✦' },
  { fill: 0xe3efda, line: 0x719163, ink: '#527247', symbol: '❧' },
  { fill: 0xe8eaf5, line: 0x7d88b0, ink: '#5e698f', symbol: '★' },
  { fill: 0xf8efd9, line: 0x9d8662, ink: '#7a694c', symbol: '⌂' }
] as const;

export function chapterIndexForLevel(levelIndex: number): number {
  const found = chapters.findIndex(chapter => levelIndex + 1 >= chapter.first && levelIndex + 1 <= chapter.last);
  return found < 0 ? 0 : found;
}

export function chapterTheme(levelIndex: number) {
  const index = chapterIndexForLevel(levelIndex);
  return { ...(chapterThemes[index] ?? chapterThemes[0]), name: chapters[index].name.toUpperCase() };
}

export function chapterChoices(selected: number, unlocked: number, stars: number[]) {
  const safeSelected = Number.isInteger(selected) ? Math.max(0, Math.min(chapters.length - 1, selected)) : 0;
  return chapters.map((chapter, index) => ({
    ...chapter, index, selected: index === safeSelected, unlocked: unlocked >= chapter.first,
    complete: stars.slice(chapter.first - 1, chapter.last).filter(Boolean).length
  }));
}

export function isChapterEnd(levelIndex: number): boolean {
  return levelIndex < levels.length - 1 && chapters.some(chapter => chapter.last === levelIndex + 1);
}

export function inspectedBubbleDetail(bubble?: Bubble): string {
  if (!bubble) return '';
  const details: string[] = [];
  if (bubble.kind === 'bud' && bubble.color && bubble.nextColor) {
    details.push(`Front: ${colorNames[bubble.color]}. Fixed next color: ${colorNames[bubble.nextColor]}. The small inner petal shows that second layer.`);
  } else if (bubble.kind === 'bloom' && bubble.color && bubble.alternate) {
    details.push(`Right now it is ${colorNames[bubble.color]}; after the next shot it will be ${colorNames[bubble.alternate]}.`);
  } else if (bubble.kind === 'echo' && bubble.color) {
    details.push(`Shown color: ${colorNames[bubble.color]}. A neighboring pop can lend it a new color once.`);
  }
  if (bubble.bee) details.push('There is a bee friend inside this bubble.');
  return details.join(' ');
}

/** Run the same trace and cascade as a real shot, on a detached engine. */
export function previewShotOutcome(engine: GameEngine, angle: number): FireResult | undefined {
  return engine.canFire(angle) ? engine.clone().fire(angle) : undefined;
}

export function transformedTileKinds(before: OccupiedCell[], result: FireResult): { buds: number; echoes: number; cells: Cell[] } {
  const cells = result.settled?.transformed ?? [];
  const kinds = cells.map(cell => before.find(prior => prior.row === cell.row && prior.col === cell.col)?.bubble.kind);
  return { buds: kinds.filter(kind => kind === 'bud').length, echoes: kinds.filter(kind => kind === 'echo').length, cells };
}

export function transformationFeedback(before: OccupiedCell[], result: FireResult): string[] {
  const { buds, echoes } = transformedTileKinds(before, result);
  const labels: string[] = [];
  if (buds) labels.push(buds === 1 ? 'Bud opened · match its new color ◒' : `${buds} buds opened · new colors showing ◒`);
  if (result.settled?.chains) labels.push(`Echo chain ×${result.settled.chains} ❋`);
  else if (echoes) labels.push('Echo petals borrowed a color ❋');
  return labels;
}
