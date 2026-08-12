#!/usr/bin/env python3
"""Generate the canonical OG Financial Services vector brand assets.

The supplied artwork is reconstructed as an accessible, compact vector lockup.
Every letter in the SVG is emitted as a glyph outline so rendering never depends
on a browser or device font. Raster derivatives are produced separately from
these canonical SVGs during the release process.
"""

from __future__ import annotations

from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "public"
FONT_REGULAR = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
FONT_BOLD = Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf")

PRIMARY = "#3F713E"
SECONDARY = "#7CA05C"
DARK = "#274F35"
OFF_WHITE = "#F7FAF6"


def outlined_text(
    text: str,
    *,
    font_path: Path,
    font_size: float,
    x: float,
    baseline: float,
    letter_spacing: float = 0,
) -> tuple[str, float]:
    """Return SVG path elements and the final x coordinate for outlined text."""
    font = TTFont(font_path)
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    metrics = font["hmtx"].metrics
    units_per_em = font["head"].unitsPerEm
    scale = font_size / units_per_em
    cursor = x
    elements: list[str] = []

    for char in text:
        glyph_name = cmap.get(ord(char))
        if glyph_name is None:
            raise ValueError(f"No glyph for {char!r} in {font_path}")
        if char != " ":
            pen = SVGPathPen(glyph_set)
            transform = TransformPen(pen, (scale, 0, 0, -scale, cursor, baseline))
            glyph_set[glyph_name].draw(transform)
            commands = pen.getCommands()
            elements.append(f'<path d="{commands}"/>')
        advance, _ = metrics[glyph_name]
        cursor += advance * scale + letter_spacing

    font.close()
    return "\n      ".join(elements), cursor


def mark_paths() -> str:
    """Path-only trace of the supplied rising chart-and-arrow mark."""
    return f"""
    <path fill="{PRIMARY}" d="M18 83C14 121 27 153 55 174c22 17 55 24 82 13 9-4 16-10 20-18-17 8-35 7-54 1-35-11-61-36-77-74-3-7-5-13-8-13Z"/>
    <path fill="{SECONDARY}" d="M29 116c9 24 25 42 48 53 22 11 48 14 70 5-10 17-36 24-62 18-31-7-52-27-56-76Z"/>
    <path fill="{PRIMARY}" d="M48 101h25v58H48z"/>
    <path fill="{DARK}" d="M78 71h25v96H78z"/>
    <path fill="{PRIMARY}" d="M109 45h25v126h-25z"/>
    <path fill="{PRIMARY}" d="m96 47 26-29 26 29Z"/>
    <path fill="{OFF_WHITE}" d="M73 101h5v61h-5zM103 71h6v98h-6z"/>
    """.strip()


def svg_document(body: str, *, view_box: str, title: str, description: str) -> str:
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" role="img" aria-labelledby="title description">
  <title id="title">{title}</title>
  <desc id="description">{description}</desc>
  {body}
</svg>
"""


def write_assets() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)

    mark = svg_document(
        mark_paths(),
        view_box="0 0 166 210",
        title="OG Financial Services CC",
        description="Rising financial chart and arrow company mark",
    )
    (PUBLIC / "og-financial-mark-v2.svg").write_text(mark, encoding="utf-8")

    og_paths, _ = outlined_text(
        "OG", font_path=FONT_BOLD, font_size=82, x=230, baseline=88, letter_spacing=1
    )
    financial_paths, financial_end = outlined_text(
        "FINANCIAL",
        font_path=FONT_BOLD,
        font_size=73,
        x=230,
        baseline=166,
        letter_spacing=-0.5,
    )
    services_paths, services_end = outlined_text(
        "SERVICES CC",
        font_path=FONT_REGULAR,
        font_size=36,
        x=232,
        baseline=215,
        letter_spacing=2.6,
    )
    width = max(financial_end, services_end) + 28
    logo_body = f"""
  <g transform="translate(24 22) scale(.9)">{mark_paths()}</g>
  <path d="M201 22v202" stroke="{DARK}" stroke-width="3"/>
  <g fill="{PRIMARY}">
      {og_paths}
      {financial_paths}
      {services_paths}
  </g>
  <path d="M30 268H{width - 28:.1f}" stroke="{PRIMARY}" stroke-width="4"/>
  <path d="M30 268h190" stroke="{SECONDARY}" stroke-width="9"/>
    """.strip()
    logo = svg_document(
        logo_body,
        view_box=f"0 0 {width:.1f} 286",
        title="OG Financial Services CC",
        description="OG Financial Services CC logo with rising financial chart mark",
    )
    (PUBLIC / "og-financial-logo-v2.svg").write_text(logo, encoding="utf-8")

    favicon_body = f"""
  <rect width="224" height="224" rx="48" fill="{OFF_WHITE}"/>
  <g transform="translate(29 7)">{mark_paths()}</g>
    """.strip()
    favicon = svg_document(
        favicon_body,
        view_box="0 0 224 224",
        title="OG Financial Services CC",
        description="OG Financial Services CC application icon",
    )
    (PUBLIC / "og-financial-favicon-v2.svg").write_text(favicon, encoding="utf-8")


if __name__ == "__main__":
    write_assets()
