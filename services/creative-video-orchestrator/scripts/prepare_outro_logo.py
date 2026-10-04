"""Prepare a derived logo for a black outro; never modify the customer's source."""
import argparse
from collections import deque
from pathlib import Path
from PIL import Image


def prepare(source, destination):
    image = Image.open(source).convert('RGBA')
    image.thumbnail((2048, 2048))
    width, height = image.size
    # If image already has a transparent background, do not flood-fill
    # Flood-filling white pixels from borders would eat into white/light letters that touch edges!
    transparent_count = sum(a < 50 for *_, a in image.getdata())
    is_already_transparent = transparent_count >= (width * height * 0.05)

    if not is_already_transparent:
        pixels = image.load()
        seen = set()
        queue = deque()
        def background(x, y):
            r, g, b, a = pixels[x, y]
            return a < 16 or (min(r, g, b) >= 230 and max(r, g, b) - min(r, g, b) <= 20)
        for x in range(width):
            queue.extend(((x, 0), (x, height - 1)))
        for y in range(height):
            queue.extend(((0, y), (width - 1, y)))
        while queue:
            x, y = queue.popleft()
            if (x, y) in seen or not background(x, y):
                continue
            seen.add((x, y))
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 0)
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < width and 0 <= ny < height:
                    queue.append((nx, ny))

    if sum(a < 50 for *_, a in image.getdata()) < width * height * .05:
        raise ValueError('OUTRO_LOGO_OPAQUE: no safe transparent background; require a transparent logo')
    bounds = image.getchannel('A').getbbox()
    if not bounds:
        raise ValueError('OUTRO_LOGO_EMPTY: no visible logo remains')
    image = image.crop(bounds)
    # A neutral black wordmark needs a light variant on the black card.
    image.putdata([(245, 245, 245, a) if max(r, g, b) < 70 and max(r, g, b)-min(r, g, b) < 15 else (r, g, b, a)
                   for r, g, b, a in image.getdata()])
    # Fit cleanly within max 520px width and max 280px height
    aspect = image.width / max(1, image.height)
    if aspect >= (520 / 280):
        new_w = 520
        new_h = max(1, round(520 / aspect))
    else:
        new_h = 260
        new_w = max(1, round(260 * aspect))
        if new_w > 520:
            new_w = 520
            new_h = max(1, round(520 / aspect))
    image = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
    Path(destination).parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, 'PNG')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('destination')
    args = parser.parse_args()
    prepare(args.source, args.destination)
