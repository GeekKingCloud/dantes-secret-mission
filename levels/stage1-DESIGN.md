# Stage 1 — Lantern Eaves: The First Cry

## Design contract

Combat-first temple-rooftop route, not a boss arena or a movement laboratory.
The cry leads Kagebot from the house eaves, through a bell temple and moon court,
to the outer hall and the next district. Nine foes: five zombies, two bears,
one ghost, one spider. No spawning waves, kill quotas, grind, boss, new mechanics,
custom level fields, or engine changes. The existing exit unlocks stage2.

Target: **2–3 minutes for an unfamiliar first-time player**, including reading
telegraphs, trying the execution loop and recovering from movement mistakes.
This is a design target, NOT measured human playfeel. The fully informed,
damage-free input route takes **51.76 seconds**, not several minutes. It makes
immediate decisions, intercepts every ranged foe and never explores/retries.
Do not inflate that number with scripted idle time or claim the pacing target
is already verified. Retiming with a first-time human remains an integration
acceptance check; fast replays are deliberately not artificially gated.

## Encounter beat map

| World x / feet y | Beat | Player decision and breathing room |
| --- | --- | --- |
| 0–1040 / 300 | Lantern approach; one zombie | Initial x100 is safe. Long clear sightline before proximity activation. Let the zombie approach, commit its windup, retreat, then use fast sword presses through the three-hit chain. No spikes, shooting enemies or other damage source in the lesson. |
| 1040–2160 / 260 | First gutter, then execution court | An 80px gutter and 40px rise introduce the second jump, with climbable recovery walls. A separate zombie teaches **two hits → weak red state → grounded dash THROUGH → turn → finish**. A third hit kills a zombie, so do not teach a three-hit *finisher* sequence on this type. Its patrol is well inside the broad roof, leaving both crossing and braking room. |
| 2160–2720 / 340 | Bell court | Drop into a quiet lower court. Stop, reset facing, then climb the short 180px bell wall. Wall contact refreshes the air jump; climb, kick away, turn back and double jump over the solid roof cap. There is floor below, not spikes or a shooter punishing the first attempt. |
| 2720–3840 / 160 | Bell keeper | First bear, alone. Observe heavy windup, back off, then **three fast sword hits → weak → dash through → turn → finish**. Patrol 3160–3480 is inset generously from both ends. The wide body is crossed completely with the current 152px dash; no controller adjustment. Clear landing/turn space after the climb. |
| 3840–4600 / 120 | Moon eaves | A 120px gutter/40px rise, then one familiar zombie. A short confidence beat after the bear, not another crowded arena. |
| 4600–5480 / 280 | Open moon courtyard | One high ghost in otherwise open air. Read the visible committed dive, then jump/intercept with sword and/or limited laser. There is no concurrent ground foe, spike strip or pit under the fight. The ordinary patrol-origin dive envelope clears the courtyard solids. |
| 5480–6120 / 200 | Garden roof and broken tiles | Climb an 80px step, dispatch a familiar zombie, then assess a 100px gap/80px rise. One small spike patch occupies a lower broken eave, not the takeoff/landing or dash runway. The full spike rectangle is within the native camera before takeoff. This is the sole spike teaser, late in the stage. |
| 6120–7000 / 120 | Outer hall keeper | Second bear applies the learned loop without mixing in ranged pressure. Successful execution can restore the charge used on the ghost. No extra health or ammo pickups assumed. |
| 7000–7960 / 240 → 40 | Silk court | One wall spider, visibly adjacent to—not inside—the tower. Bait a venom telegraph from the open court, hop onto the one-way side eave to dodge, then intercept. A light teaser for later wall fighting. The 200px climb has safe courtyard floor beneath it. |
| 7960–8640 / 120 | Departure eave | Descend, handle one final familiar sentry, then a quiet gate. No surprise boss/last-second spike. Exit x8520 is supported and reachable; scene director returns to the map with stage2 unlocked. |

