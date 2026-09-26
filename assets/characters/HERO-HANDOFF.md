# Kagebot hero consistency correction

Status: revised asset candidate preserved for parent visual review and integration. NOT accepted in-game consistency. The bounded stage ended before a final exhaustive visual review of the revised timed-playback film; do not treat mechanical passes as visual acceptance.

## Changes and invariants

All 18 hero actions required costume/accessory correction: idle, run-low, jump-rise, fall, frontflip, wall-hold, wall-climb, wall-jump, dash, sword-1, sword-2, sword-3, laser, hurt, finisher, meditate, startled, drone-depart. There are 72 hero physical frames; support actors remain unchanged (22 actions / 82 physical frames overall).

The old inventory showed differing torso widths and armor segmentation across generated poses, larger cape-like tails in aerial actions, inconsistent scarf visibility, and different physical sword lengths. The repair uses shared native-pixel parts cut from the existing generated slim C-derived source, with nearest-neighbor rotation and native cleanup rather than unrelated regeneration. Hood/visor, narrow segmented chest, upper arms, gauntlets, thighs, shins and boots now share one source/palette. One neck collar carries two narrow cloth tails; it is not a cape. All actions now use that model. These are authored cutout/composite poses, not newly generated unique animation frames.

Canonical reference: kagebot/model/model.json and the individual native part PNGs in kagebot/model/. These preserve the locked palette and physical weapon reference. The blade has 40 native columns in its unrotated source; the same sword/hilt is rotated, never lengthened for an attack. Carried poses show its dark scabbard; equipped poses omit the scabbard entirely, avoiding a duplicate hilt. Arm and torso parts are not stretched to meet combo endpoints.

## Reach and integration

The 74/82/94px extents are now explicit visible AIR-CUT extents, not claims about physical katana length. A separately generated native-pixel crescent is cropped/cleaned without resizing, color-separated from the brighter physical katana, and composited behind the weapon during active poses only. The manifest describes this distinction. Physical reach varies naturally with body/arm/sword angle; the air-cut provides the farther visible extent. No collision ranges or player physics were changed.

Attack durations remain .240/.260/.375 seconds, retaining the existing phase-weighted 20-slot mappings over seven physical poses. Weapon artwork is present through startup, active poses and recovery. Canvas is now 192x128, feet anchor [64,104]; extra transparent padding accommodates the same native-scale model/equipment and flip without global shrinking. Parent must consume the updated manifest/anchor rather than assume the old 192x96 canvas.

## Outputs and evidence

- hero-manifest.json — updated dimensions, anchors, hashes, model and reach metadata.
- kagebot/atlas.png and action directories — cleaned native transparent frames.
- kagebot/*-contact-native.png, *-contact-3x.png and GIFs — revised frame sheets and previews.
- kagebot/hero-review.mp4 — revised standalone action-transition review.
- kagebot/consistency-validation.json — current mechanical evidence.
- kagebot/acceptance.json — candidate proof status, not release approval.

Fresh checks passed for 18 hero actions / 72 frames, dimensions, binary alpha, locked palette, atlas round trips, PNG hashes, anchor/canvas bounds, unchanged support metadata, and all 15 active strike poses' visible air-cut extents. Timing values were retained from the already-validated baseline. Obsolete standalone/temporal proof files were removed rather than misrepresenting the changed bytes as previously accepted.

A private 8.6-second, 60fps side-by-side comparison covers run → all three fast attacks → run → dash, then representative transitions across the remaining hero inventory. Browser playback actually reached its end, recording 259 decoded callbacks. This is standalone playback, not controller-driven gameplay. The recorded film still needs final human visual judgment; not every encoded frame received a browser callback.

## Remaining limits / parent gate

- Shared-part articulation is intentionally cutout animation. It is not independently generated deformation for every pose, and some transitions may need further native cleanup after parent visual review.
- The last air-cut cleanup tapered previously abrupt crop edges. Mechanical proofs were rerun on that revision; exhaustive final temporal visual inspection was not completed within this bounded stage.
- Parent must inspect the exact revision, particularly scarf motion, joints, carried-to-equipped transition, wall poses and frontflip, then test real in-engine transitions before release.
- No runtime/game code, enemies, shared manifest, support artwork, other worktrees, publication or external messages were changed.

Cost: 40/60 included units charged or reserved, retaining the original one-unit uncertainty. This repair added one completed generated air-cut (one unit). An initial payload was rejected with HTTP 422 before acceptance; it was corrected once. No accepted jobs remain pending. No cash/topups/subscription changes.

The baseline a219c36 and all old source/takes remain recoverable in Git and private preservation. Exact revision commit and private evidence locations are returned through the parent handoff, not embedded as host paths or job identifiers in public assets.
