# Final medya slotları

Kaynak: `src/content/media-slots.ts`. Final medya üretimi **başlatılmadı**. `pending`, yeni dosyanın henüz bulunmadığını gösterir; mevcut gerçek medya fallback olarak kalır.

| No | Asset ID | Bölüm | Araç | Format / süre | Final dosya | Poster | Durum |
|---|---|---|---|---|---|---|---|
| 01 | creative-bofe-master | Hero, Journey, Creative, Reply, CTA | Veo / Flow | 9:16, 8–10 sn | `/public/media/creative/bofe-master.mp4` | `/public/media/creative/bofe-master.webp` | pending |
| 02 | sector-ecommerce | Sector Lab | Flow / Veo | 9:16, 8 sn | `/public/media/sectors/ecommerce.mp4` | `/public/media/sectors/ecommerce.webp` | pending |
| 03 | sector-restaurant | Sector Lab | Flow / Veo | 9:16, 8 sn | `/public/media/sectors/restaurant.mp4` | `/public/media/sectors/restaurant.webp` | pending |
| 04 | sector-automotive | Sector Lab | Flow / Veo | 9:16, 8 sn | `/public/media/sectors/automotive.mp4` | `/public/media/sectors/automotive.webp` | pending |
| 05 | sector-realestate | Sector Lab | Flow / Veo | 9:16, 8 sn | `/public/media/sectors/realestate.mp4` | `/public/media/sectors/realestate.webp` | pending |
| 06 | sector-clinic | Sector Lab | Flow / Veo | 9:16, 8 sn | `/public/media/sectors/clinic.mp4` | `/public/media/sectors/clinic.webp` | pending |
| 07 | sector-service | Sector Lab | Flow / Veo | 9:16, 8 sn | `/public/media/sectors/service.mp4` | `/public/media/sectors/service.webp` | pending |

Tüm videolar için önerilen minimum çözünürlük: 1080 × 1920. Poster aynı oranda olmalı. Bofe ana slotu masaüstünde 300 × 533, mobilde 280 × 498 px; sektör slotları masaüstünde 350 × 622, mobilde 330 × 587 px referans yerleşim ölçülerine sahiptir. Bileşen oranı koruyarak duyarlı boyutlanır.

## Amaç, görsel tarif ve kısıtlar

1. **Bofe master:** gerçek sıradan kaynak fotoğrafından kampanya reklamına dönüşümün çıktısı. Ürün tasarımı, logo, özellikler ve fiziksel yapı korunmalı; hayali fiyat veya teknik bilgi eklenmemeli. Aynı çıktı ana hikâyenin tüm aşamalarında kullanılır.
2. **E-Ticaret:** kurgusal, markasız teknoloji ürünü; malzeme detayı ve sade ürün reklamı. Fiyat, indirim, tanınan marka ve sahte müşteri iddiası yok.
3. **Restoran:** yemeğin hazırlığı ve servis anı; sıcak restoran ortamı. Hayali işletme, fiyat veya indirim metni yok.
4. **Otomotiv:** markasız araç, malzeme ve far detayı, kontrollü reklam hareketi. Tanınan üretici/logo, plaka metni ve hayali teknik özellik yok.
5. **Emlak:** mimari dış mekân ve iç mekân bakışı. Hayali proje markası, fiyat ve satış iddiası yok.
6. **Klinik:** sakin resepsiyon ve danışma ortamı. Prosedür, tıbbi sonuç iddiası ve tanınabilir hasta yok.
7. **Hizmet:** mevcut hizmet örneğine uygun işletme ortamı. Hayali başarı, müşteri veya fiyat iddiası yok.

## Mevcut varlıklar

- Bofe kaynak fotoğrafı: `/public/landing/studio/product-source-raw.jpg`; Creative giriş slotu 4:5 olarak kırpılmadan `object-fit: contain` ile sunulmalıdır.
- Bofe reklamı: `/public/landing/studio/product.mp4` ve `product-poster.jpg`.
- Gerçek restoran reklamı: `/public/landing/studio/restaurant.mp4` ve `restaurant-poster.jpg`.
- Altı geçici sektör klibi: `/public/landing/studio/{sector}-flow-veo.mp4` ve eşleşen posterleri.
- Gerçek ekranlar: `/public/landing/hizli-gonderim.png`, `ozet.png`, `kisiler.png`, `hesaplar.png`, `raporlar.png`, `gelenler.png`. Üretim aracı: Existing Real Asset. Ekranlar yeniden çizilmez veya AI ile üretilmez.
- Resmî marka: `/public/brand/mesajify-logo-full.png`, `/public/brand/mesajify-symbol.png`. Kullanıcı kaynağından piksel koruyan raster kırpma; vektör kaynağı verilmedi.
- Creative işlem odası, yönlendirme, tarayıcı, yanıt yolculuğu ve Bento: HTML/SVG; yeni görsel üretimi gerektirmez.

## Değiştirme akışı

Final dosya ve poster doğrulandıktan sonra slot durumu `available` yapılır ve medya manifestine bağlanır. Eksik final dosyaları uydurulmaz. Gerçek dosya varlığı, boyut, codec ve tarayıcı oynatımı doğrulanmadan final medya tamamlandı sayılmaz. Runtime manifesti bu slotlara bağlıdır: pending slotta mevcut gerçek medya oynar; available durumuna alındığında hedef dosya ve poster kullanılır. Mevcut 23 dosyanın byte boyutu ve SHA-256 kaydı ASSET-VERIFICATION.json içindedir. Yedi final MP4 ve poster üretimi henüz bekliyor.
