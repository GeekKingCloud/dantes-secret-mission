# Runtime asset contracts

Manifest locations: `assets/characters/manifest.json`, `assets/world/manifest.json`,
`assets/ui/manifest.json`, `assets/audio/manifest.json`. Actor workers own their
named atlas directories and source manifests; the integrator assembles the single
canonical character manifest. Runtime never synthesizes missing character/world art.
Missing manifest, sprite or animation is a visible development error.

## Canonical character assembly

Run `node tools/assemble-characters.mjs assets/characters/hero-manifest.json assets/characters/enemies-manifest.json`
with each explicitly accepted source manifest as a separate argument. This is
the only assembly mechanism. It preserves schema-v1 actor metadata and rejects
duplicate actors; every source and PNG path is relative to `assets/characters`.
Runtime reads only `assets/characters/manifest.json`, never a second reader or
action alias.

The revised hero source is `5e4443b69e43a8dd4ef5e534d73fdfa4c633eb2b`:
Kagebot 18 actions / 72 native frames, butler 2 / 5, drone 2 / 5. Hero cells are
192×128 at feet [64,104], not rescaled. Enemy source
`e431a6eb875f55c70f64895de59820d3a1676a27` adds 29 actions / 201 native actor frames.
The complete assembly has eight actors / 51 required actions; runtime requires
all of them. Missing data still fails explicitly, never substitutes an idle pose.
The older isolated hero-layer diagnostic deliberately excludes enemy drawing;
it is not the full-actor shipping campaign proof.

Sword timelines retain 20 slots / seven physical poses. Production renderer maps
startup/active/recovery to their corresponding slots without changing the
.240/.260/.375-second combat durations. Wall grip uses native frame bounds to
place the furthest hand pixel on the existing body contact; collision is unchanged.
Opening departure uses a shared native hand/rail point, not independently moving
hero/drone tracks. Source cutout frontflip frames are played without redesign.
Revised hero gauntlet [73,61] and drone rail [34,54] are stable native contact
points; runtime subtracts the actual manifest anchors. One 40-column physical
blade/hilt is carried through all strikes, with darker cyan air-cuts showing the
74/82/94-pixel gameplay reach. No limb, blade or collision rescaling.

Enemy `combatPhases` contain eight explicit windup/active/recovery tracks.
`enemy-animation.mjs` selects each subrange from state elapsed time, including
interrupted recovery, rather than restarting a whole action sheet. Defeat plays
after simulation death without damage or repeat rewards. Spider `projectileVisual`
loads the real three-frame venom sheet; attachment root[32,48]/wall x10 fixes
claw position, while emission is enemy+(face×16,-23). Ghost damage remains moving
30×35 contact, and boss burst is 330px/s melee. No enemy health bars.

## Actor atlas contract (unchanged v1)

PNG manifest format for `characters` only:

```json
{
  "version": 1,
  "assets": {
    "kagebot": {
      "src": "kagebot.png",
      "width": 1024,
      "height": 256,
      "frameWidth": 128,
      "frameHeight": 64,
      "columns": 8,
      "anchor": [48, 58],
      "animations": {
        "idle": {"frames": [0, 1], "fps": 6, "loop": true},
        "sword-1": {"frames": [8, 9, 10], "fps": 16, "loop": false, "anchor": [48,58]}
      },
      "provenance": "Original character; generated pixel-art source, artist cleanup"
    }
  }
}
```

Example metadata only, not an asset claim. `src` is relative to its manifest,
PNG only, no absolute URLs/paths or `..`. Width/height are actual PNG dimensions;
all frames uniform within an asset; row-major zero-based index. Frame and atlas
dimensions integral; columns equals width/frameWidth. Anchor is feet/body origin
in pixels, can be overridden per animation. Frame sizes generally64×64; bear96,
boss128; use wider frames for blade reach (never invisible long attacks).
No renderer downscaling to force artwork into64. Native logical pixels,
nearest-neighbor, integer destination alignment; mirroring around anchor.
World/UI now use the accepted environment schema below, not this actor format.

Character keys/animations:
- kagebot: idle, run-low, jump-rise, fall, frontflip, wall-hold, wall-climb,
  wall-jump, dash, sword-1, sword-2, sword-3, laser, hurt, finisher, meditate,
  startled, drone-depart.
- zombie: idle, walk, attack, hurt, defeat.
- bear: idle, walk, slash-windup, slash, hurt, defeat.
- ghost: hover, dive-windup, dive, hurt, defeat.
- spider: wall-idle, climb, venom-windup, spit, hurt, defeat.
- masked-mutant-boss: idle, move, windup, slash, burst, hurt, defeat.
- robot-butler: idle, eyes-widen. jetpack-drone: idle, boost.