The recurring zombies separate new concepts; they are not a substitute for new
encounter design. Negative space is for seeing a telegraph, stopping, landing,
turning and choosing a response. The route has no long mandatory backtrack or
waiting door. Combat is not kill-gated: a player may evade enemies on a replay,
but the acceptance route kills all nine instead of dash-skipping the design.

## Geometry, camera and art identity

- Logical viewport remains the engine's native **640×360**, with both-axis
  tracking. Level bounds are 8640px wide; safe roof/court feet bands range from
  y40 to y340. Camera limits y−220 through world bottom y380 keep the high ghost
  telegraph in frame and leave space beneath the lowest safe court. The test
  observes actual camera y from approximately −219.047 to 20.
- Twelve solid roof/court caps each sit directly on a matching full-width wall.
  Cap and wall volumes touch, never overlap. Walls are genuinely climbable;
  roof caps remain solid on sides/underside. No decorative overhang pretends to
  be a landing. The silk side eave is explicitly one-way, not an invisible solid.
- Temple roofs use `roof-center`, plaster walls `wall`, courtyard tops `stone`,
  the side ledge `eave`, checkpoint/arrival rhythm `lantern`, and the sole spike
  patch `spikes-top`. All are exact asset-contract keys, not generated substitutes.
- All six background keys are present in back-to-front order: sky, moon,
  far-mountains, distant-temples, far-clouds, near-clouds. Far clouds use
  factorX .025 / factorY .02 / driftX +3; near clouds .2 / .12 / −8. Independent
  drift is actual level data consumed by the existing renderer, not a still
  backdrop or a promise to add parallax later.
- Stage music is `stage1-approved`. No sound generation or asset spending.
- Enemy healthbars are not authored. Existing engine/renderer own the weak red
  state and actionable behind-only finisher cue. This level gives those cues
  room to work; it does not claim their final PNG depiction was inspected.

## Checkpoint rationale

These are **nonlethal pit recovery points only**, not health refills or death
saves. Original start is x100/y300. Four integrity losses restart this level
from that start with the entire roster/checkpoints/ammo reset.

- `cp-first-gap`, x920/y300: first traversal mistake need not replay the initial
  fight. Return is out of the sentry's patrol strike envelope.
- `cp-bell-court`, x2440/y340: safe lower foothold after the opening courts;
  a backward retreat into an earlier gutter returns here, not to the house.
  An ordinary failed climb lands safely on the court without taking pit damage.
- `cp-moon-gap`, x3710/y160: immediate recovery before the wider gutter, beyond
  the bear's possible patrol/strike envelope.
- `cp-broken-gap`, x5930/y200: lets a nonlethal gutter miss retry from a safe,
  supported takeoff area; no respawn on the spike shelf or in the zombie's reach.
- `cp-silk-court`, x7080/y240: last safe lower foothold for late retreat/out-of-
  bounds recovery. Missed wall climbs normally land on floor, not a hazard.

Pit recovery preserves defeated enemies and spent ammo. Death does not preserve
those advantages. This distinction is exercised with actual falls, not by
calling damage/reset functions or setting HP.

## Bounded validation and corrections

`tests/routes/stage1.mjs` constructs fresh games through `SceneDirector.setLevel`
and thereafter supplies input objects only to the real fixed-step update.
There are no player/enemy position, velocity, HP, ammo or victory mutations.
No fixture terrain, teleports, alternate tuning or enemy-disable flags.

Static checks supplement—not replace—the canonical validator: solid pairs,
roof/wall alignment, supported/hazard-free spawn bodies, full ground patrol
support, spider body clearance along its entire wall patrol, ordinary ghost
patrol-origin dive envelope, exact art keys and six background layers. Both
simulated routes check every live enemy against solids every tick and ground
support every tick. Combat/AI states, real projectiles, camera and unlock are
observed from the running simulation.

Each movement/combat phase has a finite step budget; a global 30,000-step limit
also applies. Failure prints phase, positions, velocities, HP and live enemy
states before throwing. Early failed runs were not completion evidence:

- The wall script initially consumed its second jump before contact and failed
  to reuse the actual refreshed air jump after the kick. A bounded failure
  reported x2711/y185.368. Fixed the input policy, not physics or wall solidity.
