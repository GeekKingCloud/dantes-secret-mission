# Stage 2 — Bellwind Ascent

## Intent and ownership

Japanese temple roofs rising through four bell-tower courtyards into the moonlit
cloud layer. Platforming owns the rhythm; isolated mutants interrupt movement,
not a compulsory kill quota. No boss. The existing scene director unlocks stage3
when this stage's exit is reached.

Only `levels/stage2.json`, this document, and `tests/routes/stage2.mjs` belong to
this change. Engine/controller/renderer/contracts remain exactly at c0adb1d.
No asset generation, placeholder graphics, secrets, remote writes, or other
stage edits. Artwork references use the published asset contract, not presumed
files or dimensions.

## Route and deliberate beats

| Beat | Feet elevation | Geometry / decision |
| --- | --- | --- |
| Gate courtyard | 300 | Safe starting roof, one zombie, space to weaken/dash through/turn/execute. Walk under the anchor's 96px-high entry arch. |
| Primer shaft | 300 to -120 | 160px clear shaft. Plain right-to-left-to-right regrabs first, without enemy pressure. Then leave the right wall below its first spike strip, ascend the opposite wall and jump over the spiked exit lip. Catch floor below; a missed practice transfer is not instant damage. |
| First bell terrace | -120 | Broad roof checkpoint, one zombie, then a 120px ravine. The first real drop comes after the technique was demonstrated. |
| Venom shaft | -120 to -760 | Alternating strips deny holding up on one wall. One spider on the left face invites a laser from the right wall, then a real regrab and sword at close range. It is not embedded in masonry or spikes. |
| Middle terrace / ravine | -760 | Refill opportunity via a zombie finisher. A high ghost telegraphs a dive across the next 120px gap; move under/past its committed target rather than waiting in the dive lane. |
| Open belfry | -760 to -1600 | Shaft widens to 208px. Kick, frontflip in open air, regrab; alternate above four side strips. A mid-height beam catches descending feet. The high exit uses a longer leap and a deliberately shortened 32px spike cap, not a maximum-range landing. |
| High bell roof | -1600 | Second ghost above an open terrace, no accompanying walker. Space to watch its telegraph, recover, then take the third 120px gap. |
| Crown climb | -1600 to -2640 | Taller 160px shaft combines alternating strips and a right-wall spider. Two rest beams divide the climb. The familiar narrower transfers let the player concentrate on attack timing rather than introduce a new precision demand. |
| Summit | -2640 | Broad safe checkpoint, last single zombie, then the exit. No boss or hidden enemy-count lock. |

The ascent is 2,940 logical pixels, not a set of shallow roof steps. Four tall
left anchors have continuous visible outer-side spike seals and capped tops;
the safe route runs between them and the right walls. Inner strips alternate
vertically, so continuous same-wall climbing meets a real hazard. Roof slabs
are 18px deep, with side walls starting exactly underneath. Solid bodies do not
overlap. Rest beams are explicit one-way wood ledges, not visual fake floors.

The deterministic route makes 16 actual wall-to-opposite-wall transfers (five
with an airborne frontflip in the wider belfry), plus four wallkick/flip exit
leaps. It climbs above obstruction before transferring back. Ordinary narrow
transfers do not require a double jump. There are no timers, grind waves, locked
combat doors, or forced idle delays.

First-time pacing target: roughly 2–4 minutes to read the ascending route,
practice transfers and resolve the sparse encounters. This is a design target,
NOT measured human playtime. The knowledgeable input runner completes in 51.84
seconds of input steps (51.22 simulation seconds excluding hitstop). Human
playtest must establish whether discovery/recovery yields the intended several
minutes without padding. Do not market the target as a verified duration.

## Checkpoints and recovery

Seven checkpoints: four broad exit terraces, the belfry rest at y=-1190, and
crown rests at y=-1990 and -2390. Lantern references mark their intended positions.
The belfry catch introduces a resting place before the final long climb. Crown's
lower rest is below the spider's patrol band, with its return point set away
from the occupied wall; the upper rest prevents a late slip from wasting the
entire tower. Every return body fits clear of geometry/hazards/initial enemies,
has full supporting width, and has at least 60px separation from same-height
zombie patrol ranges.

