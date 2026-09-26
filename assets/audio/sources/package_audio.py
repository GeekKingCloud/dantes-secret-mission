#!/usr/bin/env python3
"""Measure shipped PCM, check decoding/seams, and build local MP3 auditions.
Requires Python 3, NumPy and ffmpeg with libmp3lame. No network or game changes.
"""
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SR = 44100
MUSIC = ['home', 'overworld', 'stage1-approved', 'stage2', 'stage3', 'boss',
         'victory', 'world2', 'help', 'jetpack']
SFX = ['sword', 'combo_impact', 'jump', 'doublejump', 'dash', 'laser', 'venom',
       'hurt', 'defeat', 'portal', 'menu', 'victory', 'bear-slash', 'ghost-dive',
       'wall-contact', 'spider-windup', 'venom-impact', 'boss-windup', 'portal-open']
LOOPS = set(MUSIC[:6])


def ffmpeg(*args):
    return subprocess.run(['ffmpeg', '-hide_banner', '-nostdin', '-nostats', *args],
                          capture_output=True, text=True, check=True)


def read(path):
    with wave.open(str(path)) as f:
        assert (f.getnchannels(), f.getsampwidth(), f.getframerate()) == (2, 2, SR)
        pcm = np.frombuffer(f.readframes(f.getnframes()), '<i2').reshape(-1, 2)
    return pcm, pcm.astype(np.float64) / 32768


def write(path, x):
    assert np.max(np.abs(x)) < 1
    with wave.open(str(path), 'wb') as f:
        f.setparams((2, 2, SR, len(x), 'NONE', 'not compressed'))
        f.writeframes(np.round(x * 32767).astype('<i2').tobytes())


def db(x):
    return round(20 * math.log10(max(float(x), 1e-12)), 4)


def loudness(path):
    report = ffmpeg('-i', str(path), '-af',
                    'loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-')
    text = report.stderr
    data = json.loads(text[text.rfind('{'):text.rfind('}') + 1])
    def number(key):
        value = float(data[key])
        return value if math.isfinite(value) else None
    return {'integrated_lufs': number('input_i'), 'true_peak_dbtp': number('input_tp'),
            'loudness_range_lu': number('input_lra')}


def measure(path, looping):
    pcm, x = read(path)
    assert np.isfinite(x).all()
    clips = int(np.count_nonzero((pcm == 32767) | (pcm == -32768)))
    assert clips == 0, path
    rms = np.sqrt(np.mean(x * x))
    mean = np.max(np.abs(np.mean(x, axis=0)))
    mono = x.mean(axis=1)
    sample = mono[:min(len(mono), 8 * SR)]
    power = abs(np.fft.rfft(sample * np.hanning(len(sample)))) ** 2
    freq = np.fft.rfftfreq(len(sample), 1 / SR)
    total = float(power.sum())
    steps = np.abs(np.diff(x, axis=0))
    step99 = float(np.quantile(steps, .99))
    seam = float(np.max(np.abs(x[0] - x[-1])))
    details = {
        'file': path.relative_to(ROOT).as_posix(),
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'frames': len(x), 'duration_s': round(len(x) / SR, 6),
        'sample_rate': SR, 'channels': 2, 'pcm_bits': 16,
        'peak_dbfs': db(np.max(np.abs(x))), 'rms_dbfs': db(rms),
        'dc_offset_max': round(float(mean), 8), 'clipped_samples': clips,
        'mono_fold_rms_delta_db': db(np.sqrt(np.mean(mono * mono)) / rms),
        'first_8s_energy_120_1200hz_fraction': round(float(power[(freq >= 120) & (freq <= 1200)].sum()) / total, 5),
        'loop': looping, 'loop_start_frame': 0 if looping else None,
        'loop_end_frame_exclusive': len(x) if looping else None,
        'loop_start_s': 0 if looping else None,
        'loop_end_s': len(x) / SR if looping else None,
        'decode_ffmpeg': 'pass', **loudness(path),
    }
    assert details['true_peak_dbtp'] < 0, (path, details)

    if looping:
        # Actual last-to-first PCM step, not just a score-duration assertion.
        limit = max(.002, min(.025, step99))
        assert seam <= limit, (path, seam, limit)
        assert 30 <= len(x) / SR <= 60, path
        details['pcm_seam'] = {
            'boundary_delta': round(seam, 8), 'p99_internal_delta': round(step99, 8),
            'acceptance_limit': round(limit, 8), 'pass': True,
            'head_10ms_rms_dbfs': db(np.sqrt(np.mean(x[:441] ** 2))),
            'tail_10ms_rms_dbfs': db(np.sqrt(np.mean(x[-441:] ** 2))),
            'method': 'Circular release tails for new loops; approved v5 has original 4ms edge ramp.',
        }
    return details, x


def preview(wav, mp3, filters='volume=-1.5dB'):
    ffmpeg('-loglevel', 'error', '-y', '-i', str(wav), '-af', filters,
           '-codec:a', 'libmp3lame', '-b:a', '192k', '-map_metadata', '-1', str(mp3))
    ffmpeg('-loglevel', 'error', '-xerror', '-i', str(mp3), '-f', 'null', '-')


