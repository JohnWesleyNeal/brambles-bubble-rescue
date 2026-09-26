import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { BUBBLE_RADIUS, cellPosition, type Bubble, type BubbleColor, type OccupiedCell } from './board';
import { GameEngine, type FireResult } from './engine';
import { chapters, levels } from './levels';
import { gameContent } from './content';
import { loadSave, recordLoss, recordWin, storeSave } from './progress';
import type { ShotTrace } from './shot';
import './style.css';

registerSW({ immediate: true });
const BASE = import.meta.env.BASE_URL;
const save = loadSave();

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
const wildButton = document.querySelector<HTMLButtonElement>('#wild-button')!;
const mechanicStatus = document.querySelector<HTMLElement>('#mechanic-status')!;

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
  private pendingLevel?: number;

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
      if (!this.engine || this.engine.won || this.engine.lost || this.flying || this.resolving || pointer.y < 145 || pointer.y > 775) return;
      this.aiming = true;
      this.setAim(pointer.x, pointer.y);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.engine || this.flying || this.resolving) return;
      if (pointer.event instanceof MouseEvent || this.aiming) this.setAim(pointer.x, pointer.y);
    });
    this.input.on('pointerup', () => {
      if (this.aiming) { this.aiming = false; this.fire(); }
    });
    this.input.on('pointerupoutside', () => { this.aiming = false; });
    if (this.pendingLevel !== undefined) {
      const index = this.pendingLevel;
      this.pendingLevel = undefined;
      this.startLevel(index);
    }
  }

  startLevel(index: number): void {
    if (!this.boardLayer) { this.pendingLevel = index; return; }
    this.epoch += 1;
    this.levelIndex = index;
    this.engine = new GameEngine(levels[index]);
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
    this.engine = undefined;
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

  swap(): void {
    if (!this.engine || this.flying || this.resolving) return;
    this.engine.swap();
    this.drawShooter();
    playSound('swap');
  }
  chooseWild(color: BubbleColor): boolean {
    if (!this.engine || this.flying || this.resolving) return false;
    const chosen = this.engine.chooseWild(color);
    if (chosen) { this.drawShooter(); updateHud(this); playSound('bonus'); }
    return chosen;
  }
  getLevelIndex(): number { return this.levelIndex; }

  private drawScenery(): void {
    this.sceneryLayer.removeAll(true);
    const panel = this.add.graphics();
    panel.fillStyle(0xfaf5dc, .48).fillRoundedRect(19, 159, 352, 500, 28);
    panel.lineStyle(3, 0xffffff, .55).strokeRoundedRect(19, 159, 352, 500, 28);
    panel.lineStyle(2, 0x3a866b, .24).strokeRoundedRect(24, 164, 342, 490, 24);
    panel.lineStyle(2, 0x7b8665, .5).lineBetween(31, 635, 359, 635);
    this.sceneryLayer.add(panel);
    this.sceneryLayer.add(this.add.text(195, 167, 'FREE THE BEE FRIENDS', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#346c5b', letterSpacing: 2
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
    this.shooterBubble = this.makeBubble(195, 690, normalBubble(this.engine.wildColor ?? this.engine.currentColor), 20);
    this.nextBubble = this.makeBubble(290, 733, normalBubble(this.engine.nextColor), 15);
    if (this.engine.wildColor) {
      this.wildLabel = this.add.text(195, 656, 'WILD SHOT', { fontFamily: 'Trebuchet MS', fontSize: '10px', fontStyle: 'bold', color: '#fff4b3', backgroundColor: '#3c705c' }).setPadding(5, 2).setOrigin(.5);
    }
  }
  private setAim(x: number, y: number): void {
    this.aimAngle = Phaser.Math.Clamp(Math.atan2(x - 195, 690 - y), -1.25, 1.25);
    this.drawAim();
  }
  private drawAim(): void {
    this.aimGraphics.clear();
    if (!this.engine || this.flying || this.resolving || this.engine.won || this.engine.lost) return;
    const trace = this.engine.preview(this.aimAngle);
    for (let i = 4; i < trace.path.length; i += 5) {
      const point = trace.path[i];
      this.aimGraphics.fillStyle(0xffffff, Math.max(.18, .78 - i * .003));
      this.aimGraphics.fillCircle(point.x, point.y, i < 45 ? 3.3 : 2.5);
    }
  }
  private fire(): void {
    if (!this.engine || this.flying || this.resolving || this.engine.won || this.engine.lost) return;
    const trace = this.engine.preview(this.aimAngle);
    const color = this.engine.wildColor ?? this.engine.currentColor;
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
    const epoch = this.epoch;
    this.time.delayedCall(result.settled?.popped.length ? 590 : 260, () => {
      if (epoch !== this.epoch) return;
      this.resolving = false;
      this.drawAim();
      if (result.won) {
        const margin = this.engine!.level.shots - this.engine!.level.par;
        const used = this.engine!.turns;
        const stars = used <= this.engine!.level.par ? 3 : used <= this.engine!.level.par + Math.floor(margin / 2) ? 2 : 1;
        recordWin(save, this.levelIndex, stars);
        storeSave(save);
        playSound('win');
        showResult(true, this.levelIndex, stars);
      } else if (result.lost) {
        recordLoss(save, this.levelIndex);
        storeSave(save);
        playSound('fail');
        showResult(false, this.levelIndex, 0);
      }
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
  const failures = save.failures[current.getLevelIndex()] || 0;
  wildButton.classList.toggle('hidden', failures < 2 || engine.wildUsed);
  wildButton.textContent = engine.wildColor ? '✦ Wild ready' : '✦ Wild';
  if (engine.level.wind) {
    mechanicStatus.classList.remove('hidden');
    mechanicStatus.textContent = `Breeze shifts in ${2 - engine.turns % 2} shot${engine.turns % 2 === 0 ? 's' : ''} ${engine.board.windPosition() === 0 ? '→' : '←'}`;
  } else if (engine.board.entries().some(({ bubble }) => bubble.kind === 'bloom')) {
    mechanicStatus.classList.remove('hidden');
    mechanicStatus.textContent = '↻ Striped blooms change color after each shot';
  } else mechanicStatus.classList.add('hidden');
}
function updateMuteButton(): void {
  muteButton.textContent = save.muted ? '♪̸' : '♫';
  muteButton.setAttribute('aria-label', save.muted ? 'Unmute sound' : 'Mute sound');
}
function beginLevel(index: number): void {
  overlay.classList.add('hidden');
  hud.classList.remove('hidden');
  scene.startLevel(index);
  const tutorial = levels[index].tutorial;
  if (tutorial && !save.tutorialsSeen.includes(String(index))) {
    showGuide('A NEW LITTLE TRICK', levels[index].name, tutorial, () => {
      save.tutorialsSeen.push(String(index));
      storeSave(save);
    });
  }
}
function showGuide(label: string, title: string, message: string, after?: () => void): void {
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<div class="result-card guide-card"><span class="eyebrow">${escapeHtml(label)}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><button id="guide-close" class="primary-button">Got it <span>➜</span></button></div>`;
  overlay.querySelector<HTMLButtonElement>('#guide-close')!.addEventListener('click', () => { overlay.classList.add('hidden'); after?.(); });
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
  const next = firstUnfinished();
  overlay.innerHTML = `<div class="home-header"><span class="eyebrow">A LITTLE ADVENTURE FOR YOU</span><h1>Bramble’s<br><em>Bubble Rescue</em></h1><p>Pop bubbles. Free little friends. Make someone smile.</p></div>
    <img class="hero-art" src="${BASE}bramble.svg" alt="Bramble the friendly honey badger" />
    <div class="home-panel"><div class="dedication">${escapeHtml(gameContent.opening)}</div><button id="primary-play" class="primary-button">${complete === levels.length ? 'Play again' : `Continue · Level ${next + 1}`} <span>➜</span></button><button id="choose-level" class="secondary-button">Choose a level</button><div class="journey-progress">${complete} of 30 meadows complete</div></div>
    <div class="home-footer">A cosy little game · No timers, just bubbles</div>`;
  overlay.querySelector<HTMLButtonElement>('#primary-play')!.addEventListener('click', () => beginLevel(next));
  overlay.querySelector<HTMLButtonElement>('#choose-level')!.addEventListener('click', () => showChapterSelect(Math.floor(next / 10)));
}
function showChapterSelect(chapterIndex: number): void {
  scene.returnHome();
  hud.classList.add('hidden');
  overlay.className = 'overlay chapter-overlay';
  const chapter = chapters[chapterIndex];
  const tabs = chapters.map((item, index) => `<button class="chapter-tab ${index === chapterIndex ? 'active' : ''}" data-chapter="${index}" aria-pressed="${index === chapterIndex}">${item.name}</button>`).join('');
  const tiles = levels.slice(chapter.first - 1, chapter.last).map((level) => {
    const index = level.id - 1;
    const unlocked = index < save.unlocked;
    const stars = save.stars[index] || 0;
    return `<button class="level-tile ${unlocked ? '' : 'locked'}" data-level="${index}" ${unlocked ? '' : 'disabled'} aria-label="Level ${level.id}: ${escapeHtml(level.name)}${unlocked ? '' : ', locked'}"><span>${level.id}</span><small>${unlocked ? stars ? '★'.repeat(stars) : 'Ready' : 'Locked'}</small></button>`;
  }).join('');
  overlay.innerHTML = `<div class="chapter-heading"><button id="chapter-back" class="icon-button" aria-label="Back to home">‹</button><span class="eyebrow">BRAMBLE’S JOURNEY</span><h2>${escapeHtml(chapter.name)}</h2><p>${escapeHtml(chapter.subtitle)}</p></div><div class="chapter-panel"><div class="chapter-tabs">${tabs}</div><div class="chapter-grid">${tiles}</div><p>Finish a level to open the next meadow.</p></div>`;
  overlay.querySelector<HTMLButtonElement>('#chapter-back')!.addEventListener('click', showHome);
  overlay.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach((button) => button.addEventListener('click', () => showChapterSelect(Number(button.dataset.chapter))));
  overlay.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((button) => button.addEventListener('click', () => beginLevel(Number(button.dataset.level))));
}
function showResult(won: boolean, index: number, stars: number): void {
  hud.classList.add('hidden');
  overlay.className = 'overlay result-overlay';
  const finale = won && index === levels.length - 1;
  const chapterEnd = won && (index === 9 || index === 19);
  const title = finale ? 'All home together!' : chapterEnd ? 'A new path opens!' : won ? 'Lovely work!' : 'One more try?';
  const message = finale ? gameContent.ending : chapterEnd ? `You finished ${chapters[Math.floor(index / 10)].name}. Bramble has another place to explore!` : won ? `You freed every bee in ${levels[index].name}.` : 'Bramble believes in you. Take another shot at it!';
  const assist = !won && (save.failures[index] || 0) >= 2 ? '<p class="assist-note">A hint and one free wild-color shot are ready on your next try.</p>' : '';
  overlay.innerHTML = `<div class="result-card"><span class="eyebrow">${won ? 'BEE FRIENDS RESCUED' : 'THE ADVENTURE CONTINUES'}</span><div class="result-art"><img src="${BASE}${won ? 'bee.svg' : 'bramble.svg'}" alt="" /></div><h2>${escapeHtml(title)}</h2><div class="stars" aria-label="${stars} stars">${won ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '✿ ✿ ✿'}</div><p>${escapeHtml(message)}</p>${assist}<button id="result-primary" class="primary-button">${won ? finale ? 'Play from the beginning' : 'Next meadow' : 'Try again'} <span>➜</span></button><button id="result-menu" class="text-button">Choose a level</button></div>`;
  overlay.querySelector<HTMLButtonElement>('#result-primary')!.addEventListener('click', () => beginLevel(won ? (index + 1) % levels.length : index));
  overlay.querySelector<HTMLButtonElement>('#result-menu')!.addEventListener('click', () => showChapterSelect(Math.floor(index / 10)));
}
function showWildChooser(): void {
  const engine = scene.engine;
  if (!engine || engine.wildUsed || (save.failures[scene.getLevelIndex()] || 0) < 2) return;
  overlay.className = 'overlay result-overlay';
  const options = engine.board.availableColors().map((color) => `<button class="color-option" data-color="${color}" style="--color:#${palette[color].fill.toString(16).padStart(6, '0')}" aria-label="Choose ${color} wild bubble">${palette[color].glyph}</button>`).join('');
  overlay.innerHTML = `<div class="result-card guide-card"><span class="eyebrow">A LITTLE HELP FROM BRAMBLE</span><h2>Choose a wild shot</h2><p>Pick any color still on the board. This one bubble is free.</p><div class="color-options">${options}</div><button id="wild-cancel" class="text-button">Keep my current bubble</button></div>`;
  overlay.querySelector<HTMLButtonElement>('#wild-cancel')!.addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.querySelectorAll<HTMLButtonElement>('[data-color]').forEach((button) => button.addEventListener('click', () => {
    if (scene.chooseWild(button.dataset.color as BubbleColor)) overlay.classList.add('hidden');
  }));
}

document.querySelector<HTMLButtonElement>('#home-button')!.addEventListener('click', showHome);
document.querySelector<HTMLButtonElement>('#swap-button')!.addEventListener('click', () => scene.swap());
document.querySelector<HTMLButtonElement>('#help-button')!.addEventListener('click', () => {
  if (!scene.engine) return;
  showGuide('BRAMBLE’S HINT', levels[scene.getLevelIndex()].name, levels[scene.getLevelIndex()].hint);
});
wildButton.addEventListener('click', showWildChooser);
muteButton.addEventListener('click', () => { save.muted = !save.muted; storeSave(save); updateMuteButton(); });
updateMuteButton();
showHome();
