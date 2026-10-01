const escapeHandlers = new WeakMap<HTMLElement, (event: KeyboardEvent) => void>();

export function setOverlayEscapeClose(overlay: HTMLElement, close: () => void): void {
  clearOverlayEscapeClose(overlay);
  const handler = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  };
  overlay.addEventListener('keydown', handler);
  escapeHandlers.set(overlay, handler);
  overlay.querySelector<HTMLElement>('button, input, [tabindex]')?.focus({ preventScroll: true });
}

export function clearOverlayEscapeClose(overlay: HTMLElement): void {
  const handler = escapeHandlers.get(overlay);
  if (!handler) return;
  overlay.removeEventListener('keydown', handler);
  escapeHandlers.delete(overlay);
}
