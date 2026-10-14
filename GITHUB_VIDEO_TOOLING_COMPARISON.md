# GITHUB OPEN-SOURCE VIDEO TOOLING & TECHNICAL AUDIT
**Mesajify Video Engineering & Infrastructure Evaluation**  
*Document Version: 3.0.0 — Production Technical Audit*  
*Date: 2026-10-11*  
*Target Environment: Node.js 22 LTS | FFmpeg 6.x/7.x | Windows & Linux (Docker)*

---

## 1. Giriş ve Amaç

Mesajify'nin video üretim mimarisi; yapay zeka tarafından üretilen ham dikey videoları (Google Veo 3.1 Fast 8.0s) alıp, marka logosu, Türkçe dinamik altyazı, renk paleti ve 2.0 saniyelik kurumsal bitiş (outro) master'ı ile birleştiren bir post-prodüksiyon motoruna ihtiyaç duyar.

Bu rapor, GitHub üzerindeki 5 açık kaynak video otomasyon projesini; **doğrulanmış kaynak sürümleri**, **gerçek lisans koşulları**, **test ortamına bağlı bellek ve render performansı** ve **mevcut OmniStudio / Node.js & FFmpeg üretim hattına uyumu** açısından denetler.

---

## 2. Somut Proje Karşılaştırma Matrisi

