#!/usr/bin/env python3
"""Original World 1 score and additional effects: NumPy, no samples or services.
Run from any directory: python3 assets/audio/sources/generate_palette.py
Preserved stage1-approved and baseline SFX are deliberately never rewritten.
"""
import json
from pathlib import Path
import wave

import numpy as np

SR = 44100
TAU = 2 * np.pi
ROOT = Path(__file__).resolve().parents[1]
RNG = np.random.default_rng(731904)
MOTIF = (0, 1, 3, 7, 6, 3, 1, 0)  # D, Eb, F, A, Ab: original machine-call.
SCORES = {
    'home': {'title': 'Candle in the Machine', 'bpm': 88, 'bars': 16,
             'direction': 'Sparse dark FM meditation, low drone and muted metal motif.'},
    'overworld': {'title': 'Paths under Iron Moon', 'bpm': 128, 'bars': 16,
                  'direction': 'Measured industrial march; motif answered by low fifths.'},
    'stage2': {'title': 'Climb the Black Spire', 'bpm': 184, 'bars': 24,
               'direction': 'Galloping pedal riff, climbing responses and syncopated tom fills.'},
    'stage3': {'title': 'Venom Circuit', 'bpm': 188, 'bars': 28,
               'direction': 'Sixteenth-note chains, clipped rests and descending counter-riff.'},
    'boss': {'title': 'Behind the Hollow Mask', 'bpm': 192, 'bars': 32,
             'direction': 'Low 3+3+2 accents, double-kick assaults and half-time threat section.'},
}


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def time(duration):
    return np.arange(round(duration * SR)) / SR


def envelope(t, duration, attack=.002, release=.024):
    return np.minimum(1, t / attack) * np.clip((duration - t - 1 / SR) / release, 0, 1)


def voice(midi, duration, kind='riff', accent=False):
    t = time(duration)
    p = TAU * hz(midi) * t
    if kind == 'riff':
        # Palm-muted FM with detuned carrier, not a pulse-wave chiptune lead.
        mod = 1.1 + 2.7 * np.exp(-t * 29)
        a = np.sin(p + mod * np.sin(2 * p))
        q = p * 1.004
        b = np.sin(q + (1.1 + np.exp(-t * 21)) * np.sin(3 * q))
        x = np.tanh(2.1 * (.7 * a + .3 * b))
        x *= .24 + .76 * np.exp(-t * (7 if accent else 16))
        return x * envelope(t, duration, .0018, .018)
    if kind == 'bass':
        x = np.sin(p + (.42 + 1.2 * np.exp(-t * 12)) * np.sin(2 * p))
        # Explicit second/third harmonics retain body on small speakers.
        x = .7 * np.tanh(1.65 * x) + .19 * np.sin(2 * p) + .11 * np.sin(3 * p)
        return x * (.78 + .22 * np.exp(-t * 15)) * envelope(t, duration)
    if kind == 'bell':
        x = np.sin(p + (2.2 * np.exp(-t * 4) + .2) * np.sin(2.003 * p))
        return x * np.exp(-t * 2.6) * envelope(t, duration, .005, .18)
    if kind == 'pad':
        x = .6 * np.sin(p + .7 * np.sin(2 * p)) + .3 * np.sin(p * 1.002)
        return x * envelope(t, duration, .25, .4)
    raise ValueError(kind)


def noise(duration, width=13):
    x = RNG.standard_normal(size=int(round(duration * SR)))
    return np.convolve(x, np.ones(width) / width, 'same')


def drum(kind):
    d = {'kick': .24, 'snare': .19, 'hat': .065, 'open': .19,
         'tom': .29, 'crash': .72}[kind]
    t = time(d)
    if kind in ('kick', 'tom'):
        low = 50 if kind == 'kick' else 88
        p = TAU * np.cumsum(low + 120 * np.exp(-t * 40)) / SR
        x = .85 * np.sin(p) * np.exp(-t * 18)
        x += .09 * noise(d, 3) * np.exp(-t * 125)
    elif kind == 'snare':
        x = .40 * (RNG.standard_normal(len(t)) - noise(d, 13)) * np.exp(-t * 26)
        x += .48 * np.sin(TAU * 171 * t) * np.exp(-t * 30)
    else:
        raw = RNG.standard_normal(len(t))
        high = raw - np.convolve(raw, np.ones(9) / 9, 'same')
        decay = {'hat': 79, 'open': 23, 'crash': 7}[kind]
        x = (.20 * high + .10 * np.sin(TAU * 4367 * t)) * np.exp(-t * decay)
    return x * envelope(t, d, .001, .016)


