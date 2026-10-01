import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { BUBBLE_RADIUS, cellPosition, neighborCells, type Bubble, type BubbleColor, type OccupiedCell } from './board';
import { GameEngine, type FireResult } from './engine';
import { chapters, levels } from './levels';
import { gameContent } from './content';
import { boosters, boosterById, type BoosterId } from './boosters';
import { ruleById, ruleForBubble, rules, type RuleId } from './rules';
import { consumeBooster, loadSave, recordLoss, recordWin, recordMastery, refillGifts, gardenProgress, storeSave } from './progress';
import { restoreActiveRun, type RestoredRun, type RunAction } from './run';
import type { ShotTrace } from './shot';
import './style.css';
import { brambleIdlePose, brambleMotionAllowed, brambleTossPose, brambleShoulder, bramblePawOutline, brambleSleeveOutline, brambleBodyPoint, giftReadout, nextBubblePoint } from './play-presentation';
import { coaching, suggestShot } from './advice';
import { activityLevel, activityUnlocked, bossPhases, challengeFor, type Activity } from './activities';
import { recordActivityResult } from './activity-progress';
import { showActivityMenu, showActivityIntro, showActivityResult } from './activity-screen';
import { WoodlandAudio } from './audio';
import { gardenArt } from './garden';
import { friends, friendsCards, styleChoices, gardenStyles, masteryLabels } from './friends';
import { showSaveScreen } from './save-screen';
import { lessonDemo, lessonFor } from './lessons';
import { AimGesture, isAimCancelPoint, loadAimGuideMode, shortAimPoints, storeAimGuideMode, type AimGuideMode } from './aim-controls';

registerSW({ immediate: true });
const BASE = import.meta.env.BASE_URL;
const save = loadSave();
const music = new WoodlandAudio(save);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
storeSave(save);
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
const coachLine = document.querySelector<HTMLElement>('#coach-line')!;
const inspectBar = document.querySelector<HTMLDivElement>('#inspect-bar')!;
const toast = document.querySelector<HTMLDivElement>('#toast')!;
let aimGuideMode: AimGuideMode = loadAimGuideMode();
let toastTimer: number | undefined;
function notice(message: string): void {
  toast.textContent = message;
  toast.classList.remove('hidden');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.add('hidden'), 2600);
}

type SoundName = 'shoot' | 'pop' | 'bonk' | 'rescue' | 'win' | 'swap' | 'fail' | 'bonus' | 'wind';
let audioContext: AudioContext | undefined;
let effectsBus: GainNode | undefined;
function syncEffects(): void {
  if (audioContext && effectsBus) effectsBus.gain.setValueAtTime(save.muted || document.hidden ? 0 : save.effectsVolume, audioContext.currentTime);
}
document.addEventListener('visibilitychange', syncEffects);
function playSound(type: SoundName): void {
  if (save.muted || !save.effectsVolume || document.hidden) return;
  try {
    audioContext ??= new AudioContext();
    if (!effectsBus) { effectsBus = audioContext.createGain(); effectsBus.connect(audioContext.destination); }
    syncEffects();
    if (audioContext.state === 'suspended') void audioContext.resume();
    const notes: Record<SoundName, [number, number, number][]> = {
      shoot: [[310, 510, .12]], pop: [[530, 320, .09], [650, 420, .08]], bonk: [[220, 85, .16], [420, 180, .11]],
      rescue: [[550, 740, .12], [740, 990, .16]],
      win: [[440, 440, .13], [554, 554, .13], [659, 659, .13], [880, 880, .3]],
      swap: [[400, 650, .1]], fail: [[380, 310, .2], [310, 260, .22]],
      bonus: [[660, 880, .13], [880, 1100, .16]], wind: [[430, 580, .18]]
    };
    let offset = 0;
    for (const [from, to, duration] of notes[type]) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type === 'pop' || type === 'bonk' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(from, audioContext.currentTime + offset);
      oscillator.frequency.exponentialRampToValueAtTime(to, audioContext.currentTime + offset + duration);
      gain.gain.setValueAtTime(.0001, audioContext.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(.09, audioContext.currentTime + offset + .018);
      gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + offset + duration);
      oscillator.connect(gain).connect(effectsBus);
      oscillator.start(audioContext.currentTime + offset);
      oscillator.stop(audioContext.currentTime + offset + duration + .015);
      offset += type === 'win' ? .135 : .075;
    }
  } catch { /* Sound is optional. */ }
}

