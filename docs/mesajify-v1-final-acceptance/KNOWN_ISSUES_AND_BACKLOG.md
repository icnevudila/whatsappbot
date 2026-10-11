# Mesajify V1 — Known Issues & Pilot Backlog

**Tarih:** 11 Ekim 2026  
**Durum:** V1 Pilot İçin Bloke Edici P0/P1 Hata Yoktur.

---

## 1. Açık P2 / P3 Konuları (Pilot Sonrası Geliştirilecek)

### A. P2 — Video İşleme Süresi Geri Sayımı
- **Mevcut Durum:** Video üretiminde kullanıcıya spinner ve "Video üretiliyor" bilgisi veriliyor.
- **Backlog İyileştirmesi:** Kullanıcıya ortalama ~75 saniye süreceğini belirten dinamik bir zamanlayıcı veya mini ipuçları eklenmesi.

### B. P2 — Çoklu Medya Seçimi (Carousel Ön Hazırlığı)
- **Mevcut Durum:** Campaign Studio V1 tek bir görsel veya videoyu kampanya mesajına ekleyebilmektedir.
- **Backlog İyileştirmesi:** İleride WhatsApp katalog/carousel formatları desteklendiğinde birden fazla ürün görselinin aynı taslağa eklenebilmesi.

### C. P3 — Otomatik İndirme İsimlendirme Şablonu
- **Mevcut Durum:** İndirilen dosyalar `video_<id>.mp4` veya `image_<id>.png` olarak inmektedir.
- **Backlog İyileştirmesi:** Dosya adının `Mesajify_<MarkaAdı>_<KampanyaAdı>.mp4` şeklinde daha kurumsal şablonla sunulması.

---

## 2. Bilinen Sınırlar
1. **WhatsApp Gönderimleri:** V1 pilot aşamasında sadece taslak oluşturma ve onaylanmış hatlarla kontrollü gönderim test edilmiştir. Toplu 50.000+ mesajlık anlık kuyruk boşaltma bu testin kapsamı dışındadır.
2. **Stripe:** Otomatik abonelik yenileme devre dışıdır; manuel fatura kesimi esastır.
