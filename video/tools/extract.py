"""Extrahiert Grafiken aus der Broschüren-PDF nach video/assets/.

Aufruf:  python3 video/tools/extract.py <Broschuere.pdf>
Benötigt: poppler-utils (pdftocairo), Pillow.
"""
import json, subprocess, sys, tempfile
from pathlib import Path
from PIL import Image

PDF = next(a for a in sys.argv[1:] if not a.startswith("--"))
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets"
DPI = 300
PAGE_PX = round(552.756 / 72 * DPI)  # eine Einzelseite (quadratisch); Seiten 2-42 sind Doppelseiten

# PDF-Doppelseite -> Seminarnummer. Titel steht jeweils oben auf der linken Seite.
# Doppelseiten 12/13 (Grill-Module) haben keinen eigenen Titel.
SEMINAR_PAGES = {6: "01", 7: "02", 8: "03", 9: "04", 10: "05", 11: "06", 14: "07", 15: "08", 16: "09",
                 17: "10", 18: "11", 19: "12", 20: "13", 21: "14", 22: "15", 23: "16", 24: "17", 25: "18",
                 26: "19", 27: "20", 28: "21", 29: "22", 30: "23", 31: "24", 32: "25", 33: "26", 34: "27",
                 35: "28", 36: "29", 37: "31"}
RIGHT_TITLE = {36: "30"}  # Lunar Abteilungsleitende steht rechts
AZUBI_PAGES = {38: "32", 39: "33", 40: "34", 41: "35"}
NO_BADGE = {11}  # Grillschule-Übersicht ohne Level-Plakette


def render(page, x, y, w, h, transp=True, dpi=DPI):
    with tempfile.TemporaryDirectory() as d:
        base = Path(d) / "r"
        cmd = ["pdftocairo", "-png", "-r", str(dpi), "-f", str(page), "-l", str(page), "-singlefile",
               "-x", str(x), "-y", str(y), "-W", str(w), "-H", str(h)]
        if transp:
            cmd.append("-transp")
        subprocess.run(cmd + [PDF, str(base)], check=True)
        return Image.open(str(base) + ".png").convert("RGBA").copy()


def is_badge(p):
    r, g, b, a = p
    return a > 200 and abs(r - g) < 14 and abs(g - b) < 18 and 70 < r < 140


def badge_bottom(im):
    """Unterkante der grauen Level-Plakette (liegt am linken Rand)."""
    px = im.load()
    last = None
    for y in range(im.height):
        r, g, b, a = px[12, y]
        if a > 200 and abs(r - g) < 14 and abs(g - b) < 18 and 70 < r < 140:
            last = y
    return last


def save(im, path, q=90):
    im.save(path, "WEBP", quality=q, method=6)


def main():
    info = {}
    top = int(PAGE_PX * 0.56)
    jobs = [(p, nr, 0) for p, nr in SEMINAR_PAGES.items()] + [(p, nr, PAGE_PX) for p, nr in RIGHT_TITLE.items()]
    for page, nr, x0 in jobs:
        im = render(page, x0, 0, PAGE_PX, top)
        opaque = im.getextrema()[3][0] == 255
        bb = int(PAGE_PX * 0.36) if page in NO_BADGE else badge_bottom(im)
        if bb is None:
            raise SystemExit(f"Keine Level-Plakette auf Seite {page} gefunden")
        im = im.crop((0, 0, PAGE_PX, bb + 4))
        if not opaque:
            r, g, b, a = im.split()
            orange = Image.eval(Image.merge("RGB", (r, g, b)).convert("HSV").split()[0], lambda hh: 255 if 5 <= hh <= 25 else 0)
            orange = Image.composite(orange, Image.new("L", im.size, 0), a.point(lambda v: 255 if v > 128 else 0))
            box = orange.getbbox()
            im = im.crop((0, max(0, box[1] - 30), min(PAGE_PX, box[2] + 40), im.height))
            # graue Reste (Outline-Zahlen) unterhalb der Plakettenzeile rechts entfernen
            px = im.load()
            badge_top = next((y for y in range(im.height) if is_badge(px[12, y])), im.height)
            badge_right = max((x for x in range(im.width) if badge_top + 20 < im.height and is_badge(px[x, badge_top + 20])), default=0)
            for yy in range(im.height):
                for xx in range(int(PAGE_PX * 0.2) if yy < badge_top - 5 else badge_right + 30, im.width):
                    rr, gg, bb2, aa = px[xx, yy]
                    if aa and abs(rr - gg) < 12 and abs(gg - bb2) < 14 and rr > 150:
                        px[xx, yy] = (0, 0, 0, 0)
        save(im, OUT / "titles" / f"{nr}.webp")
        info[nr] = {"page": page, "w": im.width, "h": im.height, "opaque": opaque}
        print(nr, page, im.size, "opaque" if opaque else "")
    half = round(552.756 / 72 * 150)
    for page, nr in AZUBI_PAGES.items():  # linke Seite komplett (Foto + Titel)
        im = render(page, 0, 0, half, half, transp=False, dpi=150)
        save(im.convert("RGB"), OUT / "pages" / f"{nr}.webp", 86)
        info[nr] = {"page": page, "full": True}
        print(nr, page, "Seite")
    d200 = round(552.756 / 72 * 200)
    for page, name, w in [(1, "cover", 1), (2, "einleitung", 2), (3, "lernreise", 2), (4, "digital", 2), (43, "rueckseite", 1)]:
        im = render(page, 0, 0, d200 * w, d200, transp=False, dpi=200)
        save(im.convert("RGB"), OUT / "pages" / f"{name}.webp", 88)
    (OUT / "titles" / "info.json").write_text(json.dumps(info, indent=1))


if __name__ == "__main__" and "--food" not in sys.argv:
    main()


def cutouts():
    """Freigestellte Food-Fotos (Bild + Alpha-Maske) aus allen Doppelseiten."""
    import re
    dest = OUT / "food"
    dest.mkdir(exist_ok=True)
    lst = subprocess.run(["pdfimages", "-list", PDF], capture_output=True, text=True, check=True).stdout.splitlines()[2:]
    rows = [l.split() for l in lst]
    seen = set()
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(["pdfimages", "-png", "-p", PDF, f"{d}/i"], check=True)
        files = {}
        for f in Path(d).glob("i-*.png"):
            m = re.match(r"i-(\d+)-(\d+)\.png", f.name)
            files[(int(m[1]), int(m[2]))] = f
        for a, b in zip(rows, rows[1:]):
            if a[2] != "image" or b[2] != "smask" or a[5] != "icc":
                continue
            page, num, w, h, obj = int(a[0]), int(a[1]), int(a[3]), int(a[4]), a[10]
            if w < 220 or h < 220 or obj in seen:
                continue
            seen.add(obj)
            rgb = Image.open(files[(page, num)]).convert("RGB")
            mask = Image.open(files[(page, num + 1)]).convert("L").resize(rgb.size)
            rgb.putalpha(mask)
            box = rgb.getbbox()
            if box:
                save(rgb.crop(box), dest / f"p{page:02d}_{obj}.webp", 90)


if __name__ == "__main__" and "--food" in sys.argv:
    cutouts()
