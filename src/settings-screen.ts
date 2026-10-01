import { setOverlayEscapeClose } from './overlay-navigation';

export interface SettingsScreenActions {
  close: () => void;
  sound: () => void;
  saveProgress: () => void;
}

export function showSettingsScreen(overlay: HTMLElement, actions: SettingsScreenActions): void {
  overlay.className = 'overlay sheet-overlay';
  overlay.innerHTML = `<section class="sheet settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <div class="sheet-top"><span class="eyebrow">A LITTLE CUSTOMISING</span><button id="settings-close" class="sheet-close" aria-label="Close Settings">×</button></div>
    <h2 id="settings-title">Settings</h2>
    <p class="sheet-lead">Choose what you’d like to adjust.</p>
    <div class="settings-links">
      <button id="settings-sound" class="settings-link" type="button"><span><strong>Sound &amp; aiming</strong><small>Music, effects, and the aim guide</small></span><span aria-hidden="true">›</span></button>
      <button id="settings-save" class="settings-link" type="button"><span><strong>Save &amp; progress</strong><small>Device save, backups, and your journey</small></span><span aria-hidden="true">›</span></button>
    </div>
  </section>`;
  overlay.querySelector('#settings-close')!.addEventListener('click', actions.close);
  overlay.querySelector('#settings-sound')!.addEventListener('click', actions.sound);
  overlay.querySelector('#settings-save')!.addEventListener('click', actions.saveProgress);
  setOverlayEscapeClose(overlay, actions.close);
}
