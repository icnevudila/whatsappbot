# VEO 8-SECOND VS. 20–30-SECOND AD ARCHITECTURE
**Mesajify Video Orchestration & Creative Production Engine**  
*Document Version: 3.0.0 — Production Specification*  
*Date: 2026-10-11*  
*Target Engine: Google Veo 3.1 Fast (9:16 Vertical) | Native FFmpeg Pipeline*

---

## 1. Giriş ve Amaç

Bu mimari şartname, Mesajify platformundaki iki temel video reklam formatının teknik kurgusunu, zaman çizelgesini (timeline), kaynak bütçesini ve üretim iş akışını (orchestration pipeline) tanımlar:

1. **Format A: 8 Saniyelik Tekil Veo 3.1 Fast Sahnesi + 2 Saniyelik Outro (10.0s Ticari Master)**  
   *Mevcut Dondurulmuş Üretim Standardı — Hızlı, Yüksek Dönüşümlü, Maliyet-Optimizeli.*
2. **Format B: 20–30 Saniyelik Çoklu Sahne Kurgusu (Multi-Scene Scripted Commercial)**  
   *Derin Anlatı, B2B Karar Vericiler ve Karmaşık Ürün/Hizmetler İçin Genişletilmiş Mimari.*

---

## 2. İki Çıktı Modu (Brand Film vs. Performance Ad)

Her iki süre formatında da sistem kullanıcının tercihine göre iki çıktı modu sunar:

* **Mod A — Brand Film:**  
  Videoda gereksiz altyazı, fiyat, indirim, CTA veya uydurma metin bulunmaz. Orijinal marka logosu ve ürün formu fiziksel yüzeyde başroldedir. 2.0 saniyelik kapanışta sade, sessiz ve estetik kurumsal logo kartı belirir.
* **Mod B — Performance Ad:**  
  Kullanıcı doğrulanmış teklif, fiyat ve WhatsApp CTA'sı seçtiğinde; bu tipografik unsurlar Veo'ya çizdirilmez. FFmpeg post-prodüksiyon aşamasında deterministik olarak 1080x1920 dikey çözünürlükte keskin Türkçe karakterlerle videoya bindirilir. 2.0s kurumsal outroda doğrulanmış WhatsApp eylem çağrısı yer alır.

---

## 3. Format A: 8 Saniyelik Veo 3.1 Fast + 2s Outro (10.00s Master)

### 3.1 Zaman Çizelgesi & 3-Beat Ticari Gramer
Bu format, Google Veo 3.1 Fast modelinin tek bir 8.0 saniyelik dikey (9:16) reference-to-video üretim kapasitesini kullanır.

```
0.0s                2.2s                        5.8s                 8.0s             10.0s
|-------------------|---------------------------|--------------------|----------------|
|    BEAT 1: HOOK   |    BEAT 2: PROOF / DEMO   | BEAT 3: HERO CLOSE  | BRANDED OUTRO  |
|  (Pattern Break)  |   (Fonksiyonel Kanıt)     | (Ürün & Logo Net)  | (Logo+WhatsApp)|
```

| Zaman Dilimi | Kurgusal Rolü | Kamera & Hareket Grameri | Ses & Altyazı | Çıktı Standardı |
|---|---|---|---|---|
| **0.0 – 2.2s** | **HOOK (Dikkat)** | Dinamik push-in veya ani açı; ürünün veya durumun en çarpıcı temas anı. | Dikkat çekici ses efekti (ASMR cızırtı / su / klik); büyük başlık. | Tek kesintisiz Veo akışı |
| **2.2 – 5.8s** | **PROOF (Kanıt)** | Makro yakın plan veya işlevsel açı; ürünün çalıştığı ve somut etkisi. | Tok çalışma sesi; teknik detayı belirten kısa altyazı (Mod B). | Tutarlı fizik ve ışık |
| **5.8 – 8.0s** | **HERO (Kahraman)** | Stabil geniş/orta plan; ürün temiz ortamda, logo net okunur, estetik ışık. | Güven veren melodi armoniye oturur. | Kusursuz ürün formu |
| **8.0 – 10.0s** | **OUTRO (Dönüşüm)** | Deterministik FFmpeg katmanı; marka renk paleti, tescilli logo, net WhatsApp CTA. | Konuşmasız; müzik doğal fade-out yapar; logo hafif scale ile belirir. | 1080x1920 @ 30fps MP4 |

---