class PlayScene extends Phaser.Scene {
  engine?: GameEngine;
  private levelIndex = 0;
  displayedBees = 0;
  private bramble?: Phaser.GameObjects.Image;
  private blink?: Phaser.GameObjects.Image;
  private brambleClock = 0;
  private brambleMotion = 0;
  private brambleSize = { width: 92, height: 96 };
  private brambleArms?: Phaser.GameObjects.Graphics;
  private brambleThrowMs?: number;
  private monty?: Phaser.GameObjects.Image;
  private trailClock = 0;
  private sparkleBudget = 0;
  private aiming = false;
  private aimGesture = new AimGesture();
  private cancelAimVisible = false;
  private resolving = false;
  private aimAngle = 0;
  private flying?: { trace: ShotTrace; index: number; sprite: Phaser.GameObjects.Container; angle: number };
  private boardLayer!: Phaser.GameObjects.Container;
  private pathBee?: Phaser.GameObjects.Container;
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
    this.load.image('magpie', `${BASE}magpie.png`);
    this.load.image('bramble', `${BASE}bramble.png`);
    this.load.image('bee', `${BASE}bee.png`);
    this.load.image('bee-body', `${BASE}bee-body.png`);
    this.load.image('bramble-blink', `${BASE}bramble-blink.png`);
    this.load.image('bramble-launcher', `${BASE}bramble-launcher.png`);
    this.load.image('bramble-launcher-blink', `${BASE}bramble-launcher-blink.png`);
  }
  create(): void {
    this.makeBubbleTextures();
    this.sceneryLayer = this.add.container(0, 0);
    this.boardLayer = this.add.container(0, 0);
    this.effectLayer = this.add.container(0, 0);
    this.aimGraphics = this.add.graphics();
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.inspectMode) { this.inspectAt(pointer.x, pointer.y); return; }
      if (!this.engine || this.engine.won || this.engine.lost || this.engine.awaitingTopUp || this.flying || this.resolving || !overlay.classList.contains('hidden') || pointer.y < 145 || pointer.y > 775 || !this.aimGesture.begin(pointer.id)) return;
      this.aiming = true;
      this.setAim(pointer.x, pointer.y);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.engine || this.flying || this.resolving || this.inspectMode) return;
      if (this.aiming ? this.aimGesture.matches(pointer.id) : pointer.event instanceof MouseEvent) this.setAim(pointer.x, pointer.y);
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const outcome = this.aimGesture.release(pointer.id, { x: pointer.x, y: pointer.y });
      if (outcome === 'ignore') return;
      this.aiming = false;
      this.cancelAimVisible = false;
      if (outcome === 'fire' && overlay.classList.contains('hidden')) {
        this.setAim(pointer.x, pointer.y);
        this.fire();
      } else this.drawAim();
      this.syncAimCoach();
    });
    this.input.on('pointerupoutside', () => this.cancelAim());
    this.game.canvas.addEventListener('pointercancel', () => this.cancelAim());
    window.addEventListener('blur', () => this.cancelAim());
    window.addEventListener('keydown', (event) => { if (event.key === 'Escape') this.cancelAim(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.cancelAim(); });
    this.scale.on('resize', () => this.cancelAim());
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
    this.tweens?.killAll();
    this.time?.removeAllEvents();
    this.engine = restored?.engine ?? new GameEngine(levels[index]);
    this.displayedBees = this.engine.freedBees;
    this.runActions = restored?.actions.slice() ?? [];
    this.saveAttempt();
    storeSave(save);
    this.setInspectMode(false);
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
    if (this.engine.awaitingTopUp) showTopUp();
  }

  returnHome(): void {
    this.tweens?.killAll();
    this.time?.removeAllEvents();
    this.epoch += 1;
    this.pendingLevel = undefined;
    this.pendingAction = undefined;
    this.engine = undefined;
    this.setInspectMode(false);
    this.flying?.sprite.destroy();
    this.flying = undefined;
    this.sceneryLayer?.removeAll(true);
    this.boardLayer?.removeAll(true);
    this.effectLayer?.removeAll(true);
    this.aimGraphics?.clear();
    this.shooterBubble?.destroy();
    this.nextBubble?.destroy();
    this.wildLabel?.destroy();
    this.monty = undefined;
  }

  private saveAttempt(): void {
    const engine = this.engine!;
    const run = { version: engine.rulesVersion, levelId: engine.level.id, actions: this.runActions.slice(), ...(engine.activity ? { activity: engine.activity } : {}) };
    if (engine.activity) save.activeSideRun = run; else save.activeRun = run;
  }
  relaxChallenge(): void {
    if (this.isBusy() || !this.engine?.relaxChallenge()) return;
    this.remember({ type: 'relax' }); updateHud(this); this.drawAim();
    if (this.engine.awaitingTopUp) this.topUp(); else backToLevel();
  }
  private remember(action: RunAction): void {
    this.runActions.push(action);
    this.saveAttempt();
    storeSave(save);
  }

  swap(): void {
    if (!this.engine || this.engine.won || this.engine.lost || this.engine.awaitingTopUp || this.flying || this.resolving) return;
    this.engine.swap();
    this.remember({ type: 'swap' });
    this.drawShooter();
    if (!reducedMotion.matches) {
      this.tweens.add({ targets: this.shooterBubble, x: { from: nextBubblePoint.x, to: 195 }, y: { from: nextBubblePoint.y, to: 690 }, duration: 200, ease: 'Sine.Out' });
      this.tweens.add({ targets: this.nextBubble, x: { from: 195, to: nextBubblePoint.x }, y: { from: 690, to: nextBubblePoint.y }, duration: 200, ease: 'Sine.Out' });
    }
    this.drawAim();
    playSound('swap');
  }
  chooseWild(color: BubbleColor): boolean {
    if (!this.engine || this.flying || this.resolving) return false;
    const chosen = this.engine.chooseWild(color);
    if (chosen) { this.remember({ type: 'wild', color }); this.drawShooter(); updateHud(this); playSound('bonus'); }
    return chosen;
  }
  armBooster(id: BoosterId, color?: BubbleColor): boolean {
    if (!this.engine || this.engine.awaitingTopUp || this.flying || this.resolving || save.inventory[id] < 1 || save.unlocked < boosterById[id].unlockLevel) return false;
    if (!this.engine.armBooster(id, color)) return false;
    this.remember({ type: 'booster', id, ...(color ? { color } : {}) });
    this.drawShooter();
    this.drawAim();
    updateHud(this);
    playSound('bonus');
    return true;
  }
  armBloom(): void {
    if (!this.engine || this.isBusy()) return;
    if (this.engine.bloomArmed) { this.cancelSpecial(); return; }
    if (!this.engine.armBloom()) return;
    this.remember({ type: 'bloom' }); this.drawShooter(); this.drawAim(); updateHud(this); playSound('bonus');
  }
  cancelSpecial(): void {
    if (this.isBusy() || (!this.engine?.armedBooster && !this.engine?.wildColor && !this.engine?.bloomArmed)) return;
    this.engine?.cancelSpecialShot();
    this.remember({ type: 'cancel' });
    this.drawShooter();
    this.drawAim();
    updateHud(this);
  }
  topUp(): void {
    if (!this.engine?.topUp()) return;
    this.remember({ type: 'topup' });
    updateHud(this); this.drawAim(); backToLevel();
    notice('Five more bubbles, with love.');
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
    this.cancelAim();
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

  cancelAim(): void {
    if (!this.aimGesture.cancel()) return;
    this.aiming = false;
    this.cancelAimVisible = false;
    this.drawAim();
    this.syncAimCoach();
  }

  syncAimCoach(): void {
    if (!this.engine) return;
    coachLine.textContent = this.aiming
      ? this.cancelAimVisible ? 'Release to cancel · keep dragging to aim' : 'Pull back to the launcher to cancel'
      : coaching(this.engine);
  }
  refreshAimGuide(): void { this.drawAim(); }

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
    panel.fillStyle(0x234b3d, .12).fillRoundedRect(19, 164, 352, 495, 22);
    panel.fillStyle(theme.fill, .94).fillRoundedRect(19, 159, 352, 494, 22);
    panel.lineStyle(2, 0xfff9e5, .95).strokeRoundedRect(19, 159, 352, 494, 22);
    panel.lineStyle(1, theme.line, .23).strokeRoundedRect(24, 164, 342, 484, 18);
    panel.lineStyle(1, theme.line, .17).lineBetween(42, 635, 348, 635);
    panel.fillStyle(0x244f40, .18).fillRoundedRect(19, 668, 352, 162, 23);
    panel.fillStyle(0xfff6df, .97).fillRoundedRect(19, 664, 352, 162, 23);
    panel.lineStyle(1.5, 0xffffff, .8).strokeRoundedRect(19, 664, 352, 162, 23);
    this.sceneryLayer.add(panel);
    this.sceneryLayer.add(this.add.text(195, 641, `${theme.symbol}  ${theme.name}  ${theme.symbol}`, {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '9px', fontStyle: 'bold', color: theme.ink, letterSpacing: 1.8
    }).setOrigin(.5));
    this.sceneryLayer.add(this.add.text(nextBubblePoint.x, 677, 'NEXT', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '9px', fontStyle: 'bold', color: '#71826a', letterSpacing: 1.8
    }).setOrigin(.5));
    const nextWell = this.add.graphics();
    nextWell.fillStyle(0xe6e9cf, .8).fillCircle(nextBubblePoint.x, nextBubblePoint.y + 1, 24);
    nextWell.lineStyle(1, 0xb6c4a5, .65).strokeCircle(nextBubblePoint.x, nextBubblePoint.y + 1, 24);
    this.sceneryLayer.add(nextWell);
    this.brambleClock = 0;
    this.brambleMotion = 0;
    this.brambleThrowMs = undefined;
    this.brambleSize = { width: 92, height: 96 };
    const ground = this.add.graphics();
    ground.fillStyle(0x7a6845, .11).fillEllipse(brambleBodyPoint.x, 752, 62, 7);
    this.brambleArms = this.add.graphics();
    this.bramble = this.add.image(brambleBodyPoint.x, brambleBodyPoint.y, 'bramble-launcher').setDisplaySize(this.brambleSize.width, this.brambleSize.height);
    this.blink = this.add.image(brambleBodyPoint.x, brambleBodyPoint.y, 'bramble-launcher-blink').setDisplaySize(this.brambleSize.width, this.brambleSize.height).setVisible(false);
    this.sceneryLayer.add([ground, this.bramble, this.blink, this.brambleArms]);
    this.animateBramble(0);
    if (this.engine?.activity?.kind === 'boss') {
      this.monty = this.add.image(73, 555, 'magpie').setDisplaySize(110, 110);
      this.sceneryLayer.add(this.monty);
      if (!reducedMotion.matches) this.tweens.add({ targets: this.monty, angle: { from: -3, to: 3 }, duration: 1800, yoyo: true, repeat: -1 });
    }
  }

  private makeBubbleTextures(): void {
    const mix = (value: number, target: number, amount: number): string => {
      const channel = (shift: number) => Math.round(((value >> shift) & 255) * (1 - amount) + ((target >> shift) & 255) * amount);
      return `rgb(${channel(16)},${channel(8)},${channel(0)})`;
    };
    for (const [color, style] of Object.entries(palette)) {
      const key = `orb-${color}`;
      if (this.textures.exists(key)) continue;
      const texture = this.textures.createCanvas(key, 128, 128)!;
      const context = texture.getContext();
      const fill = context.createRadialGradient(44, 36, 4, 62, 62, 64);
      fill.addColorStop(0, mix(style.fill, 0xffffff, .64));
      fill.addColorStop(.36, mix(style.fill, 0xffffff, .20));
      fill.addColorStop(.74, mix(style.fill, style.edge, .10));
      fill.addColorStop(1, mix(style.fill, style.edge, .68));
      context.fillStyle = fill;
      context.beginPath(); context.arc(64, 64, 59, 0, Math.PI * 2); context.fill();
      context.strokeStyle = mix(style.edge, 0xffffff, .12); context.lineWidth = 3.5; context.stroke();
      context.beginPath(); context.arc(64, 64, 53, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(255,255,255,.40)'; context.lineWidth = 1.5; context.stroke();
      context.beginPath(); context.arc(64, 64, 49, 3.65, 4.90);
      context.strokeStyle = 'rgba(255,255,255,.90)'; context.lineWidth = 5; context.lineCap = 'round'; context.stroke();
      context.beginPath(); context.ellipse(43, 37, 9, 4, -.5, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255,255,255,.65)'; context.fill();
      context.beginPath(); context.arc(64, 64, 48, .34, 1.26);
      context.strokeStyle = mix(style.edge, 0xffffff, .2); context.globalAlpha = .35; context.lineWidth = 4; context.stroke();
      context.globalAlpha = 1;
      texture.refresh();
    }
  }

  private makeBubble(x: number, y: number, bubble: Bubble, radius = BUBBLE_RADIUS): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    if (bubble.kind === 'honeycomb') {
      const facets = Array.from({ length: 6 }, (_, i) => new Phaser.Math.Vector2(Math.cos(i * Math.PI / 3) * radius, Math.sin(i * Math.PI / 3) * radius));
      container.add(this.add.circle(1, 3, radius, 0x674b30, .18));
      container.add(this.add.polygon(0, 0, facets, 0xe3b368).setOrigin(0, 0).setStrokeStyle(2.4, 0x966638));
      container.add(this.add.polygon(0, 0, facets.map((v) => v.clone().scale(.7)), 0xba854a).setOrigin(0, 0).setStrokeStyle(1.5, 0xffdf95));
      container.add(this.add.polygon(0, 1, facets.map((v) => v.clone().scale(.4)), 0x8e653c).setOrigin(0, 0));
      container.add(this.add.ellipse(-5, -9, 9, 3, 0xffedb8, .8).setAngle(-28));
      return container;
    }
    const style = palette[bubble.color ?? 'R'];
    container.add(this.add.ellipse(1, radius * .52, radius * 1.9, radius * 1.1, 0x24443a, .17));
    container.add(this.add.image(0, 0, `orb-${bubble.color ?? 'R'}`).setDisplaySize(radius * 2.16, radius * 2.16));
    if (bubble.kind === 'pollen') {
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        container.add(this.add.ellipse(Math.sin(angle) * radius * .65, Math.cos(angle) * radius * .65, 7, 10, 0xffe8a0, .95).setRotation(-angle).setStrokeStyle(1, 0xc89442, .7));
      }
    }
    if (bubble.kind === 'bloom' && bubble.alternate) {
      const rim = this.add.graphics();
      rim.lineStyle(4, palette[bubble.alternate].fill).beginPath().arc(0, 0, radius - 1, -.15, 2.5).strokePath();
      container.add(rim);
      container.add(this.add.triangle(radius - 1, 3, 0, 0, 5, 2, 1, 6, palette[bubble.alternate].edge));
    }
    if (bubble.bee) container.add(this.add.image(0, 1, 'bee').setDisplaySize(radius * 1.4, radius * 1.4));
    else container.add(this.add.text(0, .7, style.glyph, {
      fontFamily: 'Georgia, serif', fontSize: `${Math.round(radius * .96)}px`, fontStyle: 'bold', color: style.ink, stroke: '#fff8de', strokeThickness: .8
    }).setOrigin(.5));
    if (bubble.kind === 'dew') {
      container.add(this.add.circle(0, 0, radius - .5, 0xe3faff, .23).setStrokeStyle(2.2, 0xf0ffff, .95));
      const shell = this.add.graphics();
      shell.lineStyle(1.5, 0x75afca, .85).beginPath().moveTo(-radius + 3, -2).lineTo(-8, 0).lineTo(-5, 6).strokePath();
      shell.lineStyle(2.3, 0xffffff, .9).beginPath().arc(0, 0, radius - 3, 4.8, 5.8).strokePath();
      container.add(shell);
      container.add(this.add.star(radius * .53, -radius * .53, 4, 2, 5, 0xffffff));
    } else if (bubble.kind === 'bloom') {
      container.add(this.add.circle(radius * .58, -radius * .55, 6.5, palette[bubble.alternate ?? bubble.color ?? 'G'].fill).setStrokeStyle(1.5, 0xfff7d5));
      container.add(this.add.text(radius * .58, -radius * .55, '↻', { fontSize: '11px', color: '#36564c' }).setOrigin(.5));
    }
    return container;
  }

  private drawBoard(before?: OccupiedCell[], result?: FireResult): void {
    this.pathBee?.list.forEach(child => this.tweens.killTweensOf(child));
    this.boardLayer.removeAll(true);
    this.pathBee = undefined;
    if (!this.engine) return;
    const route = this.engine.flightPath;
    if (route) {
      const guide = this.add.graphics();
      for (let i = 0; i < route.length; i++) {
        const point = cellPosition(route[i]);
        guide.lineStyle(2, 0x93774a, .5).strokeCircle(point.x, point.y, 7);
        if (i > 0) {
          const previous = cellPosition(route[i - 1]);
          guide.fillStyle(0x93774a, .5).fillCircle((point.x + previous.x) / 2, (point.y + previous.y) / 2, 2);
        }
      }
      this.boardLayer.add(guide);
      const goal = cellPosition(route[route.length - 1]);
      this.boardLayer.add(this.add.text(goal.x, goal.y, '⌂', { fontSize: '26px', color: '#856338' }).setOrigin(.5));
      const step = result?.flight?.from ?? this.engine.flightStep;
      if (step < route.length) {
        const point = cellPosition(route[Math.max(0, step - 1)]);
        const wings = [this.add.ellipse(-8, -8, 14, 9, 0xffffff, .9), this.add.ellipse(8, -8, 14, 9, 0xffffff, .9)];
        this.pathBee = this.add.container(point.x, point.y, [...wings, this.add.image(0, 0, 'bee-body').setDisplaySize(27, 27), this.add.text(0, -18, '✿', { fontSize: '15px', color: '#b56582' }).setOrigin(.5)]);
        // Add after bubbles below so Mabel remains visible in the cleared path.
        if (!reducedMotion.matches) this.tweens.add({ targets: wings, scaleY: .3, duration: 70, yoyo: true, repeat: -1 });
      }
    }
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
      const orb = this.makeBubble(point.x, point.y, cell.bubble);
      this.boardLayer.add(orb);
      if (result && !reducedMotion.matches) {
        const move = result.turn?.moves.find((m) => m.to.row === cell.row && m.to.col === cell.col);
        const origin = move?.from ?? cell;
        const previous = before?.find((c) => c.row === origin.row && c.col === origin.col);
        if (move) { const start = cellPosition(move.from); orb.setPosition(start.x, start.y); this.tweens.add({ targets: orb, x: point.x, y: point.y, duration: 260, ease: 'Sine.InOut' }); }
        if (previous && previous.bubble.color !== cell.bubble.color) {
          const old = this.makeBubble(0, 0, previous.bubble); orb.add(old);
          this.tweens.add({ targets: old, alpha: 0, duration: 320, onComplete: () => old.destroy() });
        }
        if (result.settled?.placed?.row === cell.row && result.settled.placed.col === cell.col) {
          orb.setScale(1.15, .85); this.tweens.add({ targets: orb, scaleX: 1, scaleY: 1, duration: 180, ease: 'Back.Out' });
        }
      }
    }
    if (this.pathBee) this.boardLayer.add(this.pathBee);
    if (this.engine.activity?.kind === 'boss' && this.engine.activity.phase === 0 && this.engine.rulesVersion >= 5) {
      const clasps = this.add.graphics();
      for (const col of [0, 8]) {
        const cell = { row: 0, col };
        if (!this.engine.board.get(cell)?.bee) continue;
        const point = cellPosition(cell);
        clasps.lineStyle(2.5, 0xffd67b, .95).strokeCircle(point.x, point.y, 21);
        clasps.fillStyle(0xffe29c, .95).fillCircle(point.x, point.y - 24, 3);
      }
      this.boardLayer.add(clasps);
    }
  }

  private animateFlight(result: FireResult): number {
    const flight = result.flight;
    const route = this.engine?.flightPath;
    const bee = this.pathBee;
    if (!flight || !route || !bee || flight.from === flight.to) return 0;
    const destination = cellPosition(route[Math.min(route.length - 1, flight.to - 1)]);
    if (reducedMotion.matches) { bee.setPosition(destination.x, destination.y); if (flight.arrived) bee.destroy(); return 100; }
    const duration = Math.min(600, (flight.to - flight.from) * 140);
    const cursor = { step: Math.max(0, flight.from - 1) };
    this.tweens.add({ targets: cursor, step: flight.to - 1, duration, ease: 'Sine.InOut', onUpdate: () => {
      const index = Math.floor(cursor.step);
      const a = cellPosition(route[index]); const b = cellPosition(route[Math.min(route.length - 1, index + 1)]);
      const fraction = cursor.step - index;
      bee.setPosition(a.x + (b.x - a.x) * fraction + Math.sin(fraction * Math.PI) * 6, a.y + (b.y - a.y) * fraction);
    }, onComplete: () => {
      if (flight.arrived) { bee.list.forEach(child => this.tweens.killTweensOf(child)); bee.destroy(); this.flyBee(destination.x, destination.y, 0); }
    } });
    return flight.arrived ? duration + 900 : duration;
  }

  private drawShooter(): void {
    this.shooterBubble?.destroy();
    this.nextBubble?.destroy();
    this.wildLabel?.destroy();
    if (!this.engine) return;
    this.shooterBubble = this.makeShotBubble(195, 690, 22);
    this.nextBubble = this.makeBubble(nextBubblePoint.x, nextBubblePoint.y, normalBubble(this.engine.nextColor), 18);
    const label = this.engine.bloomArmed ? 'BLOOM SHOT' : this.engine.wildColor ? 'WILD SHOT' : this.engine.armedBooster ? boosterById[this.engine.armedBooster.id].name.toUpperCase() : '';
    if (label) {
      this.wildLabel = this.add.text(195, 656, label, { fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: 'bold', color: '#fff4b3', backgroundColor: '#3c705c' }).setPadding(5, 2).setOrigin(.5);
    }
  }
  private makeShotBubble(x: number, y: number, radius = BUBBLE_RADIUS): Phaser.GameObjects.Container {
    const orb = this.makeBubble(x, y, normalBubble(this.engine!.shotColor()), radius);
    const id = this.engine?.armedBooster?.id;
    if (this.engine?.bloomArmed) {
      orb.removeAll(true);
      for (let i = 0; i < 6; i++) {
        const petal = this.add.ellipse(Math.cos(i * Math.PI / 3) * 10, Math.sin(i * Math.PI / 3) * 10, 14, 21, 0xefb3cc).setAngle(i * 60 + 90).setStrokeStyle(1, 0xfff4df);
        orb.add(petal);
      }
      orb.add(this.add.circle(0, 0, 8, 0xffdf8d).setStrokeStyle(2, 0xfff5d6));
    } else if (id === 'rainbow' && this.engine && this.engine.rulesVersion >= 2) {
      orb.removeAll(true);
      const rainbow = this.add.graphics();
      Object.values(palette).forEach((color, i) => rainbow.fillStyle(color.fill).slice(0, 0, radius, i * Math.PI / 3, (i + 1) * Math.PI / 3, false).fillPath());
      rainbow.lineStyle(2, 0xfff8dc).strokeCircle(0, 0, radius);
      orb.add(rainbow);
      orb.add(this.add.circle(0, 0, radius - 3).setStrokeStyle(1.5, 0xffffff, .45));
      orb.add(this.add.ellipse(-5, -7, 12, 6, 0xffffff, .6));
      orb.add(this.add.star(radius - 2, -radius + 3, 4, 2, 5, 0xfff8dc));
      orb.add(this.add.text(0, 1, '✦', { fontSize: '19px', color: '#fffdf0' }).setOrigin(.5));
    } else if (id === 'double') {
      const rings = this.add.graphics();
      rings.lineStyle(2.4, 0xfff6c8, .95).strokeEllipse(-3, 0, radius * 2 + 6, radius * 1.35).strokeEllipse(3, 0, radius * 1.35, radius * 2 + 6);
      orb.add(rings);
      orb.add(this.add.text(0, 0, '×2', { fontSize: '15px', fontStyle: 'bold', color: '#244f43', stroke: '#fff7d8', strokeThickness: 3 }).setOrigin(.5));
    } else if (id === 'bonk') {
      orb.removeAll(true);
      const shell = this.makeBubble(0, 0, { color: null, bee: false, kind: 'honeycomb' }, radius);
      orb.add(shell);
      orb.add(this.add.text(0, 0, '✦', { fontSize: '20px', color: '#fff0b9' }).setOrigin(.5));
    }
    return orb;
  }
  showSuggestedAim(angle: number, swap: boolean): void {
    if (this.engine?.guideHidden || this.isBusy()) return;
    if (swap) this.swap();
    this.aimAngle = angle;
    this.drawAim();
  }
  private setAim(x: number, y: number): void {
    this.aimAngle = Phaser.Math.Clamp(Math.atan2(x - 195, 690 - y), -1.25, 1.25);
    this.cancelAimVisible = this.aiming && isAimCancelPoint({ x, y });
    this.drawAim();
    this.syncAimCoach();
  }
  private drawAim(): void {
    this.aimGraphics.clear();
    if (!this.engine || this.flying || this.resolving || this.inspectMode || this.engine.won || this.engine.lost || this.engine.awaitingTopUp) return;
    if (this.engine.guideHidden) {
      this.aimGraphics.lineStyle(3, 0x577d61, .85).lineBetween(195 + Math.sin(this.aimAngle) * 24, 690 - Math.cos(this.aimAngle) * 24, 195 + Math.sin(this.aimAngle) * 62, 690 - Math.cos(this.aimAngle) * 62);
      this.drawAimCancelTarget();
      return;
    }
    if (aimGuideMode === 'short') {
      const points = shortAimPoints(this.aimAngle);
      points.forEach((point, index) => {
        if (index === 0) return;
        this.aimGraphics.fillStyle(0x577d61, Math.max(.28, .72 - index * .045));
        this.aimGraphics.fillCircle(point.x, point.y, index === points.length - 1 ? 3.4 : 2.8);
      });
      this.drawAimCancelTarget();
      return;
    }
    const trace = this.engine.preview(this.aimAngle);
    for (let i = 4; i < trace.path.length; i += 5) {
      const point = trace.path[i];
      this.aimGraphics.fillStyle(0x577d61, Math.max(.24, .78 - i * .003));
      this.aimGraphics.fillCircle(point.x, point.y, i < 45 ? 3.3 : 2.5);
    }
    if (this.engine.bloomArmed) {
      if (trace.impact) for (const cell of this.engine.board.bloomGroup(trace.impact)) {
        const p = cellPosition(cell); this.aimGraphics.lineStyle(2.5, 0xffdfed, .95).strokeCircle(p.x, p.y, 20);
      }
    } else if (this.engine.armedBooster?.id === 'rainbow' && this.engine.rulesVersion >= 2) {
      if (trace.impact) for (const cell of this.engine.board.rainbowGroup(trace.impact)) {
        const p = cellPosition(cell); this.aimGraphics.lineStyle(2, 0xffffff, .9).strokeCircle(p.x, p.y, 20);
      }
    } else if (trace.placement) {
      if (!this.engine.armedBooster || this.engine.armedBooster.id === 'double') {
        const preview = this.engine.board.clone().settle(trace.placement, normalBubble(this.engine.shotColor()), this.engine.armedBooster?.id === 'double' ? 2 : 3);
        for (const cell of preview.popped) {
          const point = cellPosition(cell);
          this.aimGraphics.lineStyle(2, 0xfff7d3, .95).strokeCircle(point.x, point.y, 19);
        }
        for (const cell of preview.cracked) {
          const point = cellPosition(cell);
          this.aimGraphics.lineStyle(2, 0xcff5ff, .95).strokeCircle(point.x, point.y, 20);
        }
      }
      const p = cellPosition(trace.placement);
      this.aimGraphics.fillStyle(palette[this.engine.shotColor()].fill, .24).fillCircle(p.x, p.y, 16);
      this.aimGraphics.lineStyle(2, palette[this.engine.shotColor()].edge, .75).strokeCircle(p.x, p.y, 16);
    }
    if (this.engine.armedBooster?.id === 'rainbow' && this.engine.rulesVersion >= 2 && trace.impact && !this.engine.canFire(this.aimAngle)) {
      const p = cellPosition(trace.impact);
      this.aimGraphics.lineStyle(2.5, 0x8e573f, .9).lineBetween(p.x - 6, p.y - 6, p.x + 6, p.y + 6).lineBetween(p.x + 6, p.y - 6, p.x - 6, p.y + 6);
    }
    if (this.engine.armedBooster?.id === 'bonk' && trace.impact) {
      const point = cellPosition(trace.impact);
      this.aimGraphics.lineStyle(4, 0xffd466, .95).strokeCircle(point.x, point.y, 22);
      if (this.engine.rulesVersion >= 5) for (const cell of neighborCells(trace.impact)) if (this.engine.board.get(cell)?.kind === 'dew') {
        const dew = cellPosition(cell);
        this.aimGraphics.lineStyle(2.5, 0xd2f8ff, .95).strokeCircle(dew.x, dew.y, 21);
      }
    }
    this.drawAimCancelTarget();
  }
  private drawAimCancelTarget(): void {
    if (!this.aiming || !this.cancelAimVisible) return;
    this.aimGraphics.fillStyle(0x57a57b, .22).fillCircle(195, 690, 48);
    this.aimGraphics.lineStyle(3.5, 0x2f805d, .98).strokeCircle(195, 690, 48);
  }
  private fire(): void {
    if (!this.engine || this.flying || this.resolving || this.engine.won || this.engine.lost || !overlay.classList.contains('hidden')) return;
    if (!this.engine.canFire(this.aimAngle)) { notice(this.engine.bloomArmed ? 'Aim Bloom at a colored bubble. Honeycomb blocks it.' : this.engine.armedBooster?.id === 'rainbow' ? 'Aim at a colored bubble. Honeycomb blocks Rainbow.' : 'Aim Bonk at a tile first.'); return; }
    const trace = this.engine.preview(this.aimAngle);
    this.brambleThrowMs = 0;
    this.flying = { trace, index: 0, angle: this.aimAngle, sprite: this.makeShotBubble(195, 690) };
    this.shooterBubble?.setVisible(false);
    this.aimGraphics.clear();
    playSound('shoot');
  }
  update(_time: number, delta: number): void {
    this.animateBramble(delta);
    if (!this.flying) return;
    const shot = this.flying;
    shot.index = Math.min(shot.trace.path.length - 1, shot.index + Math.max(900, shot.trace.path.length * 4 / .75) * Math.min(delta, 50) / 1000 / 4);
    const point = shot.trace.path[Math.floor(shot.index)];
    shot.sprite.setPosition(point.x, point.y);
    if (!reducedMotion.matches && (this.engine?.armedBooster || this.engine?.bloomArmed) && (this.trailClock += delta) > 40) {
      this.trailClock = 0;
      const id = this.engine.armedBooster?.id;
      const dot = this.add.circle(point.x + (id === 'double' ? Math.sin(shot.index) * 7 : 0), point.y, id === 'bonk' ? 3 : 5, id === 'rainbow' ? Object.values(palette)[Math.floor(shot.index) % 6].fill : id === 'bonk' ? 0xe9c078 : this.engine.bloomArmed ? 0xf2bdd4 : 0xfff1b0, .6);
      this.effectLayer.add(dot); this.tweens.add({ targets: dot, alpha: 0, scale: .2, duration: 230, onComplete: () => dot.destroy() });
    }
    if (shot.index >= shot.trace.path.length - 1) this.land();
  }
  private animateBramble(delta: number): void {
    if (!this.engine || !this.bramble?.active || !this.blink?.active || !this.brambleArms?.active) return;
    const menuOpen = !overlay.classList.contains('hidden');
    const allowed = brambleMotionAllowed({ aiming: this.aiming, menuOpen, pageHidden: document.hidden, reducedMotion: reducedMotion.matches });
    const step = Math.min(delta, 50);
    if (allowed) this.brambleClock += step;
    if (this.brambleThrowMs !== undefined && !menuOpen) {
      this.brambleThrowMs += step;
      if (this.brambleThrowMs >= 360 && !this.shooterBubble?.visible) this.brambleThrowMs = 360;
      else if (this.brambleThrowMs >= 520) this.brambleThrowMs = undefined;
    }
    this.brambleMotion = reducedMotion.matches ? 0 : Phaser.Math.Clamp(this.brambleMotion + (allowed ? step / 220 : -step / 140), 0, 1);
    const idle = brambleIdlePose(this.brambleClock, this.brambleMotion);
    const toss = brambleTossPose(this.aimAngle, this.brambleThrowMs, reducedMotion.matches || menuOpen, this.shooterBubble?.visible ?? true);
    const angle = idle.angle + toss.lean;
    const center = { x: brambleBodyPoint.x + toss.shiftX, y: brambleBodyPoint.y - idle.rise - toss.lift };
    const width = this.brambleSize.width * idle.scaleX * (1 + (1 - toss.scaleY) * .5);
    const height = this.brambleSize.height * idle.scaleY * toss.scaleY;
    for (const image of [this.bramble, this.blink]) image.setPosition(center.x, center.y).setAngle(angle).setDisplaySize(width, height);
    this.blink.setVisible(allowed && idle.blink);
    this.bramble.setVisible(!this.blink.visible);
    const arms = this.brambleArms;
    arms.clear().setPosition(0, 0).setAngle(0);
    const shape = (outline: typeof bramblePawOutline | typeof brambleSleeveOutline, from: { x: number; y: number }, pawAngle: number, color: number, edge: number, lineWidth: number) => {
      const radians = pawAngle * Math.PI / 180;
      const point = (x: number, y: number) => ({ x: from.x + x * Math.cos(radians) - y * Math.sin(radians), y: from.y + x * Math.sin(radians) + y * Math.cos(radians) });
      const start = point(outline.start[0], outline.start[1]);
      const path = new Phaser.Curves.Path(start.x, start.y);
      for (const curve of outline.curves) {
        const end = point(curve[0], curve[1]), first = point(curve[2], curve[3]), second = point(curve[4], curve[5]);
        path.cubicBezierTo(end.x, end.y, first.x, first.y, second.x, second.y);
      }
      const points = path.getPoints(16);
      arms.fillStyle(color).fillPoints(points, true);
      arms.lineStyle(lineWidth, edge).strokePoints(points, true);
    };
    // Two matching, rounded forepaws cradle the orb. Both stay the same short length.
    for (const side of [0, 1] as const) {
      const from = brambleShoulder(center, width, height, angle, side);
      const pawAngle = angle + (side === 0 ? -180 - toss.pawAngle : toss.pawAngle);
      shape(bramblePawOutline, from, pawAngle, 0x485647, 0x293c31, 1.6);
      shape(brambleSleeveOutline, from, pawAngle, 0xe3a94f, 0xad7738, 1.2);
    }

  }

  private land(): void {
    if (!this.flying || !this.engine) return;
    const shot = this.flying;
    shot.sprite.destroy();
    this.flying = undefined;
    const before = this.engine.board.entries();
    const result = this.engine.fire(shot.angle);
    if (result.booster) consumeBooster(save, result.booster);
    let stars = 0;
    let firstClear = false;
    if (this.engine.activity) {
      if (result.won || result.lost) recordActivityResult(save, this.engine);
      else { this.runActions.push({ type: 'fire', angle: shot.angle }); this.saveAttempt(); }
    } else if (result.won) {
      const margin = this.engine.level.shots - this.engine.level.par;
      const used = this.engine.turns;
      stars = used <= this.engine.level.par ? 3 : used <= this.engine.level.par + Math.floor(margin / 2) ? 2 : 1;
      firstClear = !save.stars[this.levelIndex];
      recordWin(save, this.levelIndex, stars);
      recordMastery(save, this.levelIndex, this.engine);
      delete save.activeRun;
    } else if (result.lost) {
      recordLoss(save, this.levelIndex);
      delete save.activeRun;
    } else {
      this.runActions.push({ type: 'fire', angle: shot.angle });
      this.saveAttempt();
    }
    storeSave(save);
    this.resolving = true;
    this.drawBoard(before, result);
    this.drawShooter();
    this.drawAim();
    updateHud(this);
    if (result.settled?.popped.length) playSound('pop');
    if (result.booster === 'bonk') playSound('bonk');
    if ((result.settled?.beesFreed ?? 0) + (result.turn?.beesFreed ?? 0)) playSound('rescue');
    if ((result.settled?.bonusShots ?? 0) + (result.turn?.bonusShots ?? 0)) playSound('bonus');
    if (result.turn?.moved) playSound('wind');
    const animationTime = Math.max(this.animateCleared(result), this.animateFlight(result));
    this.showShotFeedback(result);
    if (result.bossBeat && this.monty && !reducedMotion.matches) {
      this.tweens.add({ targets: this.monty, x: result.bossBeat === 'stalled' ? 57 : 83, scale: result.bossBeat === 'clasp' ? 1.12 : 1.06, duration: 130, yoyo: true, ease: 'Back.Out' });
    }
    const epoch = this.epoch;
    this.time.delayedCall(animationTime, () => {
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
      } else if (this.engine?.awaitingTopUp) {
        this.pendingAction = undefined; showTopUp();
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
    if (result.bloom) labels.push('A little room to bloom! ✿');
    else if (this.engine?.bloomUnlocked && this.engine.bloomCharge === this.engine.bloomGoal) labels.push('Bloom is ready beside the launcher ✿');
    if (result.flight?.arrived) labels.push('Mabel found her way home!');
    if (result.bossBeat === 'clasp') labels.push('Clasp open! 🔓');
    else if (result.bossBeat === 'stalled') labels.push('Monty’s screen stalled!');
    else if (result.bossBeat === 'screen') labels.push('Monty shifts the screen →');
    else if (result.bossBeat === 'gate') labels.push('Monty flips the gate ↻');
    if (freed) labels.push(freed === 1 ? 'Bee friend home! 🐝' : `${freed} bee friends home! 🐝`);
    if (bonus) labels.push(this.engine?.challenge?.shotLimit ? 'Pollen found · challenge limit stays' : `+${bonus} bubbles from pollen ✺`);
    else if (cracked) labels.push('Dew shell cracked ❄');
    else if (dropped >= 4) labels.push('Lovely chain drop! ↓');
    else if (result.booster === 'bonk') labels.push('Bonk! ⬢');
    else if (result.turn?.moved) labels.push('The breeze shifted →');
    labels.slice(0, 2).forEach((label, index) => {
      const message = this.add.text(195, (this.engine?.activity?.kind === 'boss' ? 461 : 548) + index * 29, label, {
        fontFamily: 'Trebuchet MS, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#fff8dd',
        backgroundColor: '#275e52'
      }).setPadding(9, 5).setOrigin(.5).setDepth(20);
      this.effectLayer.add(message);
      if (reducedMotion.matches) this.time.delayedCall(700, () => message.destroy());
      else this.tweens.add({ targets: message, y: message.y - 35, alpha: 0, duration: 900, ease: 'Sine.Out', onComplete: () => message.destroy() });
    });
  }
  private sparkle(x: number, y: number, color: number, count = 5, shards = false): void {
    for (let i = 0; i < count && this.sparkleBudget > 0; i++, this.sparkleBudget--) {
      const angle = i * Math.PI * 2 / count + .3;
      const particle = shards ? this.add.triangle(x, y, 0, -4, 3, 3, -3, 2, color, .85).setOrigin(0, 0)
        : this.add.ellipse(x, y, 4, 7, color, .8);
      this.effectLayer.add(particle);
      this.tweens.add({ targets: particle, x: x + Math.cos(angle) * 25, y: y + Math.sin(angle) * 23 + 8,
        angle: 90, alpha: 0, scale: .3, duration: 450, ease: 'Sine.Out', onComplete: () => particle.destroy() });
    }
  }
  private impactRing(x: number, y: number, color: number, delay = 0): void {
    const ring = this.add.circle(x, y, 12).setStrokeStyle(2.5, color, .85);
    this.effectLayer.add(ring);
    this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, delay, duration: 330, ease: 'Sine.Out', onComplete: () => ring.destroy() });
  }
  private pollenGift(x: number, y: number): void {
    if (this.sparkleBudget <= 0) return;
    this.sparkleBudget--;
    const bounds = shotsCount.getBoundingClientRect(); const canvas = this.game.canvas.getBoundingClientRect();
    const target = { x: (bounds.x + bounds.width / 2 - canvas.x) * 390 / canvas.width, y: (bounds.y + bounds.height / 2 - canvas.y) * 844 / canvas.height };
    const mote = this.add.star(x, y, 5, 3, 7, 0xffd778).setStrokeStyle(1, 0xfff8d4);
    this.effectLayer.add(mote);
    this.tweens.add({ targets: mote, x: target.x, y: target.y, angle: 100, scale: .4, duration: 480, ease: 'Sine.InOut', onComplete: () => {
      mote.destroy(); shotsCount.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 180 });
    } });
  }
  private animateCleared(result: FireResult): number {
    const popped = result.settled?.popped ?? [];
    const dropped = [...(result.settled?.dropped ?? []), ...(result.turn?.dropped ?? [])];
    const cleared = [...popped, ...dropped];
    if (reducedMotion.matches) { this.displayedBees = this.engine!.freedBees; updateHud(this); return 100; }
    this.sparkleBudget = 48;
    const impact = result.trace.impact ? cellPosition(result.trace.impact) : result.settled?.placed ? cellPosition(result.settled.placed) : undefined;
    if (impact && result.bloom) { this.impactRing(impact.x, impact.y, 0xf4b1cf); this.sparkle(impact.x, impact.y, 0xf4b1cf, 10); }
    if (impact && result.booster) {
      if (result.booster === 'rainbow') {
        this.impactRing(impact.x, impact.y, 0xe1baea);
        this.impactRing(impact.x, impact.y, 0xffe49c, 75);
        Object.values(palette).forEach((color, i) => this.sparkle(impact.x + Math.cos(i) * 9, impact.y + Math.sin(i) * 9, color.fill, 2));
      } else if (result.booster === 'double') {
        this.impactRing(impact.x - 7, impact.y, 0xfff0ad);
        this.impactRing(impact.x + 7, impact.y, palette[result.color].fill, 70);
      } else {
        this.impactRing(impact.x, impact.y, 0xffe29a);
        this.impactRing(impact.x, impact.y, 0x9b663f, 85);
        this.sparkle(impact.x, impact.y, 0xe9bd70, 14, true);
      }
    }
    for (const cell of result.settled?.cracked ?? []) {
      const p = cellPosition(cell); this.sparkle(p.x, p.y, 0xe6faff, 5, true); this.impactRing(p.x, p.y, 0xb8e0eb);
    }
    const freed = cleared.filter((cell) => cell.bubble.bee).length;
    if (freed && this.bramble) this.tweens.add({ targets: [this.bramble, this.blink], angle: -7, duration: 160, yoyo: true, repeat: 1 });
    cleared.forEach((cell, index) => {
      const point = cellPosition(cell);
      const orb = this.makeBubble(point.x, point.y, { ...cell.bubble, bee: false });
      this.effectLayer.add(orb);
      const falling = index >= popped.length;
      const delay = Math.min(index * 22, 180);
      this.tweens.add({ targets: orb, y: point.y + (falling ? 130 : 0), scale: falling ? .7 : 1.25,
        alpha: 0, angle: falling ? 22 : 0, delay, duration: falling ? 390 : 220, ease: falling ? 'Quad.In' : 'Sine.Out', onComplete: () => orb.destroy() });
      if (cell.bubble.kind === 'pollen') { this.pollenGift(point.x, point.y); this.sparkle(point.x, point.y, 0xffd36b, 5); }
      else if (index < 6) this.sparkle(point.x, point.y, cell.bubble.color ? palette[cell.bubble.color].fill : 0xd7ad69, 4, cell.bubble.kind === 'honeycomb');
      if (cell.bubble.bee) this.flyBee(point.x, point.y, delay);
    });
    return freed ? 1100 : cleared.length ? 590 : result.settled?.cracked.length ? 460 : 340;
  }
  private flyBee(x: number, y: number, delay: number): void {
    const bee = this.add.container(x, y);
    const wings = [this.add.ellipse(-9, -8, 17, 10, 0xf5ffeb, .9), this.add.ellipse(9, -8, 17, 10, 0xf5ffeb, .9)];
    bee.add([...wings, this.add.image(0, 0, 'bee-body').setDisplaySize(29, 29)]);
    this.effectLayer.add(bee);
    const flutter = this.tweens.add({ targets: wings, scaleY: .3, duration: 65, yoyo: true, repeat: -1 });
    const hive = document.querySelector('#hive-target')!.getBoundingClientRect();
    const canvas = this.game.canvas.getBoundingClientRect();
    const endX = (hive.x + hive.width / 2 - canvas.x) * 390 / canvas.width;
    const endY = (hive.y + hive.height / 2 - canvas.y) * 844 / canvas.height;
    const curve = new Phaser.Curves.CubicBezier(new Phaser.Math.Vector2(x, y), new Phaser.Math.Vector2(x + (x < 195 ? 55 : -55), y - 45), new Phaser.Math.Vector2(endX + 65, endY + 60), new Phaser.Math.Vector2(endX, endY));
    const state = { t: 0 }; const epoch = this.epoch;
    this.tweens.add({ targets: state, t: 1, delay, duration: 850, ease: 'Sine.InOut', onUpdate: () => {
      const p = curve.getPoint(state.t); bee.setPosition(p.x, p.y + Math.sin(state.t * 22) * 3); bee.setScale(1 - state.t * .4);
    }, onComplete: () => {
      flutter.stop(); bee.destroy();
      if (epoch !== this.epoch) return;
      this.displayedBees += 1; updateHud(this);
      document.querySelector('#hive-target')?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 220 });
    } });
  }

}

