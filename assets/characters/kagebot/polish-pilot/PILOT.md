# Kagebot native art pilot — mixed action set

This is a bounded correction pilot, not complete production art or an assembled
release. The canonical character manifest is intentionally untouched. The hero
source manifest selects this mixed atlas for parent review and later assembly.

## Included corrections

- idle: 1 neutral key
- run-low: 8 low-running phases
- frontflip: 8 separately articulated gather/tuck/invert/open phases
- sword-1: 7 physical poses on the existing 20-slot, 240 ms timeline
- laser: 3 charge/extension/recoil keys
- finisher: 4 raised-blade/cut/recover keys, non-gory

All cells remain 192 × 128, 8 columns, feet/root anchor [64,104]. The atlas
contains 72 physical cells: 31 corrected and 41 unchanged production cells.
The independent collision body remains 18 × 42. No renderer, timing, controller,
combat, enemy, intro, overworld or level source was edited.

## Shared model and provenance

The generated reference is preserved in `source/generated-idle.png`; the original
model parts and atlas remain in the parent Kagebot directory, unmodified. The
hood removes selected internal pixel seams from the existing generated-derived
19 × 19 hood to produce a 15 × 15 native head, rather than rescaling a full atlas.
Torso and limb armor are hand-redrawn native clusters informed by that source,
with common shaded armor planes, cuffs, dark joints and a cyan visor. Every pilot
pose uses those same parts. These are authored cutout poses, not 31 newly generated
images and not a primitive/vector stand-in.

`model/model.json` records dimensions and part hashes. `pose-joints.json` records
individual hip, neck, knee, ankle, elbow and hand positions. Middle flip frames
fold the knees toward the chest and the ankles back to the hips; the neck/hip
axis crosses inversion before opening. They are not rotations of one extended
standing sprite. The rigid sheathed weapon still extends outside the compact
body silhouette in some airborne views; it is intentionally a low-contrast,
narrow matte silhouette rather than the previous paddle-shaped dark prop.

All equipped strikes use the exact original 40-column physical metal blade and
hilt without scaling. Its stored counterpart keeps the same longitudinal size,
with a 1–2 pixel matte sheath drawn behind the body. The scarf has one collar and
two shared narrow tails. Sword 1's darker cyan air-cut reuses preserved generated
source (`source/generated-swipe.png`), rather than stretching the blade to match
the existing 74-pixel attack reach. Blade/hilt attachment follows the hand.

## Exact remaining production corrections

Unchanged older model: jump-rise, fall, wall-hold, wall-climb, wall-jump, dash,
sword-2, sword-3, hurt, meditate, startled, drone-depart. They are deliberately
preserved, not accepted as matching this pilot. Run-to-sword-2/3 and other mixed
transitions visibly change models. Laser and execution keys are authored but the
existing runtime still truncates their display; extending readability, recharge
cues and final animation dispatch belong to the separate runtime owner.

## Review and integration

The private audition substitutes only HTTP asset resources into the unchanged
real game and retains real enemies, geometry, combat and root anchors. It exercises
run and sword 1 through input replay and records normal-speed gameplay. A source
manifest selecting an atlas is not canonical runtime integration. Parent review
must accept the full-body silhouette, motion and architectural material pilot
before completing missing actions and assembling the canonical manifest.

Native and nearest-neighbor comparisons, body/reach overlays, action contacts,
a timed transition preview, in-game video, schema/alpha/frame checks and detailed
commands are kept with the private handoff. No new generation units were used.
