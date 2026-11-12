"""Stellt Steakboy-Sticker frei (schwarzer Hintergrund -> transparent, weißer Sticker-Rand bleibt).

Aufruf:  python3 tools/sticker.py <bild.png> <name> [<bild.png> <name> ...]   → assets/sb/<name>.webp
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops

OUT = Path(__file__).resolve().parent.parent / "assets" / "sb"


def cutout(src):
    im = Image.open(src).convert("RGB")
    lum = im.convert("L")
    # alles, was dunkler als der weiße Rand ist und mit dem Bildrand verbunden ist = Hintergrund (inkl. Glow)
    mask = lum.point(lambda v: 255 if v < 238 else 0)
    w, h = mask.size
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if mask.getpixel(seed) == 255:
            ImageDraw.floodfill(mask, seed, 128)
    outside = mask.point(lambda v: 255 if v == 128 else 0)
    # Glow: im Außenbereich Helligkeit -> Deckkraft (weich auslaufender weißer Rand)
    glow_alpha = lum.point(lambda v: max(0, min(255, int((v - 40) * 1.25))))
    alpha = Image.composite(glow_alpha, Image.new("L", im.size, 255), outside)
    rgb = Image.composite(Image.new("RGB", im.size, (255, 255, 255)), im, outside)
    rgb.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 8 else 0).getbbox()
    out = rgb.crop(box)
    out.thumbnail((720, 720), Image.LANCZOS)
    return out


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    args = sys.argv[1:]
    for src, name in zip(args[::2], args[1::2]):
        im = cutout(src)
        im.save(OUT / f"{name}.webp", "WEBP", quality=90, method=6)
        print(name, im.size)
