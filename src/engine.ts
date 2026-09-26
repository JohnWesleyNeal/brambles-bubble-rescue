import { BubbleBoard, type BubbleColor, type SettleResult, type TurnResult } from './board';
import type { LevelDefinition } from './levels';
import type { BoosterId } from './boosters';
import { traceShot, type ShotTrace } from './shot';

export interface FireResult {
  trace: ShotTrace;
  settled?: SettleResult;
  turn?: TurnResult;
  color: BubbleColor;
  wild: boolean;
  booster?: BoosterId;
  won: boolean;
  lost: boolean;
}

class SeededRandom {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0; }
  next(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
}

export class GameEngine {
  readonly board: BubbleBoard;
  readonly level: LevelDefinition;
  readonly totalBees: number;
  private rng: SeededRandom;
  shots: number;
  turns = 0;
  freedBees = 0;
  currentColor: BubbleColor;
  nextColor: BubbleColor;
  wildColor?: BubbleColor;
  wildUsed = false;
  armedBooster?: { id: BoosterId; color?: BubbleColor };
  won = false;
  lost = false;

  constructor(level: LevelDefinition) {
    this.level = level;
    this.board = new BubbleBoard(level.rows, level.specials);
    this.totalBees = this.board.beeCount();
    this.rng = new SeededRandom(level.seed);
    this.shots = level.shots;
    this.currentColor = this.pickColor();
    this.nextColor = this.pickColor();
  }

  private pickColor(): BubbleColor {
    const favored = this.board.beeColors();
    const exposed = this.board.exposedColors();
    const pool = exposed.length && this.rng.next() < 0.8 ? exposed : (favored.length ? favored : this.board.availableColors());
    return pool[Math.floor(this.rng.next() * pool.length)] ?? 'R';
  }

  swap(): void {
    if (this.won || this.lost) return;
    [this.currentColor, this.nextColor] = [this.nextColor, this.currentColor];
  }

  chooseWild(color: BubbleColor): boolean {
    if (this.won || this.lost || this.wildUsed || !this.board.availableColors().includes(color)) return false;
    this.armedBooster = undefined;
    this.wildColor = color;
    return true;
  }

  armBooster(id: BoosterId, color?: BubbleColor): boolean {
    if (this.won || this.lost || (id === 'rainbow' && (!color || !this.board.availableColors().includes(color)))) return false;
    this.wildColor = undefined;
    this.armedBooster = { id, color };
    return true;
  }

  cancelSpecialShot(): void { this.armedBooster = undefined; this.wildColor = undefined; }

  shotColor(): BubbleColor { return this.armedBooster?.color ?? this.wildColor ?? this.currentColor; }

  preview(angle: number): ShotTrace { return traceShot(this.board, angle); }

  canFire(angle: number): boolean { return this.armedBooster?.id !== 'bonk' || Boolean(this.preview(angle).impact); }

  fire(angle: number): FireResult {
    if (this.won || this.lost) throw new Error('Level has ended');
    const trace = this.preview(angle);
    if (this.armedBooster?.id === 'bonk' && !trace.impact) throw new Error('Aim Bonk at a tile');
    const wild = Boolean(this.wildColor);
    const booster = this.armedBooster?.id;
    const color = this.shotColor();
    if (wild) { this.wildUsed = true; this.wildColor = undefined; }
    else {
      this.shots -= 1;
      this.currentColor = this.nextColor;
      this.nextColor = this.pickColor();
    }
    this.armedBooster = undefined;
    this.turns += 1;
    if (!trace.placement && booster !== 'bonk') {
      this.lost = true;
      return { trace, color, wild, booster, won: false, lost: true };
    }
    const settled = booster === 'bonk'
      ? this.board.bonk(trace.impact!)
      : this.board.settle(trace.placement!, { color, bee: false, kind: 'normal' }, booster === 'double' ? 2 : 3);
    const turn = this.board.advanceTurn(this.turns, this.level.wind);
    this.freedBees += settled.beesFreed + turn.beesFreed;
    this.shots += settled.bonusShots + turn.bonusShots;
    const active = this.board.availableColors();
    if (active.length) {
      if (!active.includes(this.currentColor)) this.currentColor = this.pickColor();
      if (!active.includes(this.nextColor)) this.nextColor = this.pickColor();
      if (this.wildColor && !active.includes(this.wildColor)) this.wildColor = undefined;
    }
    this.won = this.board.beeCount() === 0;
    this.lost = !this.won && (this.shots <= 0 || this.board.isOverflowing());
    return { trace, settled, turn, color, wild, booster, won: this.won, lost: this.lost };
  }
}
