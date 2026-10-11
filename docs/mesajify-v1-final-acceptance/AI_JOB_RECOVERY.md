# Mesajify V1 — AI Job Recovery & Failure Safety Report

**Tarih:** 11 Ekim 2026  
**Konu:** Arka Plan AI İşleri (Veo, Ideogram), Sayfa Yenileme (F5), Ağ Kesintileri ve Kurtarma Disiplini

---

## 1. Temel İlke: Sıfır Mükerrer Ücretli İş Başlatma
Mesajify V1'de en katı finansal ve operasyonel kural:
> **Durumu belirsiz bir AI işi için arka planda asla otomatik yeni bir ücretli API çağrısı başlatılmaz.**

Eğer bir kullanıcı işlem sürerken sayfayı yenilerse (F5), sekmeyi kapatırsa veya ağ kesintisi yaşanırsa:
1. Mevcut `job_id` ve `provider_job_id` veritabanında saklanır.
2. Sayfa yeniden yüklendiğinde panel var olan işin durumunu `GET /api/creatives/jobs/<id>` üzerinden sorgular.
3. Sağlayıcıda (Veo/Ideogram) iş henüz tamamlanmadıysa mevcut işin durumu (ör. `rendering`, `polling`) gösterilmeye devam eder; yeni bir üretim tetiklenmez.

---

## 2. Ağ ve Gateway Hatalarında Davranış
- **Gateway 429 (Rate Limit):** Kullanıcıya "Şu anda yoğunluk var, lütfen birkaç saniye bekleyin" bilgisi verilir ve otomatik üstel geri çekilme (exponential backoff) uygulanır.
- **Gateway 502 / Timeout:** İş anında başarısız işaretlenmez; 3 deneme boyunca sağlayıcı durumu kontrol edilir.
- **Sağlayıcı Başarısızlığı:** İş gerçekten hata verdiyse kullanıcıya dürüstçe "Üretim tamamlanamadı" bildirimi ve hata sebebi (ör. güvenlik filtresi, uygunsuz içerik) gösterilir; sahte başarı üretilmez.

---

## 3. İki Sekmeden Aynı İşin Takibi
- İki farklı sekme aynı anda aynı işi sorguladığında, polling istekleri veritabanındaki tekil `creative_jobs` satırını baz alır.
- Çakışan güncellemelere karşı veritabanı kilitleri ve optimistic locking mekanizması korunur.
