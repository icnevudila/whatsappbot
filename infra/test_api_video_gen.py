import urllib.request
import json
import time

url = "http://167.233.201.31:3456/v1/videos/generations"

payload = {
    "prompt": "9:16 dikey formatta üst düzey televizyon ve sinematik sosyal medya reklam filmi (Instagram Reels & WhatsApp Durum). Ürün: Gurme Smash Burger. Ürün Nitelikleri: Gurme Smash Burger. Eriyen cheddar peyniri, karamelize soğan ve taze brioche ekmeği. %20 indirim. Kampanya Konsepti: Hafta sonuna özel enfes lezzet indirimi. Çekim Ortamı: şık, sıcak ve samimi bir gourmet mutfak ve ahşap sunum masası. Görsel Stil ve Işık Atmosferi: Yiyecek / iştah açıcı: Sıcak ışıklar, buharı tüten iştah açıcı detaylar, gourmet restoran sunum estetiği. Marka tonu: Lezzetli ve modern. Sinematografi ve Kamera: Shot on Arri Alexa Mini LF, Master Prime 100mm macro & 35mm sinema lensleri. 180 derece obtüratör açısı, akıcı gimbal ve slider hareketleri, doğal sığ alan derinliği (f/1.8), zarif sinematik bokeh. 4K HDR fotogerçekçi reklam ajansı renk derecelendirmesi (color grading). SAHNE 1 (0-3sn - MAKRO TANITIM): Kamera aşırı yakın plan makro odakla yaklaşır. Taptaze burger köftesinin cızırdayışı, eriyen altın sarısı cheddar peyniri ve karamelize soğanın iştah kabartan dokusu. Işığın yüzeyde yarattığı yumuşak yansımalar ve birinci sınıf işçilik ön plandadır. SAHNE 2 (3-7sn - DİNAMİK KULLANIM & İŞLEV): Kamera akıcı bir gimbal kaymasıyla sahneye genişler. Burgerin taze kızarmış susamlı brioche ekmeğiyle birleştiği an, çıtır patatesler ve dökülen özel sos detayı. 120fps ağır çekim ile ürünün performansı ve gerçek hayat ortamındaki güvenilirliği sergilenir. SAHNE 3 (7-10sn - KAHRAMAN FİNAL REVEAL): Kamera geriye ve hafif yukarı doğru yükselerek kahraman (hero) planına geçer. Tüm ziyafet masasını, gurme burgeri ve davetkâr lezzetleri sergileyen sıcak ışıklı geniş açı sahne. İlham verici altın saat ışığı, sıcak kontrastlar, üstün kalite hissi. ÖNEMLİ VE KESİN KURAL: Videoda KESİNLİKLE hiçbir yazı, metin, altyazı, logo kartı, bilgi kutusu veya grafik overlay OLMAYACAKTIR. Ekranda sadece %100 saf, temiz ve sinematik canlı çekim video görüntüsü olacaktır. Tam ekran temiz sinema karesi. STRICT RULE: NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO SUBTITLES, NO CAPTIONS, NO ON-SCREEN TEXT, NO LOGO CARDS, NO GRAPHIC OVERLAYS, NO BANNERS, NO LOWER THIRDS. Pure clean cinematic live-action commercial footage only.",
    "brandName": "Burger Lab",
    "productName": "Gurme Smash Burger",
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
