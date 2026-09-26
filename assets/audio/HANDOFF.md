# Kagebot’s Secret Mission — music/SFX handoff

## Bounded stage complete

Audio candidate only. Branch: `work/kagebot-world1-music`.
Payload commit: `4267e29d25f753e8c0c91b06f4b411d636953897`.
This handoff is a documentation-only follow-up commit; its identity is available
with `git log -1 --format=%H -- assets/audio/HANDOFF.md`.
Only `assets/audio/**` is owned/changed. No game source, existing root assets,
other lanes, accounts or public services were modified. No external generation
jobs were submitted, so there are no outstanding job IDs or costs.

## Exact outputs (repository-relative)

- `assets/audio/manifest.json`: all filenames, hashes, frame counts, durations,
  loop markers, peak/RMS/LUFS/true-peak levels, seam checks and preview cue sheet.
- `assets/audio/music/{home,overworld,stage1-approved,stage2,stage3,boss,victory,world2,help,jetpack}.wav`
- `assets/audio/sfx/{sword,combo_impact,jump,doublejump,dash,laser,venom,hurt,defeat,portal,menu,victory,bear-slash,ghost-dive,wall-contact,spider-windup,venom-impact,boss-windup,portal-open}.wav`
- `assets/audio/previews/contact-reel.mp3`: full-palette contact audition.
- `assets/audio/previews/loop-seams.mp3`: actual loop boundaries.
- `assets/audio/previews/<music-id>.mp3`: ten full music auditions.
- `assets/audio/previews/{stage2,boss}-phone-band.mp3`: limited-band mono checks.
- `assets/audio/sources/generate_palette.py`: deterministic new score/effect synthesis.
- `assets/audio/sources/{reference_v5,reference_heavy}.py`: preserved synthesis
  recipes, only default output location adapted to safe relative paths.
- `assets/audio/sources/{score,preserved-sha256}.json`: arrangement data and immutable baselines.
- `assets/audio/sources/{package_audio,test_audio}.py`: packaging and acceptance checks.
- `assets/audio/README.md`: routing, mix guidance, regeneration and limitations.

## Fresh local acceptance evidence

- Parsed the requested inventory: all 10 music and 15 required SFX IDs covered;
  four additional related cues supplied. Total: 29 distinct WAVs and 14 MP3s.
- Direct source-byte comparison passed for approved stage one and all 12 baseline
  heavy effects. Stage-one SHA-256:
  `2d182f7a8194b231352ee80bbeac0dbefa634b085f0749134a6436dac0dd8a85`.
- `python3 assets/audio/sources/generate_palette.py`: successful local render.
- `python3 assets/audio/sources/package_audio.py`: 29 WAV and 14 MP3 decodes pass;
  zero clipped PCM samples and negative measured true peaks throughout.
- Six loops pass real PCM endpoint-difference checks, plus ffmpeg decoding of
  two consecutive byte-exact PCM cycles. New loops carry release/delay tails
  across the seam. This is signal evidence, not a human seamlessness verdict.
- `PYTHONDONTWRITEBYTECODE=1 python3 assets/audio/sources/test_audio.py`: all five
  tests passed. All 29 WAVs regenerate byte-identically in disposable directories;
  manifest/inventory and immutable baseline hashes pass; deliberately clipped and
  discontinuous test fixtures are rejected. Temporary renders were removed.
- `git diff --cached --check`: passed before payload commit. Text scan found no
  private contract/log paths, host paths or tested credential markers.

Stage 2: 184 BPM, 31.304354 s, -19.15 LUFS, -2.08 dBTP.
Stage 3: 188 BPM, 35.744671 s, -18.70 LUFS, -3.04 dBTP.
Boss: 192 BPM, 40.000000 s, -18.72 LUFS, -2.79 dBTP.
All use original note arrangements with a coherent dark D-centered FM palette;
none is just a speed-adjusted copy of approved stage one. Gameplay mono fold-down
RMS change is under 0.011 dB, and upper bass harmonics are explicitly synthesized.

## Parent integration and remaining limits

No browser/game integration or human listening was run or claimed. Parent owns
scene routing, transitions, gesture unlock, pause/mute/hidden-tab behavior, final
bus mixing, listening acceptance and publication. Use PCM WAVs and end-exclusive
markers, not preview MP3s, for loops. Paths in the manifest are relative to
`assets/audio`; the new stage-one ID is `stage1-approved`, not the old root
`rooftop_loop` name. Existing root audio files were not altered or removed.

Keep only one music loop active. Suggested starting gains are music 0.65/SFX 0.8,
not a verified summed game mix. Do not stack short SFX victory with full music
victory unintentionally, or portal-open and portal on the same event. Contact
sounds should trigger on contact entry, not each frame.

The approved stage-one file retains its pre-existing ~0.003381 DC offset and
original edge ramps to honor byte preservation. Home is intentionally deep/quiet;
phone-band previews and energy metrics do not substitute for real-speaker listening.
Short-effect LUFS can be null. FM-inspired synthesis is not literal YM2612 emulation.
There are no active processes, unresolved API jobs, or publication side effects.
