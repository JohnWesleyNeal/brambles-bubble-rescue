import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { BubbleBoard, BUBBLE_RADIUS, cellPosition, GRID_LEFT, GRID_TOP, type BubbleColor, type Cell, type OccupiedCell } from './board';
import { levels } from './levels';
import { gameContent } from './content';
import './style.css';

registerSW({ immediate: true });

const BASE = import.meta.env.BASE_URL;
const palette: Record<BubbleColor, { fill: number; edge: number; glyph: string; ink: string }> = {
  R: { fill: 0xf48b87, edge: 0xa94e65, glyph: '♥', ink: '#78394b' },
  O: { fill: 0xf6b765, edge: 0xb8793e, glyph: '◆', ink: '#754a32' },
  Y: { fill: 0xf4e982, edge: 0xb8a64f, glyph: '✦', ink: '#706534' },
  G: { fill: 0x91d6a4, edge: 0x4d9672, glyph: '✿', ink: '#336e56' },
  B: { fill: 0x89cbe9, edge: 0x4e8caf, glyph: '●', ink: '#3b6582' },
  P: { fill: 0xc9a1dc, edge: 0x8d67a1, glyph: '★', ink: '#694f79' }
};

interface SaveData {
  version: 1;
  unlocked: number;
  stars: number[];
  muted: boolean;
}

const saveKey = 'bramble-bubbles-save-v1';
function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(saveKey);
    if (raw) {
      const data = JSON.parse(raw) as Partial<SaveData>;
      if (data.version === 1) {
        return {
          version: 1,
          unlocked: Math.min(levels.length, Math.max(1, Number(data.unlocked) || 1)),
          stars: Array.isArray(data.stars) ? data.stars.map((number) => Number(number) || 0) : [],
          muted: Boolean(data.muted)
        };
      }
    }
  } catch { /* Storage may be unavailable in private browsing. */ }
  return { version: 1, unlocked: 1, stars: [], muted: false };
}

const save = loadSave();
function storeSave(): void {
  try { localStorage.setItem(saveKey, JSON.stringify(save)); } catch { /* Play continues without storage. */ }
}

const overlay = document.querySelector<HTMLDivElement>('#overlay')!;
const hud = document.querySelector<HTMLDivElement>('#hud')!;
const shotsCount = document.querySelector<HTMLElement>('#shots-count')!;
const beesCount = document.querySelector<HTMLElement>('#bees-count')!;
const levelNumber = document.querySelector<HTMLElement>('#level-number')!;
const levelName = document.querySelector<HTMLElement>('#level-name')!;
const muteButton = document.querySelector<HTMLButtonElement>('#mute-button')!;

