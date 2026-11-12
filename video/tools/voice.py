"""Baut die Sprachspur und das exakte Timing für das Video.

Für jede Aufnahme (Segment in src/script.json) wird genommen:
  1. Franz' Aufnahme  audio/franz/<id>.(wav|m4a|mp3|aac|ogg|flac)  – falls vorhanden.
     Die Satzteile ('lines') werden über Franz' Atempausen im Audio erkannt (Stille-Erkennung).
  2. sonst die Platzhalter-Stimme (Piper TTS): jeder Satzteil wird einzeln erzeugt und
     zusammengesetzt – dadurch sind die Zeiten exakt.

Ergebnis:
  out/voice.wav   – fertige Sprachspur (48 kHz, Lautheit für Instagram normalisiert)
  src/timing.js   – Start/Ende jeder Aufnahme, jedes Satzteils und jedes Wortes

Aufruf (aus video/):  python3 tools/voice.py
"""
import hashlib
import json
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = json.loads((ROOT / "src" / "script.json").read_text())
FRANZ = ROOT / "audio" / "franz"
PLATZ = ROOT / "audio" / "platzhalter"
OUT = ROOT / "out"
SEG = OUT / "seg"
MODEL_DIR = ROOT / "tools" / ".piper"
MODEL = MODEL_DIR / "de-thorsten-low.onnx"
MODEL_URL = "https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-de-thorsten-low.tar.gz"
TRIM = ("silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.03,areverse,"
        "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.06,areverse")


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


def duration(f):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)]).stdout)


def gap_after(text):
    """Pause nach einem Satzteil (nur Platzhalter-Stimme)."""
    if re.search(r"[.!?:]$", text.strip()):
        return 0.2
    return 0.1


def ensure_model():
    if MODEL.exists():
        return
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    tgz = MODEL_DIR / "voice.tgz"
    print("Lade Platzhalter-Stimme (Piper, Thorsten) …")
    urllib.request.urlretrieve(MODEL_URL, tgz)
    run(["tar", "xzf", str(tgz), "-C", str(MODEL_DIR)])
    tgz.unlink()


def placeholder(seg):
    """Erzeugt die Platzhalter-Aufnahme Satzteil für Satzteil. Gibt (wav, [(start, ende), …]) zurück."""
    key = json.dumps([l.get("tts") or l["t"] for l in seg["lines"]], ensure_ascii=False)
    h = hashlib.sha1(key.encode()).hexdigest()[:12]
    wav = PLATZ / f"{seg['id']}.wav"
    meta = PLATZ / f"{seg['id']}.json"
    if wav.exists() and meta.exists():
        m = json.loads(meta.read_text())
        if m.get("hash") == h:
            return wav, m["lines"]
    ensure_model()
    PLATZ.mkdir(parents=True, exist_ok=True)
    parts, spans, t = [], [], 0.0
    for i, line in enumerate(seg["lines"]):
        raw = SEG / f"tts-{seg['id']}-{i}.wav"
        cut = SEG / f"tts-{seg['id']}-{i}-cut.wav"
        subprocess.run([sys.executable, "-m", "piper", "-m", str(MODEL), "--length-scale", "0.95", "-f", str(raw)],
                       input=line.get("tts") or line["t"], text=True, check=True, capture_output=True)
        run(["ffmpeg", "-y", "-i", str(raw), "-af", TRIM, "-ar", "48000", "-ac", "1", str(cut)])
        d = duration(cut)
        spans.append((round(t, 3), round(t + d, 3)))
        parts.append((cut, d))
        t += d + (gap_after(line["t"]) if i < len(seg["lines"]) - 1 else 0)
    # zusammensetzen
    inputs, filt = [], []
    for i, (f, _) in enumerate(parts):
        inputs += ["-i", str(f)]
        filt.append(f"[{i}]adelay={int(spans[i][0] * 1000)}:all=1[a{i}]")
    filt.append("".join(f"[a{i}]" for i in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0[o]")
    run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "[o]", "-t", str(spans[-1][1]), str(wav)])
    meta.write_text(json.dumps({"hash": h, "lines": spans}))
    return wav, spans


def franz_file(seg):
    for ext in ("wav", "m4a", "mp3", "aac", "ogg", "flac"):
        f = FRANZ / f"{seg['id']}.{ext}"
        if f.exists():
            return f
    return None


