import os
import json
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

dir_path = r'C:\Users\TP2\Desktop\MESAJIFY_OMNISTUDIO_FINAL_DELIVERY'
out_dir = r'C:\Users\TP2\Desktop\MESAJIFY_OMNISTUDIO_FINAL_DELIVERY\before_after_comparison'
os.makedirs(out_dir, exist_ok=True)

# Authentic Mesajify screenshot
screenshot_path = r'apps\customer\public\landing\shot-1.png'
if not os.path.exists(screenshot_path):
    screenshot_path = r'apps\customer\public\landing\ozet.png'

screen_img = Image.open(screenshot_path).convert('RGB')
sw, sh = screen_img.size
print(f"Loaded screenshot: {screenshot_path}, size={sw}x{sh}")

def compute_perspective_coeffs(src_size, quad):
    """
    Computes PIL Image.Transform.PERSPECTIVE coefficients.
    quad = [TL, TR, BR, BL] in destination coordinates.
    Maps destination coords (x, y) to source coords (u, v):
    u = (a*x + b*y + c) / (g*x + h*y + 1)
    v = (d*x + e*y + f) / (g*x + h*y + 1)
    """
    w, h = src_size
    # Source corners: (0, 0), (w, 0), (w, h), (0, h)
    src_pts = [(0, 0), (w, 0), (w, h), (0, h)]
    
    # We solve for matrix that maps quad -> src_pts
    A = []
    B = []
    for (x, y), (u, v) in zip(quad, src_pts):
        A.append([x, y, 1, 0, 0, 0, -x * u, -y * u])
        B.append(u)
        A.append([0, 0, 0, x, y, 1, -x * v, -y * v])
        B.append(v)
        
    A = np.array(A, dtype=np.float64)
    B = np.array(B, dtype=np.float64)
    coeffs = np.linalg.solve(A, B)
    return coeffs.tolist()

# Exact 4-corner polygons for the 4 Mesajify ad images (1254x1254)
# Quad format: [TL, TR, BR, BL]
ADS_CONFIG = [
    {
        'file': '01_mesajify_akilli_kampanya.png',
        'quad': [(375, 440), (1165, 410), (1105, 935), (350, 935)],
        'name': '01_mesajify_akilli_kampanya',
        'desc': 'Akilli Kampanya (Laptop Frontal)',
        'radius': 12
    },
    {
        'file': '02_mesajify_gosterisli_kampanya.png',
        'quad': [(508, 402), (1184, 364), (1148, 838), (504, 844)],
        'name': '02_mesajify_gosterisli_kampanya',
        'desc': 'Gosterisli Kampanya (Laptop Desk)',
        'radius': 12
    },
    {
        'file': '03_mesajify_gercek_kullanim.png',
        'quad': [(138, 470), (835, 440), (875, 998), (195, 998)],
        'name': '03_mesajify_gercek_kullanim',
        'desc': 'Gercek Kullanim (Laptop Office Model)',
        'radius': 10
    },
    {
        'file': '04_mesajify_premium_vitrin.png',
        'quad': [(506, 445), (1185, 410), (1140, 850), (560, 850)],
        'name': '04_mesajify_premium_vitrin',
        'desc': 'Premium Vitrin (Laptop Executive Model)',
        'radius': 12
    }
]

diff_results = []

