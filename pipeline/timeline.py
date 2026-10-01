# -*- coding: utf-8 -*-
"""Tao work/timeline.json cho engine: moc tung cau, tung canh, tung doan phu de, tung tu."""
import html, json, os, re, sys
from common import run_dir, load_spec, lines_of, log


def main():
    d = run_dir(sys.argv[1]); spec = load_spec(d); L = lines_of(spec); W = os.path.join(d, "work")
    lt = json.load(open(os.path.join(W, "line_times.json")))
    words = json.load(open(os.path.join(W, "words.json"), encoding="utf-8"))
    tail = float(spec.get("tail", 2.0))
    lines, caps, ck = [], [], 0
    for i, ln in enumerate(L):
        a, b = lt[i]["start"], lt[i]["end"]
        lines.append({"i": i + 1, "scene": ln["scene"], "start": round(a, 3), "end": round(b, 3), "tone": ln["tone"]})
        for show, _ in ln["chunks"]:
            ww = [w for w in words if w["chunk"] == ck]
            cs, ce = (ww[0]["start"], ww[-1]["end"]) if ww else (a, b)
            h = re.sub(r"\*(.+?)\*", r"<em>\1</em>", html.escape(show, quote=False))
            caps.append({"start": round(cs, 3), "end": round(ce, 3), "html": h, "line": i + 1})
            ck += 1
    for k in range(len(caps) - 1):
        gap = caps[k + 1]["start"] - caps[k]["end"]
        if 0 < gap < 0.6: caps[k]["end"] = caps[k + 1]["start"]
    scenes = []
    for si in range(len(spec["scenes"])):
        ids = [l["i"] for l in lines if l["scene"] == si]
        if not ids:
            raise SystemExit(f"Canh {si + 1} khong co cau nao")
        scenes.append({"id": f"s{si + 1}", "lines": ids})
    dur = lines[-1]["end"] + tail
    for k, s in enumerate(scenes):
        s["start"] = 0.0 if k == 0 else round(lines[s["lines"][0] - 1]["start"] - 0.18, 3)
    for k, s in enumerate(scenes):
        s["end"] = round(scenes[k + 1]["start"], 3) if k + 1 < len(scenes) else round(dur, 3)
    tl = {"fps": 30, "duration": round(dur, 3), "lines": lines, "scenes": scenes, "caps": caps, "words": words}
    json.dump(tl, open(os.path.join(W, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    log(f"timeline: {dur:.2f}s | " + " ".join(f"{s['id']}={s['end'] - s['start']:.1f}s" for s in scenes))


if __name__ == "__main__":
    main()
