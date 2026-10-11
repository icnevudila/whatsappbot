# Mesajify V1 — Campaign Draft Persistence & Handoff Report

**Tarih:** 11 Ekim 2026  
**Test Kapsamı:** `DRF-01`, `DRF-02`, `DRF-03`, `DRF-04`  
**Test Türü:** Canlı Playwright E2E + Doğrudan PostgreSQL Sorgusu

---

## 1. P0 Kuralı: Taslak İçin WhatsApp Hattı ve Kişi Zorunlu Değildir
Mesajify V1'in en kritik mimari iyileştirmesi, kampanya hazırlama (taslak) aşaması ile kampanya gönderim aşamasının birbirinden kesin çizgilerle ayrılmasıdır.

Kullanıcı:
- Henüz bir kişi listesi yüklememiş olabilir.
- Henüz aktif bir WhatsApp hattı QR ile bağlamamış olabilir.
- Sadece hazırladığı reklam metnini ve görselini kaydedip daha sonra geri dönmek isteyebilir.

### Test Sonuçları:
1. **`DRF-01`: Hat ve Kişi Olmadan Taslak Kaydı:**  
   Kullanıcı yalnızca kampanya adı ve mesaj girerek "Taslağı Kaydet" butonuna bastı. Sistem hat veya liste zorunluluğu hatası vermeksizin işlemi başarıyla tamamladı ve `/kampanyalar/<id>?taslak=1` adresine yönlendi. (**PASS**)
2. **`DRF-02`: Gerçek Veritabanı Kalıcılığı:**  
   PostgreSQL `campaigns` tablosu doğrudan sorgulandı:
   - `id`: `86ff8778-7308-40a5-a3ed-c6e40cfa642f`
   - `org_id`: `afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc` (Bofe)
   - `status`: `'draft'`
   - `source_list_ids`: `[]` (Boş dizi, null hatası yok)
   - **Sonuç:** PASS
3. **`DRF-03`: Arka Plan WhatsApp İş İzolasyonu:**  
   Taslak kaydı esnasında kuyrukta (`campaign_queue` veya `jobs`) sıfır (0) iş oluşturulduğu doğrulandı. Müşteri yanlışlıkla gönderim tetikleme riski taşımamaktadır. (**PASS**)
4. **`DRF-04`: F5 ve Sayfa Yenileme Dayanıklılığı:**  
   Tarayıcıda F5 çekildikten sonra kampanya adı, mesaj metni ve seçilen medyanın eksiksiz ekranda kaldığı teyit edildi. (**PASS**)

---

## 2. Handoff Sözleşmesi (Creative Studio -> Campaign Studio)
Kreatif sayfasından tıklandığında URL üzerinden `creative_id` iletilir. Campaign Studio:
- İlgili kreatifin mevcut oturumdaki `org_id`'ye ait olup olmadığını sunucu tarafında doğrular.
- Kreatif `ready` durumunda değilse güvenli ve bilgilendirici bir uyarı gösterir.
- Geçerli ise medyayı doğrudan taslağın `media_url` ve `media_type` alanlarına bağlar.
