import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { BUBBLE_RADIUS, cellPosition, type Bubble, type BubbleColor, type OccupiedCell } from './board';
import { GameEngine, type FireResult } from './engine';
import { chapters, levels } from './levels';
import { gameContent } from './content';
import { boosters, boosterById, type BoosterId } from './boosters';
import { ruleById, ruleForBubble, rules, type RuleId } from './rules';
import { buyBooster, consumeBooster, loadSave, recordLoss, recordWin, refillHearts, storeSave } from './progress';
import { restoreActiveRun, type RestoredRun, type RunAction } from './run';
import type { ShotTrace } from './shot';
import './style.css';

registerSW({ immediate: true });
const BASE = import.meta.env.BASE_URL;
const save = loadSave();
if (save.activeRun && !restoreActiveRun(save.activeRun, levels, save.unlocked)) {
  delete save.activeRun;
  storeSave(save);
}

const palette: Record<BubbleColor, { fill: number; edge: number; glyph: string; ink: string }> = {
  R: { fill: 0xf48b87, edge: 0xa94e65, glyph: '♥', ink: '#78394b' },
  O: { fill: 0xf6b765, edge: 0xb8793e, glyph: '◆', ink: '#754a32' },
  Y: { fill: 0xf4e982, edge: 0xb8a64f, glyph: '✦', ink: '#706534' },
  G: { fill: 0x91d6a4, edge: 0x4d9672, glyph: '✿', ink: '#336e56' },
  B: { fill: 0x89cbe9, edge: 0x4e8caf, glyph: '●', ink: '#3b6582' },
  P: { fill: 0xc9a1dc, edge: 0x8d67a1, glyph: '★', ink: '#694f79' }
};
const normalBubble = (color: BubbleColor): Bubble => ({ color, bee: false, kind: 'normal' });
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const hud = document.querySelector<HTMLDivElement>('#hud')!;
const shotsCount = document.querySelector<HTMLElement>('#shots-count')!;
const beesCount = document.querySelector<HTMLElement>('#bees-count')!;
const levelNumber = document.querySelector<HTMLElement>('#level-number')!;
const levelName = document.querySelector<HTMLElement>('#level-name')!;
const muteButton = document.querySelector<HTMLButtonElement>('#mute-button')!;
const mechanicStatus = document.querySelector<HTMLElement>('#mechanic-status')!;
const inspectBar = document.querySelector<HTMLDivElement>('#inspect-bar')!;
const toast = document.querySelector<HTMLDivElement>('#toast')!;
let toastTimer: number | undefined;
function notice(message: string): void {
  toast.textContent = message;
  toast.classList.remove('hidden');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.add('hidden'), 2600);
}

type SoundName = 'shoot' | 'pop' | 'rescue' | 'win' | 'swap' | 'fail' | 'bonus' | 'wind';
let audioContext: AudioContext | undefined;
function playSound(type: SoundName): void {
  if (save.muted) return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
    const notes: Record<SoundName, [number, number, number][]> = {
      shoot: [[310, 510, .12]], pop: [[530, 320, .09], [650, 420, .08]],
      rescue: [[550, 740, .12], [740, 990, .16]],
      win: [[440, 440, .13], [554, 554, .13], [659, 659, .13], [880, 880, .3]],
      swap: [[400, 650, .1]], fail: [[380, 310, .2], [310, 260, .22]],
      bonus: [[660, 880, .13], [880, 1100, .16]], wind: [[430, 580, .18]]
    };
    let offset = 0;
    for (const [from, to, duration] of notes[type]) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type === 'pop' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(from, audioContext.currentTime + offset);
      oscillator.frequency.exponentialRampToValueAtTime(to, audioContext.currentTime + offset + duration);
      gain.gain.setValueAtTime(.0001, audioContext.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(.11, audioContext.currentTime + offset + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + offset + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(audioContext.currentTime + offset);
      oscillator.stop(audioContext.currentTime + offset + duration + .015);
      offset += type === 'win' ? .135 : .075;
    }
  } catch { /* Sound is optional. */ }
}

class PlayScene extends Phaser.Scene {
  engine?: GameEngine;
  private levelIndex = 0;
  private aiming = false;
  private resolving = false;
  private aimAngle = 0;
  private flying?: { trace: ShotTrace; index: number; sprite: Phaser.GameObjects.Container; angle: number };
  private boardLayer!: Phaser.GameObjects.Container;
  private sceneryLayer!: Phaser.GameObjects.Container;
  private effectLayer!: Phaser.GameObjects.Container;
  private aimGraphics!: Phaser.GameObjects.Graphics;
  private shooterBubble?: Phaser.GameObjects.Container;
  private nextBubble?: Phaser.GameObjects.Container;
  private wildLabel?: Phaser.GameObjects.Text;
  private epoch = 0;
  private pendingLevel?: { index: number; restored?: RestoredRun };
  private pendingAction?: () => void;
  private runActions: RunAction[] = [];
  private inspectMode = false;
  onInspect?: (rule: RuleId, bubble?: Bubble) => void;

