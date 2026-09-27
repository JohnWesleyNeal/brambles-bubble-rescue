export type BubbleColor = 'R' | 'O' | 'Y' | 'G' | 'B' | 'P';
export type TileKind = 'normal' | 'pollen' | 'honeycomb' | 'dew' | 'bloom';
export interface Cell { row: number; col: number }
export interface WindStrip { row: number; start: number; length: number }
export type SpecialTile = Cell & (
  | { kind: 'honeycomb' }
  | { kind: 'pollen' | 'dew' }
  | { kind: 'bloom'; alternate: BubbleColor }
);
export interface Bubble {
  color: BubbleColor | null;
  bee: boolean;
  kind: TileKind;
  alternate?: BubbleColor;
}
export interface OccupiedCell extends Cell { bubble: Bubble }
export interface SettleResult {
  placed: Cell | null;
  popped: OccupiedCell[];
  dropped: OccupiedCell[];
  cracked: Cell[];
  beesFreed: number;
  bonusShots: number;
}
export interface TurnResult {
  moved: boolean;
  changed: Cell[];
  dropped: OccupiedCell[];
  beesFreed: number;
  bonusShots: number;
  moves: { from: Cell; to: Cell }[];
}

export const GRID_LEFT = 51;
export const GRID_TOP = 188;
export const GRID_STEP_X = 36;
export const GRID_STEP_Y = 31.18;
export const BUBBLE_RADIUS = 17;
export const MAX_ROWS = 15;
const COLORS = new Set<BubbleColor>(['R', 'O', 'Y', 'G', 'B', 'P']);
const key = (cell: Cell): string => `${cell.row}:${cell.col}`;

export function columnsInRow(row: number): number { return row % 2 === 0 ? 9 : 8; }
export function cellPosition(cell: Cell): { x: number; y: number } {
  return { x: GRID_LEFT + cell.col * GRID_STEP_X + (cell.row % 2) * GRID_STEP_X / 2, y: GRID_TOP + cell.row * GRID_STEP_Y };
}
export function neighborCells(cell: Cell): Cell[] {
  const { row, col } = cell;
  const options: Cell[] = [{ row, col: col - 1 }, { row, col: col + 1 }];
  for (const adjacentRow of [row - 1, row + 1]) {
    if (row % 2 === 0) options.push({ row: adjacentRow, col: col - 1 }, { row: adjacentRow, col });
    else options.push({ row: adjacentRow, col }, { row: adjacentRow, col: col + 1 });
  }
  return options.filter((candidate) => candidate.row >= 0 && candidate.row < MAX_ROWS && candidate.col >= 0 && candidate.col < columnsInRow(candidate.row));
}

export class BubbleBoard {
  private cells = new Map<string, Bubble>();
  private windOffset = 0;

  constructor(rows: string[], specials: SpecialTile[] = []) {
    rows.forEach((text, row) => {
      if (text.length !== columnsInRow(row)) throw new Error(`Row ${row} needs ${columnsInRow(row)} cells`);
      [...text].forEach((symbol, col) => {
        if (symbol === '.') return;
        const color = symbol.toUpperCase() as BubbleColor;
        if (!COLORS.has(color)) throw new Error(`Unknown bubble ${symbol}`);
        this.cells.set(key({ row, col }), { color, bee: symbol !== color, kind: 'normal' });
      });
    });
    for (const special of specials) {
      if (special.row < 0 || special.row >= MAX_ROWS || special.col < 0 || special.col >= columnsInRow(special.row)) {
        throw new Error(`Special outside board: ${key(special)}`);
      }
      const current = this.get(special);
      if (special.kind === 'honeycomb') {
        if (current) throw new Error(`Honeycomb needs an empty cell: ${key(special)}`);
        this.cells.set(key(special), { color: null, bee: false, kind: 'honeycomb' });
      } else {
        if (!current || !current.color || current.kind !== 'normal') throw new Error(`Special needs a colored bubble: ${key(special)}`);
        this.cells.set(key(special), {
          ...current, kind: special.kind,
          ...(special.kind === 'bloom' ? { alternate: special.alternate } : {})
        });
      }
    }
  }

  get(cell: Cell): Bubble | undefined { return this.cells.get(key(cell)); }
  entries(): OccupiedCell[] {
    return [...this.cells.entries()].map(([address, bubble]) => {
      const [row, col] = address.split(':').map(Number);
      return { row, col, bubble };
    });
  }
  beeCount(): number { return this.entries().filter(({ bubble }) => bubble.bee).length; }
  availableColors(): BubbleColor[] {
    return [...new Set(this.entries().map(({ bubble }) => bubble.color).filter((color): color is BubbleColor => color !== null))];
  }
  beeColors(): BubbleColor[] {
    return [...new Set(this.entries().filter(({ bubble }) => bubble.bee && bubble.color).map(({ bubble }) => bubble.color as BubbleColor))];
  }
  exposedColors(): BubbleColor[] {
    return [...new Set(this.entries()
      .filter(({ row, col, bubble }) => bubble.color && neighborCells({ row, col }).some((cell) => cell.row > row && !this.get(cell)))
      .map(({ bubble }) => bubble.color as BubbleColor))];
  }
  isOverflowing(): boolean { return this.entries().some(({ row }) => row >= 14); }
  windPosition(): number { return this.windOffset; }

