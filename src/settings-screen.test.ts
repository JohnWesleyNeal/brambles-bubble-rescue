import { describe, expect, it, vi } from 'vitest';
import { showSettingsScreen } from './settings-screen';

function overlayHarness(): { overlay: HTMLElement; click: (selector: string) => void } {
  const listeners = new Map<string, () => void>();
  const overlay = Object.assign(new EventTarget(), {
    className: '',
    innerHTML: '',
    querySelector(selector: string) {
      if (selector === 'button, input, [tabindex]') return null;
      return { addEventListener: (_event: string, callback: () => void) => listeners.set(selector, callback) };
    }
  }) as unknown as HTMLElement;
  return { overlay, click: (selector) => listeners.get(selector)?.() };
}

describe('Settings menu', () => {
  it('shows clear destinations and routes each choice to its parent action', () => {
    const { overlay, click } = overlayHarness();
    const actions = { close: vi.fn(), sound: vi.fn(), saveProgress: vi.fn() };
    showSettingsScreen(overlay, actions);

    expect(overlay.className).toBe('overlay sheet-overlay');
    expect(overlay.innerHTML).toContain('aria-labelledby="settings-title"');
    expect(overlay.innerHTML).toContain('>Settings</h2>');
    expect(overlay.innerHTML).toContain('Sound &amp; aiming');
    expect(overlay.innerHTML).toContain('Save &amp; progress');
    click('#settings-sound');
    click('#settings-save');
    click('#settings-close');
    expect(actions.sound).toHaveBeenCalledOnce();
    expect(actions.saveProgress).toHaveBeenCalledOnce();
    expect(actions.close).toHaveBeenCalledOnce();
  });
});
