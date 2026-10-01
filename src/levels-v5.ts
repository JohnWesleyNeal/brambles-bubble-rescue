import { levels as previous, type LevelDefinition } from './levels-v3';
export { chapters, legacyLevels } from './levels-v3';
export type { Chapter, LevelDefinition } from './levels-v3';

// Frozen edition three reconstructs old attempts; new lessons have practice space.
export const campaignOrder = [1, 2, 9, 3, 4, 6, 5, 8, 7, 10, 11, 12, 15, 14, 23, 16, 17, 18, 19, 20, 21, 22, 13, 24, 25, 26, 27, 28, 29, 30];
const edits: Record<number, Partial<LevelDefinition>> = {
  1: { shots: 14, par: 3, tutorial: 'Drag to aim, then release. Your bubble counts as one of a matching three. Free the bees; you do not need to clear the whole board.', hint: 'Start with a matching group on either side. The landing circle shows where your bubble will settle.' },
  2: { name: 'A Little Change of Plan', shots: 13, par: 4, tutorial: 'Look at your current bubble and the smaller next bubble. Tap Swap to exchange them for free, as often as you like.', hint: 'Look for a reachable pair in either of your two colors. Swap costs no shots.' },
  3: { shots: 12, par: 3, tutorial: 'This picnic hangs from a narrow stem. Clear its connection to the ceiling and everything below falls. Falling bees are rescued too.', hint: 'Work toward the yellow stem above the picnic. A side-wall bounce can reach higher than a straight shot.', specials: [] },
  4: { name: 'Another Little Rescue', shots: 12, par: 4, tutorial: undefined, hint: 'Practice choosing between a direct match and dropping a support. Check both bubble colors before firing.' },
  5: { shots: 15, par: 7, tutorial: 'The golden pollen flower gives back two shots when popped or dropped. Try collecting it on your way to the bees.', hint: 'The pollen is below the main canopy. Clear its own color, or disconnect the branch above it.' },
  6: { shots: 15, par: 7 },
  7: { name: 'Bramble’s Gift Picnic', shots: 13, par: 6, tutorial: 'Fancy a little help? Rainbow bursts the color group it hits. Double Pop needs only a pair including your shot. Equip one beside the launcher; tap again to cancel. Gifts refills are always free.', hint: 'Try regular bubbles, or experiment with Rainbow and Double Pop. There is no need to save gifts for later.' },
  8: { shots: 12, par: 5, tutorial: 'Honeycomb cannot color-match. Clear its support to drop it. Bonk removes the exact tile you hit, including honeycomb; refill it free in Gifts.' },
  9: { name: 'Grow a Little Bloom', rows: ['RRROOOGGG', 'rrOOggBB', 'RRROOOGGG', 'PPPPYYYY', 'PPPBBYYYY', '..pBbY..'], seed: previous[5].seed, specials: [], shots: 15, par: 7, tutorial: 'From here, clearing 12 bubbles grows a free Bloom shot. Watch the flower beside the launcher. When ready, equip it to burst a colored bubble and its neighbors. It costs one shot and no gift stock.', hint: 'Grow Bloom by popping or dropping groups. When the flower is ready, use it on a crowded crossing of colors.' },
  10: { shots: 11, par: 5, tutorial: undefined },
  11: { shots: 12, par: 5 }, 12: { shots: 10, par: 4 },
  13: { shots: 10, par: 5, tutorial: undefined }, 14: { shots: 15, par: 9 },
  15: { name: 'Mabel Tries the Garden Gate', shots: 12, par: 6, tutorial: undefined, hint: 'Another route for Mabel. This time clear the dew shell along the dotted path. Bloom can open a crowded crossing.' },
  16: { shots: 12, par: 5, specials: [], tutorial: 'The marked strip tries to shift every two shots. Watch the countdown and arrow above the board. Open its next space, then see what loses its support.', hint: 'Watch the marked bottom strip. You have time to experiment before combining wind with other tricks.' },
  17: { shots: 9, par: 5 }, 18: { shots: 9, par: 4 },
  19: { shots: 11, par: 8, tutorial: 'Chameleon flowers switch between two colors after every shot. Match the color showing now; the small rim shows what comes next.', hint: 'Plan one shot ahead: the chameleon flower changes after your shot settles. Swapping does not advance it.' },
  20: { shots: 9, par: 6 }, 21: { shots: 8, par: 6 }, 22: { shots: 7, par: 5 },
  23: { name: 'The Last Hedge Window', shots: 7, par: 5, tutorial: undefined },
  24: { shots: 6, par: 4 }, 25: { shots: 5, par: 3 }, 26: { shots: 7, par: 5 },
  27: { shots: 5, par: 3 }, 28: { shots: 7, par: 5 }, 29: { shots: 6, par: 4 }, 30: { shots: 7, par: 5 }
};
export const levels: LevelDefinition[] = campaignOrder.map((source, index) => {
  const id = index + 1;
  const level: LevelDefinition = { ...previous[source - 1], ...edits[id], id, chapter: id <= 10 ? 'beginner' : id <= 20 ? 'intermediate' : 'hard' };
  // Upper rescue pockets keep the finale from ending after two side-support cuts.
  // Dew is already familiar; these bees reward planning a second approach.
  if (id === 18 || id >= 24) {
    level.rows = level.rows.map((row, i) => i === 0 ? row[0].toLowerCase() + row.slice(1, -1) + row.at(-1)!.toLowerCase() : row);
    level.specials = [...level.specials];
    for (const col of [0, 8]) if (!level.specials.some(t => t.row === 0 && t.col === col)) level.specials.push({ row: 0, col, kind: 'dew' });
    level.shots += id === 18 ? 2 : 4;
    level.par += id === 18 ? 2 : 4;
    level.hint += ' The two top-corner bees have dew shells: crack them, then return to rescue them.';
  }
  const finalePars: Record<number, number> = { 24: 10, 25: 9, 26: 9, 27: 9, 28: 9, 29: 12, 30: 11 };
  if (finalePars[id]) { level.par = finalePars[id]; level.shots = level.par + 2; }
  level.hint = level.hint.replace(/changing bloom|two-tone bloom|striped bloom|the bloom/gi, 'the chameleon flower');
  level.colors = [...new Set([...level.rows.join('').toUpperCase().replace(/\./g, ''), ...level.specials.flatMap(t => t.kind === 'bloom' ? [t.alternate] : [])])] as LevelDefinition['colors'];
  return level;
});
