# Controller rationale and provenance

Original JavaScript implementation; no third-party game code or franchise art copied.

Primary research read:
- Maddy Thorson, Celeste & Forgiveness:
  https://mattmakesgames.com/articles/celeste_and_forgiveness
  Describes coyote grace, pre-landing buffering, lower peak gravity and forgiving
  wall-jump windows. This controller uses explicit short timing windows and a
  smaller gravity band near the apex, without reproducing Celeste's code.
- Maddy Thorson, Celeste & TowerFall Physics:
  https://www.maddymakesgames.com/articles/celeste_and_towerfall_physics/index.html
  Explains fixed AABBs and axis-separated collision. This implementation uses
  continuous coordinates and swept axis clamps, not the article's pixel loop.
- Justin Stander interview, reported by Steven T. Wright:
  https://www.redbull.com/us-en/katana-zero-developer-justin-stander-interview
  Supports the contrast between quiet narrative and frenetic action, not exact
  attack/dash timing constants. No timing values are attributed to that source.

Ninja Gaiden / Mega Man / Symphony of the Night are qualitative references only;
no source-verified numeric reproduction is claimed.

Units: logical pixels, seconds; simulation fixed at 120Hz. See FEEL in
player-controller.mjs for authoritative constants. Native viewport 640×360.
Nominal run 240px/s, dash760px/s for .20s (152px unobstructed), cooldown .65s.
Dash starts only grounded, may carry off a ledge, has .20s enemy iframes. Spikes
still hurt; jump cancels dash and its iframes. Walls interrupt movement; enemies
never become physical dash blockers. Hurt cancels attacks/dash. Ground dash
cancels sword, including recovery; no unsolicited air-start dash buffer.

Jump rise430px/s; double390; wall kick280px/s away /410px/s up, .14s separation.
Coyote .10s; buffer .12s; released rise capped175px/s. Apex band ±45px/s uses
900px/s² gravity; normal rise1350, fall1900. Wall climb110px/s; neutral wall
contact arrests both rise and fall, without holding toward the wall or a time limit.
Releasing climb stops vertical motion immediately, including during sword attacks.
Steering away, wall kicks and hurt retain their existing movement/separation;
the 75px/s contact fall cap applies only while disengaging or hurt, not to a grip.
Grip is checked against current climbable geometry each step, never latched in air.
After leaving contact, a separate .10s wall-jump grace remembers the last side:
an away-then-jump press still kicks and preserves the subsequent air jump.
This memory never holds the body, expires without contact, and is consumed by
jumping or cleared by landing, hurt, checkpoint return and reset. Kick lock
cannot refresh it; another wall jump requires fresh usable contact.
These are authored constants, not a claim that continuous equations equal the
integrated trajectory. `node tools/measure-movement.mjs` exercises the actual
fixed-step controller on diagnostic geometry, without rewriting any constants.

Measured at 1/120s per step (positive height means rise above starting feet):

| Motion | Height/distance | Timing |
| --- | --- | --- |
| Full held jump | 66.9375px apex | apex .325s / 39 steps; airtime .625s / 75 steps |
| Short hop, held 3 steps then released | 20.8125px apex | apex .150s / 18 steps; airtime .300s / 36 steps |
| Unobstructed active dash | 152px | .200s / 24 steps |
| Neutral braking after dash | total start-to-rest 236.375px | additional .233333s / 28 steps |
| Wall kick, first integrated step | vx −280px/s, vy −398.75px/s | after 1/120s (gravity already applied) |
| Wall kick, hold toward departure wall | 37.333333px away, 41.916667px rise | .133333s / 16 steps |
| Steer to opposite wall after those 16 steps | 61.958333px away, 57.604167px rise | regrab at .233333s / 28 steps |

The dash's 152px is its active segment, NOT the final neutral stopping distance:
existing post-dash velocity brakes afterward. The rear-execute proof turns and
executes promptly inside the committed-facing window. No tuning was changed.
Full precision and measurement assumptions are emitted as JSON by the tool.

Sword phases (startup/active/recovery seconds): .035/.10/.105,
.04/.11/.11, .065/.13/.18. Damage1/1/2, reach74/82/94px. Hitstop .035s preserves
press edges. Buffered sword input .18s; combo continuity .55s. Renderer maps
animation frames into these timing phases rather than slowing combat for art.
Final blade-frame coverage must be audited against imported PNGs. Fresh tests
prove both early follow-up presses buffer while the prior strike is still running,
queued strikes start without an idle gap, and recovery cancels immediately to
dash at 120/144/240Hz. Chromium repeats the input-only sequence with actual
keyboard events and 240Hz render updates; the first no-step frame retains each
sword edge. Touch is independently tested through real CDP touch events.

Weak thresholds: zombie/ghost/spider1HP, bear2HP, boss6HP (boss not executable).
Only actual PNG pixels receive red tint; no enemy/boss health bars. Execute cue
requires rear position, facing target, vertical proximity, useful range and no
solid obstruction. Hurt interrupts enemy attack and leaves .55s recovery, then
.45s pursuit turning delay; attack phases commit facing. A complete input-only
bear three-hit/dash-through/turn/execute/refund test passed locally.