for idx, cfg in enumerate(ADS_CONFIG, 1):
    src_path = os.path.join(dir_path, cfg['file'])
    orig_img = Image.open(src_path).convert('RGB')
    W, H = orig_img.size
    quad = cfg['quad']
    
    print(f"\n==========================================")
    print(f"Processing Ad {idx}: {cfg['name']}")
    print(f"Canvas: {W}x{H}, Quad: {quad}")
    
    # 1. Compute projective coefficients
    coeffs = compute_perspective_coeffs((sw, sh), quad)
    
    # 2. Warp screenshot directly to canvas size
    warped = screen_img.transform(
        (W, H),
        Image.Transform.PERSPECTIVE,
        coeffs,
        Image.Resampling.BICUBIC
    )
    
    # 3. Create precision polygon mask with smooth anti-aliased edge
    # Render at 4x for smooth sub-pixel boundary
    scale = 2
    mask_hires = Image.new('L', (W * scale, H * scale), 0)
    d_hires = ImageDraw.Draw(mask_hires)
    hires_quad = [(int(x * scale), int(y * scale)) for x, y in quad]
    d_hires.polygon(hires_quad, fill=255)
    
    # Downsample to get anti-aliased alpha mask
    mask = mask_hires.resize((W, H), Image.Resampling.LANCZOS)
    mask_arr = np.array(mask, dtype=np.float32) / 255.0
    
    # 4. In-Place Screen Replacement
    orig_arr = np.array(orig_img, dtype=np.float32)
    warped_arr = np.array(warped, dtype=np.float32)
    
    # Alpha blend inside screen quad, 100% exact copy outside
    out_arr = np.zeros_like(orig_arr)
    for c in range(3):
        out_arr[:, :, c] = orig_arr[:, :, c] * (1.0 - mask_arr) + warped_arr[:, :, c] * mask_arr
        
    out_arr = np.clip(np.round(out_arr), 0, 255).astype(np.uint8)
    after_img = Image.fromarray(out_arr, mode='RGB')
    
    # 5. BIT-FOR-BIT PIXEL DIFF TEST OUTSIDE MASK
    # Strictly check pixels where mask == 0: diff must be exactly 0
    zero_mask = (mask_arr == 0.0)
    orig_uint8 = np.array(orig_img)
    diff_outside = np.abs(out_arr[zero_mask].astype(int) - orig_uint8[zero_mask].astype(int))
    max_diff_outside = int(np.max(diff_outside)) if len(diff_outside) > 0 else 0
    total_outside_pixels = int(np.sum(zero_mask))
    screen_pixels = int(np.sum(mask_arr > 0.5))
    screen_coverage_pct = round((screen_pixels / (W * H)) * 100, 2)
    
    print(f"Pixel Diff Verification Outside Mask:")
    print(f"  Total Pixels Outside Mask: {total_outside_pixels:,}")
    print(f"  Max RGB Delta Outside Mask: {max_diff_outside} (MUST BE 0)")
    print(f"  Screen Replaced Pixels: {screen_pixels:,} ({screen_coverage_pct}%)")
    assert max_diff_outside == 0, f"REGRESSION: Pixel diff outside mask is {max_diff_outside} != 0!"
    print("  [SUCCESS] 100% BIT-FOR-BIT PRESERVATION VERIFIED.")
    
    diff_results.append({
        'name': cfg['name'],
        'file': cfg['file'],
        'max_diff_outside': max_diff_outside,
        'screen_coverage_pct': screen_coverage_pct,
        'total_outside_pixels': total_outside_pixels,
        'screen_pixels': screen_pixels
    })
    
    # 6. Save AFTER image (overwriting previous incorrect mockup)
    after_filename = f"after_0{idx}_{cfg['name'].replace('0' + str(idx) + '_', '')}.png"
    after_path = os.path.join(out_dir, after_filename)
    after_img.save(after_path, format='PNG', compress_level=9)
    print(f"[OK] Saved AFTER image: {after_path}")
    
    # 7. Create QA Proof with Screen Region Annotated (Green Outline on AFTER)
    annotated_img = after_img.copy()
    d_ann = ImageDraw.Draw(annotated_img)
    d_ann.polygon(quad, outline=(0, 255, 0), width=4)
    for p in quad:
        d_ann.ellipse([p[0]-6, p[1]-6, p[0]+6, p[1]+6], fill=(255, 0, 0), outline=(255, 255, 255), width=2)
    d_ann.text((quad[0][0] + 15, quad[0][1] + 15), "AUTHENTIC MESAJIFY UI IN-PLACE", fill=(37, 201, 111))
    ann_path = os.path.join(out_dir, f"qa_annotated_0{idx}_{cfg['name']}.png")
    annotated_img.save(ann_path, format='PNG', compress_level=9)
    print(f"[OK] Saved QA Annotated image: {ann_path}")
    
    # 8. Create Side-by-Side Comparison (BEFORE vs AFTER at identical native resolution)
    # Target strip: 2508 x 1334 (with header bar)
    strip_w = W * 2 + 40
    strip_h = H + 80
    strip = Image.new('RGB', (strip_w, strip_h), (15, 17, 21))
    d_strip = ImageDraw.Draw(strip)
    
    # Header titles
    d_strip.text((30, 25), f"BEFORE (AI Fake Screen Original Ad)", fill=(239, 68, 68))
    d_strip.text((W + 50, 25), f"AFTER (Real Authentic UI In-Place Screen-Only Replacement)", fill=(37, 201, 111))
    
    # Paste BEFORE and AFTER
    strip.paste(orig_img, (20, 65))
    strip.paste(after_img, (W + 40, 65))
    
    montage_path = os.path.join(out_dir, f"karsilastirma_0{idx}_yan_yana.png")
    strip.save(montage_path, format='PNG', compress_level=6)
    print(f"[OK] Saved Side-by-Side Montage: {montage_path}")

# Write verification summary JSON
summary_path = os.path.join(out_dir, 'pixel_diff_verification_summary.json')
with open(summary_path, 'w', encoding='utf-8') as f:
    json.dump(diff_results, f, indent=2)

print("\nALL 4 ADS PROCESSED WITH 100% BIT-FOR-BIT PIXEL DIFF TEST PASSING!")