  constructor() { super('Play'); }
  preload(): void {
    this.load.image('bramble', `${BASE}bramble.png`);
    this.load.image('bee', `${BASE}bee.png`);
  }
  create(): void {
    this.sceneryLayer = this.add.container(0, 0);
    this.boardLayer = this.add.container(0, 0);
    this.effectLayer = this.add.container(0, 0);
    this.aimGraphics = this.add.graphics();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.inspectMode) { this.inspectAt(pointer.x, pointer.y); return; }
      if (!this.engine || this.engine.won || this.engine.lost || this.flying || this.resolving || pointer.y < 145 || pointer.y > 775) return;
      this.aiming = true;
      this.setAim(pointer.x, pointer.y);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.engine || this.flying || this.resolving || this.inspectMode) return;
      if (pointer.event instanceof MouseEvent || this.aiming) this.setAim(pointer.x, pointer.y);
    });
    this.input.on('pointerup', () => {
      if (this.aiming) { this.aiming = false; this.fire(); }
    });
    this.input.on('pointerupoutside', () => { this.aiming = false; });
    if (this.pendingLevel !== undefined) {
      const { index, restored } = this.pendingLevel;
      this.pendingLevel = undefined;
      this.startLevel(index, restored);
    }
  }

  startLevel(index: number, restored?: RestoredRun): void {
    if (!this.boardLayer) { this.pendingLevel = { index, restored }; return; }
    this.epoch += 1;
    this.pendingAction = undefined;
    this.levelIndex = index;
    this.engine = restored?.engine ?? new GameEngine(levels[index]);
    this.runActions = restored?.actions.slice() ?? [];
    save.activeRun = { version: 1, levelId: levels[index].id, actions: this.runActions.slice() };
    storeSave(save);
    this.setInspectMode(false);
    this.aiming = false;
    this.resolving = false;
    this.aimAngle = 0;
    this.flying?.sprite.destroy();
    this.flying = undefined;
    this.effectLayer.removeAll(true);
    this.drawScenery();
    this.drawBoard();
    this.drawShooter();
    this.drawAim();
    updateHud(this);
  }

  returnHome(): void {
    this.epoch += 1;
    this.pendingLevel = undefined;
    this.pendingAction = undefined;
    this.engine = undefined;
    this.setInspectMode(false);
    this.aiming = false;
    this.flying?.sprite.destroy();
    this.flying = undefined;
    this.sceneryLayer?.removeAll(true);
    this.boardLayer?.removeAll(true);
    this.effectLayer?.removeAll(true);
    this.aimGraphics?.clear();
    this.shooterBubble?.destroy();
    this.nextBubble?.destroy();
    this.wildLabel?.destroy();
  }

  private remember(action: RunAction): void {
    this.runActions.push(action);
    save.activeRun = { version: 1, levelId: this.levelIndex + 1, actions: this.runActions.slice() };
    storeSave(save);
  }

  swap(): void {
    if (!this.engine || this.engine.won || this.engine.lost || this.flying || this.resolving) return;
    this.engine.swap();
    this.remember({ type: 'swap' });
    this.drawShooter();
    playSound('swap');
  }
  chooseWild(color: BubbleColor): boolean {
    if (!this.engine || this.flying || this.resolving) return false;
    const chosen = this.engine.chooseWild(color);
    if (chosen) { this.remember({ type: 'wild', color }); this.drawShooter(); updateHud(this); playSound('bonus'); }
    return chosen;
  }
  armBooster(id: BoosterId, color?: BubbleColor): boolean {
    if (!this.engine || this.flying || this.resolving || save.inventory[id] < 1) return false;
    if (!this.engine.armBooster(id, color)) return false;
    this.remember({ type: 'booster', id, ...(color ? { color } : {}) });
    this.drawShooter();
    this.drawAim();
    updateHud(this);
    playSound('bonus');
    return true;
  }
  cancelSpecial(): void {
    if (!this.engine?.armedBooster && !this.engine?.wildColor) return;
    this.engine?.cancelSpecialShot();
    this.remember({ type: 'cancel' });
    this.drawShooter();
    this.drawAim();
    updateHud(this);
  }
  isBusy(): boolean { return Boolean(this.flying || this.resolving); }
  deferUntilReady(action: () => void): boolean {
    if (!this.isBusy()) return false;
    this.pendingAction = action;
    notice('Opening after this bubble lands.');
    return true;
  }
  setInspectMode(enabled: boolean): void {
    this.inspectMode = enabled;
    this.aiming = false;
    inspectBar.classList.toggle('hidden', !enabled);
    this.aimGraphics?.clear();
    if (!enabled && this.aimGraphics) this.drawAim();
  }
  private inspectAt(x: number, y: number): void {
    if (!this.engine || this.isBusy()) return;
    const hit = this.engine.board.entries().find((cell) => {
      const point = cellPosition(cell);
      return Math.hypot(point.x - x, point.y - y) <= 22;
    });
    if (hit) { this.onInspect?.(ruleForBubble(hit.bubble), hit.bubble); return; }
    const wind = this.engine.level.wind;
    if (wind) {
      const first = cellPosition({ row: wind.row, col: wind.start + this.engine.board.windPosition() });
      if (Math.abs(y - first.y) < 27 && x >= first.x - 19 && x <= first.x + wind.length * 36 - 16) {
        this.onInspect?.('wind'); return;
      }
    }
    notice('Tap a bubble or the marked wind strip.');
  }
  getLevelIndex(): number { return this.levelIndex; }

  private drawScenery(): void {
    this.sceneryLayer.removeAll(true);
    const chapter = Math.floor(this.levelIndex / 10);
    const themes = [
      { fill: 0xfaf5dc, line: 0x3a866b, ink: '#346c5b', name: 'MEADOW DAYS', symbol: '✿' },
      { fill: 0xffedca, line: 0xa9804d, ink: '#89613c', name: 'HONEYCOMB GROVE', symbol: '⬢' },
      { fill: 0xe1eff0, line: 0x5c8d99, ink: '#397281', name: 'BREEZY BRAMBLES', symbol: '↗' }
    ];
    const theme = themes[chapter];
    const panel = this.add.graphics();
    panel.fillStyle(theme.fill, .54).fillRoundedRect(19, 159, 352, 500, 28);
    panel.lineStyle(3, 0xffffff, .55).strokeRoundedRect(19, 159, 352, 500, 28);
    panel.lineStyle(2, theme.line, .35).strokeRoundedRect(24, 164, 342, 490, 24);
    panel.lineStyle(2, 0x7b8665, .5).lineBetween(31, 635, 359, 635);
    this.sceneryLayer.add(panel);
    this.sceneryLayer.add(this.add.text(195, 167, `${theme.symbol}  ${theme.name}  ${theme.symbol}`, {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '11px', fontStyle: 'bold', color: theme.ink, letterSpacing: 1.6
    }).setOrigin(.5, 0));
    this.sceneryLayer.add(this.add.image(61, 744, 'bramble').setDisplaySize(102, 107));
    const sling = this.add.graphics();
    sling.fillStyle(0x6c492f, 1).fillEllipse(195, 738, 65, 25);
    sling.fillStyle(0xb47741, 1).fillRoundedRect(182, 708, 26, 43, 10);
    sling.lineStyle(5, 0x7b5634, 1).strokeRoundedRect(182, 708, 26, 43, 10);
    sling.lineStyle(7, 0x9a653b, 1).lineBetween(195, 718, 195, 683);
    this.sceneryLayer.add(sling);
    this.sceneryLayer.add(this.add.text(290, 703, 'NEXT', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#285a4d', letterSpacing: 1
    }).setOrigin(.5));
  }

  private makeBubble(x: number, y: number, bubble: Bubble, radius = BUBBLE_RADIUS): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    if (bubble.kind === 'honeycomb') {
      container.add(this.add.circle(1.5, 2, radius + 1.5, 0x20443f, .16));
      container.add(this.add.circle(0, 0, radius, 0xb88445).setStrokeStyle(2.5, 0x765332));
      container.add(this.add.text(0, -.3, '⬢', { fontFamily: 'Georgia, serif', fontSize: `${radius * 1.55}px`, color: '#f9dc91' }).setOrigin(.5));
      return container;
    }
    const style = palette[bubble.color ?? 'R'];
    container.add(this.add.circle(1.5, 2, radius + 1.5, 0x20443f, .16));
    container.add(this.add.circle(0, 0, radius, style.fill).setStrokeStyle(2.3, style.edge, .95));
    container.add(this.add.ellipse(-radius * .29, -radius * .4, radius * .66, radius * .36, 0xffffff, .42).setRotation(-.34));
    if (bubble.bee) container.add(this.add.image(0, 1, 'bee').setDisplaySize(radius * 1.45, radius * 1.45));
    else container.add(this.add.text(0, .4, style.glyph, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(radius * 1.05)}px`, fontStyle: 'bold', color: style.ink
    }).setOrigin(.5));
    if (bubble.kind !== 'normal') {
      const symbol = bubble.kind === 'pollen' ? '✺' : bubble.kind === 'dew' ? '❄' : '↻';
      container.add(this.add.circle(radius * .55, -radius * .55, radius * .42, bubble.kind === 'dew' ? 0xd9f5ff : 0xffefbc).setStrokeStyle(1.5, style.edge));
      container.add(this.add.text(radius * .55, -radius * .56, symbol, {
        fontFamily: 'Trebuchet MS, sans-serif', fontSize: `${Math.round(radius * .62)}px`, fontStyle: 'bold', color: '#4c665e'
      }).setOrigin(.5));
    }
    return container;
  }

  private drawBoard(): void {
    this.boardLayer.removeAll(true);
    if (!this.engine) return;
    const wind = this.engine.level.wind;
    if (wind) {
      const offset = this.engine.board.windPosition();
      const first = cellPosition({ row: wind.row, col: wind.start + offset });
      const line = this.add.graphics();
      line.fillStyle(0xfef5bd, .32).fillRoundedRect(first.x - 20, first.y - 21, wind.length * 36 + 4, 42, 18);
      line.lineStyle(2, 0xc79c58, .85).strokeRoundedRect(first.x - 20, first.y - 21, wind.length * 36 + 4, 42, 18);
      this.boardLayer.add(line);
      const arrow = offset === 0 ? '→' : '←';
      this.boardLayer.add(this.add.text(first.x + wind.length * 18 - 18, first.y + 30, arrow, {
        fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#8d6940'
      }).setOrigin(.5));
    }
    for (const cell of this.engine.board.entries()) {
      const point = cellPosition(cell);
      this.boardLayer.add(this.makeBubble(point.x, point.y, cell.bubble));
    }
  }

  private drawShooter(): void {
    this.shooterBubble?.destroy();
    this.nextBubble?.destroy();
    this.wildLabel?.destroy();
    if (!this.engine) return;
    this.shooterBubble = this.makeBubble(195, 690, normalBubble(this.engine.shotColor()), 20);
    this.nextBubble = this.makeBubble(290, 733, normalBubble(this.engine.nextColor), 15);
    const label = this.engine.wildColor ? 'WILD SHOT' : this.engine.armedBooster ? boosterById[this.engine.armedBooster.id].name.toUpperCase() : '';
    if (label) {
      this.wildLabel = this.add.text(195, 656, label, { fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: 'bold', color: '#fff4b3', backgroundColor: '#3c705c' }).setPadding(5, 2).setOrigin(.5);
    }
  }
  private setAim(x: number, y: number): void {
    this.aimAngle = Phaser.Math.Clamp(Math.atan2(x - 195, 690 - y), -1.25, 1.25);
    this.drawAim();
  }
  private drawAim(): void {
    this.aimGraphics.clear();
    if (!this.engine || this.flying || this.resolving || this.inspectMode || this.engine.won || this.engine.lost) return;
    const trace = this.engine.preview(this.aimAngle);
    for (let i = 4; i < trace.path.length; i += 5) {
      const point = trace.path[i];
      this.aimGraphics.fillStyle(0xffffff, Math.max(.18, .78 - i * .003));
      this.aimGraphics.fillCircle(point.x, point.y, i < 45 ? 3.3 : 2.5);
    }
    if (this.engine.armedBooster?.id === 'bonk' && trace.impact) {
      const point = cellPosition(trace.impact);
      this.aimGraphics.lineStyle(3, 0xffd466, .95).strokeCircle(point.x, point.y, 21);
    }
  }
  private fire(): void {
    if (!this.engine || this.flying || this.resolving || this.engine.won || this.engine.lost) return;
    if (!this.engine.canFire(this.aimAngle)) { notice('Aim Bonk at a bubble first.'); return; }
    const trace = this.engine.preview(this.aimAngle);
    const color = this.engine.shotColor();
    this.flying = { trace, index: 0, angle: this.aimAngle, sprite: this.makeBubble(195, 690, normalBubble(color)) };
    this.aimGraphics.clear();
    playSound('shoot');
  }
  update(_time: number, delta: number): void {
    if (!this.flying) return;
    const shot = this.flying;
    shot.index = Math.min(shot.trace.path.length - 1, shot.index + 800 * Math.min(delta, 50) / 1000 / 4);
    const point = shot.trace.path[Math.floor(shot.index)];
    shot.sprite.setPosition(point.x, point.y);
    if (shot.index >= shot.trace.path.length - 1) this.land();
  }
  private land(): void {
    if (!this.flying || !this.engine) return;
    const shot = this.flying;
    shot.sprite.destroy();
    this.flying = undefined;
    const result = this.engine.fire(shot.angle);
    if (result.booster) consumeBooster(save, result.booster);
    let stars = 0;
    let firstClear = false;
    if (result.won) {
      const margin = this.engine.level.shots - this.engine.level.par;
      const used = this.engine.turns;
      stars = used <= this.engine.level.par ? 3 : used <= this.engine.level.par + Math.floor(margin / 2) ? 2 : 1;
      firstClear = !save.stars[this.levelIndex];
      recordWin(save, this.levelIndex, stars);
      delete save.activeRun;
    } else if (result.lost) {
      recordLoss(save, this.levelIndex);
      delete save.activeRun;
    } else {
      this.runActions.push({ type: 'fire', angle: shot.angle });
      save.activeRun = { version: 1, levelId: this.levelIndex + 1, actions: this.runActions.slice() };
    }
    storeSave(save);
    this.resolving = true;
    this.drawBoard();
    this.drawShooter();
    this.drawAim();
    updateHud(this);
    if (result.settled?.popped.length) playSound('pop');
    if ((result.settled?.beesFreed ?? 0) + (result.turn?.beesFreed ?? 0)) playSound('rescue');
    if ((result.settled?.bonusShots ?? 0) + (result.turn?.bonusShots ?? 0)) playSound('bonus');
    if (result.turn?.moved) playSound('wind');
    this.animateCleared(result);
    this.showShotFeedback(result);
    const epoch = this.epoch;
    this.time.delayedCall(result.settled?.popped.length ? 590 : 260, () => {
      if (epoch !== this.epoch) return;
      this.resolving = false;
      this.drawAim();
      if (result.won) {
        this.pendingAction = undefined;
        playSound('win');
        showResult(true, this.levelIndex, stars, firstClear);
      } else if (result.lost) {
        this.pendingAction = undefined;
        playSound('fail');
        showResult(false, this.levelIndex, 0);
      } else {
        const action = this.pendingAction;
        this.pendingAction = undefined;
        action?.();
      }
    });
  }
  private showShotFeedback(result: FireResult): void {
    const freed = (result.settled?.beesFreed ?? 0) + (result.turn?.beesFreed ?? 0);
    const bonus = (result.settled?.bonusShots ?? 0) + (result.turn?.bonusShots ?? 0);
    const cracked = result.settled?.cracked.length ?? 0;
    const dropped = (result.settled?.dropped.length ?? 0) + (result.turn?.dropped.length ?? 0);
    const labels: string[] = [];
    if (freed) labels.push(freed === 1 ? 'Bee friend home! 🐝' : `${freed} bee friends home! 🐝`);
    if (bonus) labels.push(`+${bonus} bubbles from pollen ✺`);
    else if (cracked) labels.push('Dew shell cracked ❄');
    else if (dropped >= 4) labels.push('Lovely chain drop! ↓');
    else if (result.booster === 'bonk') labels.push('Bonk! ⬢');
    else if (result.turn?.moved) labels.push('The breeze shifted →');
    labels.slice(0, 2).forEach((label, index) => {
      const message = this.add.text(195, 548 + index * 29, label, {
        fontFamily: 'Trebuchet MS, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#fff8dd',
        backgroundColor: '#275e52'
      }).setPadding(9, 5).setOrigin(.5).setDepth(20);
      this.effectLayer.add(message);
      this.tweens.add({ targets: message, y: message.y - 35, alpha: 0, duration: 900, ease: 'Sine.Out', onComplete: () => message.destroy() });
    });
  }
  private animateCleared(result: FireResult): void {
    const popped = result.settled?.popped ?? [];
    const dropped = [...(result.settled?.dropped ?? []), ...(result.turn?.dropped ?? [])];
    for (const cell of popped) {
      const point = cellPosition(cell);
      const orb = this.makeBubble(point.x, point.y, cell.bubble);
      this.effectLayer.add(orb);
      this.tweens.add({ targets: orb, scale: 1.38, alpha: 0, duration: 300, ease: 'Cubic.Out', onComplete: () => orb.destroy() });
      if (cell.bubble.bee) this.flyBee(point.x, point.y);
    }
    for (const cell of dropped) {
      const point = cellPosition(cell);
      const orb = this.makeBubble(point.x, point.y, cell.bubble);
      this.effectLayer.add(orb);
      this.tweens.add({ targets: orb, y: point.y + 115, alpha: 0, angle: 35, duration: 480, ease: 'Quad.In', onComplete: () => orb.destroy() });
      if (cell.bubble.bee) this.flyBee(point.x, point.y);
    }
  }
  private flyBee(x: number, y: number): void {
    const bee = this.add.image(x, y, 'bee').setDisplaySize(28, 28);
    this.effectLayer.add(bee);
    this.tweens.add({ targets: bee, x: x + Phaser.Math.Between(-24, 24), y: y - 96, scale: 1.25, alpha: 0, duration: 650, ease: 'Cubic.Out', onComplete: () => bee.destroy() });
  }
}

const scene = new PlayScene();
new Phaser.Game({
  type: Phaser.CANVAS, parent: 'game', width: 390, height: 844, transparent: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 390, height: 844 },
  render: { antialias: true, pixelArt: false }, scene: [scene]
});

function updateHud(current: PlayScene): void {
  const engine = current.engine;
  if (!engine) return;
  levelNumber.textContent = String(current.getLevelIndex() + 1).padStart(2, '0');
  levelName.textContent = engine.level.name;
  shotsCount.textContent = String(engine.shots);
  beesCount.textContent = `${engine.freedBees}/${engine.totalBees}`;
  const chips: string[] = [];
  if (engine.level.wind) {
    chips.push(`<button class="mechanic-chip" data-rule="wind">Breeze in ${2 - engine.turns % 2} ${engine.board.windPosition() === 0 ? '→' : '←'}</button>`);
  }
  for (const kind of ['pollen', 'honeycomb', 'dew', 'bloom'] as const) {
    if (engine.board.entries().some(({ bubble }) => bubble.kind === kind)) {
      chips.push(`<button class="mechanic-chip" data-rule="${kind}">${ruleById[kind].symbol} ${ruleById[kind].name}</button>`);
    }
  }
  if (engine.armedBooster || engine.wildColor) {
    const name = engine.armedBooster ? boosterById[engine.armedBooster.id].name : 'Wild shot';
    chips.push(`<button class="mechanic-chip armed" data-cancel-special="true">${escapeHtml(name)} ready ×</button>`);
  }
  mechanicStatus.innerHTML = chips.join('');
  mechanicStatus.classList.toggle('hidden', chips.length === 0);
}
function updateMuteButton(): void {
  muteButton.textContent = save.muted ? '♪̸' : '♫';
  muteButton.setAttribute('aria-label', save.muted ? 'Unmute sound' : 'Mute sound');
}

let lastChapter = 0;
const backToLevel = (): void => { overlay.classList.add('hidden'); };
function showPause(): void {
  const engine = scene.engine;
  if (!engine || engine.won || engine.lost) return;
  if (scene.deferUntilReady(showPause)) return;
  scene.setInspectMode(false);
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<div class="result-card pause-card" role="dialog" aria-label="Paused game"><span class="eyebrow">A LITTLE BREATHER</span><h2>${escapeHtml(engine.level.name)}</h2><p>${engine.freedBees} of ${engine.totalBees} bee friends home · ${engine.shots} bubbles left</p><div class="pause-saved">✦ Your board and next bubbles are saved automatically.</div><button id="pause-continue" class="primary-button">Keep playing <span>➜</span></button><button id="pause-restart" class="secondary-button">Restart this level</button><div class="result-links"><button id="pause-rules" class="text-button">Rules</button><button id="pause-bag" class="text-button">Bag & shop ♥</button><button id="pause-sound" class="text-button">Sound ${save.muted ? 'off' : 'on'}</button></div><button id="pause-home" class="text-button">Return to the meadows</button></div>`;
  overlay.querySelector<HTMLButtonElement>('#pause-continue')!.addEventListener('click', backToLevel);
  overlay.querySelector<HTMLButtonElement>('#pause-restart')!.addEventListener('click', () => {
    if (engine.turns > 0) showRestartConfirm();
    else beginLevel(scene.getLevelIndex(), true);
  });
  overlay.querySelector<HTMLButtonElement>('#pause-rules')!.addEventListener('click', () => showRules(showPause));
  overlay.querySelector<HTMLButtonElement>('#pause-bag')!.addEventListener('click', () => showBag(showPause));
  overlay.querySelector<HTMLButtonElement>('#pause-sound')!.addEventListener('click', () => { save.muted = !save.muted; storeSave(save); updateMuteButton(); showPause(); });
  overlay.querySelector<HTMLButtonElement>('#pause-home')!.addEventListener('click', showHome);
}
function showRestartConfirm(): void {
  const index = scene.getLevelIndex();
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<div class="result-card confirm-card" role="dialog" aria-label="Restart this level"><span class="eyebrow">START FRESH?</span><h2>Restart this meadow?</h2><p>Your current board will start over. Power-ups already fired stay spent.</p><button id="restart-keep" class="primary-button">Keep my attempt <span>➜</span></button><button id="restart-confirm" class="text-button">Restart level ${index + 1}</button></div>`;
  overlay.querySelector<HTMLButtonElement>('#restart-keep')!.addEventListener('click', showPause);
  overlay.querySelector<HTMLButtonElement>('#restart-confirm')!.addEventListener('click', () => beginLevel(index, true));
}
function showSwitchLevelConfirm(index: number): void {
  const chapter = lastChapter;
  const paused = save.activeRun?.levelId;
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<div class="result-card confirm-card" role="dialog" aria-label="Change level"><span class="eyebrow">ONE MORE THING</span><h2>Leave level ${paused}?</h2><p>Your unfinished board will be replaced when you start level ${index + 1}.</p><button id="switch-keep" class="primary-button">Keep my saved level <span>➜</span></button><button id="switch-confirm" class="text-button">Start level ${index + 1}</button></div>`;
  overlay.querySelector<HTMLButtonElement>('#switch-keep')!.addEventListener('click', () => showChapterSelect(chapter));
  overlay.querySelector<HTMLButtonElement>('#switch-confirm')!.addEventListener('click', () => beginLevel(index, true));
}
const activeRules = (): RuleId[] => {
  const engine = scene.engine;
  if (!engine) return [];
  const found = new Set<RuleId>(['match', 'bee', 'drop']);
  if (engine.level.id >= 6) found.add('bank');
  for (const special of engine.level.specials) found.add(special.kind);
  if (engine.level.wind) found.add('wind');
  return rules.filter((rule) => found.has(rule.id)).map((rule) => rule.id);
};

