"""Prepare a derived logo for a black outro; never modify the customer's source."""
import argparse
from collections import deque
from pathlib import Path
from PIL import Image


def prepare(source, destination):
    image = Image.open(source).convert('RGBA')
    image.thumbnail((2048, 2048))
    width, height = image.size
    # If image already has a transparent background, respect it
    transparent_count = sum(a < 50 for *_, a in image.getdata())
    is_already_transparent = transparent_count >= (width * height * 0.05)

    if not is_already_transparent:
        # Smooth alpha matting from white background
        pixels = list(image.getdata())
        new_pixels = []
        for r, g, b, a in pixels:
            # Measure whiteness (minimum RGB channel intensity)
            whiteness = min(r, g, b)
            # Alpha gradient: 255 at dark, 0 at pure white (>245)
            alpha = max(0, min(255, int((255 - whiteness - 10) * 255 / 235))) if whiteness >= 10 else 255
            if alpha == 0:
                new_pixels.append((0, 0, 0, 0))
                continue
            
            # Detect colored elements (like red emblem) vs neutral dark typography
            max_c = max(r, g, b)
            min_c = min(r, g, b)
            is_colored = (max_c - min_c) > 35
            
            if is_colored:
                # Un-mix white background: C_pure = (C - 255*(1 - a))/a
                a_float = max(alpha / 255.0, 0.01)
                pur_r = max(0, min(255, int((r - 255.0 * (1.0 - a_float)) / a_float)))
                pur_g = max(0, min(255, int((g - 255.0 * (1.0 - a_float)) / a_float)))
                pur_b = max(0, min(255, int((b - 255.0 * (1.0 - a_float)) / a_float)))
                new_pixels.append((pur_r, pur_g, pur_b, alpha))
            else:
                # Monochrome/dark text turns into clean, crisp white on dark outro
                new_pixels.append((255, 255, 255, alpha))
        image.putdata(new_pixels)

    bounds = image.getchannel('A').getbbox()
    if not bounds:
        raise ValueError('OUTRO_LOGO_EMPTY: no visible logo remains')
    image = image.crop(bounds)

    # Match the outro presentation gate while preserving the logo's proportions.
    # Scaled onto a transparent 520px-wide canvas with crisp antialiasing.
    scale = min(520 / image.width, 320 / image.height)
    new_w = max(1, round(image.width * scale))
    new_h = max(1, round(image.height * scale))
    resized = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
    image = Image.new('RGBA', (520, new_h), (0, 0, 0, 0))
    image.alpha_composite(resized, ((520 - new_w) // 2, 0))
    Path(destination).parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, 'PNG')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('destination')
    args = parser.parse_args()
    prepare(args.source, args.destination)
