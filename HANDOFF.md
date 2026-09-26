# Kagebot’s Secret Mission — three-level integration checkpoint

## Status

Bounded stage preserved; **not full campaign/release acceptance**. Three real
levels are integrated. Actor-free browser campaign passed before a final narrow
boss-interruption fix. That final fix passed the exact stage3 route, but the run
budget ended before its strengthened pressure probe and intersecting campaign /
broad suite could be rerun. Do not describe the final candidate as fully green.

Branch: `work/kagebot-world1`.

- `7aaacd4`: accepted nine-file designer import, with private absolute worktree
  references removed from stage2/stage3 notes.
- `6368ed6`: integration proof, ghost collision correction, scenery corrections,
  and final boss-interruption correction with input-only evasive route policy.
- This document is committed separately after those implementation commits.

## Immutable level provenance

Only each designer's JSON, design document and route test were imported:

- stage1: `6c6230eedb3a75f0d1a34eb3fc31fcf6ee6562b8`
- stage2: `9b99353eb424e02357bb43b3c4f237c77deda405`
- stage3: `00f529de67bd278404ed9a9be21b70a1aa1ad0a0`

`levels/stage1.json`, `levels/stage2.json`, `levels/stage3.json` remain byte-identical
to those sources. They occupy the existing production `runtime.mjs` loading paths
and SceneDirector map progression, not fixture aliases. Existing schema and player
physics are unchanged. No actor assets or other worker files were imported.

Stage1 contains nine enemies. Stage2 is the genuine 2,940px ascent with alternating
transfers/spike strips and eight enemies; its route defeats six and evades both
ghosts. Stage3 contains fifteen ordinary enemies plus the masked boss.

## Runtime changes

- `enemies.mjs`: input-only late-interrupt probing reproduced a third ghost dive
  crossing the ghost-court solid at y280.974851. Swept movement now protects dive
  and recovery with a four-pixel air gap. On collision the ghost recovers; existing
  windup/recovery timing and player movement remain unchanged. No terrain easing.
- `renderer.mjs`: vertical side spikes repeat along height at authored thickness,
  flipping outward according to the attaching wall. Previously the entire strip
  was stretched by height, cropping away readable points. Arena backdrop now draws
  once behind terrain, aligned to the collision floor, not again as a giant prop.
  Boss label no longer overlaps the level title. No enemy HP bars were introduced.
- `simulation.mjs`: sustained sword pressure was found to suppress attacks after
  the first hit (an earlier slash before contact was a misleading positive).
  The final correction permits one interrupt per completed boss pattern; later
  hits still damage it but cannot repeatedly erase its telegraph. Ordinary enemy
  interruption, weakness, normal boss damage and non-finisher boss defeat remain.
- `tests/routes/stage3.mjs`: final boss-only input policy reads windup/attack,
  ground-dashes through, turns and continues ordinary attacks. Existing HP4,
  no-unintended-retry, live-gate denial, both-pattern and roster assertions were
  retained. No teleports, HP writes or victory injection.

## Verification actually executed

Before the final boss-interruption change:

- All three exact validator commands and individual route commands passed against
  the integrated engine, including the ghost fix.
- `node --test tests/*.test.mjs`: **34/34 pass**, zero skipped.
- Input-only ghost probe: no solid overlaps, up to seven dives, fourteen observed
  late hits across bounded authored-route branches. Initial failing evidence kept.
- `node tools/levels-smoke.mjs <private-output>`: real Chromium PASS, no network
  misses or unhandled exceptions. One persistent director progressed title →
  complete timed home intro → map → stage1 → stage2 → stage3 → boss → map portal →
  World2 through real inputs and production JSON loading.
- Same campaign exercised three nonlethal stage2 pits preserving defeated enemies,
  then a lethal fourth pit resetting **stage2**, while completed stage1 remained
  completed. Afterwards stage2 and stage3 completed normally; no recovery shortcut
  was used to skip their traversal or combat.
- Fourteen authored-level scenery snapshots: spawn, tall walls, spike decisions,
  high crown climb, ghost telegraph camera and arena. Actual PNGs only, no actors.
- Inspected stage1 spawn/ghost courtyard, stage2 wall/spike/crown and stage3 arena.
  Visible landing lips, continuous walls, outward spikes and unobscured arena floor
  were checked. Camera coordinates are NOT final sprite visibility proof.
- Existing real-media smoke and controller browser regression both passed again.
  This reused no physical-device or human-audition claim.

**After the final boss correction:**

- `node tests/routes/stage3.mjs`: PASS (`boss-trial.txt` private evidence).
- Strengthened `node tests/routes/ai-probes.mjs --assert`: **NOT RERUN**; now requires
  both slash and burst after sword pressure begins, not merely an initial attack.
- Full suite, all-three integrated route recheck and browser campaign on that exact
  final change: **PENDING**. Earlier evidence is not represented as fresh for it.

## Output paths / next exact proof

- Production levels/designs: `levels/stage{1,2,3}.json`, matching `-DESIGN.md`.
- Authored routes: `tests/routes/stage{1,2,3}.mjs`; only input recording exports were
  added to stage1/2; stage3 also has the boss-only evasive policy described above.
- Shared input replay: `tests/routes/campaign.mjs`.
- AI residual/regression probe: `tests/routes/ai-probes.mjs`.
- PNG-only actual-level harness: `tests/levels.html`, `tests/levels-runtime.mjs`.
- Browser driver: `tools/levels-smoke.mjs` (requires explicit private output path).
- Renderer/loading regressions: `tests/levels.test.mjs`.

Resume first with `node tests/routes/ai-probes.mjs --assert`. If it fails, diagnose
that bounded boss pressure case without weakening assertions or changing player
physics/level terrain. Then run all three `node tools/validate-levels.mjs
levels/stageN.json` and `node tests/routes/stageN.mjs` commands, the full Node suite,
and the actor-free campaign browser driver against the final candidate. No need
to redo unchanged media provenance or invent physical-hardware approval gates.

## Remaining acceptance boundaries

- Accepted hero/enemy sheets, action contracts, animated home meditation/butler /
  HELP/departure cinematic and final sprite/hitbox/weakness/ghost-margin visibility.
- Full actor-rendered browser campaign, independent review and parent-authorized
  final live test build/publication. Shipping still deliberately stops on missing
  character assets; no geometric actor fallback was added.
- Human first-time duration/playfeel/audio audition and physical gamepad/mobile
  hardware are untested limits, not newly imposed release approval gates.

Private evidence is indexed outside the repository; no private logs/master files
were copied into source. Disposable browsers, servers and profiles from completed
smokes were retired. No delegation, asset jobs, other worktree writes or public
writes occurred.
