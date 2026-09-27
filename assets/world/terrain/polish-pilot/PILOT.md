# Architectural module pilot

13 native modules in the existing schema-2 format (`modules.json`). This is a
separate pilot inventory, linked by `architectural_pilot` in the world manifest.
The existing production world inventory and level geometry are unchanged.

Exact IDs / PNG basenames (all anchors [0,0], no display scaling):

| Key | Cell | Usage |
| --- | --- | --- |
| pilot-roof-left | 16×16 | left terminal lip, horizontal roof only |
| pilot-roof-center | 16×16 | repeat horizontal barrel-tile courses |
| pilot-roof-right | 16×16 | right terminal lip, horizontal roof only |
| pilot-beam-left | 16×8 | exposed left timber end |
| pilot-beam-center | 16×8 | thin horizontal timber ledge |
| pilot-beam-right | 16×8 | exposed right timber end |
| pilot-facade-fill | 16×16 | continuous quiet plaster infill |
| pilot-facade-left | 16×16 | left vertical timber post |
| pilot-facade-right | 16×16 | right vertical timber post |
| pilot-facade-band | 16×16 | horizontal tie beam in continuous facade |
| pilot-stone-fill | 16×16 | staggered masonry courses |
| pilot-stone-top | 16×16 | exposed stone cap |
| pilot-stone-corner | 16×16 | exposed top/left masonry edge |

Files are named without the `pilot-` prefix. Muted material samples come from
the preserved `assets/world/source/temple-facade.png`: roof (235,78)-(251,94),
wood (221,281)-(237,289), plaster (156,177)-(172,193), stone (289,348)-(305,364).
These native crops are recolored into short material ramps and redrawn with
barrel-tile courses, end grain, mortises, plaster blemishes and masonry joints.
No whole-facade resizing, new tileset framework, dependency or generation job.

Repeat roof-center only along the walk-plane row; use caps at actual ends.
Under that row, fill building height with facade-fill, edge posts and deliberate
band rows. Roof tiles must never tile vertically down a climbing shaft. Beams
provide the 8-pixel thin-ledge material; stone provides grounding. The left stone
corner can be mirrored by the integrator if a right corner is needed; no new
renderer capability is claimed here.

The private audition temporarily maps existing roof/wall/wood/stone resource IDs
to representative pilot modules in the unchanged real renderer. Its existing
renderer repeats a shape's supplied roof ID, so terminal-cap selection and facade
edge/band placement are NOT proven as production integration. The native assembly
preview demonstrates all material roles without changing actual level geometry.
The runtime/level owner must choose cap placement, facade bands and varied ledge
thickness under the existing contract. Parent acceptance is still required.
