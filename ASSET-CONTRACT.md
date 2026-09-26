# Runtime asset contracts

Manifest locations: `assets/characters/manifest.json`, `assets/world/manifest.json`,
`assets/ui/manifest.json`, `assets/audio/manifest.json`. Asset workers own these
paths and their contents. Runtime never synthesizes missing character/world art.
Missing manifest, sprite or animation is a visible development error.

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
alpha .22, keeping their actual PNG silhouettes quieter than the foreground.
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
and complete campaign audio acceptance remain later integration gates.