function showRules(returnTo: () => void, focus?: RuleId): void {
  if (scene.deferUntilReady(() => showRules(returnTo, focus))) return;
  const current = activeRules();
  if (focus && current.includes(focus)) { current.splice(current.indexOf(focus), 1); current.unshift(focus); }
  const ordered = focus ? [ruleById[focus], ...rules.filter((rule) => rule.id !== focus)] : rules;
  const remaining = ordered.map((rule) => rule.id).filter((id) => !current.includes(id));
  const render = (ids: RuleId[]): string => ids.map((id) => {
    const rule = ruleById[id];
    return `<article class="rule-card ${focus === id ? 'featured' : ''}"><span class="rule-symbol">${rule.symbol}</span><div><strong>${escapeHtml(rule.name)}</strong><p>${escapeHtml(rule.short)} ${escapeHtml(rule.detail)}</p><small>Appears by level ${rule.appears}</small></div></article>`;
  }).join('');
  const lesson = scene.engine?.level.tutorial;
  overlay.className = 'overlay sheet-overlay';
  overlay.innerHTML = `<section class="sheet rules-sheet" role="dialog" aria-label="Bubble rules"><div class="sheet-top"><span class="eyebrow">BRAMBLE'S FIELD GUIDE</span><button class="sheet-close" id="rules-close" aria-label="Close rules">×</button></div><h2>Bubble rules</h2><p class="sheet-lead">Open this any time. Your level waits right where you left it.</p><div class="sheet-scroll">${current.length ? `<h3>On this board</h3>${render(current)}` : ''}<h3>${current.length ? 'Other bubbles and tricks' : 'All bubbles and tricks'}</h3>${render(remaining)}<h3>Power-up shots</h3>${boosters.map((booster) => `<article class="rule-card"><span class="rule-symbol">${booster.symbol}</span><div><strong>${escapeHtml(booster.name)}</strong><p>${escapeHtml(booster.description)} Uses one regular shot.</p><small>Available by level ${booster.unlockLevel}</small></div></article>`).join('')}<p class="rule-footnote">After two losses on a level, Bramble offers one free wild-color shot per retry.</p></div><div class="sheet-actions">${scene.engine && !scene.engine.won && !scene.engine.lost ? '<button id="inspect-start" class="secondary-button">Inspect bubbles on this board</button>' : ''}${lesson ? '<button id="replay-lesson" class="text-button">Replay this level’s lesson</button>' : ''}</div></section>`;
  overlay.querySelector<HTMLButtonElement>('#rules-close')!.addEventListener('click', returnTo);
  overlay.querySelector<HTMLButtonElement>('#inspect-start')?.addEventListener('click', () => {
    scene.setInspectMode(true);
    backToLevel();
  });
  overlay.querySelector<HTMLButtonElement>('#replay-lesson')?.addEventListener('click', () => {
    showGuide('A NEW LITTLE TRICK', scene.engine!.level.name, lesson!, () => showRules(returnTo, focus));
  });
}