World keys: sky, moon, far-mountains, distant-temples, far-clouds, near-clouds;
roof-left, roof-center, roof-right, roof-ridge, wall, wood-beam, eave, stone,
spikes-top, spikes-side, lantern; home-interior, table-candle, overworld,
boss-arena, portal-animation.
UI keys: title-frame, map-node-home, map-node-stage, map-node-locked,
map-node-complete, help-bubble, health, ammo, selection, world2-tease.
Text rendered by canvas/HTML is allowed; actor/terrain vector fallback is not.

The production world manifest explicitly requires the thirteen native terrain
modules preserved under `world/terrain/polish-pilot/`: `pilot-roof-{left,center,right}`,
`pilot-beam-{left,center,right}`, `pilot-facade-{fill,left,right,band}` and
`pilot-stone-{fill,top,corner}`. All are 16×16 except the 16×8 beams; scale is 1.
The source directory name records provenance, not an alternate runtime layer.
Renderer material selection uses the existing level art/kind fields, clips to
mechanical rectangles, and caps contiguous roofs only at exterior ends. Native
shoji-window art is sparse recessed decoration on broad walls. A translucent
shadow tint keeps facade detail behind actors; it never supplies missing art.
World and UI together have 57 assets. Inventory tests check module metadata,
PNG dimensions, preserved source hashes, unique IDs, and missing-module errors.

Combat depiction: player body18×42 with feet origin. Sword1 reaches74px forward,
sword2 82px, sword3 94px, starts 6px behind feet, vertical band y-43..y-5.
Blade/effect frames must visibly cover these ranges and keep feet stable.
Wider atlas frame with anchor near one side supports this, flipped at runtime.
Gameplay collision remains fixed regardless of sprite transparency.

## Accepted world/UI production contract (schema 2)

The immutable environment import is `30e3a3c6ee6b9a632bd2362918d0e34c3b8dcb28`.
Its manifests are preserved byte-for-byte, with `schema_version: 2`,
`path_base: "assets/"` and an `assets` array. Each entry uses `id`, `path`,
`width`, `height`, `anchor`, optional `display_scale`, `opaque_bbox` and
`text_safe_rect`. `width`/`height` are authoritative; the older descriptive
`size` fields are ignored, not accepted as an alternate format. URLs resolve
from the assets root. No legacy object-map or `file` aliases are supported.

Animated `portal-animation` uses `frame_width`, `frame_height`, `frame_count`,
`fps`, `loop`; it normalizes to the renderer's `idle` animation. Static PNGs
are single frames. Nearest-neighbor scale is explicit, including 2x scene
backdrops, 4x sky and half-size table/candle. Actor sprites keep native scale.
PNG dimensions are checked on decode. Missing assets never become vector art.

Level background factors/drift remain designer-owned schema v1. Renderer uses
the delivered display scale and puts near-clouds high at at most y=-35 with
alpha .22. Dense distant mountains/temples use .4/.5 opacity so their texture
does not compete with small native actors or imply foreground collision planes.
Rooftops are anchored single rows above full walls. Hazard opaque bounds fit
the authored hazard rectangle; art never changes collision geometry.

## Accepted audio production contract (schema 1)

`assets/audio/manifest.json` is authoritative and preserved unchanged:
`schema_version: 1`, `paths_relative_to: "assets/audio"`, `music` and `sfx`
object maps, entry `file`, `frames`, `sample_rate`, `channels`, `pcm_bits`.
Music has explicit `loop` and end-exclusive `loop_start_frame` /
`loop_end_frame_exclusive`. Markers are converted to seconds at runtime using
the source sample rate. The earlier `src`/`version`/camelCase example is retired;
no compatibility reader is provided. Rich provenance and production metrics
remain in the imported manifest.

Ten music entries: home, overworld, stage1-approved, stage2, stage3, boss,
victory, world2, help, jetpack. Help/jetpack are non-looping intro stings, not
SFX filename aliases. Victory music replaces map music until its actual end;
the shorter SFX victory confirms checkpoint entry, never stacked on completion.
All nineteen SFX have event routes, including spider/boss windup,
venom impact, and separate portal reveal/traversal.

Runtime starts at manifest music/SFX gains .65/.8 with master .68 and a dynamics
compressor. Voices are bounded to eight plus one music source. Music is decoded
on demand; short cues preload after gesture unlock. Separate mutes use bus gain;
both-muted, pause and hidden-tab states suspend the actual context. Resume keeps
the existing source/position. Non-looping music never repeats once per frame.
The stage1-approved WAV remains byte-identical. Human mix/phone-speaker audition
is an untested limitation, not a new release gate. Shipping proof exercises real
scene music, gesture start and pause/resume; see HANDOFF for current evidence.
