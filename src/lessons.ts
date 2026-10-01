export interface Lesson { line: string; description: string; scene: string }

const circle = (x: number, y: number, color: string, animation = '') => `<circle cx="${x}" cy="${y}" r="14" fill="${color}" stroke="#fff7df" stroke-width="2">${animation}</circle>`;
const motion = (path: string, start = 0) => `<animateMotion path="${path}" dur="1.5s" begin="${start}s" fill="freeze"/>`;
const vanish = (start = 1.55) => `<animate attributeName="opacity" from="1" to="0" dur=".25s" begin="${start}s" fill="freeze"/>`;
const appear = (start = 1.55) => `<animate attributeName="opacity" from="0" to="1" dur=".3s" begin="${start}s" fill="freeze"/>`;
const shot = (color: string, path: string) => `<circle cx="0" cy="0" r="12" fill="${color}" stroke="#fff7df" stroke-width="2">${motion(path)}${vanish()}</circle>`;
const bee = (x: number, y: number, start = 1.6) => `<text x="${x}" y="${y}" font-size="20" opacity="0">🐝${appear(start)}</text>`;
const shell = (x: number, y: number) => `<circle cx="${x}" cy="${y}" r="14" fill="none" stroke="#c5f4ff" stroke-width="4">${vanish()}</circle>`;

const scenes: Record<string, string> = {
  match: `${circle(111, 53, '#f48b87', vanish())}${circle(143, 53, '#f48b87', vanish())}${shot('#f48b87', 'M127 137 L127 80')}${bee(178, 43)}`,
  swap: `${circle(85, 121, '#f48b87', `<animate attributeName="cx" from="85" to="177" dur=".7s" fill="freeze"/>`)}${circle(177, 121, '#91d6a4', `<animate attributeName="cx" from="177" to="85" dur=".7s" fill="freeze"/>`)}${circle(85, 62, '#91d6a4')}${circle(117, 62, '#91d6a4')}<path d="M116 118 Q130 91 145 118" fill="none" stroke="#fff7df" stroke-width="3" stroke-dasharray="4 4"/>`,
  drop: `${circle(128, 38, '#f48b87', vanish())}<g>${circle(112, 70, '#f4e982')}${circle(144, 70, '#89cbe9')}<text x="133" y="76" font-size="15">🐝</text><animateTransform attributeName="transform" type="translate" from="0 0" to="0 73" dur=".65s" begin="1.55s" fill="freeze"/></g>${shot('#f48b87', 'M128 137 L128 65')}`,
  pollen: `${circle(128, 56, '#f4e982', vanish())}<text x="120" y="63" font-size="18">✺${vanish()}</text>${shot('#f4e982', 'M128 137 L128 82')}<text x="179" y="45" font-size="22" fill="#fff9df" opacity="0">+2${appear()}</text>`,
  bank: `<path d="M90 137 L222 90 L158 54" fill="none" stroke="#fff7df" stroke-width="3" stroke-dasharray="5 6"/>${circle(158, 54, '#91d6a4', vanish())}${shot('#91d6a4', 'M90 137 L222 90 L158 54')}${bee(179, 51)}`,
  gifts: `${circle(96, 59, '#f48b87', vanish())}${circle(128, 59, '#f48b87', vanish())}${circle(160, 59, '#f48b87', vanish())}${shot('#d9aae9', 'M128 137 L128 83')}<text x="188" y="50" font-size="22" opacity="0">✦${appear()}</text>`,
  bonk: `<polygon points="128,37 144,46 144,64 128,73 112,64 112,46" fill="#d9aa64" stroke="#fff1bc" stroke-width="2">${vanish()}</polygon>${circle(160, 55, '#89cbe9')}${shell(160,55)}${shot('#e9c078', 'M128 137 L128 82')}<text x="119" y="59" font-size="24" fill="#fff7df" opacity="0">✦${appear()}</text>`,
  bloom: `${circle(96, 55, '#f48b87', vanish())}${circle(128, 55, '#91d6a4', vanish())}${circle(160, 55, '#89cbe9', vanish())}${shot('#f2bdd4', 'M128 137 L128 81')}<circle cx="128" cy="55" r="17" fill="none" stroke="#ffe1f0" stroke-width="3" opacity="0"><animate attributeName="r" from="17" to="56" dur=".55s" begin="1.5s" fill="freeze"/>${appear(1.5)}</circle>`,
  dew: `${circle(128, 55, '#89cbe9')}${shell(128,55)}${shot('#89cbe9', 'M128 137 L128 81')}<text x="181" y="52" font-size="20" opacity="0">❄${appear()}</text>`,
  flight: `<path d="M128 129 L128 28" stroke="#fff7df" stroke-width="3" stroke-dasharray="4 7"/>${circle(128, 72, '#f48b87', vanish())}${shot('#f48b87', 'M128 137 L128 98')}<text x="126" y="132" font-size="24">🐝${motion('M0 0 L0 -89', 1.65)}</text><text x="113" y="27" font-size="20">⌂</text>`,
  wind: `<rect x="76" y="48" width="108" height="38" rx="18" fill="#fff0b8" opacity=".38"/><g>${circle(94,67,'#f48b87')}${circle(130,67,'#91d6a4')}${circle(166,67,'#89cbe9')}<animateTransform attributeName="transform" type="translate" from="0 0" to="20 0" dur=".55s" begin="1.45s" fill="freeze"/></g><text x="182" y="103" font-size="22" fill="#fff7df">→</text>${shot('#f4e982', 'M128 137 L128 104')}`,
  bud: `<g>${circle(128,55,'#91d6a4')}${circle(128,55,'#f48b87', vanish())}<circle cx="135" cy="47" r="5" fill="#91d6a4" stroke="#fff7df" stroke-width="2">${vanish()}</circle><path d="M114 57 Q127 77 142 57" fill="none" stroke="#fff7df" stroke-width="2"/><text x="153" y="61" font-size="18" fill="#fff7df">◒</text></g>${circle(96,55,'#f48b87', vanish())}${shot('#f48b87', 'M128 137 L128 82')}<text x="88" y="24" font-size="12" fill="#fff7df">front → next</text>`,
  echo: `${circle(79,55,'#f48b87', vanish())}${circle(111,55,'#f48b87', vanish())}${[ [143,55], [175,55], [159,83] ].map(([x,y]) => `${circle(x,y,'#89cbe9', `<animate attributeName="fill" from="#89cbe9" to="#f48b87" dur=".25s" begin="1.55s" fill="freeze"/>${vanish(2.15)}`)}<text x="${x-7}" y="${y+6}" font-size="17" fill="#fff7df">❋${vanish(2.15)}</text>`).join('')}${shot('#f48b87', 'M95 137 L95 81')}<path d="M120 100 Q148 116 179 100" fill="none" stroke="#fff7df" stroke-width="2" stroke-dasharray="3 4"/><text x="99" y="25" font-size="12" fill="#fff7df">pop → echo → pop</text>`,
  chameleon: `${circle(128,55,'#91d6a4', `<animate attributeName="fill" from="#91d6a4" to="#c9a1dc" dur=".4s" begin="1.35s" fill="freeze"/>`)}<circle cx="128" cy="55" r="11" fill="none" stroke="#c9a1dc" stroke-width="3"/><text x="182" y="59" font-size="22" fill="#fff7df">↻</text>${shot('#f4e982', 'M128 137 L128 99')}`
};