const scene = new PlayScene();
new Phaser.Game({
  type: Phaser.CANVAS, parent: 'game', width: 390, height: 844, transparent: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 390, height: 844 },
  render: { antialias: true, pixelArt: false }, scene: [scene]
});
const modalAimGuard = new MutationObserver(() => { if (!overlay.classList.contains('hidden')) scene.cancelAim(); });
modalAimGuard.observe(overlay, { attributes: true, attributeFilter: ['class'], childList: true });

function updateHud(current: PlayScene): void {
  const engine = current.engine;
  if (!engine) return;
  levelNumber.textContent = engine.activity?.kind === 'boss' ? `BOSS ${engine.activity.phase + 1}/3` : String(current.getLevelIndex() + 1).padStart(2, '0');
  levelName.textContent = engine.level.name;
  shotsCount.textContent = String(engine.shots);
  current.syncAimCoach();
  document.querySelector('#star-target')!.textContent = engine.activity ? engine.activity.kind === 'boss' ? engine.bossReadout ?? 'Monty’s picnic heist' : engine.challengeRelaxed ? 'Practice · no medal this time' : engine.challenge?.bankGoal ? `Bank rescues ${engine.bankBees}/${engine.challenge.bankGoal}` : `${engine.turns} shots taken` : `★ ★ ★ in ${engine.level.par} shots · taken ${engine.turns}`;
  beesCount.textContent = `${current.displayedBees}/${engine.totalBees}`;
  const bloomButton = document.querySelector<HTMLButtonElement>('#bloom-shot')!;
  bloomButton.hidden = !engine.bloomUnlocked;
  bloomButton.disabled = engine.awaitingTopUp || engine.bloomCharge < engine.bloomGoal;
  bloomButton.classList.toggle('ready', engine.bloomCharge >= engine.bloomGoal);
  bloomButton.setAttribute('aria-pressed', String(engine.bloomArmed));
  bloomButton.setAttribute('aria-label', engine.bloomArmed ? 'Cancel earned Bloom shot' : `Equip earned Bloom shot, ${engine.bloomCharge} of ${engine.bloomGoal} bubbles cleared`);
  bloomButton.title = 'Clear 12 bubbles to grow Bloom. Hit a colored bubble to burst it and its colored neighbors.';
  bloomButton.innerHTML = `<span>✿</span><strong>${engine.bloomArmed ? 'Cancel' : engine.bloomCharge >= engine.bloomGoal ? 'Ready' : `${engine.bloomCharge}/${engine.bloomGoal}`}</strong>`;
  bloomButton.style.setProperty('--bloom-fill', `${engine.bloomCharge / engine.bloomGoal * 100}%`);
  const chips: string[] = [];
  if (engine.flightPath) chips.push(`<span class="mechanic-chip">🐝 Path ${Math.min(engine.flightStep, engine.flightPath.length)}/${engine.flightPath.length}</span>`);
  if (engine.level.wind) {
    chips.push(`<button class="mechanic-chip" data-rule="wind" aria-label="Breeze moves in ${2 - engine.turns % 2} shots">Breeze ${2 - engine.turns % 2} ${engine.board.windPosition() === 0 ? '→' : '←'}</button>`);
  }
  for (const kind of ['pollen', 'honeycomb', 'dew', 'bloom'] as const) {
    if (engine.board.entries().some(({ bubble }) => bubble.kind === kind)) {
      chips.push(`<button class="mechanic-chip" data-rule="${kind}" aria-label="${ruleById[kind].name} rules">${ruleById[kind].symbol} ${{ pollen: 'Pollen', honeycomb: 'Honeycomb', dew: 'Dew', bloom: 'Chameleon' }[kind]}</button>`);
    }
  }
  if (engine.armedBooster || engine.wildColor) {
    const name = engine.armedBooster ? boosterById[engine.armedBooster.id].name : 'Wild shot';
    chips.push(`<button class="mechanic-chip armed" data-cancel-special="true">${escapeHtml(name)} ready ×</button>`);
  }
  const gift = giftReadout(save.inventory, save.unlocked, engine.giftsAllowed, engine.armedBooster?.id);
  document.querySelector('#gift-count')!.textContent = gift.text;
  const giftButton = document.querySelector<HTMLButtonElement>('#bag-button')!;
  giftButton.setAttribute('aria-label', gift.label);
  giftButton.classList.toggle('equipped', gift.equipped);
  mechanicStatus.innerHTML = chips.join('');
  mechanicStatus.classList.toggle('hidden', chips.length === 0);
}
function updateMuteButton(): void {
  muteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14M12 5v14M18 5v14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 9h6M9 15h6M15 8h6" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>';
  muteButton.setAttribute('aria-label', 'Music and sound settings');
  music.sync();
  syncEffects();
}

