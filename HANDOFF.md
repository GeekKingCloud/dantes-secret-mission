# Kagebot’s Secret Mission — hero/support integration checkpoint

## Status and commits

Bounded accepted-hero/opening stage complete. **Not a complete playable campaign
or release candidate acceptance.** Shipping still rejects missing enemy actions;
no placeholder enemies or partial public release were introduced.

Branch: `work/kagebot-world1`.

- `4826525`: immutable accepted hero/support import.
- `5e30dabba388b60a67708f35f8edebc2dade90ec`: production integration, cinematic,
  canonical assembly/completeness gate, tests and browser audition.
- This handoff is committed separately after implementation.

## Inventory actually integrated

Accepted source: `a219c36ccb70deefe2d06e46f5b4e4b21db0bc31`, supplied artifact
`dcd87a6272487dfd08fe13dca62a2d3fa9150708`. Only these source-owned paths imported:

- `assets/characters/kagebot/**`: 18 actions, 72 physical frames.
- `assets/characters/robot-butler/**`: 2 actions, 5 frames.
- `assets/characters/jetpack-drone/**`: 2 actions, 5 frames.
- `assets/characters/hero-manifest.json` and `HERO-HANDOFF.md`.

The imported paths remain byte-identical to the accepted tree. No old shared
manifest, old enemy stills, mutable enemy files or unrelated contact sheets were
imported. Hero stays native 192×96 cells / feet [64,80]; no global scaling or
frontflip redesign. World/UI/audio and authored level JSON are unchanged.

One assembly mechanism: `node tools/assemble-characters.mjs
assets/characters/hero-manifest.json`. It creates the canonical schema-v1
`assets/characters/manifest.json`. On the next accepted enemy handoff, append its
source manifest to the same command. Do not introduce a second runtime reader,
idle-action aliases, or consume a mutable worktree manifest.

`character-contract.mjs` owns the complete required action inventory.
`AssetLibrary.requireCharacters()` currently reports 29 missing enemy actions
before shipping can start. The explicit development error was browser-tested.
The missing-enemy assertions describe the current partial candidate; update that
boundary deliberately when the exact complete enemy inventory is accepted.

## Production behavior

- `renderer.mjs`: extracted production `player(g)` rendering, reused directly by
  the isolated audition. Native anchors/mirroring and phase-mapped fast sword
  timelines are retained. Each sword uses 20 slots/seven physical poses; timing
  stays .240/.260/.375 seconds and reach stays 74/82/94 pixels.
- Wall hold/climb use native frame bounds to put the leading hand pixel at the
  fixed wall contact. This is a render-only offset, not a collision/physics edit.
  Wall laser and sword still use the actual simulation and fixed attack geometry.
- `scenes.mjs` supplies native cinematic blocking. Hero meditation and butler idle
  play in the real room/table/candle scene; large alarming HELP appears at 2s;
  native startled/standing sequence begins 2.7s; low run begins 3.25s; grab/boost
  and visibly widened butler eyes begin 4.15s. At 5.8s the scene reaches the map.
- Departure hand and drone rail share a single point, including native frame
  motion, rather than floating on unrelated trajectories. Drone is above/ahead
  of the hero; its exhaust is away from the hero body. Butler turns toward them.
- Existing scene events drive delivered help/jetpack PCM and home/map music.
  Pause, separate mutes and gesture unlock remain native AudioContext behavior.
- Existing production keyboard/pad/tap skip remains available. The audition also
  passed a real browser pointer skip through BrowserInput’s edge queue, not merely
  a direct director-state change.

No changes were made to player physics, combat/ghost/boss fixes, level schema,
three authored level JSONs or route policies in this stage.

## Verification at the stable handoff

Fresh local evidence:

- `node --test tests/*.test.mjs`: **38/38 PASS**, zero skipped.
- All three `node tools/validate-levels.mjs levels/stageN.json`: PASS.
- All three `node tests/routes/stageN.mjs`: PASS with the final boss correction.
- `node tools/levels-smoke.mjs <private-output>`: **PASS** persistent input-only
  campaign with production level loader/director, real PNG scenery, no actors.
  Title → timed opening → map → stage1 → stage2 → stage3 → boss → map portal →
  World2; live boss exit denial and both slash/burst observed.
