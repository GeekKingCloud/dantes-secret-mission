# Runtime asset contract — v1

Manifest locations: `assets/characters/manifest.json`, `assets/world/manifest.json`,
`assets/ui/manifest.json`, `assets/audio/manifest.json`. Asset workers own these
paths and their contents. Runtime never synthesizes missing character/world art.
Missing manifest, sprite or animation is a visible development error.

PNG manifest format (characters/world/ui):

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
Static world/UI PNGs use one full-image frame and `idle` animation at fps1.
Animated world portal key is `portal-animation`, animation `idle`.

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

Audio manifest format:
```json
{"version":1,"music":{"home":{"src":"home.wav","gain":0.4,"loop":true}},
 "sfx":{"jump":{"src":"jump.wav","gain":0.3}}}
```
URLs relative to audio manifest. Music keys home, overworld, stage1-approved,
stage2, stage3, boss, victory, world2. SFX keys include sword, combo_impact, jump,
doublejump, dash, laser, venom, hurt, defeat, portal, menu, victory, bear-slash,
ghost-dive, wall-contact, help, jetpack. `gain` 0..1; PCM WAV preferred, optional
`loopStart`/`loopEnd` seconds (must fit decoded duration). Music loop explicit.
No private request logs or job identifiers in manifests. Scene engine owns track
selection and one-source lifecycle; asset import and mix audition remain later
integration work.