let lastChapter = 0;
const backToLevel = (): void => { if (scene.engine?.awaitingTopUp) { showTopUp(); return; } overlay.classList.add('hidden'); };
function showPause(): void {
  const engine = scene.engine;
  if (!engine || engine.won || engine.lost) return;
  if (scene.deferUntilReady(showPause)) return;
  scene.cancelAim();
  scene.setInspectMode(false);
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<div class="result-card pause-card" role="dialog" aria-label="Paused game"><span class="eyebrow">A LITTLE BREATHER</span><h2>${escapeHtml(engine.level.name)}</h2><p>${engine.freedBees} of ${engine.totalBees} bee friends home · ${engine.shots} bubbles left</p><div class="pause-saved">✦ Your board and next bubbles are saved automatically.</div><button id="pause-continue" class="primary-button">Keep playing <span>➜</span></button><button id="pause-restart" class="secondary-button">Restart this level</button><div class="result-links"><button id="pause-rules" class="text-button">Rules</button><button id="pause-bag" class="text-button">Gifts ✿</button><button id="pause-sound" class="text-button">Options</button></div>${engine.activity?.kind === 'challenge' && !engine.challengeRelaxed ? '<button id="pause-relax" class="secondary-button">Continue as normal · no medal</button>' : ''}<button id="pause-save" class="text-button">My Garden & saves</button><button id="pause-home" class="text-button">Return to the meadows</button></div>`;
  overlay.querySelector<HTMLButtonElement>('#pause-continue')!.addEventListener('click', backToLevel);
  overlay.querySelector<HTMLButtonElement>('#pause-restart')!.addEventListener('click', () => {
    if (engine.turns > 0) showRestartConfirm();
    else restartCurrent();
  });
  overlay.querySelector<HTMLButtonElement>('#pause-rules')!.addEventListener('click', () => showRules(showPause));
  overlay.querySelector<HTMLButtonElement>('#pause-bag')!.addEventListener('click', () => showBag(showPause));
  overlay.querySelector<HTMLButtonElement>('#pause-sound')!.addEventListener('click', () => showAudio(showPause));
  overlay.querySelector('#pause-relax')?.addEventListener('click', () => scene.relaxChallenge());
  overlay.querySelector('#pause-save')!.addEventListener('click', () => showMyGarden(showPause));
  overlay.querySelector<HTMLButtonElement>('#pause-home')!.addEventListener('click', showHome);
}
function showRestartConfirm(): void {
  const activity = scene.engine?.activity;
  const index = scene.getLevelIndex();
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<div class="result-card confirm-card" role="dialog" aria-label="Restart this level"><span class="eyebrow">START FRESH?</span><h2>${activity?.kind === 'boss' ? 'Retry this phase?' : activity ? 'Restart this challenge?' : 'Restart this meadow?'}</h2><p>Your current board will start over. Power-ups already fired stay spent.${activity?.kind === 'boss' ? ' Earlier phases remain saved.' : ''}</p><button id="restart-keep" class="primary-button">Keep my attempt <span>➜</span></button><button id="restart-confirm" class="text-button">${activity?.kind === 'boss' ? 'Retry this phase' : activity ? 'Restart challenge' : `Restart level ${index + 1}`}</button></div>`;
  overlay.querySelector<HTMLButtonElement>('#restart-keep')!.addEventListener('click', showPause);
  overlay.querySelector<HTMLButtonElement>('#restart-confirm')!.addEventListener('click', restartCurrent);
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
    return `<details class="rule-card ${focus === id ? 'featured' : ''}" ${focus === id ? 'open' : ''}><summary><span class="rule-symbol">${rule.symbol}</span><span><strong>${escapeHtml(rule.name)}</strong><small>${escapeHtml(rule.short)}</small></span></summary><p>${escapeHtml(rule.detail)}</p></details>`;
  }).join('');
  const lesson = scene.engine?.level.tutorial;
  overlay.className = 'overlay sheet-overlay';
  overlay.innerHTML = `<section class="sheet rules-sheet" role="dialog" aria-label="Bubble rules"><div class="sheet-top"><span class="eyebrow">BRAMBLE'S FIELD GUIDE</span><button class="sheet-close" id="rules-close" aria-label="Close rules">×</button></div><h2>Bubble rules</h2><div class="sheet-scroll">${current.length ? `<h3>On this board</h3>${render(current)}` : ''}<h3>${current.length ? 'Other tricks' : 'All tricks'}</h3>${render(remaining)}<h3>Gifts</h3>${boosters.map(booster => `<details class="rule-card"><summary><span class="rule-symbol">${booster.symbol}</span><span><strong>${escapeHtml(booster.name)}</strong><small>${escapeHtml(booster.description)}</small></span></summary><p>Uses one shot. Gifts can be refilled for free.</p></details>`).join('')}<details class="rule-extra"><summary>More about Bloom, Mabel and keepsakes</summary><p>Bloom: clear 12 bubbles, then tap the flower. It bursts a colored target and its colored neighbors.</p><p>Mabel: clear her dotted route. She moves after each shot.</p><p>Keepsakes reward an unaided clear, a drop of 8, or a bank rescue.</p></details><p class="rule-footnote">Five more bubbles are always free in normal play. Stars count shots used.</p></div><div class="sheet-actions">${scene.engine && !scene.engine.won && !scene.engine.lost ? '<button id="inspect-start" class="secondary-button">Inspect this board</button>' : ''}${lesson ? '<button id="replay-lesson" class="text-button">Replay lesson</button>' : ''}</div></section>`;
  overlay.querySelector<HTMLButtonElement>('#rules-close')!.addEventListener('click', returnTo);
  overlay.querySelector<HTMLButtonElement>('#inspect-start')?.addEventListener('click', () => {
    scene.setInspectMode(true);
    backToLevel();
  });
  overlay.querySelector<HTMLButtonElement>('#replay-lesson')?.addEventListener('click', () => {
    showGuide('A NEW LITTLE TRICK', scene.engine!.level.name, lesson!, () => showRules(returnTo, focus), false, scene.engine!.level.id);
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
  overlay.innerHTML = `<div class="result-card guide-card" role="dialog" aria-label="Choose a bubble color"><span class="eyebrow">A LITTLE HELP FROM BRAMBLE</span><h2>Choose a color</h2><p>${kind === 'wild' ? 'One free shot after two tries. Pick any color still on the board.' : 'Rainbow Pop becomes any color still on the board.'}</p><div class="color-options">${choices}</div><button id="picker-back" class="text-button">Back to Gifts</button></div>`;
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
  const playing = Boolean(engine && engine.giftsAllowed && !engine.won && !engine.lost && !engine.awaitingTopUp);
  const cards = boosters.map((booster) => {
    const unlocked = save.unlocked >= booster.unlockLevel;
    const legacy = booster.id === 'rainbow' && engine?.rulesVersion === 1;
    return `<article class="booster-card"><span class="booster-symbol ${booster.id}">${booster.symbol}</span><div class="booster-description"><strong>${escapeHtml(booster.name)}</strong><p>${legacy ? 'This saved attempt keeps its original chosen-color Rainbow. New attempts use the color burst.' : escapeHtml(booster.description)}</p><small>${unlocked ? `${save.inventory[booster.id]} ready for you` : `Opens at level ${booster.unlockLevel}`}</small></div>${unlocked && playing ? `<div class="booster-actions"><button data-use="${booster.id}" ${save.inventory[booster.id] < 1 ? 'disabled' : ''}>Use</button></div>` : ''}</article>`;
  }).join('');
  const wild = playing && (save.failures[scene.getLevelIndex()] || 0) >= 2 && !engine!.wildUsed
    ? `<article class="booster-card wild-card"><span class="booster-symbol">✦</span><div class="booster-description"><strong>Bramble's wild shot</strong><p>One free chosen-color shot on this retry. It does not use a regular bubble.</p></div><div class="booster-actions"><button id="use-wild">Use</button></div></article>` : '';
  const cancel = playing && (engine?.armedBooster || engine?.wildColor) ? '<button id="bag-cancel" class="secondary-button">Put away this special shot</button>' : '';
  overlay.className = 'overlay sheet-overlay';
  overlay.innerHTML = `<section class="sheet gifts-sheet" role="dialog" aria-label="Gifts"><div class="sheet-top"><span class="eyebrow">A LITTLE HELP, WITH LOVE</span><button class="sheet-close" id="bag-close" aria-label="Close gifts">×</button></div><h2>Bramble’s Very Serious Emporium</h2><p class="sheet-lead">Everything is free. Our accountant is a bee.</p><div class="sheet-scroll">${engine && !engine.giftsAllowed ? '<p class="pause-saved">Travel Light leaves gifts packed away. Pause and choose Continue as normal to use them on this board without earning a medal.</p>' : ''}${save.convertedHearts ? `<p class="pause-saved">Your ${save.convertedHearts} Honey Hearts became ${Math.ceil(save.convertedHearts / 3)} Rainbow Pops. Your old gifts are still here.</p>` : ''}<div class="emporium-proprietor"><img src="${BASE}bramble.svg" alt="Bramble, proprietor"><p>“Welcome. Please browse irresponsibly.”<small>Returns accepted in the form of imaginary hugs.</small></p></div>${cancel}${cards}${wild}<h3>A little change of scenery</h3><p class="rule-footnote">Permanent garden colors, earned by clearing meadows. Pick any you have unlocked; change your mind any time.</p>${styleChoices(save)}<div class="refill-card"><strong>There’s always a little more</strong><p>Refill every unlocked gift to at least three. Come back any time.</p><button id="refill-gifts" class="secondary-button">Refill my gifts · free</button></div><p class="rule-footnote">First clears give one of each unlocked gift. Each gift uses a regular shot and is spent only when fired. Cancel before firing to keep it.</p></div></section>`;
  overlay.querySelector<HTMLButtonElement>('#bag-close')!.addEventListener('click', () => { save.convertedHearts = 0; storeSave(save); returnTo(); });
  overlay.querySelector('#bag-cancel')?.addEventListener('click', () => { scene.cancelSpecial(); backToLevel(); });
  bindGardenStyles(() => showBag(returnTo));
  overlay.querySelector<HTMLButtonElement>('#refill-gifts')!.addEventListener('click', () => { refillGifts(save); storeSave(save); if (engine) updateHud(scene); showBag(returnTo); notice('A few little gifts, just for you.'); });
  overlay.querySelectorAll<HTMLButtonElement>('[data-use]').forEach((button) => button.addEventListener('click', () => {
    const id = button.dataset.use as BoosterId;
    if (id === 'rainbow' && engine?.rulesVersion === 1) showColorPicker('rainbow', () => showBag(returnTo));
    else if (scene.armBooster(id)) backToLevel();
  }));
  overlay.querySelector<HTMLButtonElement>('#use-wild')?.addEventListener('click', () => showColorPicker('wild', () => showBag(returnTo)));
}

function showTopUp(): void {
  if (scene.engine && !scene.engine.refillsAllowed) {
    overlay.className = 'overlay result-overlay';
    overlay.innerHTML = `<section class="result-card" role="dialog" aria-label="Challenge allowance used"><span class="eyebrow">A LITTLE CHOICE</span><h2>Out of challenge shots</h2><p>Retry for the medal, or keep this board and continue with normal rules and five free bubbles. Your main meadow is safe.</p><button id="challenge-retry" class="primary-button">Retry challenge</button><button id="challenge-relax" class="secondary-button">Continue as normal · no medal</button><button id="challenge-save" class="text-button">Save & return home</button></section>`;
    overlay.querySelector('#challenge-retry')!.addEventListener('click', restartCurrent);
    overlay.querySelector('#challenge-relax')!.addEventListener('click', () => scene.relaxChallenge());
    overlay.querySelector('#challenge-save')!.addEventListener('click', showHome);
    return;
  }
  if (!scene.engine?.awaitingTopUp) return;
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<section class="result-card" role="dialog" aria-label="More bubbles"><span class="eyebrow">TAKE YOUR TIME</span><h2>A few more bubbles?</h2><p>Your bee friends are still here. Let’s bring them home.</p><button id="topup" class="primary-button">Five more bubbles · free <span>＋</span></button><p class="rule-footnote">Stars count every shot, including extra bubbles. Finishing is what matters.</p><button id="topup-retry" class="secondary-button">Restart this meadow</button><button id="topup-home" class="text-button">Save & return home</button></section>`;
  overlay.querySelector('#topup')!.addEventListener('click', () => scene.topUp());
  overlay.querySelector('#topup-retry')!.addEventListener('click', showRestartConfirm);
  overlay.querySelector('#topup-home')!.addEventListener('click', showHome);
}

function showAudio(returnTo: () => void): void {
  overlay.className = 'overlay sheet-overlay';
  overlay.innerHTML = `<section class="sheet audio-sheet" role="dialog" aria-label="Sound and aiming options"><div class="sheet-top"><span class="eyebrow">A LITTLE CUSTOMISING</span><button id="audio-close" class="sheet-close" aria-label="Close options">×</button></div><h2>Sound & aiming</h2><p class="sheet-lead">Choose how much of the shot Bramble previews.</p><fieldset class="aim-guide-setting"><legend>Aim guide</legend><div class="aim-guide-choices"><button type="button" class="aim-guide-choice" data-aim-guide="short" aria-pressed="${aimGuideMode === 'short'}">Short aim</button><button type="button" class="aim-guide-choice" data-aim-guide="full" aria-pressed="${aimGuideMode === 'full'}">Full assist</button></div><p id="aim-guide-status" aria-live="polite">${aimGuideMode === 'short' ? 'A short direction stem, without the landing preview.' : 'Shows the full dotted path, landing point and match preview.'}</p></fieldset>${(['musicVolume', 'effectsVolume'] as const).map((key) => `<label class="volume-control">${key === 'musicVolume' ? 'Music' : 'Sound effects'} <output id="${key}-value">${Math.round(save[key] * 100)}%</output><input aria-label="${key === 'musicVolume' ? 'Music volume' : 'Sound effects volume'}" type="range" min="0" max="100" value="${Math.round(save[key] * 100)}" data-volume="${key}"></label>`).join('')}<button id="audio-mute" class="secondary-button">${save.muted ? 'Turn sound on' : 'Mute everything'}</button><p class="audio-credit">Music: <a href="https://opengameart.org/content/sunset-walk-ambient-quiet-sweet-loop" target="_blank" rel="noopener">Sunset Walk · KiluaBoy</a><br>Shared under CC0. Thank you for the lovely music.</p></section>`;
  overlay.querySelector('#audio-close')!.addEventListener('click', returnTo);
  overlay.querySelectorAll<HTMLButtonElement>('[data-aim-guide]').forEach((button) => button.addEventListener('click', () => {
    const mode = button.dataset.aimGuide as AimGuideMode;
    aimGuideMode = mode;
    const saved = storeAimGuideMode(mode);
    overlay.querySelectorAll<HTMLButtonElement>('[data-aim-guide]').forEach((choice) => choice.setAttribute('aria-pressed', String(choice.dataset.aimGuide === mode)));
    overlay.querySelector<HTMLElement>('#aim-guide-status')!.textContent = `${mode === 'short' ? 'A short direction stem, without the landing preview.' : 'The full path, landing point and match preview.'}${saved ? ' Saved for this browser.' : ' This browser could not save the choice.'}`;
    scene.refreshAimGuide();
  }));
  overlay.querySelector('#audio-mute')!.addEventListener('click', () => {
    save.muted = !save.muted;
    if (!save.muted && !save.musicVolume && !save.effectsVolume) { save.musicVolume = .22; save.effectsVolume = .5; }
    storeSave(save); updateMuteButton(); showAudio(returnTo);
  });
  overlay.querySelectorAll<HTMLInputElement>('[data-volume]').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.volume as 'musicVolume' | 'effectsVolume'; save[key] = Number(input.value) / 100; save.muted = false;
      overlay.querySelector(`#${key}-value`)!.textContent = `${input.value}%`;
      overlay.querySelector('#audio-mute')!.textContent = 'Mute everything';
      storeSave(save); updateMuteButton();
    });
    if (input.dataset.volume === 'effectsVolume') input.addEventListener('change', () => playSound('pop'));
  });
}

