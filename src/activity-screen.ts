import { activityLevel, activityUnlocked, bossPhases, challenges, type Activity } from './activities';
import type { GameEngine } from './engine';
import type { SaveData } from './progress';

const art = `${import.meta.env.BASE_URL}magpie.svg`;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]!);
export function showActivityMenu(save: SaveData, overlay: HTMLElement, actions: { home: () => void; start: (a: Activity) => void; resume: () => void }): void {
  overlay.className = 'overlay sheet-overlay';
  const boss = (rematch: boolean) => {
    const phase = save[rematch ? 'rematchCheckpoint' : 'bossCheckpoint'];
    const activity: Activity = { kind: 'boss', phase, rematch };
    const open = activityUnlocked(activity, save.stars);
    return `<button class="adventure-card boss-card" data-boss="${rematch}" ${open ? '' : 'disabled'}><img src="${art}" alt="Monty the magpie with his borrowed picnic"/><span><strong>${rematch ? 'Monty’s Revenge' : 'The Great Picnic Heist'}</strong><small>${open ? save[rematch ? 'rematchCleared' : 'bossCleared'] ? 'Picnic recovered · play again' : phase ? `Continue at phase ${phase + 1} of 3` : 'Three phases · gifts welcome · no timers' : `Clear all ${rematch ? 30 : 20} meadows to unlock`}</small></span></button>`;
  };
  overlay.innerHTML = `<section class="sheet adventures-sheet" role="dialog" aria-label="Side adventures"><div class="sheet-top"><span class="eyebrow">A LITTLE EXTRA MISCHIEF</span><button class="sheet-close" id="adventures-close" aria-label="Close side adventures">×</button></div><h2>Side adventures</h2><p class="sheet-lead">Clever challenges and one extremely possessive magpie.</p><div class="sheet-scroll">${save.activeSideRun ? '<button id="adventures-resume" class="primary-button">Resume side adventure ➜</button>' : ''}<p class="rule-footnote">Your main meadow stays saved separately. Medals never replace your campaign stars.</p><h3>The picnic heist</h3>${boss(false)}${boss(true)}<h3>Challenge medals · ${save.medals.length}/6</h3><p class="rule-footnote">Clear a meadow to open its challenge. You can continue as normal at any time; that attempt becomes practice without a medal.</p><div class="challenge-list">${challenges.map(c => `<button class="adventure-card" data-challenge="${c.id}" ${save.stars[c.level - 1] ? '' : 'disabled'}><span class="medal-symbol">${save.medals.includes(c.id) ? '✦' : '◇'}</span><span><strong>${escape(c.name)}</strong><small>Meadow ${c.level}${save.medals.includes(c.id) ? ' · medal earned' : save.stars[c.level - 1] ? ' · ready' : ' · clear to unlock'}</small><small>${escape(c.description)}</small></span></button>`).join('')}</div></div></section>`;
  overlay.querySelector('#adventures-close')!.addEventListener('click', actions.home);
  overlay.querySelector('#adventures-resume')?.addEventListener('click', actions.resume);
  overlay.querySelectorAll<HTMLButtonElement>('[data-challenge]').forEach(b => b.addEventListener('click', () => actions.start({ kind: 'challenge', id: b.dataset.challenge! })));
  overlay.querySelectorAll<HTMLButtonElement>('[data-boss]').forEach(b => b.addEventListener('click', () => {
    const rematch = b.dataset.boss === 'true';
    actions.start({ kind: 'boss', phase: save[rematch ? 'rematchCheckpoint' : 'bossCheckpoint'], rematch });
  }));
}

export function showActivityIntro(activity: Activity, overlay: HTMLElement, start: () => void, back: () => void): void {
  const boss = activity.kind === 'boss';
  overlay.className = 'overlay result-overlay';
  const level = activityLevel(activity);
  overlay.innerHTML = `<section class="result-card adventure-intro" role="dialog" aria-label="Adventure briefing"><span class="eyebrow">${boss ? `THE GREAT PICNIC HEIST · ${activity.phase + 1}/3` : 'AN OPTIONAL CHALLENGE'}</span>${boss ? `<img class="magpie-portrait" src="${art}" alt="Monty the magpie"/>` : '<div class="challenge-emblem">◇</div>'}<h2>${escape(level.name)}</h2>${boss ? `<p class="magpie-quote">${bossPhases[activity.phase].line}</p>` : ''}<p>${escape(level.tutorial ?? '')}</p><p class="rule-footnote">${boss ? 'Each phase saves as a checkpoint. Gifts and extra bubbles are free. Retry only this phase if the board overflows.' : 'Earn a separate medal. Continue as normal whenever you like to keep playing without the challenge rules.'}</p><button id="adventure-go" class="primary-button">${boss ? 'Take back the picnic' : 'Try this challenge'} ➜</button><button id="adventure-back" class="text-button">Back to side adventures</button></section>`;
  overlay.querySelector('#adventure-go')!.addEventListener('click', start);
  overlay.querySelector('#adventure-back')!.addEventListener('click', back);
}

export function showActivityResult(game: GameEngine, overlay: HTMLElement, actions: { start: (a: Activity) => void; menu: () => void; gifts: (back: () => void) => void }): void {
  const activity = game.activity!;
  const boss = activity.kind === 'boss';
  const next = boss && game.won && activity.phase < 2;
  const title = !game.won ? 'One more try?' : boss ? next ? 'A little victory!' : 'The picnic is ours!' : game.challengeComplete ? 'A medal for your garden!' : game.challengeRelaxed ? 'Lovely practice!' : 'Rescued! One more little challenge…';
  const message = boss ? game.won ? bossPhases[activity.phase].response : 'Monty got a little carried away. Retry this phase; earlier phases are safe.' : game.challengeComplete ? 'A clever rescue, remembered separately from your meadow stars.' : game.challengeRelaxed ? 'Everyone is home. Replay with the challenge rules whenever you fancy a medal.' : `You needed ${game.challenge?.bankGoal ?? 0} bank-shot rescues; you made ${game.bankBees}. Try a wall bounce earlier in the rescue.`;
  overlay.className = 'overlay result-overlay';
  overlay.innerHTML = `<section class="result-card win-card" role="dialog" aria-label="Adventure result"><span class="eyebrow">${boss ? 'MONTY’S PICNIC REPORT' : 'YOUR LITTLE ACHIEVEMENT'}</span>${boss ? `<img class="magpie-portrait" src="${art}" alt="Monty considers sharing"/>` : `<div class="challenge-emblem">${game.challengeComplete ? '✦' : '✿'}</div>`}<h2>${title}</h2><p>${escape(message)}</p>${boss && game.won && !next ? '<p class="reward-note">Monty agrees to share. Picnic keepsake earned!</p>' : ''}<button id="adventure-next" class="primary-button">${next ? 'Next phase' : boss && game.won ? 'Back to side adventures' : 'Try again'} ➜</button><button id="adventure-gifts" class="secondary-button">Gifts · free refills</button><button id="adventure-menu" class="text-button">Side adventures</button></section>`;
  overlay.querySelector('#adventure-next')!.addEventListener('click', () => next ? actions.start({ ...activity, phase: activity.phase + 1 }) : boss && game.won ? actions.menu() : actions.start(activity));
  overlay.querySelector('#adventure-menu')!.addEventListener('click', actions.menu);
  overlay.querySelector('#adventure-gifts')!.addEventListener('click', () => actions.gifts(() => showActivityResult(game, overlay, actions)));
}
