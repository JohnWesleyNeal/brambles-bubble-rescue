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
  flightPath?: Cell[];
}

const hc = (row: number, col: number): SpecialTile => ({ row, col, kind: 'honeycomb' });
const pollen = (row: number, col: number): SpecialTile => ({ row, col, kind: 'pollen' });
const dew = (row: number, col: number): SpecialTile => ({ row, col, kind: 'dew' });
const bloom = (row: number, col: number, alternate: BubbleColor): SpecialTile => ({ row, col, kind: 'bloom', alternate });

// Additional bee positions keep later puzzles focused on every part of the board.
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
  const margin = chapter === 'beginner' ? 5 : chapter === 'intermediate' ? 4 : 3;
  const introExtra = options.tutorial ? 2 : 0;
  const colors = [...new Set([...rows.join('').toUpperCase().replace(/\./g, ''), ...(options.specials ?? []).flatMap((tile) => tile.kind === 'bloom' ? [tile.alternate] : [])])] as BubbleColor[];
  return {
    id, name, place, chapter, rows, par,
    shots: options.shots ?? par + margin + introExtra,
    colors, specials: options.specials ?? [], wind: options.wind,
    hint, tutorial: options.tutorial, seed: id * 137 + 17
  };
}

// Lowercase color letters hold bee friends. Even rows have 9 cells; odd rows have 8.
// First clears still award stars on refreshed layouts; saved progress is retained.
export const legacyLevels: LevelDefinition[] = [
  level(1, 'Hedgerow Hello', 'The sunny garden', ['RRRYYYGGG', 'rrYYgg..', 'RRRYYYGGG'], 4, 'Aim at the red or green group beneath a bee.', { shots: 25, tutorial: 'Match three or more bubbles of one color to free the bee friends.' }),
  level(2, 'Tea-Time Tangle', 'The wildflower path', ['OOOGG.BBB', 'ooGGbbYY', 'OOOGGGBBB', '..YYGG..'], 5, 'Swap the next bubble, or pick Rainbow Pop from your Bag for exactly the color you need.', { shots: 19, tutorial: 'Rainbow Pop lets you choose any color still on the board. Open your Bag, choose its color, then aim. Your first one is a gift.' }),
  level(3, 'Berry Brambles', 'The berry patch', ['RRRPPPGGG', 'rrPPggYY', 'RRRPPPGGG', '..YyY...'], 5, 'Aim at a supporting group and let the bubbles below it fall.', { shots: 17, tutorial: 'A group no longer connected to the top falls. Dropped bees count as rescued too.' }),
  level(4, 'Clover Crossing', 'The clover meadow', ['BBBOOOPPP', 'bbOOppYY', 'BBBOOOPPP', '.YYGGGG.', '.YYYGGg..'], 6, 'Clear a golden pollen bubble for two extra shots.', { shots: 18, specials: [pollen(3, 3)], tutorial: 'Golden pollen gives you two extra shots when popped or dropped. Tap its label or Rules whenever you need a reminder.' }),
  level(5, 'Golden Hour', 'The orchard', ['YYYRRRGGG', 'yyRRggPP', 'YYYRRRGGG', '..PPPBBB', '...pPBBBB'], 7, 'Double Pop can clear a pair that needs one last bubble.', { shots: 18, tutorial: 'Double Pop clears a pair with your shot instead of needing three. One is waiting in your Bag.' }),
  level(6, 'Homeward Bound', 'Bramble’s cottage', ['RRROOOGGG', 'rrOOggBB', 'RRROOOGGG', 'PPPPYYYY', 'PPPBBYYYY', '..pBbY..'], 8, 'Follow the dotted guide off the side wall to reach around the crowded middle.', { shots: 20, tutorial: 'Shots bounce off the side walls. The dotted guide shows each bank before you fire.' }),

  level(7, 'The Long Way Round', 'Old stone wall', ['RRR...GGG', 'rrY..ggY', 'RRRYYYGGG', '..YYY...'], 5, 'Bounce around the wall, then drop the hanging group.', { specials: [pollen(2, 4)] }),
  level(8, 'Snip the Stem', 'The willow branch', ['RRRYYYGGG', 'rrYYggBB', 'RRRYYYGGG', '..BB....'], 6, 'Honeycomb will not match. Drop its support or use Bonk from your Bag.', { specials: [hc(3, 4)], tutorial: 'Honeycomb blocks shots and cannot color match. Bonk removes the exact bubble you hit—even honeycomb. Your first Bonk is a gift.' }),
  level(9, 'Pollen Picnic', 'The picnic field', ['OOOYYYGGG', 'ooYYggPP', 'OOOYYYGGG', '..PPBB..'], 6, 'The golden flower gives back two bubbles if you pop or drop it.', { specials: [pollen(2, 4)], tutorial: 'Golden pollen bubbles give you two extra shots when cleared or dropped.' }),
  level(10, 'Garden Party', 'The summer fete', ['RRROOOGGG', 'rrOOggBB', 'RRROOOGGG', '.YYPPYY.'], 7, 'Use a bank shot to cut a support, then collect the pollen.', { specials: [pollen(3, 3)] }),

  level(11, 'Honeycomb Gate', 'The old apiary', ['RRRYYYGGG', 'rrYYggBB', 'RRR...GGG', '..BBPP..'], 6, 'The dew shell needs a crack before you can clear it.', { specials: [hc(2, 3), hc(2, 4), hc(2, 5), dew(0, 3)], tutorial: 'Dew survives its first match. Pop beside it or match it to crack the shell, then clear the bubble. Tap Rules to check any bubble.' }),
  level(12, 'Under the Comb', 'The bees’ bridge', ['OOOBBBGGG', 'ooBBggYY', 'OOO...GGG', '..YYPP..'], 7, 'Start at the sides and let the centre honeycomb fall.', { specials: [hc(2, 3), hc(2, 4), hc(2, 5)] }),
  level(13, 'Narrow Lanes', 'Bramble Lane', ['RRRYYYBBB', 'rrYYbbGG', 'RRR...BBB', '..GGPP..'], 7, 'A wall bank can slip past the honeycomb.', { specials: [hc(2, 3), hc(2, 4)] }),
  level(14, 'Pollen Shortcut', 'The clover gate', ['OOOPPPGGG', 'ooPPggYY', 'OOO...GGG', '..YYBB..'], 7, 'Free the pollen before taking the long route around the comb.', { specials: [hc(2, 3), hc(2, 4), pollen(3, 3)] }),
  level(15, 'Morning Dew', 'The misty meadow', ['RRRYYYGGG', 'rrYYggBB', 'RRRYYYGGG', '..BBPP..'], 7, 'Pop beside the shell first, then match its color to free the bee inside.', { specials: [dew(0, 3), dew(1, 6)] }),
  level(16, 'First Breeze', 'Fern Hollow', ['RRRYYYGGG', 'rrYYggBB', 'RRRYYYGGG', '..BBPP..', '..B.P....'], 4, 'The marked strip tries to move every two shots. Its cargo can lose support.', { shots: 8, wind: { row: 4, start: 2, length: 3 }, specials: [dew(0, 3)], tutorial: 'The breeze shifts the marked strip after every two shots if the next space is clear. Watch the arrow and plan around its timing.' }),
  level(17, 'Side by Side', 'The stone steps', ['OOOBBBGGG', 'ooBBggYY', 'OOOBBBGGG', '..YYPP..', '..PPP....'], 4, 'Crack dew, then catch the wind when its route opens.', { shots: 7, wind: { row: 4, start: 2, length: 3 }, specials: [hc(3, 6), dew(0, 3)] }),
  level(18, 'Cottage Arch', 'The ivy arch', ['RRR...BBB', 'rrY..bbY', 'RRRYYYBBB', '..GGGG..', '..GGGG...'], 7, 'A bank can reach a side support while the pollen buys two more shots.', { shots: 9, wind: { row: 4, start: 2, length: 4 }, specials: [hc(3, 0), pollen(4, 4)] }),
  level(19, 'Changing Bloom', 'The market road', ['OOORRRGGG', 'ooRRggPP', 'OOO...GGG', '..PPBB..'], 7, 'The striped bloom switches colors after every shot; match what you see now.', { shots: 9, specials: [hc(2, 4), dew(3, 3), bloom(0, 3, 'O')], tutorial: 'Striped blooms switch between their two colors after every shot. Aim for the color you see now; you can inspect it anytime.' }),
  level(20, 'Bridge Home', 'Honeycomb Grove', ['RRROOOGGG', 'rrOOggBB', 'RRR...GGG', '.YYPPYY.', '..YPP.Y..'], 5, 'Clear a support, then use the shifting strip and pollen to finish.', { shots: 8, wind: { row: 4, start: 2, length: 3 }, specials: [hc(2, 3), hc(2, 4), dew(3, 3), pollen(4, 4), bloom(0, 3, 'P')] }),

  level(21, 'Windmill Detour', 'Windmill field', ['RRRYYYGGG', 'rrYYggBB', 'RRRYYYGGG', '..BBPP..', '..B.P....', '..BBPP..', '...bpp...'], 5, 'Cut the support above the lower bees before the breeze moves their bridge.', { shots: 8, wind: { row: 4, start: 2, length: 3 }, specials: [hc(4, 3), dew(0, 5)] }),
  level(22, 'Crosswind', 'The windmill path', ['OOOBBBGGG', 'ooBBggYY', 'OOOBBBGGG', '..YYPP..', '..PPP....', '..PPY...', '...pY....'], 5, 'Set up the bank before the strip shifts and the lower pollen falls.', { shots: 7, wind: { row: 4, start: 2, length: 3 }, specials: [hc(3, 6), pollen(5, 3)] }),
  level(23, 'Bee Line', 'Tall-grass trail', ['RRRYYYBBB', 'rrYYbbGG', 'RRRYYYBBB', '..GGPP..', '..pPP....', '..GPP...', '...gp....'], 4, 'The breeze carries a bee. Rescue the lower pair before your route fills.', { shots: 6, wind: { row: 4, start: 2, length: 3 }, specials: [dew(3, 3)] }),
  level(24, 'Wind and Dew', 'The damp orchard', ['BBBOOOPPP', 'bbOOppYY', 'BBBOOOPPP', '..YYGG..', '..GGG....', '..GYG...', '...gy....'], 4, 'Crack the dew before the wind shifts its support.', { shots: 6, wind: { row: 4, start: 2, length: 3 }, specials: [dew(3, 3), hc(5, 5)] }),
  level(25, 'Lantern Garden', 'The lantern garden', ['RRRGYYGGG', 'rrYYggBB', 'RRRYYYGGG', '..BBPP..', '..PPP....', '..BPP...', '...bp....'], 3, 'Watch the bloom, then use the breeze to loosen the lower branch.', { shots: 5, wind: { row: 4, start: 2, length: 3 }, specials: [bloom(0, 3, 'Y'), hc(5, 5)] }),
  level(26, 'Bloom Watch', 'The stone garden', ['OOOGBBGGG', 'ooBBggYY', 'OOO...GGG', '..YYPP..', '..PPP....', '..YPY...', '...yp....'], 5, 'Time the bloom match before dropping the comb and reaching the lower bees.', { shots: 7, specials: [hc(2, 3), hc(2, 4), bloom(0, 3, 'B'), dew(3, 3)] }),
  level(27, 'Swaying Colours', 'The breezy rise', ['RRRYPPGGG', 'rrPPggYY', 'RRRPPPGGG', '..YYY...', '..PPP....', '..PYP...', '...py....'], 3, 'The moving strip and changing bloom resolve after each shot.', { shots: 5, wind: { row: 4, start: 2, length: 3 }, specials: [bloom(0, 3, 'P'), pollen(5, 3)] }),
  level(28, 'A Fine Tangle', 'The secret hedge', ['BBBOOOPPP', 'bbOOppYY', 'BBBOOOPPP', '..YYGG..', '..GGG....', '..GYG...', '...gy....'], 5, 'Use the pollen to buy time before the breeze covers your route.', { shots: 7, wind: { row: 4, start: 2, length: 3 }, specials: [dew(3, 3), pollen(2, 4), bloom(5, 3, 'Y')] }),
  level(29, 'Last Orchard', 'The autumn gate', ['OOOGRRGGG', 'ooRRggPP', 'OOO...GGG', '..PPBB..', '..PPP....', '..PBP...', '...pb....'], 4, 'Drop the comb before the bloom changes the group you need.', { shots: 6, wind: { row: 4, start: 2, length: 3 }, specials: [hc(2, 3), hc(2, 4), bloom(0, 3, 'R'), dew(5, 3)] }),
  level(30, 'Bramble’s Reunion', 'Home at last', ['RRRGOOGGG', 'rrOOggBB', 'RRR...GGG', '..YYPP..', '..PPP....', '..PYP...', '...py....'], 5, 'Use everything you learned: bank, drop, watch the breeze, and time the bloom.', { shots: 7, wind: { row: 4, start: 2, length: 3 }, specials: [hc(2, 3), hc(2, 4), bloom(0, 3, 'O'), pollen(4, 3), dew(5, 3)] })
];

