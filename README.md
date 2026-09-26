# Bramble's Bubble Rescue

A small, original bubble shooter made as a gift. Rescue Bramble's bee friends across 30 levels in three chapters: **Meadow Days** (beginner), **Honeycomb Grove** (intermediate), and **Breezy Brambles** (hard). Built with Phaser, TypeScript, and Vite; playable with touch or a mouse.

## How to play

Drag inside the play area to aim, then release to shoot. Match at least three bubbles of the same color or clear a support to drop the bubbles below it. Free every bee to finish a level. **Swap** exchanges the current and next bubbles; **Hint** gives a level-specific suggestion.

New mechanics arrive a few levels at a time: wall banks and unsupported drops, pollen that refunds two shots, honeycomb that must be dropped, dew shells that crack before clearing, a shifting wind strip, and blooms that switch color after each shot. There are no timers or lives. After two losses on one level, Bramble offers one free, chosen-color wild shot on each retry.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Run `npm test` for board rules, save migration, and a winning physics replay of every level. Run `npm run build` for the production site.

## Personalise the gift

Edit the title-card and ending messages in `src/content.ts`. Level layouts, bee targets, hints, shot budgets, and mechanic introductions are in `src/levels.ts`.
The original SVG art is in `public/`; run `npm run art` after editing it to regenerate the PNG game textures and icons.

## Share it

The repository's GitHub Actions workflow publishes the game to GitHub Pages on pushes to `main` using `npm run build:pages`. Once published, send the Pages link. On Android Chrome, open the link, use the three-dot menu, then tap **Add to Home screen** or **Install app**. Progress is saved locally on that phone; existing progress from the six-level version carries forward. After the first visit, the game can launch offline.

All characters, illustrations, and sounds in this project are original.