let audioContext: AudioContext | undefined;
function playSound(type: 'shoot' | 'pop' | 'rescue' | 'win' | 'swap' | 'fail'): void {
  if (save.muted) return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume();
    const notes: Record<typeof type, [number, number, number][]> = {
      shoot: [[310, 510, 0.12]],
      pop: [[530, 320, 0.09], [650, 420, 0.08]],
      rescue: [[550, 740, 0.12], [740, 990, 0.16]],
      win: [[440, 440, 0.13], [554, 554, 0.13], [659, 659, 0.13], [880, 880, 0.3]],
      swap: [[400, 650, 0.1]],
      fail: [[380, 310, 0.2], [310, 260, 0.22]]
    };
    let offset = 0;
    for (const [from, to, duration] of notes[type]) {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type === 'pop' ? 'triangle' : 'sine';
      oscillator.frequency.setValueAtTime(from, audioContext.currentTime + offset);
      oscillator.frequency.exponentialRampToValueAtTime(to, audioContext.currentTime + offset + duration);
      gain.gain.setValueAtTime(0.0001, audioContext.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.11, audioContext.currentTime + offset + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + offset + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(audioContext.currentTime + offset);
      oscillator.stop(audioContext.currentTime + offset + duration + 0.015);
      offset += type === 'win' ? 0.135 : 0.075;
    }
  } catch { /* Sound support is optional. */ }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

class PlayScene extends Phaser.Scene {
  private board?: BubbleBoard;
  private levelIndex = 0;
  private shots = 0;
  private totalBees = 0;
  private freedBees = 0;
  private currentColor: BubbleColor = 'R';
  private nextColor: BubbleColor = 'Y';
  private playing = false;
  private aiming = false;
  private resolving = false;
  private aimAngle = 0;
  private shot?: { x: number; y: number; vx: number; vy: number; color: BubbleColor; sprite: Phaser.GameObjects.Container };
  private boardLayer!: Phaser.GameObjects.Container;
  private sceneryLayer!: Phaser.GameObjects.Container;
  private effectLayer!: Phaser.GameObjects.Container;
  private aimGraphics!: Phaser.GameObjects.Graphics;
  private shooterBubble?: Phaser.GameObjects.Container;
  private nextBubble?: Phaser.GameObjects.Container;
  private epoch = 0;

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
      if (!this.playing || this.shot || this.resolving || pointer.y < 145 || pointer.y > 775) return;
      this.aiming = true;
      this.setAim(pointer.x, pointer.y);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.playing || this.shot || this.resolving) return;
      if (pointer.event instanceof MouseEvent || this.aiming) this.setAim(pointer.x, pointer.y);
    });
    this.input.on('pointerup', () => {
      if (this.aiming) {
        this.aiming = false;
        this.fire();
      }
    });
    this.input.on('pointerupoutside', () => { this.aiming = false; });
  }

  startLevel(index: number): void {
    if (!this.boardLayer) return;
    this.epoch += 1;
    this.levelIndex = index;
    this.board = new BubbleBoard(levels[index].rows);
    this.totalBees = this.board.beeCount();
    this.freedBees = 0;
    this.shots = levels[index].shots;
    this.playing = true;
    this.aiming = false;
    this.resolving = false;
    this.aimAngle = 0;
    this.shot?.sprite.destroy();
    this.shot = undefined;
    this.currentColor = this.pickColor();
    this.nextColor = this.pickColor();
    this.drawScenery();
    this.drawBoard();
    this.drawShooter();
    this.drawAim();
    updateHud(this);
  }

  returnHome(): void {
    this.epoch += 1;
    this.playing = false;
    this.aiming = false;
    this.shot?.sprite.destroy();
    this.shot = undefined;
    this.sceneryLayer?.removeAll(true);
    this.boardLayer?.removeAll(true);
    this.effectLayer?.removeAll(true);
    this.aimGraphics?.clear();
  }

  swap(): void {
    if (!this.playing || this.shot || this.resolving) return;
    [this.currentColor, this.nextColor] = [this.nextColor, this.currentColor];
    this.drawShooter();
    playSound('swap');
  }

  getStatus(): { level: number; shots: number; freed: number; total: number } {
    return { level: this.levelIndex, shots: this.shots, freed: this.freedBees, total: this.totalBees };
  }

  private drawScenery(): void {
    this.sceneryLayer.removeAll(true);
    const panel = this.add.graphics();
    panel.fillStyle(0xfaf5dc, 0.48);
    panel.fillRoundedRect(19, 159, 352, 500, 28);
    panel.lineStyle(3, 0xffffff, 0.55);
    panel.strokeRoundedRect(19, 159, 352, 500, 28);
    panel.lineStyle(2, 0x3a866b, 0.24);
    panel.strokeRoundedRect(24, 164, 342, 490, 24);
    panel.lineStyle(2, 0x7b8665, 0.5);
    panel.lineBetween(31, 635, 359, 635);
    this.sceneryLayer.add(panel);
    const caption = this.add.text(195, 167, 'FREE THE BEE FRIENDS', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '12px', fontStyle: 'bold', color: '#346c5b', letterSpacing: 2
    }).setOrigin(0.5, 0);
    this.sceneryLayer.add(caption);
    const hero = this.add.image(61, 744, 'bramble').setDisplaySize(102, 107);
    this.sceneryLayer.add(hero);
    const sling = this.add.graphics();
    sling.fillStyle(0x6c492f, 1).fillEllipse(195, 738, 65, 25);
    sling.fillStyle(0xb47741, 1).fillRoundedRect(182, 708, 26, 43, 10);
    sling.lineStyle(5, 0x7b5634, 1).strokeRoundedRect(182, 708, 26, 43, 10);
    sling.lineStyle(7, 0x9a653b, 1).lineBetween(195, 718, 195, 683);
    this.sceneryLayer.add(sling);
    this.sceneryLayer.add(this.add.text(290, 703, 'NEXT', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '11px', fontStyle: 'bold', color: '#285a4d', letterSpacing: 1
    }).setOrigin(0.5));
  }

  private makeBubble(x: number, y: number, color: BubbleColor, bee = false, radius = BUBBLE_RADIUS): Phaser.GameObjects.Container {
    const style = palette[color];
    const container = this.add.container(x, y);
    const shadow = this.add.circle(1.5, 2, radius + 1.5, 0x20443f, 0.16);
    const orb = this.add.circle(0, 0, radius, style.fill).setStrokeStyle(2.3, style.edge, 0.95);
    const light = this.add.ellipse(-radius * 0.29, -radius * 0.4, radius * 0.66, radius * 0.36, 0xffffff, 0.42).setRotation(-0.34);
    container.add([shadow, orb, light]);
    if (bee) {
      container.add(this.add.image(0, 1, 'bee').setDisplaySize(radius * 1.45, radius * 1.45));
    } else {
      container.add(this.add.text(0, 0.4, style.glyph, {
        fontFamily: 'Georgia, serif', fontSize: `${Math.round(radius * 1.05)}px`, fontStyle: 'bold', color: style.ink
      }).setOrigin(0.5));
    }
    return container;
  }

  private drawBoard(): void {
    this.boardLayer.removeAll(true);
    if (!this.board) return;
    for (const cell of this.board.entries()) {
      const point = cellPosition(cell);
      this.boardLayer.add(this.makeBubble(point.x, point.y, cell.bubble.color, cell.bubble.bee));
    }
  }

  private drawShooter(): void {
    this.shooterBubble?.destroy();
    this.nextBubble?.destroy();
    this.shooterBubble = this.makeBubble(195, 690, this.currentColor, false, 20);
    this.nextBubble = this.makeBubble(290, 733, this.nextColor, false, 15);
  }

  private pickColor(): BubbleColor {
    const board = this.board!;
    const favored = board.beeColors();
    const options = board.availableColors();
    const pool = favored.length && Math.random() < 0.65 ? favored : options;
    return pool[Math.floor(Math.random() * pool.length)] ?? 'R';
  }

  private setAim(x: number, y: number): void {
    const angle = Math.atan2(x - 195, 690 - y);
    this.aimAngle = Phaser.Math.Clamp(angle, -1.25, 1.25);
    this.drawAim();
  }

  private drawAim(): void {
    this.aimGraphics.clear();
    if (!this.playing || this.shot || !this.board) return;
    let x = 195;
    let y = 685;
    let vx = Math.sin(this.aimAngle);
    const vy = -Math.cos(this.aimAngle);
    for (let step = 0; step < 95; step += 1) {
      x += vx * 6.4;
      y += vy * 6.4;
      if (x <= GRID_LEFT || x >= 339) {
        x = Phaser.Math.Clamp(x, GRID_LEFT, 339);
        vx *= -1;
      }
      if (step % 3 === 0) {
        this.aimGraphics.fillStyle(0xffffff, Math.max(0.18, 0.78 - step * 0.005));
        this.aimGraphics.fillCircle(x, y, step < 12 ? 3.4 : 2.5);
      }
      if (y <= GRID_TOP || this.board.nearestOccupied(x, y)) break;
    }
  }

  private fire(): void {
    if (!this.playing || this.shot || this.resolving || this.shots <= 0) return;
    const color = this.currentColor;
    const sprite = this.makeBubble(195, 690, color, false, 17);
    this.shot = {
      x: 195, y: 690,
      vx: Math.sin(this.aimAngle) * 800,
      vy: -Math.cos(this.aimAngle) * 800,
      color, sprite
    };
    this.shots -= 1;
    this.currentColor = this.nextColor;
    this.nextColor = this.pickColor();
    this.drawShooter();
    this.aimGraphics.clear();
    updateHud(this);
    playSound('shoot');
  }

  update(_time: number, delta: number): void {
    const shot = this.shot;
    if (!shot || !this.board) return;
    const distance = 800 * Math.min(delta, 50) / 1000;
    const steps = Math.max(1, Math.ceil(distance / 5));
    const dt = Math.min(delta, 50) / 1000 / steps;
    for (let index = 0; index < steps; index += 1) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      if (shot.x <= GRID_LEFT || shot.x >= 339) {
        shot.x = Phaser.Math.Clamp(shot.x, GRID_LEFT, 339);
        shot.vx *= -1;
      }
      shot.sprite.setPosition(shot.x, shot.y);
      const impact = this.board.nearestOccupied(shot.x, shot.y);
      if (shot.y <= GRID_TOP || impact) {
        this.land(impact);
        return;
      }
    }
  }

  private land(impact?: OccupiedCell): void {
    if (!this.shot || !this.board) return;
    const shot = this.shot;
    const cell = this.board.placementFor(shot.x, shot.y, impact);
    shot.sprite.destroy();
    this.shot = undefined;
    const result = this.board.settle(cell, { color: shot.color, bee: false });
    this.freedBees += result.beesFreed;
    this.drawBoard();
    this.pruneShooterColors();
    this.drawShooter();
    this.drawAim();
    updateHud(this);
    if (result.popped.length) playSound('pop');
    if (result.beesFreed) playSound('rescue');
    this.animateCleared(result.popped, result.dropped);
    this.resolving = true;
    const epoch = this.epoch;
    this.time.delayedCall(result.popped.length ? 590 : 190, () => {
      if (epoch !== this.epoch) return;
      this.resolving = false;
      if (this.board!.beeCount() === 0) {
        this.completeLevel();
      } else if (this.shots <= 0 || this.board!.isOverflowing()) {
        this.playing = false;
        playSound('fail');
        showResult(false, this.levelIndex, 0);
      }
    });
  }

  private pruneShooterColors(): void {
    const active = this.board!.availableColors();
    if (active.length === 0) return;
    if (!active.includes(this.currentColor)) this.currentColor = this.pickColor();
    if (!active.includes(this.nextColor)) this.nextColor = this.pickColor();
  }

  private animateCleared(popped: OccupiedCell[], dropped: OccupiedCell[]): void {
    for (const cell of popped) {
      const point = cellPosition(cell);
      const orb = this.makeBubble(point.x, point.y, cell.bubble.color, cell.bubble.bee);
      this.effectLayer.add(orb);
      this.tweens.add({ targets: orb, scale: 1.38, alpha: 0, duration: 300, ease: 'Cubic.Out', onComplete: () => orb.destroy() });
      if (cell.bubble.bee) this.flyBee(point.x, point.y);
    }
    for (const cell of dropped) {
      const point = cellPosition(cell);
      const orb = this.makeBubble(point.x, point.y, cell.bubble.color, cell.bubble.bee);
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

  private completeLevel(): void {
    this.playing = false;
    const ratio = this.shots / levels[this.levelIndex].shots;
    const stars = ratio > 0.67 ? 3 : ratio > 0.33 ? 2 : 1;
    save.stars[this.levelIndex] = Math.max(save.stars[this.levelIndex] || 0, stars);
    save.unlocked = Math.max(save.unlocked, Math.min(levels.length, this.levelIndex + 2));
    storeSave();
    playSound('win');
    showResult(true, this.levelIndex, stars);
  }
}

const scene = new PlayScene();
new Phaser.Game({
  type: Phaser.CANVAS,
  parent: 'game',
  width: 390,
  height: 844,
  transparent: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 390, height: 844 },
  render: { antialias: true, pixelArt: false },
  scene: [scene]
});

