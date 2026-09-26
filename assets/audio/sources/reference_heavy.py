#!/usr/bin/env python3
"""Original synthesized Kagebot combat SFX. Run: python3 generate.py [output-dir].
Requires NumPy; ffmpeg for the optional MP3 reel. No samples or music generated.
"""
import json
import math
from pathlib import Path
import subprocess
import sys
import wave

import numpy as np

SR = 44100
TAU = 2 * np.pi
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / 'source-renders' / 'heavy'
OUT.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(20260926)
ORDER = ['sword', 'combo_impact', 'jump', 'doublejump', 'dash', 'laser',
         'venom', 'hurt', 'defeat', 'portal', 'menu', 'victory']
LENGTH = dict(sword=.32, combo_impact=.47, jump=.20, doublejump=.27,
              dash=.30, laser=.45, venom=.42, hurt=.31, defeat=.68,
              portal=.92, menu=.14, victory=.95)

def time(d):
    return np.arange(round(d * SR), dtype=np.float64) / SR

def envelope(t, d, attack=.002, release=.07):
    return np.minimum(1, t / attack) * np.clip((d - t) / release, 0, 1)

def lowpass(x, cutoff):
    # First-order filter, sample-independent time constant. Used to keep the
    # noise/drive focused in the phone-audible low-mid range rather than sub-only.
    a = 1 - np.exp(-TAU * cutoff / SR)
    y = np.empty_like(x)
    prev = 0.
    for i, v in enumerate(x):
        prev += a * (v - prev)
        y[i] = prev
    return y

def noise(d, cutoff=900, decay=12, high=False):
    t = time(d)
    raw = RNG.standard_normal(len(t))
    filtered = lowpass(raw, cutoff)
    if high:
        filtered = lowpass(raw - filtered, 7800)
    # Filtered noise has less RMS; make energy predictable, without peak-normalizing.
    filtered /= max(np.sqrt(np.mean(filtered ** 2)), .001)
    return filtered * np.exp(-decay * t) * envelope(t, d, .001, .045)

def osc(d, start, end, fm=0., decay=6., phase_offset=0.):
    t = time(d)
    freq = start * (end / start) ** (t / d)
    phase = TAU * np.cumsum(freq) / SR + phase_offset
    wave = np.sin(phase + fm * np.exp(-t * 11) * np.sin(2.17 * phase))
    return wave * np.exp(-decay * t) * envelope(t, d, .0015, .065)

def drive(x, amount=3.):
    # Local harmonic distortion, not a final master gain/brickwall clipping stage.
    return np.tanh(amount * x) / np.tanh(amount)

def add(dst, start, signal, level=1., pan=0.):
    i = round(start * SR)
    end = min(len(dst), i + len(signal))
    if end <= i:
        return
    seg = signal[:end-i] * level
    dst[i:end, 0] += seg * (1 - .22 * pan)
    dst[i:end, 1] += seg * (1 + .22 * pan)