  nearestOccupied(x: number, y: number): OccupiedCell | undefined {
    let found: OccupiedCell | undefined;
    let best = Infinity;
    for (const entry of this.entries()) {
      const point = cellPosition(entry);
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < best) { best = distance; found = entry; }
    }
    return best <= GRID_STEP_X ? found : undefined;
  }

  placementFor(x: number, y: number, impact?: Cell): Cell | null {
    let candidates: Cell[] = impact
      ? neighborCells(impact).filter((cell) => !this.get(cell))
      : Array.from({ length: 9 }, (_, col) => ({ row: 0, col })).filter((cell) => !this.get(cell));
    if (candidates.length === 0) {
      const found = new Map<string, Cell>();
      for (const cell of this.entries()) {
        for (const neighbor of neighborCells(cell)) if (!this.get(neighbor)) found.set(key(neighbor), neighbor);
      }
      candidates = [...found.values()];
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const pointA = cellPosition(a);
      const pointB = cellPosition(b);
      return Math.hypot(pointA.x - x, pointA.y - y) - Math.hypot(pointB.x - x, pointB.y - y);
    });
    return candidates[0];
  }

  settle(cell: Cell, bubble: Bubble, minimumGroup = 3): SettleResult {
    if (this.get(cell)) throw new Error('Cell already occupied');
    this.cells.set(key(cell), bubble);
    const group = this.connected(cell, (other) => other.color === bubble.color);
    return this.clearGroup(group.length >= minimumGroup ? group : [], cell);
  }

  rainbowGroup(cell: Cell): Cell[] {
    const color = this.get(cell)?.color;
    return color ? this.connected(cell, (bubble) => bubble.color === color) : [];
  }

  rainbow(cell: Cell): SettleResult {
    const group = this.rainbowGroup(cell);
    if (!group.length) throw new Error('Rainbow needs a colored target');
    return this.clearGroup(group, null);
  }

  private clearGroup(group: Cell[], placed: Cell | null): SettleResult {
    const popped: OccupiedCell[] = [];
    const cracked: Cell[] = [];
    if (group.length) {
      for (const member of group) {
        const tile = this.get(member)!;
        if (tile.kind === 'dew') {
          this.cells.set(key(member), { ...tile, kind: 'normal' });
          cracked.push(member);
        } else {
          popped.push({ ...member, bubble: tile });
          this.cells.delete(key(member));
        }
      }
      for (const member of popped) {
        for (const neighbor of neighborCells(member)) {
          const tile = this.get(neighbor);
          if (tile?.kind === 'dew') {
            this.cells.set(key(neighbor), { ...tile, kind: 'normal' });
            cracked.push(neighbor);
          }
        }
      }
    }
    const dropped = popped.length ? this.dropUnanchored() : [];
    const cleared = [...popped, ...dropped];
    return {
      placed, popped, dropped, cracked,
      beesFreed: cleared.filter(({ bubble: tile }) => tile.bee).length,
      bonusShots: cleared.filter(({ bubble: tile }) => tile.kind === 'pollen').length * 2
    };
  }

  bonk(cell: Cell): SettleResult {
    const bubble = this.get(cell);
    if (!bubble) throw new Error('Bonk needs a tile');
    this.cells.delete(key(cell));
    const popped = [{ ...cell, bubble }];
    const dropped = this.dropUnanchored();
    const cleared = [...popped, ...dropped];
    return {
      placed: null, popped, dropped, cracked: [],
      beesFreed: cleared.filter(({ bubble: tile }) => tile.bee).length,
      bonusShots: cleared.filter(({ bubble: tile }) => tile.kind === 'pollen').length * 2
    };
  }

  bloomGroup(cell: Cell): Cell[] {
    if (!this.get(cell)?.color) return [];
    return [cell, ...neighborCells(cell)].filter((candidate) => Boolean(this.get(candidate)?.color));
  }

  bloomBurst(cell: Cell): SettleResult {
    return this.clearGroup(this.bloomGroup(cell), null);
  }

  advanceTurn(turn: number, wind?: WindStrip): TurnResult {
    const changed: Cell[] = [];
    const moves: TurnResult['moves'] = [];
    for (const cell of this.entries()) {
      const tile = cell.bubble;
      if (tile.kind === 'bloom' && tile.alternate && tile.color) {
        this.cells.set(key(cell), { ...tile, color: tile.alternate, alternate: tile.color });
        changed.push(cell);
      }
    }
    let moved = false;
    if (wind && turn % 2 === 0) {
      const from = wind.start + this.windOffset;
      const direction = this.windOffset === 0 ? 1 : -1;
      const edge = { row: wind.row, col: direction === 1 ? from + wind.length : from - 1 };
      if (edge.col >= 0 && edge.col < columnsInRow(wind.row) && !this.get(edge)) {
        const cargo: OccupiedCell[] = [];
        for (let col = from; col < from + wind.length; col += 1) {
          const tile = this.get({ row: wind.row, col });
          if (tile) cargo.push({ row: wind.row, col, bubble: tile });
        }
        if (cargo.length) {
          for (const cell of cargo) this.cells.delete(key(cell));
          for (const cell of cargo) {
            const to = { row: cell.row, col: cell.col + direction };
            this.cells.set(key(to), cell.bubble);
            moves.push({ from: { row: cell.row, col: cell.col }, to });
          }
          this.windOffset = 1 - this.windOffset;
          moved = true;
        }
      }
    }
    const dropped = moved ? this.dropUnanchored() : [];
    return {
      moved, changed, dropped, moves,
      beesFreed: dropped.filter(({ bubble }) => bubble.bee).length,
      bonusShots: dropped.filter(({ bubble }) => bubble.kind === 'pollen').length * 2
    };
  }

  private dropUnanchored(): OccupiedCell[] {
    const anchored = new Set<string>();
    for (let col = 0; col < 9; col += 1) {
      const top = { row: 0, col };
      if (this.get(top)) for (const member of this.connected(top, () => true)) anchored.add(key(member));
    }
    const dropped: OccupiedCell[] = [];
    for (const member of this.entries()) {
      if (!anchored.has(key(member))) { dropped.push(member); this.cells.delete(key(member)); }
    }
    return dropped;
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
