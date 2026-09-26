# Kagebot’s Secret Mission — design target

## Identity
An original, fast 2D robot-ninja action platformer. Serious moonlit adventure, child-friendly and non-gory. The feeling is lean, fluid and decisive: athletic ninja movement through connected Japanese temple rooftops, not chunky toy-block hopping. Franchise comparisons describe energy and readability only; do not copy characters, sprites, music or levels.

## First public test build
Deliver one polished, replayable rooftop section before expanding the campaign. It must have finished-direction hero and one mutant enemy, coherent architecture, readable combat, horizontal and vertical traversal, approved dark fast music, weighty effects, pause/retry and a clear ending. Label it a playable preview, not a completed three-stage campaign. No broken menu promises or fake level choices. Browser play with keyboard, touch and standard Xbox/PlayStation mappings; no installation, login or runtime service credentials.

## Art and camera
Kagebot is a slim robotic ninja: dark hood, cyan eyes/faceplate, segmented gunmetal armor and scarf/sword. Preserve the original reference’s identity while reducing torso/limb bulk. Running is low and forward-leaning, with tucked arms and fast extended strides—not an upright jog. Consistent pixel scale, restrained shading, readable silhouettes and clean nearest-neighbor rendering. Detail must not become noisy dithering.
Enemies and buildings belong in that same world. Roof tiles, beams, eaves, plaster and wood should describe real architecture, not floating oversized squares. Keep foreground collision surfaces obvious and backgrounds quieter. Camera framing and look-ahead must show incoming threats and landing space; use open horizontal routes connected to meaningful wall-climb routes. Moon/cloud parallax supports depth without concealing play.

## Feel and mechanics
Responsive acceleration/braking; buffered jumps and modest coyote time; double jump with a frontflip; dash with finite invulnerability and cooldown. Full solid-wall climbing, jump-away/regrab and sword/laser attacks while holding a wall. Spikes and pits are readable; pits cost some health and recover safely unless lethal. No lives counter: lethal damage restarts the current section with unlimited retries.
Unlimited sword with a readable three-hit combo; enemies survive several hits. Limited-ammo laser special. Contextual finisher from behind on a nearly defeated enemy restores one laser shot up to the cap. Impacts need clear audiovisual feedback without gore or excessive shake.
Physics body, hurt and attack shapes are independent of sprite alpha. Art must visually communicate those shapes and sword reach; do not silently alter gameplay collision to accommodate a generated image. No invisible hits beyond the depicted slash.

## Audio
Use the approved original fast 176-BPM dark heavy-riff rooftop track. Effects should match its bassy, gritty, gain-heavy impact: crunchy sword strikes, distorted lasers, explosive defeat/impact sounds. Movement and UI cues stay readable and restrained. Use saturation and transient design, not clipping or excessive loudness. Start audio only after player interaction; reliable mute, pause, hidden-tab behavior and non-stacking loops.

## Controls
Keyboard plus touch with clear labels. Standard gamepad: stick/D-pad move, up climb; A/Cross jump; X/Square sword; B/Circle dash; Y/Triangle laser; RB/R1 finisher; Menu/Options pause. Report simulated gamepad tests separately from physical USB hardware tests.

## Full World 1 direction after the slice
Three short stages: combat introduction, platforming introduction, then mixed challenge with the original masked shadow-mutant boss only at the end. Roster: slow zombie-like mutants, heavy slashing mutant bears, diving mutant ghosts, climbing spiders firing venom. Bears may be bulky; the hero must feel lean beside them.
Skippable opening: Kagebot meditates cross-legged beside a candle and table in a dark traditional house, robot butler nearby. A large HELP bubble interrupts him. He grabs a jetpack drone and flies out; the butler’s eyes widen.
Overworld connects home and the three stages; unlock progression and replay completed stages. Final boss portal teases World 2 — COMING SOON, not a fake playable world. Preserve this direction without letting unfinished campaign features crowd the first playable slice.

## Completion evidence
Exercise the actual browser build, not only isolated modules: movement, traversal, multi-hit combat, damage/retry, level end, touch and simulated gamepad, responsive layout, audio lifecycle and no missing runtime assets. Focused tests protect collision independence, wall contacts, combat gates and controls. Capture representative real gameplay. Publish through a reviewed branch/PR; verify repository commit and deployed page/assets. Clearly identify what is playable and what is still planned.
