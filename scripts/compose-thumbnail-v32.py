from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "screenshots" / "thumbnail-source-animal-jara-beta-2026-08-28.png"
OUTPUT = ROOT / "public" / "thumbnail.png"
CARD = ROOT / "docs" / "screenshots" / "thumbnail-card-animal-jara-beta-v32.png"
FONT = ROOT / "public" / "fonts" / "MPLUS1p-Regular.ttf"


image = Image.open(SOURCE).convert("RGBA")
if image.size != (1280, 720):
    raise ValueError(f"expected 1280x720 source, got {image.size}")

overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

plate = (34, 30, 536, 166)
draw.rounded_rectangle(plate, radius=18, fill=(10, 18, 32, 226), outline=(246, 196, 83, 255), width=4)
draw.polygon([(34, 166), (180, 166), (139, 184), (34, 184)], fill=(69, 183, 209, 235))

title_font = ImageFont.truetype(str(FONT), 48)
hook_font = ImageFont.truetype(str(FONT), 30)
badge_font = ImageFont.truetype(str(FONT), 20)

draw.text((62, 42), "ブロック遊技村", font=title_font, fill=(255, 247, 230, 255))
draw.text((64, 105), "アニマルじゃらβ 公開", font=hook_font, fill=(246, 196, 83, 255))

badge = (1074, 38, 1234, 94)
draw.rounded_rectangle(badge, radius=14, fill=(194, 65, 91, 242), outline=(255, 247, 230, 255), width=3)
badge_text = "無料βテスト"
badge_box = draw.textbbox((0, 0), badge_text, font=badge_font)
badge_width = badge_box[2] - badge_box[0]
badge_height = badge_box[3] - badge_box[1]
draw.text(
    ((badge[0] + badge[2] - badge_width) / 2, (badge[1] + badge[3] - badge_height) / 2 - 3),
    badge_text,
    font=badge_font,
    fill=(255, 247, 230, 255),
)

result = Image.alpha_composite(image, overlay).convert("RGB")
result.save(OUTPUT, format="PNG", optimize=True)
result.resize((320, 180), Image.Resampling.LANCZOS).save(CARD, format="PNG", optimize=True)
