# Motion-Video „Seminare 2027“ (Instagram Reel)

Werbe-Video zur Broschüre *Seminare 2027 – Food Academy Fresh*, komplett aus Code gebaut:
HTML/CSS + [GSAP](https://gsap.com) für die Animation, Chromium (Playwright) rendert Bild für Bild, ffmpeg macht daraus die MP4.

- Format: 1080 × 1920 (9:16), 30 fps, H.264 + AAC, ca. 80–90 s
- Ton: locker, Gen Z, für Mitarbeitende („ihr“ in den Fragen, „du“ wenn's persönlich wird). Alle 7 Themen und alle 35 Seminare erscheinen als Karten.
- Eigenständiges Video zur Broschüre – ohne Verweis auf App oder Links. Ende: „Alle Details? Ab in die Broschüre!“
- Untertitel sind eingebrannt (Wort für Wort gelb hervorgehoben)
- Inhalte im Instagram-„sicheren Bereich“: Unten bleiben ca. 370 px frei für Profilname und Bildunterschrift.

## Ablauf (Szenen)

| # | Szene | Inhalt |
|---|---|---|
| 0 | Hook | 3 Flash-Cuts in 0,9 s: NEU / 2027 / FRESH |
| 1 | Intro | Steakboy, „HEY!“ 👋, Namensschild FRANZ · FRESH-TRAINER, Logo |
| 2 | Cover | Broschüren-Cover fliegt in 3D rein, „SEMINARE 2027 – SIND DA! 🔥“ |
| 3 | Menschen | „Menschen machen den Unterschied – also: DU!“ 🫵 |
| 4 | Level | XP-Leiste, 4 Stufen Fresh-ling → Fresh-Master als Treppe, „LEVEL UP!“ |
| 5–11 | Themen 1/7 … 7/7 | Jeweils **Frage-Beat** („Was gibt's rund um Fisch?“) mit Laufbändern, Emoji und Food-Foto, danach fliegen die Seminar-Titel aus der Broschüre als Karten rein – **genau auf dem Wort**, auf dem Franz sie nennt |
| 12 | Fresh Digital | „Und zwischendurch?“ → 100 Handgriffe (Zähler), Blended Learning, WizzUp |
| 13 | Share | „Bock drauf? Schick das deiner Marktleitung!“ mit Papierflieger |
| 14 | Broschüre | Das Cover fliegt rein, Originalseiten fächern auf („AB IN DIE BROSCHÜRE! 📖“), Endcard mit Logo, „SEMINARE 2027“ und „Wir sehen uns an der Theke!“ |

Übergänge wechseln zwischen Whip-Pan (mit Bewegungsunschärfe), Zoom-Punch, Kreis-Iris und Diagonal-Wipe; dazu Film-Korn, Funkel-Sticker und Kamera-Shakes auf den Beats.
Welche Karte bei welchem Wort reinfliegt, steht in `src/main.js` in der Liste `CATS` (Feld `cards`, z. B. `['07', 'Bratenschule']`).

## Ordner

```
video/
  src/index.html, style.css, main.js   ← das Video (Animation)
  src/script.json                      ← Sprechertext (hier Texte ändern)
  src/timing.js                        ← automatisch erzeugt (Zeitpunkte aus der Sprachspur)
  assets/                              ← aus der PDF extrahierte Grafiken (Titel, Fotos, Logo als Vektor)
  audio/franz/                         ← HIER kommen Franz' Aufnahmen rein
  audio/platzhalter/                   ← Platzhalter-Stimme (Piper TTS), bis Franz aufgenommen hat
  tools/extract.py                     ← Grafiken aus der Broschüren-PDF holen
  tools/voice.py                       ← Sprachspur + Timing bauen
  tools/render.cjs                     ← Video rendern
  out/                                 ← Ergebnis (nicht im Git)
```

## Befehle (im Ordner `video/`)

```bash
npm install                     # einmalig (GSAP, Schriften)
pip install piper-tts           # einmalig, nur für die Platzhalter-Stimme
python3 tools/voice.py          # Sprachspur + Timing neu bauen (nach jeder Text- oder Audio-Änderung)
node tools/render.cjs           # → out/seminare-2027-reel.mp4 (ca. 2–3 Min.)
node tools/render.cjs --from 20 --to 30         # nur ein Ausschnitt
node tools/render.cjs --stills 5,12.5           # Einzelbilder zum Prüfen
node tools/render.cjs --music ../musik.mp3      # optional: Musik leise unter die Stimme mischen
python3 -m http.server 8123     # Live-Vorschau mit Ton: http://localhost:8123/src/
```

Grafiken neu aus der PDF holen: `python3 tools/extract.py <Broschüre.pdf>` und `python3 tools/extract.py <Broschüre.pdf> --food`.

---

## Sprachaufnahme durch Franz (Option C)

Franz nimmt **jeden Satz als eigene Datei** auf (23 kurze Sätze – die Fragen wie „Was gibt's rund um Fisch?“ sind eigene Dateien). Animation und Untertitel passen sich danach automatisch an sein Tempo an.

**Dateinamen:** `s01.m4a`, `s02.m4a`, … (auch `.wav` oder `.mp3`) → in den Ordner `audio/franz/` legen, dann `python3 tools/voice.py` und `node tools/render.cjs` ausführen. Einzelne Sätze können auch erst später kommen: Fehlende Sätze nimmt das Skript von der Platzhalter-Stimme.

| Datei | Text |
|---|---|
| s01 | Hey Leute, Franz hier – euer Fresh-Trainer! |
| s02 | Die Seminare 2027 für die Frischetheke sind da! |
| s03 | Denn Menschen machen den Unterschied. Also: du! |
| s04 | Vier Level: Fresh-ling, Fresh-Kraft, Fresh-Alist, Fresh-Master. |
| s05 | Ob Quereinsteiger oder Profi – hier levelst du auf. Ich erklär's euch kurz! |
| s06 | Was gibt's für den Start? |
| s07 | Onboarding zum Durchstarten, Grundlagen – kurz und knackig online – und die Heimspielserie in Teilzeit. |
| s08 | Was gibt's rund um Fleisch? |
| s09 | Fleisch mit Profil, Grillschule, Bratenschule – mehr weiß nur Oma! – und die Meat Masterclass. |
| s10 | Und bei Wurst? |
| s11 | Feine Wurst und Schinken aus aller Welt – und ihr werdet Food Stylist auf Platten und Fingern. |
| s12 | Was geht beim Käse? |
| s13 | Kulinarische Reise, Fromage Voyage – bis zur Masterclass: High End für Profis. |
| s14 | Was gibt's rund um Fisch? |
| s15 | Rock' die Küche mit Fisch – und Fisch hautnah: ab nach Bremerhaven! |
| s16 | Ihr wollt führen? |
| s17 | Führungstraining Theke eins bis drei, Ausbilderschein – und Meisterpflicht in nur fünf Tagen. |
| s18 | Und ihr Azubis? |
| s19 | Es ist Thekenzeit! Hands on Meat – im Handwerk wird gelernt. |
| s20 | Und zwischendurch? |
| s21 | 100 Handgriffe als Video, Blended Learning und WizzUp – das Quiz-Duell. |
| s22 | Bock drauf? Schick das deiner Marktleitung! |
| s23 | Alle Details? Ab in die Broschüre! Wir sehen uns an der Theke! |

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