function showMyGarden(returnTo: () => void): void {
  if (scene.deferUntilReady(() => showMyGarden(returnTo))) return;
  showSaveScreen(save, overlay, {
    close: returnTo,
    garden: () => showGarden(() => showMyGarden(returnTo)),
    levels: () => showChapterSelect(Math.floor(firstUnfinished() / 10)),
    applied: () => { updateMuteButton(); showHome(); }
  });
}

function bindGardenStyles(redraw: () => void): void {
  overlay.querySelectorAll<HTMLButtonElement>('[data-garden-style]').forEach(button => button.addEventListener('click', () => {
    const style = gardenStyles.find(s => s.id === button.dataset.gardenStyle);
    if (!style || save.stars.filter(Boolean).length < style.clears) return;
    save.gardenStyle = style.id; storeSave(save); redraw();
  }));
}

function showGarden(returnTo: () => void): void {
  const progress = gardenProgress(save.stars);
  const friendCards = friendsCards(save.stars);
  overlay.className = 'overlay garden-overlay';
  overlay.innerHTML = `<section class="garden-page" role="dialog" aria-label="Bee Garden"><div class="sheet-top"><span class="eyebrow">A HOME FOR LITTLE FRIENDS</span><button id="garden-close" class="sheet-close" aria-label="Close garden">×</button></div><h2>Your bee garden</h2><p>${progress.flowers ? 'Look what your kindness has grown.' : 'Every rescue begins with a little kindness.'}</p>${gardenArt(save.stars, save.gardenStyle)}<div class="garden-progress"><strong>${progress.flowers} / 30 meadows blooming</strong><span>${progress.decorations} decorations · ${progress.hive} hive improvements</span></div><p class="garden-note">${progress.flowers === 30 ? 'All home together. A whole garden full of love.' : `A flower for each meadow. Your next decoration arrives at ${Math.min(30, (progress.decorations + 1) * 5)} clears.`}</p><h3>Make yourself at home</h3>${styleChoices(save)}${friendCards ? `<h3>Your little friends</h3>${friendCards}` : ''}<h3>Side adventure keepsakes</h3><p>${save.medals.length}/6 challenge medals${save.bossCleared ? ' · Picnic recovered ✦' : ''}${save.rematchCleared ? ' · Monty’s rematch ✦' : ''}</p><h3>Little keepsakes</h3><p>Garden craft: ${save.records.filter(r => r?.unaided).length} · Lovely cascade: ${save.records.filter(r => r?.cascade).length} · Around the bend: ${save.records.filter(r => r?.bank).length}</p><p class="garden-note">Optional memories of clever shots. See Rules for how to earn them. Your flowers and stars are always yours.</p><button id="garden-back" class="primary-button">${scene.engine?.won ? 'Back to celebration' : 'Back to the meadows'} <span>➜</span></button></section>`;
  bindGardenStyles(() => showGarden(returnTo));
  overlay.querySelector('#garden-close')!.addEventListener('click', returnTo);
  overlay.querySelector('#garden-back')!.addEventListener('click', returnTo);
}

