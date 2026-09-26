# Kagebot’s Secret Mission — enemy integration checkpoint

## Scope and release hold

This is a local runtime-integration candidate, NOT release approval.
All five enemy actors were imported from immutable tree
`e431a6eb875f55c70f64895de59820d3a1676a27`, restricted to their five directories,
`enemies-manifest.json` and a sanitized root `ENEMIES-HANDOFF.md`.
Enemy pixels/source metadata were not edited. Source acceptance was for integration.

The preserved hero/support source `a219c36ccb70deefe2d06e46f5b4e4b21db0bc31`
is VISUALLY SUPERSEDED. It is provisional, NOT currently visually accepted.
The owner's new hero-consistency requirement remains OPEN: one costume/scarf,
proportions and blade identity across all actions; no unexplained growing blade.
No mutable replacement hero files were read or imported. A later explicit parent
handoff must supply the repaired immutable hero candidate. All new production
captures display the provisional-hero consistency warning. Older hero handoff
and audition acceptance wording describes historical evidence only.

## Runtime mapping

`tools/assemble-characters.mjs` remains the single canonical manifest assembler:

    node tools/assemble-characters.mjs assets/characters/hero-manifest.json assets/characters/enemies-manifest.json

Runtime inventory has eight actors and zero missing required actions. The enemy
source has 29 required actions and 201 native actor frames, plus the three-frame
12×12 venom sprite. No aliases, inherited enemy stills or idle substitutions.

`enemy-animation.mjs` selects explicit phase frame indices from `phaseTracks`,
using state elapsed time/duration. It does not restart whole clips per phase.

- Zombie: idle/walk, melee windup/active/recovery, hurt/defeat; reach 33.
- Bear: idle/walk, melee windup/active/recovery, hurt/defeat; reach 82.
- Ghost: hover, dive coil/windup, directed moving contact, braking/recovery,
  hurt/defeat. Contact stays 30×35; swept movement retains its four-pixel margin.
- Spider: wall-idle/climb, venom windup/emission/recovery, hurt/defeat. Vertical
  climb direction is separate from fixed wall-facing. Native root-to-wall offset
  22 aligns local claw plane x10 with actual wall, including mirroring. Enemy
  collision dimensions and authored level JSON are unchanged. Production venom
  emits at `(enemy.x + face*16, enemy.y - 23)` and uses the real PNG, not circles.
- Boss: idle/walk/hurt/defeat plus exact slash, burst, slash-enraged and
  burst-enraged tracks. Track selection is committed at windup. Burst remains
  330px/s rushing melee, not projectiles; slash reach remains 110.

The eight attack tracks each use their own windup/active/recovery subranges.
Hurt has its own elapsed clock. Interrupted recovery is visually timed to its
remaining actual recovery. Defeat plays its complete native clip after simulation
removal; dead enemies cannot damage, receive further hits or grant more rewards.
No enemy/boss health bars. Weak red rendering and rear/in-range execute cue use
actual simulation eligibility. Existing attack feel, level geometry, rewards and
capped ammo remain intact.

## Executed verification

- Targeted enemy/hero Node tests: PASS.
- Complete intersecting Node suite: PASS (exact totals in private node-suite.txt).
- All three level validators and authored input routes: PASS.
- `tools/shipping-smoke.mjs`, final `verified-shipping` run: PASS.
  Actual `/index.html` imports the shipping loader, production renderer, all
  actors, audio and scene director. A persistent input-only replay visits
  home → map → all three levels → live boss gate → portal → World2.
  It also exercises stage2 checkpoint damage versus lethal current-level reset.
  There are no HP/position/victory mutations in campaign replay.
- Real CDP keyboard entry/pause/resume, simulated standard-pad map/replay and
  pause/resume, real touch resume/jump in landscape with canvas visible and no
  page scrolling: PASS in that shipping run. No physical hardware claim.
- Normal-speed combat recording: 640×360 VP8/60fps with Opus, about 18.3 seconds.
  It includes actual early-stage combat, weak/rear execution and dash behavior.
- Focused bear/spider fixtures are explicitly distinct from the campaign. They
  supply visible bear attack phases and wall-held sword/laser observations where
  a successful campaign route alone does not guarantee the desired art sample.
- Parent/source native contact sheets and representative production captures
  were visually inspected: boss active slash, wall-spider mouth/attachment,
  airborne ghost in vertical scenery, weak red bear and rear execution cue.

Fast campaign traversal samples actual rendered states while every input physics
step still runs; the normal-speed recorded segment renders continuously. It is not
an alternate diagnostic renderer or a missing-actor-exclusion harness.

## Honest remaining gates

The shipping automated proof is green. A complete integrator visual review of
all eight phase tracks at normal speed, and exhaustive native/viewport continuity
inspection, was not finished within the bounded stage. Do not treat automated
phase selection tests or source-owner reviews as that missing in-game judgment.
The earlier isolated hero harness remains historical partial evidence, not the
current shipping campaign proof. Prior audio-file provenance was reused unchanged.

Next: parent supplies revised immutable hero, integrator imports only its approved
paths, reruns affected art/cinematic/controller proof and closes remaining visual
review, then parent independently accepts the combined full-art candidate before
any publication. Physical gamepad/mobile, first-time human timing and human audio
audition remain untested limitations, not newly imposed release approval gates.

No public writes, asset/API jobs, subdelegation, alternate model, runtime config
changes or other-worktree edits were performed. Private proof stays outside git.
Disposable browser/server/profile cleanup is recorded by the shipping tool.
