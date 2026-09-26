# Enemy animation integration source

Imported from immutable tree `e431a6eb875f55c70f64895de59820d3a1676a27`.
Parent accepted this inventory for runtime integration, not final release.
Only five actor directories and `assets/characters/enemies-manifest.json`
were imported. Source atlases and metadata are preserved unchanged.

| Actor | Actions | Native frames | Cell | Root |
| --- | ---: | ---: | --- | --- |
| zombie | 5 | 35 | 96×64 | 32,60 |
| bear | 6 | 41 | 160×96 | 48,92 |
| ghost | 5 | 36 | 96×64 | 32,50 |
| spider | 6 | 40 | 96×64 | 32,48 |
| masked-mutant-boss | 7 | 49 | 192×128 | 64,120 |

29 actions / 201 native actor frames, plus three ancillary 12×12 venom frames.
Cells include transparent attack padding; they do not authorize body scaling.

`combatPhases` defines eight exact tracks. Select the stated frame subranges by
simulation state elapsed time, retaining committed facing through recovery.

| Track | Windup ms | Active ms | Recovery ms |
| --- | ---: | ---: | ---: |
| zombie melee | 480 | 180 | 700 |
| bear melee | 650 | 250 | 900 |
| ghost dive | 700 | 480 | 1100 |
| spider venom | 600 | 150 | 1200 |
| boss slash | 800 | 300 | 850 |
| boss burst | 800 | 420 | 850 |
| boss slash-enraged | 580 | 300 | 850 |
| boss burst-enraged | 580 | 420 | 850 |

Melee forward reaches are 33 zombie / 82 bear / 110 boss pixels. Decorative
upper arcs do not change the damage band. Boss burst is a 330px/s melee rush,
not a projectile. Ghost damage is its moving 30×35 body, never a 200px hitbox.

Spider root[32,48], wallContact[10,32], mouth[48,25], and projectile offset[16,-23]
are authoritative. Mirror the attachment and emission together. Its nested
`projectileVisual` is the real three-frame native venom atlas.

Per-actor artifact proofs and frame metadata preserve public asset provenance.
Operational receipts and independent integration evidence remain private.
The current provisional hero is awaiting costume/scarf/proportion/physical-sword
consistency correction; enemy integration does not restore hero visual acceptance.
See root HANDOFF.md for actual runtime proof and remaining release boundaries.
