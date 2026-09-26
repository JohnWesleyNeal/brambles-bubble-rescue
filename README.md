# Bramble's Bubble Rescue

A small, original bubble shooter made as a gift. Rescue Bramble's bee friends across 30 levels in three chapters: **Meadow Days** (beginner), **Honeycomb Grove** (intermediate), and **Breezy Brambles** (hard). Built with Phaser, TypeScript, and Vite; playable with touch or a mouse.

## How to play

Drag inside the play area to aim, then release to shoot. Match at least three bubbles of the same color or clear a support to drop the bubbles below it. Free every bee to finish a level. **Swap** exchanges the current and next bubbles; **Hint** gives a level-specific suggestion. Tap **Rules** at any time for the full field guide, or choose **Inspect bubbles** there and tap a bubble on the board. Tapping a special bubble label above the board opens its rule directly. Closing either view resumes the same attempt.

The **pause** button keeps the current board, queue, remaining shots, and equipped power-up. From there you can resume, restart, read Rules, open the Bag, change sound, or return to the meadows. The home screen offers **Resume** after leaving or reopening the app. Starting another level replaces a saved attempt only after a confirmation. A winning shot saves its clear immediately, even if the app closes during the celebration.

New mechanics now arrive from the first meadow: hanging drops at level 3, pollen at 4, banks at 6, honeycomb at 8, dew at 11, wind at 16, and changing blooms at 19. Later boards have deeper bee targets, more mixed mechanics, and tighter shot budgets. Each chapter has its own board palette, and shots now call out bee rescues, pollen refunds, cracked dew, and chain drops. Every level has a recorded winning route using regular bubbles alone.

**Bag** holds three optional power-ups. Rainbow Pop lets you pick a color; Double Pop clears a pair with your shot; Bonk removes the first tile it hits, including honeycomb or dew. Power-ups use a regular shot, can be used repeatedly if stocked, and are spent only when fired. The shop uses imaginary Honey Hearts: first clears grant four, and the free refill grants twelve whenever you want. There are no payments or real-world obligations. After two losses on one level, Bramble also offers one free, chosen-color wild shot on each retry. There are no timers or lives.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Run `npm test` for board rules, boosters, save migration, paused-run restoration, and a winning physics replay of every level. Run `npm run build` for the production site.

## Personalise the gift

Edit the title-card and ending messages in `src/content.ts`. Level layouts, bee targets, hints, shot budgets, and mechanic introductions are in `src/levels.ts`.
The original SVG art is in `public/`; run `npm run art` after editing it to regenerate the PNG game textures and icons.

## Share it

The repository's GitHub Actions workflow publishes the game to GitHub Pages on pushes to `main` using `npm run build:pages`. Once published, send the Pages link. On Android Chrome, open the link, use the three-dot menu, then tap **Add to Home screen** or **Install app**. Progress and the current attempt are saved locally on that phone; existing stars, unlocked levels, failures, tutorials, and sound preference carry forward. The new Bag starts with one of each power-up and twelve Honey Hearts. After the first visit, the game can launch offline.

All characters, illustrations, and sounds in this project are original.
