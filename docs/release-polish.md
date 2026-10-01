# Focused release and pop polish

The previous release crossfaded three different full-body paintings in 70ms. The projectile moved immediately at full speed in integer path samples, the foreground paws disappeared at once, and the next orb was drawn during unfinished recovery. The whole-body paintings shifted the eyes, head and feet as well as the hands.

The shipped candidate uses the original ready painting and one matching painted palm-opening (`public/characters/bramble-lift.webp`). The original face/head above source y540 and feet below y1010 are restored in every cached frame. Weighted premultiplied pixels are added on a transparent canvas cache before drawing, preventing the shirt transparency produced by overlapping alpha sprites. There are 17 cache entries at 212×254 (<4 MiB RGBA total), generated once, with no new dependency, mesh, procedural fur or separated puppet limbs.

The in-between was generated with the built-in image-generation tool from the three accepted WebP references. The prompt requested one registered full-body honey badger with the same identity, golden shirt and realistic painted fur; only short forearms/paws halfway toward a gentle release; no ball, text, background or ground shadow. The generated file was exported as a 533×640 quality-88 WebP. The generated head and feet are never used in play. Two rejected explorations, a misregistered multi-cell strip and a folding pose mesh, are not production assets.

## Presentation contracts

- Aim transforms converge smoothly and their current strength is captured at release
- Visible flight samples interpolate the exact engine trace; a 95ms acceleration still emits on the first frame
- `GameEngine.fire` remains at visible arrival, never on input or before contact
- The receive phase completes before `resolving` clears; reduced motion has no decorative delay
- Original game input guards, collision rules, layout, color queue and save format remain unchanged
- Pop cues are inferred only for presentation; they never mutate engine results or logs
- Support and wind drops stay separate, even when two different bubbles occupy the same coordinate in successive phases
- Every ring, bead and pollen mote consumes the shared 48-object budget
- Pop/drop rescue callbacks finish within the planned resolution interval

## Verification

Full tests cover all 100 campaign winning routes, original edition replays, saves and mechanics. New focused tests cover normalized gesture weights, exact aim/release continuity, receive-before-unlock, a bounded opaque cache, production fire/update on straight/bank/near-launcher traces, deterministic outward/Echo cadence, support-linked drops, coordinate reuse by wind drops, reduced motion, no result mutation and decorative caps.

Production and Pages builds are required. The existing Phaser bundle-size advisory remains. Offline timing films use the production pose/path/cue helpers and production bubble drawing method, but are not live browser acceptance. Public-browser release/pops and service-worker asset freshness must be verified for the exact published commit; phone aiming and personal game feel still benefit from Elisa's feedback.
