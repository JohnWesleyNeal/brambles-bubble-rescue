export type BubbleColor = 'R' | 'O' | 'Y' | 'G' | 'B' | 'P';

export interface Bubble {
  color: BubbleColor;
  bee: boolean;
}

export interface Cell {
  row: number;
  col: number;
}

export interface OccupiedCell extends Cell {
  bubble: Bubble;
}

export interface SettleResult {
  placed: Cell;
  popped: OccupiedCell[];
  dropped: OccupiedCell[];
  beesFreed: number;
}

export const GRID_LEFT = 51;
export const GRID_TOP = 188;
export const GRID_STEP_X = 36;
export const GRID_STEP_Y = 31.18;
export const BUBBLE_RADIUS = 17;
export const MAX_ROWS = 15;

const COLORS = new Set<BubbleColor>(['R', 'O', 'Y', 'G', 'B', 'P']);

export function columnsInRow(row: number): number {
  return row % 2 === 0 ? 9 : 8;
}

export function cellPosition(cell: Cell): { x: number; y: number } {
  return {
    x: GRID_LEFT + cell.col * GRID_STEP_X + (cell.row % 2) * GRID_STEP_X / 2,
    y: GRID_TOP + cell.row * GRID_STEP_Y
  };
}

export function neighborCells(cell: Cell): Cell[] {
  const { row, col } = cell;
  const options: Cell[] = [{ row, col: col - 1 }, { row, col: col + 1 }];
  for (const adjacentRow of [row - 1, row + 1]) {
    if (row % 2 === 0) {
      options.push({ row: adjacentRow, col: col - 1 }, { row: adjacentRow, col });
    } else {
      options.push({ row: adjacentRow, col }, { row: adjacentRow, col: col + 1 });
    }
  }
  return options.filter((candidate) => candidate.row >= 0 && candidate.row < MAX_ROWS && candidate.col >= 0 && candidate.col < columnsInRow(candidate.row));
}

function key(cell: Cell): string {
  return `${cell.row}:${cell.col}`;
}

export class BubbleBoard {
  private cells = new Map<string, Bubble>();

  constructor(rows: string[]) {
    rows.forEach((text, row) => {
      if (text.length !== columnsInRow(row)) {
        throw new Error(`Row ${row} needs ${columnsInRow(row)} cells`);
      }
      [...text].forEach((symbol, col) => {
        if (symbol === '.') return;
        const color = symbol.toUpperCase() as BubbleColor;
        if (!COLORS.has(color)) throw new Error(`Unknown bubble ${symbol}`);
        this.cells.set(key({ row, col }), { color, bee: symbol !== color });
      });
    });
  }

  get(cell: Cell): Bubble | undefined {
    return this.cells.get(key(cell));
  }

  entries(): OccupiedCell[] {
    return [...this.cells.entries()].map(([address, bubble]) => {
      const [row, col] = address.split(':').map(Number);
      return { row, col, bubble };
    });
  }

  beeCount(): number {
    return this.entries().filter(({ bubble }) => bubble.bee).length;
  }

  availableColors(): BubbleColor[] {
    return [...new Set(this.entries().map(({ bubble }) => bubble.color))];
  }

  beeColors(): BubbleColor[] {
    return [...new Set(this.entries().filter(({ bubble }) => bubble.bee).map(({ bubble }) => bubble.color))];
  }

  isOverflowing(): boolean {
    return this.entries().some(({ row }) => row >= 14);
  }

  nearestOccupied(x: number, y: number): OccupiedCell | undefined {
    let found: OccupiedCell | undefined;
    let best = Infinity;
    for (const entry of this.entries()) {
      const point = cellPosition(entry);
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < best) {
        best = distance;
        found = entry;
      }
    }
    return best <= GRID_STEP_X ? found : undefined;
  }

  placementFor(x: number, y: number, impact?: Cell): Cell {
    let candidates: Cell[];
    if (impact) {
      candidates = neighborCells(impact).filter((cell) => !this.get(cell));
    } else {
      candidates = Array.from({ length: 9 }, (_, col) => ({ row: 0, col })).filter((cell) => !this.get(cell));
    }
    if (candidates.length === 0) {
      const found = new Map<string, Cell>();
      for (const cell of this.entries()) {
        for (const neighbor of neighborCells(cell)) {
          if (!this.get(neighbor)) found.set(key(neighbor), neighbor);
        }
      }
      candidates = [...found.values()];
    }
    if (candidates.length === 0) throw new Error('No room for another bubble');
    candidates.sort((a, b) => {
      const pointA = cellPosition(a);
      const pointB = cellPosition(b);
      return Math.hypot(pointA.x - x, pointA.y - y) - Math.hypot(pointB.x - x, pointB.y - y);
    });
    return candidates[0];
  }

  settle(cell: Cell, bubble: Bubble): SettleResult {
    if (this.get(cell)) throw new Error('Cell already occupied');
    this.cells.set(key(cell), bubble);
    const group = this.connected(cell, (other) => other.color === bubble.color);
    const popped: OccupiedCell[] = [];
    const dropped: OccupiedCell[] = [];
    if (group.length >= 3) {
      for (const member of group) {
        popped.push({ ...member, bubble: this.get(member)! });
        this.cells.delete(key(member));
      }
      const anchored = new Set<string>();
      for (let col = 0; col < 9; col += 1) {
        const top = { row: 0, col };
        if (this.get(top)) {
          for (const member of this.connected(top, () => true)) anchored.add(key(member));
        }
      }
      for (const member of this.entries()) {
        if (!anchored.has(key(member))) {
          dropped.push(member);
          this.cells.delete(key(member));
        }
      }
    }
    return {
      placed: cell,
      popped,
      dropped,
      beesFreed: [...popped, ...dropped].filter(({ bubble: item }) => item.bee).length
    };
  }

  private connected(start: Cell, accepts: (bubble: Bubble) => boolean): Cell[] {
    const found: Cell[] = [];
    const visited = new Set<string>();
    const queue = [start];
    while (queue.length) {
      const cell = queue.shift()!;
      if (visited.has(key(cell))) continue;
      visited.add(key(cell));
      const bubble = this.get(cell);
      if (!bubble || !accepts(bubble)) continue;
      found.push(cell);
      queue.push(...neighborCells(cell));
    }
    return found;
  }
}
