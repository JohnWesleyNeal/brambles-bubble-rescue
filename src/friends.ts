import type { JourneyData } from './progress';

export const friends = [
  { name: 'Mabel', title: 'Keeper of the spare picnic', clears: 5, hat: '✿', description: 'Always takes the scenic route. Carries an emergency sandwich for emergencies involving sandwiches.' },
  { name: 'Sir Buzzby', title: 'Head of extremely small security', clears: 10, hat: '♛', description: 'Checks every flower for suspicious pollen. Has never arrested anyone. Very proud of this.' },
  { name: 'Clover', title: 'Assistant to the afternoon nap', clears: 20, hat: '☾', description: 'Keeps the garden peaceful by demonstrating how. Please leave all urgent business under the daisy.' },
  { name: 'Pip', title: 'Hat enthusiast, bee second', clears: 30, hat: '★', description: 'Organised the reunion. Brought thirty invitations and thirty-one hats. Just in case.' }
];

export const gardenStyles = [
  { id: 'meadow', name: 'Meadow morning', clears: 0 },
  { id: 'rose', name: 'Rosewater picnic', clears: 5 },
  { id: 'twilight', name: 'Lavender evening', clears: 10 }
] as const;

export function friendsCards(stars: number[]): string {
  const clears = stars.filter(Boolean).length;
  return `<div class="friend-list">${friends.map((friend) => `<article class="friend-card ${clears < friend.clears ? 'friend-locked' : ''}"><div class="friend-portrait" aria-hidden="true"><span>${clears >= friend.clears ? friend.hat : '?'}</span><img src="${import.meta.env.BASE_URL}bee.svg" alt=""></div><div><strong>${friend.name}</strong><small>${clears >= friend.clears ? friend.title : `Arrives after ${friend.clears} meadow clears`}</small><p>${clears >= friend.clears ? friend.description : 'A little friend to look forward to. No hurry.'}</p></div></article>`).join('')}</div>`;
}

export function styleChoices(save: JourneyData): string {
  const clears = save.stars.filter(Boolean).length;
  return `<div class="garden-styles" role="group" aria-label="Garden colors">${gardenStyles.map((style) => `<button data-garden-style="${style.id}" aria-pressed="${save.gardenStyle === style.id}" ${clears < style.clears ? 'disabled' : ''}>${style.name}<small>${clears < style.clears ? `${style.clears} clears` : save.gardenStyle === style.id ? 'Wearing this one' : 'Yours · free'}</small></button>`).join('')}</div>`;
}

export function masteryLabels(record: JourneyData['records'][number] | undefined): string[] {
  return record ? [record.unaided ? '✿ Garden craft' : '', record.cascade ? '❋ Lovely cascade' : '', record.bank ? '↗ Around the bend' : ''].filter(Boolean) : [];
}
