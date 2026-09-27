import type { SaveData } from './progress';

/** One music element for the whole application, including overlay transitions. */
export class WoodlandAudio {
  private readonly music = new Audio(`${import.meta.env.BASE_URL}audio/sunset-walk.ogg`);
  private unlocked = false;
  constructor(private readonly settings: SaveData) {
    this.music.loop = true;
    this.music.preload = 'none';
    const unlock = (): void => { this.unlocked = true; this.sync(); };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => this.sync());
    window.addEventListener('pagehide', () => this.music.pause());
    window.addEventListener('pageshow', () => this.sync());
  }
  sync(): void {
    this.music.volume = this.settings.musicVolume;
    if (!this.unlocked || document.hidden || this.settings.muted || !this.settings.musicVolume) this.music.pause();
    else if (this.music.paused) void this.music.play().catch(() => { /* A later gesture can retry. */ });
  }
}
