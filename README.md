# Bramble's Bubble Rescue

A small, original bubble shooter made as a gift. Rescue Bramble's bee friends across 30 levels in three chapters: **Meadow Days** (beginner), **Honeycomb Grove** (intermediate), and **Breezy Brambles** (hard). Built with Phaser, TypeScript, and Vite; playable with touch or a mouse.

## How to play

Drag inside the play area to aim, then release to shoot. Match at least three bubbles of the same color or clear a support to drop the bubbles below it. Free every bee to finish a level. **Swap** exchanges the current and next bubbles; **Hint** gives a level-specific suggestion. Tap **Rules** at any time for the full field guide, or choose **Inspect bubbles** there and tap a bubble on the board. Tapping a special bubble label above the board opens its rule directly. Closing either view resumes the same attempt.

The **pause** button keeps the current board, queue, remaining shots, and equipped power-up. From there you can resume, restart, read Rules, open Gifts, change sound, or return to the meadows. The home screen offers **Resume** after leaving or reopening the app. Starting another level replaces a saved attempt only after a confirmation. A winning shot saves its clear immediately, even if the app closes during the celebration.

New mechanics now arrive from the first meadow: hanging drops at level 3, pollen at 4, banks at 6, honeycomb at 8, dew at 11, wind at 16, and changing blooms at 19. Later boards have deeper bee targets, more mixed mechanics, and tighter shot budgets. Each chapter has its own board palette, and shots now call out bee rescues, pollen refunds, cracked dew, and chain drops. Every level has a recorded winning route using regular bubbles alone.

## A little more cosy

**Rainbow Pop** fires a multicolored bubble and bursts the connected color group it hits, even a single bubble. The aim guide highlights that group. Dew cracks instead of being directly destroyed, honeycomb blocks the shot, and empty targets cannot consume it. **Double Pop** clears a pair of the current color; **Bonk** removes the first tile it hits. The three buttons beside the launcher show your stock and equipped state. Tap an equipped gift again to cancel it. Each gift spends one regular shot and one stock only on firing.

**Bramble’s Very Serious Emporium**, opened through Gifts, provides free help with a suitably unserious proprietor. First clears award one of every unlocked gift; the free refill raises each unlocked stock to at least three without reducing larger inventories. Existing stock carries forward, and old Honey Hearts convert once into Rainbow Pops at three hearts per bubble, rounded up. The free chosen-color retry assist remains separate.

When bubbles run out, **Five more bubbles** keeps the board intact and adds five shots, as often as needed. Stars still count every shot taken. An overflowing board offers a retry. There are no timers, lives, payments, or daily obligations.

Rescued bees flutter toward the hive counter; their progress saves immediately, before the celebration. Shots have a tinted landing guide, recoil, impact squash, staggered pops, and cascading drops. Special bubbles have distinct artwork: pollen flowers, glassy dew shells, faceted honeycomb, and blooms with a next-color rim. Rainbow, Double Pop, and Bonk have distinct trails and impact rings; pollen flies toward the shot counter and dew sheds small shell fragments. Particle bursts are capped per shot. Wind and changing blooms animate their transitions. System reduced-motion preferences suppress decorative movement.

**Bee Garden**, available from home and results, grows automatically: each unique cleared meadow adds a flower, every five clears adds a decoration, and each completed ten-level chapter improves the hive. Existing clears grow the garden too; replaying cannot duplicate rewards. At most eight garden bees animate at once.

**Sound** has separate remembered music and effects volumes. Music begins only after interaction and pauses when the app is hidden. The bundled soundtrack, *Sunset Walk* by KiluaBoy, is shared under CC0; see `public/audio/CREDITS.txt` and the in-game credit. Music works offline after the first complete cache download.

Save version 4 migrates previous journeys and now includes garden colors and optional keepsakes. New attempts use run version 3, with earned Bloom and flight-path objectives. Run versions 1 and 2 reconstruct their frozen layouts from `legacyLevels`; version 2 supports the Rainbow burst and top-up action. Existing version-1 attempts keep their original rules (including chosen-color Rainbow and shot-limit losses) until completed or restarted, so replaying their saved actions restores the same board and queue.

## My Garden and backups

Open **My Garden** from home or **My Garden & saves** while paused. Name the garden, see stars and unlocked gifts, visit the bee garden, or replay unlocked meadows without resetting progress.

**Download backup** saves the current journey as a JSON file, including an unfinished meadow. **Restore a backup** validates the file and previews its progress before confirmation. Files are local copies, not cloud accounts.

**Start a fresh journey** returns to level one while keeping the name and sound settings. The current journey becomes a recoverable **previous journey** in the same atomic save. Returning to it swaps the two journeys, including any paused board. Only one recovery slot is kept; another reset or restore replaces that slot. Download a backup of any journey you want to keep longer. The game leaves both journeys unchanged if it cannot persist a replacement.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Run `npm test` for board rules, boosters, save migration, paused-run restoration, and a winning physics replay of every level. Run `npm run build` for the production site. For the Pages path, use `npm run build:pages` and `npm run preview:pages`. Tests include all 30 regular-shot winning routes, Rainbow protection/drop rules, top-ups, legacy run replay, migration, garden milestones, and audio lifecycle. Phone listening and personal game-feel acceptance still need human review.

## Personalise the gift

Edit the title-card and ending messages in `src/content.ts`. Level layouts, bee targets, hints, shot budgets, and mechanic introductions are in `src/levels.ts`.
The original SVG art is in `public/`; run `npm run art` after editing it to regenerate the PNG game textures and icons.

## Share it

The repository's GitHub Actions workflow publishes the game to GitHub Pages on pushes to `main` using `npm run build:pages`. Once published, send the Pages link. On Android Chrome, open the link, use the three-dot menu, then tap **Add to Home screen** or **Install app**. Progress and the current attempt are saved locally on that phone; existing stars, unlocked levels, failures, tutorials, and sound preference carry forward. New journeys start with one of each power-up, usable as it unlocks. After the first visit, the game can launch offline.

Characters, illustrations, and synthesized sound effects are original. The third-party soundtrack is credited above and in `public/audio/CREDITS.txt`.

## A little more discovery

Six refreshed meadows (7, 9, 12, 14, 18 and 23) introduce split branches, a hanging picnic, hedge windows, an ivy cup and two guided flight paths. The 30-level journey and existing stars are retained. Levels 14 and 23 ask you to clear a route home for Mabel; the route advances after shots, and the rescue saves before her arrival animation finishes.

From level 7 in new attempts, clearing 12 bubbles grows an earned **Bloom shot**. It clears a colored impact and its colored neighbors, cracks dew, and leaves honeycomb intact. It costs one regular shot, uses no gift stock, can be canceled freely, and cannot recharge itself. The meter caps at one ready Bloom.

Mabel, Sir Buzzby, Clover and Pip move into the garden after 5, 10, 20 and 30 unique clears. They have little biographies and distinctive hats. Garden palettes unlock at 5 and 10 clears; switch freely in the garden or Emporium. All rewards derive from permanent progress.

Optional keepsakes remember Garden craft (no gifts, retry assist or top-ups; earned Bloom is allowed), Lovely cascade (8 bubbles dropped in one shot), and Around the bend (a bank shot freeing a bubbled bee). Best shot counts and keepsakes survive replays and backups, independently of stars. Older clears retain their stars without inventing mastery records.

Validation includes normal-shot winning routes for all 30 current levels and all 30 frozen legacy levels, both old Rainbow replay versions, Bloom protection/charge/cancel behavior, flight-path persistence and final-shot victory, reward migration and backup round trips.