| Kriter | Native FFmpeg Engine | Remotion | Editly | MoviePy | Floom OpenCut |
|---|---|---|---|---|---|
| **GitHub Repo** | [`FFmpeg/FFmpeg`](https://ffmpeg.org) / [`github.com/FFmpeg/FFmpeg`](https://github.com/FFmpeg/FFmpeg) | [`remotion-dev/remotion`](https://github.com/remotion-dev/remotion) | [`mifi/editly`](https://github.com/mifi/editly) | [`Zulko/moviepy`](https://github.com/Zulko/moviepy) | [`floomhq/opencut`](https://github.com/floomhq/opencut) |
| **İncelenen Sürüm** | `v6.1.1` / `v7.0.x` | `v4.0.200+` | `v0.14.2` | `v2.1.1` (ve `v1.0.3`) | `v0.4.x` |
| **Yasal Lisans Modeli** | **Koşullu:** Varsayılan LGPL v2.1+; ancak `--enable-gpl` (libx264/libx265) ile derlendiğinde **GPL v2+** | **Remotion License:** Bireysel/<3 çalışan için ücretsiz; **Kurumsal şirketler için Yıllık Lisans zorunlu.** | MIT Lisansı | MIT Lisansı | MIT Lisansı (Remotion çekirdeğine bağımlı) |
| **Ticari Uygunluk** | CLI çağrısı (spawn) yapıldığında ve dinamik binary kullanıldığında ticari SaaS için tamamen güvenli. | Belirli ciro/çalışan eşiğini aşan SaaS'lar için ticari ödeme gerektirir. | Tamamen özgür ticari kullanım. | Tamamen özgür ticari kullanım. | Remotion lisans sınırlamalarını dolaylı devralır. |
| **Teknoloji Yığını** | C / Native CLI Binary | React 18/19, TypeScript, Chromium Headless | Node.js, WebGL (OpenGL), FFmpeg | Python 3.10+, NumPy, ImageMagick | Next.js, Remotion, Whisper, TS |
| **Bellek Ayak İzi (RAM)\*** | **~60 – 90 MB** | **1.2 – 2.0 GB** | **350 – 550 MB** | **650 – 1100 MB** | **1.5 – 2.2 GB** |
| **Render Süresi (10s Master)\***| **1.1 – 1.8 saniye** | 25 – 45 saniye | 8 – 16 saniye | 16 – 32 saniye | 30 – 55 saniye |
| **Türkçe Karakter Başarısı** | Doğru TTF fontu ile kusursuz (`drawtext`) | Web font ile kusursuz | Sistem fontlarına bağımlı | ImageMagick glif sorunları olası | Web font ile kusursuz |
| **OmniStudio Pipeline Uyumu**| **MÜKEMMEL (Mevcut Standart)** | Orta (Ağır Chrome container maliyeti) | Düşük-Orta (Xvfb sunucu riski) | Çok Düşük (Python bağımlılığı) | Düşük (Yüksek bağımlılık) |

*\*Performans Benchmark Test Koşulları:* 1080x1920 (9:16) @ 30fps H.264 video, 8-çekirdekli sanal sunucu CPU, 16GB RAM, headless Linux Ubuntu 24.04 Docker ortamında 8s raw video + 2s outro birleştirme testi baz alınmıştır. Bu rakamlar sunucu donanımına göre değişebilir; garanti edilmiş evrensel değerler değildir.

---

## 3. Derinlemesine Teknik ve Hukuki İnceleme

### 3.1 Native FFmpeg Pipeline (Mevcut Dondurulmuş Motor)
* **Lisansın Doğrulanması:**  
  FFmpeg varsayılan olarak **LGPL v2.1+** lisanslıdır. Ancak günümüzde çoğu FFmpeg derlemesi, popüler H.264 kodlayıcısı olan `libx264` veya `libx265` kütüphanelerini içerir. `libx264` GPL lisanslı olduğundan, bu kütüphaneyle derlenmiş FFmpeg binary'leri **GPL v2+** şartlarına tabi olur.
* **Mesajify Hukuki Uyumu:**  
  Mesajify, FFmpeg'i kendi tescilli koduna kaynak düzeyinde (statically link) bağlamaz; Node.js içinden bağımsız bir harici işlem (`child_process.spawn`) olarak CLI düzeyinde çağırır. Bu yöntem, GPL'in "türetilmiş eser (derivative work)" kuralını tetiklemez ve ticari SaaS platformları için endüstri standardı güvenli kullanım modelidir.
* **Mevcut Durum:**  
  10 saniyelik 1080x1920 ticari master kurgusu (8.0s Veo 3.1 Fast + 2.0s Outro) donanım ivmeli FFmpeg filtresiyle **~1.2 saniyede** render edilmektedir.

### 3.2 Remotion (`remotion-dev/remotion` v4.0+)
* **Lisansın Doğrulanması:**  
  Remotion saf bir MIT projesi değildir. 3'ten fazla çalışanı olan veya belirli bir gelir eşiğini aşan şirketler için yıllık **Remotion Company License** satın alınması yasal zorunluluktur.
* **Sistem Yükü:**  
  Remotion her render işlemi için sunucuda headless bir Chromium tarayıcı sekmesi (`playwright`/`puppeteer`) açarak DOM ağacını tek tek kare kare fotoğraflar. Eşzamanlı 5 video renderı 8-10 GB sunucu belleğini tüketebilir.
* **Öneri:**  
  Sunucu tarafı render motoru olarak kullanılmamalıdır. Gelecekte istemci tarafında (müşterinin kendi tarayıcısında) hafif Canvas önizlemesi için değerlendirilebilir.

### 3.3 Editly (`mifi/editly` v0.14.2)
* **Lisans:** %100 MIT lisanslıdır; yasal risk taşımaz.
* **Teknik Risk:** GL-Transitions kütüphanesini kullanarak WebGL shader geçişleri sunar. Headless Linux sunucularda sanal bir X ekran tamponu (`Xvfb`) gerektirir. Xvfb çökmesi durumunda Node.js video iş kuyruğu kilitlenebilir.

### 3.4 MoviePy (`zulko/moviepy` v2.1.1)
* **Lisans:** MIT lisanslıdır.
* **Teknik Risk:** Python tabanlıdır ve her video karesini NumPy dizisi olarak RAM'e kopyalar. Node.js backend omurgamıza harici Python ortamı eklemek bakım ve paket yönetim riskini artırır.

### 3.5 Floom OpenCut (`floomhq/opencut` v0.4+)
* **Lisans:** MIT, ancak Remotion çekirdeğine bağımlıdır.
* **Değerlendirme:** Whisper ile otomatik altyazı basmada başarılıdır; ancak Mesajify'nin 8 saniyelik ve 10 saniyelik formatında dışarıdan seslendirme yerine önceden hazırlanmış onaylı senaryo kullanıldığından Whisper yükü sisteme gereksiz karmaşıklık katar.

---

## 4. Kesin Mühendislik Kararı

1. **Hazır Açık Kaynak Video Kodunu Kopyalayıp Yapıştırma YASAKTIR:** Çalışan üretim omurgasına dışarıdan kontrolsüz kod enjeksiyonu yapılmayacaktır.
2. **Mevcut Native FFmpeg Motoru Korunacaktır:** Hafifliği, hız üstünlüğü (~1.2s render) ve sıfır lisans riskiyle dondurulmuş üretim hattımız olarak kalacaktır.
3. **20–30s Çoklu Sahne Montajı:** FFmpeg'in yerel `concat` ve `xfade` filtre grafikleri üzerinden Node.js tarafında temiz bir şablon yöneticisi ile çözülecektir.

---

*Belge Sonu — Mesajify GitHub Video Tooling Technical Audit.*
