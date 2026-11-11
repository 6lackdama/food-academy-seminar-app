"""Baut die Sprachspur und das Timing für das Video.

Für jeden Satz (src/script.json) wird genommen:
  1. Franz' Aufnahme  audio/franz/<id>.(wav|m4a|mp3|aac|ogg)  – falls vorhanden
  2. sonst die Platzhalter-Stimme audio/platzhalter/<id>.wav (wird per Piper-TTS erzeugt)

Ergebnis:
  out/voice.wav   – fertige Sprachspur (48 kHz, Lautheit für Instagram normalisiert)
  src/timing.js   – Start/Ende jedes Satzes und jedes Wortes (steuert Animation + Untertitel)

Aufruf:  python3 tools/voice.py          (aus dem Ordner video/)
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


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, capture_output=True, text=True, **kw)


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
    """Erzeugt (oder nutzt gecachte) TTS-Datei für einen Satz."""
    text = seg.get("tts") or seg["text"]
    h = hashlib.sha1(text.encode()).hexdigest()[:10]
    wav = PLATZ / f"{seg['id']}.wav"
    stamp = PLATZ / f"{seg['id']}.txt"
    if wav.exists() and stamp.exists() and stamp.read_text() == h:
        return wav
    ensure_model()
    PLATZ.mkdir(parents=True, exist_ok=True)
    subprocess.run([sys.executable, "-m", "piper", "-m", str(MODEL), "--length-scale", "1.0", "-f", str(wav)],
                   input=text, text=True, check=True, capture_output=True)
    stamp.write_text(h)
    return wav


def source(seg):
    for ext in ("wav", "m4a", "mp3", "aac", "ogg", "flac"):
        f = FRANZ / f"{seg['id']}.{ext}"
        if f.exists():
            return f, "Franz"
    return placeholder(seg), "Platzhalter"


def clean(src, dst, is_franz):
    """Stille vorne/hinten abschneiden, Mono 48 kHz. Franz' Aufnahmen bekommen etwas Studio-Politur."""
    trim = ("silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.05,areverse,"
            "silenceremove=start_periods=1:start_threshold=-42dB:start_silence=0.08,areverse")
    polish = ",highpass=f=80,acompressor=threshold=-18dB:ratio=3:attack=5:release=80,equalizer=f=3500:t=q:w=1:g=2" if is_franz else ""
    run(["ffmpeg", "-y", "-i", str(src), "-af", trim + polish, "-ar", "48000", "-ac", "1", str(dst)])


def duration(f):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)]).stdout)


def word_times(text, start, end):
    """Verteilt die Wörter anteilig nach Silbenlänge; Satzzeichen bekommen etwas Pause."""
    words = text.split()
    weights, gaps = [], []
    for w in words:
        core = re.sub(r"[^\wÄÖÜäöüß0-9]", "", w)
        weights.append(max(len(core), 2) + 1.5 if core else 0.5)
        gaps.append(3.0 if re.search(r"[.!?]$", w) else 2.0 if re.search(r"[,:;–]$", w) else 0.0)
    unit = (end - start) / (sum(weights) + sum(gaps[:-1]))
    t, out = start, []
    for w, wt, gp in zip(words, weights, gaps):
        out.append({"w": w, "s": round(t, 3), "e": round(t + wt * unit, 3)})
        t += (wt + gp) * unit
    return out


def main():
    SEG.mkdir(parents=True, exist_ok=True)
    t = SCRIPT["start"]
    segs = []
    for seg in SCRIPT["segments"]:
        src, who = source(seg)
        dst = SEG / f"{seg['id']}.wav"
        clean(src, dst, who == "Franz")
        d = duration(dst)
        segs.append({"id": seg["id"], "scene": seg["scene"], "text": seg["text"], "start": round(t, 3),
                     "end": round(t + d, 3), "words": word_times(seg["text"], t, t + d), "voice": who})
        print(f"{seg['id']}  {who:11s} {t:6.2f}s – {t + d:6.2f}s  {seg['text']}")
        t += max(d + seg["pause"], seg.get("min", 0))
    total = round(segs[-1]["end"] + SCRIPT["outro"], 3)

    # Sprachspur zusammensetzen
    inputs, filt = [], []
    for i, s in enumerate(segs):
        inputs += ["-i", str(SEG / f"{s['id']}.wav")]
        filt.append(f"[{i}]adelay={int(s['start'] * 1000)}:all=1[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(segs)))
    filt.append(f"{mix}amix=inputs={len(segs)}:normalize=0,apad=whole_dur={total},"
                f"loudnorm=I=-14:TP=-1.5:LRA=11[out]")
    run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filt), "-map", "[out]", "-ar", "48000",
         "-t", str(total), str(OUT / "voice.wav")])

    timing = {"fps": 30, "total": total, "segments": segs}
    (ROOT / "src" / "timing.js").write_text(
        "// Automatisch erzeugt von tools/voice.py – nicht von Hand bearbeiten.\n"
        f"window.TIMING = {json.dumps(timing, ensure_ascii=False, indent=1)};\n")
    print(f"\nGesamtlänge: {total:.1f} s  →  out/voice.wav, src/timing.js")


if __name__ == "__main__":
    main()
