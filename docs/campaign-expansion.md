# A hundred woodland rescues

The expansion preserves published levels 1–30, then adds seven ten-meadow chapters. Save format 4 remains unchanged. New attempts use run edition 6; paused editions 1–5 rebuild with their original layouts, allowances, queue and collision rules. `levels-v5.ts` is the frozen published 30-meadow snapshot for editions 4 and 5.

## Two new tricks

- **Two-tone buds:** match the large front color to open a fixed second layer. The smaller inner petal shows that next color in advance. The bee stays in place. Buds never cycle on a turn; they can still drop with a disconnected support. Bloom also opens one layer; Bonk removes the whole bud directly.
- **Echo petals:** a neighboring pop lends its color to every touching Echo petal. A resulting connected group of at least three clears immediately, potentially carrying the color into another cluster. Every Echo converts only once and becomes an ordinary bubble. Competing triggers resolve in board row/column order.

The familiar pollen, honeycomb, dew, breeze, chameleon flowers, Mabel routes and earned Bloom remain available. These are original woodland names and artwork; no product graphics or level layouts are copied. The genre reference was King's [blocker guide](https://bubblewitch3.zendesk.com/hc/en-us/articles/360001501778-What-do-the-different-Blockers-do), describing two-match and neighboring-color chain ideas.

## Cascade accounting

All matching waves finish before unsupported bubbles drop. Popped and dropped tiles are unique by board address; bees and pollen refunds derive from that one combined clear list. Dew cracks and layer/Echo transformations are deduplicated. Echo is consumed as a special state on conversion, and each wave removes or transforms tiles, so the initial board size bounds the work. Wind and chameleon changes happen once afterward. Bloom charge aggregates the completed clear once and cannot charge its own burst.

`SettleResult.transformed` identifies buds that opened and Echo petals that recolored; `chains` counts follow-on matching waves. The engine and contextual hints use the same board implementation and real shot trace.

## Verification and feel

Recorded regular-shot routes go through `GameEngine.fire()` and the actual collision path, including swaps. They must win within the authored par without gifts, chosen-color help, Bloom, or five-shot refills. The offline bounded beam solver is reproducible using `node scripts/find-campaign-routes.mjs`; it saves route candidates, which become checked-in regression fixtures. Solver success establishes solvability, not human difficulty, enjoyable pacing or reliable phone aiming. Those still need hands-on playtesting.

Campaign validation checks chapter bounds, every mandatory rescue, all special positions/colors, ceiling connectivity, route coordinates, positive allowances, and distinct normalized structural silhouettes. Existing regular-shot edition 4/5 and legacy routes remain regression tests.

## Presentation integration

The chapter selector, home and garden progress use the campaign length, and scenery needs a safe palette for all ten chapters. The new tiles need distinct marks: a visible fixed next-color petal for a bud, and a petal motif for Echo. Aim previews can ring transformed cells separately from popped cells and dew cracks. Inspection and mechanic chips should expose each rule. Lesson demos at 31 and 41 support motion and reduced-motion still views. New run edition 6 must be eligible for those lessons.

No lives, timers, paid currencies, recurring obligations or new help restrictions are introduced. Existing garden residents at 5/10/20/30 clears, gifts and side-adventure unlocks stay where they were. Later flowers, decorations and hive charms are additive.
