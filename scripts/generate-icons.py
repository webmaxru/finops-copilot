#!/usr/bin/env python3
"""Generate the site's raster discovery assets (favicons, PWA/app icons, social image).

This project has no CI image toolchain (no ImageMagick/sharp), so the raster
outputs are pre-generated with Pillow and committed under ``public/`` (which Vite
copies verbatim to ``dist/``). This script is kept for reproducibility: re-run it
whenever the brand mark or palette in ``DESIGN.md`` changes.

    python scripts/generate-icons.py

The vector ``public/favicon.svg`` is hand-authored (the scalable primary icon);
only the rasters below are produced here. Everything is derived from the project's
own design system — the indigo->violet gradient tile with the ``diamond`` (U+25C8)
brand mark — so no third-party artwork is introduced.
"""
from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFont

# --- Palette (from DESIGN.md / src/styles.css, dark theme) -------------------
BRAND = (110, 123, 255)      # #6e7bff  indigo  (interactive / Business / license)
ACCENT = (181, 123, 246)     # #b57bf6  violet  (Enterprise / power-user)
INK = (8, 11, 22)            # #080b16  deep-ink navy base
INK2 = (11, 16, 32)          # #0b1020  background wash stop
POOL = (47, 212, 164)        # #2fd4a4  teal  (pool drains)
METERED = (245, 179, 63)     # #f5b33f  amber (meter runs)
LIMIT = (251, 106, 120)      # #fb6a78  coral (limit blocks)
WHITE = (255, 255, 255)
TEXT = (234, 240, 255)       # #eaf0ff
DIM = (193, 203, 230)        # #c1cbe6
MUTED = (135, 148, 186)      # #8794ba

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.normpath(os.path.join(HERE, "..", "public"))

SS = 4  # supersample factor for crisp anti-aliased edges


def _lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def diagonal_gradient(size, c1, c2):
    """RGBA gradient interpolated along the top-left -> bottom-right diagonal (~145deg).

    Fast, dependency-free: the color depends only on (x + y), so build a length-(2*size-1)
    lookup of packed RGB triples and assemble each row from a slice of it.
    """
    denom = max(1, (size - 1) * 2)
    lut = [bytes(_lerp(c1, c2, s / denom)) for s in range(2 * size - 1)]
    buf = bytearray()
    for y in range(size):
        for s in range(y, y + size):
            buf += lut[s]
    return Image.frombytes("RGB", (size, size), bytes(buf)).convert("RGBA")


def vertical_gradient(w, h, top, bottom):
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):
        d.line([(0, y), (w, y)], fill=_lerp(top, bottom, y / max(1, h - 1)))
    return img.convert("RGBA")


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def _diamond_points(cx, cy, r):
    return [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]