document.querySelector('#bloom-shot')!.addEventListener('click', () => scene.armBloom());
scene.onInspect = showInspectedRule;
function restartCurrent(): void {
  if (scene.engine?.activity) launchActivity(scene.engine.activity);
  else beginLevel(scene.getLevelIndex(), true);
}
function launchActivity(activity: Activity): void {
  if (!activityUnlocked(activity, save.stars)) return;
  const level = activityLevel(activity);
  overlay.classList.add('hidden'); hud.classList.remove('hidden');
  scene.startLevel(level.id - 1, { engine: new GameEngine(level, 5, activity), actions: [] });
}
function resumeSideActivity(): void {
  const restored = restoreActiveRun(save.activeSideRun, levels, save.unlocked);
  if (!restored?.engine.activity || !activityUnlocked(restored.engine.activity, save.stars)) { delete save.activeSideRun; storeSave(save); showSideActivities(); return; }
  overlay.classList.add('hidden'); hud.classList.remove('hidden');
  scene.startLevel(restored.engine.level.id - 1, restored);
}
function showSideActivities(): void {
  scene.returnHome(); hud.classList.add('hidden');
  const start = (activity: Activity): void => {
    if (!activityUnlocked(activity, save.stars)) return;
    if (save.activeSideRun && JSON.stringify(save.activeSideRun.activity) === JSON.stringify(activity)) { resumeSideActivity(); return; }
    const intro = () => showActivityIntro(activity, overlay, () => launchActivity(activity), showSideActivities);
    if (save.activeSideRun?.actions.length) {
      overlay.className = 'overlay result-overlay';
      overlay.innerHTML = `<section class="result-card"><h2>Start another side adventure?</h2><p>This replaces your unfinished side board. Your main meadow and boss checkpoints stay saved.</p><button id="side-keep" class="primary-button">Keep my side adventure</button><button id="side-replace" class="secondary-button">Choose this adventure</button></section>`;
      overlay.querySelector('#side-keep')!.addEventListener('click', resumeSideActivity);
      overlay.querySelector('#side-replace')!.addEventListener('click', intro);
    } else intro();
  };
  showActivityMenu(save, overlay, { home: showHome, start, resume: resumeSideActivity });
}
function beginLevel(index: number, fresh = false): void {
  const restored = !fresh && save.activeRun?.levelId === levels[index].id
    ? restoreActiveRun(save.activeRun, levels, save.unlocked) ?? undefined : undefined;
  overlay.classList.add('hidden');
  hud.classList.remove('hidden');
  scene.startLevel(index, restored);
  if (scene.engine?.awaitingTopUp) { showTopUp(); return; }
  const tutorial = scene.engine?.level.tutorial;
  const lessonKey = scene.engine && scene.engine.rulesVersion >= 3 ? `edition${scene.engine.rulesVersion}:${index}` : String(index);
  if (tutorial && !save.tutorialsSeen.includes(lessonKey)) {
    showGuide('A NEW LITTLE TRICK', scene.engine!.level.name, tutorial, () => {
      save.tutorialsSeen.push(lessonKey);
      storeSave(save);
    }, [6, 7].includes(index), scene.engine!.level.id);
  }
}
function showGuide(label: string, title: string, message: string, after?: () => void, bagPrompt = false, levelId?: number): void {
  const lesson = levelId && scene.engine?.rulesVersion === 5 ? lessonFor(levelId) : undefined;
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<div class="result-card guide-card"><span class="eyebrow">${escapeHtml(label)}</span><h2>${escapeHtml(title)}</h2>${lesson ? `<div class="lesson-stage">${lessonDemo(lesson, reducedMotion.matches)}</div><p class="guide-line">${escapeHtml(lesson.line)}</p>` : `<p>${escapeHtml(message)}</p>`}<button id="guide-close" class="primary-button">${lesson ? 'Let me try' : 'Got it'} <span>➜</span></button>${lesson && !reducedMotion.matches ? '<button id="guide-replay" class="text-button">Replay example</button>' : ''}${lesson ? '<button id="guide-skip" class="text-button">Skip</button>' : ''}${bagPrompt ? '<button id="guide-bag" class="secondary-button">Show me my gifts ✿</button>' : ''}</div>`;
  overlay.querySelector<HTMLButtonElement>('#guide-close')!.addEventListener('click', () => { overlay.classList.add('hidden'); after?.(); });
  overlay.querySelector<HTMLButtonElement>('#guide-skip')?.addEventListener('click', () => { overlay.classList.add('hidden'); after?.(); });
  overlay.querySelector<HTMLButtonElement>('#guide-replay')?.addEventListener('click', () => { overlay.querySelector('.lesson-stage')!.innerHTML = lessonDemo(lesson!, false); });
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
    <div class="home-panel"><div class="dedication">${escapeHtml(gameContent.opening)}</div><button id="primary-play" class="primary-button">${pausedIndex !== undefined ? `Resume · Level ${next + 1}` : complete === levels.length ? 'Play again' : `Continue · Level ${next + 1}`} <span>➜</span></button>${pausedIndex !== undefined ? '<div class="paused-note">Your in-progress meadow is right where you left it.</div>' : ''}<button id="choose-level" class="secondary-button">Choose a level</button><button id="home-adventures" class="secondary-button adventure-link">Side adventures</button><div class="home-quick-actions"><button id="home-garden">My Garden</button><button id="home-bag">Gifts</button><button id="home-audio">Options</button><button id="home-rules">Rules</button></div><div class="journey-progress">${complete} of 30 meadows complete</div><div class="progress-track" role="progressbar" aria-valuenow="${complete}" aria-valuemin="0" aria-valuemax="30" aria-label="Meadows complete"><span style="width:${progress}%"></span></div></div>
    <div class="home-footer">A cosy little game · No timers, just bubbles</div>`;
  overlay.querySelector<HTMLButtonElement>('#primary-play')!.addEventListener('click', () => beginLevel(next));
  overlay.querySelector<HTMLButtonElement>('#choose-level')!.addEventListener('click', () => showChapterSelect(Math.floor(next / 10)));
  overlay.querySelector('#home-adventures')!.addEventListener('click', showSideActivities);
  overlay.querySelector('#home-garden')!.addEventListener('click', () => showMyGarden(showHome));
  overlay.querySelector('#home-audio')!.addEventListener('click', () => showAudio(showHome));
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
  overlay.innerHTML = `<div class="chapter-heading"><button id="chapter-back" class="icon-button" aria-label="Back to home">‹</button><span class="eyebrow">BRAMBLE’S JOURNEY</span><h2>${escapeHtml(chapter.name)}</h2><p>${escapeHtml(chapter.subtitle)}</p></div><div class="chapter-panel"><div class="chapter-tabs">${tabs}</div><div class="chapter-grid">${tiles}</div><p>${save.activeRun?.actions.length ? `Level ${save.activeRun.levelId} is paused. Starting another replaces its board.` : 'Finish a level to open the next meadow.'}</p><div class="chapter-quick-actions"><button id="chapter-rules">Rules</button><button id="chapter-bag">Gifts ✿</button></div></div>`;
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
  if (scene.engine?.activity) {
    hud.classList.add('hidden');
    showActivityResult(scene.engine, overlay, { start: a => showActivityIntro(a, overlay, () => launchActivity(a), showSideActivities), menu: showSideActivities, gifts: showBag });
    return;
  }
  hud.classList.add('hidden');
  overlay.className = 'overlay result-overlay';
  const finale = won && index === levels.length - 1;
  const chapterEnd = won && (index === 9 || index === 19);
  const title = finale ? 'All home together!' : chapterEnd ? 'A new path opens!' : won ? 'Lovely work!' : 'One more try?';
  const losses = save.failures[index] || 0;
  const teasing = ['Bramble says John would have missed that shot too.', 'John insists this level is perfectly fair. Bramble is unconvinced.', 'John owes you a victory dance when you clear this one.'];
  const message = finale ? gameContent.ending : chapterEnd ? `You finished ${chapters[Math.floor(index / 10)].name}. Bramble has another place to explore!` : won ? `You freed every bee in ${levels[index].name}.` : losses > 1 ? teasing[(losses - 2) % teasing.length] : 'Bramble believes in you. Take another shot at it!';
  const assist = !won && losses >= 2 ? '<p class="assist-note">A hint and one free wild shot are ready on your next try.</p>' : '';
  const reward = won && firstClear ? '<p class="reward-note">✿ A new garden flower and a gift of each unlocked power-up!</p>' : '';
  overlay.innerHTML = `<div class="result-card ${won ? 'win-card' : 'retry-card'}"><span class="eyebrow">${won ? 'BEE FRIENDS RESCUED' : 'THE ADVENTURE CONTINUES'}</span><div class="result-art"><img src="${BASE}${won ? 'bee.svg' : 'bramble.svg'}" alt="" /></div><h2>${escapeHtml(title)}</h2><div class="stars" aria-label="${stars} stars">${won ? Array.from({ length: 3 }, (_, i) => `<span class="result-star ${i < stars ? 'earned' : ''}" style="--star-delay:${i * 100}ms">${i < stars ? '★' : '☆'}</span>`).join('') : '✿ ✿ ✿'}</div><p>${escapeHtml(message)}</p>${assist}${reward}${won ? `<div class="mastery-keepsakes">${masteryLabels(save.records[index]).map(label => `<span>${label}</span>`).join('')}</div>${firstClear ? friends.filter(f => f.clears === save.stars.filter(Boolean).length).map(f => `<p class="friend-arrival">${f.hat} <strong>${escapeHtml(f.name)} has moved into your garden!</strong><br><small>${escapeHtml(f.title)} · ${escapeHtml(f.description)}</small></p>`).join('') : ''}` : ''}<button id="result-primary" class="primary-button">${won ? finale ? 'Play from the beginning' : 'Next meadow' : 'Try again'} <span>➜</span></button>${won && (index === 19 || index === 29) ? '<button id="result-adventures" class="secondary-button">Meet Monty · side adventures</button>' : ''}<button id="result-bag" class="secondary-button">Gifts ✿</button><div class="result-links"><button id="result-garden" class="text-button">Bee Garden</button><button id="result-rules" class="text-button">Bubble rules</button><button id="result-menu" class="text-button">Choose a level</button></div></div>`;
  overlay.querySelector<HTMLButtonElement>('#result-primary')!.addEventListener('click', () => beginLevel(won ? (index + 1) % levels.length : index));
  overlay.querySelector<HTMLButtonElement>('#result-menu')!.addEventListener('click', () => showChapterSelect(Math.floor(index / 10)));
  overlay.querySelector('#result-adventures')?.addEventListener('click', showSideActivities);
  overlay.querySelector<HTMLButtonElement>('#result-bag')!.addEventListener('click', () => showBag(() => showResult(won, index, stars, false)));
  overlay.querySelector('#result-garden')!.addEventListener('click', () => showGarden(() => showResult(won, index, stars, false)));
  overlay.querySelector<HTMLButtonElement>('#result-rules')!.addEventListener('click', () => showRules(() => showResult(won, index, stars, false)));
}