## 4. Format B: 20–30 Saniyelik Çoklu Sahne Kurgusu (Multi-Scene Commercial)

> **Kritik Mimari Not:** 20–30 saniyelik uzun reklamlar **asla tek bir kesintisiz Flow promptu olarak üretilmez**. Veo 8 saniyeden uzun kesintisiz üretimlerde nesne kimliğini ve karakter yüzünü bozar. Bu format, **birbirine tutarlı bağımsız kısa sahnelerin montajlanmasıdır**.

### 4.1 4 Aşamalı Senaryo ve Montaj Mimarisi (24–26 Saniye Standart)

```
0s        5s                 11s                  18s                 24s          26s
|---------|------------------|--------------------|-------------------|------------|
| SAHNE 1 |     SAHNE 2      |      SAHNE 3       |      SAHNE 4      |   OUTRO    |
|  HOOK   | SORUN / AJİTASYON| ÜRÜN ÇÖZÜMÜ GİRİŞİ | FONKSİYONEL KANIT | KURUMSAL   |
```

| Sahne | Süre | Senaryo Amacı | Prompt & Kamera Yönergesi | Varlık & Süreklilik |
|---|---|---|---|---|
| **Sahne 1: Kanca** | 0.0 – 5.0s | İzleyiciyi durdurmak | Şok edici operasyonel sorun veya merak uyandıran makro görsel. | Sahne ortamı kurulur |
| **Sahne 2: Ajitasyon** | 5.0 – 11.0s | Sorunun getirdiği stresi hissettirmek | Çaresizlik, dağınıklık veya manuel yorgunluk. | İnsan aktör / atölye tonu |
| **Sahne 3: Ürün Çözümü**| 11.0 – 18.0s| Çözüm kahramanının sahneye gelişi | Ürünün kutudan çıkışı veya sisteme bağlanması; marka logosunun ilk net görünümü. | Kilitli ürün görsel hash'i |
| **Sahne 4: Kanıt & Test**| 18.0 – 24.0s| Teknik üstünlük ve tolerans testi | Kesintisiz akış, pürüzsüz çalışma veya sağlamlık. | Fiziksel partikül tutarlılığı |
| **Sahne 5: Kapanış** | 24.0 – 26.0s| Kurumsal outro kartı | Ürünün mükemmel nihai durumu, memnun profesyonel bakış, ardından deterministik logo. | Tescilli logo + WhatsApp CTA |

### 4.2 Sahneler Arası Tutarlılık Protokolü (Consistency Protocol)
1. **Canonical Image Hash Kilidi:** Sahne 1'den Sahne 4'e kadar tüm Veo 3.1 Fast çağrılarında aynı `product_ref.jpg` referansı zorunlu kılınır.
2. **Ortam Promptu Aynılığı:** Sahne ortamını tanımlayan metin bloğu (ör. `"in a modern glass greenhouse with tomato vines and concrete walkway"`) her sahnede kelimesi kelimesine kopyalanır.
3. **Kurgu ve Dikiş (Stitching):** Sahne geçişlerinde sert atlama yerine 0.3 saniyelik FFmpeg crossfade (`xfade=transition=fade:duration=0.3`) kullanılır.
4. **Maliyet & Kredi Modeli:** 4 bağımsız sahne üretimi nedeniyle bu format **4x temel Veo API kredisi** tüketir.

---

## 5. Teknik Karşılaştırma & Maliyet Tablosu

| Parametre | 8 Saniye Tek Sahne (+2s Outro) | 20–30 Saniye Çoklu Sahne |
|---|---|---|
| **Veo API Üretim Sayısı** | **1 Adet** (8s video) | **3 – 4 Adet** (Her biri 5-7s) |
| **Toplam Render Süresi** | ~45 – 60 saniye | ~180 – 240 saniye |
| **Birim Maliyet (Kredi)** | 1x Temel Kredi | 3.5x – 4x Temel Kredi |
| **Post-Prodüksiyon Karmaşıklığı**| Düşük (Tek video + FFmpeg outro) | Yüksek (Concat + xfade + çoklu sahne senkronu) |
| **En İyi Kullanım Alanı** | E-ticaret, hızlı B2C ürünler, doğrudan WhatsApp satışı. | Yüksek bütçeli B2B makineler, kurumsal marka lansmanı. |
| **Önerilen Mesajify Paketi** | Standart Paket (Varsayılan) | Pro / Enterprise Paket |

---

*Belge Sonu — Mesajify Veo 8s vs 30s Ad Architecture.*
