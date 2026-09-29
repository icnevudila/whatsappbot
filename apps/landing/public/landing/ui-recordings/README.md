# Mesajify Landing Arayüz Ekran Kayıtları Rehberi

Bu klasör, **kullanıcı tarafından doğrudan gerçek Mesajify uygulamasından kaydedilip eklenecek** arayüz videolarını içerir.

> **Önemli Kural:**
> - Reklam ve kampanya videoları (kruvasan, kulaklık, süper araba, lüks villa vb.) **otomatik AI botları (Google Flow Veo 3.1 & ChatGPT)** tarafından üretilir ve `public/landing/studio/` klasöründe yer alır.
> - Bu klasör (`ui-recordings`) ve ana landing'deki dashboard walkthrough (`public/landing/demo.mp4`) ise **senin gerçek panelden bizzat çekeceğin** arayüz videoları içindir.

---

## 📹 Çekilmesi Gereken Panel Videoları

### 1. Hero Walkthrough (Ana Gösterim)
- **Hedef Konum:** `apps/landing/public/landing/demo.mp4`
- **Poster Görseli:** `apps/landing/public/landing/demo-poster.png`
- **Format:** 16:9 veya 1280x626 yatay video, MP4 (H.264), sessiz.
- **İçerik:** 
  1. `app.mesajify.com/hesaplar` ekranında QR ile bağlı 3 hattı göster.
  2. `app.mesajify.com/kampanyalar` ekranından bir kampanya başlat veya akışı gez.
  3. Gelen kutusuna (`/gelen-kutusu`) bir müşterinin yanıt verdiğini göster.
- **Süre:** 15–30 saniye loop (döngü).

### 2. Çoklu Hat Havuzu Eşleştirme (İsteğe Bağlı Detay Demo)
- **Hedef Konum:** `apps/landing/public/landing/ui-recordings/hat-yonetimi-demo.mp4`
- **Format:** 16:9 yatay video.
- **İçerik:** QR kod ile yeni bir WhatsApp hattını sisteme bağlama anı ve hatların yeşil "Bağlı" duruma geçişi.

### 3. Gelen Kutusu Anlık Yanıt (İsteğe Bağlı Detay Demo)
- **Hedef Konum:** `apps/landing/public/landing/ui-recordings/inbox-demo.mp4`
- **Format:** 16:9 yatay video.
- **İçerik:** Tek ekranda farklı hatlardan gelen mesajların listelenmesi ve hızlı şablonla yanıt verilmesi.

---

## 🤖 Otomatik Bot Tarafından Üretilen Medyalar (`public/landing/studio/`)
Aşağıdaki tüm dosyalar sunucudaki botlar tarafından üretilmiştir:
- `restaurant-flow-veo.mp4` — Fırın / Gastronomi 9:16 Veo 3.1 reklam videosu
- `ecommerce-flow-veo.mp4` — NOVA Kulaklık 9:16 Veo 3.1 reklam videosu
- `automotive-flow-veo.mp4` — Süper Otomobil 9:16 Veo 3.1 reklam videosu
- `realestate-flow-veo.mp4` — Lüks Rezidans Villa 9:16 Veo 3.1 reklam videosu
- `hero-flow-veo.mp4` — Mesajify Marka 9:16 Veo 3.1 dikey tanıtım videosu
- `bakery-croissant-ad.png` — Fırın görseli
- `nova-headphones-ad.png` — Kulaklık görseli
- `automotive-ad.png` — Otomotiv görseli
- `realestate-ad.png` — Emlak görseli
- `clinic-ad.png` — Klinik görseli
- `service-ad.png` — Danışmanlık görseli