function showInspectedRule(id: RuleId, bubble?: Bubble): void {
  const rule = ruleById[id];
  const detail = bubble?.kind === 'bloom' && bubble.alternate
    ? `Right now it is ${bubble.color}; after the next shot it will be ${bubble.alternate}.`
    : bubble?.bee && id !== 'bee' ? 'There is a bee friend inside this bubble.' : '';
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<div class="result-card inspect-card" role="dialog" aria-label="${escapeHtml(rule.name)}"><span class="rule-symbol">${rule.symbol}</span><h2>${escapeHtml(rule.name)}</h2><p>${escapeHtml(rule.short)} ${escapeHtml(rule.detail)}</p>${detail ? `<p class="inspected-detail">${escapeHtml(detail)}</p>` : ''}<button id="inspect-more" class="primary-button">Inspect another <span>➜</span></button><button id="inspect-finish" class="text-button">Done inspecting</button></div>`;
  overlay.querySelector<HTMLButtonElement>('#inspect-more')!.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.querySelector<HTMLButtonElement>('#inspect-finish')!.addEventListener('click', () => { scene.setInspectMode(false); backToLevel(); });
}

function showColorPicker(kind: 'rainbow' | 'wild', returnTo: () => void): void {
  const engine = scene.engine;
  if (!engine) return;
  const choices = engine.board.availableColors().map((color) => `<button class="color-option" data-color="${color}" style="--color:#${palette[color].fill.toString(16).padStart(6, '0')}" aria-label="Choose ${color} ${kind} bubble">${palette[color].glyph}</button>`).join('');
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<div class="result-card guide-card" role="dialog" aria-label="Choose a bubble color"><span class="eyebrow">A LITTLE HELP FROM BRAMBLE</span><h2>Choose a color</h2><p>${kind === 'wild' ? 'One free shot after two tries. Pick any color still on the board.' : 'Rainbow Pop becomes any color still on the board.'}</p><div class="color-options">${choices}</div><button id="picker-back" class="text-button">Back to Bag</button></div>`;
  overlay.querySelector<HTMLButtonElement>('#picker-back')!.addEventListener('click', returnTo);
  overlay.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((button) => button.addEventListener('click', () => {
    const color = button.dataset.color as BubbleColor;
    const equipped = kind === 'wild' ? scene.chooseWild(color) : scene.armBooster('rainbow', color);
    if (equipped) backToLevel();
  }));
}

