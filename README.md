# Bramble's Bubble Rescue

A small, original bubble shooter made as a gift. Rescue Bramble's bee friends across six cosy levels. Built with Phaser, TypeScript, and Vite; playable with touch or a mouse.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Run `npm test` for the board rules and `npm run build` for the production site.

## Personalise the gift

Edit the title-card and ending messages in `src/content.ts`. Level layouts and shot limits are in `src/levels.ts`.
The original SVG art is in `public/`; run `npm run art` after editing it to regenerate the PNG game textures and icons.

## Share it

The repository's GitHub Actions workflow publishes the game to GitHub Pages on pushes to `main` using `npm run build:pages`. Once published, send the Pages link. On Android Chrome, open the link, use the three-dot menu, then tap **Add to Home screen** or **Install app**. Progress is saved locally on that phone. After the first visit, the game can launch offline.

All characters, illustrations, and sounds in this project are original.
