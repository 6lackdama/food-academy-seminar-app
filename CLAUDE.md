# EDEKA Food Academy – Seminar-Finder 2027 (Franz Posley, Fresh-Trainer)

Statische Single-File-Web-App, live über GitHub Pages:
https://edekafoodacademy.github.io/food-academy-seminar-app/
Jeder Push auf `main` geht nach ca. 1–2 Minuten automatisch live.

## Struktur
- `index.html` – komplette App (HTML/CSS/JS in einer Datei, ursprünglich als Claude-Artefakt gebaut)
- `img/` – App-Bilder, früher als base64 in `index.html` eingebettet: `plakate/` (IMGP), `personen/` (IMGPP), `zutaten/` (IMGI), `ui/` (Logo, Icons, Hintergrund)
- `img/app/` – PWA-Icons (aus dem Original-Herz-Icon skaliert), `img/og-vorschau.jpg` – Teilen-Vorschau
- `manifest.webmanifest` + `sw.js` – PWA (Home-Bildschirm, offline). HTML/JS: Netz zuerst; Bilder/Schriften: Cache, im Hintergrund aktualisiert. Bei grundlegenden Änderungen `VERSION` in `sw.js` erhöhen.
- `fonts/` – Schriften (woff)
- `fresh/` – Artwork Fresh-Bereich (webp)
- `katalog/` – Katalogseiten (webp)
- `lang/` – Übersetzungen
- `sb/` – Steakboy-Grafiken
- `thumbs/<vimeoId>.webp` – eigene Vimeo-Thumbnails von Franz (Handgriffe hochkant 9:16, Legetechniken quer 16:9)
- `vimeo-links.csv` – alle 71 Videos (Reihe;Nr;Titel;Link)

## Inhalte
- Bereich „Fresh Digital“ im Netflix-Stil: Start = Album-Fächer (2 Cover: 100 Handgriffe, Legetechniken), darunter direkt „Mehr von der Food Academy“ (EDEKA next, WizzUp, Instagram, Broschüre). Cover antippen → Album mit Video-Reihen (Zurück-Taste/„Alben“ schließt). Suche zeigt Treffer aus beiden Alben.
  - 71 Video-Kacheln, spielen im In-App-Player (Vimeo-Embed, Vollbild + Drehen), Knopf „Auf Vimeo“ öffnet `https://vimeo.com/<id>` (öffentlich, ohne Login)
  - 100 Handgriffe (39 Videos, Showcase https://vimeo.com/showcase/12013614), nach Thema sortiert: Schneiden & Portionieren, Vorbereiten, Verpacken, Präsentieren & Frische, Warenkunde, Geräte & Waage, Sicherheit & Hygiene
  - Legetechniken Level 1 (15, https://vimeo.com/showcase/11967308), Level 2 (11, https://vimeo.com/showcase/12013580), Level 3 (6, https://vimeo.com/showcase/12013582)
- Instagram-Button @edeka_foodacademy, Untertitel: „Live dabei: Seminare, Tricks & Fresh-Momente“
- Responsive: Handy-Ansicht auf Mobile, Desktop-Ansicht (max. 1280px, Top-Navigation, mehrspaltig) auf PC/Laptop

## Regeln
- Bilder immer lokal im Repo ablegen (keine externen Bild-URLs), Pfade relativ halten (Seite läuft unter Subpfad `/food-academy-seminar-app/`).
- Neue Vimeo-Thumbnails: `https://vimeo.com/api/oembed.json?url=https://vimeo.com/<id>&width=1080` → `thumbnail_url`, als webp nach `thumbs/`.
- Style: Food-Academy-CI (Gelb #FCE531, Blau #1B66B3, Orange-Graffiti-Titel, dunkler Netflix-Look). EDEKA-/Food-Academy-Logos nicht verändern.
- Steakboy-Maskottchen: 3 Finger + Daumen.
- Sprache der App: Deutsch (plus Übersetzungen in `lang/`).

## Nächster großer Schritt (optional)
Native App via Capacitor (iOS braucht Mac + Xcode + Apple Developer Account 99 $/Jahr; Android Google Play 25 $ einmalig).
