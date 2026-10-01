import { describe, expect, it, vi } from 'vitest';
import { migrateSave } from './progress';
import { showSaveScreen } from './save-screen';

class FakeControl {
  private handlers = new Map<string, (event: { preventDefault?: () => void }) => void>();
  files: FileList | null = null;
  value = '';
  textContent = '';
  isConnected = true;
  addEventListener(type: string, callback: (event: { preventDefault?: () => void }) => void): void { this.handlers.set(type, callback); }
  click(): void { this.handlers.get('click')?.({}); }
}

class FakeOverlay extends EventTarget {
  className = '';
  private html = '';
  private controls = new Map<string, FakeControl>();
  get innerHTML(): string { return this.html; }
  set innerHTML(value: string) { this.html = value; this.controls.clear(); }
  querySelector(selector: string): FakeControl | null {
    if (selector === 'button, input, [tabindex]') return null;
    let control = this.controls.get(selector);
    if (!control) { control = new FakeControl(); this.controls.set(selector, control); }
    return control;
  }
}

describe('Save & progress screen', () => {
  it('separates portable backups from fresh-start controls and keeps reset behind confirmation', () => {
    const save = migrateSave({ version: 4, gardenName: 'Clover Corner', unlocked: 4, stars: [2, 1, 1] });
    const before = JSON.stringify(save);
    const overlay = new FakeOverlay() as unknown as HTMLElement;
    const actions = { close: vi.fn(), garden: vi.fn(), levels: vi.fn(), applied: vi.fn() };
    showSaveScreen(save, overlay, actions);

    expect(overlay.innerHTML).toContain('aria-labelledby="save-title"');
    expect(overlay.innerHTML).toContain('>Save &amp; progress</h2>');
    expect(overlay.innerHTML.indexOf('Backup &amp; restore')).toBeLessThan(overlay.innerHTML.indexOf('Start fresh'));
    expect(overlay.innerHTML).toContain('Your current journey stays in the previous-journey slot');
    (overlay.querySelector('#save-reset') as unknown as FakeControl).click();
    expect(overlay.innerHTML).toContain('aria-label="Confirm journey change"');
    expect(overlay.innerHTML).toContain('Start a fresh journey');
    expect(actions.applied).not.toHaveBeenCalled();
    expect(JSON.stringify(save)).toBe(before);

    (overlay.querySelector('#journey-keep') as unknown as FakeControl).click();
    expect(overlay.innerHTML).toContain('>Save &amp; progress</h2>');
    expect(actions.applied).not.toHaveBeenCalled();
    expect(JSON.stringify(save)).toBe(before);
  });
});