def weight(text):
    return max(2, len(re.sub(r"[^\wÄÖÜäöüß0-9]", "", text)))


def split_by_silence(wav, lines):
    """Findet die Grenzen der Satzteile in Franz' Aufnahme über die Atempausen."""
    d = duration(wav)
    log = subprocess.run(["ffmpeg", "-i", str(wav), "-af", "silencedetect=noise=-36dB:d=0.07", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    gaps = [(s, e) for s, e in zip(starts, ends) if 0.05 < s and e < d - 0.05]
    w = [weight(l["t"]) for l in lines]
    total = sum(w)
    expected, acc = [], 0
    for x in w[:-1]:
        acc += x
        expected.append(d * acc / total)
    bounds, last = [], 0.0
    for b in expected:
        cands = [g for g in gaps if g[0] > last and abs((g[0] + g[1]) / 2 - b) < 0.9]
        if cands:
            g = min(cands, key=lambda g: abs((g[0] + g[1]) / 2 - b) - 0.4 * (g[1] - g[0]))
            bounds.append(g)
            last = g[1]
        else:
            bounds.append((b, b))
            last = b
    spans, s = [], 0.0
    for g in bounds:
        spans.append((round(s, 3), round(g[0], 3)))
        s = g[1]
    spans.append((round(s, 3), round(d, 3)))
    return spans


def word_times(text, start, end):
    words = text.split()
    wts = [weight(x) + 1.5 for x in words]
    unit = (end - start) / sum(wts)
    t, out = start, []
    for x, wt in zip(words, wts):
        out.append({"w": x, "s": round(t, 3), "e": round(t + wt * unit, 3)})
        t += wt * unit
    return out


def main():
    SEG.mkdir(parents=True, exist_ok=True)
    t = SCRIPT["start"]
    segs = []
    for seg in SCRIPT["segments"]:
        dst = SEG / f"{seg['id']}.wav"
        src = franz_file(seg)
        if src:
            run(["ffmpeg", "-y", "-i", str(src), "-af", TRIM + ",highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,"
                 "equalizer=f=3500:t=q:w=1:g=2", "-ar", "48000", "-ac", "1", str(dst)])
            spans, who = split_by_silence(dst, seg["lines"]), "Franz"
        else:
            wav, spans = placeholder(seg)
            run(["ffmpeg", "-y", "-i", str(wav), "-ar", "48000", "-ac", "1", str(dst)])
            who = "Platzhalter"
        d = duration(dst)
        lines = []
        for line, (a, b) in zip(seg["lines"], spans):
            entry = {"t": line["t"], "s": round(t + a, 3), "e": round(t + b, 3), "words": word_times(line["t"], t + a, t + b)}
            if "card" in line:
                entry["card"] = line["card"]
            lines.append(entry)
        segs.append({"id": seg["id"], "scene": seg["scene"], "q": bool(seg.get("q")), "start": round(t, 3),
                     "end": round(t + d, 3), "lines": lines, "voice": who})
        print(f"{seg['id']}  {who:11s} {t:6.2f}s – {t + d:6.2f}s  " + " | ".join(l["t"] for l in seg["lines"]))
        t += d + seg["pause"]
    total = round(segs[-1]["end"] + SCRIPT["outro"], 3)

    inputs, filt = [], []
    for i, s in enumerate(segs):
        inputs += ["-i", str(SEG / f"{s['id']}.wav")]
        filt.append(f"[{i}]adelay={int(s['start'] * 1000)}:all=1[a{i}]")
    filt.append("".join(f"[a{i}]" for i in range(len(segs))) + f"amix=inputs={len(segs)}:normalize=0,"
                f"apad=whole_dur={total},loudnorm=I=-14:TP=-1.5:LRA=11[out]")
    run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]", "-ar", "48000", "-t", str(total), str(OUT / "voice.wav")])

    timing = {"fps": 30, "total": total, "segments": segs}
    (ROOT / "src" / "timing.js").write_text(
        "// Automatisch erzeugt von tools/voice.py – nicht von Hand bearbeiten.\n"
        f"window.TIMING = {json.dumps(timing, ensure_ascii=False, indent=1)};\n")
    print(f"\nGesamtlänge: {total:.1f} s  →  out/voice.wav, src/timing.js")


if __name__ == "__main__":
    main()
