# Bramble's Bubble Rescue

A small, original bubble shooter made as a gift. Rescue Bramble's bee friends across **100 levels in ten woodland chapters**. The original Meadow Days, Honeycomb Grove and Breezy Brambles continue into Rosewood Rise, Echo Glen, Braided Brook, Lantern Wood, High Canopy, Starlit Orchard and Homecoming Hollow. Built with Phaser, TypeScript, and Vite; playable with touch or a mouse.

## How to play

Drag inside the play area to aim, then release to shoot. Match at least three bubbles of the same color or clear a support to drop the bubbles below it. Free every bee to finish a level. **Swap** exchanges the current and next bubbles; **Hint** gives a level-specific suggestion. Tap **Rules** at any time for the full field guide, or choose **Inspect bubbles** there and tap a bubble on the board. Tapping a special bubble label above the board opens its rule directly. Closing either view resumes the same attempt.

The **pause** button keeps the current board, queue, remaining shots, and equipped power-up. From there you can resume, restart, read Rules, open Gifts, change sound, or return to the meadows. The home screen offers **Resume** after leaving or reopening the app. Starting another level replaces a saved attempt only after a confirmation. A winning shot saves its clear immediately, even if the app closes during the celebration.

The revised campaign teaches swapping at 2, drops at 3 with practice at 4, pollen at 5, banks at 6, gifts at 7, honeycomb at 8, earned Bloom at 9, dew at 11, Mabel at 14 with immediate practice at 15, wind at 16, and chameleon flowers at 19. The first wind board has no dew shell; late levels add protected top-corner bee pockets that require a return visit. Later boards have deeper bee targets, more mixed mechanics, and tighter shot budgets. Each chapter has its own board palette, and shots now call out bee rescues, pollen refunds, cracked dew, and chain drops. Every level has a recorded winning route using regular bubbles alone. The original first 30 boards, seeds, star targets and shot allowances remain unchanged. Two-tone buds arrive at 31 with immediate practice at 32; Echo petals arrive at 41 with practice at 42. They meet in Braided Brook after their separate practice chapters, then join familiar tricks through the later woodland paths.

## A little more cosy

**Rainbow Pop** bursts the connected color group it hits. **Double Pop** clears a pair of the current color. **Bonk** removes its target, including honeycomb, and cracks adjacent dew on new attempts. **Two-tone buds** show a fixed current and next color: match the front to reveal the second layer, then clear it to free its bee. They never cycle automatically. Earned Bloom also opens one layer, while Bonk removes the whole bud. **Echo petals** borrow the color of a neighboring pop across their touching cluster; a resulting three-match clears immediately and may start a follow-on chain. Each Echo changes once, then becomes ordinary. The buttons beside the launcher show stock and equipped state. Tap again to cancel. Gifts spend one shot and one stock only when fired.

**Bramble’s Very Serious Emporium**, opened through Gifts, provides free help with a suitably unserious proprietor. First clears award one of every unlocked gift; the free refill raises each unlocked stock to at least three without reducing larger inventories. Existing stock carries forward, and old Honey Hearts convert once into Rainbow Pops at three hearts per bubble, rounded up. The free chosen-color retry assist remains separate.

When bubbles run out, **Five more bubbles** keeps the board intact and adds five shots, as often as needed. Stars still count every shot taken. An overflowing board offers a retry. There are no timers, lives, payments, or daily obligations.

Rescued bees flutter toward the hive counter; their progress saves immediately, before the celebration. Shots have a tinted landing guide, recoil, impact squash, staggered pops, and cascading drops. Special bubbles have distinct artwork: pollen flowers, glassy dew shells, faceted honeycomb, chameleon flowers, fixed next-color bud petals and Echo ripples. Rainbow, Double Pop, and Bonk have distinct trails and impact rings; pollen flies toward the shot counter and dew sheds small shell fragments. Particle bursts are capped per shot. Wind and changing blooms animate their transitions. System reduced-motion preferences suppress decorative movement.

**Bee Garden**, available from home and results, grows automatically: each unique cleared meadow adds a flower, every five clears adds a decoration, and each completed ten-level chapter improves the hive. Existing clears grow the garden too; replaying cannot duplicate rewards. The original 30-flower garden and six decorations remain, with later flowerbeds, keepsakes and hive charms growing through all 100 rescues. At most eight garden bees animate at once.

**Sound** has separate remembered music and effects volumes. Music begins only after interaction and pauses when the app is hidden. The bundled soundtrack, *Sunset Walk* by KiluaBoy, is shared under CC0; see `public/audio/CREDITS.txt` and the in-game credit. Music works offline after the first complete cache download.

Save format 4 retains previous journeys. New attempts use run edition 6, which adds fixed two-layer buds and deterministic Echo chains while retaining precise bubble collision, Bonk's dew shock and revised boss phases. Run editions 1–5 retain their original collision and layouts when their recorded actions replay. An unfinished attempt keeps its rules until completed or restarted.

