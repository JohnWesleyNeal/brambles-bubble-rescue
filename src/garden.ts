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

// The original six keepsakes stay where they were. Further five-clear rewards
// furnish new beds below the first garden, rather than crowding its flowers.
const expansionDecorations = [
  '<path d="M-12-4h20v14h-20zM8-2h9l-4 6H8M-7-4v-7h9v7" fill="#8bbab2" stroke="#557e78" stroke-width="2"/><path d="M-12-1q-11-6-11 3t11 4" fill="none" stroke="#557e78" stroke-width="2"/>',
  '<path d="M-8 9V-5H8V9" fill="#c99462" stroke="#8c6845" stroke-width="2"/><path d="M-14-5q14-19 28 0z" fill="#dfab8d" stroke="#9e715b" stroke-width="2"/><circle cx="-5" cy="-9" r="2" fill="#fff2d0"/><circle cx="5" cy="-9" r="2" fill="#fff2d0"/>',
  '<path d="M-12 4q12-18 24 0v5h-24z" fill="#b8baa2" stroke="#8b927a" stroke-width="2"/><path d="M-6 0h12M-8 5H8" stroke="#dfe1c7" stroke-width="2"/>',
  '<path d="M-9 8V-8H9V8z" fill="#b6a2cf" stroke="#806896" stroke-width="2"/><path d="M-13-8h26m-10-4h-6" stroke="#806896" stroke-width="2"/><path d="M9-4q13-4 10 5H9" fill="none" stroke="#806896" stroke-width="2"/><path d="m-9-4-10-5 3 10h7" fill="#b6a2cf" stroke="#806896" stroke-width="2"/>',
  '<path d="M0 11V-10M-16-10h32v12h-32z" fill="#e5c792" stroke="#947a50" stroke-width="2"/><path d="M-8-4H8m-3-3 3 3-3 3" fill="none" stroke="#648b61" stroke-width="2"/>',
  '<path d="M-12 2h24l-3 9H-9z" fill="#c6896c" stroke="#976449" stroke-width="2"/><path d="M-5 2V-7M5 2V-8" stroke="#6f935d" stroke-width="2"/><circle cx="-5" cy="-9" r="4" fill="#e9b5cb"/><circle cx="5" cy="-10" r="4" fill="#edcf78"/>',
  '<path d="M-15 6q15-24 30 0M-13 6h26" fill="none" stroke="#c69765" stroke-width="4"/><path d="M-8 6v5m16-5v5" stroke="#93724b" stroke-width="3"/>',
  '<ellipse cy="4" rx="14" ry="7" fill="#93c5c8" stroke="#668f91" stroke-width="2"/><path d="M-5 4q5-5 10 0" fill="none" stroke="#e4f0df" stroke-width="2"/><path d="M0-1v-8m-5 8 5-8 5 8" stroke="#77a171" stroke-width="2" fill="#a9c98d"/>',
  '<path d="M0 11V-10M-13-10h26v13h-26z" fill="#efd98d" stroke="#a18550" stroke-width="2"/><path d="m-17-10 17-6 17 6" fill="#bd8e5e"/><circle cy="-3" r="3" fill="#806c47"/>',
  '<path d="M-13-1h26v12h-26z" fill="#d5ae7b" stroke="#9f7b50" stroke-width="2"/><path d="M-8-1q0-17 16 0m-21 7h26" fill="none" stroke="#9f7b50" stroke-width="2"/><circle cx="-7" cy="-3" r="4" fill="#dcad9a"/><circle cx="2" cy="-4" r="4" fill="#b7a6cf"/><circle cx="9" cy="-2" r="3" fill="#e7cf79"/>',
  '<path d="M0 11V-9" stroke="#a27d55" stroke-width="3"/><path d="M0-9q-18-14-16 1 10 7 16-1q18 14 16-1-10-7-16 1" fill="#aabf87" stroke="#6f905c" stroke-width="2"/><circle cy="-9" r="3" fill="#edc477"/>',
  '<path d="M-11-7h22v17h-22z" fill="#d4b188" stroke="#9b7955" stroke-width="2"/><path d="M-15-7h30M-7-3H7m-14 5H7m-14 5H7" stroke="#9b7955" stroke-width="2"/><circle cy="3" r="3" fill="#755c43"/>',
  '<path d="M-14 7h28M-10 7v-10h20V7m-14-10v-7h8v7" fill="#91aea0" stroke="#5b8270" stroke-width="2"/><path d="M-6 0H6" stroke="#e2ecd4" stroke-width="2"/>',
  '<path d="M0 11V-8M-14-8H14" stroke="#99744c" stroke-width="3"/><path d="m-13-7 6 11 6-11m2 0 6 11 6-11" fill="#e8b5bc" stroke="#b17f85" stroke-width="1.5"/><circle cy="-8" r="4" fill="#f0d17c"/>'
];

