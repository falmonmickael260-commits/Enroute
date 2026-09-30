#!/usr/bin/env python3
"""Builds public/audio from the original CC0 recordings (see public/audio/CREDITS.md).

    python3 scripts/build-audio.py <sources-dir>

<sources-dir> holds clones of the repositories the files are taken from:
  kenney-racing/  https://github.com/KenneyNL/Starter-Kit-Racing          (audio/*.ogg)
  cargame/        https://github.com/Malay146/car-game                     (public/audio/...)
  interdiction/   https://github.com/teknolog1k/Interdiction               (Audio/Kenney/Impact Sounds)
  pigdev/         https://github.com/pigdevstudio/assets                   (sandbox/audio/...)

Processing is technical only: mono, peak normalised to -1 dBFS, trimmed of
silence, short fades, web encoding (WAV for sample-exact engine loops,
MP3 for everything else: the one format every browser decodes, Chromium
builds without proprietary codecs included). Needs ffmpeg (FFMPEG env var)
and numpy.
"""
import os, subprocess, sys
import numpy as np

SRC = sys.argv[1]
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "public", "audio")
FF = os.environ.get("FFMPEG", "ffmpeg")
SR = 44100


def load(path):
    raw = subprocess.run([FF, "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def write(x, name, codec):
    path = os.path.join(OUT, name)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    args = [FF, "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-"]
    if codec == "wav":
        args += ["-c:a", "pcm_s16le"]
    else:
        # VBR quality: ~70 kb/s mono for effects, lower for the ambience beds
        args += ["-c:a", "libmp3lame", "-q:a", codec]
    subprocess.run(args + [path], input=x.astype(np.float32).tobytes(), check=True)
    print(f"{name:32s} {len(x) / SR:5.2f}s {os.path.getsize(path) / 1024:6.1f} KB")


def peak_norm(x, db=-1.0):
    return x * (10 ** (db / 20) / max(1e-9, np.abs(x).max()))


def trim(x, thresh_db=-50, pad=0.01):
    """Cuts leading/trailing silence, keeping a few ms of air."""
    t = 10 ** (thresh_db / 20) * np.abs(x).max()
    idx = np.where(np.abs(x) > t)[0]
    if not len(idx):
        return x
    a = max(0, idx[0] - int(pad * SR))
    b = min(len(x), idx[-1] + int(pad * SR))
    return x[a:b]


def fade(x, fin=0.002, fout=0.02):
    x = x.copy()
    n1, n2 = int(fin * SR), int(fout * SR)
    if n1:
        x[:n1] *= np.linspace(0, 1, n1)
    if n2:
        x[-n2:] *= np.linspace(1, 0, n2) ** 2
    return x


def dc(x):
    return x - x.mean()


def one_shot(src, name, bitrate="4", fout=0.03):
    write(fade(peak_norm(trim(dc(load(os.path.join(SRC, src))))), fout=fout), name, bitrate)


def engine_loop(src, name):
    # the loops are seamless as recorded: only level and DC, no fades (a fade would click)
    write(peak_norm(dc(load(os.path.join(SRC, src))), -3.0), name, "wav")


def seamless(x, overlap=1.5):
    """Bakes a loop: the tail is crossfaded into the head, so the file loops without a seam or a dip."""
    n = int(overlap * SR)
    head, body, tail = x[:n], x[n:-n], x[-n:]
    t = np.linspace(0, 1, n)
    return np.concatenate([np.sqrt(t) * head + np.sqrt(1 - t) * tail, body])


def ambience(src, name):
    write(seamless(peak_norm(dc(load(os.path.join(SRC, src))), -3.0)), name, "6")


K = "interdiction/Audio/Kenney/Impact Sounds/"
C = "pigdev/sandbox/audio/cassino_sfx/"
U = "pigdev/sandbox/audio/ui_sfx/"

# engine: one road-car engine recorded at rising rpm (domasx2, CC0)
engine_loop("cargame/public/audio/engine/loop0.wav", "engine/engine-low.wav")
engine_loop("cargame/public/audio/engine/loop2.wav", "engine/engine-mid.wav")
engine_loop("cargame/public/audio/engine/loop5.wav", "engine/engine-high.wav")

# tyres and impacts
one_shot("kenney-racing/audio/skid.ogg", "sfx/skid.mp3", fout=0.2)
one_shot("kenney-racing/audio/impact.ogg", "sfx/impact-car.mp3")
one_shot(K + "impactMetal_heavy_000.ogg", "sfx/metal-heavy.mp3")
one_shot(K + "impactMetal_heavy_002.ogg", "sfx/metal-heavy-2.mp3")
one_shot(K + "impactMetal_medium_001.ogg", "sfx/metal-medium.mp3")
one_shot(K + "impactMetal_light_000.ogg", "sfx/metal-light.mp3")
one_shot(K + "impactMetal_light_003.ogg", "sfx/metal-light-2.mp3")
one_shot(K + "impactPlate_heavy_000.ogg", "sfx/plate-heavy.mp3")
one_shot(K + "impactPlank_medium_000.ogg", "sfx/plank.mp3")
one_shot(K + "impactGeneric_light_000.ogg", "sfx/tick.mp3")
one_shot(K + "impactGlass_light_000.ogg", "sfx/glass-light.mp3")

# cards and interface
one_shot(C + "cardSlide1.ogg", "ui/card-draw.mp3")
one_shot(C + "cardPlace1.ogg", "ui/card-play.mp3")
one_shot(C + "cardShove1.ogg", "ui/card-discard.mp3")
one_shot(U + "click1.ogg", "ui/click.mp3", fout=0.01)
one_shot("cargame/public/audio/jingles/race-win.ogg", "ui/victory.mp3", bitrate="2", fout=0.1)

# outdoors
ambience("cargame/public/audio/sfx/wind-loop.mp3", "ambience/wind.mp3")
ambience("cargame/public/audio/ambience/birds.mp3", "ambience/birds.mp3")
ambience("cargame/public/audio/ambience/crickets.mp3", "ambience/crickets.mp3")
