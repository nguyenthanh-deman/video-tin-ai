# -*- coding: utf-8 -*-
"""Can chinh voice voi loi thoai (khong can mo hinh nhan dang giong noi):
1) tim khoang lang + dem dinh am tiet trong tung doan noi
2) (neu duoc) nho Gemini nghe lai de lay moc tung cau lam "goi y"
3) quy hoach dong: gan moi khoang lang vao mot vi tri giua cac tu sao cho so am tiet khop
-> work/align.json"""
import base64, json, math, os, sys, urllib.request
import numpy as np
from common import run_dir, load_spec, lines_of, word_syl, load_wav, log, SR

LP = 3.0  # phat khoang lang dai dat o dau phay


def speech_mask(x, hop=0.01, thr_db=-42):
    n = int(SR * hop); fr = len(x) // n
    rms = np.sqrt(np.mean(x[:fr * n].reshape(fr, n) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(rms); ref = np.percentile(db, 95)
    return db > max(thr_db, ref - 38), hop


def gaps_from(mask, hop, min_gap=0.12):
    gaps, N = [], len(mask)
    first = int(np.argmax(mask)); last = N - int(np.argmax(mask[::-1])) - 1
    i = first
    while i <= last:
        if not mask[i]:
            j = i
            while j <= last and not mask[j]: j += 1
            if (j - i) * hop >= min_gap: gaps.append((i * hop, j * hop))
            i = j
        else:
            i += 1
    return first * hop, (last + 1) * hop, gaps


def peaks_of(x):
    hop = 0.005; n = int(SR * hop); fr = len(x) // n
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < 250) | (f > 3500)] = 0; xb = np.fft.irfft(X, len(x))
    db = 20 * np.log10(np.sqrt(np.mean(xb[:fr * n].reshape(fr, n) ** 2, axis=1) + 1e-12))
    k = np.hanning(9); k /= k.sum(); dbs = np.convolve(db, k, mode="same"); ref = np.percentile(dbs, 97)
    out, last = [], -1e9
    for i in range(2, fr - 2):
        if dbs[i] >= dbs[i - 1] and dbs[i] > dbs[i + 1] and dbs[i] > ref - 22:
            lo = i
            while lo > 0 and dbs[lo - 1] <= dbs[lo] and i - lo < 60: lo -= 1
            hi = i
            while hi < fr - 1 and dbs[hi + 1] <= dbs[hi] and hi - i < 60: hi += 1
            if dbs[i] - max(dbs[lo], dbs[hi]) >= 2.0 and (i - last) * hop >= 0.07:
                out.append(i * hop); last = i
    return np.array(out)


