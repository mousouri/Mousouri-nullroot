#!/usr/bin/env python3
"""Generate NULLROOT PWA icons — ink panel, acid border, terminal N_ glyph."""
from PIL import Image, ImageDraw, ImageFont

ACID = (215, 255, 63, 255)      # --acid acid colorway
INK = (10, 10, 10, 255)         # --ink
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"

def make_icon(size: int, path: str, maskable: bool = False) -> None:
    img = Image.new("RGBA", (size, size), INK)
    d = ImageDraw.Draw(img)

    # border frame — 4% of size, like the site's hard borders
    b = max(2, int(size * 0.035))
    d.rectangle([b, b, size - b - 1, size - b - 1], outline=ACID, width=max(2, size // 48))

    # corner grid ticks — the grid is the brand
    t = max(2, size // 64)
    tick = size // 9
    for gx in range(1, 4):
        x = b + gx * tick
        d.line([x, b + t, x, b + t + tick // 2], fill=(242, 240, 234, 90), width=t)
        d.line([x, size - b - t, x, size - b - t - tick // 2], fill=(242, 240, 234, 90), width=t)

    # the glyph — N_ centered
    fs = int(size * (0.42 if maskable else 0.5))
    font = ImageFont.truetype(FONT, fs)
    text = "N_"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1]
    if maskable:
        y = int(size * 0.30) - bbox[1]
    # hard shadow — brutalist offset
    d.text((x + max(2, size // 128), y + max(2, size // 128)), text, font=font, fill=(0, 0, 0, 255))
    d.text((x, y), text, font=font, fill=ACID)

    img.save(path, "PNG")
    print(f"→ {path} ({size}px{' maskable' if maskable else ''})")

for s in (192, 512):
    make_icon(s, f"public/icons/icon-{s}.png")
make_icon(512, "public/icons/icon-maskable-512.png", maskable=True)
make_icon(512, "public/icons/apple-touch-icon.png")
make_icon(180, "public/icons/favicon-180.png")
print("icons done")
