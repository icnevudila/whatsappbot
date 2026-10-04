"""Prepare a derived logo for a black outro; never modify the customer's source."""
import argparse
from collections import deque
from pathlib import Path
from PIL import Image


def prepare(source, destination):
    image = Image.open(source).convert('RGBA')
    image.thumbnail((2048, 2048))
    width, height = image.size
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
    target_height = round(image.height * 520 / image.width)
    if target_height > 340:
        raise ValueError('OUTRO_LOGO_TOO_TALL: 520px width would overlap outro copy; require a horizontal logo')
    image = image.resize((520, max(1, target_height)), Image.Resampling.LANCZOS)
    Path(destination).parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, 'PNG')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('destination')
    args = parser.parse_args()
    prepare(args.source, args.destination)