def make_mark_layer(size, mark_r_ratio=0.30, stroke_ratio=0.058):
    """Transparent RGBA layer with the white diamond-in-diamond (U+25C8) mark centered."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = cy = size / 2
    r_out = size * mark_r_ratio
    stroke = size * stroke_ratio
    r_hole = r_out - stroke
    r_center = size * (mark_r_ratio * 0.42)
    d.polygon(_diamond_points(cx, cy, r_out), fill=WHITE + (255,))          # outer solid
    d.polygon(_diamond_points(cx, cy, r_hole), fill=(0, 0, 0, 0))           # carve ring
    d.polygon(_diamond_points(cx, cy, r_center), fill=WHITE + (255,))       # inner solid
    return layer


def make_tile(size, full_bleed=False, radius_ratio=0.235, mark_r_ratio=0.30):
    """The brand tile: indigo->violet gradient with the diamond mark.

    full_bleed=True -> opaque square (no transparent corners), for apple-touch / maskable.
    full_bleed=False -> rounded corners with transparent background.
    """
    s = size * SS
    grad = diagonal_gradient(s, BRAND, ACCENT)
    mark = make_mark_layer(s, mark_r_ratio=mark_r_ratio)
    grad.alpha_composite(mark)
    if not full_bleed:
        grad.putalpha(rounded_mask(s, round(s * radius_ratio)))
    return grad.resize((size, size), Image.LANCZOS)


def _load_font(candidates, size):
    for name in candidates:
        try:
            return ImageFont.truetype(name, size)
        except (OSError, IOError):
            continue
    return ImageFont.load_default()


def _font_bold(size):
    return _load_font([
        "C:/Windows/Fonts/seguisb.ttf", "C:/Windows/Fonts/segoeuisb.ttf",
        "C:/Windows/Fonts/arialbd.ttf", "arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf",
    ], size)


def _font_reg(size):
    return _load_font([
        "C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf", "arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans.ttf",
    ], size)


def _font_mono(size):
    return _load_font([
        "C:/Windows/Fonts/consola.ttf", "C:/Windows/Fonts/cour.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", "DejaVuSansMono.ttf",
    ], size)


def _draw_tracked(d, xy, text, font, fill, tracking):
    """Draw text with manual letter-spacing (Pillow has no native tracking)."""
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking


def make_og(path, w=1200, h=630):
    img = vertical_gradient(w, h, INK2, INK)
    # soft indigo glow top-left
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-260, -320, 620, 360], fill=BRAND + (46,))
    img.alpha_composite(glow)
    d = ImageDraw.Draw(img)

    pad = 84
    # brand tile
    tile = make_tile(104, full_bleed=False)
    img.alpha_composite(tile, (pad, pad))

    # eyebrow (tracked mono, muted, uppercase) next to the tile
    eb_font = _font_mono(26)
    _draw_tracked(d, (pad + 104 + 26, pad + 34), "GITHUB COPILOT \u00b7 ENTERPRISE FINOPS",
                  eb_font, MUTED, 3.0)

    # title
    tf = _font_bold(78)
    d.text((pad, 230), "Copilot Enterprise", font=tf, fill=TEXT)
    d.text((pad, 322), "Spend Simulator", font=tf, fill=TEXT)

    # subtitle
    sf = _font_reg(31)
    d.text((pad, 430), "Model a month of AI-credit spend across cost centers -",
           font=sf, fill=DIM)
    d.text((pad, 470), "size the pool, set budgets, and see where usage meters or blocks.",
           font=sf, fill=DIM)

    # signature bill-composition meter (license | metered | ceiling)
    bar_x, bar_y, bar_w, bar_h = pad, 548, w - pad * 2, 24
    r = bar_h // 2
    d.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], radius=r,
                        fill=(31, 43, 82, 255))  # panel-3 track
    lic_w = int(bar_w * 0.46)
    met_w = int(bar_w * 0.30)
    d.rounded_rectangle([bar_x, bar_y, bar_x + lic_w, bar_y + bar_h], radius=r, fill=BRAND)
    d.rectangle([bar_x + lic_w - r, bar_y, bar_x + lic_w + met_w, bar_y + bar_h], fill=METERED)
    ceil_x = bar_x + int(bar_w * 0.86)
    d.rectangle([ceil_x - 2, bar_y - 6, ceil_x + 2, bar_y + bar_h + 6], fill=LIMIT)

    # legend
    lf = _font_mono(21)
    ly = bar_y + bar_h + 20
    lx = bar_x
    for label, color in (("LICENSE", BRAND), ("METERED", METERED), ("LIMIT", LIMIT)):
        d.ellipse([lx, ly + 4, lx + 13, ly + 17], fill=color)
        d.text((lx + 22, ly), label, font=lf, fill=MUTED)
        lx += 40 + d.textlength(label, font=lf) + 40

    # origin url, right-aligned on the legend row
    uf = _font_mono(21)
    url = "finops.isainative.dev"
    d.text((w - pad - d.textlength(url, font=uf), ly), url, font=uf, fill=MUTED)

    img.convert("RGB").save(path, "PNG")
    print("wrote", path)


def main():
    os.makedirs(PUBLIC, exist_ok=True)

    # PWA icons ("any" purpose) — rounded tile, transparent corners
    make_tile(192).save(os.path.join(PUBLIC, "icon-192.png"))
    make_tile(512).save(os.path.join(PUBLIC, "icon-512.png"))
    print("wrote icon-192.png, icon-512.png")

    # Maskable — full-bleed opaque, mark shrunk into the central safe zone (~60%)
    make_tile(512, full_bleed=True, mark_r_ratio=0.22).save(
        os.path.join(PUBLIC, "icon-maskable-512.png"))
    print("wrote icon-maskable-512.png")

    # Apple touch — 180, full-bleed opaque RGB (no alpha; iOS masks the corners itself)
    make_tile(180, full_bleed=True).convert("RGB").save(
        os.path.join(PUBLIC, "apple-touch-icon.png"))
    print("wrote apple-touch-icon.png")

    # Favicon .ico with legacy 16/32/48 sizes, derived from a rounded master
    master = make_tile(256)
    master.save(os.path.join(PUBLIC, "favicon.ico"),
                sizes=[(16, 16), (32, 32), (48, 48)])
    print("wrote favicon.ico")

    # Social share image
    make_og(os.path.join(PUBLIC, "og-image.png"))


if __name__ == "__main__":
    main()
