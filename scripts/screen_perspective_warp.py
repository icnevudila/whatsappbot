"""
High-Precision Sub-Pixel Perspective Homography Screen Warp Script
Uses Pillow's C-accelerated BICUBIC perspective transform.
Called by warp-engine.ts via JSON stdin/stdout or CLI args.
"""
import sys
import json
import base64
from io import BytesIO
from PIL import Image, ImageOps

def run_warp(input_data):
    src_bytes = base64.b64decode(input_data['sourceBase64'])
    dest_w = int(input_data['destWidth'])
    dest_h = int(input_data['destHeight'])
    coeffs = [float(x) for x in input_data['pillowCoeffs']]
    corner_radius = int(input_data.get('cornerRadius', 0))

    src_img = Image.open(BytesIO(src_bytes)).convert('RGBA')

    # PIL Image.transform with PERSPECTIVE performs inverse projective mapping
    # onto the destination bounding box using coeffs
    warped = src_img.transform(
        (dest_w, dest_h),
        Image.Transform.PERSPECTIVE,
        coeffs,
        Image.Resampling.BICUBIC
    )

    # If corner radius is specified, apply anti-aliased mask
    if corner_radius > 0:
        mask = Image.new('L', (dest_w, dest_h), 0)
        from PIL import ImageDraw
        draw = ImageDraw.Draw(mask)
        draw.rounded_rectangle([(0, 0), (dest_w - 1, dest_h - 1)], radius=corner_radius, fill=255)
        warped.putalpha(mask)

    out_buf = BytesIO()
    warped.save(out_buf, format='PNG')
    out_b64 = base64.b64encode(out_buf.getvalue()).decode('ascii')

    return {'ok': True, 'warpedBase64': out_b64, 'width': dest_w, 'height': dest_h}

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({'ok': False, 'error': 'No input provided'}))
            sys.exit(1)
        data = json.loads(raw_input)
        res = run_warp(data)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({'ok': False, 'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
