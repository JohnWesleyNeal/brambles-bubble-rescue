import { boosters } from './boosters';
import { levels } from './levels';
import { gardenProgress, lastSaveSucceeded, storeSave, type JourneyData, type SaveData } from './progress';
import { exportJourney, freshJourney, importJourney, replaceJourney } from './save-management';

const escape = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const summary = (save: JourneyData): string => `${save.stars.filter(Boolean).length} of ${levels.length} meadows · ${save.stars.reduce((sum, n) => sum + n, 0)} stars${save.activeRun ? ` · Level ${save.activeRun.levelId} paused` : ''}`;
const date = (time: number): string => time ? new Date(time).toLocaleString() : 'Earlier journey';

export function showSaveScreen(save: SaveData, overlay: HTMLElement, actions: { close: () => void; garden: () => void; levels: () => void; applied: () => void }): void {
  const render = (): void => {
    const garden = gardenProgress(save.stars);
    overlay.className = 'overlay sheet-overlay';
    overlay.innerHTML = `<section class="sheet save-sheet" role="dialog" aria-label="My Garden"><div class="sheet-top"><span class="eyebrow">YOUR LITTLE ADVENTURE</span><button id="save-close" class="sheet-close" aria-label="Close My Garden">×</button></div><h2>${escape(save.gardenName)}</h2><p class="sheet-lead">${escape(summary(save))}</p><div class="sheet-scroll"><p class="save-status ${lastSaveSucceeded ? '' : 'save-warning'}" role="status">${lastSaveSucceeded ? `Saved on this device · ${escape(date(save.savedAt))}` : 'This browser could not save your latest progress. Download a backup before leaving.'}</p><form id="garden-name-form"><label for="garden-name">Name your garden</label><div class="garden-name-row"><input id="garden-name" maxlength="40" value="${escape(save.gardenName)}" autocomplete="off"><button class="secondary-button" type="submit">Save name</button></div></form><h3>Your unlocks</h3><div class="save-unlocks"><p>✿ ${garden.flowers} flowers · ${garden.decorations} decorations<br>⌂ ${garden.hive} hive improvements</p>${boosters.map((b) => `<p><span>${b.symbol} ${escape(b.name)}</span><strong>${save.unlocked >= b.unlockLevel ? `${save.inventory[b.id]} ready` : `Level ${b.unlockLevel}`}</strong></p>`).join('')}</div><div class="save-buttons"><button id="save-visit" class="secondary-button">Visit Bee Garden</button><button id="save-replay" class="secondary-button">Replay an unlocked meadow</button></div><p class="rule-footnote">Replaying keeps your unlocks, garden and best stars.</p><h3>Keep a copy</h3><p class="sheet-lead">Saving is automatic in this browser. A backup file lets you keep a copy outside it or move to another phone.</p><div class="save-buttons"><button id="save-export" class="secondary-button">Download backup</button><button id="save-import" class="secondary-button">Restore a backup</button></div><input id="save-file" type="file" accept=".json,application/json" hidden><p id="save-message" role="status" class="save-status"></p><h3>A fresh beginning</h3><p class="sheet-lead">Start at level one with a new garden. Your name and sound settings stay.</p><button id="save-reset" class="secondary-button">Start a fresh journey</button>${save.previousJourney ? `<div class="previous-journey"><strong>Previous journey kept here</strong><p>${escape(save.previousJourney.gardenName)}<br>${escape(summary(save.previousJourney))}<br>${escape(date(save.previousJourney.savedAt))}</p><button id="save-previous" class="secondary-button">Return to previous journey</button></div>` : ''}<p class="rule-footnote">One previous journey stays on this device. A fresh start or restore replaces that recovery slot. Download backups to keep more. No account or cloud sync is needed.</p></div></section>`;
    overlay.querySelector('#save-close')!.addEventListener('click', actions.close);
    overlay.querySelector('#save-visit')!.addEventListener('click', actions.garden);
    overlay.querySelector('#save-replay')!.addEventListener('click', actions.levels);
    const message = (text: string): void => { overlay.querySelector('#save-message')!.textContent = text; };
    overlay.querySelector('#garden-name-form')!.addEventListener('submit', (event) => {
      event.preventDefault();
      const oldName = save.gardenName;
      save.gardenName = overlay.querySelector<HTMLInputElement>('#garden-name')!.value.trim() || 'My Garden';
      if (!storeSave(save)) save.gardenName = oldName;
      render();
    });
    overlay.querySelector('#save-export')!.addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([exportJourney(save)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url;
      link.download = `bramble-garden-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      message('Backup download requested. Keep the file somewhere safe.');
    });
    const fileInput = overlay.querySelector<HTMLInputElement>('#save-file')!;
    overlay.querySelector('#save-import')!.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0]; if (!file) return;
      try {
        if (file.size > 2_000_000) throw new Error('That file is too large to be a garden backup.');
        const imported = importJourney(await file.text());
        if (fileInput.isConnected) confirm('Restore this garden?', imported, 'Your current journey will be kept in the previous-journey slot.', 'Restore this garden');
      } catch (error) { if (fileInput.isConnected) { message(error instanceof Error ? error.message : 'The file could not be read. Your current garden has not changed.'); fileInput.value = ''; } }
    });
    overlay.querySelector('#save-reset')!.addEventListener('click', () => confirm('Start a fresh journey?', freshJourney(save), 'Begin at level one with fresh stars, gifts and flowers. Your current journey will be kept in the previous-journey slot.', 'Start fresh'));
    overlay.querySelector('#save-previous')?.addEventListener('click', () => confirm('Return to this journey?', save.previousJourney!, 'Your current journey takes its place in the recovery slot, so you can switch back.', 'Return to this journey'));
  };
  const confirm = (title: string, next: JourneyData, description: string, label: string): void => {
    overlay.className = 'overlay result-overlay';
    overlay.innerHTML = `<section class="result-card" role="dialog" aria-label="Confirm journey change"><span class="eyebrow">YOUR GARDEN, YOUR PACE</span><h2>${title}</h2><p><strong>${escape(next.gardenName)}</strong><br>${escape(summary(next))}</p><p>${description}</p>${save.previousJourney && next !== save.previousJourney ? '<p class="rule-footnote">This replaces the older recovery copy. Download it first if you want to keep it too.</p>' : ''}<button id="journey-keep" class="primary-button">Keep my current journey</button><button id="journey-confirm" class="secondary-button">${label}</button><p id="journey-error" role="alert" class="rule-footnote"></p></section>`;
    overlay.querySelector('#journey-keep')!.addEventListener('click', render);
    overlay.querySelector('#journey-confirm')!.addEventListener('click', () => {
      if (!replaceJourney(save, next)) {
        overlay.querySelector('#journey-error')!.textContent = 'The browser could not save this change. Your current journey is unchanged. Download a backup first.';
        return;
      }
      actions.applied();
    });
  };
  render();
}
