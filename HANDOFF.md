# Kagebot’s Secret Mission — runtime playtest polish

## Current runtime delta

Based on `59d4e19345d7d115aa4f0e89e079ba75b5bcab74`, preserving stationary
wall grip and 100ms wall-jump grace. Laser and execution now have short authored
visual priority over the independently running sword combo, with their own
normalized animation clock. Sword buffering, damage and movement remain live;
hurt and grounded dash cancel these cues without resurrecting stale animations.
Execution's actual ammo increment triggers a single 380ms green silhouette fade
and gained-pip outline. Capped executions do not trigger a charge pulse. One-shot
actions remain opaque rather than disappearing into the invulnerability blink.

Only `far-clouds` entries were removed from the three production background
arrays. Original assets and near-cloud horizontal drift remain intact. The upper
band is clamped after camera offset so it stays upper at the ascent's crown.
Route assertions and stage notes now describe five layers, not six. The separate
media inventory fixture still intentionally exercises both original cloud assets.

Fresh local proof: 87 Node tests pass, including existing wall grip/grace tests.
Baseline-versus-current real-input traces preserve all compared mechanical state
while previously suppressed laser/queued-execution poses become visible. The
input-only campaign passes all three stages, with four HP and no retries on the
browser route. Chromium captured three route camera samples, including stage 2
crown height, and normal-speed laser+sword, execution+queued sword, and capped
execution clips. Focused action clips are labeled fixtures, not campaign scenes.
No physical controller test, asset generation, publication or external write.

## Next ownership boundary

Runtime phase is stopped for parent inspection. Artist retains asset ownership;
the parent must accept the lean hero/sheath, true tucked flip and action-art pilot
before assigning remaining integration. Current authored frames are provisional;
there are no generated replacement poses in this runtime delta. Recheck native
anchors, frame metadata and short action timing against any accepted new atlas.
Architecture art and all three stages' geometry remain untouched: still pending
are actual modular roof/wall tiles, varied ledge thickness, deliberate narrow
shafts and believable horizontal roofs versus vertical façades. Parent assigns
one next-stage integration owner, then requests affected route proof and an
independent assembled visual/gameplay review before any publication. No air-dash
work is pending or authorized.

## Historical full-art review checkpoint (superseded where noted above)

## Boundary

Local assembly for independent combined art/code review. No push, publication,
live verification, external message, asset job or additional spend is authorized
or performed here. The complete World 1 is implemented; World 2 is deliberately
only a coming-soon destination. This is not a claim that a deployed page was updated.

## Exact source provenance

- Revised hero: `5e4443b69e43a8dd4ef5e534d73fdfa4c633eb2b`;
  artifact `4f86e3fb4d869c0b5a591de1c034399b7be8147c`.
  The independent standalone review is PASS_FOR_INTEGRATION on these exact bytes.
  Only the three hero/support directories, hero-manifest and HERO-HANDOFF were
  imported. Import commit: `495996b`. Two obsolete standalone validation files
  were removed because the exact source tree removed them; history/prototypes
  remain preserved. Support art is unchanged.
- Enemies: `e431a6eb875f55c70f64895de59820d3a1676a27`, unchanged from the
  parent-harvested full-enemy candidate `76f6270b26dc284c9caca2deebc612b15cf5aa78`.
- Environment/UI: `30e3a3c6ee6b9a632bd2362918d0e34c3b8dcb28`, unchanged bytes.
- Three production levels, schema, player physics, combat ranges/timings,
  enemy AI and PCM payloads remain unchanged from the harvested candidate.

One assembler builds `assets/characters/manifest.json` from the two explicit
source manifests. Eight actors / 51 required actions: hero 18/72 physical frames,
butler 2/5, drone 2/5, enemies 29/201, plus the three-frame venom sprite.
No fallback shapes, aliases or missing-action substitutions.

## Integration and bounded visual consistency pass

The revised hero uses native 192×128 cells with anchor [64,104], never globally
scaled. One shared hood/armor model, narrow scarf and 40-column physical blade
remain consistent across actions. Darker cyan air-cuts communicate 74/82/94 reach;
physical blade length and .240/.260/.375 combat durations are unchanged.

The old moving hand offset was incorrect for the new pixels. Opening blocking
now derives offsets from the real manifest anchors and the stable native
revised gauntlet [73,61] / drone rail [34,54]. Meditation → HELP/startle/stand →
run → attached flight and butler eyes remain visible, with normal input skip.
Wall hand compensation already consumed native frame bounds and automatically
adapted to the revised cells; no wall/body collision change was needed. Flip,
foot anchoring, mirroring and strike clocks use the supplied metadata unchanged.

