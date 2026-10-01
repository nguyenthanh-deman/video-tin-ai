# -*- coding: utf-8 -*-
"""Nhac nen + SFX tu sinh bang code (khong ban quyen), mix voi voice -> work/mix.wav"""
import json, os, subprocess, sys, wave
import numpy as np
from common import run_dir, load_spec, log

d = run_dir(sys.argv[1]); spec = load_spec(d); A = os.path.join(d, "work")
SR = 48000
TL = json.load(open(os.path.join(A, "timeline.json"), encoding="utf-8"))
DUR = TL["duration"] + 0.3
N = int(DUR * SR)
rng = np.random.default_rng(7)
t = np.arange(N) / SR
MUSIC = float(spec.get("music_volume", 0.45))


def wr(path, y):
    y = np.clip(y, -1, 1)
    if y.ndim == 1: y = np.stack([y, y], 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())


def onepole(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); z = 0.0
    for i in range(len(x)):
        z = (1 - a) * x[i] + a * z; y[i] = z
    return y


def lp_fast(x, fc):  # loc thong thap qua FFT (nhanh cho tin hieu dai)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (f / fc) ** 4)
    return np.fft.irfft(X, len(x))


def hp_fast(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / np.sqrt(1 + (fc / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X, len(x))


def note(m): return 440 * 2 ** ((m - 69) / 12)


# ---------------- nhac nen: 100 BPM, Am - F - C - G ----------------
BPM = 100; beat = 60 / BPM; bar = beat * 4
prog = [[57, 60, 64, 71], [53, 57, 60, 67], [48, 55, 60, 64], [55, 59, 62, 69]]
roots = [45, 41, 48, 43]
pad = np.zeros(N); bass = np.zeros(N); kick = np.zeros(N); hat = np.zeros(N)
nb = int(DUR / bar) + 1
for b in range(nb):
    ch = prog[b % 4]; a0 = int(b * bar * SR); a1 = min(N, int((b + 1) * bar * SR))
    if a0 >= N: break
    tt = np.arange(a1 - a0) / SR
    env = np.minimum(1, tt / 0.6) * np.minimum(1, (bar - tt) / 0.5 + 0.2)
    for m in ch:
        for det in (-0.08, 0.08):
            f = note(m + det)
            ph = (f * tt) % 1.0
            pad[a0:a1] += (2 * ph - 1) * env * 0.05
    for k in range(4):
        s0 = int((b * bar + k * beat) * SR)
        if s0 >= N: break
        L = min(N - s0, int(0.45 * SR)); tk = np.arange(L) / SR
        fk = 42 + 70 * np.exp(-tk * 30)
        kick[s0:s0 + L] += np.sin(2 * np.pi * np.cumsum(fk) / SR) * np.exp(-tk * 7) * 0.55
        fb = note(roots[b % 4] - 12 + 12)
        bass[s0:s0 + L] += np.sin(2 * np.pi * fb * tk) * np.exp(-tk * 4.5) * 0.28
        for h in (0.5,):
            s1 = int((b * bar + (k + h) * beat) * SR)
            if s1 >= N: continue
            Lh = min(N - s1, int(0.05 * SR))
            hat[s1:s1 + Lh] += rng.standard_normal(Lh) * np.exp(-np.arange(Lh) / SR * 90) * 0.12
pad = lp_fast(pad, 1400)
hat = hp_fast(hat, 7000)
music = pad * 0.9 + bass + kick * 0.8 + hat
# mo dau: 1 nhip im ro rang, fade in/out
fade = np.minimum(1, t / 0.4) * np.minimum(1, (DUR - t) / 1.8)
music *= fade

# ---------------- SFX ----------------
sfx = np.zeros(N)


def whoosh(at, dur=0.42, amp=0.35):
    s0 = int((at - dur * 0.7) * SR); L = int(dur * SR)
    if s0 < 0: L += s0; s0 = 0
    if L <= 0: return
    L = min(L, N - s0)
    n = rng.standard_normal(L); u = np.linspace(0, 1, L)
    env = np.sin(np.pi * u) ** 2
    y = onepole(n, 600) * 0.6 + hp_fast(n, 2500) * 0.25 * u
    sfx[s0:s0 + L] += y * env * amp


def hit(at, amp=0.7):
    s0 = int(at * SR); L = min(N - s0, int(1.2 * SR)); tk = np.arange(L) / SR
    f = 38 + 90 * np.exp(-tk * 18)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tk * 3.2) + rng.standard_normal(L) * np.exp(-tk * 30) * 0.25
    sfx[s0:s0 + L] += y * amp


for sc in TL["scenes"][1:]:
    whoosh(sc["start"])
hit(0.02, 0.6)
# tieng "bum" o cac khoanh khac nhan manh: khoang chenh (compare.gap), bang khoa (towers.panel), so lon (bignum)
for si, sc in enumerate(spec["scenes"]):
    T = TL["scenes"][si]; Lg = [l for l in TL["lines"] if l["i"] in T["lines"]]
    ev = (sc.get("gap") if sc["type"] == "compare" else sc.get("panel") if sc["type"] == "towers" else None)
    if ev:
        li = min(len(Lg) - 1, int(ev.get("line", 1)))
        hit(Lg[li]["start"] - 0.04, 0.55)
    if sc["type"] == "bignum":
        hit(T["start"] + 0.1, 0.4)
wr(os.path.join(A, "music.wav"), music * 0.5)
wr(os.path.join(A, "sfx.wav"), sfx * 0.6)

# ---------------- mix bang ffmpeg: voice chuan -16 LUFS, nhac duck duoi voice ----------------
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(A, "voice_tight.wav"),
                "-af", "highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2,loudnorm=I=-15:TP=-1.5:LRA=7,aresample=48000",
                "-ac", "2", os.path.join(A, "voice_proc.wav")], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y",
                "-i", os.path.join(A, "voice_proc.wav"), "-i", os.path.join(A, "music.wav"), "-i", os.path.join(A, "sfx.wav"),
                "-filter_complex",
                "[1:a]volume=%.3f[m];[0:a]asplit=2[v1][v2];"
                "[m][v2]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[md];"
                "[v1][md][2:a]amix=inputs=3:normalize=0:weights=1 1 1,alimiter=limit=0.93,apad=whole_dur=%.2f[out]" % (MUSIC, DUR),
                "-map", "[out]", "-t", "%.2f" % DUR, "-ar", "48000", os.path.join(A, "mix.wav")], check=True)
log("mix xong: %.2fs" % DUR)
