# Mesajify Kredi ve Tüketim Defteri (Credit Usage Ledger)

**Tarih:** 11 Ekim 2026  
**Durum:** KESİN MUHASEBE VE DENETİM DOĞRULANDI  
**Politika:** Sıfır Çift Faturalandırma, Sıfır Kota Aşımı, Tam İzole İş Kaydı  

---

## 1. Üretim Bütçesi Özeti

| Medya Türü | Yetkilendirilen Üst Sınır | Gerçekleşen Üretim | Kalan Hak | Durum |
|---|---|---|---|---|
| **AI Görsel (Ideogram V3)** | 4 Adet | **2 Adet** | 2 Adet | Limit İçinde |
| **AI Video (Google Veo 3.1 Fast)** | 2 Adet | **2 Adet** | 0 Adet | Limit Tamamlandı |

Kullanıcının talimatında belirtilen "En fazla 4 görsel, 2 video" kuralına harfiyen uyulmuş, video kotası doldurulduktan sonra kesinlikle yeni ücretli video isteği başlatılmamıştır.

---

## 2. Ayrıntılı İşlem Defteri (Transaction Log)

### İşlem 1: BOFE AI Görsel Üretimi
- **Zaman Damgası:** 2026-10-11 19:42 UTC+3
- **İşletme (Tenant):** BOFE (`afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc`)
- **Ürün:** 16L Şarjlı Sırt İlaçlama Pompası
- **Sağlayıcı:** Ideogram V3 (OmniStudio Gateway)
- **Creative ID:** `aefa9578-07ea-56eb-abe5-cc500d638fca`
- **Gateway Job ID:** `job_11adfea327db67bd`
- **Kredi Maliyeti:** 1 Görsel Kredisi
- **Sağlayıcı Yanıtı:** HTTP 200 OK (Durum: `COMPLETED`)
- **Dosya Bütünlüğü:** `f5d3606d2b949f7bb48fb6a04bfc1cee09a476f2b42879936401636f2817cf83` (2,151,799 byte)
- **Çift Faturalandırma Kontrolü:** Tekil Job ID, tekil callback, tekrar ödeme yok.

### İşlem 2: AYVAZOĞLU İNŞAAT AI Görsel Üretimi
- **Zaman Damgası:** 2026-10-11 19:47 UTC+3
- **İşletme (Tenant):** Ayvazoğlu İnşaat (`4a58b0dd-0931-4901-880a-686457d15010`)
- **Ürün:** Klinker Kil Tuğla
- **Sağlayıcı:** Ideogram V3 (OmniStudio Gateway)
- **Creative ID:** `1adaece3-f218-55ee-ad5a-4f0e1492e06e`
- **Gateway Job ID:** `job_5916ae95f123cc92`
- **Kredi Maliyeti:** 1 Görsel Kredisi
- **Sağlayıcı Yanıtı:** HTTP 200 OK (Durum: `COMPLETED`)
- **Dosya Bütünlüğü:** `7bcae2c7d36848f466425a0b5a65580b9ae779d17eafc3747828bd6c5d98f0e8` (2,201,996 byte)
- **Çift Faturalandırma Kontrolü:** Tekil Job ID, tekil callback, tekrar ödeme yok.

### İşlem 3: AYVAZOĞLU İNŞAAT Veo 3.1 Fast Video Üretimi
- **Zaman Damgası:** 2026-10-11 19:54 UTC+3
- **İşletme (Tenant):** Ayvazoğlu İnşaat (`4a58b0dd-0931-4901-880a-686457d15010`)
- **Ürün:** Klinker Kil Tuğla
- **Sağlayıcı:** Google Veo 3.1 Fast (OmniStudio Flow)
- **Job ID:** `9005770f-a73a-594b-aa1a-c8ab91b6b303`
- **Output ID:** `d074451a-ad9d-45f8-82f3-6d80527048c2`
- **Kredi Maliyeti:** 1 Video Kredisi (10s Dikey Video)
- **Sağlayıcı Yanıtı:** HTTP 200 OK (Durum: `COMPLETED / NEEDS_REVIEW`)
- **Dosya Bütünlüğü:** `0b9b06c90c07cedb4ff7b0f189798179c7a38c29282450ec63b06de34c04bf37` (3,722,607 byte)
- **Çift Faturalandırma Kontrolü:** Başarılı tekil üretim, tekrar ödeme yok.

### İşlem 4: BOFE Veo 3.1 Fast Video Üretimi
- **Zaman Damgası:** 2026-10-11 20:01 UTC+3
- **İşletme (Tenant):** BOFE (`afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc`)
- **Ürün:** 16L Şarjlı Sırt İlaçlama Pompası
- **Sağlayıcı:** Google Veo 3.1 Fast (OmniStudio Flow)
- **Job ID:** `6f8654c2-a94d-5233-a8d9-0839623d33ed`
- **Output ID:** `ebd77172-8701-4c63-a251-27d9cc55f9d8`
- **Kredi Maliyeti:** 1 Video Kredisi (10s Dikey Video)
- **Sağlayıcı Yanıtı:** HTTP 200 OK (Durum: `COMPLETED / NEEDS_REVIEW`)
- **Dosya Bütünlüğü:** `6e4ec22d5c89d3b62f3446525decdd4543e4ebbe0463f876d6d99e41108a4ce6` (4,399,118 byte)
- **Çift Faturalandırma Kontrolü:** Başarılı tekil üretim, tekrar ödeme yok.

---

## 3. Güvenlik ve Maliyet Koruma Garantisi
1. **İkili İstek Engeli (Idempotency):** Ağ gecikmesi veya poll süresi uzaması durumlarında yeni job başlatılmamış, mevcut Job ID üzerinden durum sorgulaması (reconcile) yapılmıştır.
2. **Kayıtsız Harcama Yok:** Tüm üretimler tenant bazında `creatives` ve `ai_media_jobs` tablolarına karşılık gelen kayıtlarla eşleştirilmiştir.
3. **Müşteri Verisi ve Canlı WhatsApp:** Hiçbir gerçek müşteriye WhatsApp mesajı atılmamış, Stripe entegrasyonuna dokunulmamış, yalnızca ayrılmış test işletmelerinin marka varlıkları kullanılmıştır.
