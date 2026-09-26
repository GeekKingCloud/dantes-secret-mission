# Kagebot’s Secret Mission — controller verification handoff

## Current checkpoint

Controller verification pass complete. This is NOT a completed campaign,
finished-art preview, audio integration sign-off or publication. Keep this same
controller owner for later parent-coordinated asset/level integration.

Branch: `work/kagebot-world1`.
Local commits:
- `229e1e7`: stable level/PNG contracts and diagnostic example.
- `d168281`, `c0adb1d`: initial controller/scenes scaffold and checkpoint.
- `4eda603`, `ce3740a`: parent-imported audio lane; left untouched this pass.
- `f7cd0a1`: touch-test correction, high-refresh buffered combat proof, movement
  measurement tool and measured documentation.
- This handoff is recorded in the subsequent documentation commit.

No changes to movement constants, simulation/combat implementation, schemas,
designer-owned `levels/` files or asset-owner paths. No external writes, account
spend, delegation or other model launches. Private instructions/logs remain
outside Git. No active executors or external job IDs remain.

## Touch blocker: actual cause and fix

The failing smoke dispatched a touch at viewport coordinate y=2153.3125 while
viewport height was only 860. The diagnostic JSON pushed JUMP below the fold.
`elementFromPoint` returned null; real touch pointerdown/up targeted HTML, not
the button. The player correctly remained at y=300. This was test targeting,
not a defective touch handler or a physics timing error.

`tools/browser-smoke.mjs` now scrolls the button into view before measuring
viewport coordinates, verifies hit-test target `jump`, and asserts actual
`pointerType: touch` pointerdown/up arrive on that button. The original y<300
acceptance remains unchanged. No keyboard substitute, player teleport, handler
rewrite, arbitrary delay or weakened jump check.

Verified result: y=296.5104166666667, vy=-418.75, grounded=false, pose=jump-rise,
event=jump after one physics tick. Down/up/lostpointercapture all target JUMP.

## Fresh acceptance evidence

All checks below executed successfully on the code in `f7cd0a1`:

- `node --test tests/*.test.mjs`: **27/27 pass**, no skipped tests.
- `node tools/browser-smoke.mjs <private-evidence-directory>`: **PASS**.
  Actual Chromium/CDP keyboard, queued 240Hz press, doubleflip, no air-start
  dash, full input-only bear combo/dash-through/rear-execute/refund, actual
  touch jump, and explicit shipping missing-PNG error. No runtime exceptions.
- `node tools/measure-movement.mjs`: **PASS**, actual fixed-step trajectories
  printed as JSON; no continuous-equation substitution.
- `git diff --check`: **PASS**.
- Source/asset/schema/level diff guard before commit: **unchanged**.

Newest FAST combo requirements confirmed:
- Early sword follow-up presses queue during the preceding strike; both queued
  transitions start without an idle gap.
- Recovery dash-cancel takes effect on the input tick, not at animation end.
- Node checks run the full sequence at 120/144/240Hz render cadence.
- Chromium uses actual keyboard events with two 1/240s render updates per
  1/120s simulation tick. Each sword edge survives its first no-step frame.
- Browser captures early buffers, sword-3 recovery, immediate dash cancellation,
  fully crossed red/weak bear plus rear execute cue, and disappearance/refund.
- Existing hitstop input retention, front/occluded finisher rejection, capped
  refund/no duplicate, wall combat and current-level lethal reset checks pass.

No gameplay timing changes were necessary. Retain the existing short startup,
.18s input buffer, .035s hitstop and authored phase timing. Final PNG animations
must follow combat timing, not slow the controller to display all frames.

## Measured motion (logical pixels; fixed step 1/120s)

| Motion | Result |
| --- | --- |
| Full held jump | 66.9375px apex at .325s; airtime .625s |
| Short hop, release after 3 steps | 20.8125px apex at .150s; airtime .300s |
| Active dash | 152px in .200s / 24 steps |
| Dash through neutral rest | 236.375px total; additional .233333s braking |
| Wall kick first integrated velocity | −280px/s away, −398.75px/s vertical |
| Wall kick at .133333s / 16 steps | 37.333333px separation; 41.916667px rise |
| Opposite-wall regrab in measured corridor | .233333s / 28 steps; 61.958333px away, 57.604167px rise |

Important: 152px measures the active dash, NOT final neutral stopping distance.
The measured rear-execute sequence turns/executes promptly within enemy facing
commitment. Constants and schema remain stable for designers.

Measurement assumptions and reproducible full-precision output:
`tools/measure-movement.mjs`; summarized in `MOVEMENT-NOTES.md`.

## Output paths and inspected evidence

Repository outputs:
- `tools/browser-smoke.mjs`
- `tools/measure-movement.mjs`
- `tests/combat-loop.test.mjs`
- `tests/fixture-runtime.mjs`
- `MOVEMENT-NOTES.md`, `HANDOFF.md`

Private evidence is outside the repository, under the controller's established
owner-only log directory. Exact absolute paths are in its private evidence index
and the owner-facing completion; no raw logs/screenshots were committed.
- `touch-red/browser-evidence.json`: reproduced failure and wrong hit target.
- `verified-browser/browser-evidence.json`: successful final assertions/trace.
- `verified-browser/combat-{0,22,52,60,104,105,116,130,145}.png`.
- `verified-browser/touch-before.png`, `touch-jump.png`, `missing-assets.png`.
- `verified-browser/cleanup.json`: Chromium exit, server closure/profile removal.
- `node-suite.txt`, `movement-measurements.json`.

Inspected final screenshot evidence: weakened red bear fully behind player with
F/RB execute cue; post-execute target absent; touch rise and printed coordinates;
shipping entry explicitly says missing integration assets/no vector fallback.
All combat images prominently label diagnostic hitboxes, NOT shipping game art.
No video or physical-controller test is claimed.

Cleanup verified: runner awaited Chromium exit, closed its localhost server,
removed its private disposable profile. PID and profile absence subsequently
confirmed; no persistent test server/browser left running. Evidence directories
are mode0700; evidence files mode0600.

## Remaining integration boundaries

Character/world/UI manifests and designer-authored stage imports remain pending.
Do not clone diagnostic fixtures into shipping stage files. The runtime must
continue to fail explicitly without real PNG assets; browser smoke currently
expects that deliberate absent-characters error and must be updated when the
parent supplies real imports.

Audio is physically imported, not yet wired to the runtime's one final format.
Actual `assets/audio/manifest.json` uses `schema_version`, per-entry `file`, rich
production metadata and `loop_start_s`/`loop_end_s` (plus frame markers).
The scaffold/example expects `version`, `src`, gain and camelCase loop keys.
This pass deliberately adds NO compatibility aliases or format fallback. Later
integration must choose and implement one production format with the audio
owner's metadata/mix intent, then test actual decode, gesture unlock, looping,
scene transitions, mute and suspension. Audio runtime not exercised here.

Next parent-coordinated controller stage:
1. Accept the three designer-owned level data/routes without schema drift.
2. Import real characters/world/UI and reconcile one final manifest contract.
3. Exercise actual PNG feet anchors, blade coverage, enemy attack phases,
   red weakness tint and execute cues; diagnostic proofs do not certify art.
4. Exercise home→map→three stages→boss→portal/World2, actual audio and complete
   routes in browser; capture final-art screenshots/video and inspect camera,
   parallax and wall sections. Keep physical gamepad status explicit.
5. Parent alone coordinates independent review and public release.