def cue(name):
    d = LENGTH[name]
    dst = np.zeros((round(d * SR), 2), np.float64)
    a = lambda t, s, g=1., p=0.: add(dst, t, s, g, p)
    if name == 'sword':
        # Fast edge and hiss, then audible low-mid hit and resonant metallic bite.
        a(0, noise(.18, 2300, 19, True), .15, -.35)
        a(.008, osc(.22, 1100, 190, 2.5, 16), .19, .35)
        a(.042, drive(osc(.21, 125, 65, 1.2, 13), 4), .25)
        a(.055, osc(.17, 690, 310, 2.3, 14), .105, .2)
    elif name == 'combo_impact':
        a(0, noise(.15, 2900, 23, True), .17)
        a(.004, drive(osc(.39, 145, 43, 1.7, 9), 5), .34)
        a(.018, noise(.25, 650, 16), .15, -.2)
        a(.029, osc(.31, 480, 90, 2.5, 13), .15, .24)
        a(.073, drive(osc(.24, 98, 57, .8, 15), 4), .12)
    elif name == 'jump':
        a(0, osc(.17, 102, 184, .6, 13), .17)
        a(0, noise(.075, 1400, 43, True), .058)
    elif name == 'doublejump':
        a(0, osc(.14, 112, 214, .6, 15), .13)
        a(.085, osc(.17, 136, 260, 1.2, 14), .15)
        a(.086, noise(.09, 1800, 37, True), .07)
    elif name == 'dash':
        a(0, noise(.27, 700, 12), .115, -.28)
        a(0, noise(.21, 1600, 12, True), .095, .26)
        a(.005, drive(osc(.25, 210, 64, 2.4, 12), 3.5), .17)
    elif name == 'laser':
        # 35ms rising charge and a two-layer overdriven discharge.
        a(0, osc(.07, 195, 690, 1.5, 8), .115)
        a(.038, noise(.14, 3400, 28, True), .17, .2)
        a(.039, drive(osc(.36, 385, 64, 3.3, 8), 5), .29)
        a(.051, drive(osc(.32, 142, 48, 1.8, 11), 4), .22, -.18)
        a(.075, noise(.22, 900, 14), .095)
    elif name == 'venom':
        # Gurgling spit: pitch wobble, wet low-mid fizz; no explosive crack.
        t = time(.36)
        wobble = np.sin(TAU * (98*t + 4*np.sin(TAU*20*t)))
        a(0, drive(wobble * np.exp(-t*8) * envelope(t, .36, .003, .09), 4), .13)
        a(0, noise(.37, 700, 8), .14, -.22)
        a(.025, osc(.34, 310, 71, 3., 11), .17, .25)
    elif name == 'hurt':
        a(0, noise(.12, 2500, 30, True), .13)
        a(.004, drive(osc(.26, 260, 71, 2., 12), 4), .26)
        a(.021, noise(.19, 580, 20), .095)
    elif name == 'defeat':
        # Compact detonation with descending body; not a musical death jingle.
        a(0, noise(.15, 3900, 24, True), .17)
        a(0, drive(osc(.49, 172, 37, 2., 8), 5), .32)
        a(.013, noise(.37, 790, 10), .17)
        a(.065, drive(osc(.37, 88, 46, 1.2, 10), 4), .13)
        a(.14, noise(.36, 480, 11), .085, -.2)
    elif name == 'portal':
        t = time(.81)
        phase = TAU * np.cumsum(69 + 82*t/.81 + 3*np.sin(TAU*6*t)) / SR
        a(.035, drive((np.sin(phase) + .34*np.sin(2.02*phase)) *
                      envelope(t, .81, .11, .23), 2.6), .15)
        a(0, noise(.74, 430, 3), .08, -.25)
        a(.23, osc(.58, 125, 232, 2.1, 3), .10, .25)
        a(.52, noise(.28, 1600, 11, True), .05)
    elif name == 'menu':
        a(0, osc(.105, 400, 245, 1.1, 27), .10)
        a(0, noise(.055, 1900, 72, True), .035)
    elif name == 'victory':
        # Dark short confirmation cadence, brighter than combat but not boomy.
        for at, freq, lev in ((0, 146.83, .12), (.19, 174.61, .13),
                              (.39, 220, .14), (.61, 293.66, .16)):
            a(at, drive(osc(.31, freq*1.04, freq, 1.3, 5), 2.3), lev)
            a(at, osc(.22, freq*2.01, freq*2, 1.6, 10), .065, .25)
        a(.61, noise(.20, 3100, 24, True), .055)
    # Fixed mixing headroom; do not normalize each cue or the audition reel.
    dst *= .82
    edge = min(round(.003 * SR), len(dst)//2)
    dst[:edge] *= np.linspace(0, 1, edge)[:, None]
    dst[-edge:] *= np.linspace(1, 0, edge)[:, None]
    return dst

def stats(x):
    peak = float(np.max(np.abs(x)))
    rms = float(np.sqrt(np.mean(x*x)))
    return {'duration_s': round(len(x)/SR, 4), 'frames': len(x),
            'sample_rate': SR, 'channels': 2,
            'peak_dbfs': round(20*math.log10(max(peak, 1e-12)), 2),
            'rms_dbfs': round(20*math.log10(max(rms, 1e-12)), 2),
            'clipped_samples': int(np.count_nonzero(np.abs(x)>=1))}

def write_wav(path, x):
    assert np.isfinite(x).all() and np.max(np.abs(x)) < .95, (path, stats(x))
    with wave.open(str(path), 'wb') as w:
        w.setparams((2, 2, SR, len(x), 'NONE', 'not compressed'))
        w.writeframes(np.round(x*32767).astype('<i2').tobytes())

def main():
    entries = {}
    reel = []
    for name in ORDER:
        x = cue(name)
        write_wav(OUT / (name + '.wav'), x)
        entries[name] = {'file': name + '.wav', **stats(x)}
        reel.extend((x, np.zeros((round(.26*SR), 2))))
    preview = np.concatenate(reel)
    # Reel only encoded as MP3; game assets remain individual PCM WAVs.
    reel_wav = OUT / 'effects_reel.wav'
    write_wav(reel_wav, preview)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-i', str(reel_wav), '-codec:a', 'libmp3lame', '-b:a',
                    '160k', '-map_metadata', '-1', str(OUT/'effects_reel.mp3')], check=True)
    reel_wav.unlink()
    manifest = {'source': 'deterministic original NumPy synthesis, no samples',
                'effects': entries,
                'effects_reel': {'file': 'effects_reel.mp3', **stats(preview),
                                 'order': ORDER, 'gap_s': .26}}
    (OUT/'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'count': len(entries), 'effects_reel': manifest['effects_reel'],
                      'peaks_dbfs': {k:v['peak_dbfs'] for k,v in entries.items()}}, indent=2))

if __name__ == '__main__':
    main()