- Same campaign proves three nonlethal stage2 checkpoint recoveries, followed by
  lethal **current-stage2** reset while completed stage1 survives. Full stage2
  traversal then completes normally; no teleport/HP/victory writes or combat skip.
- Final campaign route results: stage1 6,211 steps, HP4, 9 defeated; stage2 6,221
  route steps after the deliberate retry branch, HP4, six defeated/two ghosts
  evaded; stage3 11,132 steps, HP4, all fifteen enemies plus boss defeated.
  Step counts are scripted feasibility, not human completion-time claims.
- `node tools/hero-smoke.mjs <private-output>`: **PASS** real native hero/support
  PNGs through production renderer, controller, scenes and audio. Latest run adds
  real pointer opening skip; no network misses or unhandled runtime exceptions.
- Hero proof contains 27 actual stage1 pose/phase captures and 56 distinct gameplay
  frames observed in its authored-route replay. A separate actual-enemy-damage
  branch exercises all four hurt frames. Opening records the remaining cinematic
  actions; action inventory metadata is not substituted for those runtime checks.
- Native opening, normal-speed controller input segment and wall-action videos
  recorded from browser canvas plus actual Web Audio, not manufactured footage.
  Inspected temporal filmstrips for startled-rise/run/grab, attached flight,
  widened eyes, sword startup/active/recovery, native flip and wall attack.
- Actual left-facing second strike, native feet/roof lip, wall hand contact and
  private overlaid fixed hurt/slash shapes inspected. Player collision remains
  the intentionally smaller 18×42 inner shape, not an alpha-mask silhouette;
  wall-pose artwork is shifted to the contact. Final foe-contact/visual cue
  acceptance still requires accepted enemy sprites.
- `node tools/browser-smoke.mjs <private-output>`: PASS controller/input regression
  plus updated explicit missing-enemy shipping gate.
- `git diff --check`: PASS. Protected physics/schema/level and accepted asset
  comparisons were empty. Disposable browsers/servers/profiles retired.

Reused parent evidence, not gratuitously rerun: the strengthened boss/ghost
pressure probe passed at `724550b` with both boss patterns, 17 hits, no ghost
solid overlap, max seven dives and fourteen late hits. This stage did not edit
those owners. Fresh full routes and persistent campaign now close the previously
pending intersecting candidate proof.

## Outputs and evidence boundaries

Production: `character-contract.mjs`, `asset-loader.mjs`, `renderer.mjs`,
`scenes.mjs`, `runtime.mjs`, canonical character manifest and accepted actor paths.
Assembly: `tools/assemble-characters.mjs`; details in `ASSET-CONTRACT.md`.
Tests: `tests/hero.test.mjs`, `tests/hero.html`, `tests/hero-runtime.mjs`,
`tools/hero-smoke.mjs`, updated `tools/browser-smoke.mjs` missing-enemy assertion.

The hero audition is prominently labeled PARTIAL / ENEMIES NOT RENDERED / NOT FINAL
GAME. Real foes still exist in simulation; it is deliberately not a playable
reduced-scope release. The campaign proof remains actor-free, not a claim of final
all-actor campaign animation acceptance. Private videos/screenshots/logs and the
actual-output index stay outside the game repository.

## Remaining parent-owned integration gates

- Exact accepted enemy animation import and canonical assembly; all required
  action/state mapping, attack timing, weakness red tint and genuinely actionable
  rear finisher cue checked with real enemy pixels. None of that is fabricated by
  the hero-only audition.
- Full all-actor browser campaign and final hero/enemy collision/readability,
  ghost sprite camera margin, complete cinematic/campaign acceptance together.
- Independent review and parent acceptance before an authorized live test build
  or publication. This checkpoint performs no public write.
- Physical pad/mobile, human first-time duration/playfeel and human audio audition
  remain explicitly untested limits, **not new hardware approval gates**.

No delegation, alternate model, asset jobs, purchases, other-worktree mutations,
configuration changes, polling of the enemy lane or owner-facing sends occurred.
