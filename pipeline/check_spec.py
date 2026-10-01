# -*- coding: utf-8 -*-
"""Kiem tra spec.json truoc khi chay. Loi (ERR) phai sua; canh bao (WARN) nen xem lai."""
import re, sys
from common import run_dir, load_spec, lines_of, line_syl, SCENE_TYPES

ABS = re.compile(r"(tốt nhất|số một|hàng đầu|đảm bảo|100 phần trăm)", re.I)


def main():
    d = run_dir(sys.argv[1]); spec = load_spec(d)
    err, warn = [], []
    for k in ("id", "date", "badge", "scenes", "sources", "post"):
        if k not in spec: err.append(f"thieu truong '{k}'")
    sc = spec.get("scenes", [])
    if not 6 <= len(sc) <= 12: warn.append(f"nen co 6-12 canh (dang co {len(sc)})")
    if sc and sc[0].get("type") != "hook": warn.append("canh dau nen la 'hook'")
    if sc and sc[-1].get("type") != "cta": warn.append("canh cuoi nen la 'cta'")
    for i, s in enumerate(sc, 1):
        t = s.get("type")
        if t not in SCENE_TYPES: err.append(f"canh {i}: type '{t}' khong hop le ({', '.join(sorted(SCENE_TYPES))})")
        if not s.get("lines"): err.append(f"canh {i}: khong co 'lines'")
        if not s.get("src"): warn.append(f"canh {i}: thieu dong nguon 'src'")
        for j, ln in enumerate(s.get("lines", []), 1):
            if not ln.get("chunks"): err.append(f"canh {i} cau {j}: khong co 'chunks'")
            for c in ln.get("chunks", []):
                if isinstance(c, list) and len(c) != 2: err.append(f"canh {i} cau {j}: moi chunk phai la [hien_thi, doc] - {c}")
                show = c[0] if isinstance(c, list) else str(c)
                if len(re.sub(r"\*", "", show)) > 46: warn.append(f"canh {i} cau {j}: phu de dai {len(show)} ky tu (nen <= 40): {show}")
    L = lines_of(spec)
    tot = 0
    for i, ln in enumerate(L, 1):
        say = ln["say"]
        if re.search(r"\d", say): err.append(f"cau {i}: phan doc (say) con chu so - viet so thanh chu: {say}")
        if re.search(r"[%$€&/+=#@]", say): err.append(f"cau {i}: phan doc con ky hieu (%,$,/...) - viet thanh chu: {say}")
        if ABS.search(say): warn.append(f"cau {i}: co tu tuyet doi: {ABS.search(say).group(0)}")
        tot += line_syl(say)
    if not 8 <= len(L) <= 16: warn.append(f"nen co 10-14 cau (dang co {len(L)})")
    if not 190 <= tot <= 290: warn.append(f"tong ~{tot:.0f} am tiet (nen 220-270 cho ~60 giay)")
    for i, s in enumerate(spec.get("sources", []), 1):
        if not str(s.get("url", "")).startswith("http"): err.append(f"nguon {i}: thieu url")
    if not spec.get("sources"): err.append("phai co it nhat 1 nguon")
    for m in warn: print("WARN", m)
    for m in err: print("ERR ", m)
    print(f"spec: {len(sc)} canh, {len(L)} cau, ~{tot:.0f} am tiet (~{tot / 4.6:.0f}s voice)")
    sys.exit(1 if err else 0)


if __name__ == "__main__":
    main()
