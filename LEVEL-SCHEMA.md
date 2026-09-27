# World 1 level contract — version 1

Ready for independent level authors. Runtime coordinates are logical pixels in a
640×360 viewport; +x right, +y down. Time seconds; velocities px/s. Player x/y is
feet center; fixed body 18×42. Rectangles use x/y/w/h (top-left), not end/right.
Fractional simulation positions are allowed; render positions snap to integers.

Each designer owns only `levels/stage1.json`, `levels/stage2.json`, or
`levels/stage3.json`, respectively. Controller fixtures under `tests/fixtures/`
are NOT campaign levels. Do not duplicate the fixture into three shipping files.
The runtime requests those exact three level paths; absent files are explicit
integration errors, never substituted with a fixture.

## Required document

- `version: 1`, `id: "stage1" | "stage2" | "stage3"`, `title: string`.
- `bounds: {x,y,w,h}`: simulation extent. All author geometry in these coordinates.
- `camera: {x,y,w,h}`: camera limits; at least 640×360. Supports vertical ascent
  with negative y and wide traversal. Camera tracks both axes with lookahead.
- `spawn: {x,y,face}`: level start, feet position; face is -1 or 1.
- `surfaces: [{id,x,y,w,h,kind,art}]`: kind `solid` or `oneWay`. Solid blocks have
  collidable top, sides and underside. One-way ledges only catch falling feet.
  `art` is world manifest key, e.g. `roof-center`; tiled, never vector-filled.
- `walls: [{id,x,y,w,h,climbable,art}]`: solid blocks; climbable boolean. Use full
  physical height, not a line. Surfaces are not climbable: explicit walls own
  wall holding/climbing. Align wall and rooftop faces; avoid overlapping solids.
- `hazards: [{id,x,y,w,h,type,damage,art}]`: type `spikes` or `pit`.
  `damage` positive integer (normally 1); `art` required on spikes, optional for
  invisible pit volumes. Spikes respect hurt invulnerability, not dash immunity;
  pits always recover to last checkpoint if nonlethal. Falling below bounds
  behaves as a one-damage pit. Lethal damage resets THIS level from original
  spawn, enemies/boss/checkpoints/ammo reset; campaign unlocks survive.
- `enemies: [{id,type,x,y,face,patrol,wallId?}]`: types `zombie`, `bear`, `ghost`,
  `spider`; x/y feet center. `patrol: {min,max}` is x range for ground/flying
  enemies, y range for spider. Ground enemies require supporting geometry all
  along patrol. Spiders require `wallId` referencing a climbable wall. Ghosts
  hover and dive through open space; allow safe telegraph and recovery room.
- `checkpoints: [{id,x,y,w,h,spawn:{x,y,face}}]`: trigger rectangle and safe return
  feet. Only nonlethal pit recovery uses checkpoints; never lethal restarts.
- `boss: null` except stage3: `{id,type:"masked-mutant-boss",x,y,face,
  arena:{x,y,w,h},trigger:{x,y,w,h}}`. Entering trigger activates boss and scene;
  arena limits its horizontal attacks. No boss in stages1/2. Gate requires death,
  not merely leaving arena. Place exit within reachable bounds after defeat.
- `exit: {x,y,w,h,requiresBoss:boolean}`: true for stage3, false for stages1/2.
- `background: [{asset,factorX,factorY,driftX,x,y,repeatX}]`: independent render
  layers, ordered back-to-front, world manifest keys. Use sky, moon,
  far-mountains, distant-temples, far-clouds, near-clouds. Clouds need different
  factors AND nonzero driftX (px/s). `x/y` are screen-relative layer origins.
- `decor: [{asset,x,y,animation?}]`: world PNG sprites anchored by manifest;
  purely visual, no collision. Use terrain art on collision shapes rather than
  covering critical edges with decorative overhangs.
- `music: "stage1-approved" | "stage2" | "stage3"`.

IDs unique within level across surfaces/walls/hazards/enemies/checkpoints/boss.
`validateLevel` in `level-schema.mjs` is the executable shape/reference check;
`node tools/validate-levels.mjs levels/stageN.json` validates authored data.
Art availability is checked separately after asset imports.

## Traversal design envelope (initial tuning; measured evidence in HANDOFF)

Run 240 px/s; grounded dash 760 px/s for 0.20s (152px unobstructed), 0.65s
cooldown; dash may leave a ledge but cannot start in air. Full jump initial
-430 px/s, rising gravity 1350, falling 1900; released jump cuts rise to -175.
Double jump -390, once until grounded/wall contact. Wall climb 110 px/s;
neutral wall grip is stationary without held direction or a time limit, including
during sword attacks. Steering away releases; wall kick away 280 and upward -410
has 0.14s forced separation. Grip ends when climbable wall contact ends.
Coyote 0.10s and jump buffer 0.12s. Allow clearance around 42px body and forgiving
landings. Teach wall regrab before spikes; use meaningful vertical elevations.
Do not design maximum-range mandatory jumps from equations alone: use the
controller fixture/measurement test and later input-only route proof.

## Asset contract

See `ASSET-CONTRACT.md`. Never put host paths, private generation/job IDs,
credentials or request logs into level JSON. Example shape lives in
`tests/fixtures/controller.json` and is clearly labelled as a diagnostic route.
