#!/usr/bin/env python3
"""Bounded audio acceptance tests; only task-created temporary renders are removed."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import wave

import numpy as np

import package_audio as package

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_script(path, *args):
    subprocess.run([sys.executable, str(path), *map(str, args)], check=True,
                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


class AudioAcceptance(unittest.TestCase):
    def test_inventory_and_manifest_match_actual_files(self):
        manifest = json.loads((ROOT / 'manifest.json').read_text())
        for category, expected in (('music', package.MUSIC), ('sfx', package.SFX)):
            self.assertEqual(set(manifest[category]), set(expected))
            self.assertEqual({p.stem for p in (ROOT / category).glob('*.wav')}, set(expected))
            for key, entry in manifest[category].items():
                path = ROOT / entry['file']
                self.assertEqual(digest(path), entry['sha256'])
                pcm, _ = package.read(path)
                self.assertEqual(len(pcm), entry['frames'])
                if entry['loop']:
                    self.assertEqual(entry['loop_end_frame_exclusive'], len(pcm))
                    self.assertTrue(entry['pcm_seam']['pass'])
                    self.assertEqual(entry['pcm_seam']['two_cycle_decode_ffmpeg'], 'pass')
        for preview in manifest['previews']:
            self.assertGreater((ROOT / preview).stat().st_size, 1000)

    def test_approved_assets_are_unchanged(self):
        preserved = json.loads((ROOT / 'sources/preserved-sha256.json').read_text())
        self.assertEqual(len(preserved), 13)
        for relative, expected in preserved.items():
            self.assertEqual(digest(ROOT / relative), expected, relative)

    def test_new_palette_reproduces_byte_identically(self):
        with tempfile.TemporaryDirectory(prefix='kagebot-reproduce-') as directory:
            root = Path(directory)
            (root / 'sources').mkdir()
            script = root / 'sources/generate_palette.py'
            shutil.copyfile(ROOT / 'sources/generate_palette.py', script)
            run_script(script)
            rendered = list(root.glob('*/*.wav'))
            self.assertEqual(len(rendered), 16)
            for path in rendered:
                self.assertEqual(digest(path), digest(ROOT / path.relative_to(root)), path.name)

    def test_preserved_generator_sources_reproduce(self):
        preserved = json.loads((ROOT / 'sources/preserved-sha256.json').read_text())
        with tempfile.TemporaryDirectory(prefix='kagebot-reference-') as directory:
            root = Path(directory)
            run_script(ROOT / 'sources/reference_v5.py', root / 'v5')
            self.assertEqual(digest(root / 'v5/rooftop_loop.wav'), preserved['music/stage1-approved.wav'])
            run_script(ROOT / 'sources/reference_heavy.py', root / 'heavy')
            for relative, expected in preserved.items():
                if relative.startswith('sfx/'):
                    self.assertEqual(digest(root / 'heavy' / Path(relative).name), expected)

    def test_measurement_rejects_clipping_and_broken_seams(self):
        pcm, _ = package.read(ROOT / 'music/stage2.wav')
        # Keep disposable probes under ROOT because manifest paths are deliberately relative.
        with tempfile.TemporaryDirectory(prefix='.audio-negative-', dir=ROOT) as directory:
            for defect in ('clip', 'seam'):
                bad = pcm.copy()
                bad[0] = 32767 if defect == 'clip' else 16000
                path = Path(directory) / f'{defect}.wav'
                with wave.open(str(path), 'wb') as f:
                    f.setparams((2, 2, package.SR, len(bad), 'NONE', 'not compressed'))
                    f.writeframes(bad.tobytes())
                with self.subTest(defect=defect), self.assertRaises(AssertionError):
                    package.measure(path, True)


if __name__ == '__main__':
    unittest.main(verbosity=2)
