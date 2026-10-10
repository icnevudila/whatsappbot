# Mesajify Production Animations License & Asset Manifest

Tüm animasyonlar Mesajify Marka Tasarım Sistemi (#00A884, #008069, #07100C) ve Bodymovin / Lottie 5.5.7 format spesifikasyonuna uygun olarak sıfırdan vektörel parametrik olarak üretilmiş, harici CDN bağımlılığı bulunmayan yerel varlıklardır.

## Lisans Modeli: MIT / Mesajify Proprietary Open Asset

- **Üretici / Telif:** Mesajify Motion Design System / DeepMind Agent Pair
- **Format:** Standart Lottie JSON (Bodymovin v5.5.7)
- **Kullanım İzni:** Ticari ve gayriticarî tüm Mesajify web, mobil ve SaaS üretim arayüzlerinde sınırsız kullanım.
- **Harici CDN Gereksinimi:** Yok (Tamamen `apps/customer/public/animations/` dizininde yerel olarak sunulur).

---

## 1. Image Production Animations (`/animations/image/`)

| Dosya Adı | Aşama | Başlık | Teknik Açıklama |
|---|---|---|---|
| `product-upload.json` | 1 | Logo ve Ürün Hazırlığı | Ürün fotoğrafı ve kurumsal logo kartlarının manyetik yaklaşma ve yeşil badge doğrulama hareketi |
| `image-scan.json` | 2 | Marka ve Ürün Analizi | İnce zümrüt tarama lazeri ve hedef tespit noktalarının nabız hareketi |
| `creative-design.json` | 3 | Reklam Tasarımı | Reklam afiş panosunun oluşması ve parıltı (sparkle) efektlerinin dönüşü |
| `image-render.json` | 4 | Görsel Üretimi | Zümrüt yörünge rotasyonu ve merkez afiş çerçevesinin nefes alma hareketi |
| `image-success.json` | 5 | Tamamlandı | Parlak zümrüt dairesel onay patlaması ve kütüphane hazır ikonu |

---

## 2. Video Production Animations (`/animations/video/`)

| Dosya Adı | Aşama | Başlık | Teknik Açıklama |
|---|---|---|---|
| `storyboard.json` | 1 | Video Hazırlığı | 9:16 oranında 3 dikey sahne kartı ve alt timeline rayı |
| `reference-attach.json` | 2 | Logo ve Ürün Referansları | Film çerçevesine logo ve ürün referans chip'lerinin kilitlenme hareketi |
| `camera-motion.json` | 3 | Sahne Oluşturma | Dolly rayı üzerinde kayan sinema kamerası ve kayıt (REC) göstergesi |
| `video-render.json` | 4 | Video Render | Dikey film şeridi dişlileri (sprockets) ve lazer render tarayıcısı |
| `timeline-edit.json` | 5 | Kurgu ve Ses | Dinamik ses dalgası (waveform) ekolayzır barları ve kurgu blokları |
| `video-success.json` | 6 | Final Video | Sinematik monitör, play ikonu ve köşe onay rozeti |

---

## 3. Shared Animations (`/animations/shared/`)

| Dosya Adı | Kullanım | Açıklama |
|---|---|---|
| `warning.json` | Uyarı / Kalite İncelemesi | Amber renkli teknik uyarı üçgeni ve dikkat simgesi |
| `loading.json` | Genel Yükleme / Bağlantı | Zümrüt noktalı dönen spinner halkası |
