import type { BubbleColor, Cell, SpecialTile, WindStrip } from './board';

export type Chapter = 'beginner' | 'intermediate' | 'hard';
export const chapters: { id: Chapter; name: string; subtitle: string; first: number; last: number }[] = [
  { id: 'beginner', name: 'Meadow Days', subtitle: 'Learn the lovely little tricks', first: 1, last: 10 },
  { id: 'intermediate', name: 'Honeycomb Grove', subtitle: 'Find a path through the puzzle', first: 11, last: 20 },
  { id: 'hard', name: 'Breezy Brambles', subtitle: 'Plan, adapt, and bring everyone home', first: 21, last: 30 }
];

export interface LevelDefinition {
  id: number;
  name: string;
  place: string;
  chapter: Chapter;
  rows: string[];
  shots: number;
  par: number;
  colors: BubbleColor[];
  specials: SpecialTile[];
  wind?: WindStrip;
  hint: string;
  tutorial?: string;
  seed: number;
}

const hc = (row: number, col: number): SpecialTile => ({ row, col, kind: 'honeycomb' });
const pollen = (row: number, col: number): SpecialTile => ({ row, col, kind: 'pollen' });
const dew = (row: number, col: number): SpecialTile => ({ row, col, kind: 'dew' });
const bloom = (row: number, col: number, alternate: BubbleColor): SpecialTile => ({ row, col, kind: 'bloom', alternate });

// Additional bee positions keep later puzzles focused on every part of the board.
// The first six published layouts are intentionally untouched.
const extraBees: Record<number, Cell[]> = {
  7: [{ row: 2, col: 4 }],
  8: [{ row: 1, col: 3 }, { row: 1, col: 7 }],
  9: [{ row: 1, col: 3 }, { row: 1, col: 7 }],
  10: [{ row: 1, col: 3 }, { row: 1, col: 7 }],
  11: [{ row: 1, col: 3 }, { row: 1, col: 7 }],
  12: [{ row: 1, col: 3 }, { row: 1, col: 7 }],
  13: [{ row: 1, col: 3 }, { row: 1, col: 7 }],
  14: [{ row: 1, col: 3 }, { row: 1, col: 7 }],
  15: [{ row: 0, col: 3 }, { row: 1, col: 7 }],
  16: [{ row: 0, col: 3 }, { row: 0, col: 5 }, { row: 1, col: 7 }],
  17: [{ row: 1, col: 3 }, { row: 1, col: 7 }],
  18: [{ row: 2, col: 4 }, { row: 3, col: 3 }],
  19: [{ row: 1, col: 3 }, { row: 1, col: 7 }],
  20: [{ row: 1, col: 3 }, { row: 1, col: 7 }, { row: 3, col: 3 }],
  21: [{ row: 1, col: 3 }, { row: 1, col: 7 }, { row: 4, col: 2 }],
  22: [{ row: 1, col: 3 }, { row: 1, col: 7 }, { row: 4, col: 2 }],
  23: [{ row: 1, col: 3 }, { row: 1, col: 7 }],
  24: [{ row: 1, col: 3 }, { row: 1, col: 7 }, { row: 4, col: 2 }],
  25: [{ row: 0, col: 3 }, { row: 1, col: 7 }, { row: 4, col: 2 }],
  26: [{ row: 0, col: 3 }, { row: 1, col: 7 }, { row: 4, col: 2 }],
  27: [{ row: 0, col: 3 }, { row: 1, col: 7 }, { row: 4, col: 2 }],
  28: [{ row: 1, col: 3 }, { row: 1, col: 7 }, { row: 4, col: 2 }],
  29: [{ row: 0, col: 3 }, { row: 1, col: 7 }, { row: 4, col: 2 }],
  30: [{ row: 0, col: 3 }, { row: 1, col: 7 }, { row: 4, col: 2 }]
};

function level(
  id: number, name: string, place: string, rows: string[], par: number, hint: string,
  options: { shots?: number; specials?: SpecialTile[]; wind?: WindStrip; tutorial?: string } = {}
): LevelDefinition {
  rows = rows.map((text, row) => [...text].map((symbol, col) => {
    if (!extraBees[id]?.some((bee) => bee.row === row && bee.col === col)) return symbol;
    if (symbol === '.') throw new Error(`Bee needs a bubble in level ${id} at ${row}:${col}`);
    return symbol.toLowerCase();
  }).join(''));
  const chapter: Chapter = id <= 10 ? 'beginner' : id <= 20 ? 'intermediate' : 'hard';
  const margin = chapter === 'beginner' ? 8 : chapter === 'intermediate' ? 5 : 3;
  const introExtra = options.tutorial ? 3 : 0;
  const colors = [...new Set([...rows.join('').toUpperCase().replace(/\./g, ''), ...(options.specials ?? []).flatMap((tile) => tile.kind === 'bloom' ? [tile.alternate] : [])])] as BubbleColor[];
  return {
    id, name, place, chapter, rows, par,
    shots: options.shots ?? par + margin + introExtra,
    colors, specials: options.specials ?? [], wind: options.wind,
    hint, tutorial: options.tutorial, seed: id * 137 + 17
  };
}