def gemini_guides(d, L, wav):
    """Nho Gemini nghe lai: tra ve moc ranh gioi giua cac cau (giay) hoac None."""
    k = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
    if os.environ.get("NO_LISTEN"):
        return None
    H = {"x-goog-api-key": k} if k else {}
    model = os.environ.get("LISTEN_MODEL", "gemini-2.5-flash")
    try:
        api = "https://generativelanguage.googleapis.com/v1beta"
        req = urllib.request.Request(api + "/models?pageSize=200", headers=H)
        ms = [m["name"].split("/", 1)[1] for m in json.loads(urllib.request.urlopen(req, timeout=60).read()).get("models", [])
              if "generateContent" in m.get("supportedGenerationMethods", [])]
        import re
        fl = [m for m in ms if re.match(r"^gemini-[\d.]+-flash$", m)]
        if fl:
            model = sorted(fl, key=lambda n: [int(v) for v in re.search(r"\d+(\.\d+)*", n).group(0).split(".")])[-1]
        scr = "\n".join(f"{i + 1}. {x['say']}" for i, x in enumerate(L))
        ask = ("This Vietnamese voice-over should read these lines in order:\n" + scr +
               "\nListen carefully. Return JSON only: {\"lines\":[{\"i\":1,\"start\":0.00,\"end\":0.00,\"ok\":true,\"note\":\"\"}],\"extra_speech\":\"\"}"
               " with start/end in seconds (2 decimals) from the start of the audio; end = when the last word ends.")
        body = {"contents": [{"parts": [{"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(open(wav, "rb").read()).decode()}}, {"text": ask}]}],
                "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
        for a in range(3):
            try:
                req = urllib.request.Request(f"{api}/models/{model}:generateContent", data=json.dumps(body).encode(),
                                             headers={**H, "Content-Type": "application/json"})
                r = json.loads(urllib.request.urlopen(req, timeout=300).read())
                j = json.loads(r["candidates"][0]["content"]["parts"][0]["text"])
                json.dump(j, open(os.path.join(d, "work", "listen.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
                ls = sorted(j["lines"], key=lambda q: q["i"])
                if len(ls) != len(L):
                    log("Gemini nghe: so cau khong khop, bo qua"); return None
                bad = [q for q in ls if not q.get("ok", True)]
                for q in bad: log(f"  Gemini nghe: cau {q['i']} co van de: {q.get('note')}")
                if j.get("extra_speech"): log("  Gemini nghe: co loi thua:", j["extra_speech"][:200])
                log(f"Gemini nghe ({model}): da lay moc {len(ls)} cau")
                return [(ls[i]["end"] + ls[i + 1]["start"]) / 2 for i in range(len(ls) - 1)]
            except Exception as e:
                log(f"Gemini nghe lan {a + 1} loi: {e}")
                import time; time.sleep(10 * (a + 1))
    except Exception as e:
        log("Bo qua buoc Gemini nghe:", e)
    return None


def main():
    d = run_dir(sys.argv[1]); spec = load_spec(d); L = lines_of(spec)
    wav = os.path.join(d, "work", "voice_raw.wav")
    x = load_wav(wav)
    mask, hop = speech_mask(x); s0, s1, G = gaps_from(mask, hop)
    pk = peaks_of(x)
    segs = []; a = s0
    for g0, g1 in G: segs.append((a, g0)); a = g1
    segs.append((a, s1))
    cnt = [int(((pk >= a) & (pk < b)).sum()) for a, b in segs]
    # danh sach tu: (chu, so am tiet, loai ngat sau tu, cau, doan)
    words, ci = [], 0
    for li, ln in enumerate(L):
        for kk, (_, say) in enumerate(ln["chunks"]):
            toks = say.split()
            for ti, tk in enumerate(toks):
                br = 0
                if tk.endswith(","): br = 1
                if tk.endswith(":") or tk.endswith(";") or (tk.endswith((".", "!", "?")) and not (ti == len(toks) - 1 and kk == len(ln["chunks"]) - 1)): br = 2
                if ti == len(toks) - 1 and kk == len(ln["chunks"]) - 1: br = 3
                words.append([tk, word_syl(tk) or 1, br, li, ci])
            ci += 1
    Wn = len(words); cum = [0.0]
    for w in words: cum.append(cum[-1] + w[1])
    S = cum[-1]; rho = max(1, sum(cnt)) / S
    net = sum(b - a for a, b in segs); spd = net / S
    brk = [None] + [w[2] for w in words]
    lineend = [p for p in range(1, Wn) if brk[p] == 3]
    if len(G) < len(lineend):
        log(f"CANH BAO: chi thay {len(G)} khoang lang cho {len(lineend) + 1} cau - voice co the doc lien, can chinh se kem chinh xac")
    guides = gemini_guides(d, L, wav)
    gmap = {}
    if guides:
        for k, p in enumerate(lineend): gmap[p] = guides[k]
    log(f"voice {len(x) / SR:.1f}s | {len(G)} khoang lang | {len(pk)} dinh / {S:.0f} am tiet | goi y Gemini: {'co' if guides else 'khong'}")

    def segcost(pa, pb, si):
        s = cum[pb] - cum[pa]
        if s <= 0: return 1e9
        c, e = cnt[si], rho * s; a, b = segs[si]
        return (c - e) ** 2 / (1.0 + 0.3 * e) + 2.5 * (math.log(max(b - a, .05) / (s * spd))) ** 2

    def gapcost(p, g):
        dd = G[g][1] - G[g][0]; t = brk[p]
        if t == 3:
            c = -2.5 * min(dd, 1.2)
            if p in gmap: c += 3.0 * min(4.0, ((G[g][0] + G[g][1]) / 2 - gmap[p]) ** 2)
            return c
        if t == 2: return -1.4 * min(dd, 0.6) + LP * max(0, dd - 0.7)
        if t == 1: return -0.9 * min(dd, 0.45) + LP * max(0, dd - 0.55)
        return 1.2 + 5 * dd

    def skips(pa, pb): return any(pa < q < pb for q in lineend)
    INF = float("inf"); NG = len(G)
    if NG == 0:
        pos = []
    else:
        dp = [[INF] * Wn for _ in range(NG)]; bk = [[-1] * Wn for _ in range(NG)]
        for p in range(1, Wn):
            if not skips(0, p): dp[0][p] = segcost(0, p, 0) + gapcost(p, 0)
        for g in range(1, NG):
            for p in range(1, Wn):
                best, arg = INF, -1
                for q in range(max(1, p - 40), p):
                    if dp[g - 1][q] == INF or skips(q, p): continue
                    v = dp[g - 1][q] + segcost(q, p, g)
                    if v < best: best, arg = v, q
                if arg >= 0: dp[g][p] = best + gapcost(p, g); bk[g][p] = arg
        best, arg = INF, -1
        for q in range(1, Wn):
            if dp[NG - 1][q] == INF or skips(q, Wn): continue
            v = dp[NG - 1][q] + segcost(q, Wn, NG)
            if v < best: best, arg = v, q
        if arg < 0:
            from common import die
            die("Khong can chinh duoc voice voi loi thoai (so khoang lang qua it?). Thu tao lai voice.", 6)
        pos = [0] * NG; pos[-1] = arg
        for g in range(NG - 1, 0, -1): pos[g - 1] = bk[g][pos[g]]
    json.dump({"pos": pos, "words": words, "segs": segs, "gaps": G}, open(os.path.join(d, "work", "align.json"), "w", encoding="utf-8"), ensure_ascii=False)
    # bao cao toc do tung cau
    bounds = [0] + pos + [Wn]; per = {}
    for k, (a, b) in enumerate(segs):
        li = words[bounds[k]][3]; per.setdefault(li, [0, 0]); per[li][0] += b - a; per[li][1] += sum(w[1] for w in words[bounds[k]:bounds[k + 1]])
    for li in sorted(per):
        r = per[li][1] / max(per[li][0], .01)
        log(f"  cau {li + 1:2d}: {per[li][0]:5.2f}s noi, {r:4.1f} am tiet/s" + ("   <-- dang ngo" if r < 1.8 or r > 8.5 else ""))


if __name__ == "__main__":
    main()