document.querySelector<HTMLButtonElement>('#home-button')!.addEventListener('click', showPause);
document.querySelector<HTMLButtonElement>('#swap-button')!.addEventListener('click', () => scene.swap());
document.querySelector<HTMLButtonElement>('#bag-button')!.addEventListener('click', () => showBag(backToLevel));
document.querySelector<HTMLButtonElement>('#inspect-done')!.addEventListener('click', () => scene.setInspectMode(false));
mechanicStatus.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!target) return;
  if (target.dataset.rule) showRules(backToLevel, target.dataset.rule as RuleId);
  else if (target.dataset.cancelSpecial) scene.cancelSpecial();
});
function showContextHint(): void {
  const engine = scene.engine;
  if (!engine) return;
  showGuide('BRAMBLE’S HINT', engine.level.name, engine.level.hint);
  if (engine.guideHidden) return;
  const button = document.createElement('button');
  button.className = 'secondary-button'; button.textContent = 'Help with this board';
  button.addEventListener('click', () => {
    const suggestion = suggestShot(engine);
    showGuide('ONE LITTLE IDEA', engine.level.name, suggestion?.message ?? 'Take five more bubbles to continue, or open Gifts for a free refill.');
    if (suggestion && suggestion.score > 0) {
      const aim = document.createElement('button'); aim.className = 'secondary-button';
      aim.textContent = suggestion.swap ? 'Swap & show this aim' : 'Show this aim';
      aim.addEventListener('click', () => {
        overlay.classList.add('hidden');
        scene.showSuggestedAim(suggestion.angle, suggestion.swap);
      });
      overlay.querySelector('.guide-card')!.append(aim);
    }
  });
  overlay.querySelector('.guide-card')!.append(button);
}
document.querySelector<HTMLButtonElement>('#help-button')!.addEventListener('click', () => {
  if (!scene.engine) return;
  if (scene.deferUntilReady(showContextHint)) return;
  showContextHint();
});
muteButton.addEventListener('click', () => { if (!scene.deferUntilReady(() => showAudio(backToLevel))) showAudio(backToLevel); });
updateMuteButton();
showHome();
