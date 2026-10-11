# Mesajify V1 — Wizard UX Review & Prompt Discipline

**Tarih:** 11 Ekim 2026  
**İncelenen Modüller:** Creative Studio V3 (`/icerik/yeni`), Campaign Studio V1 (`/kampanyalar/yeni`)  
**Testler:** `WIZ-01`, `WIZ-02` (Playwright E2E Doğrulandı)

---

## 1. Temel UX İlkeleri ve Değerlendirme

### A. Tanıtım Biçimi ve Hedef Seçimi
- **Marka Tanıtımı vs. Ürün Tanıtımı:** Kullanıcı bir ürün seçtiğinde ürünün gerçek fotoğrafları ve açıklaması bağlama eklenir; marka tanıtımı seçildiğinde ise doğrudan Marka Kiti'ndeki logo ve kurumsal kimlik devreye girer.
- **Logo ve Ürün Fotoğrafı Ayrımı:** Ürün fotoğraflarının yanlışlıkla işletme logosu olarak kullanılması riski ortadan kaldırılmıştır. Logo her zaman `org_brand_kits.logo_url` üzerinden doğrulanır.

### B. Prompt Disiplini ve Fiyat/Teklif Hallüsinasyonları
- **P0 Güven Kuralı:** Kullanıcının girmediği veya bilmediği indirim oranları, fiyatlar ve vaatler AI promptuna eklenmez.
- **V1 Disiplini:** Test `WIZ-02` kapsamında teyit edildiği üzere, arayüzde sahte "Fiyat Uydur" veya "Otomatik İndirim Belirle" gibi yanıltıcı otomasyonlar bulunmamaktadır. Kampanya metninde sadece kullanıcının girdiği bilgiler ve ürün açıklaması yer alır.

### C. Geri Tuşu ve Seçim Sıfırlanması
- Adımlar arasında geri gidildiğinde form girdileri yerel state'te saklanır.
- Kullanıcı bir önceki adıma döndüğünde yazdığı kampanya başlığı veya seçtiği medya sıfırlanmaz.

---

## 2. Son Kontrol (Özet) Ekranı
Kampanya sihirbazının son adımında kullanıcıya:
1. Kampanya Adı
2. Hazırlanan Medya (Varsa görsel/video rozeti ve dosya önizlemesi)
3. Mesaj Metni
4. Kişi Sayısı (Seçilmediyse açıkça "Henüz liste seçilmedi — Taslak olarak kaydedilebilir" bilgisi)
5. Gönderen Hat (Seçilmediyse açıkça "Henüz hat bağlanmadı — Taslak olarak kaydedilebilir" bilgisi)

gösterilerek kullanıcının neyi kaydettiği tam olarak bilmesi sağlanır.

---

## 3. İyileştirme Önerileri (V1.1 Backlog)
- *Görsel/Video Üretim Süresi Bildirimi:* Veo video üretimleri 60-90 saniye sürdüğünden, kullanıcıya üretim esnasında tahmini bekleme süresi ve "Bu sayfadan ayrılsanız bile işleminiz devam eder" bildirimi daha belirgin sunulabilir.
