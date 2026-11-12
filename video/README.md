# 3D-Motion-Video „Seminare 2027“ (Instagram Reel)

Werbe-Video zur Broschüre *Seminare 2027 – Food Academy Fresh*, komplett aus Code gebaut – als **echte 3D-Produktion**:
[Three.js](https://threejs.org) rendert eine 3D-Studioszene (Studiolicht, weiche Schatten, Glanz-Reflexionen), [GSAP](https://gsap.com) steuert die Animation, Chromium (Playwright) rendert Bild für Bild, ffmpeg macht daraus die MP4.

- Format: 1080 × 1920 (9:16), 30 fps, H.264 + AAC, ca. 85 s
- Ton: locker, Gen Z, für Mitarbeitende. Eigenständiges Video zur Broschüre, ohne Verweis auf App oder Links.
- **Keine Untertitel:** Der gesprochene Text ist die Typografie der Szene. Jedes Wort klappt im Sprechtakt als extrudierte 3D-Schrift auf (weiß mit orangener Kante, Schlüsselwörter gelb, Pointen in 3D-Marker-Schrift). Einstellungen: `HL` und `PUNCH` in `src/main.js`.
- 3D-Elemente: Seminar-Karten als 3D-Tafeln, die durch den Raum fliegen; die Broschüre als 3D-Buch, das aufklappt und blättert; 3D-Level-Treppe mit Gold-Herzen; schwebende Glanz-Herzen; 3D-Konfetti; Papierflieger; Kamerafahrten.

## Ablauf (Szenen)

| # | Szene | 3D-Inhalt | Steakboy |
|---|---|---|---|
| 0 | Hook | NEU / 2027 / FRESH knallen als 3D-Schrift rein | – |
| 1 | Intro | Logo, Herz-Ring, „Hey Leute, / Franz hier – / euer Fresh-Trainer!“ | winken |
| 2 | Cover | 3D-Broschüre dreht sich rein, „Die Seminare 2027 …“, Konfetti bei „sind da!“ | party |
| 3 | Menschen | „Denn Menschen machen den Unterschied“ → Gold-Herz + „ALSO: DU!“ | zeigt |
| 4 | Level | 3D-Level-Treppe (jede Stufe auf ihrem Wort), „Hier levelst du auf!“ | denkt → tanzen → idee |
| 5–11 | Themen 1/7 … 7/7 | Frage als große 3D-Schrift, dann Antwort: jede Seminar-Karte fliegt als 3D-Tafel genau auf ihrem Satzteil rein | eigener Sticker für Frage und Antwort |
| 12 | Fresh Digital | dunkles Studio, „Und zwischendurch?“, 3D-Kacheln | schlafen2 → achtung2 |
| 13 | Share | „Bock drauf? Schick das deiner Marktleitung!“ + 3D-Papierflieger | tanzen |
| 14 | Broschüre | 3D-Buch klappt auf und blättert, Endcard mit Logo, Gold-Herz, „Wir sehen uns an der Theke!“ | denkt2 → präsentiert → winken2 |

## Ordner

```
video/
  src/index.html, style.css, main.js   ← das Video (3D-Szene + Animation)
  src/main-2d.js                       ← ältere 2D-Version (nur als Referenz)
  src/script.json                      ← Sprechertext: Aufnahmen → Satzteile ('lines') → Karte ('card')
  src/timing.js                        ← automatisch erzeugt (Zeitpunkte aus der Sprachspur)
  assets/                              ← aus der PDF extrahierte Grafiken (Titel, Fotos, Logo als Vektor)
  audio/franz/                         ← HIER kommen Franz' Aufnahmen rein
  audio/platzhalter/                   ← Platzhalter-Stimme (Piper TTS), bis Franz aufgenommen hat
  tools/extract.py                     ← Grafiken aus der Broschüren-PDF holen
  tools/voice.py                       ← Sprachspur + Timing bauen
  tools/render.cjs                     ← Video rendern
  tools/sticker.py                     ← Steakboy-Sticker freistellen (schwarzer Hintergrund → transparent)
  assets/sb/                           ← freigestellte Steakboy-Sticker
  assets/fonts3d/                      ← Schriften für die 3D-Typografie
  out/                                 ← Ergebnis (nicht im Git)
```

## Befehle (im Ordner `video/`)

```bash
npm install                     # einmalig (Three.js, GSAP, Schriften)
pip install piper-tts           # einmalig, nur für die Platzhalter-Stimme
python3 tools/voice.py          # Sprachspur + Timing neu bauen (nach jeder Text- oder Audio-Änderung)
node tools/render.cjs           # → out/seminare-2027-reel.mp4 (3D: ca. 10–20 Min. ohne Grafikkarte)
node tools/render.cjs --from 20 --to 30         # nur ein Ausschnitt
node tools/render.cjs --stills 5,12.5           # Einzelbilder zum Prüfen
node tools/render.cjs --music ../musik.mp3      # optional: Musik leise unter die Stimme mischen
python3 -m http.server 8123     # Live-Vorschau mit Ton: http://localhost:8123/src/
```

Grafiken neu aus der PDF holen: `python3 tools/extract.py <Broschüre.pdf>` und `python3 tools/extract.py <Broschüre.pdf> --food`.

---

## Sprachaufnahme durch Franz (Option C)

Franz nimmt **jede Zeile unten als eigene Datei** auf (`s01.m4a` … `s23.m4a`, auch `.wav`/`.mp3`) und legt sie in `audio/franz/`. Danach `python3 tools/voice.py` und `node tools/render.cjs`.

**Wichtig:** Die Schrägstriche `/` markieren die Satzteile. Dort bitte eine **kleine Atempause** machen (ca. eine Viertelsekunde, ganz natürlich). Daran erkennt das Skript die Satzteile, und Karten und 3D-Schrift sitzen exakt auf seiner Stimme. Fehlende Dateien nimmt das Skript von der Platzhalter-Stimme.

| Datei | Text (/ = kleine Pause) |
|---|---|
| s01 | Hey Leute, / Franz hier – / euer Fresh-Trainer! |
| s02 | Die Seminare 2027 / für die Frischetheke / sind da! |
| s03 | Denn Menschen / machen den Unterschied. / Also: du! |
| s04 | Vier Level: / Fresh-ling, / Fresh-Kraft, / Fresh-Alist, / Fresh-Master. |
| s05 | Egal ob Quereinsteiger / oder Profi – / hier levelst du auf! / Ich erklär's euch kurz. |
| s06 | Was gibt's für den Start? |
| s07 | Onboarding – / bereit zum Durchstarten. / Grundlagen – / kurz und knackig online. / Und die Heimspielserie! |
| s08 | Was gibt's rund um Fleisch? |
| s09 | Fleisch mit Profil, / die Grillschule, / die Bratenschule – / mehr weiß nur Oma! / Und für echte Profis: / die Meat Masterclass. |
| s10 | Und bei Wurst? |
| s11 | Feine Wurst und Schinken / aus aller Welt. / Voll auf die Wurst! / Und ihr werdet Food Stylist / auf Platten und Fingern. |
| s12 | Was geht beim Käse? |
| s13 | Eine kulinarische Reise, / Fromage Voyage / und die Käse-Masterclass: / High End für Profis. |
| s14 | Was gibt's rund um Fisch? |
| s15 | Rock' die Küche mit Fisch / und Fisch hautnah – / ab nach Bremerhaven! |
| s16 | Ihr wollt führen? |
| s17 | Führungstraining Theke / eins, zwei und drei, / der Ausbilderschein / und Meisterpflicht – / jetzt in nur fünf Tagen! |
| s18 | Und ihr Azubis? |
| s19 | Es ist Thekenzeit! / Hands on Meat, / im Handwerk wird gelernt – / und nach der Ausbildung / geht's erst richtig los! |
| s20 | Und zwischendurch? |
| s21 | 100 Handgriffe als Video, / Blended Learning / und WizzUp – das Quiz-Duell! |
| s22 | Bock drauf? / Schick das deiner Marktleitung! |
| s23 | Alle Details? / Ab in die Broschüre! / Wir sehen uns an der Theke! |

**Tipps für eine gute Handy-Aufnahme**
- Ruhiger Raum mit Teppich, Vorhängen oder Polstern, kein gefliester Raum. Ein Auto ist ein super Mini-Studio.
- Handy-Sprachmemo, Mikrofon ca. 15–20 cm vor dem Mund, leicht seitlich (gegen Plopp-Laute).
- Jeden Satz 2–3 × sprechen, den besten behalten. Vor und nach dem Satz kurz Stille lassen, sie wird automatisch abgeschnitten.
- Mit Energie und einem Lächeln sprechen, wie ein Instagram-Clip, nicht wie eine Durchsage. Tempo eher zügig.
- Stille, Rauschen-Filter, Kompressor und Lautheit (−14 LUFS für Instagram) erledigt `tools/voice.py`.

## Option D: Stimmklon – wie funktioniert das?

Ein KI-Dienst (z. B. ElevenLabs „Instant Voice Clone“, ab ca. 5 $/Monat) lernt aus einer kurzen Probe Franz' Stimmklang. Danach kann man beliebigen Text in seiner Stimme erzeugen lassen.

1. Franz nimmt **1–3 Minuten** sauber gesprochenen Text auf (gleiche Tipps wie oben, gerne abwechslungsreich und lebendig).
2. Im ElevenLabs-Konto: *Voices → Add voice → Instant Voice Clone*, Aufnahme hochladen und **Franz bestätigt selbst**, dass es seine Stimme ist (Pflicht beim Anbieter).
3. Die 14 Sätze oben eingeben, als MP3 herunterladen und als `s01.mp3` … in `audio/franz/` legen. Fertig.

Vorteile: Textänderungen später ohne neue Aufnahme, Übersetzungen (z. B. für `lang/`) in Franz' Stimme möglich.
Nachteile: Monatliches Abo. Die Betonung ist manchmal etwas „glatt“, und deutsche Fachbegriffe wie „Fresh-ling“ muss man teils phonetisch schreiben („Fräsch-ling“).
Wichtig: nur mit Franz' ausdrücklichem Einverständnis, und den Klon nur für Food-Academy-Inhalte nutzen.

## Musik

Das Video wird **ohne Musik** gerendert. Musik kann direkt in Instagram/CapCut darunter gelegt werden (Lautstärke ca. 15–25 %), oder hier mit `--music <datei>`.

## Schriften & Rechte

- Statt *Nexa* (Lizenz nicht vorhanden) wird **Outfit** (SIL Open Font License) verwendet, statt *BrushUpToo* **Permanent Marker** (Apache 2.0).
- Seminar-Titel, Logo, Fotos und Icons stammen 1:1 aus der Broschüren-PDF (unverändert). Das Logo wird als Vektor herausgelöst.
- GSAP ist seit 2025 auch kommerziell kostenlos.