const lessons: Record<number, Omit<Lesson, 'scene'> & { kind: keyof typeof scenes }> = {
  1: { kind: 'match', line: 'Match three. Free every bee.', description: 'A shot joins two matching bubbles; the group pops and frees a bee.' },
  2: { kind: 'swap', line: 'Tap Swap to use the next color.', description: 'The current and next bubbles exchange places without using a shot.' },
  3: { kind: 'drop', line: 'Clear a support. Everything below falls.', description: 'A matching shot pops a support and the hanging bubbles fall.' },
  5: { kind: 'pollen', line: 'Golden pollen gives two shots back.', description: 'Cleared pollen adds two shots to the counter.' },
  6: { kind: 'bank', line: 'Bounce shots off the side walls.', description: 'The shot bounces off a wall to reach a hidden group.' },
  7: { kind: 'gifts', line: 'Gifts give your shot a special effect.', description: 'Rainbow Pop clears the color group it touches.' },
  8: { kind: 'bonk', line: 'Bonk smashes one tile and cracks nearby dew.', description: 'Bonk removes honeycomb on impact and cracks an adjacent dew shell.' },
  9: { kind: 'bloom', line: 'Clear 12 bubbles to earn a Bloom burst.', description: 'Bloom bursts its target and the colored bubbles beside it.' },
  11: { kind: 'dew', line: 'Crack dew first. Then clear the bubble.', description: 'The first hit removes a dew shell and leaves the bubble underneath.' },
  14: { kind: 'flight', line: 'Clear Mabel’s dotted route home.', description: 'Mabel flies along the open route after a blocking bubble clears.' },
  16: { kind: 'wind', line: 'The marked strip shifts every two shots.', description: 'After two shots the highlighted strip moves toward its arrow.' },
  31: { kind: 'bud', line: 'Match the front. Reveal the fixed next color.', description: 'The red front of a Two-tone bud opens after a matching clear, revealing the green color shown on its small inner petal. The bee stays until the next clear or drop.' },
  41: { kind: 'echo', line: 'Pop beside Echo petals to lend them your color.', description: 'A neighboring red match turns a touching Echo cluster red. Three connected red petals then pop in the same shot.' },
  19: { kind: 'chameleon', line: 'Chameleon flowers change color each shot.', description: 'The flower changes from green to purple after a shot.' }
};

export function lessonFor(levelId: number): Lesson | undefined {
  const lesson = lessons[levelId];
  return lesson ? { line: lesson.line, description: lesson.description, scene: scenes[lesson.kind] } : undefined;
}

export function bossLesson(phase: number): Lesson {
  const parts = [
    { line: 'Crack both clasps, then free their bees.', description: 'A shot cracks a clasp shell before its bee can be freed.', scene: scenes.dew },
    { line: 'The screen tries to shift every two shots. Bonk stalls it.', description: 'Monty tries to move his screen after two shots; Bonk can stall its next move.', scene: scenes.wind },
    { line: 'Open Mabel’s route as the gate changes color.', description: 'Monty changes the gate color after each shot while Mabel waits for a clear route.', scene: scenes.chameleon }
  ];
  return parts[Math.max(0, Math.min(2, phase))];
}

export function lessonDemo(lesson: Lesson, reducedMotion: boolean): string {
  const scene = reducedMotion ? lesson.scene.replace(/<animate(?:Motion|Transform)?\b[^>]*\/>|<animate(?:Motion|Transform)?\b[^>]*><\/animate(?:Motion|Transform)?>/g, '').replace(/<circle cx="0" cy="0" r="12"/g, '<circle cx="128" cy="118" r="12"') : lesson.scene;
  return `<svg class="lesson-demo" viewBox="0 0 260 150" role="img" aria-label="${lesson.description}"><rect x="2" y="2" width="256" height="146" rx="22" fill="#306b63"/><path d="M24 20 H236" stroke="#d6f4dc" stroke-width="3" opacity=".6"/>${reducedMotion ? '<path d="M128 112 V83" stroke="#fff7df" stroke-width="2" stroke-dasharray="4 5"/>' : ''}${scene}</svg>`;
}
