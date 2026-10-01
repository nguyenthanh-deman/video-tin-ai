# -*- coding: utf-8 -*-
"""Ham dung chung cho pipeline: doc spec, tach cau/doan, uoc luong am tiet, duong dan."""
import json, os, re, subprocess, sys, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
SCENE_TYPES = {"hook", "sources", "bars", "compare", "donut", "towers", "gauge", "warning", "bignum", "list", "terminal", "cta"}


def run_dir(arg):
    d = arg if os.path.isabs(arg) else os.path.join(ROOT, arg)
    d = os.path.normpath(d)
    os.makedirs(os.path.join(d, "work"), exist_ok=True)
    os.makedirs(os.path.join(d, "assets"), exist_ok=True)
    return d


def load_spec(d):
    """spec.json cua video, bo sung gia tri mac dinh tu config.json o goc repo."""
    spec = json.load(open(os.path.join(d, "spec.json"), encoding="utf-8"))
    cf = os.path.join(ROOT, "config.json")
    if os.path.exists(cf):
        cfg = json.load(open(cf, encoding="utf-8"))
        for k, v in cfg.items():
            if isinstance(v, dict):
                spec[k] = {**v, **(spec.get(k) or {})}
            else:
                spec.setdefault(k, v)
    return spec


def lines_of(spec):
    """Danh sach cau theo thu tu: [{scene, idx, tone, chunks:[(show, say)], say}]"""
    out = []
    for si, sc in enumerate(spec["scenes"]):
        for ln in sc.get("lines", []):
            ch = []
            for c in ln["chunks"]:
                if isinstance(c, str):
                    ch.append((c, re.sub(r"\*", "", c)))
                elif isinstance(c, dict):
                    ch.append((c.get("show", c.get("say", "")), c.get("say", c.get("show", ""))))
                else:
                    ch.append((c[0], c[1] if len(c) > 1 else re.sub(r"\*", "", c[0])))
            out.append({"scene": si, "tone": ln.get("tone", ""), "chunks": ch, "say": " ".join(x[1] for x in ch)})
    return out


VOWELS = re.compile(r"[aeiouy]+", re.I)


def word_syl(tok):
    """Uoc luong so am tiet cua 1 tu (tieng Viet = 1; tu tieng Anh dem nhom nguyen am; viet tat dem tung chu)."""
    w = re.sub(r"[^\wÀ-ỹ]", "", tok)
    if not w:
        return 0
    if re.search(r"[À-ỹđĐ]", w):
        return 1
    if re.fullmatch(r"\d+", w):
        return max(1, len(w)) * 1.5
    if re.fullmatch(r"[A-Z0-9]{2,5}", w):  # IPO, LLC, AI, GPU
        return len(w)
    if re.fullmatch(r"[a-z][A-Z]{1,4}", w):  # xAI
        return len(w)
    n = len(VOWELS.findall(w))
    if w.lower().endswith("e") and n > 1 and not w.lower().endswith(("le", "ee")):
        n -= 1
    return max(1, n)


def line_syl(text):
    return sum(word_syl(t) for t in text.split())


def load_wav(path, sr=SR):
    tmp = path + f".{sr}.tmp.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ac", "1", "-ar", str(sr), "-c:a", "pcm_s16le", tmp], check=True)
    with wave.open(tmp) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    os.remove(tmp)
    return x


def save_wav(path, y, sr=SR, ch=1):
    y = np.clip(y, -1, 1)
    if ch == 2 and y.ndim == 1:
        y = np.stack([y, y], 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(ch); w.setsampwidth(2); w.setframerate(sr); w.writeframes((y * 32767).astype(np.int16).tobytes())


def has_filter(name):
    try:
        out = subprocess.run(["ffmpeg", "-hide_banner", "-filters"], capture_output=True, text=True).stdout
        return re.search(r"\s%s\s" % re.escape(name), out) is not None
    except Exception:
        return False


def log(*a):
    print(*a, flush=True)


def die(msg, code=1):
    print("LOI:", msg, file=sys.stderr, flush=True)
    sys.exit(code)