// Frozen layouts above remain available for v1/v2 action logs. New attempts use
// this edition; completed stars and unlocks still belong to the same level IDs.
const refresh: Record<number, Partial<LevelDefinition>> = {
  7: { name: 'Two Little Branches', rows: ['RR.....GG', 'RR....GG', '.rR...Gg.', '.RR..GG.', '..R...G..'], specials: [], par: 5, shots: 12,
    hint: 'Two branches, two supports. A bank can reach the outside of either branch.',
    tutorial: 'Matches and falling bubbles fill your Bloom shot. Clear 12 bubbles to grow one. Equip it beside the launcher, then hit a colored bubble to burst it and its colored neighbors. Dew cracks; honeycomb stays.' },
  9: { name: 'The Picnic Chandelier', rows: ['...YYY...', '...YY...', '..OOO....', '..OoO...', '.PPPPPPP.', '.pP..Pp.'], specials: [pollen(2, 3)], par: 5, shots: 13,
    hint: 'The picnic hangs from a narrow stem. Clear a path up, or work around the sides.', tutorial: undefined },
  12: { name: 'Windows in the Hedge', rows: ['RRR...BBB', 'RR....BB', '.rR...Bb.', '.RR..BB.', '..R...B..', '..YY.YY.', '...yyy...'], specials: [hc(2, 4), hc(3, 3)], par: 6, shots: 14,
    hint: 'Look through the windows. The honeycomb can fall when both branches lose their hold.' },
  14: { name: 'Mabel’s Way Home', rows: ['.YYYYYYY.', '.PPPPPP.', '.GGGGGGG.', '.RRRRRR.', '.BBBBBBB.', '.OOOOOO.', '.........'], specials: [...Array.from({ length: 6 }, (_, row) => [hc(row, 0), hc(row, row % 2 ? 7 : 8)]).flat(), pollen(5, 4)], par: 9, shots: 16,
    flightPath: Array.from({ length: 7 }, (_, i) => ({ row: 6 - i, col: 4 })),
    hint: 'Clear the dotted flight path from the bottom upward. Mabel follows the open spaces to her hive.',
    tutorial: 'Mabel is flying home! Clear bubbles on the dotted route. She advances after each shot, stopping at the next blocked space. Reach the little hive to finish; every color can be cleared with normal matches.' },
  18: { name: 'The Ivy Teacup', rows: ['RR.....BB', 'RR....BB', '.rR...Bb.', '.RR..BB.', '..RR.BB..', '..RRBB..', '...YY....', '...yY...'], specials: [dew(0, 0), dew(0, 1), dew(0, 7), dew(0, 8), dew(2, 1), pollen(6, 3)], wind: undefined, par: 7, shots: 11,
    hint: 'The cup has two handles. Loosen both sides, or open the middle and reach a top support.' },
  23: { name: 'Mabel’s Garden Shortcut', rows: ['.PPPYYY..', '.PPYYYY.', '.GGGYYY..', '.GGRRRR.', '.GGBBBRR.', '.OOBBRR.', '.OOOBBB..', '........', '.........'], specials: [...Array.from({ length: 7 }, (_, row) => [hc(row, 0), hc(row, row % 2 ? 7 : 8)]).flat(), dew(4, 4), pollen(6, 4)], wind: undefined, par: 10, shots: 14,
    flightPath: Array.from({ length: 9 }, (_, i) => ({ row: 8 - i, col: 4 })),
    hint: 'Follow Mabel’s dotted route. Crack the dew before clearing the green gate; save Bloom for a crowded crossing.' }
};

export const levels: LevelDefinition[] = legacyLevels.map((original) => {
  const updated = { ...original, ...refresh[original.id] };
  if (original.id === 2) {
    updated.hint = 'Equip Rainbow beside the launcher and hit a colored group. It needs no matching pair.';
    updated.tutorial = 'Rainbow Pop bursts the connected color group it hits. Aim to see the group light up. Honeycomb blocks it and dew cracks first. Your first Rainbow is a gift.';
  }
  if (original.id === 5) updated.tutorial = 'Double Pop needs just a pair including your shot. Equip it beside the launcher; tap it again to cancel. Your first one is a gift.';
  updated.hint = updated.hint.replace('from your Bag', 'beside the launcher').replace('striped bloom', 'two-tone bloom');
  updated.tutorial = updated.tutorial?.replace('Striped blooms', 'Two-tone blooms');
  updated.colors = [...new Set([...updated.rows.join('').toUpperCase().replace(/\./g, ''), ...updated.specials.flatMap((tile) => tile.kind === 'bloom' ? [tile.alternate] : [])])] as BubbleColor[];
  return updated;
});
