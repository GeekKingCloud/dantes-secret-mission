# Stage 3 — The Mask Above the Bells

Task: Kagebot’s Secret Mission

## Design intent

The World 1 finale alternates exposed Japanese temple rooftops with three tall
bell-tower climbs, then descends through the roofline to a dedicated masked-mutant
arena. Horizontal combat asks for the fast weaken → dash through → turn → execute
loop; vertical encounters change the approach rather than adding enemy HP.

Target: roughly 3–5 minutes for first-time exploration/combat, not a measured human
playtime claim. The deterministic, omniscient route takes 88.56 seconds, including
an intentional live-boss gate inspection and observing both boss attacks. It is
not a speedrun limit, human playfeel proof, or a reason to pad the level with waits.
Fifteen substantial roofs, three major ascents, two exposed spike beds, airborne
intercepts, and a boss are the content budget; no respawning grind, collectibles,
locked kill corridors, or artificial combat timers were added.

## Authored beats

Coordinates are feet positions in the existing 640×360 logical world (+y down).

| Region | Route and purpose |
| --- | --- |
| Arrival, x0–760, y300 | Safe 96px starting position; a single zombie with room to interrupt, cross, and execute. Establish the finale's combat grammar before any gap. |
| Bear court, x880–1560, y260 | A 120px gap, checkpoint, then a broad bear duel. Laser plus sword weakening can feed a rear execution/refund. The tower itself closes the court's far side. |
| Bell tower, x1560–2020, y−160 | First 420px climb is clean: establish wall hold, upward movement and kick/re-entry across a real roof lip. A summit checkpoint precedes the zombie roof guard. |
| Spirit/ridge, x2140–3500, y−200/−160 | First overhead ghost commits its dive into a broad open roof; jump-sword intercept is different from a ground combo. The next roof offers a clearly exposed 56px spike bed followed by an isolated zombie, not a spike/enemy pileup. |
| Lower bell/venom tower, x3620–4800, y0→−500 | Drop to a wide bear court and checkpoint, then climb 500px past a wall-spider. A one-way wooden rest beam interrupts the ascent; the wall remains continuous. Sword works while climbing. Crest checkpoint leads into a separate bear duel, not an enemy on the landing lip. |
| Cloud gallery/red eaves, x4940–6100, y−540/−400 | Ghost interception on a higher roof followed by a descending jump, visible spikes and a zombie. Changing elevation and landing lengths prevents a flat combat conveyor belt. |
| Moon tower, x6100–6660, y−900 | Second sentry/beam climb applies the wall-combat lesson at the summit. Another 500px rise, safe roof crest and checkpoint; no spikes hiding at the lip. |
| Summit/descent, x6800–9160, y−900→−360 | Bear duel followed by three descending roofs: zombie, ghost, final bear. The shorter zombie roof deliberately leaves a long escape shoulder for dash inertia. Checkpoint at the start of that descent prevents repeating both tower encounters after a nonlethal miss. |
| Mask hall, x9280–10800, y−500 | The last 140px rise is a jump-to-wall, short climb and kick-over, not an impossible double-jump. Safe forecourt and final checkpoint precede the boss trigger. Dedicated continuous arena floor, then gated portal. |

Roster: 5 zombies, 5 bears, 3 ghosts, 2 spiders, plus the sole stage boss.
Zombies are quick execution opportunities; bears justify multi-hit chaining and
wide dash clearance; ghosts force aerial timing over open landing space; spiders
make ascent an active sword/venom encounter instead of a long uninterrupted hold.
Ground patrol limits remain fully supported and avoid spikes. Spiders attach to
named climbable walls, with their 28px bodies outside the wall solids. Ghosts sit
196px above their roofs, preserving free dive space rather than spawning in art
or diving immediately out of a floor.

## Geometry, art alignment and camera

- World bounds: `{x:0,y:-1240,w:10800,h:2140}`.
- Camera bounds: `{x:0,y:-1240,w:10800,h:1980}`. Native viewport remains 640×360;
  the real SceneDirector/Camera follows both axes. The route exercises camera y
  from 76.80 to −1236.59 and player feet from 300 to −1020.69.
- Each roof has 16px solid left/center/right caps; an explicit full-width wall
  begins exactly at the caps' underside and continues to y700. No solid overlap,
  floating collision line, disconnected art ledge, or procedural terrain fallback.
- 45 roof-cap surfaces, 15 climbable wall solids and 2 one-way beam surfaces.
  Roof caps use `roof-left`, `roof-center`, `roof-right`; walls use `wall`; resting
  beams use `wood-beam`. Lanterns provide architectural accents without collision.
- Eleven gap-specific pit volumes begin 220px below the lower adjoining roof.
  Missing a jump allows a real wall regrab before recovery; no invisible damage
  volume crosses an intended roof or ascent. Falling below world bounds retains
  the engine's standard pit behavior.
- Two 56×16 `spikes-top` beds sit exactly on roof tops at x3170 and x5770. Each has
  a clear approach/landing and no overlapping patrol. Both are jumped with ordinary
  held jumps in the route. Spike/art readability is still a browser acceptance item.
- Five background entries remain: sky, moon, far-mountains, distant-temples,
  near-clouds. Repeated far clouds were removed after playtest; source art stays.
  Near clouds retain factors .32/.06 and drift −11, clamped above play by renderer.
- `boss-arena` is a decorative centerpiece at (10000,−500); the collision remains
  the ordinary continuous roof/wall construction. Parent must inspect its actual
  anchor/size and edge occlusion when the manifest arrives.