The bounded whole-game pass found dense distant mountain/temple textures competing
with small native actors and real foreground architecture. Renderer-only .4/.5
opacity quiets those layers; near-cloud placement/opacity, source PNGs, foreground
collision walls/roofs/spikes and meaningful scene variation are preserved.
No wholesale regeneration, new art direction, physics retuning or level easing.

Representative actual home, map, rooftop combat, vertical walls/spikes, mixed
stage, boss and portal scenes were inspected. Normal-cadence recorded gameplay
and timestamped decoded sequences cover all eight enemy attack tracks: zombie
melee, bear melee, ghost dive, spider venom, and boss slash/burst normal/enraged.
The four enemy QA clips are explicitly labeled focused fixtures; boss attack
clips are from the real campaign under sword pressure. Windup/active/recovery,
hurt/defeat, committed facing and native identity remain readable. The spider
uses its real mouth PNG venom and fixed wall grip; ghost damage stays moving
30×35 contact with the preserved swept four-pixel margin. No enemy health bars.

Private fixed-body/strike overlays were inspected against current actual game
captures; none appear in shipping. Hood/scarf/weapon pixels are not collision
silhouettes. Air-cuts reach the unchanged strike boundary; the physical sword
is a separate shorter bright object. Authored cutout articulation remains an
explicit accepted limitation, not a claim of fully hand-drawn deformation.

The old provisional-hero warning was removed after exact import, targeted tests
and current in-game checks. README, GAME-DESIGN and asset contract now describe
full World 1 rather than the old single-rooftop/vector or missing-enemy prototype.
Original source, tests, references, licenses and history are retained.

## Verification and evidence boundaries

Functional assembly commit `724d873218dde18410bb2e2d7f0df41a2d3bf5c1` passed:

- Full Node suite: 42/42.
- All three level validators and authored input routes.
- Actual `index.html` full-actor input-only campaign: home → map → stages 1/2/3
  → live boss exit denial → portal → World2; checkpoint return and lethal
  current-level reset preserve completed stages. No HP/position/victory writes.
- Real keyboard entry/pause/resume; simulated standard-pad entry/replay/pause/
  resume; actual browser touch resume/jump with canvas visible and no scrolling.
- Native 640×360 canvas, representative desktop, mobile landscape and portrait.
- Normal-speed opening, full first-stage combat and boss-pattern recordings;
  actual audio on campaign recordings, silent labeled focused motion fixtures.
- Zero missing network assets and unhandled browser exceptions; owned isolated
  browser, server and temporary profile retired.

A later coverage-only refinement adds an authored raised-perch fixture for the
boss's move action: the normal ground-level damage-free route immediately elicits
attacks and does not necessarily draw that action. This uses real AI and ordinary
fixture placement, not HP/timer/state injection. The shipping driver asserts that
all 51 actor action entries actually draw across campaign plus labeled focused QA.
No production behavior was changed by this coverage refinement.

The bounded run stopped before executing that final coverage-only refinement.
Its fixture and the new all-actions-drawn assertion are UNVERIFIED. The earlier
green shipping proof did not draw `masked-mutant-boss/move`; do not present it
as complete all-action draw coverage. The exact next check is:

    node tools/shipping-smoke.mjs /path/to/private/final-coverage-evidence

That check must pass on the final committed tree before claiming the requested
fully verified final release candidate. The 42-test suite, three route/validator
proofs and completed full-art campaign remain valid for unchanged production code.

The latest completed shipping proof records its exact Git revision in `evidence.json` and
is indexed in the separately delivered private evidence index. New movies and
screenshots belong to that revision; earlier first-pass clips are supplementary,
not release screenshots. The private index distinguishes current checks from
reused exact-source independent hero review, enemy source-phase judgment and
unchanged audio-file provenance. No private host paths or operational logs are
copied into this repository.

## Review and remaining limits

Parent owns final independent combined art/code acceptance, public Git actions,
publication and live-revision verification. No new owner signoff or extra art gate
is invented. Physical gamepad/mobile hardware, first-time human timing and human
speaker/mix audition are untested limitations, not blockers imposed on the test
build. No concrete source-art defect requiring another asset-generation pass was
identified in this bounded integration/consistency inspection.
