# Kagebot’s Secret Mission — environment/audio integration handoff

## Current checkpoint

Bounded environment/audio integration stage complete; NOT campaign or release
acceptance. Branch `work/kagebot-world1`. Sole controller/code integrator remains
this session. No other worktree was edited, no mutable actor/level work imported,
no publication, remote writes, paid operations or model delegation.

Local commits:
- `a0f119a`: exact accepted environment/UI import, 64 files, only
  `assets/world/**` and `assets/ui/**` from tree
  `30e3a3c6ee6b9a632bd2362918d0e34c3b8dcb28`.
- `16fa42a`: production media readers, renderer/audio hooks, mobile fix and proof.
- `d8c0b4f`: explicit no-scroll jump/sword touch and stale asynchronous music-load
  cancellation proof; bounded profile-delete retry for Chromium's late writes.
- This handoff is the following documentation checkpoint.

Prior baseline: `db80c05`; audio import `4eda603` / `ce3740a` preserved unchanged.
Level designers retain their files. `player-controller.mjs`, `level-schema.mjs`,
`LEVEL-SCHEMA.md`, all movement constants and existing authored level files were
unchanged. World/UI manifests and PNGs remain byte-identical to the accepted tree.

## Production changes and outputs

- `asset-loader.mjs`: strict accepted world/UI schema 2 arrays with `path_base:
  assets/`; width/height authoritative, stale descriptive size ignored. Resolves
  current `path` fields, checks decoded PNG dimensions and draws explicit scale
  with nearest-neighbor/integer placement. Actor v1 contract unchanged. No legacy
  reader, path alias, generated substitute or missing-animation fallback.
- `renderer.mjs`: real room/table/candle and HELP scrim/text; overworld markers,
  completion/lock/selection, eight-frame portal, title and World2 scene; six
  independent parallax PNGs and authored camera factors/drift. Near-cloud band
  alpha .22 and high y placement (at most -35), not a replacement image. Anchored
  roof rows over full walls; spike art fits fixed hazard rectangles without
  changing collision. Arena backdrop is decorative, not a perspective collider.
  Production HUD renders delivered health/ammo PNGs; no enemy/boss health bars.
- `audio.mjs`: the single imported production manifest format, using `file`,
  `schema_version`, PCM metadata and end-exclusive frame markers. No src alias.
  Short cues preload after gesture; long music decodes on demand. Manifest bus
  gains .65 music / .8 SFX, master .68, compressor; max eight effect voices plus
  one music source. Pause/hidden/both-muted suspend actual context; independent
  mute buses and resume preserve existing music position. Tokens discard stale
  asynchronous track loads. Completed non-looping music never restarts each RAF.
- `runtime.mjs`, `scenes.mjs`, `simulation.mjs`, `enemies.mjs`: shared visibility
  lifecycle, event routing, navigation/checkpoint/windup/impact/portal cues.
  Changes in simulation/enemies are audio events only, not feel/AI constants.
  Spider spit no longer incorrectly emits an extra sword sound.
- `style.css`: observed landscape failure repaired in actual shipping layout.
  At 844×390, original canvas extended below viewport and controls were below
  y=575. Landscape now puts controls beside a fully visible canvas, without
  scroll; portrait controls have usable minimum sizes. Input semantics unchanged.
- `ASSET-CONTRACT.md`: current, separate actor/environment/audio contracts.
- `tests/media.html`, `tests/media-runtime.mjs`: clearly labelled media-only
  harness. Uses shipping DOM/CSS/control handlers and production modules. Calls
  scenery/HUD rendering explicitly, never replaces missing actors with geometry
  or aliases. Synthetic scene arrangements and HUD values are test-only, not
  any designer's campaign data.
- `tests/media.test.mjs`, `tools/media-smoke.mjs`: format/preservation/event tests
  and real Chromium PNG/Web Audio/mobile evidence runner.

Shipping `index.html` still fails explicitly at missing characters. The media
harness is NOT the game and is never imported by the shipping entry.

## Fresh acceptance evidence on the integration candidate

Commands executed successfully:

- `node --test tests/*.test.mjs`: **31/31 PASS**, no skipped/todo tests. Includes
  earlier controller/combat invariants plus current production format, inventory,
  decoded-size scaling, immutable approved audio hash and event-entry cue checks.
- `node tools/media-smoke.mjs <private-output>/final-proof`: **PASS**.
- `node tools/browser-smoke.mjs <private-output>/controller-regression`: **PASS**.
- `git diff --check`: PASS. Exact source-tree comparisons for world/UI and
  unchanged movement/schema/audio paths produced no differences.

Browser media proof, not mocked AudioContext or synthetic media:

- All **44** world/UI PNG entries loaded and dimension-checked. Captured and
  inspected home, map, rooftop, arena and mobile composites. Title, completed
  map/portal and World2 screenshots also captured. Portal frames exercised.
