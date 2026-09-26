# Kagebot's Secret Mission — controller stage handoff

## Status

Bounded first-stage checkpoint, NOT full World 1 completion or publication.
Schema ready; controller/combat/scenes/runtime implemented. Final verification
was interrupted by the run budget. Parent should resume this same code-owner
session, finish the pending checks below, then import other owners' outputs.
No delegation, model launches, API jobs, account spend or public writes occurred.
No asset-owner paths or designer-owned shipping level files were changed.
Private task instructions/job records were not copied into the repository.

Branch: `work/kagebot-world1`.
Commits:
- `229e1e7` — early level/PNG contracts and diagnostic example.
- `d168281` — controller, combat, AI, scenes, runtime and tests checkpoint.
- This HANDOFF is recorded in the subsequent documentation commit.
Old procedural implementation is preserved in Git at `178eae6`; it is no longer
imported. Original existing asset files are untouched.

## Exact outputs (relative to this worktree root)

Ready designer interfaces:
- `LEVEL-SCHEMA.md`
- `ASSET-CONTRACT.md`
- `tests/fixtures/controller.json` — example/diagnostic data, NOT a shipping level.
- `level-schema.mjs`, `tools/validate-levels.mjs`

Controller/combat:
- `player-controller.mjs`, `geometry.mjs`, `simulation.mjs`, `enemies.mjs`
- `input.mjs` (extended browser source/edge handling), existing `gamepad.mjs`
- `MOVEMENT-NOTES.md` — public provenance, units, feel/cancellation rules.

Runtime:
- `asset-loader.mjs`, `renderer.mjs`, `scenes.mjs`, `runtime.mjs`
- `index.html`, `style.css`, `audio.mjs`

Checks and diagnostic play surfaces:
- `tests/controller.test.mjs`, `tests/simulation.test.mjs`
- `tests/combat-loop.test.mjs`, `tests/contracts.test.mjs`
- `tests/input.test.mjs` (existing queue/pad regression retained)
- `tests/controller.html`, `tests/fixture-runtime.mjs`, `tests/fixtures/labs.mjs`
- `tools/browser-smoke.mjs` (written, NOT run yet)

## Acceptance evidence — fresh local checks, not release proof

Executed:
1. Initial controller test invocation failed with missing module before its
   implementation (red proof).
2. `node --test tests/controller.test.mjs tests/simulation.test.mjs tests/input.test.mjs`
   passed 16 tests at the earlier implementation checkpoint. Covers full versus
   short jump, measured unobstructed 152px dash, no air-start dash, coyote and
   buffer, wall climb/kick/regrab, body/ceiling invariance, combos, hitstop queue,
   finisher/refund, wall sword/laser, lethal current-level reset, nonlethal
   checkpoint recovery, four AI telegraphs, boss gate and geometry/projectiles.
3. `node tools/validate-levels.mjs tests/fixtures/controller.json` passed.
4. After applying the newer combat requirements,
   `node --test tests/combat-loop.test.mjs tests/simulation.test.mjs`
   ran 13 tests: 12 passed, one failed. Crucially, the complete input-only
   three-hit bear combo → dash fully through → turn → rear execute → exact ammo
   refund passed, as did active-attack dash crossings of zombie/bear and
   occluded/front finisher refusal.
   The sole failure asserted zombie turning before its documented recovery plus
   .45s turn delay elapsed. The test's waiting budget was corrected to include
   recovery plus turn delay; that correction has NOT been rerun.

Not checked on exact final code commit:
- Entire current Node suite (contracts/scenes/PNG checks were added afterward).
- `tools/browser-smoke.mjs` execution. No Chromium screenshots/video produced.
  The script is intended to exercise CDP keyboard, 240Hz queue, touch, complete
  bear combat input sequence, and explicit absent-PNG failure; do not report its
  intended assertions as passed evidence.
- Exact printed apex, airtime and wall-kick measurement report. Controller test
  assertions passed earlier, but final numeric evidence still needs extraction.
- Final imported PNG animation reach/feet/pixel quality, actual red-tint
  appearance, audio manifest decoding/mix/scene transitions.
- Physical gamepad (never claimed).

## Implemented interactions and constraints

Dedicated controller: variable jump, coyote/buffer, one doubleflip, full-height
wall contact, wall hold/climb, separation-lock wall jump/regrab. Ground-only
152px dash with enemy iframes throughout .20s, .65s cooldown, edge carry permitted;
spikes bypass dash immunity. Fixed collision/hurt/attack geometry; wide three-hit
sword with buffered chaining and dash cancellation. Hitstop retains presses.

New combat update was explicitly read and applied: proximity approach for zombie,
committed facing during strikes/recovery, delayed pursuit turning; per-type weak
thresholds; red-tinted PNG weak presentation; NO enemy or boss health bars;
behind/range/facing/unobstructed finisher cue; capped one-ammo refund; distinct
four-enemy attack poses and boss slash/burst, lower-health faster telegraph.

PNG-only actor/terrain rendering, nearest-neighbor native frame sizes, manifest
anchors; missing assets throw an explicit development error. Diagnostic box
renderer exists only under tests and is never imported by shipping runtime.
Emission cores and HUD text are intentional procedural effects, not actor art.
Independent background/cloud factors and drift; camera follows both axes.

Scene scaffold: title → home-intro (meditation/table/candle/butler, HELP,
startled/run, drone departure; skippable) → selectable/unlocked map → stage/boss
→ map portal → World2 tease. Replay selection, current-level death reset,
pause/hidden suspension and per-scene audio/mute lifecycle are wired. Scene
unit checks are not yet executed; no integrated campaign traversal is claimed.

## Missing imports and next bounded work

Required missing asset imports:
- `assets/characters/manifest.json` and referenced PNGs.
- `assets/world/manifest.json`, `assets/ui/manifest.json` and referenced PNGs.
- `assets/audio/manifest.json` and referenced audio.

Designer-owned files awaiting parent handoff:
- `levels/stage1.json`, `levels/stage2.json`, `levels/stage3.json`.
Do NOT fabricate/clone fixtures as these levels. The runtime requests those exact
paths. Parent coordinates any manifest/schema reconciliation with asset owners.

Resume in this order:
1. Run `node --test tests/*.test.mjs`; resolve actual failures without weakening
   contracts. Recheck the zombie timing correction and added scene/asset tests.
2. Run browser smoke with an owner-only evidence output directory. Script owns
   and retires its temporary Chromium profile and localhost server. Capture and
   inspect screenshots; add simulated standard-pad and wall-route browser proof
   as needed (existing Node pad regression is not physical-controller evidence).
3. Print measured full/short jump apex + airtime, dash distance, wall kick at
   actual fixed timestep; preserve exact output privately and summarize here.
4. Import parent-provided PNG/audio/levels, validate referenced keys and frame
   ranges. Inspect actual sword/attack phase alignment and feet anchors, home
   staging, cloud visibility, vertical camera, weak tint and execute cue.
5. Only after imports: actual full scene/campaign, input-only stage routes,
   boss and portal browser/audio/visual acceptance. Parent owns public release.

No persistent executors or external job IDs exist from this code stage. Browser
runner was not launched. No waiting or polling of other workers was performed.