class Mix:
    def __init__(self, duration, loop=False):
        self.x = np.zeros((round(duration * SR), 2), np.float64)
        self.loop = loop

    def add(self, at, sound, gain=1.0, pan=0.0):
        start = round(at * SR)
        stereo = sound[:, None] * np.array([1 - .25 * max(pan, 0),
                                            1 + .25 * min(pan, 0)]) * gain
        if self.loop:
            # Circular overlap-add carries actual release tails across the PCM seam.
            start %= len(self.x)
            first = min(len(stereo), len(self.x) - start)
            self.x[start:start + first] += stereo[:first]
            if first < len(stereo):
                self.x[:len(stereo) - first] += stereo[first:]
        else:
            count = min(len(stereo), len(self.x) - start)
            if count > 0:
                self.x[start:start + count] += stereo[:count]

    def finish(self, target_rms):
        if self.loop:
            self.x += .075 * np.roll(self.x[:, ::-1], round(.137 * SR), axis=0)
        else:
            edge = min(round(.04 * SR), len(self.x) // 3)
            self.x[:88] *= np.linspace(0, 1, 88)[:, None]
            self.x[-edge:] *= np.linspace(1, 0, edge)[:, None]
        self.x -= np.mean(self.x, axis=0)
        rms = np.sqrt(np.mean(self.x ** 2))
        # Static attenuation only: no pumping/brickwall master or blanket boost.
        gain = min(1, 10 ** (target_rms / 20) / rms, .79 / np.max(np.abs(self.x)))
        return self.x * gain


def compose(name):
    score = SCORES[name]
    beat = 60 / score['bpm']
    mix = Mix(score['bars'] * 4 * beat, loop=True)
    def note(at, midi, beats, kind, gain, pan=0.0, accent=False):
        mix.add(at * beat, voice(midi, beats * beat, kind, accent), gain, pan)
    def hit(at, kind, gain, pan=0.0):
        mix.add(at * beat, drum(kind), gain, pan)
    for bar in range(score['bars']):
        base = bar * 4
        if name == 'home':
            root = [38, 38, 39, 36][bar // 4]
            note(base, root - 12, 4.8, 'pad', .095)
            note(base + .1, root + 7, 4.1, 'pad', .045, -.4)
            if bar % 2 == 0:
                note(base + 1, 50 + MOTIF[(bar // 2) % 8], 2.5, 'bell', .11, .35)
            if bar % 4 == 3:
                hit(base + 3, 'tom', .055)
            continue
        if name == 'overworld':
            root = [38, 38, 41, 39, 38, 36, 39, 38][bar // 2]
            for i in range(4):
                note(base + i, root - 12, .82, 'bass', .18)
                hit(base + i, 'kick' if i % 2 == 0 else 'tom', .23)
                hit(base + i + .5, 'hat', .20, .4)
            for i in (0, 3, 5, 7):
                note(base + i * .5, root + MOTIF[i], .42, 'riff', .15, -.4)
            if bar % 2 == 1:
                for i, interval in enumerate((0, 1, 3, 7)):
                    note(base + i, 50 + interval, .8, 'bell', .09, .4)
            continue
        section = bar // 8
        if name == 'stage2':
            root = [38, 38, 39, 36, 38, 41, 39, 38][bar % 8]
            pattern = [(0, 0), (.5, 0), (.75, 0), (1.25, 3), (1.5, 0),
                       (2, 0), (2.5, 1), (2.75, 3), (3.25, 6), (3.5, 1)]
            if section == 1:
                pattern = [(i * .5, MOTIF[i]) for i in range(8)]
        elif name == 'stage3':
            root = [38, 36, 39, 38, 41, 38, 39, 33][bar % 8]
            pattern = [(0, 0), (.25, 0), (.75, 1), (1, 0), (1.5, 6),
                       (1.75, 3), (2.25, 0), (2.5, 0), (3, 7), (3.25, 6), (3.75, 1)]
            if section == 1:
                pattern = [(0, 0), (.5, 0), (1.25, 7), (1.75, 6),
                           (2, 3), (2.75, 1), (3.25, 0)]
        else:
            root = [38, 38, 39, 38, 36, 36, 39, 33][bar % 8]
            pattern = [(0, 0), (.25, 0), (.75, 1), (1.25, 0), (1.5, 6),
                       (2, 0), (2.25, 0), (2.75, 3), (3, 1), (3.5, 0), (3.75, 0)]
            if section == 2:
                pattern = [(0, 0), (.75, 1), (1.5, 6), (2.5, 3), (3.25, 1)]
        for i, (pos, interval) in enumerate(pattern):
            length = .21 if i + 1 < len(pattern) and pattern[i + 1][0] - pos <= .25 else .39
            accent = pos in (0, 1.5, 3)
            note(base + pos, root + interval, length, 'riff', .31, -.6, accent)
            note(base + pos, root + interval + 7, length * .9, 'riff', .105, .6, accent)
            note(base + pos, root - 12 + (interval if accent else 0), length, 'bass', .24)
        if section % 2 == 1:
            # Long call/response differs from the pedal figure, leaving room for SFX.
            response = (7, 6, 3, 1) if name == 'stage3' else (0, 1, 3, 6)
            for i, interval in enumerate(response):
                note(base + i + .25, 50 + interval, .61, 'riff', .082, .5, True)
        for i in range(4):
            hit(base + i, 'kick', .54)
            if i in (1, 3) and not (name == 'boss' and section == 2):
                hit(base + i, 'snare', .45)
            if name == 'boss' and section == 2 and i == 2:
                hit(base + i, 'snare', .52)
            for half in (0, .5):
                hit(base + i + half, 'open' if i == 3 and half == .5 else 'hat', .36,
                    -.6 if half == 0 else .6)
            if name != 'stage2' or bar % 2:
                hit(base + i + .75, 'kick', .29)
            if name == 'stage3' or (name == 'boss' and section in (1, 3)):
                hit(base + i + .25, 'hat', .20, .6)
        if bar % 4 == 3:
            for i in range(4):
                hit(base + 3 + i * .25, 'tom' if i % 2 else 'snare', .25)
        if bar % 8 == 0:
            hit(base, 'crash', .29, .3)
    return mix.finish(-24 if name == 'home' else -21 if name == 'overworld' else -19.5)


def sting(name):
    duration = {'victory': 4.4, 'world2': 6.4, 'help': 1.25, 'jetpack': 3.2}[name]
    mix = Mix(duration)
    if name in ('victory', 'world2'):
        notes = (38, 41, 45, 50) if name == 'victory' else (38, 39, 45, 44, 38)
        spacing = .38 if name == 'victory' else .66
        for i, midi in enumerate(notes):
            at = i * spacing
            mix.add(at, voice(midi, 1.9, 'bell'), .23, .3)
            mix.add(at, voice(midi - 12, .8, 'bass'), .23)
            mix.add(at, voice(midi + 7, .65, 'riff', True), .14, -.3)
            mix.add(at, drum('kick'), .32)
        mix.add((len(notes) - 1) * spacing, drum('crash'), .25)
        if name == 'world2':
            mix.add(0, voice(26, 6.0, 'pad'), .13)
            mix.add(2.8, voice(39, 3.2, 'pad'), .08)
    elif name == 'help':
        for at, midi in ((0, 62), (.16, 63), (.5, 62), (.66, 63)):
            mix.add(at, voice(midi, .35, 'bell'), .21)
        mix.add(0, drum('tom'), .19)
    else:
        t = time(2.8)
        phase = TAU * np.cumsum(55 + 95 * (t / 2.8) ** 1.5) / SR
        growl = np.tanh(2 * np.sin(phase + 1.3 * np.sin(2 * phase)))
        mix.add(0, (growl * .22 + noise(2.8, 15) * .21) * envelope(t, 2.8, .4, .65), 1)
        for i, interval in enumerate((0, 1, 3, 7)):
            mix.add(.6 + i * .28, voice(38 + interval, .38, 'riff', True), .18, .3)
        mix.add(.6, drum('kick'), .35)
    return mix.finish(-22)


def effect(name):
    duration = {'bear-slash': .60, 'ghost-dive': .73, 'wall-contact': .18,
                'spider-windup': .48, 'venom-impact': .33,
                'boss-windup': .94, 'portal-open': 1.85}[name]
    mix = Mix(duration)
    t = time(duration)
    if name == 'bear-slash':
        p = TAU * np.cumsum(65 + 230 * np.exp(-t * 12)) / SR
        x = np.tanh(2.2 * np.sin(p + 1.5 * np.sin(2 * p))) * np.exp(-t * 6)
        x += .7 * noise(duration, 7) * np.exp(-((t - .10) / .08) ** 2)
        mix.add(0, x * envelope(t, duration), .31)
    elif name == 'ghost-dive':
        p = TAU * np.cumsum(110 + 450 * (1 - t / duration) ** 2) / SR
        x = np.sin(p + 2.4 * np.sin(p * 1.013)) * np.sin(np.pi * t / duration) ** 2
        mix.add(0, x * envelope(t, duration), .22)
        mix.add(.25, drum('open'), .18, .5)
    elif name == 'wall-contact':
        mix.add(0, drum('tom')[:len(t)], .20)
        mix.add(.015, voice(57, .13, 'bell'), .085)
    elif name == 'spider-windup':
        for at, midi in ((0, 43), (.09, 44), (.21, 45), (.34, 46)):
            mix.add(at, voice(midi, .12, 'bell'), .18, -.3 if at < .2 else .3)
    elif name == 'venom-impact':
        p = TAU * np.cumsum(135 + 70 * np.sin(TAU * 23 * t)) / SR
        x = (np.sin(p + 2 * np.sin(2.7 * p)) + noise(duration, 19)) * np.exp(-t * 11)
        mix.add(0, x * envelope(t, duration), .21)
    elif name == 'boss-windup':
        x = voice(26, duration, 'pad') + .55 * voice(39, duration, 'pad')
        mix.add(0, x, .26)
        for at in (0, .28, .56):
            mix.add(at, drum('tom'), .18)
    else:
        p = TAU * np.cumsum(58 + 90 * t / duration) / SR
        x = np.tanh(1.6 * np.sin(p + .8 * np.sin(2 * p)))
        mix.add(0, x * envelope(t, duration, .30, .5), .20)
        mix.add(.35, voice(51, 1.3, 'bell'), .13, .3)
        mix.add(.6, voice(57, 1.1, 'bell'), .10, -.3)
    return mix.finish(-22)


def write_wav(path, x):
    assert np.isfinite(x).all() and np.max(np.abs(x)) <= .80
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), 'wb') as f:
        f.setparams((2, 2, SR, len(x), 'NONE', 'not compressed'))
        f.writeframes(np.round(x * 32767).astype('<i2').tobytes())


def main():
    for name in SCORES:
        write_wav(ROOT / 'music' / f'{name}.wav', compose(name))
        print(f'Rendered music/{name}.wav', flush=True)
    for name in ('victory', 'world2', 'help', 'jetpack'):
        write_wav(ROOT / 'music' / f'{name}.wav', sting(name))
    for name in ('bear-slash', 'ghost-dive', 'wall-contact', 'spider-windup',
                 'venom-impact', 'boss-windup', 'portal-open'):
        write_wav(ROOT / 'sfx' / f'{name}.wav', effect(name))
    (ROOT / 'sources' / 'score.json').write_text(json.dumps({
        'motif_intervals': MOTIF, 'tonal_center': 'D with Phrygian/minor color',
        'scores': SCORES, 'synthesis': 'Original deterministic FM-inspired synthesis; no samples; not YM2612 emulation'
    }, indent=2) + '\n')


if __name__ == '__main__':
    main()
