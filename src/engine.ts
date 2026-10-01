import { BubbleBoard, type BubbleColor, type SettleResult, type TurnResult } from './board';
import type { LevelDefinition } from './levels';
import type { BoosterId } from './boosters';
import { challengeFor, type Activity } from './activities';
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
  bloom?: boolean;
  flight?: { from: number; to: number; arrived: boolean };
  bossBeat?: 'clasp' | 'screen' | 'stalled' | 'gate';
}

class SeededRandom {
  private state: number;
  clone(): SeededRandom { return new SeededRandom(this.state); }
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
  awaitingTopUp = false;
  bloomCharge = 0;
  bloomArmed = false;
  readonly bloomGoal = 12;
  flightStep = 0;
  usedHelp = false;
  largestDrop = 0;
  bankRescue = false;
  bankBees = 0;
  challengeRelaxed = false;
  screenStunned = false;

  constructor(level: LevelDefinition, readonly rulesVersion: 1 | 2 | 3 | 4 | 5 | 6 = 6, readonly activity?: Activity) {
    this.level = level;
    this.board = new BubbleBoard(level.rows, level.specials, rulesVersion >= 6);
    this.totalBees = this.board.beeCount() + (this.flightPath ? 1 : 0);
    this.advanceFlight();
    this.rng = new SeededRandom(level.seed);
    this.shots = level.shots;
    this.currentColor = this.pickColor();
    this.nextColor = this.pickColor();
  }

  get challenge() { return this.challengeRelaxed ? undefined : challengeFor(this.activity); }
  get guideHidden(): boolean { return Boolean(this.challenge?.noGuide); }
  get giftsAllowed(): boolean { return !this.challenge?.noGifts; }
  get refillsAllowed(): boolean { return !this.challenge?.noGifts && !this.challenge?.shotLimit; }
  get challengeComplete(): boolean { return Boolean(this.won && this.activity?.kind === 'challenge' && !this.challengeRelaxed && this.bankBees >= (this.challenge?.bankGoal ?? 0) && (!this.challenge?.shotLimit || this.turns <= this.challenge.shotLimit)); }
  relaxChallenge(): boolean {
    if (this.activity?.kind !== 'challenge' || this.challengeRelaxed || this.won || this.lost) return false;
    this.challengeRelaxed = true; return true;
  }
  get flightPath() { return this.rulesVersion >= 3 ? this.level.flightPath : undefined; }
  get bossReadout(): string | undefined {
    if (this.activity?.kind !== 'boss') return undefined;
    if (this.rulesVersion < 5) return `Phase ${this.activity.phase + 1} of 3`;
    if (this.activity.phase === 0) {
      const open = [0, 8].filter(col => !this.board.get({ row: 0, col })?.bee).length;
      return `${open}/2 clasps open`;
    }
    if (this.activity.phase === 1) return this.screenStunned ? 'Screen stalled by Bonk' : `Screen tries to shift in ${2 - this.turns % 2} ${this.turns % 2 ? 'shot' : 'shots'}`;
    return `Mabel: ${this.flightStep}/${this.flightPath?.length ?? 0} spaces open`;
  }
  // Independent simulation for contextual hints; never consumes the live queue.
  clone(): GameEngine {
    return Object.assign(new GameEngine(this.level, this.rulesVersion, this.activity), this, {
      board: this.board.clone(), rng: this.rng.clone(),
      armedBooster: this.armedBooster ? { ...this.armedBooster } : undefined
    });
  }
  get bloomUnlocked(): boolean { return this.rulesVersion >= 3 && this.level.id >= (this.rulesVersion >= 4 ? 9 : 7); }
  armBloom(): boolean {
    if (!this.bloomUnlocked || this.bloomCharge < this.bloomGoal || this.won || this.lost || this.awaitingTopUp) return false;
    this.cancelSpecialShot();
    this.bloomArmed = true;
    return true;
  }
  private advanceFlight(): void {
    const route = this.flightPath;
    if (!route) return;
    while (this.flightStep < route.length && !this.board.get(route[this.flightStep])) this.flightStep++;
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
    if (!this.giftsAllowed || this.won || this.lost || this.wildUsed || !this.board.availableColors().includes(color)) return false;
    this.armedBooster = undefined;
    this.bloomArmed = false;
    this.wildColor = color;
    return true;
  }

  armBooster(id: BoosterId, color?: BubbleColor): boolean {
    if (!this.giftsAllowed || this.won || this.lost || (id === 'rainbow' && this.rulesVersion === 1 && (!color || !this.board.availableColors().includes(color)))) return false;
    this.wildColor = undefined;
    this.bloomArmed = false;
    this.armedBooster = { id, ...(this.rulesVersion === 1 && color ? { color } : {}) };
    return true;
  }

  cancelSpecialShot(): void { this.armedBooster = undefined; this.wildColor = undefined; this.bloomArmed = false; }

  shotColor(): BubbleColor { return this.armedBooster?.color ?? this.wildColor ?? this.currentColor; }

  preview(angle: number): ShotTrace { return traceShot(this.board, angle, this.rulesVersion < 5); }