## My Garden and backups

Open **My Garden** from home or **My Garden & saves** while paused. Name the garden, see stars and unlocked gifts, visit the bee garden, or replay unlocked meadows without resetting progress.

**Download backup** saves the current journey as a JSON file, including an unfinished meadow. **Restore a backup** validates the file and previews its progress before confirmation. Files are local copies, not cloud accounts.

**Start a fresh journey** returns to level one while keeping the name and sound settings. The current journey becomes a recoverable **previous journey** in the same atomic save. Returning to it swaps the two journeys, including any paused board. Only one recovery slot is kept; another reset or restore replaces that slot. Download a backup of any journey you want to keep longer. The game leaves both journeys unchanged if it cannot persist a replacement.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Run `npm test` for board rules, boosters, save migration, paused-run restoration, and a winning physics replay of every level. Run `npm run build` for the production site. For the Pages path, use `npm run build:pages` and `npm run preview:pages`. Tests include all 100 regular-shot winning routes, retained edition-4/5 routes for the original 30, Rainbow protection/drop rules, top-ups, legacy run replay, migration, garden milestones, and audio lifecycle. Phone listening and personal game-feel acceptance still need human review.

## Personalise the gift

Edit the title-card and ending messages in `src/content.ts`. Level layouts, bee targets, hints, shot budgets, and mechanic introductions are in `src/levels.ts`.
The original SVG art is in `public/`; run `npm run art` after editing it to regenerate the PNG game textures and icons.

## Share it

The repository's GitHub Actions workflow publishes the game to GitHub Pages on pushes to `main` using `npm run build:pages`. Once published, send the Pages link. On Android Chrome, open the link, use the three-dot menu, then tap **Add to Home screen** or **Install app**. Progress and the current attempt are saved locally on that phone; existing stars, unlocked levels, failures, tutorials, and sound preference carry forward. New journeys start with one of each power-up, usable as it unlocks. After the first visit, the game can launch offline.

Characters, illustrations, and synthesized sound effects are original. The third-party soundtrack is credited above and in `public/audio/CREDITS.txt`.

## A little more discovery

The campaign’s refreshed meadows include a hanging picnic, hedge windows, an ivy cup and two guided flight paths. The original 30-level journey and existing stars are retained, with 70 new meadows appended. Levels 14 and 15 ask you to clear a route home for Mabel; the route advances after shots, and the rescue saves before her arrival animation finishes.

From level 9 in new attempts, clearing 12 bubbles grows an earned **Bloom shot**. It clears a colored impact and its colored neighbors, cracks dew, and leaves honeycomb intact. It costs one regular shot, uses no gift stock, can be canceled freely, and cannot recharge itself. The meter caps at one ready Bloom.

Mabel, Sir Buzzby, Clover and Pip move into the garden after 5, 10, 20 and 30 unique clears. They have little biographies and distinctive hats. Garden palettes unlock at 5 and 10 clears; switch freely in the garden or Emporium. All rewards derive from permanent progress.

Optional keepsakes remember Garden craft (no gifts, retry assist or top-ups; earned Bloom is allowed), Lovely cascade (8 bubbles dropped in one shot), and Around the bend (a bank shot freeing a bubbled bee). Best shot counts and keepsakes survive replays and backups, independently of stars. Older clears retain their stars without inventing mastery records.

Validation includes normal-shot winning routes for all 100 current levels, the original edition-4/5 boards and all 30 frozen legacy levels, both old Rainbow replay versions, Bloom protection/charge/cancel behavior, flight-path persistence and final-shot victory, reward migration and backup round trips.

## Campaign polish edition

Normal aim previews ring bubbles that will match and shells that will crack. A short coaching line calls attention to Swap, drops, banks, wind timing and a ready Bloom. The three-star target and shots taken remain visible during play. **Hint → Help with this board** simulates possible shots using the current board and both queue colors, then suggests a useful direction and explains its benefit. Reading a hint never changes the live board, queue, wind, gifts or shot count, and does not claim a globally optimal solution. Optional **Show this aim** displays the suggested trajectory without firing; **Swap & show this aim** explicitly exchanges the queue first.

All 100 current levels have a recorded regular-shot route within their three-star target in `src/campaign-expansion.test.ts`; original edition-4/5 routes remain in `src/campaign.test.ts`. The original final stretch uses protected top-corner bees and two spare shots beyond par. New chapters include distinct sparse canopies, windows, split branches, layered ceiling bees, Echo bridges, rescue pockets, wind cargo and short winding Mabel routes, with generous practice allowances and fair room in the final chapter. Gifts and repeatable five-shot top-ups remain free. These automated routes establish solvability, not human difficulty or phone aiming acceptance.

Existing stars and gardens stay intact. To experience all revised lessons in order, use **My Garden → Start a fresh journey**. The existing recovery slot keeps the current journey; download a backup first if you also want to retain an older recovery copy. No reset is performed automatically. Old in-progress runs retain their layouts, shot allowances and rules until finished or restarted.

