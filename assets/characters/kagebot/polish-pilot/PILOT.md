# Kagebot native hero — complete corrected source set

All 18 actions / 72 physical cells now use the shared lean model. This is a
complete source-art candidate, not an assembled or published release. Historical
`polish-pilot` filenames remain to avoid unrelated path migration. The canonical
character manifest and runtime are intentionally untouched; parent integration
must consume this exact hero source manifest after both execution owners stop.

## Complete physical-frame inventory

| Action | Cells | Atlas indices |
| --- | ---: | --- |
| idle | 1 | 0 |
| run-low | 8 | 1–8 |
| jump-rise | 1 | 9 |
| fall | 1 | 10 |
| frontflip | 8 | 11–18 |
| wall-hold | 1 | 19 |
| wall-climb | 4 | 20–23 |
| wall-jump | 1 | 24 |
| dash | 3 | 25–27 |
| sword-1 | 7 | 28–34 |
| sword-2 | 7 | 35–41 |
| sword-3 | 7 | 42–48 |
| laser | 3 | 49–51 |
| hurt | 4 | 52–55 |
| finisher | 4 | 56–59 |
| meditate | 1 | 60 |
| startled | 8 | 61–68 |
| drone-depart | 3 | 69–71 |

The missing twelve actions / 41 cells are complete. Each sword still uses seven
physical poses on its unchanged twenty-slot startup/active/recovery timeline.
Cells remain 192 × 128, eight columns, native scale 1, root [64,104]. Independent
collision remains 18 × 42; artwork alpha never defines collision geometry.

## Shared model and honest provenance

No generation was submitted. Preserved `source/generated-idle.png` and
`source/generated-swipe.png` are existing generated references. Original model
parts and atlas in the parent Kagebot directory remain unmodified. The shared
15 × 15 hood removes internal seams from the generated-derived 19 × 19 source;
native torso and limb armor clusters are the accepted pilot design. Every action
uses these same parts, palette, collar and two scarf tails. These are articulated
cutout poses, not 72 newly generated images or whole-atlas rescaling.

`model/model.json` records part hashes and dimensions; `pose-joints.json` records
per-frame hip, neck, knee, ankle, elbow and hand positions. Middle flip keys fold
knees to chest and ankles back to hips while the neck/hip axis crosses inversion.
They are not rotations of one straight pose. The rigid narrow sheathed weapon
still extends outside the compact body in some airborne views by design.

The original katana PNG is byte-identical: forty opaque longitudinal columns
from guard through tip (two guard columns and 38 blade-only columns), plus hilt.
It rotates rigidly, never stretches. Sword reach 74/82/94 is supplied by posing
and a chromatically distinct reused generated air-cut, not a longer metal blade.
Sword 2 reverses the air-cut sweep for its rising backhand. Each equipped strike
has one blade attached to its front hand and an empty matte sheath behind it;
there is no duplicate equipped back blade. Stored weapon length is unchanged.

Previously accepted action poses changed only for concrete readability/equipment
cleanup: existing upper-left armor pixels use the same mid-ramp shade (no new
alpha or thicker limbs), and equipped strikes retain the empty sheath. Scarf,
hood and articulated tuck design remain consistent across the full set.

## Contact and verification

Wall hold/climb face the wall. Their rightmost opaque pixels are the forward
gauntlet at x=77, rows 67–69, not the boot or scarf. Accurate frame bounds let the
unchanged renderer apply its four-pixel root correction to place that contact at
the independent body's wall face. Native drone-depart hand remains [73,61], or
[9,-43] from the root, preserving the existing drone rail and intro choreography.

All 72 cell/atlas hashes, binary alpha, bounds, palette, model references and
anchors are verified programmatically. Hero/media/contracts tests and an actual
unchanged-game input replay verify the resource-overridden full set. Private
evidence includes full inventory, body/reach overlays, baseline/current intro
contact comparisons and authored motion at a declared 120 Hz sample cadence.
The 20-second game video uses 600 images, exactly four 120 Hz simulation ticks
per image, encoded at 30 fps. This reproduces simulation-speed motion; it is
offline capture, not wall-clock browser-performance proof.

The separate runtime owner's laser/execution display and final geometry changes
are not present in this tree. Assembled integration and independent final review
remain required; source-art completion must not be mistaken for release approval.