- Six actual PNG layer calls verified; camera x/y changes and unequal cloud
  drift exercised. Native frame draws use nearest-neighbor scaling. Rooftop
  remains legible below the subdued upper ornamental cloud band.
- Shipping DOM/CSS at **390×844 portrait** and **844×390 landscape**: complete
  game canvas and every action button in the viewport simultaneously. Real CDP
  touch pointer events on jump/sword without scrolling; no keyboard substitution.
- Actual user click unlocks native AudioContext. All **29** delivered PCM files
  decoded and started through native buffer sources (10 music/stings, 19 SFX).
  Approved stage1 WAV SHA-256 remains
  `2d182f7a8194b231352ee80bbeac0dbefa634b085f0749134a6436dac0dd8a85`.
- Instrumented native source activity: maximum **one** music source, repeated
  sync did not duplicate starts. Six loop flags/markers checked against source
  frame metadata. Representative music routing, rapid transition cancellation,
  separate/both mute, pause clock freeze/resume and real background-tab hiding
  tested. Full victory one-shot ends into map music; World2 one-shot completes
  without restarting. Help/jetpack and every effect use delivered PCM.
- **Zero network misses and zero unhandled exceptions in the media harness.**
  Shipping-entry missing-character request is an intentional, separately tested
  failure, not hidden inside that zero-miss claim.
- Browser captured `audio-lifecycle.webm`: real stereo Opus recording of the
  AudioContext output, about 12 seconds; ffmpeg decoded successfully. This
  excerpt decodes successfully and has measured headroom, not a claim about every
  possible gameplay mix. Exact final inspection is in the private evidence index.
  No human listening/phone-speaker acceptance is claimed.
- Controller regression retained real high-refresh keyboard/touch proof and the
  buffered three-hit → recovery dash-cancel → cross bear → turn → rear execute
  → capped refund sequence. Existing missing-actor failure remains visible.
- Test servers closed, Chromium processes exited and temporary profiles removed;
  cleanup receipts retained and absence checked. No live executor remains.

Evidence is private and external to git. Relative to the stage's private evidence
root, inspect `node-suite.txt`, `final-proof/evidence.json`,
`final-proof/audio-lifecycle.webm`, `final-proof/cleanup.json`,
`final-proof/{home,map,rooftop,arena,mobile-portrait,mobile-landscape}.png`, and
`controller-regression/{browser-evidence,cleanup}.json`. The private evidence
index gives exact host paths. `first-proof` preserves the real landscape failure;
`second-proof` is intermediate, not the final candidate receipt.

## Explicit pending gates — do not delete or treat as passed

1. **ACTOR-INTEGRATION:** Accepted hero/enemy/butler/drone atlases, all required
   action/attack clips, fixed feet/anchors, visible sword coverage, red weak tint,
   finisher cue, animation-state/hitbox alignment. No mutable actor files imported.
2. **HOME-CINEMATIC:** Real cross-legged meditation, butler eyes, reaction/run,
   drone boarding/departure with the existing scene/audio timeline. Scenery and
   HELP are verified; character animation is not.
3. **THREE-DESIGNER-ROUTES:** Import only parent-accepted level JSON/routes after
   handoff. Full distinct stage1/2/3, meaningful vertical/horizontal traversal,
   spikes/climb/hazard alignment, checkpoints, current-level lethal restart,
   boss arena/defeat/portal and World2 reachable by inputs. Fixture proof is not
   campaign route proof.
4. **CAMPAIGN-BROWSER:** Complete home→map→three stages→boss→portal→World2 with
   final assets, music and actual keyboard/controller/touch input. Current media
   harness tests scene rendering/audio states independently, not that playthrough.
5. **AUDIO-LISTENING:** Human audition, actual speakers/phone, integrated combat
   balance and subjective loop seams. Loop metadata and native source lifecycle
   passed; entire real-time repeated loops were not listened to here.
6. **DEVICES:** Physical controller, actual mobile hardware and non-Chromium
   browser acceptance. CDP emulation is not hardware testing.
7. **RELEASE:** Parent integration, independent review, full named campaign/art
   acceptance and live verification before any public release. Nothing published.

## Controller continuity

Sole controller owner remains this session. Previous movement measurements remain
valid because physics is unchanged: full jump 66.9375px/.625s airtime; short hop
20.8125px/.300s; active dash 152px/.200s, neutral total-to-rest236.375px; wall-kick
37.3333px away after .1333s. Reproduce with `node tools/measure-movement.mjs`.
The stable designer contract remains `LEVEL-SCHEMA.md` from the established
schema handoff. Do not solve actor/level delivery mismatches by adding guessed
legacy aliases, changing movement or substituting a scenery test for shipping.
