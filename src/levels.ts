import type { BubbleColor } from './board';

export interface LevelDefinition {
  name: string;
  place: string;
  rows: string[];
  shots: number;
  colors: BubbleColor[];
}

// Lowercase letters mark bubbles holding a bee friend.
// Even rows have 9 cells; odd rows have 8.
export const levels: LevelDefinition[] = [
  {
    name: 'Hedgerow Hello',
    place: 'The sunny garden',
    shots: 25,
    colors: ['R', 'Y', 'G'],
    rows: ['RRRYYYGGG', 'rrYYgg..', 'RRRYYYGGG']
  },
  {
    name: 'Tea-Time Tangle',
    place: 'The wildflower path',
    shots: 27,
    colors: ['O', 'G', 'B', 'Y'],
    rows: ['OOOGGGBBB', 'ooGGbbYY', 'OOOGGGBBB', '..YYGG..']
  },
  {
    name: 'Berry Brambles',
    place: 'The berry patch',
    shots: 29,
    colors: ['R', 'P', 'G', 'Y'],
    rows: ['RRRPPPGGG', 'rrPPggYY', 'RRRPPPGGG', '..YYY...']
  },
  {
    name: 'Clover Crossing',
    place: 'The clover meadow',
    shots: 32,
    colors: ['B', 'O', 'P', 'Y', 'G'],
    rows: ['BBBOOOPPP', 'bbOOppYY', 'BBBOOOPPP', '.YYGGGG.', '.YYYGGG..']
  },
  {
    name: 'Golden Hour',
    place: 'The orchard',
    shots: 34,
    colors: ['Y', 'R', 'G', 'P', 'B'],
    rows: ['YYYRRRGGG', 'yyRRggPP', 'YYYRRRGGG', '..PPPBBB', '...PPBBBB']
  },
  {
    name: 'Homeward Bound',
    place: 'Bramble’s cottage',
    shots: 38,
    colors: ['R', 'O', 'G', 'P', 'Y', 'B'],
    rows: ['RRROOOGGG', 'rrOOggBB', 'RRROOOGGG', 'PPPPYYYY', 'PPPBBYYYY', '..PBBY..']
  }
];