## Checkpoints and failure policy

Checkpoints are recovery points, not saves or free heals. Nonlethal pits preserve
combat progress and ammo; lethal damage resets this entire level, including boss,
enemies, ammo and checkpoint. Nothing here overrides that engine policy.

| Checkpoint | Safe feet | First touch in scripted route | Rationale |
| --- | --- | --- | --- |
| court-rest | 960,260 | 3.56s | First gap recovered without repeating the starting duel. |
| bell-rest | 1660,−160 | 10.89s | Preserve the clean climb before ghost/spike roofs. |
| lower-rest | 3700,0 | 25.23s | Begin the lower court/tower sequence on a full roof. |
| tower-rest | 4370,−500 | 33.58s | Reward the venom ascent before the next elevated circuit. |
| moon-rest | 6210,−900 | 50.43s | Protect summit traversal after the second sentry. |
| descent-rest | 7565,−720 | 57.39s | Recover the descending chain without repeating the summit. |
| mask-rest | 9420,−500 | 72.03s | Stable forecourt before any boss activation. |

Maximum measured interval between checkpoint touches is 16.85 seconds on this
scripted route; a first-time player will take longer. Safe spawn body/support and
hazard separation are asserted, not inferred from checkpoint labels. There is no
checkpoint in a pit, inside a solid, on a spike or in the boss trigger. No normal
completion-route damage or checkpoint warping is used to bypass a traversal.

## Dedicated boss and exit

- Boss: `masked-shadow`, `masked-mutant-boss`, feet (9990,−500), initial face left.
- Arena: `{x:9600,y:-820,w:840,h:320}`; floor y−500. Boss horizontal movement stays
  inside it. The wider physical roof spans x9280–10800, leaving 320px before and
  360px after the arena. No entrance fall, spikes, extra enemy or narrow ledge.
- Trigger: `{x:9640,y:-650,w:880,h:150}`. The final checkpoint at x9420 is outside it.
  The hero can approach the visible boss over solid ground; there is room to back
  away from windup, cross the body with the existing 152px ground dash, and brake.
- Camera uses the supported global tracking bounds above, not an invented
  per-arena camera-lock field. The 840px-wide arena scrolls within the 640px view.
- Exit: `{x:10520,y:-580,w:64,h:80,requiresBoss:true}`. Its physical space can be
  visited while the boss lives, but cannot award victory or display the unlocked
  portal. The route enters it before killing the boss and asserts the denial,
  returns to kill the boss with ordinary sword/laser damage, and re-enters to win.
- The existing SceneDirector then completes stage3, returns to the map with the
  portal selected, and accepts confirm into `world2`. No World 2 level is authored.
- No healthbar configuration or renderer edits. The current engine's weak flag
  and rear-finisher rule remain intact. Boss is deliberately not executable by
  the finisher API; normal attacks/laser kill it, while roster executions fuel ammo.
  Both slash and burst are observed before the kill; no boss HP/phase overrides.

## HANDOFF

Authored against controller/schema baseline `c0adb1d`.
Owned files only: `levels/stage3.json`, `levels/stage3-DESIGN.md`,
`tests/routes/stage3.mjs`. No engine, physics, renderer, scene, asset contract,
other-level or shared-test changes. No models delegated, remote writes, PixelLab
requests, generated artwork, secrets, or browser screenshots.

Fresh verification against the unmodified engine:

1. `node tools/validate-levels.mjs levels/stage3.json` — PASS; schema/reference
   validator reports stage3, 15 enemies, 15 walls.
2. `node tests/routes/stage3.mjs` — PASS; 10,627 fixed 1/120s input frames, 88.56s,
   HP4, ammo3, zero retries/damage, all 15 ordinary enemies + boss defeated, all
   seven checkpoints visited, World 2 tease reached through the scene API.
   Also passes geometry/live-overlap checks, vertical camera tracking, 10 rear
   executions (weak/front refusal/dash clearance/refund), both boss attack states,
   live-boss exit denial, ghost/spider attacks, and safe zombie/bear AI retreat.
   Fresh-input replay proves three nonlethal falls preserve the defeated roster,
   boss and ammo; a fourth resets original spawn, HP4/ammo4, roster and checkpoint.
3. `node --test tests/*.test.mjs` — 26 passed, 0 failed, 0 skipped. The repository's
   glob does NOT include `tests/routes/stage3.mjs`; run that command separately.
4. `git diff --check` — PASS.

Proof uses only public initializers and input updates: no teleports, actor/HP/ammo
assignments, direct damage helpers or saved-state injection. Every loop is bounded
(36,000 main ticks; per-beat limits); obstructions print coordinates/enemy state.

Observed descent dash overshoot was repaired by moving this level's guard patrol
left and repositioning its checkpoint. The final 140px rise was proved by wall
climb/kick, not a controller change. Final route has no unintended pit recovery.

Remaining integration limits:

- First-time duration/playfeel is unmeasured; this state-aware bot is not a human.
- No finished-art/browser, physical-controller, touch or audio-mix proof. Inspect
  high ghosts near the upper camera edge, spider attachment, roof/spike silhouettes,
  boss-art anchor, visible cloud drift, animation/hitbox agreement, red weakness,
  rear-only prompt and absence of actor healthbars after asset integration.
- Full-HP boss defeat is legitimate, not a balance claim: fast repeated swords can
  interrupt it. Boss resistance/phase tuning belongs to the integrator.
- Cherry-pick owned files only; rerun all three commands after intersecting engine
  changes. This handoff authorizes no publication and supplies no fake screenshot.