function updateHud(current: PlayScene): void {
  const status = current.getStatus();
  levelNumber.textContent = String(status.level + 1).padStart(2, '0');
  levelName.textContent = levels[status.level].name;
  shotsCount.textContent = String(status.shots);
  beesCount.textContent = `${status.freed}/${status.total}`;
}

function updateMuteButton(): void {
  muteButton.textContent = save.muted ? '♪̸' : '♫';
  muteButton.setAttribute('aria-label', save.muted ? 'Unmute sound' : 'Mute sound');
}

function beginLevel(index: number): void {
  overlay.classList.add('hidden');
  hud.classList.remove('hidden');
  scene.startLevel(index);
}

function showHome(): void {
  scene.returnHome();
  hud.classList.add('hidden');
  overlay.className = 'overlay';
  const firstUnfinished = levels.findIndex((_, index) => !save.stars[index]);
  const nextLevel = firstUnfinished === -1 ? 0 : firstUnfinished;
  const levelButtons = levels.map((level, index) => {
    const unlocked = index < save.unlocked;
    const stars = save.stars[index] || 0;
    return `<button class="level-tile ${unlocked ? '' : 'locked'}" data-level="${index}" ${unlocked ? '' : 'disabled'} aria-label="Level ${index + 1}: ${escapeHtml(level.name)}${unlocked ? '' : ', locked'}"><span>${index + 1}</span><small>${unlocked ? (stars ? '★'.repeat(stars) : 'Ready') : 'Locked'}</small></button>`;
  }).join('');
  overlay.innerHTML = `
    <div class="home-header"><span class="eyebrow">A LITTLE ADVENTURE FOR YOU</span><h1>Bramble’s<br><em>Bubble Rescue</em></h1><p>Pop bubbles. Free little friends. Make someone smile.</p></div>
    <img class="hero-art" src="${BASE}bramble.svg" alt="Bramble the friendly honey badger" />
    <div class="home-panel"><div class="dedication">${escapeHtml(gameContent.opening)}</div><button id="primary-play" class="primary-button">${save.stars.every(Boolean) && save.stars.length === levels.length ? 'Play again' : `Play level ${nextLevel + 1}`} <span>➜</span></button><h2>Choose a meadow</h2><div class="level-grid">${levelButtons}</div></div>
    <div class="home-footer">A cosy little game · No timers, just bubbles</div>`;
  overlay.querySelector<HTMLButtonElement>('#primary-play')!.addEventListener('click', () => beginLevel(nextLevel));
  overlay.querySelectorAll<HTMLButtonElement>('[data-level]').forEach((button) => button.addEventListener('click', () => beginLevel(Number(button.dataset.level))));
}

