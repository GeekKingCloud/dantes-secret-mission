#!/usr/bin/env python3
"""Original fast Kagebot rooftop loop. Python 3 + NumPy; no external samples."""
import json
import math
import sys
import wave
from pathlib import Path

import numpy as np

SR = 44100
BPM = 176
BEAT = 60 / BPM
BARS = 24
BAR = 4 * BEAT
FRAMES = round(BARS * BAR * SR)
TAU = 2 * np.pi
ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / 'source-renders' / 'v5'
RNG = np.random.default_rng(926176)
SEMITONES = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5,
             'F#': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}


def hz(note):
    return 440 * 2 ** ((SEMITONES[note[:-1]] + 12 * (int(note[-1]) + 1) - 69) / 12)


def place(track, beat, sound, gain=1.0, pan=0.0):
    start = round(beat * BEAT * SR)
    end = min(FRAMES, start + len(sound))
    if end > start:
        track[start:end, 0] += gain * (1 - .28 * max(pan, 0)) * sound[:end-start]
        track[start:end, 1] += gain * (1 + .28 * min(pan, 0)) * sound[:end-start]


def shape(t, duration, attack=.002, release=.025):
    return np.minimum(1, t / attack) * np.minimum(1, np.maximum(0, duration-t) / release)


def guitar(note, beats, accent=False):
    """Two detuned FM carriers, palm-mute gate and restrained soft saturation."""
    duration = beats * BEAT
    t = np.arange(round(duration * SR)) / SR
    f = hz(note)
    phase = TAU * f * t
    mod = 2.7 * np.exp(-t * 24) + 1.15
    a = np.sin(phase + mod * np.sin(2 * phase))
    bphase = TAU * f * 1.006 * t
    b = np.sin(bphase + (1.2 + .9 * np.exp(-t*19)) * np.sin(3 * bphase))
    # Audibly gritty 100-500 Hz body, with enough harmonics for a small speaker.
    grit = np.tanh(2.2 * (.68*a + .32*b))
    gate = np.exp(-t * (7.5 if accent else 15)) * .75 + .25
    return (grit * gate * shape(t, duration, .0015, .018)).astype(np.float32)


def bass(note, beats):
    duration = beats * BEAT
    t = np.arange(round(duration * SR)) / SR
    f = hz(note)
    p = TAU * f * t
    # Upper harmonic intentionally present: low fundamental alone disappears on phones.
    body = np.sin(p + (1.4*np.exp(-t*13)+.3)*np.sin(2*p)) + .24*np.sin(2*p)
    return (np.tanh(1.5*body) * shape(t, duration, .002, .035)
            * (.76 + .24*np.exp(-t*10))).astype(np.float32)


def kick():
    duration = .26
    t = np.arange(round(duration*SR))/SR
    phase = TAU * np.cumsum(53 + 104*np.exp(-t*43)) / SR
    tick = RNG.standard_normal(len(t)) * np.exp(-t*160)
    return ((.84*np.sin(phase)*np.exp(-t*17) + .19*tick)
            * shape(t,duration,.001,.018)).astype(np.float32)


def snare():
    duration = .19
    t = np.arange(round(duration*SR))/SR
    noise = RNG.standard_normal(len(t))
    high = noise - np.convolve(noise,np.ones(11)/11,'same')
    phase = TAU*np.cumsum(178 - 38*(1-np.exp(-t*42)))/SR
    return ((.31*high*np.exp(-t*23) + .4*np.sin(phase)*np.exp(-t*29))
            * shape(t,duration,.001,.017)).astype(np.float32)


def hat(opened=False):
    duration = .18 if opened else .065
    t = np.arange(round(duration*SR))/SR
    noise = RNG.standard_normal(len(t))
    high = noise - np.convolve(noise,np.ones(7)/7,'same')
    metal = np.sin(TAU*4253*t)+.4*np.sin(TAU*5819*t)
    return ((.2*high+.16*metal)*np.exp(-t*(26 if opened else 80))
            * shape(t,duration,.0008,.012)).astype(np.float32)


def stab(note):
    duration = .38
    t = np.arange(round(duration*SR))/SR
    p = TAU*hz(note)*t
    metallic = np.sin(p + (2.4*np.exp(-t*12)+.5)*np.sin(2.5*p))
    return (metallic*np.exp(-t*7)*shape(t,duration,.003,.075)).astype(np.float32)


