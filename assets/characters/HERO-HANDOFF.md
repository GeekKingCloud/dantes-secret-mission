# Hero and support art handoff

Task: Kagebot’s Secret Mission

Status: COMPLETE for the assigned hero/support asset inventory, with standalone validation and timed-playback audition. NOT a claim of assembled-game integration or publication. Branch: `work/kagebot-character-assets`.

Baseline harvested by parent: `1071fc722df2e587ecd59e522e137278d053c93b`, containing earlier artifact `db57c7c7b64a01e60d02d8707ba670f85ea25074`. This continuation adds the missing actions and repairs concrete combat continuity.

Completed artifact commit: `dcd87a6272487dfd08fe13dca62a2d3fa9150708`. This receipt is the following documentation-only commit.

## Exact public outputs

All paths are relative to the repository root:

- `assets/characters/hero-manifest.json` — runtime actor schema v1, relative PNG paths, explicit dimensions/anchors, every assigned action, and empty machine-readable missing lists.
- `assets/characters/kagebot/atlas.png` — 72 physical frames, 192×96 cells, feet/root `[64,80]`.
- `assets/characters/robot-butler/atlas.png` — 5 physical frames, 96×96 cells, feet/root `[48,80]`.
- `assets/characters/jetpack-drone/atlas.png` — 5 physical frames, 96×96 cells, hover origin `[48,48]`.
- Each actor directory contains native individual action PNGs, native/2× overview contact sheets, native/3× action contact sheets, and native/4× timed GIFs.
- `assets/characters/kagebot/hero-review.mp4` — complete available-action audition, 1,201 encoded frames at 60 Hz, approximately 20.017 seconds. This is an asset audition, not gameplay footage.
- `assets/characters/kagebot/acceptance.json` — native PNG/atlas round trips, alpha, measured visible sword reach, feet and GIF checks.
- `assets/characters/kagebot/standalone-validation.json` — exact inventory coverage, hashes/bounds/anchors, grip continuity, negative controls, and exact combat-phase checks.
- `assets/characters/kagebot/temporal-validation.json` — actual browser playback coverage, head/neck connectivity, registered flip pivot, full-video playback evidence and visual disposition.

## Complete coverage, not aliases

Programmatically checked: 22 required actions, 22 supplied actions, 82 physical PNG frames, no missing actions.

Kagebot, 18 actions: idle, run-low, jump-rise, fall, frontflip, wall-hold, wall-climb, wall-jump, dash, sword-1, sword-2, sword-3, laser, hurt, finisher, meditate, startled, drone-depart.

Butler: idle, eyes-widen. Drone: idle, boost.

This continuation retrieved the previously accepted hurt job rather than resubmitting it. Hurt has four returned animation poses; startled has eight returned poses. Laser uses its distinct generated aiming pose plus native-pixel recoil; departure uses its distinct overhead holding pose plus native-pixel sway. These are not missing-action aliases to idle. Idle, jump-rise, fall, wall-hold, wall-jump and meditation intentionally use naturally held poses.

## Concrete corrections and combat timing

- Kept the parent-reviewed lower run: all eight native PNGs are byte-identical to the harvested candidate.
- Located the actual raised fist in sword-2. Blade attachment now uses the opaque root-column position relative to the moving grip, rather than the rotated image's bounding-box corner. Added native-pixel hilt/guard cleanup.
- The weapon remains held through startup, all active poses and recovery. Removed the empty-hand/appearing-bar transition; no quick-draw explanation is being used to excuse a pop.
- Applied grip-relative weapon motion to all three strikes. Restored the finisher's previously cropped fist and attached its short precision blade correctly.
- Native C hood/face pixels and the thin crouched body direction are retained. No global sprite shrinking, synthetic body fallback or invisible reach extension.
- Every active native sword pose visibly reaches exactly 74, 82 or 94 pixels from the feet origin within the controller's vertical attack band.
- Total strike times remain **0.240 / 0.260 / 0.375 seconds**. Startup/active/recovery match current `COMBO` values exactly.
- Each strike uses seven authored physical poses across **20 repeated timeline slots**. The repetitions are intentional holds, not newly generated art. This makes the renderer's 15% / 70% / 15% phase mapping exact: startup slots 0–2, active slots 3–16, recovery slots 17–19. `fps` is timeline-slot rate, not a demand to slow gameplay.
- `sourceFrameCount`, `gripCenters`, `activeFrames` and `frameDurationsMs` describe the physical poses. `frames` contains global atlas indices, with intentional repetitions. `activeSlots` describes the runtime timeline. Existing schema-v1 rendering requires no new reader or compatibility path.

