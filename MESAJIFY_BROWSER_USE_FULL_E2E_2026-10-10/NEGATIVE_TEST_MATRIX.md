# NEGATIVE TEST MATRIX

| Test ID | Senaryo | Beklenen Sonuç | Gerçek UI/API Sonucu | Durum |
| :--- | :--- | :--- | :--- | :---: |
| NEG-NO-PRODUCT | Ürün Seçimi Olmadan Görsel Üretimi | Reddedilmeli (HTTP 422) | HTTP 422: Lütfen katalogdan bir ürün seçin | **PASS** |
| NEG-NO-IMAGE | Kanonik Fotoğrafı Olmayan Ürünle Üretim | Reddedilmeli (HTTP 422) | HTTP 422: Ürün fotoğrafı bulunamadı / katalog ürünü yok | **PASS** |
| NEG-EMPTY-CATALOG | Kataloğu Boş İşletmede Üretim | Reddedilmeli (HTTP 422) | HTTP 422: Önce katalog ürünü eklenmeli | **PASS** |
| NEG-PRICE-MUTATION | Fiyat Mutasyonu / Halüsinasyonu (1.850 -> 11.850 TL) | Reddedilmeli (HTTP 422) | KESİNLİKLE REDDEDİLDİ (HTTP 422) | **PASS** |
| NEG-FAKE-DELIVERY | Uydurma Teslimat Vaadi ("aynı gün kapınızda") | Reddedilmeli (HTTP 422) | KESİNLİKLE REDDEDİLDİ (HTTP 422) | **PASS** |
| NEG-FAKE-PHONE | Sahte / Uydurma Telefon Numarası | Reddedilmeli (HTTP 422) | KESİNLİKLE REDDEDİLDİ (HTTP 422) | **PASS** |