A missed wall transfer can fall to a beam or the entry roof; no damage is added
just for missing a regrab. The three ravine pit volumes sit below visible open
roof gaps. Nonlethal pits use the last checkpoint without resetting defeated
enemies. Lethal damage restarts the entire stage, clearing checkpoint/enemy/ammo
progress, exactly as the unchanged simulation specifies. Checkpoints do not heal
or replace the lethal retry rule.

## Combat, visuals and camera

Four zombies, two spiders and two ghosts; no bears and no boss in this
platforming-focused stage. The route demonstrates wall-held laser and sword
attacks, real venom volleys and ghost dives, and four ground dash-through / turn /
rear finishers. Weakness uses the engine's weak flag; this level adds no enemy
healthbars, UI, timing rules or combat overrides. A fresh-input branch also
provokes and evades a zombie's approach/windup/attack/recovery cycle.

Five backdrop entries are ordered sky, moon, far-mountains, distant-temples,
near-clouds. Repeated far clouds were removed after playtest; source art stays.
Near clouds drift -8px/s at .25/.016 and stay above play at the ascent crown.
Small vertical parallax factors retain the distant
Japanese temple horizon throughout the long climb. Foreground uses roof-center,
wall, wood-beam, spikes-top/side, lantern and roof-ridge contract keys. Decorative
ridges sit within terraces, not over critical landing edges. Music key: stage2.

Camera uses the real 640×360 director/controller. The proof measures 2,936.80px
of vertical camera travel. This is numeric tracking proof, not proof of finished
art, visible cloud pixels, animation readability or controller playfeel.

## Concrete iteration evidence

- The widened belfry's original 48px exit cap caught the early-flip route at
  x=2614.96, y=-1615.49. The bounded runner reported damage instead of looping.
  Its exit now gives a 90px launch-height allowance and a near-apex frontflip;
  the owned cap is 32px wide for landing margin. All four cap leaps pass at the
  nominal second-jump timing and 50ms either side. No physics change was used.
- Spawn-clearance review moved the crown lower beam/return away from the spider
  band and moved the middle terrace return left of its zombie patrol. Final
  static checks enforce clear, fully supported return bodies and enemy spacing.
- Input edges during hitstop are actually queued by the engine: the runner waits
  for real dash/kick activation, not an assumed immediate state transition.
  Final replay uses only recorded inputs from a fresh constructor.

## HANDOFF

Authored against controller/schema baseline `c0adb1d`.

Fresh local checks on this candidate:

- `node tools/validate-levels.mjs levels/stage2.json` — PASS: stage2, 8 enemies,
  8 climbable walls. Exact existing validator; no schema extension.
- `node tests/routes/stage2.mjs` — PASS: 6,221 input steps; 51.2166666666644
  simulation seconds; HP 4, ammo 4, retries 0. All 7 checkpoints activated,
  16 opposite-wall transfers, 5 wide-shaft flips, all 4 cap leaps, and exit.
  Fresh replay produces identical position/HP/ammo/time and victory.
- Same route test — PASS: solid-pair separation, bounded geometry, full supported
  ground patrols, spiders flush outside assigned walls with clear patrols,
  safe return points, contract asset keys and independent cloud configuration.
  Every primary-route tick checks player/spike separation (including immunity
  windows) and live enemy/solid separation, not merely HP or JSON parsing.
- Same route test — PASS: 12 fresh-prefix cap timing branches (nominal and
  +/-50ms), three nonlethal pit returns preserving defeated enemies, fourth
  lethal pit resetting original spawn/full enemies/HP/ammo/checkpoint; climb-only
  negative control hits the actual strip; zombie attack evasion; actual stage2
  completion through SceneDirector unlocks stage3.
- `node --test tests/*.test.mjs` — PASS: 26 tests, 0 failures, 0 skipped.
  The route command above is separate from this glob and must also be run.
- Engine/controller/renderer/schema/contracts diff against c0adb1d — empty.

Remaining integration limits: asset manifests/images/audio have not been loaded
or rendered by this worker; no final screenshot/browser asset proof is claimed.
Human first-time duration, camera composition at spike decisions, touch/physical
pad comfort, actual cloud visibility, animation/weak-tint/finisher cues and audio
remain parent integration/playtest gates. Geometry/AI proof covers the authored
patrol ranges and observed deterministic trajectories, not every possible player
bait position. Do not treat the route pass as publication acceptance or as an
exhaustive no-speedrun-bypass theorem.
