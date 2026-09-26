# Environment/UI candidate integration

All manifest paths now use `assets/` as their base. Schema v2 has `assets` arrays with `id`, `path`, `width`, `height` and anchors. Load actual PNGs; use nearest-neighbor sampling only. No runtime integration has been performed in this lane.

## Independent gameplay layers

Draw sky, moon, far mountains, far clouds, distant temples, near clouds, then foreground architecture and actors. The native layers are separate PNGs under `world/parallax/`; never use a composed preview as a replacement for them.

| Layer | Native size | Suggested scale | Camera factor | Drift logical px/s |
|---|---:|---:|---:|---:|
| sky | 160x90 | 4 | 0 | 0 |
| moon | 64x64 | 1 | 0.025 | 0 |
| far-mountains | 640x96 | 2 | 0.12 | 0 |
| far-clouds | 320x80 | 2 | 0.055 | 2.5 |
| distant-temples | 640x128 | 2 | 0.30 | 0 |
| near-clouds | 320x80 | 2 | 0.20 | 7 |

Use `originX - cameraX * factor - elapsedSeconds * drift`, wrapped by native width times scale for repeating layers. Round final screen coordinates to integers. Exact suggested origins are in the world manifest and scene-recipes.json. Sky and moon do not repeat. Clouds have transparent margin padding; the mountainous strip uses a mirrored generated continuation. The temple strip has transparent margins and a smaller mirrored building cluster. These are explicit reuse operations, not separate generated scenes.

The near-cloud band is an ornamental Japanese rolling cloud/ribbon shape and deliberately more stylized than the far cumulus sprites. Its opacity, height and placement may need runtime tuning; the preview demonstrates both bands visibly, not final gameplay readability.

## Architecture

Accepted temple source remains `world/source/temple-facade.png`, native 512x256. Roof caps use a y=40 anchor and the 64x96 center a y=8 anchor; align those anchor heights, not image tops. Ceramic ridge ornament is decorative and must not raise the walk plane. Wall/beam/eave/stone dimensions and source rectangles remain in the manifest. Five original horizontal repeats use source-column boundary normalization. They are not universal Wang/autotile sets; vertical repeats are not claimed. Collision remains engine-owned.

Three 640x360 arrangements are supplied as stage-1/2/3 previews and scene-recipes.json: low moonlit eaves, high lantern ascent, fortress approach with spikes and portal. These reuse the same coherent Japanese architectural source and change placement, height, silhouettes and props. They are not three independently generated architecture sets.

## Scenes, portal and UI

Home, overworld and boss-arena are native 320x180 baked scene backdrops, displayed at 2x. These are separate cutscene/map/arena uses, not substitutes for the six gameplay layers. Table/candle is a 128x96 transparent prop, suggested display 64x48. Home scroll pseudo-writing was removed using neighboring generated parchment pixels.

Portal-animation.png is an eight-frame 512x64 row, 64x64 per frame, 8fps suggested loop. The unchanged input frame is excluded. Actual generated frames also exist individually. Motion is subtle energy flicker/swirl in a stationary ring, not an opening cinematic. Spikes-side is a 90-degree rotation of the generated top spikes; flip for left-facing hazards.

Map nodes, title frame, help bubble, health, ammo, selection and World 2 teaser are delivered. The home node remains a reduced facade derivative. Menu-button-frame is assembled from legitimate generated title-plaque ornament; it is not claimed as separately generated. Help bubble and menu button centers are transparent: supply a runtime dark readability scrim and crisp text. Text-safe rectangles are in the UI manifest. Actor sprites, including butler and drone, are not supplied here.

## Proof boundary

Generated sources, cloud silhouettes, map, room, table, arena and portal frames were visually inspected. The final multi-layer 2x composition was inspected and shows visible clouds, moon, mountains, pagoda silhouettes, authentic tiled roofs and the prior hero at 48px solely for scale. Other assembled stage/UI previews have not received an independent final visual review. Runtime camera motion, actual collisions, menu text layout, portal timing and browser gameplay acceptance remain parent-owned.