function showBag(returnTo: () => void): void {
  if (scene.deferUntilReady(() => showBag(returnTo))) return;
  const engine = scene.engine;
  const playing = Boolean(engine && !engine.won && !engine.lost);
  const cards = boosters.map((booster) => {
    const unlocked = save.unlocked >= booster.unlockLevel;
    return `<article class="booster-card"><span class="booster-symbol">${booster.symbol}</span><div class="booster-description"><strong>${escapeHtml(booster.name)}</strong><p>${escapeHtml(booster.description)}</p><small>${unlocked ? `${save.inventory[booster.id]} in Bag · ${booster.price} hearts each` : `Opens at level ${booster.unlockLevel}`}</small></div><div class="booster-actions">${unlocked ? `<button data-buy="${booster.id}" ${save.hearts < booster.price ? 'disabled' : ''}>Buy</button>${playing ? `<button data-use="${booster.id}" ${save.inventory[booster.id] < 1 ? 'disabled' : ''}>Use</button>` : ''}` : ''}</div></article>`;
  }).join('');
  const wild = playing && (save.failures[scene.getLevelIndex()] || 0) >= 2 && !engine!.wildUsed
    ? `<article class="booster-card wild-card"><span class="booster-symbol">✦</span><div class="booster-description"><strong>Bramble's wild shot</strong><p>One free chosen-color shot on this retry. It does not use a regular bubble.</p></div><div class="booster-actions"><button id="use-wild">Use</button></div></article>` : '';
  overlay.className = 'overlay sheet-overlay';
  overlay.innerHTML = `<section class="sheet bag-sheet" role="dialog" aria-label="Power-up bag and shop"><div class="sheet-top"><span class="eyebrow">JOHN'S VERY OFFICIAL SHOP</span><button class="sheet-close" id="bag-close" aria-label="Close bag">×</button></div><h2>Bag of tricks</h2><p class="sheet-lead">Little shortcuts, lovingly overpriced in imaginary money.</p><div class="heart-balance">♥ ${save.hearts} Honey Hearts</div><div class="sheet-scroll">${cards}${wild}<div class="refill-card"><strong>Fresh hearts, on John's tab</strong><p>12 Honey Hearts — $0.00, payable in imaginary hugs.</p><button id="refill-hearts" class="secondary-button">Get 12 hearts for free</button></div><p class="rule-footnote">Power-ups replace a shot. You can use as many as you have, one effect at a time. Cancel an armed shot before firing to keep it.</p></div></section>`;
  overlay.querySelector<HTMLButtonElement>('#bag-close')!.addEventListener('click', returnTo);
  overlay.querySelector<HTMLButtonElement>('#refill-hearts')!.addEventListener('click', () => { refillHearts(save); storeSave(save); showBag(returnTo); notice('Twelve hearts, just for you.'); });
  overlay.querySelectorAll<HTMLButtonElement>('[data-buy]').forEach((button) => button.addEventListener('click', () => {
    if (buyBooster(save, button.dataset.buy as BoosterId)) { storeSave(save); showBag(returnTo); }
  }));
  overlay.querySelectorAll<HTMLButtonElement>('[data-use]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.use as BoosterId;
    if (id === 'rainbow') showColorPicker('rainbow', () => showBag(returnTo));
    else if (scene.armBooster(id)) backToLevel();
  }));
  overlay.querySelector<HTMLButtonElement>('#use-wild')?.addEventListener('click', () => showColorPicker('wild', () => showBag(returnTo)));
}

