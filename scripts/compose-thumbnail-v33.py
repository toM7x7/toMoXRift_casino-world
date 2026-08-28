from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "screenshots" / "thumbnail-source-overview-2026-08-29.png"
DECORATION = ROOT / "docs" / "screenshots" / "thumbnail-decoration-imagegen-2026-08-29.png"
OUTPUT = ROOT / "public" / "thumbnail.png"
CARD = ROOT / "docs" / "screenshots" / "thumbnail-card-overview-v33.png"
FONT = ROOT / "public" / "fonts" / "MPLUS1p-Regular.ttf"


image = Image.open(SOURCE).convert("RGBA")
if image.size != (1280, 720):
    raise ValueError(f"expected 1280x720 source, got {image.size}")

# Keep the real world capture dominant while giving the sunset a little card-size punch.
image = ImageEnhance.Color(image).enhance(1.08)
image = ImageEnhance.Contrast(image).enhance(1.04)

decoration = Image.open(DECORATION).convert("RGBA")
decoration = ImageOps.fit(decoration, image.size, method=Image.Resampling.LANCZOS)
alpha = decoration.getchannel("A").point(lambda value: int(value * 0.72))
decoration.putalpha(alpha)
image = Image.alpha_composite(image, decoration)

overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

plate = (252, 26, 1028, 166)
draw.rounded_rectangle(
    plate,
    radius=22,
    fill=(8, 18, 38, 226),
    outline=(246, 196, 83, 255),
    width=4,
)
draw.line((294, 118, 986, 118), fill=(69, 210, 217, 230), width=3)
draw.polygon([(252, 166), (380, 166), (344, 184), (252, 184)], fill=(201, 63, 154, 235))
draw.polygon([(1028, 166), (900, 166), (936, 184), (1028, 184)], fill=(69, 210, 217, 235))

title_font = ImageFont.truetype(str(FONT), 54)
hook_font = ImageFont.truetype(str(FONT), 26)

title = "ブロック遊技村"
hook = "BJ・運命盤・ダービー・アニマルじゃらβ"

title_box = draw.textbbox((0, 0), title, font=title_font, stroke_width=1)
title_width = title_box[2] - title_box[0]
draw.text(
    ((1280 - title_width) / 2, 40),
    title,
    font=title_font,
    fill=(255, 247, 230, 255),
    stroke_width=2,
    stroke_fill=(42, 21, 55, 255),
)

hook_box = draw.textbbox((0, 0), hook, font=hook_font)
hook_width = hook_box[2] - hook_box[0]
draw.text(
    ((1280 - hook_width) / 2, 125),
    hook,
    font=hook_font,
    fill=(246, 196, 83, 255),
)

result = Image.alpha_composite(image, overlay).convert("RGB")
result.save(OUTPUT, format="PNG", optimize=True)
result.resize((320, 180), Image.Resampling.LANCZOS).save(CARD, format="PNG", optimize=True)
