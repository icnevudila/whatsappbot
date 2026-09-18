import urllib.request
import json
import time

url = "http://167.233.201.31:3456/v1/videos/generations"

payload = {
    "prompt": "9:16 vertical cinematic commercial advertisement for 'Mesajify'. ACT 1 (0-3s): Sizzling macro close-up (100mm f/1.8 lens) of succulent, seasoned Turkish meat döner gently rotating on a vertical spit, fragrant natural steam rising, clean stainless steel prep counter in warm appetizing lighting. ACT 2 (3-7s): Medium shot of an authentic, friendly Turkish döner chef (40s, warm genuine smile, clean chef apron) standing proudly behind the counter. He holds up a sleek smartphone toward the camera showing a WhatsApp chat screen with digital menus and brochures. He speaks directly to the camera with natural mouth movements: 'Artık broşür bastırmıyorum! Bunun yerine Mesajify ile dijital broşürümü etrafımdaki tüm işletmelere tek tıkla WhatsApp\\'tan gönderiyorum, siparişler patladı!' ACT 3 (7-10s): Smooth cinematic gimbal pull-back showing the vibrant restaurant, incoming order notifications appearing on mobile screen, the chef giving an energetic thumbs up with a confident smile. 4K live-action commercial cinematography, Arri Alexa natural color grade, realistic sound design. STRICT RULE: NO ON-SCREEN TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO SUBTITLES, NO LOGO CARDS, NO GRAPHIC OVERLAYS, NO BANNERS. Pure photorealistic live commercial footage only.",
    "brandName": "Mesajify",
    "productName": "Dijital Broşür",
    "includeOverlay": False,
    "includeLogo": False,
    "includeBanner": False,
    "includeCta": False
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

import sys
sys.stdout.reconfigure(encoding='utf-8')

print("[Test] /v1/videos/generations endpointine istek gönderiliyor...")
start_time = time.time()

try:
    with urllib.request.urlopen(req, timeout=300) as resp:
        res_data = json.loads(resp.read().decode('utf-8'))
        elapsed = round(time.time() - start_time, 1)
        print(f"[Test] Başarılı! Süre: {elapsed} saniye")
        print("Sonuç:", json.dumps(res_data, indent=2, ensure_ascii=False))
except urllib.error.HTTPError as e:
    err_body = e.read().decode('utf-8', errors='replace')
    print(f"[Test] HTTP Hata {e.code}: {err_body}")
except Exception as e:
    print("[Test] Hata oluştu:", str(e))