scene.onInspect = showInspectedRule;
function beginLevel(index: number, fresh = false): void {
  const restored = !fresh && save.activeRun?.levelId === levels[index].id
    ? restoreActiveRun(save.activeRun, levels, save.unlocked) ?? undefined : undefined;
  overlay.classList.add('hidden');
  hud.classList.remove('hidden');
  scene.startLevel(index, restored);
  const tutorial = levels[index].tutorial;
  if (tutorial && !save.tutorialsSeen.includes(String(index))) {
    showGuide('A NEW LITTLE TRICK', levels[index].name, tutorial, () => {
      save.tutorialsSeen.push(String(index));
      storeSave(save);
    }, [1, 4, 7].includes(index));
  }
}
function showGuide(label: string, title: string, message: string, after?: () => void, bagPrompt = false): void {
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<div class="result-card guide-card"><span class="eyebrow">${escapeHtml(label)}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><p class="guide-reminder">Tap <strong>Rules</strong> or a bubble label any time to see what it does.</p><button id="guide-close" class="primary-button">Got it <span>➜</span></button>${bagPrompt ? '<button id="guide-bag" class="secondary-button">Show me my Bag ♥</button>' : ''}</div>`;
  overlay.querySelector<HTMLButtonElement>('#guide-close')!.addEventListener('click', () => { overlay.classList.add('hidden'); after?.(); });
  overlay.querySelector<HTMLButtonElement>('#guide-bag')?.addEventListener('click', () => { after?.(); showBag(backToLevel); });
}
function firstUnfinished(): number {
  const found = levels.findIndex((_, index) => !save.stars[index]);
  return found < 0 ? 0 : Math.min(found, save.unlocked - 1);
}
function showHome(): void {
  scene.returnHome();
  hud.classList.add('hidden');
  overlay.className = 'overlay';
  const complete = save.stars.slice(0, levels.length).filter(Boolean).length;
  const restored = save.activeRun ? restoreActiveRun(save.activeRun, levels, save.unlocked) : null;
  if (save.activeRun && !restored) { delete save.activeRun; storeSave(save); }
  const pausedIndex = restored ? restored.engine.level.id - 1 : undefined;
  const next = pausedIndex ?? firstUnfinished();
  const progress = Math.round(complete / levels.length * 100);
  overlay.innerHTML = `<div class="home-header"><span class="eyebrow">A LITTLE ADVENTURE FOR YOU</span><h1>Bramble’s<br><em>Bubble Rescue</em></h1><p>Pop bubbles. Free little friends. Make someone smile.</p></div>
    <img class="hero-art" src="${BASE}bramble.svg" alt="Bramble the friendly honey badger" />
    <div class="home-panel"><div class="dedication">${escapeHtml(gameContent.opening)}</div><button id="primary-play" class="primary-button">${pausedIndex !== undefined ? `Resume · Level ${next + 1}` : complete === levels.length ? 'Play again' : `Continue · Level ${next + 1}`} <span>➜</span></button>${pausedIndex !== undefined ? '<div class="paused-note">Your in-progress meadow is right where you left it.</div>' : ''}<button id="choose-level" class="secondary-button">Choose a level</button><div class="home-quick-actions"><button id="home-rules">Bubble rules</button><button id="home-bag">Bag & shop ♥</button></div><div class="journey-progress">${complete} of 30 meadows complete</div><div class="progress-track" role="progressbar" aria-valuenow="${complete}" aria-valuemin="0" aria-valuemax="30" aria-label="Meadows complete"><span style="width:${progress}%"></span></div></div>
    <div class="home-footer">A cosy little game · No timers, just bubbles</div>`;
  overlay.querySelector<HTMLButtonElement>('#primary-play')!.addEventListener('click', () => beginLevel(next));
  overlay.querySelector<HTMLButtonElement>('#choose-level')!.addEventListener('click', () => showChapterSelect(Math.floor(next / 10)));
  overlay.querySelector<HTMLButtonElement>('#home-rules')!.addEventListener('click', () => showRules(showHome));
  overlay.querySelector<HTMLButtonElement>('#home-bag')!.addEventListener('click', () => showBag(showHome));
}
function showChapterSelect(chapterIndex: number): void {
  lastChapter = chapterIndex;
  scene.returnHome();
  hud.classList.add('hidden');
  overlay.className = 'overlay chapter-overlay';
  const chapter = chapters[chapterIndex];
  const tabs = chapters.map((item, index) => `<button class="chapter-tab ${index === chapterIndex ? 'active' : ''}" data-chapter="${index}" aria-pressed="${index === chapterIndex}">${item.name}</button>`).join('');
  const tiles = levels.slice(chapter.first - 1, chapter.last).map((level) => {
    const index = level.id - 1;
    const unlocked = index < save.unlocked;
    const stars = save.stars[index] || 0;
    const paused = save.activeRun?.levelId === level.id;
    return `<button class="level-tile ${unlocked ? '' : 'locked'} ${paused ? 'paused' : ''}" data-level="${index}" ${unlocked ? '' : 'disabled'} aria-label="Level ${level.id}: ${escapeHtml(level.name)}${unlocked ? paused ? ', paused' : '' : ', locked'}"><span>${level.id}</span><small>${unlocked ? paused ? 'Paused' : stars ? '★'.repeat(stars) : 'Ready' : 'Locked'}</small></button>`;
  }).join('');
  overlay.innerHTML = `<div class="chapter-heading"><button id="chapter-back" class="icon-button" aria-label="Back to home">‹</button><span class="eyebrow">BRAMBLE’S JOURNEY</span><h2>${escapeHtml(chapter.name)}</h2><p>${escapeHtml(chapter.subtitle)}</p></div><div class="chapter-panel"><div class="chapter-tabs">${tabs}</div><div class="chapter-grid">${tiles}</div><p>${save.activeRun?.actions.length ? `Level ${save.activeRun.levelId} is paused. Starting another replaces its board.` : 'Finish a level to open the next meadow.'}</p><div class="chapter-quick-actions"><button id="chapter-rules">Rules</button><button id="chapter-bag">Bag & shop ♥</button></div></div>`;
  overlay.querySelector<HTMLButtonElement>('#chapter-back')!.addEventListener('click', showHome);
  overlay.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach((button) => button.addEventListener('click', () => showChapterSelect(Number(button.dataset.chapter))));
  overlay.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.level);
    if (save.activeRun?.actions.length && save.activeRun.levelId !== index + 1) showSwitchLevelConfirm(index);
    else beginLevel(index);
  }));
  overlay.querySelector<HTMLButtonElement>('#chapter-rules')!.addEventListener('click', () => showRules(() => showChapterSelect(lastChapter)));
  overlay.querySelector<HTMLButtonElement>('#chapter-bag')!.addEventListener('click', () => showBag(() => showChapterSelect(lastChapter)));
}
function showResult(won: boolean, index: number, stars: number, firstClear = false): void {
  hud.classList.add('hidden');
  overlay.className = 'overlay result-overlay';
  const finale = won && index === levels.length - 1;
  const chapterEnd = won && (index === 9 || index === 19);
  const title = finale ? 'All home together!' : chapterEnd ? 'A new path opens!' : won ? 'Lovely work!' : 'One more try?';
  const losses = save.failures[index] || 0;
  const teasing = ['Bramble says John would have missed that shot too.', 'John insists this level is perfectly fair. Bramble is unconvinced.', 'John owes you a victory dance when you clear this one.'];
  const message = finale ? gameContent.ending : chapterEnd ? `You finished ${chapters[Math.floor(index / 10)].name}. Bramble has another place to explore!` : won ? `You freed every bee in ${levels[index].name}.` : losses > 1 ? teasing[(losses - 2) % teasing.length] : 'Bramble believes in you. Take another shot at it!';
  const assist = !won && losses >= 2 ? '<p class="assist-note">A hint and one free wild shot are ready on your next try.</p>' : '';
  const reward = won && firstClear ? '<p class="reward-note">♥ +4 Honey Hearts for your first clear!</p>' : '';
  overlay.innerHTML = `<div class="result-card"><span class="eyebrow">${won ? 'BEE FRIENDS RESCUED' : 'THE ADVENTURE CONTINUES'}</span><div class="result-art"><img src="${BASE}${won ? 'bee.svg' : 'bramble.svg'}" alt="" /></div><h2>${escapeHtml(title)}</h2><div class="stars" aria-label="${stars} stars">${won ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '✿ ✿ ✿'}</div><p>${escapeHtml(message)}</p>${assist}${reward}<button id="result-primary" class="primary-button">${won ? finale ? 'Play from the beginning' : 'Next meadow' : 'Try again'} <span>➜</span></button><button id="result-bag" class="secondary-button">Bag & shop ♥</button><div class="result-links"><button id="result-rules" class="text-button">Bubble rules</button><button id="result-menu" class="text-button">Choose a level</button></div></div>`;
  overlay.querySelector<HTMLButtonElement>('#result-primary')!.addEventListener('click', () => beginLevel(won ? (index + 1) % levels.length : index));
  overlay.querySelector<HTMLButtonElement>('#result-menu')!.addEventListener('click', () => showChapterSelect(Math.floor(index / 10)));
  overlay.querySelector<HTMLButtonElement>('#result-bag')!.addEventListener('click', () => showBag(() => showResult(won, index, stars, false)));
  overlay.querySelector<HTMLButtonElement>('#result-rules')!.addEventListener('click', () => showRules(() => showResult(won, index, stars, false)));
}

document.querySelector<HTMLButtonElement>('#home-button')!.addEventListener('click', showPause);
document.querySelector<HTMLButtonElement>('#swap-button')!.addEventListener('click', () => scene.swap());
document.querySelector<HTMLButtonElement>('#rules-button')!.addEventListener('click', () => showRules(backToLevel));
document.querySelector<HTMLButtonElement>('#bag-button')!.addEventListener('click', () => showBag(backToLevel));
document.querySelector<HTMLButtonElement>('#inspect-done')!.addEventListener('click', () => scene.setInspectMode(false));
mechanicStatus.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!target) return;
  if (target.dataset.rule) showRules(backToLevel, target.dataset.rule as RuleId);
  else if (target.dataset.cancelSpecial) scene.cancelSpecial();
});
document.querySelector<HTMLButtonElement>('#help-button')!.addEventListener('click', () => {
  if (!scene.engine) return;
  showGuide('BRAMBLE’S HINT', levels[scene.getLevelIndex()].name, levels[scene.getLevelIndex()].hint);
});
muteButton.addEventListener('click', () => { save.muted = !save.muted; storeSave(save); updateMuteButton(); });
updateMuteButton();
showHome();
