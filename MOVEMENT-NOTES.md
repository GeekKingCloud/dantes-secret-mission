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
900px/s² gravity; normal rise1350, fall1900. Wall climb110 and slide cap75px/s.
These are authored constants, not a claim that continuous equations equal the
integrated trajectory. Controller tests measure the actual integrated motion;
an exact printed apex/airtime/wall-kick report remains a handoff check.

Sword phases (startup/active/recovery seconds): .035/.10/.105,
.04/.11/.11, .065/.13/.18. Damage1/1/2, reach74/82/94px. Hitstop .035s preserves
press edges. Buffered sword input .18s; combo continuity .55s. Renderer maps
animation frames into these timing phases rather than slowing combat for art.
Final blade-frame coverage must be audited against imported PNGs.

Weak thresholds: zombie/ghost/spider1HP, bear2HP, boss6HP (boss not executable).
Only actual PNG pixels receive red tint; no enemy/boss health bars. Execute cue
requires rear position, facing target, vertical proximity, useful range and no
solid obstruction. Hurt interrupts enemy attack and leaves .55s recovery, then
.45s pursuit turning delay; attack phases commit facing. A complete input-only
bear three-hit/dash-through/turn/execute/refund test passed locally.
