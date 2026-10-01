# -*- coding: utf-8 -*-
"""Uoc luong moc thoi gian tu so am tiet (KHONG can voice) de xem truoc bo cuc (che do --preview).
-> work/line_times.json, work/words.json"""
import json, os, sys
from common import run_dir, load_spec, lines_of, word_syl

RATE = 4.6  # am tiet/giay


def main():
    d = run_dir(sys.argv[1]); spec = load_spec(d); L = lines_of(spec); W = os.path.join(d, "work")
    t, lt, words, ck = 0.35, [], [], 0
    for i, ln in enumerate(L):
        if i: t += 0.42 if ln["scene"] != L[i - 1]["scene"] else 0.26
        a = t
        for _, say in ln["chunks"]:
            for tk in say.split():
                dd = (word_syl(tk) or 1) / RATE
                words.append({"w": tk, "line": i + 1, "chunk": ck, "start": round(t, 3), "end": round(t + dd, 3)}); t += dd
                if tk.endswith((",", ":", ";")): t += 0.15
            ck += 1
        lt.append({"start": round(a, 3), "end": round(t, 3)})
    json.dump(lt, open(os.path.join(W, "line_times.json"), "w"), indent=1)
    json.dump(words, open(os.path.join(W, "words.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(f"uoc luong: {t:.1f}s voice cho {len(L)} cau")


if __name__ == "__main__":
    main()
