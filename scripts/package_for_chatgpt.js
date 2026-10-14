const fs = require('fs');
const path = require('path');

const baseDir = 'C:\\Users\\TP2\\Desktop\\Mesajify_Final_Uretimler';
const packDir = path.join(baseDir, '01_Mesajify_V2_10_Mod_Gorselleri');

if (!fs.existsSync(packDir)) fs.mkdirSync(packDir, { recursive: true });

const targetFiles = [
  '01_mesajify_smart_campaign.png',
  '02_mesajify_showstopper.png',
  '03_mesajify_real_life.png',
  '04_mesajify_premium_showcase.png',
  '05_bofe_smart_campaign.png',
  '06_bofe_showstopper.png',
  '07_bofe_real_life.png',
  '08_bofe_premium_showcase.png',
  '09_mesajify_variation_showstopper.png',
  '10_bofe_revision_headline.png'
];

for (const f of targetFiles) {
  const src = path.join(baseDir, f);
  const dest = path.join(packDir, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
}

const summaryText = `# MESAJIFY CREATIVE STUDIO V2 — 10 REKLAM BENCHMARK DOSYASI
Bu klasör, Mesajify Creative Studio V2 sistemiyle OmniStudio / ChatGPT motoru üzerinden üretilen 10 adet doğrulanmış gerçek reklam afişini içerir.

## ÜRETİM VE MOD LİSTESİ:

1. [01_mesajify_smart_campaign.png]
   - Marka: Mesajify (SaaS / WhatsApp Otomasyonu)
   - Mod: SMART_CAMPAIGN (Akıllı Kampanya - Varsayılan)
   - Kullanıcı Promptu: (Boş — Otonom AI)
   - Başlık: WhatsApp ile Satışlarınızı Büyütün | CTA: Hemen Başlayın

2. [02_mesajify_showstopper.png]
   - Marka: Mesajify
   - Mod: SHOWSTOPPER_CAMPAIGN (Gösterişli Kampanya)
   - Kullanıcı Promptu: Büyük 3D kabartmalı başlık, çoklu cihaz ekranları ve dinamik kampanya katmanları ile etkileyici afiş
   - Başlık: İşletmenizi Zirveye Taşıyın | CTA: Ücretsiz Keşfet

3. [03_mesajify_real_life.png]
   - Marka: Mesajify
   - Mod: REAL_LIFE_CAMPAIGN (Gerçek Kullanım)
   - Kullanıcı Promptu: Kafesinde telefonundan WhatsApp müşteri siparişlerini yöneten güleryüzlü kadın işletmeci, doğal mekan
   - Başlık: Müşterilerinizle Anında İletişim | CTA: Detaylı Bilgi Al

4. [04_mesajify_premium_showcase.png]
   - Marka: Mesajify
   - Mod: PREMIUM_SHOWCASE (Premium Vitrin)
   - Kullanıcı Promptu: Koyu zümrüt ve mat antrasit kaide üstünde sinematik ışıkla parlayan Mesajify ekranı, lüks stüdyo
   - Başlık: Kurumsal İletişimde Yeni Standart | CTA: Ayrıcalığı Keşfet

5. [05_bofe_smart_campaign.png]
   - Marka: Bofe Tarım
   - Mod: SMART_CAMPAIGN (Akıllı Kampanya - Varsayılan)
   - Kullanıcı Promptu: (Boş — Otonom AI)
   - Başlık: Bofe 16L Akülü Pompa — Bahçenizde Güç | CTA: Hemen İnceleyin

6. [06_bofe_showstopper.png]
   - Marka: Bofe Tarım
   - Mod: SHOWSTOPPER_CAMPAIGN (Gösterişli Kampanya)
   - Kullanıcı Promptu: 3D kabartmalı başlık, Bofe 16L pompa, %22 indirim rozeti ve 1.450 TL kampanya fiyatı ile zengin satış afişi
   - Başlık: Bahçe Sezonuna Özel Fırsat | CTA: Hemen Sipariş Ver

7. [07_bofe_real_life.png]
   - Marka: Bofe Tarım
   - Mod: REAL_LIFE_CAMPAIGN (Gerçek Kullanım)
   - Kullanıcı Promptu: Zeytin bahçesinde Bofe 16L pompa ile çalışan kadın ziraat uzmanı, doğal sabah gün ışığı
   - Başlık: Tarlada ve Bahçede Profesyonel Çözüm | CTA: Ürünü İnceleyin

8. [08_bofe_premium_showcase.png]
   - Marka: Bofe Tarım
   - Mod: PREMIUM_SHOWCASE (Premium Vitrin)
   - Kullanıcı Promptu: Koyu antrasit doğal taş podyum üstünde Bofe 16L pompa, dramatik sinematik ışık ve heykelsi gölgeler
   - Başlık: Mühendislik ve Gücün Kusursuz Uyumu | CTA: Detaylı Bilgi

9. [09_mesajify_variation_showstopper.png]
   - Marka: Mesajify
   - Tip: Akıllı Varyasyon (Mod Değişimi: REAL_LIFE -> SHOWSTOPPER)
   - Kullanıcı Promptu: Aynı işletme sipariş konseptini zengin 3D tipografi ve canlı kampanya afişine dönüştür
   - Başlık: Müşterilerinizle Kesintisiz Bağlantı | CTA: Hemen Başlayın

10. [10_bofe_revision_headline.png]
   - Marka: Bofe Tarım
   - Tip: Kontrollü Revizyon (Başlık Değişimi)
   - Kullanıcı Promptu: Yalnız reklam başlığını değiştir; mevcut sahne, insan, zeytinlik, Bofe 16L ürün ve logo aynen korunsun.
   - Başlık: Bahçenizde Profesyonel Güç | CTA: Ürünü İnceleyin
`;

fs.writeFileSync(path.join(packDir, 'CHATGPT_REKLAM_OZETI.md'), summaryText, 'utf8');
console.log('✓ Clean package created successfully at:', packDir);
