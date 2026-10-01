# -*- coding: utf-8 -*-
"""Ghep voice gon lai theo ket qua can chinh: rut khoang nghi, tang toc TUNG CAU cho deu nhip.
-> work/voice_tight.wav, work/words.json, work/line_times.json"""
import json, os, subprocess, sys
import numpy as np
from common import run_dir, load_spec, lines_of, load_wav, save_wav, has_filter, log, SR


def main():
    d = run_dir(sys.argv[1]); spec = load_spec(d); L = lines_of(spec)
    vcfg = spec.get("voice", {})
    RATE = float(vcfg.get("rate", 5.3))       # am tiet/giay muc tieu (tren thoi gian noi)
    TMAX = float(vcfg.get("max_tempo", 1.35))  # tang toc toi da
    x = load_wav(os.path.join(d, "work", "voice_raw.wav"))
    A = json.load(open(os.path.join(d, "work", "align.json"), encoding="utf-8"))
    pos, words, segs, gaps = A["pos"], A["words"], A["segs"], A["gaps"]
    Wn = len(words); bounds = [0] + pos + [Wn]; brk = {p: words[p - 1][2] for p in pos}
    rb = has_filter("rubberband")
    W = work = os.path.join(d, "work")
    Ls = [dict(pieces=[], wt={}, t=0.0, net=0.0, syl=0.0) for _ in L]
    for k, (a, b) in enumerate(segs):
        wa, wb = bounds[k], bounds[k + 1]; li = words[wa][3]; D = Ls[li]
        if D["pieces"]:
            g = gaps[k - 1]; dd = g[1] - g[0]; br = brk[bounds[k]]
            nd = min(dd, 0.2) if br in (1, 2) else min(dd, 0.1)
            D["pieces"].append(np.zeros(int(nd * SR), np.float32)); D["t"] += nd
        ia, ib = int(max(0, a - 0.02) * SR), int((b + 0.04) * SR)
        seg = x[ia:ib].copy(); f = int(0.008 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        ws = list(range(wa, wb)); wts = [words[i][1] for i in ws]; tot = sum(wts) or 1; acc = D["t"] + 0.02
        for i, w in zip(ws, wts):
            D["wt"][i] = [acc, acc + (b - a) * w / tot]; acc += (b - a) * w / tot
        D["pieces"].append(seg); D["t"] += len(seg) / SR; D["net"] += b - a; D["syl"] += sum(wts)
    HEAD = 0.35
    out = [np.zeros(int(HEAD * SR), np.float32)]; T = HEAD; Wd = [None] * Wn; lt = []
    for li, D in enumerate(Ls):
        if not D["pieces"]:
            log(f"CANH BAO: cau {li + 1} khong co am thanh"); lt.append({"start": T, "end": T + 0.5}); continue
        y = np.concatenate(D["pieces"]); r = D["syl"] / max(D["net"], .01)
        tempo = max(1.0, min(TMAX, RATE / r))
        if li:
            nd = 0.42 if L[li]["scene"] != L[li - 1]["scene"] else 0.26
            out.append(np.zeros(int(nd * SR), np.float32)); T += nd
        if tempo > 1.001:
            save_wav(os.path.join(W, "_l.wav"), y)
            af = ("rubberband=tempo=%.4f:transients=smooth" % tempo) if rb else ("atempo=%.4f" % tempo)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(W, "_l.wav"), "-af", af, "-ar", str(SR), "-ac", "1", os.path.join(W, "_lt.wav")], check=True)
            z = load_wav(os.path.join(W, "_lt.wav"))
        else:
            z = y
        for i, (s, e) in D["wt"].items():
            Wd[i] = {"w": words[i][0], "line": li + 1, "chunk": words[i][4], "start": round(T + s / tempo, 3), "end": round(T + e / tempo, 3)}
        lt.append({"start": round(T + 0.02 / tempo, 3), "end": round(T + (len(y) / SR - 0.04) / tempo, 3)})
        log(f"cau {li + 1:2d}: {r:4.2f} am tiet/s -> tempo {tempo:.2f} | {len(y) / SR:5.2f}s -> {len(z) / SR:5.2f}s")
        out.append(z); T += len(z) / SR
    for f in ("_l.wav", "_lt.wav"):
        try: os.remove(os.path.join(W, f))
        except OSError: pass
    save_wav(os.path.join(W, "voice_tight.wav"), np.concatenate(out))
    json.dump([w for w in Wd if w], open(os.path.join(W, "words.json"), "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(lt, open(os.path.join(W, "line_times.json"), "w"), indent=1)
    log(f"voice gon: {T:.2f}s (rubberband: {'co' if rb else 'khong, dung atempo'})")


if __name__ == "__main__":
    main()
