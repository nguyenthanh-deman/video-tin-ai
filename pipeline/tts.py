# -*- coding: utf-8 -*-
"""Tao TOAN BO voice bang 1 lan goi Gemini TTS -> work/voice_raw.wav
Can bien moi truong GEMINI_API_KEY va mang toi generativelanguage.googleapis.com"""
import base64, json, os, re, sys, time, urllib.error, urllib.request
from common import run_dir, load_spec, lines_of, log, die

API = "https://generativelanguage.googleapis.com/v1beta"


def key():
    # Co the de trong: khi khoa Gemini duoc luu thanh "API credential" cua moi truong, proxy tu gan header.
    return os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""


def call(url, body=None, timeout=600):
    h = {"Content-Type": "application/json; charset=utf-8"}
    if key():
        h["x-goog-api-key"] = key()
    req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode("utf-8"), headers=h)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def list_models():
    names, tok = [], ""
    while True:
        j = call(API + "/models?pageSize=200" + ("&pageToken=" + tok if tok else ""))
        names += j.get("models", [])
        tok = j.get("nextPageToken", "")
        if not tok:
            return names


def ver(n):
    m = re.search(r"\d+(\.\d+)*", n)
    return [int(v) for v in m.group(0).split(".")] if m else [0]


def pick_tts(want):
    names = [m["name"].split("/", 1)[1] for m in list_models() if "tts" in m["name"]]
    log("Model TTS kha dung:", ", ".join(names))
    if want in names:
        return want
    c = [n for n in names if "flash" in n and "lite" not in n] or names
    if not c:
        die("Key nay khong co model TTS nao.", 2)
    return sorted(c, key=ver)[-1]


def with_retry(fn, what, tries=5):
    for a in range(1, tries + 1):
        try:
            return fn()
        except urllib.error.HTTPError as e:
            d = e.read().decode("utf-8", "ignore")
            log(f"{what}: lan {a} loi HTTP {e.code}: {d[:300]}")
            if e.code in (400, 401, 403, 404):
                raise
            if re.search(r"PerDay|per day|daily", d):
                die("Het han muc Gemini trong ngay.", 3)
            m = re.search(r'retry in ([\d.]+)s|"retryDelay"\s*:\s*"(\d+)', d)
            wait = max(20 * a, (int(float(m.group(1) or m.group(2))) + 5) if m else 0)
        except (urllib.error.URLError, TimeoutError) as e:
            log(f"{what}: lan {a} loi mang: {e}")
            if "Tunnel connection failed" in str(e) or "403" in str(e):
                die("Moi truong khong cho phep truy cap generativelanguage.googleapis.com - them ten mien nay vao danh sach mang cua moi truong.", 4)
            wait = 15 * a
        if a < tries:
            log(f"Cho {wait}s roi thu lai..."); time.sleep(wait)
    die(f"{what} that bai sau {tries} lan.", 5)


def main():
    d = run_dir(sys.argv[1])
    spec = load_spec(d)
    v = spec.get("voice", {})
    model, voice = v.get("model", "gemini-3.8-flash-tts"), v.get("voice", "Kore")
    style = v.get("style", "like an energetic tech-news anchor: fast-paced, clear and confident")
    L = lines_of(spec)
    prompt = f"Say in Vietnamese, {style}, with a clear one-second pause between lines:\n\n" + "\n\n".join(x["say"] for x in L)
    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}

    def go(m):
        return call(f"{API}/models/{m}:generateContent", body)
    try:
        r = with_retry(lambda: go(model), "TTS " + model)
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            die("Gemini tu choi (401/403): chua co khoa. Them GEMINI_API_KEY vao bien moi truong, hoac API credential cho generativelanguage.googleapis.com (header x-goog-api-key).", 2)
        if e.code != 404:
            die(f"Gemini TTS loi {e.code}", 2)
        model = pick_tts(model)
        log("Doi sang model:", model)
        r = with_retry(lambda: go(model), "TTS " + model)
    part = r["candidates"][0]["content"]["parts"][0]["inlineData"]
    data = base64.b64decode(part["data"])
    out = os.path.join(d, "work", "voice_raw.wav")
    if data[:4] == b"RIFF":
        open(out, "wb").write(data)
    else:
        import wave
        m = re.search(r"rate=(\d+)", part.get("mimeType", "")); rate = int(m.group(1)) if m else 24000
        with wave.open(out, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(data)
    json.dump({"model": model, "voice": voice, "lines": len(L)}, open(os.path.join(d, "work", "tts.json"), "w"))
    log(f"TTS xong: {out} | model {model} | giong {voice} | {len(L)} cau")


if __name__ == "__main__":
    main()
