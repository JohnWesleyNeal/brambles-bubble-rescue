import type { JourneyData } from './progress';

export const friends = [
  { name: 'Mabel', title: 'Keeper of the spare picnic', clears: 5, hat: '✿', description: 'Keeps a spare sandwich for emergencies. Nobody knows why the picnic needs so many emergency sandwiches, least of all Mabel.' },
  { name: 'Sir Buzzby', title: 'Head of extremely small security', clears: 10, hat: '♛', description: 'Patrols in a thimble-sized helmet. Last week he arrested a suspicious pollen speck, then let it go for lack of evidence.' },
  { name: 'Clover', title: 'Assistant to the afternoon nap', clears: 20, hat: '☾', description: 'Can nap through a thunderstorm, a parade, and the kettle boiling. Her official advice is to try all three at once.' },
  { name: 'Pip', title: 'Hat enthusiast, bee second', clears: 30, hat: '★', description: 'Brought thirty invitations and thirty-one hats. He will not say who the spare hat is for.' }
];

export const gardenStyles = [
  { id: 'meadow', name: 'Meadow morning', clears: 0 },
  { id: 'rose', name: 'Rosewater picnic', clears: 5 },
  { id: 'twilight', name: 'Lavender evening', clears: 10 }
] as const;

export function friendsCards(stars: number[]): string {
  const clears = stars.filter(Boolean).length;
  const unlocked = friends.filter((friend) => clears >= friend.clears);
  if (!unlocked.length) return '';
  return `<div class="friend-list">${unlocked.map((friend) => `<article class="friend-card"><div class="friend-portrait" aria-hidden="true"><span>${friend.hat}</span><img src="${import.meta.env.BASE_URL}bee.svg" alt=""></div><div><strong>${friend.name}</strong><small>${friend.title}</small><p>${friend.description}</p></div></article>`).join('')}</div>`;
}

export function styleChoices(save: JourneyData): string {
  const clears = save.stars.filter(Boolean).length;
  return `<div class="garden-styles" role="group" aria-label="Garden colors">${gardenStyles.map((style) => `<button data-garden-style="${style.id}" aria-pressed="${save.gardenStyle === style.id}" ${clears < style.clears ? 'disabled' : ''}>${style.name}<small>${clears < style.clears ? `${style.clears} clears` : save.gardenStyle === style.id ? 'Wearing this one' : 'Yours · free'}</small></button>`).join('')}</div>`;
}

export function masteryLabels(record: JourneyData['records'][number] | undefined): string[] {
  return record ? [record.unaided ? '✿ Garden craft' : '', record.cascade ? '❋ Lovely cascade' : '', record.bank ? '↗ Around the bend' : ''].filter(Boolean) : [];
}
