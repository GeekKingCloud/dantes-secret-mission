# Kagebot’s Secret Mission

A fast, non-gory robot-ninja action platformer. This checkout contains the full
World 1 campaign: a skippable home opening, unlockable overworld, three distinct
authored stages, four enemy types, an original masked mutant boss and the portal
to **World 2 — Coming soon**. World 2 is a teaser, not a playable level.

Run `python3 -m http.server 8000` from this directory and open
`http://localhost:8000/`. No build, login, runtime credentials or external service
is needed. All PNG atlases, PCM audio and licensed fonts are local. Deployment
status is separate from this local checkout; see [HANDOFF.md](HANDOFF.md) for
candidate verification and review boundaries.

## Play

A/D or ←/→ move; W/↑ climb; Space jumps, double-jumps into a frontflip, or kicks
away from a wall. J buffers the three-strike sword combo; K starts a grounded
dash and can cancel attack recovery. L fires a limited laser. F executes an
eligible weak enemy from behind and refunds one charge, capped at four. Weak
enemies turn red; the rear/in-range cue tells you when execution is available.
Enemy health bars are intentionally hidden. The boss does not require a finisher.

Enter confirms menus/skips the opening; Esc/P pauses. Standard gamepad: stick or
D-pad moves/climbs, A/Cross jumps/confirms, X/Square swords, B/Circle dashes,
Y/Triangle lasers, RB/R1 executes, Menu/Options pauses. Touch buttons remain
alongside the visible viewport. Four integrity units, unlimited retries: a
nonlethal pit returns you to the current checkpoint; lethal damage resets the
current level, not completed stages. Completed stages can be replayed from the map.

The shared native hero model retains one hood/armor/scarf and physical katana.
Darker cyan air-cuts depict the combo's longer reach without lengthening the
metal blade. Art is authored cutout animation on PNG atlases, drawn nearest-neighbor.
Physics and fixed hit/hurt shapes are independent of sprite alpha. Enemy attacks
use explicit windup/active/recovery tracks, including both normal/enraged boss
patterns. Music starts on player gesture and respects pause, mute and visibility.

## Verification and development

`node tools/shipping-smoke.mjs /path/to/private/evidence` exercises the actual
`index.html` loader, actors, renderer, audio, input transports and full campaign.
It also records normal-speed opening/combat/boss clips and explicitly labeled
focused enemy QA. There are no state/HP/position shortcuts in the campaign replay.
Keyboard, browser-emulated touch and simulated standard-pad evidence is not a
physical hardware or human timing/audio-audition claim.

`tests/hero.html` is an isolated hero-layer diagnostic: simulated enemies are
deliberately not drawn. `tests/levels.html` is an actor-free scenery diagnostic.
Neither substitutes for shipping campaign proof. Canonical actor assembly is
documented in ASSET-CONTRACT; there is one runtime manifest reader.

Start a local static server, then open `tests/controller.html` for the explicitly
labelled controller/collision lab, or `tests/controller.html?scenario=combat` for
the combat lab. Diagnostic rectangles are NOT final artwork or campaign levels.
The shipping `index.html` never imports these fixtures.

`tests/media.html` exercises the delivered environment/UI and real Web Audio
through production modules with NO actors, clearly labelled NOT FINAL GAME.
Its controls use the shipping DOM/CSS and input handlers. Run
`node tools/media-smoke.mjs /path/to/private/evidence` for PNG/parallax, portrait
and landscape no-scroll touch layout, and real gesture/PCM lifecycle proof.
This is not campaign traversal or actor-animation acceptance.

Contracts: [LEVEL-SCHEMA.md](LEVEL-SCHEMA.md),
[ASSET-CONTRACT.md](ASSET-CONTRACT.md). Current checkpoint:
[HANDOFF.md](HANDOFF.md). Rationale: [MOVEMENT-NOTES.md](MOVEMENT-NOTES.md).
Run `node --test tests/*.test.mjs`; browser smoke command is
`node tools/browser-smoke.mjs /path/to/private/evidence`.
See HANDOFF for actual executed versus pending proof; commands alone are not
claims that the current candidate passed.

## Provenance and history

[GAME-DESIGN.md](GAME-DESIGN.md) describes the current campaign and mechanics.
The original cover, prototype sources, tests, asset provenance and licenses are
preserved. The older single-rooftop/vector prototype is not the current shipping
renderer; its historical screenshots should not be presented as this build.
