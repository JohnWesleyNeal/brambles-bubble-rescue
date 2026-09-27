import { afterEach, describe, expect, it, vi } from 'vitest';
import { WoodlandAudio } from './audio';
import { migrateSave } from './progress';

afterEach(() => vi.unstubAllGlobals());
describe('woodland music lifecycle', () => {
  it('waits for a gesture, pauses when hidden or muted, and reuses one player', () => {
    const windowEvents = new EventTarget();
    const documentEvents = Object.assign(new EventTarget(), { hidden: false });
    const players: { paused: boolean; volume: number; loop: boolean; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> }[] = [];
    vi.stubGlobal('window', windowEvents); vi.stubGlobal('document', documentEvents);
    vi.stubGlobal('Audio', class {
      paused = true; volume = 1; loop = false;
      play = vi.fn(() => { this.paused = false; return Promise.resolve(); });
      pause = vi.fn(() => { this.paused = true; });
      constructor() { players.push(this); }
    });
    const save = migrateSave(null);
    const audio = new WoodlandAudio(save);
    audio.sync();
    expect(players[0].play).not.toHaveBeenCalled();
    windowEvents.dispatchEvent(new Event('pointerdown'));
    expect(players[0].loop).toBe(true);
    expect(players[0].volume).toBe(.22);
    windowEvents.dispatchEvent(new Event('pointerdown'));
    expect(players[0].play).toHaveBeenCalledTimes(1);
    documentEvents.hidden = true; documentEvents.dispatchEvent(new Event('visibilitychange'));
    expect(players[0].paused).toBe(true);
    documentEvents.hidden = false; documentEvents.dispatchEvent(new Event('visibilitychange'));
    expect(players[0].paused).toBe(false);
    save.effectsVolume = 0; audio.sync();
    expect(players[0].paused).toBe(false);
    save.musicVolume = 0; audio.sync();
    expect(players[0].paused).toBe(true);
    save.musicVolume = .3; save.muted = true; audio.sync();
    expect(players[0].paused).toBe(true);
    save.muted = false; audio.sync();
    expect(players[0].paused).toBe(false);
    windowEvents.dispatchEvent(new Event('pagehide'));
    expect(players[0].paused).toBe(true);
    windowEvents.dispatchEvent(new Event('pageshow'));
    expect(players[0].paused).toBe(false);
    expect(players).toHaveLength(1);
  });
});
