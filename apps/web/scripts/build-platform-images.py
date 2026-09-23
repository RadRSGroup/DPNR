"""
Converts the designer's full-resolution section art (Google Drive
"1) Product- DPNR > The Platform", downloaded to
docs/reference-screens/platform_photos/) into the web assets each app
section uses: the hero image and that page's blurred full-page background.

    python apps/web/scripts/build-platform-images.py

Requires Pillow. Output is committed; the source PNGs are not needed at runtime.

Backgrounds use the Session 42 recipe (centre-crop to 1728x972, Gaussian blur
radius 42), then are darkened to the SAME mean brightness each page's previous
background had, so text legibility and each page's mood stay as they were;
only the source art changes.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "docs" / "reference-screens" / "platform_photos"
OUT = ROOT / "apps" / "web" / "public" / "images"

# section source -> (hero output, background output, target background mean brightness 0-255)
SECTIONS = {
    "decision/main.png": ("decision/decision-room-hero.webp", "backgrounds/decision-bg.webp", 43),
    "mirror/main.png": ("mirror/mirror-room-hero.webp", "backgrounds/mirror-bg.webp", 35),
    "growth/header.png": ("growth/growth-hero.webp", "backgrounds/growth-bg.webp", 19),
    "evolution-map/main.png": ("evolution-map/evolution-map-hero.webp", "backgrounds/evolution-map-bg.webp", 11),
    "wallet/1.png": ("wallet/wallet-hero.webp", "backgrounds/wallet-bg.webp", 10),
}

BG_SIZE = (1728, 972)

# Every one of these heroes has its title and subtitle over the bottom-left of
# the image, with only a bottom-up fade in the page's own overlay. Several of
# the new images are much brighter there than the old art (measured, not
# guessed), so rather than change the pages' overlay code, each image gets
# darkened toward the bottom-left where the text sits: (overall dim, shade
# opacity at the bottom-left corner). Tuned so each text area is no brighter
# than the previous image's was; 1.0 / 0.0 means untouched.
TEXT_SAFE = {
    "decision/main.png": (0.9, 0.55),
    "mirror/main.png": (0.62, 0.72),
    "growth/header.png": (0.85, 0.75),
    "evolution-map/main.png": (0.8, 0.9),
    "wallet/1.png": (1.0, 0.0),
}


def text_safe(img: Image.Image, dim: float, shade: float) -> Image.Image:
    if dim < 1.0:
        img = ImageEnhance.Brightness(img).enhance(dim)
    if shade <= 0:
        return img
    w, h = img.size
    # rises from 0 at 25% height to 1 at the bottom...
    vert = Image.linear_gradient("L").resize((w, h)).point(lambda v: int(max(0, v - 64) / 191 * 255))
    # ...and is strongest on the left, easing to 35% on the right edge
    horiz = Image.linear_gradient("L").rotate(90, expand=True).resize((w, h)).point(lambda v: int(255 - v * 0.65))
    mask = ImageChops.multiply(vert, horiz).point(lambda v: int(v * shade))
    return Image.composite(Image.new("RGB", (w, h), (8, 4, 14)), img, mask)


def save_webp(img: Image.Image, dest: Path, quality: int) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=quality, method=6)
    print(f"{dest.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {dest.stat().st_size // 1024} KB")


def mean_brightness(img: Image.Image) -> float:
    return ImageStat.Stat(img.convert("L")).mean[0]


def build_background(src: Image.Image, target_mean: float) -> Image.Image:
    bg = ImageOps.fit(src, BG_SIZE, Image.LANCZOS).filter(ImageFilter.GaussianBlur(42))
    current = mean_brightness(bg)
    return ImageEnhance.Brightness(bg).enhance(min(1.0, target_mean / current)) if current else bg


def main() -> None:
    for rel, (hero_out, bg_out, target) in SECTIONS.items():
        src = Image.open(SRC / rel).convert("RGB")
        hero = text_safe(src, *TEXT_SAFE.get(rel, (1.0, 0.0)))
        hero.thumbnail((1920, 1920), Image.LANCZOS)
        save_webp(hero, OUT / hero_out, 82)
        save_webp(build_background(src, target), OUT / bg_out, 80)


if __name__ == "__main__":
    main()
