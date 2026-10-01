import { describe, expect, it, vi } from 'vitest';
import { clearOverlayEscapeClose, setOverlayEscapeClose } from './overlay-navigation';

describe('menu Escape navigation', () => {
  it('closes only the current overlay route and replaces stale handlers', () => {
    const overlay = Object.assign(new EventTarget(), { querySelector: () => null }) as unknown as HTMLElement;
    const first = vi.fn();
    const second = vi.fn();
    setOverlayEscapeClose(overlay, first);
    setOverlayEscapeClose(overlay, second);
    const escape = (): Event => Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' });
    overlay.dispatchEvent(escape());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
    clearOverlayEscapeClose(overlay);
    overlay.dispatchEvent(escape());
    expect(second).toHaveBeenCalledOnce();
  });
});