function showResult(won: boolean, index: number, stars: number): void {
  hud.classList.add('hidden');
  overlay.className = 'overlay result-overlay';
  const finale = won && index === levels.length - 1;
  const title = won ? (finale ? 'All home together!' : 'Lovely work!') : 'One more try?';
  const message = won ? (finale ? gameContent.ending : `You freed every bee in ${levels[index].name}.`) : 'Bramble believes in you. Take another shot at it!';
  const primaryLabel = won ? (finale ? 'Play from the beginning' : 'Next meadow') : 'Try again';
  overlay.innerHTML = `<div class="result-card"><span class="eyebrow">${won ? 'BEE FRIENDS RESCUED' : 'THE ADVENTURE CONTINUES'}</span><div class="result-art"><img src="${BASE}${won ? 'bee.svg' : 'bramble.svg'}" alt="" /></div><h2>${title}</h2><div class="stars" aria-label="${stars} stars">${won ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '✿ ✿ ✿'}</div><p>${escapeHtml(message)}</p><button id="result-primary" class="primary-button">${primaryLabel} <span>➜</span></button><button id="result-menu" class="text-button">Choose a level</button></div>`;
  overlay.querySelector<HTMLButtonElement>('#result-primary')!.addEventListener('click', () => beginLevel(won ? (index + 1) % levels.length : index));
  overlay.querySelector<HTMLButtonElement>('#result-menu')!.addEventListener('click', showHome);
}

document.querySelector<HTMLButtonElement>('#home-button')!.addEventListener('click', showHome);
document.querySelector<HTMLButtonElement>('#swap-button')!.addEventListener('click', () => scene.swap());
muteButton.addEventListener('click', () => { save.muted = !save.muted; storeSave(); updateMuteButton(); });
updateMuteButton();
showHome();