  canFire(angle: number): boolean {
    if (this.won || this.lost || this.awaitingTopUp) return false;
    const impact = this.preview(angle).impact;
    if (this.armedBooster?.id === 'bonk') return Boolean(impact);
    if (this.bloomArmed || (this.armedBooster?.id === 'rainbow' && this.rulesVersion >= 2)) return Boolean(impact && this.board.get(impact)?.color);
    return true;
  }

  topUp(): boolean {
    if (!this.refillsAllowed || !this.awaitingTopUp || this.won || this.lost) return false;
    this.shots += 5;
    this.usedHelp = true;
    this.awaitingTopUp = false;
    return true;
  }

  fire(angle: number): FireResult {
    if (this.won || this.lost) throw new Error('Level has ended');
    if (!this.canFire(angle)) throw new Error('Shot has no valid target or needs more bubbles');
    const trace = this.preview(angle);
    if (this.armedBooster?.id === 'bonk' && !trace.impact) throw new Error('Aim Bonk at a tile');
    const wild = Boolean(this.wildColor);
    const booster = this.armedBooster?.id;
    const bloom = this.bloomArmed;
    const rainbow = booster === 'rainbow' && this.rulesVersion >= 2;
    const color = rainbow ? this.board.get(trace.impact!)!.color! : this.shotColor();
    if (wild) { this.wildUsed = true; this.wildColor = undefined; }
    else {
      this.shots -= 1;
      this.currentColor = this.nextColor;
      this.nextColor = this.pickColor();
    }
    this.armedBooster = undefined;
    this.bloomArmed = false;
    if (bloom) this.bloomCharge = 0;
    if (booster || wild) this.usedHelp = true;
    this.turns += 1;
    if (!trace.placement && booster !== 'bonk' && !rainbow && !bloom) {
      this.lost = true;
      return { trace, color, wild, booster, won: false, lost: true };
    }
    const settled = booster === 'bonk'
      ? this.board.bonk(trace.impact!, this.rulesVersion >= 5)
      : bloom ? this.board.bloomBurst(trace.impact!)
      : rainbow ? this.board.rainbow(trace.impact!)
      : this.board.settle(trace.placement!, { color, bee: false, kind: 'normal' }, booster === 'double' ? 2 : 3);
    const bossScreen = this.rulesVersion >= 5 && this.activity?.kind === 'boss' && this.activity.phase === 1;
    if (bossScreen && booster === 'bonk' && trace.impact && this.level.wind && trace.impact.row === this.level.wind.row && trace.impact.col >= this.level.wind.start && trace.impact.col < this.level.wind.start + this.level.wind.length) this.screenStunned = true;
    const stall = Boolean(bossScreen && this.screenStunned && this.turns % 2 === 0);
    const turn = this.board.advanceTurn(this.turns, stall ? undefined : this.level.wind);
    if (stall) this.screenStunned = false;
    this.freedBees += settled.beesFreed + turn.beesFreed;
    const dropped = settled.dropped.length + turn.dropped.length;
    this.largestDrop = Math.max(this.largestDrop, dropped);
    const banked = trace.path.some((point, i, path) => i > 1 && (point.x - path[i - 1].x) * (path[i - 1].x - path[i - 2].x) < 0);
    if (banked && settled.beesFreed + turn.beesFreed > 0) { this.bankRescue = true; this.bankBees += settled.beesFreed + turn.beesFreed; }
    if (this.bloomUnlocked && !bloom) this.bloomCharge = Math.min(this.bloomGoal, this.bloomCharge + settled.popped.length + dropped);
    const from = this.flightStep;
    this.advanceFlight();
    const arrived = Boolean(this.flightPath && from < this.flightPath.length && this.flightStep === this.flightPath.length);
    if (arrived) this.freedBees++;
    this.shots += settled.bonusShots + turn.bonusShots;
    const active = this.board.availableColors();
    if (active.length) {
      if (!active.includes(this.currentColor)) this.currentColor = this.pickColor();
      if (!active.includes(this.nextColor)) this.nextColor = this.pickColor();
      if (this.wildColor && !active.includes(this.wildColor)) this.wildColor = undefined;
    }
    this.won = this.board.beeCount() === 0 && (!this.flightPath || this.flightStep === this.flightPath.length);
    this.lost = !this.won && (this.board.isOverflowing() || (this.rulesVersion === 1 && this.shots <= 0));
    if (this.challenge?.shotLimit) this.shots = Math.min(this.shots, Math.max(0, this.challenge.shotLimit - this.turns));
    this.awaitingTopUp = !this.won && !this.lost && this.shots <= 0;
    const bossBeat = this.rulesVersion >= 5 && this.activity?.kind === 'boss'
      ? this.activity.phase === 0 && [...settled.popped, ...settled.dropped].some(cell => cell.row === 0 && (cell.col === 0 || cell.col === 8)) ? 'clasp'
        : stall ? 'stalled' : turn.moved ? 'screen' : this.activity.phase === 2 && turn.changed.length ? 'gate' : undefined
      : undefined;
    return { trace, settled, turn, color, wild, booster, bloom, flight: this.flightPath ? { from, to: this.flightStep, arrived } : undefined, bossBeat, won: this.won, lost: this.lost };
  }
}
