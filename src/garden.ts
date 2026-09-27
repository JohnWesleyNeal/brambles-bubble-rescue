import { gardenProgress } from './progress';
import { friends } from './friends';

const decorations = [
  '<g transform="translate(50 256)"><path d="M-21 0h42v10h-42zm5 10v22m30-22v22" fill="#bd8450" stroke="#785a3b" stroke-width="5"/><path d="M-21-18h42v12h-42z" fill="#d5a16b" stroke="#785a3b" stroke-width="3"/></g>',
  '<g transform="translate(288 233)"><path d="M0 0v43" stroke="#887850" stroke-width="8"/><ellipse rx="24" ry="8" fill="#d3c6a6" stroke="#a49375" stroke-width="3"/><ellipse cy="-2" rx="19" ry="5" fill="#9fcfd0"/></g>',
  '<g transform="translate(65 174)"><path d="M0 0v46" stroke="#836244" stroke-width="5"/><path d="M-16 0v-27l16-15 16 15V0z" fill="#e9b871" stroke="#956f44" stroke-width="3"/><path d="m-23-25 23-22 23 22" fill="none" stroke="#b17a50" stroke-width="6"/><circle cy="-18" r="6" fill="#74583c"/></g>',
  '<g transform="translate(257 300)"><path d="M-23-8h46l-5 25h-36z" fill="#c98660" stroke="#966746" stroke-width="3"/><path d="M-12-8q-15-24-8-30 18 5 20 25 4-32 17-30 9 18-4 34" fill="#6b9e71"/></g>',
  '<g transform="translate(122 253)"><path d="M-10 10V-55q40-40 80 0v55" fill="none" stroke="#b39968" stroke-width="7"/><path d="M-11-5q-14-28 8-38m25-29q17-17 33 2m23 30q16 28-1 40" fill="none" stroke="#75a576" stroke-width="9"/></g>',
  '<g transform="translate(287 150)"><path d="M0 0v42m-10-10h20" stroke="#9b754c" stroke-width="4"/><path d="M-12 0v-23h24V0z" fill="#ffedaa" stroke="#a97e48" stroke-width="3"/><path d="m-16-23 16-10 16 10" fill="#b78550"/></g>'
];

/** Garden is a view of earned progress; it has no second currency or reward ledger. */
export function gardenArt(stars: number[], style = 'meadow'): string {
  const progress = gardenProgress(stars);
  const sky = style === 'twilight' ? ['#b8b7d9', '#ead6de'] : style === 'rose' ? ['#ecd0cf', '#fff0d4'] : ['#daeedd', '#fff0c5'];
  const blooms = Array.from({ length: progress.flowers }, (_, i) => {
    const x = 25 + (i * 47 % 285); const y = 294 + (i * 19 % 70);
    const color = ['#eaa998', '#f0ce79', '#bdadd5', '#e7b5cb'][i % 4];
    return `<g transform="translate(${x} ${y})"><path d="M0 0v21m0-7q-14-13-12-2 4 7 12 4" stroke="#648c58" fill="#83a56d" stroke-width="2"/><g fill="${color}" stroke="#fff4d8" stroke-width="1.5">${[0, 72, 144, 216, 288].map((r) => `<ellipse cy="-6" rx="4" ry="7" transform="rotate(${r})"/>`).join('')}</g><circle r="3" fill="#bd8749"/></g>`;
  }).join('');
  const hats = [
    '<g fill="#eab3c8"><circle cx="0" cy="-13" r="4"/><circle cx="-4" cy="-10" r="4"/><circle cx="4" cy="-10" r="4"/><circle cx="0" cy="-9" r="2" fill="#fff0ae"/></g>',
    '<path d="m-7-8-2-10 6 4 3-7 3 7 6-4-2 10z" fill="#f5d17c" stroke="#997544"/>',
    '<path d="m-8-8 7-15 8 15z" fill="#b6a4d2"/><circle cx="-1" cy="-23" r="2" fill="#fff0bc"/>',
    '<path d="M-10-8h20M-6-8v-12H6v12" fill="#88afa0" stroke="#527b69" stroke-width="3"/>'
  ];
  const residents = friends.filter(friend => progress.flowers >= friend.clears).length;
  const hive = `<g transform="translate(177 218)"><ellipse cy="26" rx="57" ry="11" fill="#547d55" opacity=".16"/><path d="M-40 14q0-70 40-75 40 5 40 75z" fill="${['#d8aa65', '#e5b669', '#edc77b', '#f1ce86'][progress.hive]}" stroke="#ad804b" stroke-width="3"/><path d="M-27-32h54m-64 17h74m-78 17h82" stroke="#bb8b4f" stroke-width="3" fill="none"/><path d="M-10 14V3a10 10 0 0 1 20 0v11" fill="#765b3e"/><path d="M-44 16h88" stroke="#9a7046" stroke-width="7" stroke-linecap="round"/>${progress.hive > 0 ? '<path d="m-25-45 25-29 25 29" fill="#a8bc8b" stroke="#658666" stroke-width="3"/>' : ''}${progress.hive > 1 ? '<path d="M-39-3q-14-20-6-34m84 34q14-20 6-34" stroke="#658e62" stroke-width="4" fill="none"/><circle cx="-44" cy="-31" r="6" fill="#edb6a7"/><circle cx="44" cy="-31" r="6" fill="#edb6a7"/>' : ''}${progress.hive > 2 ? '<path d="m-12-63 12-17 12 17" fill="#f5dd88" stroke="#b48d48" stroke-width="2"/>' : ''}</g>`;
  const bees = Array.from({ length: progress.bees }, (_, i) => `<g transform="translate(${55 + i * 33} ${111 + i % 3 * 29})"><g class="garden-bee" style="animation-delay:-${i * .7}s"><g class="garden-wings"><ellipse cx="-5" cy="-7" rx="7" ry="5" fill="#f7fff1"/><ellipse cx="5" cy="-7" rx="7" ry="5" fill="#f7fff1"/></g><ellipse rx="10" ry="7" fill="#f1ca72" stroke="#80603e" stroke-width="1.5"/><path d="M-3-6v12m6-12v12" stroke="#80603e" stroke-width="3"/><circle cx="7" cy="-2" r="1.5" fill="#493f2b"/>${i < residents ? hats[i] : ''}</g></g>`).join('');
  return `<svg class="garden-art" viewBox="0 0 340 395" role="img" aria-label="A bee garden with ${progress.flowers} flowers, ${progress.decorations} decorations and ${progress.bees} bees"><defs><linearGradient id="garden-sky" x2="0" y2="1"><stop stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="340" height="395" rx="24" fill="url(#garden-sky)"/><circle cx="263" cy="57" r="29" fill="#fff1ba"/><path d="M0 168Q60 102 130 169T340 147V395H0Z" fill="#bdd3a7"/><path d="M0 214Q80 157 156 216T340 201V395H0Z" fill="#9fbf8e"/><path d="M0 273Q130 225 340 274V395H0Z" fill="#c2d39b"/><path d="M145 395q-67-49 25-133" fill="none" stroke="#e7d7ac" stroke-width="43"/>${decorations.slice(0, progress.decorations).join('')}${hive}${blooms}${bees}</svg>`;
}