## Side adventures and Monty’s picnic heist

Open **Side adventures · challenges & boss** from home. Six curated challenges unlock after clearing their meadow: Trust Your Paw (3 and 12; short aiming stem only, no trajectory/landing/match preview or computed hints), Around the Bend (6 and 21; rescue 2 or 4 bees with bank shots), Travel Light (9; no gifts, wild shots or refills, earned Bloom allowed), and Perfect Picnic (10; five total shots, including wilds, with no extension from pollen or refills). Medal progress is separate from stars. Pause and choose **Continue as normal · no medal** to retain the current board while removing challenge restrictions. Exhausted restricted challenges offer the same choice with five free bubbles.

**The Great Picnic Heist** unlocks after 20 meadows. Crack the two protected clasp bees, outplay Monty's shifting screen, then clear Mabel's route through a changing-color gate. Bonk can stall one screen shift. Each phase has a short animated briefing and its own saved checkpoint. **Monty’s Revenge** unlocks after all 30 clears and combines reinforced clasps, another screen layout, and two changing gates. Gifts and extra bubbles remain free; overflow retries only the current phase.

New mechanics are introduced with short animated examples that can be replayed or skipped. The Rules page keeps fuller detail in expandable cards. Reduced-motion settings show a still example.

The campaign and side adventure have separate unfinished-run slots. Starting another side adventure asks before replacing a played side board; main progress is retained. Side activities, relaxed challenge status, medals and boss checkpoints survive reloads, backups and journey recovery. New optional fields migrate into save version 4; campaign run editions 1–5 retain their existing interpretation.

Validation includes normal-shot medal routes for every challenge and wins for all six boss/rematch phases, actual restriction enforcement, bank counts, pollen/wild shot limits, checkpoint persistence, independent campaign saves, relaxed-mode replay and backup round trips. Browser checks cover phase completion, reload, challenge exits, shop use and phone layout; personal difficulty and enjoyment still need playtesting.

## A quieter woodland playfield

The play screen now separates the shooting dock from the board. A labeled Next bubble, one Gifts button with available stock, and three generous Hint/Gifts/Swap controls replace the crowded launcher shortcuts. Rules stay in Pause and the special-bubble labels; Gifts includes a Put away action for equipped shots. Earned Bloom keeps its own dock space. Warm meadow illustration, softly lit glass bubbles and simpler HUD hierarchy add depth without moving the shot origin or board grid. Safe-area padding keeps the playfield away from phone notches and home indicators. Existing journeys, rules, short aim/Full assist choice and drag-to-cancel are unchanged.

Bramble now keeps you company with a tiny breathing motion, gentle sway and occasional blink. He settles while you aim or open a menu, stays visible beside earned Bloom, and remains completely still with reduced motion enabled. The motion is visual only.

The launcher companion now has a larger, full-body silhouette and articulated paws. Bramble cups the loaded bubble, follows your aiming direction, lifts his paw as you release, then returns to his ready pose. His visible motion never moves the real launch point, collision grid or next-bubble queue. Reduced motion keeps the companion in a still ready pose.

A focused character pass gives the launcher Bramble a rounded full-body stance, separate feet and readable eyes. Two matching short, rounded forepaws cradle the bubble above him, keeping his eyes and smile visible. Each stays attached to a fixed shirt shoulder with constant reach and no finger marks. A little whole-body crouch prepares the toss, a small hop lifts both paws, and a soft recovery lowers his paws beside his shirt before he cups the next loaded bubble. The shooting dock gives this larger full-body companion room to breathe on short and tall screens. The board, launch point and collision coordinates stay unchanged, and the touch controls keep their 44-pixel minimum. Every pose affects artwork only.

## A hundred little rescues

The seven new chapters contain 70 separately authored occupied silhouettes, with 94 distinct silhouettes across the full campaign after colors and bee marks are normalized. Every new board begins connected to the ceiling; special coordinates, future bud colors, wind openings and contiguous Mabel routes are validated. Bud and Echo teaching routes actually exercise their new effects. Later chapters mix these with the familiar mechanics without changing early side-adventure or garden-friend unlocks.

Echo resolution finishes its bounded matching waves before dropping unsupported bubbles, then advances wind and chameleons once. Bees, pollen, dew transitions, drops and earned Bloom are counted once. Seeded saved-run replay and hint simulation use exactly those rules.

For offline route verification, run `node scripts/find-campaign-routes.mjs 31 100 24`, then `node scripts/freeze-campaign-routes.mjs` and `npm test`. The solver uses real collision traces, regular shots and free swaps; it establishes solvability, not human difficulty or enjoyment. Phone aiming, character animation, chapter pacing and sound still benefit from hands-on playtesting. See `docs/campaign-expansion.md` for mechanics and compatibility details.