- The dash script initially checked for completion while its input was still
  buffered in hitstop. It now observes dash startup and then completion.
- A close zombie approach overshot rear execute range after the full dash.
  Start the sequence from sword-tip spacing; do not shorten the dash or widen
  the finisher. Enemy must first face the player, not begin the proof from a
  conveniently pre-existing rear position.
- Ghost home y160 allowed a straight-down ordinary dive into the y280 floor;
  raised its authored home to y80. Camera framing then clipped the top of its
  telegraph body; reduced only this level's lower camera limit. The route now
  checks its body is in view during windup.
- The first spike shelf at y380 lay below the approaching viewport. Moved the
  whole aligned shelf/wall top to y304 and spike top to y292. The native camera
  test verifies the full hazard rectangle before takeoff.
- An eager spider rush took a hit. The final input route reads the telegraph,
  uses the existing side eave to dodge the actual venom, and finishes unharmed.

## HANDOFF

Scope: only `levels/stage1.json`, this design file and
`tests/routes/stage1.mjs`. Base engine commit:
`c0adb1dcf21938416f65354192bc2677cb785dc9`. Local branch `work/kagebot-stage1`.
No engine/renderer/physics/asset-contract edits, other-level edits, delegation,
other model calls, remote writes, browser screenshots or PixelLab requests.

Fresh local commands/results on the authored data:

1. `node tools/validate-levels.mjs levels/stage1.json`
   PASS: stage1, 9 enemies, 12 walls.
2. `node tests/routes/stage1.mjs`
   PASS: geometry checks plus two fresh input-only scenarios.
   - Combat clear: **6211 fixed input steps / 51.76s**; game simulation clock
     **50.63s** (hitstop excludes time). All **9** enemies defeated, **4 HP**
     throughout, **0 retries**, **3 ammo** remaining, all **5 checkpoints**
     visited, stage2 unlocked and stage3 still locked.
   - **3 rear finishers**: practice zombie 3→4 ammo; first bear 4→4 (cap);
     second bear 3→4. Front execution refused, full body crossing verified,
     turn then eligible rear execution, repeated execution gives no refund.
   - Three-hit chain observed; zombie approach/windup/attack/recovery, bear
     windup/attack/recovery, ghost dive and spider venom state cycles observed.
     Three real lasers fired (one deliberately away from enemies to prove the
     refund), three grounded dashes, two wall contacts; no live enemy/solid
     overlaps or unsupported ground enemies in either route.
   - Recovery: **1262 steps / 10.52s**. Defeat opening foe, spend a real charge,
     activate first checkpoint, then walk off the gutter four times. First
     three falls preserve defeated foe/ammo and return to x920/y300. Fourth
     restarts at x100/y300, HP4/ammo4, all foes alive/full, no checkpoint,
     no projectiles, time0, retry count1.
3. `node --test tests/*.test.mjs`
   PASS: **26 tests, 0 failures** with the unchanged engine.

Remaining limits / integrator checks:

- No asset imports or final PNG/browser proof in this lane. Check tile clipping,
  roof lip art, lantern anchors, visible clouds, ghost telegraph framing against
  actual sprite bounds, weak red tint, hidden actor healthbars and finisher cue
  in the integrated browser. Geometry-in-frame is not artwork visibility proof.
- Run human playfeel/timing for the first-time 2–3 minute target and controller
  comfort on the two short climbs. This scripted 51.76s route cannot certify
  those subjective criteria or physical gamepad behavior.
- Ghost AI currently moves dives without solid collision. The ordinary
  patrol-origin envelope and every step of these routes are clear; shortened
  hurt recovery can start a later dive from an off-home position. Repeated,
  deliberately late interrupted dives are **not exhaustively qualified** by
  this route. Integrator should probe that engine-owned residual case before
  release; do not mistake the initial-envelope assertion for universal AI proof.
- This is local stage-data/controller evidence, not full World1 completion,
  campaign browser integration, publication or a finished-art screenshot claim.