// Lowercase color letters hold bee friends. Even rows have 9 cells; odd rows have 8.
// Levels 1–6 keep their published layouts and shot budgets.
export const levels: LevelDefinition[] = [
  level(1, 'Hedgerow Hello', 'The sunny garden', ['RRRYYYGGG', 'rrYYgg..', 'RRRYYYGGG'], 4, 'Aim at the red or green group beneath a bee.', { shots: 25, tutorial: 'Match three or more bubbles of one color to free the bee friends.' }),
  level(2, 'Tea-Time Tangle', 'The wildflower path', ['OOOGGGBBB', 'ooGGbbYY', 'OOOGGGBBB', '..YYGG..'], 5, 'You can tap Swap to use the next color first.', { shots: 27 }),
  level(3, 'Berry Brambles', 'The berry patch', ['RRRPPPGGG', 'rrPPggYY', 'RRRPPPGGG', '..YYY...'], 5, 'Aim at a supporting group and let the bubbles below it fall.', { shots: 29 }),
  level(4, 'Clover Crossing', 'The clover meadow', ['BBBOOOPPP', 'bbOOppYY', 'BBBOOOPPP', '.YYGGGG.', '.YYYGGG..'], 6, 'Try the edge of the board when a direct route is crowded.', { shots: 32 }),
  level(5, 'Golden Hour', 'The orchard', ['YYYRRRGGG', 'yyRRggPP', 'YYYRRRGGG', '..PPPBBB', '...PPBBBB'], 7, 'Clear lower groups first to open a line toward the bees.', { shots: 34 }),
  level(6, 'Homeward Bound', 'Bramble’s cottage', ['RRROOOGGG', 'rrOOggBB', 'RRROOOGGG', 'PPPPYYYY', 'PPPBBYYYY', '..PBBY..'], 8, 'A good supporting pop can drop several colors at once.', { shots: 38 }),

  level(7, 'The Long Way Round', 'Old stone wall', ['RRR...GGG', 'rrY..ggY', 'RRRYYYGGG', '..YYY...'], 5, 'Bounce a shot off the side wall to reach a far group.', { tutorial: 'Bank shots bounce off the walls. Follow the dotted guide before you release.' }),
  level(8, 'Snip the Stem', 'The willow branch', ['RRRYYYGGG', 'rrYYggBB', 'RRRYYYGGG', '..BB....'], 6, 'Pop the narrow support above a hanging group; everything it holds will fall.'),
  level(9, 'Pollen Picnic', 'The picnic field', ['OOOYYYGGG', 'ooYYggPP', 'OOOYYYGGG', '..PPBB..'], 6, 'The golden flower gives back two bubbles if you pop or drop it.', { specials: [pollen(2, 4)], tutorial: 'Golden pollen bubbles give you two extra shots when cleared or dropped.' }),
  level(10, 'Garden Party', 'The summer fete', ['RRROOOGGG', 'rrOOggBB', 'RRROOOGGG', '.YYPPYY.'], 7, 'Use a bank shot to cut a support, then collect the pollen.', { specials: [pollen(3, 3)] }),

  level(11, 'Honeycomb Gate', 'The old apiary', ['RRRYYYGGG', 'rrYYggBB', 'RRR...GGG', '..BBPP..'], 6, 'Honeycomb cannot match. Pop its supports to drop it.', { specials: [hc(2, 3), hc(2, 4), hc(2, 5)], tutorial: 'Honeycomb blocks a shot but cannot match. Drop it by clearing what holds it up.' }),
  level(12, 'Under the Comb', 'The bees’ bridge', ['OOOBBBGGG', 'ooBBggYY', 'OOO...GGG', '..YYPP..'], 7, 'Start at the sides and let the centre honeycomb fall.', { specials: [hc(2, 3), hc(2, 4), hc(2, 5)] }),
  level(13, 'Narrow Lanes', 'Bramble Lane', ['RRRYYYBBB', 'rrYYbbGG', 'RRR...BBB', '..GGPP..'], 7, 'A wall bank can slip past the honeycomb.', { specials: [hc(2, 3), hc(2, 4)] }),
  level(14, 'Pollen Shortcut', 'The clover gate', ['OOOPPPGGG', 'ooPPggYY', 'OOO...GGG', '..YYBB..'], 7, 'Free the pollen before taking the long route around the comb.', { specials: [hc(2, 3), hc(2, 4), pollen(3, 3)] }),
  level(15, 'Morning Dew', 'The misty meadow', ['RRRYYYGGG', 'rrYYggBB', 'RRRYYYGGG', '..BBPP..'], 7, 'Pop beside the shell first, then match its color to free the bee inside.', { specials: [dew(0, 3)], tutorial: 'Dew shells survive their first match. Pop beside or match them to crack the shell.' }),
  level(16, 'Dew Garden', 'Fern Hollow', ['BBBOOOPPP', 'bbOOppYY', 'BBBOOOPPP', '.YYGGGG.'], 8, 'Crack the two shells in the order that opens a path to the bees.', { specials: [dew(0, 3), dew(0, 5)] }),
  level(17, 'Side by Side', 'The stone steps', ['RRRBBBGGG', 'rrBBggYY', 'RRR...GGG', '..YYPP..'], 8, 'Drop the comb before working through the dew.', { specials: [hc(2, 3), hc(2, 4), dew(3, 3)] }),
  level(18, 'Cottage Arch', 'The ivy arch', ['RRR...BBB', 'rrY..bbY', 'RRRYYYBBB', '..GGGG..', '..GGGG...'], 8, 'Solve one hanging side, then use the new space to reach the other.', { specials: [hc(3, 0)] }),
  level(19, 'Five Colours', 'The market road', ['OOORRRGGG', 'ooRRggPP', 'OOO...GGG', '..PPBB..'], 8, 'Keep an eye on the next bubble; swap before blocking a narrow path.', { specials: [hc(2, 4), dew(3, 3)] }),
  level(20, 'Bridge Home', 'Honeycomb Grove', ['RRROOOGGG', 'rrOOggBB', 'RRR...GGG', '.YYPPYY.', '.YYPPYY..'], 9, 'Cut a support, crack the dew, and use pollen to finish.', { specials: [hc(2, 3), hc(2, 4), dew(3, 3), pollen(4, 4)] }),

  level(21, 'First Breeze', 'Windmill field', ['RRRYYYGGG', 'rrYYggBB', 'RRRYYYGGG', '..BBPP..', '..B.P....'], 8, 'Watch the arrow. The marked strip moves every two shots.', { wind: { row: 4, start: 2, length: 3 }, specials: [hc(4, 3)], tutorial: 'The breeze shifts the marked strip after every two shots. The arrow shows its next move.' }),
  level(22, 'Crosswind', 'The windmill path', ['OOOBBBGGG', 'ooBBggYY', 'OOOBBBGGG', '..YYPP..', '..PPP....'], 8, 'Set up the bank before the strip shifts.', { wind: { row: 4, start: 2, length: 3 }, specials: [hc(3, 6)] }),
  level(23, 'Bee Line', 'Tall-grass trail', ['RRRYYYBBB', 'rrYYbbGG', 'RRRYYYBBB', '..GGPP..', '..pPP....'], 9, 'The breeze carries a bee. Plan where it will be after the next move.', { wind: { row: 4, start: 2, length: 3 } }),
  level(24, 'Wind and Dew', 'The damp orchard', ['BBBOOOPPP', 'bbOOppYY', 'BBBOOOPPP', '..YYGG..', '..GGG....'], 9, 'Crack the dew before the wind shifts its support.', { wind: { row: 4, start: 2, length: 3 }, specials: [dew(3, 3)] }),
  level(25, 'Colour-Changing Bloom', 'The lantern garden', ['RRRGYYGGG', 'rrYYggBB', 'RRRYYYGGG', '..BBPP..', '..PPP....'], 9, 'The striped bloom changes between two shown colors after each shot.', { wind: { row: 4, start: 2, length: 3 }, specials: [bloom(0, 3, 'Y')], tutorial: 'Striped blooms switch between their two colors after each shot. Match the color you see now.' }),
  level(26, 'Bloom Watch', 'The stone garden', ['OOOGBBGGG', 'ooBBggYY', 'OOO...GGG', '..YYPP..', '..PPP....'], 9, 'Time the bloom match before dropping the comb.', { specials: [hc(2, 3), hc(2, 4), bloom(0, 3, 'B')] }),
  level(27, 'Swaying Colours', 'The breezy rise', ['RRRYPPGGG', 'rrPPggYY', 'RRRPPPGGG', '..YYY...', '..PPP....'], 10, 'The moving strip and changing bloom resolve after each shot.', { wind: { row: 4, start: 2, length: 3 }, specials: [bloom(0, 3, 'P')] }),
  level(28, 'A Fine Tangle', 'The secret hedge', ['BBBOOOPPP', 'bbOOppYY', 'BBBOOOPPP', '..YYGG..', '..GGG....'], 10, 'Use the pollen to buy time before the breeze covers your route.', { wind: { row: 4, start: 2, length: 3 }, specials: [dew(3, 3), pollen(2, 4)] }),
  level(29, 'Last Orchard', 'The autumn gate', ['OOOGRRGGG', 'ooRRggPP', 'OOO...GGG', '..PPBB..', '..PPP....'], 10, 'Drop the comb before the bloom changes the group you need.', { wind: { row: 4, start: 2, length: 3 }, specials: [hc(2, 3), hc(2, 4), bloom(0, 3, 'R')] }),
  level(30, 'Bramble’s Reunion', 'Home at last', ['RRRGOOGGG', 'rrOOggBB', 'RRR...GGG', '..YYPP..', '..PPP....'], 11, 'Use everything you learned: bank, drop, watch the breeze, and time the bloom.', { wind: { row: 4, start: 2, length: 3 }, specials: [hc(2, 3), hc(2, 4), bloom(0, 3, 'O'), pollen(4, 3)] })
];
