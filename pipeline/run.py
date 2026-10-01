# -*- coding: utf-8 -*-
"""Chay toan bo quy trinh cho 1 video:
  python3 pipeline/run.py runs/<id>                  # tat ca cac buoc
  python3 pipeline/run.py runs/<id> --from render    # chay lai tu buoc render
  python3 pipeline/run.py runs/<id> --only qa        # chi 1 buoc
  python3 pipeline/run.py runs/<id> --preview        # xem truoc bo cuc (uoc luong thoi gian, KHONG goi TTS) -> qa.jpg
Cac buoc: check assets tts align voice timeline audio qa render notes"""
import json, os, re, subprocess, sys, time, urllib.request
from common import ROOT, run_dir, load_spec, lines_of, log, die

STEPS = ["check", "assets", "tts", "align", "voice", "timeline", "audio", "qa", "render", "notes"]
PY = sys.executable
HERE = os.path.dirname(os.path.abspath(__file__))


def sh(cmd, fatal=True):
    log("$", " ".join(cmd))
    r = subprocess.run(cmd, cwd=ROOT)
    if r.returncode and fatal:
        die(f"Buoc that bai (ma {r.returncode}): {' '.join(cmd)}", r.returncode)
    return r.returncode


def step_assets(d, spec):
    A = os.path.join(d, "assets"); mf = os.path.join(A, "manifest.json")
    man = json.load(open(mf)) if os.path.exists(mf) else {}
    for im in spec.get("images", []):
        url, key = im.get("url"), im.get("key")
        if not url or not key:
            continue
        ext = os.path.splitext(url.split("?")[0])[1].lower()
        ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp") else ".jpg"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36 VideoTinAI/1.0"})
            data = urllib.request.urlopen(req, timeout=60).read()
            open(os.path.join(A, key + ext), "wb").write(data); man[key] = key + ext
            log("Anh OK:", key, url)
        except Exception as e:
            log("Anh LOI (bo qua):", key, url, e)
    json.dump(man, open(mf, "w"), indent=1)
    if spec.get("screenshots"):
        sh(["node", os.path.join(HERE, "shot.mjs"), d], fatal=False)


def step_notes(d, spec):
    L = lines_of(spec); post = spec.get("post", {})
    out = [f"VIDEO: {spec.get('title', spec.get('id', ''))}", f"Ngày: {spec.get('date', '')}", "=" * 70, "",
           "1) MÔ TẢ ĐĂNG KÈM VIDEO", "-" * 70, post.get("caption", ""), "", " ".join("#" + h.lstrip("#") for h in post.get("hashtags", [])), "",
           "2) NGUỒN", "-" * 70]
    for i, s in enumerate(spec.get("sources", []), 1):
        out.append(f"[{i}] {s.get('outlet', '')} — {s.get('title', '')} ({s.get('date', '')})\n    {s.get('url', '')}")
    imgs = [im for im in spec.get("images", []) if im.get("credit")]
    if imgs or spec.get("screenshots"):
        out += ["", "3) HÌNH ẢNH", "-" * 70]
        for im in imgs: out.append(f"- {im['key']}: {im['credit']} — {im.get('page', im.get('url', ''))}")
        for s in spec.get("screenshots", []): out.append(f"- Ảnh chụp màn hình: {s.get('url')}")
        out.append("- Đồ hoạ 3D/motion tự dựng bằng three.js; nhạc nền và hiệu ứng âm thanh tạo bằng code.")
    if spec.get("notes"):
        out += ["", "4) GHI CHÚ KIỂM CHỨNG", "-" * 70] + [f"- {n}" for n in spec["notes"]]
    out += ["", "5) LỜI THOẠI", "-" * 70]
    for i, ln in enumerate(L, 1):
        out.append(f"{i}. " + " ".join(re.sub(r"\*", "", c[0]) for c in ln["chunks"]))
    open(os.path.join(d, "nguon-va-mo-ta.txt"), "w", encoding="utf-8").write("\n".join(out) + "\n")
    log("Da ghi nguon-va-mo-ta.txt")


def main():
    if len(sys.argv) < 2:
        die(__doc__)
    d = run_dir(sys.argv[1]); spec = load_spec(d)
    a = sys.argv[2:]
    steps = STEPS
    if "--from" in a: steps = STEPS[STEPS.index(a[a.index("--from") + 1]):]
    if "--only" in a: steps = [a[a.index("--only") + 1]]
    if "--preview" in a:
        steps = ["check", "estimate", "timeline", "qa"]
    if "--skip" in a:
        sk = a[a.index("--skip") + 1].split(","); steps = [s for s in steps if s not in sk]
    rel = os.path.relpath(d, ROOT)
    t0 = time.time()
    for st in steps:
        log(f"\n===== {st.upper()} =====")
        if st == "check": sh([PY, os.path.join(HERE, "check_spec.py"), d])
        elif st == "assets": step_assets(d, spec)
        elif st == "tts":
            if os.path.exists(os.path.join(d, "work", "voice_raw.wav")) and "--retts" not in a:
                log("Da co work/voice_raw.wav - bo qua (them --retts de tao lai)")
            else:
                sh([PY, os.path.join(HERE, "tts.py"), d])
        elif st == "estimate": sh([PY, os.path.join(HERE, "estimate.py"), d])
        elif st == "align": sh([PY, os.path.join(HERE, "align.py"), d])
        elif st == "voice": sh([PY, os.path.join(HERE, "build_voice.py"), d])
        elif st == "timeline": sh([PY, os.path.join(HERE, "timeline.py"), d])
        elif st == "audio": sh([PY, os.path.join(HERE, "audio.py"), d])
        elif st == "qa": sh(["node", os.path.join(HERE, "render.mjs"), rel, "--snap", ""])
        elif st == "render": sh(["node", os.path.join(HERE, "render.mjs"), rel])
        elif st == "notes": step_notes(d, spec)
    log(f"\nHOAN TAT {', '.join(steps)} trong {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