def main():
    scores = json.loads((ROOT / 'sources/score.json').read_text())['scores']
    preserved = json.loads((ROOT / 'sources/preserved-sha256.json').read_text())
    manifest = {'schema_version': 1, 'paths_relative_to': 'assets/audio',
                'format': '44.1kHz stereo 16-bit PCM WAV; end-exclusive loop markers',
                'music': {}, 'sfx': {}, 'previews': [],
                'runtime': {'suggested_music_gain': .65, 'suggested_sfx_gain': .8,
                            'note': 'Starting mix only; game integration and multi-voice limiter validation remain separate.'},
                'limits': ['Not human-listened or approved beyond the preserved stage-one source.',
                           'FM-inspired, not cycle-accurate YM2612 or actual sampled guitars.',
                           'MP3 files are auditions only: encoder delay makes them unsuitable as runtime loop masters.',
                           'LUFS is null where a very short cue cannot pass the measurement gate.',
                           'Phone-band metrics/previews do not establish subjective small-speaker quality.']}
    reel = []
    reel_index = []
    cursor = 0
    seam_reel = []
    seam_index = []
    seam_cursor = 0
    with tempfile.TemporaryDirectory(prefix='kagebot-audio-') as tmpdir:
        tmp = Path(tmpdir)
        for category, names in (('music', MUSIC), ('sfx', SFX)):
            for name in names:
                path = ROOT / category / f'{name}.wav'
                ffmpeg('-loglevel', 'error', '-xerror', '-i', str(path), '-f', 'null', '-')
                details, x = measure(path, category == 'music' and name in LOOPS)
                relative = path.relative_to(ROOT).as_posix()
                if relative in preserved:
                    assert details['sha256'] == preserved[relative], relative
                    details['source'] = 'preserved-byte-identical'
                    if details['dc_offset_max'] >= .001:
                        details['preservation_note'] = 'Original DC offset retained; byte preservation takes precedence over DC correction.'
                else:
                    assert details['dc_offset_max'] < .001, relative
                    details['source'] = 'sources/generate_palette.py'
                if category == 'music':
                    if name in scores:
                        details.update(scores[name])
                    elif name == 'stage1-approved':
                        details.update({'title': 'Iron Roof Run', 'bpm': 176, 'bars': 24})
                    mp3 = ROOT / 'previews' / f'{name}.mp3'
                    preview(path, mp3)
                    details['preview_mp3'] = mp3.relative_to(ROOT).as_posix()
                    manifest['previews'].append(details['preview_mp3'])
                    if name in LOOPS:
                        repeated = tmp / 'two-cycles.wav'
                        raw = np.round(x * 32768).astype('<i2').tobytes()
                        with wave.open(str(repeated), 'wb') as f:
                            f.setparams((2, 2, SR, len(x) * 2, 'NONE', 'not compressed'))
                            f.writeframes(raw + raw)
                        ffmpeg('-loglevel', 'error', '-xerror', '-i', str(repeated), '-f', 'null', '-')
                        details['pcm_seam']['two_cycle_decode_ffmpeg'] = 'pass'
                        seam_clip = np.concatenate((x[-2 * SR:], x[:2 * SR]))
                        seam_index.append({'id': name, 'start_s': seam_cursor,
                                           'seam_at_s': seam_cursor + 2, 'end_s': seam_cursor + 4})
                        seam_cursor += 4.4
                        seam_reel.extend((seam_clip, np.zeros((round(.4 * SR), 2))))
                    # Hear progression, not only the opening: four bars into each loop.
                    start = min(round(16 * 60 / details['bpm'] * SR), len(x) - 8 * SR) if name in LOOPS else 0
                    excerpt = x[start:start + 8 * SR].copy() if name in LOOPS else x.copy()
                else:
                    excerpt = x.copy()
                if category == 'music' and name in LOOPS:
                    edge = 441
                    excerpt[:edge] *= np.linspace(0, 1, edge)[:, None]
                    excerpt[-edge:] *= np.linspace(1, 0, edge)[:, None]
                reel_index.append({'id': f'{category}/{name}', 'start_s': round(cursor, 6),
                                   'end_s': round(cursor + len(excerpt) / SR, 6)})
                cursor += len(excerpt) / SR + .35
                reel.extend((excerpt, np.zeros((round(.35 * SR), 2))))
                manifest[category][name] = details
                print(f'PASS {relative}: {details["duration_s"]}s, {details["integrated_lufs"]} LUFS, {details["true_peak_dbtp"]} dBTP', flush=True)
        for name, signal in [('contact-reel', np.concatenate(reel)), ('loop-seams', np.concatenate(seam_reel))]:
            wav = tmp / f'{name}.wav'
            write(wav, signal)
            preview(wav, ROOT / 'previews' / f'{name}.mp3')
            manifest['previews'].append(f'previews/{name}.mp3')
        for name in ('stage2', 'boss'):
            preview(ROOT / 'music' / f'{name}.wav', ROOT / 'previews' / f'{name}-phone-band.mp3',
                    'highpass=f=120,lowpass=f=6000,pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1,volume=-1.5dB')
            manifest['previews'].append(f'previews/{name}-phone-band.mp3')
    assert len(manifest['music']) == 10 and len(manifest['sfx']) == 19
    assert len(set(e['sha256'] for cat in ('music', 'sfx') for e in manifest[cat].values())) == 29
    manifest['acceptance'] = {'wav_count': 29, 'music_count': 10, 'sfx_count': 19,
                              'preserved_hashes_pass': len(preserved), 'decoded_wavs': 29,
                              'decoded_mp3s': len(manifest['previews']), 'loops_pcm_seam_pass': 6,
                              'human_listening': False, 'game_integration_tested': False}
    manifest['preview_notes'] = {'gain_db': -1.5, 'contact_reel': reel_index,
                                 'loop_seams': seam_index,
                                 'timeline_basis': 'PCM source time before MP3 encoder delay'}
    (ROOT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(manifest['acceptance']))


if __name__ == '__main__':
    main()
