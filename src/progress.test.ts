import { describe, expect, it } from 'vitest';
import { consumeBooster, loadSave, migrateSave, recordLoss, recordMastery, recordWin, refillGifts, gardenProgress, legacySaveKey, previousSaveKey, saveKey, storeSave, v3SaveKey } from './progress';
import { friends, friendsCards, styleChoices } from './friends';
import { gardenArt } from './garden';
import { levels } from './levels';
import { exportJourney, importJourney } from './save-management';

describe('saved journey', () => {
  it('retains all six published stars and opens level seven', () => {
    const save = migrateSave({ version: 1, unlocked: 6, stars: [3, 2, 3, 1, 2, 3], muted: true });
    expect(save.stars.slice(0, 6)).toEqual([3, 2, 3, 1, 2, 3]);
    expect(save.unlocked).toBe(7);
    expect(save.muted).toBe(true);
    recordWin(save, 6, 2);
    expect(save.unlocked).toBe(8);
  });

  it('offers help after the second loss without resetting progress', () => {
    const save = migrateSave(null);
    recordLoss(save, 11);
    recordLoss(save, 11);
    expect(save.failures[11]).toBe(2);
    expect(save.unlocked).toBe(1);
  });

  it('migrates a v2 journey with stars and failures intact', () => {
    const save = migrateSave({ version: 2, unlocked: 16, stars: Array(15).fill(2), failures: [0, 3], tutorialsSeen: ['6'], muted: true });
    expect(save.version).toBe(4);
    expect(save.unlocked).toBe(16);
    expect(save.stars[14]).toBe(2);
    expect(save.failures[1]).toBe(3);
    expect(save.tutorialsSeen).toEqual(['6']);
    expect(save.inventory).toEqual({ rainbow: 1, double: 1, bonk: 1 });
    expect(save.hearts).toBe(0);
  });

  it('gifts only first clears and refills unlocked stock without lowering larger counts', () => {
    const save = migrateSave(null);
    recordWin(save, 0, 2);
    expect(save.inventory).toEqual({ rainbow: 2, double: 1, bonk: 1 });
    recordWin(save, 0, 3);
    expect(save.inventory.rainbow).toBe(2);
    expect(consumeBooster(save, 'rainbow')).toBe(true);
    refillGifts(save);
    expect(save.inventory).toEqual({ rainbow: 3, double: 1, bonk: 1 });
    save.unlocked = 8; save.inventory.rainbow = 10;
    refillGifts(save);
    expect(save.inventory).toEqual({ rainbow: 10, double: 3, bonk: 3 });
    save.inventory.bonk = 0;
    expect(consumeBooster(save, 'bonk')).toBe(false);
  });

  it('converts v3 hearts exactly once and preserves muted audio preferences', () => {
    const save = migrateSave({ version: 3, hearts: 10, inventory: { rainbow: 2, double: 4, bonk: 5 }, muted: true });
    expect(save.inventory).toEqual({ rainbow: 6, double: 4, bonk: 5 });
    expect(save.musicVolume).toBe(0); expect(save.effectsVolume).toBe(0);
    expect(migrateSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });

  it('derives unique garden rewards from clears, not stars or replays', () => {
    expect(gardenProgress([])).toEqual({ flowers: 0, decorations: 0, hive: 0, bees: 0 });
    expect(gardenProgress(Array(10).fill(1))).toEqual({ flowers: 10, decorations: 2, hive: 1, bees: 8 });
    expect(gardenProgress(Array(30).fill(3))).toEqual({ flowers: 30, decorations: 6, hive: 3, bees: 8 });
    expect(gardenProgress([0, ...Array(9).fill(3), 1]).hive).toBe(0);
    const sparse: number[] = []; sparse[9] = 3;
    expect(gardenProgress(sparse).hive).toBe(0);
  });

  it('retains a paused attempt alongside existing v3 stars and inventory', () => {
    const saved = migrateSave({
      version: 3, unlocked: 2, stars: [3], hearts: 9,
      inventory: { rainbow: 2, double: 1, bonk: 1 },
      activeRun: { version: 1, levelId: 2, actions: [{ type: 'swap' }] }
    });
    expect(saved.stars[0]).toBe(3);
    expect(saved.inventory.rainbow).toBe(5);
    expect(saved.activeRun?.actions).toEqual([{ type: 'swap' }]);
  });
});

describe('additive 100-meadow progression', () => {
  it.each([1, 2, 3, 4])('opens meadow 31 from a completed v%i campaign without replaying its rewards', (version) => {
    const stars = Array.from({ length: 30 }, (_, i) => 1 + i % 3);
    const save = migrateSave({ version, unlocked: 30, stars, hearts: version === 3 ? 7 : 0,
      convertedHearts: version === 4 ? 7 : 0, inventory: { rainbow: 9, double: 12, bonk: 15 },
      failures: [0, 2], tutorialsSeen: ['swap', 'garden'], gardenStyle: 'twilight' });
    expect(levels).toHaveLength(100);
    expect(save.version).toBe(4);
    expect(save.unlocked).toBe(31);
    expect(save.stars).toEqual(stars);
    expect(save.stars[30]).toBeUndefined();
    expect(save.inventory).toEqual(version < 3 ? { rainbow: 1, double: 1, bonk: 1 }
      : { rainbow: version === 3 ? 12 : 9, double: 12, bonk: 15 });
    expect(save.failures).toEqual(version === 1 ? [] : [0, 2]);
    expect(save.tutorialsSeen).toEqual(version === 1 ? [] : ['swap', 'garden']);
    const stock = { ...save.inventory };
    recordWin(save, 29, 3);
    expect(save.inventory).toEqual(stock);
    expect(gardenProgress(save.stars)).toEqual({ flowers: 30, decorations: 6, hive: 3, bees: 8 });
    recordWin(save, 30, 2);
    expect(save.unlocked).toBe(32);
    expect(save.inventory).toEqual({ rainbow: stock.rainbow + 1, double: stock.double + 1, bonk: stock.bonk + 1 });
    expect(migrateSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });

  it.each([legacySaveKey, previousSaveKey, v3SaveKey, saveKey])('loads the completed campaign from %s and retains the v4 save key', (key) => {
    const version = [legacySaveKey, previousSaveKey, v3SaveKey, saveKey].indexOf(key) + 1;
    const data = { version, stars: Array(30).fill(3), unlocked: 30 };
    const stored = new Map([[key, JSON.stringify(data)]]);
    const disk = { getItem: (item: string) => stored.get(item) ?? null, setItem: (item: string, value: string) => { stored.set(item, value); } };
    const save = loadSave(disk);
    expect(save.unlocked).toBe(31);
    expect(storeSave(save, disk)).toBe(true);
    expect(saveKey).toBe('bramble-bubbles-save-v4');
    expect(loadSave(disk)).toEqual(save);
  });

  it('retains all 100 stars, failures, keepsakes and both journeys without a save version bump', () => {
    const stars = Array.from({ length: 100 }, (_, i) => 1 + i % 3);
    const failures = Array.from({ length: 100 }, (_, i) => i % 4);
    const records = Array.from({ length: 100 }, (_, i) => ({ best: 5 + i, unaided: i % 2 === 0, cascade: true, bank: i % 3 === 0 }));
    const activeRun = { version: 5, levelId: 30, actions: [{ type: 'swap' }] };
    const activeSideRun = { version: 5, levelId: 20, activity: { kind: 'boss', phase: 1, rematch: false }, actions: [] };
    const save = migrateSave({ version: 4, gardenName: 'Honey & home', savedAt: 1234, unlocked: 100,
      stars, failures, records, tutorialsSeen: ['5', '30', '100'], muted: false, musicVolume: .18, effectsVolume: .46,
      convertedHearts: 10, inventory: { rainbow: 52, double: 41, bonk: 33 }, gardenStyle: 'rose',
      medals: ['paw-picnic', 'bend-home'], bossCleared: true, rematchCleared: true, bossCheckpoint: 2, rematchCheckpoint: 1,
      previousJourney: { version: 4, stars: Array(30).fill(2), unlocked: 30, activeRun, activeSideRun,
        inventory: { rainbow: 4, double: 5, bonk: 6 }, gardenStyle: 'twilight' } });
    expect(save.stars).toEqual(stars);
    expect(save.failures).toEqual(failures);
    expect(save.records).toEqual(records);
    expect(save).toMatchObject({ version: 4, unlocked: 100, gardenName: 'Honey & home', savedAt: 1234,
      convertedHearts: 10, inventory: { rainbow: 52, double: 41, bonk: 33 }, gardenStyle: 'rose',
      medals: ['paw-picnic', 'bend-home'], bossCleared: true, rematchCleared: true, bossCheckpoint: 2, rematchCheckpoint: 1 });
    expect(save.previousJourney).toMatchObject({ unlocked: 31, stars: Array(30).fill(2), activeRun, activeSideRun,
      inventory: { rainbow: 4, double: 5, bonk: 6 }, gardenStyle: 'twilight' });
    const restored = importJourney(exportJourney(save));
    expect(restored.stars).toEqual(stars);
    expect(restored.failures).toEqual(failures);
    expect(restored.records).toEqual(records);
    expect(migrateSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });

  it('bounds imported arrays at the expanded campaign instead of the original 30 meadows', () => {
    const save = migrateSave({ version: 4, unlocked: 500, stars: Array(110).fill(3), failures: Array(110).fill(2),
      records: Array(110).fill({ best: 7, unaided: true, cascade: false, bank: true }) });
    expect(save.unlocked).toBe(100);
    expect(save.stars).toHaveLength(100);
    expect(save.failures).toHaveLength(100);
    expect(save.records).toHaveLength(100);
    expect(save.records[99]).toEqual({ best: 7, unaided: true, cascade: false, bank: true });
  });

  it('plays through all 100 clear rewards without duplicate gifts after a reload or replay', () => {
    let save = migrateSave(null);
    for (let index = 0; index < levels.length; index += 1) {
      recordWin(save, index, 1);
      save = migrateSave(JSON.parse(JSON.stringify(save)));
      expect(save.unlocked).toBe(Math.min(100, index + 2));
    }
    expect(save.inventory).toEqual({ rainbow: 101, double: 98, bonk: 95 });
    for (let index = 0; index < levels.length; index += 1) recordWin(save, index, 3);
    expect(save.inventory).toEqual({ rainbow: 101, double: 98, bonk: 95 });
    expect(gardenProgress(save.stars)).toEqual({ flowers: 100, decorations: 20, hive: 10, bees: 8 });
  });

  it('records the last meadow, keeps best stars and gifts its first clear only', () => {
    const save = migrateSave({ version: 4, unlocked: 100, stars: Array(99).fill(2),
      inventory: { rainbow: 1, double: 2, bonk: 3 } });
    recordLoss(save, 99);
    recordWin(save, 99, 2);
    recordMastery(save, 99, { turns: 10, usedHelp: false, largestDrop: 8, bankRescue: true });
    expect(save.unlocked).toBe(100);
    expect(save.failures[99]).toBe(1);
    expect(save.inventory).toEqual({ rainbow: 2, double: 3, bonk: 4 });
    recordWin(save, 99, 1);
    expect(save.stars[99]).toBe(2);
    recordWin(save, 99, 3);
    expect(save.inventory).toEqual({ rainbow: 2, double: 3, bonk: 4 });
    const restored = importJourney(exportJourney(save));
    expect(restored.stars[99]).toBe(3);
    expect(restored.records[99]).toEqual({ best: 10, unaided: true, cascade: true, bank: true });
    expect(gardenProgress(restored.stars)).toEqual({ flowers: 100, decorations: 20, hive: 10, bees: 8 });
  });

  it('fills earlier sparse counts for portable backups while retaining the absent unplayed tail', () => {
    const save = migrateSave({ version: 4, unlocked: 100 });
    save.stars[20] = 2;
    save.failures[20] = 3;
    recordWin(save, 30, 1);
    recordLoss(save, 30);
    expect(save.stars).toHaveLength(31);
    expect(save.failures).toHaveLength(31);
    expect(save.stars.slice(0, 20)).toEqual(Array(20).fill(0));
    expect(save.failures.slice(0, 20)).toEqual(Array(20).fill(0));
    expect(save.stars[20]).toBe(2);
    expect(save.failures[20]).toBe(3);
    expect(save.stars[99]).toBeUndefined();
    expect(save.failures[99]).toBeUndefined();
    expect(importJourney(exportJourney(save))).toEqual(save);
  });

  it('preserves the original friend and palette unlocks at 5, 10, 20 and 30 clears', () => {
    expect(friends.map((friend) => friend.clears)).toEqual([5, 10, 20, 30]);
    for (const threshold of [5, 10, 20, 30]) {
      const friend = friends.find((item) => item.clears === threshold)!;
      expect(friendsCards(Array(threshold - 1).fill(1))).not.toContain(`<strong>${friend.name}</strong>`);
      expect(friendsCards(Array(threshold).fill(1))).toContain(`<strong>${friend.name}</strong>`);
    }
    const save = migrateSave({ version: 4, stars: Array(100).fill(1), unlocked: 100 });
    expect(styleChoices(save)).not.toContain('disabled');
    for (const friend of friends) expect(friendsCards(save.stars)).toContain(`<strong>${friend.name}</strong>`);
  });

  it('derives the expanded garden from unique campaign clears, including sparse later chapters', () => {
    expect(gardenProgress(Array(40).fill(1))).toEqual({ flowers: 40, decorations: 8, hive: 4, bees: 8 });
    expect(gardenProgress(Array(100).fill(3))).toEqual({ flowers: 100, decorations: 20, hive: 10, bees: 8 });
    expect(gardenProgress(Array(120).fill(3))).toEqual({ flowers: 100, decorations: 20, hive: 10, bees: 8 });
    const sparse = Array(100).fill(0); sparse.fill(2, 90, 100);
    expect(gardenProgress(sparse)).toEqual({ flowers: 10, decorations: 2, hive: 1, bees: 8 });
    sparse[95] = 0;
    expect(gardenProgress(sparse)).toEqual({ flowers: 9, decorations: 1, hive: 0, bees: 8 });
  });
});

describe('expanded garden art', () => {
  const flowerPositions = (art: string) => [...art.matchAll(/class="garden-flower" transform="translate\((\d+) (\d+)\)"/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));

  it('keeps all original flowers and six keepsakes when new beds appear', () => {
    const original = gardenArt(Array(30).fill(1));
    const expanded = gardenArt(Array(100).fill(1));
    expect(original).toContain('viewBox="0 0 340 395"');
    expect(original).not.toContain('class="garden-bed"');
    expect(flowerPositions(expanded).slice(0, 30)).toEqual(flowerPositions(original));
    const originalKeepsakes = [...original.matchAll(/<g class="garden-decoration">(.*?)<\/g><\/g>/g)].map((match) => match[0]);
    expect(originalKeepsakes).toHaveLength(6);
    for (const keepsake of originalKeepsakes) expect(expanded).toContain(keepsake);
  });

  it.each([0, 1, 5, 10, 20, 30, 31, 35, 40, 60, 90, 99, 100])('shows every earned object at %i clears inside its expanded canvas', (clears) => {
    const art = gardenArt(Array(clears).fill(3));
    const height = Number(art.match(/viewBox="0 0 340 (\d+)"/)![1]);
    const flowers = flowerPositions(art);
    expect(flowers).toHaveLength(clears);
    expect((art.match(/class="garden-decoration"/g) ?? [])).toHaveLength(Math.floor(clears / 5));
    expect((art.match(/class="garden-bee"/g) ?? [])).toHaveLength(Math.min(8, clears));
    expect((art.match(/class="garden-hive-charm"/g) ?? [])).toHaveLength(Math.max(0, Math.floor(clears / 10) - 3));
    for (const flower of flowers) {
      expect(flower.x - 15).toBeGreaterThanOrEqual(0);
      expect(flower.x + 15).toBeLessThanOrEqual(340);
      expect(flower.y - 15).toBeGreaterThanOrEqual(0);
      expect(flower.y + 22).toBeLessThan(height);
    }
    expect(art).not.toMatch(/undefined|NaN/);
    if (clears > 30) expect(art).toContain('style="max-height:none"');
  });

  it.each(['meadow', 'rose', 'twilight'])('keeps a valid hive palette in the full %s garden', (style) => {
    const art = gardenArt(Array(100).fill(1), style);
    expect(art).toContain('100 flowers, 20 decorations, 10 hive improvements and 8 bees');
    expect(art).toContain('fill="#f1ce86"');
    expect(art).not.toMatch(/fill="(?:undefined|NaN)"/);
  });
});