const firstGardenHeight = 395;
const bedHeight = 64;
const hiveColors = ['#d8aa65', '#e5b669', '#edc77b', '#f1ce86'];

/** Garden is a view of earned progress; it has no second currency or reward ledger. */
export function gardenArt(stars: number[], style = 'meadow'): string {
  const progress = gardenProgress(stars);
  const extraBeds = Math.ceil(Math.max(0, progress.flowers - 30) / 10);
  const height = firstGardenHeight + extraBeds * bedHeight;
  const sky = style === 'twilight' ? ['#b8b7d9', '#ead6de'] : style === 'rose' ? ['#ecd0cf', '#fff0d4'] : ['#daeedd', '#fff0c5'];
  const blooms = Array.from({ length: progress.flowers }, (_, i) => {
    const x = i < 30 ? 25 + (i * 47 % 285) : 28 + ((i - 30) % 10) * 31;
    const y = i < 30 ? 294 + (i * 19 % 70) : firstGardenHeight + Math.floor((i - 30) / 10) * bedHeight + 39;
    const color = ['#eaa998', '#f0ce79', '#bdadd5', '#e7b5cb'][i % 4];
    return `<g class="garden-flower" transform="translate(${x} ${y})"><path d="M0 0v21m0-7q-14-13-12-2 4 7 12 4" stroke="#648c58" fill="#83a56d" stroke-width="2"/><g fill="${color}" stroke="#fff4d8" stroke-width="1.5">${[0, 72, 144, 216, 288].map((r) => `<ellipse cy="-6" rx="4" ry="7" transform="rotate(${r})"/>`).join('')}</g><circle r="3" fill="#bd8749"/></g>`;
  }).join('');
  const beds = Array.from({ length: extraBeds }, (_, i) => {
    const y = firstGardenHeight + i * bedHeight;
    return `<g class="garden-bed"><rect x="0" y="${y}" width="340" height="${bedHeight}" fill="#c2d39b"/><path d="M14 ${y + 27}Q170 ${y + 17}326 ${y + 27}v31H14Z" fill="${i % 2 ? '#acc58e' : '#b5cb91'}"/><path d="M18 ${y + 18}q152-10 304 0" fill="none" stroke="#e7d7ac" stroke-width="9" stroke-linecap="round"/></g>`;
  }).join('');
  const keepsakes = decorations.slice(0, progress.decorations).map((art) => `<g class="garden-decoration">${art}</g>`).join('')
    + expansionDecorations.slice(0, Math.max(0, progress.decorations - decorations.length)).map((art, i) => {
      const x = i % 2 ? 287 : 53;
      const y = firstGardenHeight + Math.floor(i / 2) * bedHeight + 13;
      return `<g class="garden-decoration" transform="translate(${x} ${y})">${art}</g>`;
    }).join('');
  const hats = [
    '<g fill="#eab3c8"><circle cx="0" cy="-13" r="4"/><circle cx="-4" cy="-10" r="4"/><circle cx="4" cy="-10" r="4"/><circle cx="0" cy="-9" r="2" fill="#fff0ae"/></g>',
    '<path d="m-7-8-2-10 6 4 3-7 3 7 6-4-2 10z" fill="#f5d17c" stroke="#997544"/>',
    '<path d="m-8-8 7-15 8 15z" fill="#b6a4d2"/><circle cx="-1" cy="-23" r="2" fill="#fff0bc"/>',
    '<path d="M-10-8h20M-6-8v-12H6v12" fill="#88afa0" stroke="#527b69" stroke-width="3"/>'
  ];
  const residents = friends.filter(friend => progress.flowers >= friend.clears).length;
  const chapterCharms = Array.from({ length: Math.max(0, progress.hive - 3) }, (_, i) => `<g class="garden-hive-charm" transform="translate(${126 + i * 17} 254)"><path d="m0-8 7-4 7 4v8l-7 4-7-4z" fill="${['#edcf78', '#e9b5cb', '#b7a6cf'][i % 3]}" stroke="#a18550" stroke-width="1.5"/><circle cx="7" cy="-4" r="2" fill="#fff1cc"/></g>`).join('');
  const hive = `<g transform="translate(177 218)"><ellipse cy="26" rx="57" ry="11" fill="#547d55" opacity=".16"/><path d="M-40 14q0-70 40-75 40 5 40 75z" fill="${hiveColors[Math.min(progress.hive, hiveColors.length - 1)]}" stroke="#ad804b" stroke-width="3"/><path d="M-27-32h54m-64 17h74m-78 17h82" stroke="#bb8b4f" stroke-width="3" fill="none"/><path d="M-10 14V3a10 10 0 0 1 20 0v11" fill="#765b3e"/><path d="M-44 16h88" stroke="#9a7046" stroke-width="7" stroke-linecap="round"/>${progress.hive > 0 ? '<path d="m-25-45 25-29 25 29" fill="#a8bc8b" stroke="#658666" stroke-width="3"/>' : ''}${progress.hive > 1 ? '<path d="M-39-3q-14-20-6-34m84 34q14-20 6-34" stroke="#658e62" stroke-width="4" fill="none"/><circle cx="-44" cy="-31" r="6" fill="#edb6a7"/><circle cx="44" cy="-31" r="6" fill="#edb6a7"/>' : ''}${progress.hive > 2 ? '<path d="m-12-63 12-17 12 17" fill="#f5dd88" stroke="#b48d48" stroke-width="2"/>' : ''}</g>${chapterCharms}`;
  const bees = Array.from({ length: progress.bees }, (_, i) => `<g transform="translate(${55 + i * 33} ${111 + i % 3 * 29})"><g class="garden-bee" style="animation-delay:-${i * .7}s"><g class="garden-wings"><ellipse cx="-5" cy="-7" rx="7" ry="5" fill="#f7fff1"/><ellipse cx="5" cy="-7" rx="7" ry="5" fill="#f7fff1"/></g><ellipse rx="10" ry="7" fill="#f1ca72" stroke="#80603e" stroke-width="1.5"/><path d="M-3-6v12m6-12v12" stroke="#80603e" stroke-width="3"/><circle cx="7" cy="-2" r="1.5" fill="#493f2b"/>${i < residents ? hats[i] : ''}</g></g>`).join('');
  // Expanded beds scroll at their natural width; the compact garden keeps its
  // original height cap. This prevents 100 flowers shrinking into a thumbnail.
  return `<svg class="garden-art" viewBox="0 0 340 ${height}" ${extraBeds ? 'style="max-height:none" ' : ''}role="img" aria-label="A bee garden with ${progress.flowers} flowers, ${progress.decorations} decorations, ${progress.hive} hive improvements and ${progress.bees} bees"><defs><linearGradient id="garden-sky" gradientUnits="userSpaceOnUse" x2="0" y2="395"><stop stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="340" height="${height}" rx="24" fill="url(#garden-sky)"/><circle cx="263" cy="57" r="29" fill="#fff1ba"/><path d="M0 168Q60 102 130 169T340 147V395H0Z" fill="#bdd3a7"/><path d="M0 214Q80 157 156 216T340 201V395H0Z" fill="#9fbf8e"/><path d="M0 273Q130 225 340 274V395H0Z" fill="#c2d39b"/><path d="M145 395q-67-49 25-133" fill="none" stroke="#e7d7ac" stroke-width="43"/>${beds}${keepsakes}${hive}${blooms}${bees}</svg>`;
}