## Actual acceptance evidence

Fresh local checks passed:

1. Exact inventory equality for all three assigned actors; all missing lists empty.
2. Native PNG dimensions and binary alpha; nonempty/canvas-fit bounds; atlas-to-source byte equality and SHA-256 metadata equality; explicit integral anchors.
3. All active sword-pose reach checks: 74/82/94 pixels inside the attack band. Feet remain byte-identical through all seven poses of each strike.
4. Grip-to-tip opaque connectivity in all 21 sword poses, including startup and recovery. Deliberately deleting the bridge makes the negative-control test fail as expected.
5. Combat-phase mapping sampled at 10 kHz against .240/.260/.375 seconds. No active-pose slot bleeds into startup or recovery.
6. The current, unmodified runtime `validateAtlasManifest` accepted the manifest. Its current `COMBO` constants matched the supplied reach and timing metadata. These were read-only imports, not edits to the code owner's tree.
7. Head-to-body-to-foot connectivity checked for 33 run, sword and finisher poses. Final timed playback was also inspected; this is not merely an alpha-connectivity claim.
8. Frontflip registration matches a complete clockwise native cutout rotation around `[64,58]`, with at most half-pixel mathematical center rounding onto integral PNG placement. An asymmetric scarf changes opaque bounding boxes, not the registered pivot.
9. Visible-browser `requestAnimationFrame` auditions used runtime-equivalent sword phase timing and observed every physical pose of all 22 actions. Native and enlarged actual playback plus captured frame traces/filmstrips were reviewed for grips, recovery continuity, head/neck joins, feet, flip, startle, departure and support motion.
10. The full review MP4 played to its end in the browser with no media error. The browser reported four dropped display/decode frames in that preview session; the separate live-action traces observed every physical pose. GIFs decoded successfully and use their format's 10 ms timing quantization.

Private scripts, full provider responses, accepted identifiers, native-grid investigation, playback traces and captured filmstrips remain in the established private character evidence directory. None are embedded in these public-safe files.

## Remaining limits and parent integration

- Full world/runtime assembly, real controller-input combat, wall-specific routing, collision/camera interaction and cinematic drone-to-hand placement remain parent-owned. They were not claimed or tested as assembled gameplay here.
- This is a coherent bounded pixel-art candidate, not a claim that every frame was independently generated. Frontflip is native cutout rotation; recoil, blade arcs, some holding motion and drone flame pulses are explicitly authored from generated pixels.
- Frontflip reads as a fast compact somersault, but is not a fully re-drawn articulated acrobatic cycle. Some small secondary-detail/pose variation remains in generated climb, hurt and startle frames.
- The opening now has all required character actions: meditation, visible startle rise, overhead departure hold, widening butler eyes and drone boost. Scene placement and coordinated drone pickup must be checked during assembly.
- The shared old `manifest.json`, shared contact sheets, all enemy files and runtime files were intentionally left untouched. Do not treat that old shared partial manifest/gallery as this candidate's assembly state. Import this `hero-manifest.json` through the parent's normal manifest assembly.

## Budget and closure

Cumulative charged-or-reserved usage: **39 / 60 included units**, retaining the original unrecoverable anonymous drone request's one-unit uncertainty inside the prior 20-unit baseline. The recovered hurt response charged one included unit, replacing its earlier two-unit reserve. No accepted provider jobs remain pending. No cash, top-up, account changes, remote writes or publication occurred.

The generation executor exited normally. The private audition server was stopped; no matching preview tab remained in the browser target list at closure. Only assigned hero/support paths and the two owned manifest/handoff files are eligible for the local commits.
