"""Small decorative art cropped from the designer's room references (Session 69).

The references are flattened mockups; these pieces (Mirror's mode orbs, the
pattern-row orbs, the line-art lotus) have no separate source file yet, so
they're cropped at icon size only. Replace with the designer's own files
when they arrive (docs/reference-screens/PHOTOS_NEEDED.md). The Decision
step-card lotus is the existing NEED theme art hue-shifted to violet.

Run from apps/web:  python scripts/build-reference-crops.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

ROOT = Path(__file__).resolve().parents[1]
REFS = ROOT.parent.parent / 'docs/reference-screens/platform_photos/refs'
OUT = ROOT / 'public/images'

MIRROR_REF = REFS / 'mirror-room-home-2.png'
ORBS = {  # name: box in the 1594x986 reference
    'mirror/orb-pattern': (278, 731, 346, 799),
    'mirror/orb-situation': (467, 731, 535, 799),
    'mirror/orb-archetype': (656, 731, 724, 799),
    'mirror/pattern-orb-1': (870, 715, 918, 763),
    'mirror/pattern-orb-2': (870, 774, 918, 822),
    'mirror/pattern-orb-3': (870, 833, 918, 881),
    'mirror/pattern-orb-4': (870, 892, 918, 940),
}
LOTUS = ('mirror/lotus-line', (1360, 170, 1520, 330))


def circle(img: Image.Image) -> Image.Image:
    size = 128
    img = img.resize((size, size), Image.LANCZOS).convert('RGBA')
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((6, 6, size * 4 - 6, size * 4 - 6), fill=255)
    img.putalpha(mask.resize((size, size), Image.LANCZOS))
    return img


def violet(img: Image.Image) -> Image.Image:
    """Recolor by brightness onto the Decision reference's violet -> rose -> warm-white
    scale (a plain hue shift turned the art's gold-green tones cyan)."""
    gray = ImageOps.grayscale(img.convert('RGB'))
    return ImageOps.colorize(gray, black='#05020c', mid='#8b5cf6', white='#ffe4f1', midpoint=110)


def main() -> None:
    ref = Image.open(MIRROR_REF).convert('RGB')
    for name, box in ORBS.items():
        out = OUT / f'{name}.webp'
        out.parent.mkdir(parents=True, exist_ok=True)
        circle(ref.crop(box)).save(out, 'WEBP', quality=90)
    name, box = LOTUS
    ref.crop(box).resize((256, 256), Image.LANCZOS).save(OUT / f'{name}.webp', 'WEBP', quality=90)

    need = Image.open(OUT / 'library/themes/need-art.webp')
    violet(need).save(OUT / 'decision/lotus-violet.webp', 'WEBP', quality=85)
    print('ok')


if __name__ == '__main__':
    main()
