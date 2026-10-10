# BUG FIXES BEFORE & AFTER

### 1. Sessiz İlk Ürün Seçimi (Silent Fallback) İptali
- **Önce:** Ürün belirtilmediğinde veya bulunamadığında `orgProducts[0]` otomatik atanıyordu.
- **Sonra:** Ürün seçimi zorunlu kılındı. Bulunamazsa veya eksikse HTTP 422 döndürülüyor.

### 2. İmla Düzeltmede Marka Adı ve Telefon Esnekliği
- **Önce:** İmla düzeltmede kaynakta marka adı olmasa bile marka adı zorunluluğu nedeniyle hatalı 422 oluşuyordu.
- **Sonra:** `requireBrandName` parametresi eklendi; yalnızca generate modunda veya kaynakta marka varsa aranır.

### 3. İşletmenin Kayıtlı Resmi Telefonunun Sahte Sayılması Engellendi
- **Önce:** Yapay zeka işletmenin resmi telefonunu eklediğinde kaynak metinde yoksa "sahte telefon" sayılıyordu.
- **Sonra:** İşletmenin kayıtlı telefonu (`businessPhone`) güvenli beyaz listeye alındı.