def compose():
    tracks = {key: np.zeros((FRAMES,2),np.float32) for key in ('riff','bass','drums','accent')}
    # Original four-bar machine-riff in D minor/Phrygian color. Entries are eighth-note
    # slots; -1 is a deliberate rest. Eighths are the backbone, sixteenths are fills.
    roots = ['D','D','Eb','C', 'D','F','Eb','A', 'D','D','C','Eb',
             'D','F','G','A', 'D','Eb','C','A', 'D','F','Eb','D']
    figures = [
        [0,0,0,3,0,0,1,0], [0,0,5,0,0,3,1,0],
        [0,0,0,6,5,0,1,0], [0,0,3,0,6,5,1,0],
        [0,0,0,3,0,6,5,0], [0,0,5,3,0,0,1,0],
    ]
    semis = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
    def shifted(root, interval, octave):
        midi = 12*(octave+1)+SEMITONES[root]+interval
        return semis[midi%12]+str(midi//12-1)
    for bar, root in enumerate(roots):
        base = bar*4
        fig = figures[(bar + bar//4)%len(figures)]
        for slot, interval in enumerate(fig):
            at = base + slot*.5
            if interval < 0: continue
            accent = slot in (0,3,6)
            note = shifted(root, interval, 2)
            place(tracks['riff'],at,guitar(note,.46,accent),.29,pan=-.25)
            # bass doubles every actual eighth; distinct punch from the guitar octave.
            place(tracks['bass'],at,bass(shifted(root,interval if slot in (3,6) else 0,1),.46),.20)
            if slot in (0,4,7):
                place(tracks['riff'],at,guitar(shifted(root,interval,3),.34),.075,pan=.34)
        # Pre-downbeat sixteenth runs on phrase pickups (not a half-time disguise).
        if bar%4 == 3:
            for j, interval in enumerate((0,1,3,6)):
                at=base+3+j*.25
                place(tracks['riff'],at,guitar(shifted(root,interval,2),.22),.24,pan=-.23)
                place(tracks['bass'],at,bass(shifted(root,interval,1),.22),.15)
        # Four-on-floor kick plus selected offbeat doubles; snares at beats 2 and 4.
        for beat in range(4):
            at=base+beat
            place(tracks['drums'],at,kick(),.55)
            if beat in (1,3): place(tracks['drums'],at,snare(),.60,pan=.1)
            if beat in (0,2) and bar%2 == 1:
                place(tracks['drums'],at+.75,kick(),.33)
            for half in (0,.5):
                place(tracks['drums'],at+half,hat(beat==3 and half==.5),.43,
                      pan=-.25 if half==0 else .25)
            # Frequent sixteenth hat strokes maintain forward motion between eighths.
            if beat in (1,3) or bar%4 == 3:
                place(tracks['drums'],at+.75,hat(),.26,pan=.18)
        if bar%4 in (1,3):
            for n in (shifted(root,0,3), shifted(root,6,3)):
                place(tracks['accent'],base+2.5,stab(n),.075,pan=.26)
    # Static bus levels rather than uncontrolled master limiting.
    mix = sum(tracks.values())
    peak = float(np.max(np.abs(mix)))
    gain = min(1.0, .87/peak)
    mix *= gain
    edge = round(.004*SR)
    ramp = np.linspace(0,1,edge,endpoint=False,dtype=np.float32)
    mix[:edge] *= ramp[:,None]
    mix[-edge:] *= ramp[::-1,None]
    return mix, {'pre_gain_peak':round(peak,6),'master_gain':round(gain,6),
                 'riff_eighth_notes':BARS*8,'kick_quarter_notes':BARS*4,
                 'snare_backbeats':BARS*2,'hat_eighth_notes':BARS*8}


def main():
    ROOT.mkdir(parents=True,exist_ok=True)
    signal, scheduling = compose()
    peak = float(np.max(np.abs(signal)))
    assert peak < .98
    pcm = np.round(signal*32767).astype('<i2')
    with wave.open(str(ROOT/'rooftop_loop.wav'),'wb') as f:
        f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes(pcm.tobytes())
    seam = np.abs(signal[0]-signal[-1])
    manifest = {
        'title':'Kagebot — Iron Roof Run (original audition)',
        'style':'original gritty FM-inspired synthesis, not YM2612 emulation; no samples',
        'tempo_bpm':BPM, 'meter':'4/4','bars':BARS,
        'music':{'file':'rooftop_loop.wav','frames':FRAMES,'duration_s':round(FRAMES/SR,6),
                 'sample_rate':SR,'channels':2,'pcm_bits':16,
                 'peak_dbfs':round(20*math.log10(peak),3),
                 'rms_dbfs':round(20*math.log10(float(np.sqrt(np.mean(signal.astype(np.float64)**2)))),3),
                 'clipped_pcm_samples':int(np.count_nonzero(np.abs(pcm)==32767))},
        'scheduling':scheduling,
        'seam':{'sample_delta_max':round(float(np.max(seam)),8),
                'last_10ms_rms':round(float(np.sqrt(np.mean(signal[-441:]**2))),8),
                'first_10ms_rms':round(float(np.sqrt(np.mean(signal[:441]**2))),8)}
    }
    (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2,sort_keys=True)+'\n')
    print(json.dumps(manifest,indent=2))

if __name__=='__main__': main()
