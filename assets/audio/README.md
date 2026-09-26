# Kagebot: World 1 audio palette

Original local synthesis for the World 1 music and effect inventory. Runtime assets
are stereo, 44,100 Hz, signed 16-bit PCM WAV. No external samples, network calls,
subscriptions, or copied melodies are used. The sound is gritty FM-inspired
synthesis, not cycle-accurate Mega Drive hardware emulation or sampled guitars.

## Entry points

- `manifest.json`: exact filenames, SHA-256, frames, seconds, end-exclusive loop
  markers, sample peak/RMS, measured integrated LUFS/true peak, and PCM seam evidence.
- `previews/contact-reel.mp3`: music excerpts followed by every effect. Its cue
  sheet is `preview_notes.contact_reel` in the manifest.
- `previews/loop-seams.mp3`: two seconds before and after each actual PCM boundary;
  cue positions are in `preview_notes.loop_seams`.
- `previews/<music-id>.mp3`: full music auditions. MP3s are preview-only, not
  runtime loop masters; they have encoder delay. Preview gain is -1.5 dB.
- `previews/stage2-phone-band.mp3` and `boss-phone-band.mp3`: mono, 120–6,000 Hz
  band-limited checks, not recordings from a real phone.

## Music routing

Every music ID maps to `music/<id>.wav`. Do not use a music name as an SFX path.
The `victory` ID exists in both categories for distinct purposes.

| ID | Seconds | BPM | Role / arrangement |
| --- | ---: | ---: | --- |
| home | 43.636372 | 88 | Quiet candle meditation; deep drone and sparse metal call |
| overworld | 30.000000 | 128 | Industrial route-selection march |
| stage1-approved | 32.727279 | 176 | Approved Iron Roof Run, unchanged |
| stage2 | 31.304354 | 184 | Galloping ascent, pedal notes and climbing responses |
| stage3 | 35.744671 | 188 | Interrupted sixteenth chains and descending counter-riff |
| boss | 40.000000 | 192 | 3+3+2 accents, double kicks, half-time threat then return |
| victory | 4.400000 | — | Nonlooping four-note full completion cadence |
| world2 | 6.400000 | — | Nonlooping ominous next-world reveal |
| help | 1.250000 | — | Nonlooping urgent paired distress calls |
| jetpack | 3.200000 | — | Nonlooping accelerating engine plus rising riff |

The first six entries loop over their entire PCM buffer; the remaining four are
one-shots. Stage 2, stage 3 and boss use an original D-centered semitone/minor-third
machine-call motif with different note schedules, phrase lengths, responses and
drum arrangements. Their 184/188/192 BPM arrangements are not slowed variations
of the approved 176 BPM stage-one track. Bass has explicit upper harmonics;
FM carriers and instrument-level saturation add grit without a boosted master.

## Effects routing

The twelve baseline heavy effects are retained byte-for-byte:
`sword`, `combo_impact`, `jump`, `doublejump`, `dash`, `laser`, `venom`, `hurt`,
`defeat`, `portal`, `menu`, `victory`. Each maps to `sfx/<id>.wav`.
In particular, the existing venom and portal sounds were not unnecessarily replaced.

New inventory requirements:

- `bear-slash`: low-mid claw/grunt sweep, 0.60 seconds.
- `ghost-dive`: pitch-falling spectral attack, 0.73 seconds.
- `wall-contact`: short mechanical contact, 0.18 seconds. Trigger on contact entry,
  not on every held/climbing frame.

Additional related cues, all optional event mappings:

- `spider-windup`: warning clicks before the baseline `venom` spit.
- `venom-impact`: wet projectile impact, distinct from the launch.
- `boss-windup`: low warning pulse before a boss attack.
- `portal-open`: extended reveal/activation swell; baseline `portal` remains the
  short traversal cue. Avoid playing both on the same event by default.

Use the short SFX `victory` for a small confirmation, or the music `victory` for
full stage/world completion; avoid unnecessarily stacking both.

## Mixing and preservation

The stage-one WAV has SHA-256
`2d182f7a8194b231352ee80bbeac0dbefa634b085f0749134a6436dac0dd8a85`.
Its original approximately 0.003381 maximum-channel DC offset and 4 ms edge ramps
are retained deliberately. No normalization, DC correction, header change or
other alteration has been applied to that approved file. All thirteen preserved
WAV hashes are in `sources/preserved-sha256.json`.

Measured gameplay music loudness is -19.15 to -18.70 LUFS for the three new loops,
versus -18.82 LUFS for approved stage one. New gameplay true peaks range from
-3.04 to -2.08 dBTP. All assets have zero full-scale PCM samples and negative
measured true peaks. Static attenuation sets headroom; no mastering compressor
or hard limiter is baked into the new score. Home/overworld intentionally contrast
with combat; home's deep, quiet drone is not a promise of phone-speaker impact.

Suggested initial runtime gains are music 0.65 and SFX 0.8, but these are starting
points, not a tested game mix. Limit simultaneous voices and validate the actual
master bus: individually clean assets do not prove a summed gameplay mix cannot
clip. Load/decode music on demand rather than decoding the entire palette at
startup. Keep one music source active and stop/crossfade it on scene changes.
Exact scheduling, user-gesture unlock, mute/pause behavior, load strategy and
in-game event integration remain the game integrator's responsibility.

## Regeneration and technical acceptance

From the repository root, with Python 3, NumPy and ffmpeg/libmp3lame installed:

    OPENBLAS_NUM_THREADS=1 python3 assets/audio/sources/generate_palette.py
    OPENBLAS_NUM_THREADS=1 python3 assets/audio/sources/package_audio.py
    OPENBLAS_NUM_THREADS=1 PYTHONDONTWRITEBYTECODE=1 python3 assets/audio/sources/test_audio.py

The palette generator writes only the nine new music cues, seven new SFX and
`score.json`; it never rewrites preserved audio. The packager measures the actual
shipped PCM, checks all WAV/MP3 decoding, encodes previews and writes the manifest.
It checks boundary sample differences against ordinary waveform differences and
an absolute ceiling, and decodes two byte-exact consecutive PCM cycles of every
loop. New loops use circular overlap-add with release and delay tails; no long
fade-out/fade-in gap is inserted at the boundary.

`reference_v5.py` and `reference_heavy.py` preserve the approved synthesis recipes.
Only their default output directories were changed to ignored, relative
`source-renders/v5` and `source-renders/heavy`. An explicit output directory may
also be passed. Do not replace preserved assets with regenerated candidates unless
their hashes match. Tests regenerate all 29 WAVs in disposable directories and
compare bytes, and deliberately corrupt clipping/seams to prove those checks fail.
Temporary test renders are removed automatically.

Verified toolchain: Python 3.13.15, NumPy 2.4.3, ffmpeg n9.0.1. Different NumPy or
encoder versions can change generated bytes or lossy preview encoding; preserved
WAV hashes, not a nominally successful rebuild, are the authority.

## Honest limits

No human listening, real small-speaker test, browser decode, gameplay integration,
or owner approval of the new music is claimed. Technical metrics cannot establish
that a composition is enjoyable or that every enemy cue is perceptually distinct
in combat. LUFS is null for effects too short to satisfy the loudness gate.
The manifest and auditions make those remaining listening/integration checks
possible without changing the preserved source material.
