"""
Converts the designer's full-resolution Library art
(docs/reference-screens/theme_and_section_photos/, ~164 MB of PNGs) into
web-sized .webp files under apps/web/public/images/library/.

Re-run whenever that folder changes (e.g. when art for the 15 topics that
don't have a photo yet arrives): add the new file to TOPIC_FILES below, then

    python apps/web/scripts/build-library-images.py

Requires Pillow. Output is committed; the source PNGs are not needed at
runtime. Keep this mapping in sync with apps/web/src/lib/library/topic-images.ts.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "docs" / "reference-screens" / "theme_and_section_photos"
OUT = ROOT / "apps" / "web" / "public" / "images" / "library"

# Per-topic photos, keyed by the topic's real catalog slug
# (infra/cdk/scripts/library-topics-v2.seed.ts). "Self - Self & Identity/"
# is a byte-identical copy of "Know Yourself/", so only one is read.
TOPIC_FILES = {
    "identity-vs-roles": "Know Yourself/Identity vs. Roles.png",
    "self-worth-vs-performance": "Know Yourself/Self-Worth vs. Performance.png",
    "self-trust": "Know Yourself/Self-Trust.png",
    "authenticity": "Know Yourself/Authenticity.png",
    "inner-critic": "Know Yourself/Inner Critic.png",
    "self-love": "Know Yourself/Self Love - Not on My doc, but important to add.png",
    "self-acceptance": "Know Yourself/Self-Acceptance Not on My doc, but important to add.png",
    "self-respect": "Know Yourself/Self-Respect- Not on My doc, but important to add.png",
    "emotion-vs-reaction": "Emotional World/Emotion vs. Reaction.png",
    "emotional-triggers": "Emotional World/Emotional Triggers.png",
    "anger": "Emotional World/Anger.png",
    "shame-vs-guilt": "Emotional World/Shame vs. Guilt.png",
    "grief-and-letting-go": "Emotional World/Grief & Letting Go.png",
    "avoidance": "Patterns Worth Noticing/Avoidance.png",
    "people-pleasing": "Patterns Worth Noticing/People-Pleasing.png",
    "perfectionism": "Patterns Worth Noticing/Perfectionism.png",
    "control": "Patterns Worth Noticing/Control.png",
    "overthinking-and-rumination": "Patterns Worth Noticing/Overthinking & Rumination.png",
    "procrastination": "Patterns Worth Noticing/Procrastination.png",
    "attachment-styles-overview": "Relationships/Attachment Styles - Overview.png",
    "anxious-attachment-pattern": "Relationships/Anxious Attachment Pattern.png",
    "avoidant-attachment-pattern": "Relationships/Avoidant Attachment Pattern.png",
    "fearful-avoidant-push-pull-pattern": "Relationships/Fearful-Avoidant _ Push-Pull Pattern.png",
    "secure-relating": "Relationships/Secure Relating.png",
    "relationship-red-flags-vs-triggers": "Relationships/Relationship Red Flags vs. Triggers.png",
    "boundaries": "Relationships/Boundries.png",
    "boundary-vs-ultimatum": "Relationships/Boundary vs. Ultimatum.png",
    "body-signals": "Body & Energy/Body Signals.png",
    "fight-flight-freeze-and-fawn": "Body & Energy/Fight, Flight, Freeze & Fawn.png",
    "window-of-tolerance": "Body & Energy/Window of Tolerance.png",
    "rest-recovery-and-depletion": "Body & Energy/Rest, Recovery & Depletion.png",
    "ambition": "Work & Money/Ambition.png",
    "money-meaning": "Work & Money/Money Meaning.png",
    "creative-block": "Work & Money/Creative Block.png",
    "success-and-enough": "Work & Money/Success & Enough.png",
    "abundance": "Work & Money/Abundance - We need to add it to the platform ( not there now) _.png",
    "inner-child-a-practical-lens": "Meaning & Life/Inner Child - A Practical Lens.png",
    "limiting-beliefs": "Meaning & Life/Limiting Beliefs.png",
    "meaning-vs-happiness": "Meaning & Life/Meaning vs. Happiness.png",
    "gratitude": "Meaning & Life/Gratitude.png",
    "joy-and-play": "Meaning & Life/Joy & Play.png",
    "purpose": "Meaning & Life/Purpose.png",
    "integration": "Meaning & Life/Integration.png",
}

# Explore by Theme art, keyed by ExploreTheme (lowercased).
THEME_FILES = {
    "me": "Identity & Self.png",
    "feel": "Emotions & Regulations_.png",
    "patterns": "Patterns & Loops.png",
    "need": "Needs & Values.png",
    "relate": "Attachment & Closeness_.png",
    "repair": "Repair & Self-Compassion.png",
    "body": "Body & Nervous System.png",
    "choose": "Decisions & Direction.png",
    "create": "Work, Money & Creation.png",
    "life": "Meaning & Life.png",
}

# The theme art (1677x938) has a dark outer margin around a glowing glass
# frame; this box keeps the frame and trims the margin.
FRAME_BOX = (40, 40, 1637, 898)
# The frame's inner art, with the baked-in icon (top-left) excluded, used as
# the fallback cover for topics that have no photo of their own yet.
ART_BOX = (470, 110, 1570, 860)


def trim_margin(img: Image.Image, threshold: int = 40) -> Image.Image:
    """Crops away a near-black outer margin (Start Here 1-3 and For You sit
    inside one; the full-bleed Start Here 4-8 pass through unchanged)."""
    mask = img.convert("L").point(lambda v: 255 if v > threshold else 0)
    box = mask.getbbox()
    return img.crop(box) if box else img


def save(img: Image.Image, dest: Path, max_side: int, quality: int = 80) -> None:
    img = img.convert("RGB")
    img.thumbnail((max_side, max_side), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=quality, method=6)
    print(f"{dest.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {dest.stat().st_size // 1024} KB")


def main() -> None:
    for slug, rel in TOPIC_FILES.items():
        save(Image.open(SRC / rel), OUT / "topics" / f"{slug}.webp", 960)

    for theme, name in THEME_FILES.items():
        src = Image.open(SRC / "Explore by Theme" / name)
        save(src.crop(FRAME_BOX), OUT / "themes" / f"{theme}.webp", 720)
        save(src.crop(ART_BOX), OUT / "themes" / f"{theme}-art.webp", 960)

    for i in range(1, 9):
        save(trim_margin(Image.open(SRC / "Start Here" / f"{i}.png")), OUT / "start-here" / f"{i}.webp", 720)

    save(trim_margin(Image.open(SRC / "For You" / "All the same ( naming in the middle bolt).png"), 34), OUT / "for-you.webp", 720)
    save(Image.open(SRC / "Header" / "Header Just a photo.png"), OUT / "header.webp", 1920, 82)


if __name__ == "__main__":
    main()
