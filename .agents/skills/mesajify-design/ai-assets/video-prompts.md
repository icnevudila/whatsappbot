# Mesajify AI Asset Prompt Şablonları — Video

## OmniStudio Video Üretim Kuralları

### Genel Prensipler
- **Gerçek marka logosu kullanma** — demo marka kullan (NOVA, Mahalle Fırını vb.)
- **Süre:** 8–12 saniye (landing için ideal)
- **Format:** `9:16` dikey (WhatsApp/Reels uyumlu)
- **Ses:** Arka plan müziği + ürün sesi, voiceover **YOK**
- **Son kare:** Logo + marka adı kapanışı, `1.5–2sn` bekle
- **Kalite:** Sinematik, studio-grade ışıklandırma

---

## Video Prompt Şablonu — E-Ticaret Ürün

```
Cinematic product advertisement video, 9:16 vertical format, 10 seconds.

Scene 1 (0-2s): [ÜRÜN] close-up on [ARKA PLAN]. Soft studio lighting,
shallow depth of field, subtle orbit camera movement.

Scene 2 (2-5s): [DETAY] macro shot. Dynamic rim lighting reveals
[ÜRÜN ÖZELLİĞİ]. Elegant, slow motion.

Scene 3 (5-8s): Lifestyle context. [KULLANIM SENARYOSU].
Natural lighting, aspirational feel.

Scene 4 (8-10s): Clean hero shot. Product centered on [RENK] background.
[MARKA ADI] text appears with fade.

Style: Premium, minimal, luxury brand aesthetic. No text overlays
except final brand moment. Muted color grade with subtle warm tones.
```

---

## Video 1: NOVA Kablosuz Kulaklık (E-Ticaret Demo)

```
Cinematic product advertisement, 9:16 vertical, 10 seconds.

Scene 1 (0-2s): Black wireless headphones on dark marble surface.
Extreme close-up. Soft overhead studio light. Slow orbital camera.

Scene 2 (2-5s): Headband detail macro. Premium material texture.
Dynamic rim light reveals stitching. 120fps slow motion.

Scene 3 (5-8s): Lifestyle shot: headphones next to smartphone on desk.
Warm ambient light. Aspirational, clean, modern workspace.

Scene 4 (8-10s): Product hero on pure black background. Center frame.
"NOVA" minimal white text fades in bottom center.

Style: Luxury tech brand. Apple/Sony aesthetics. No voiceover.
Subtle electronic ambient music. Cinematic color grade — deep blacks,
clean highlights.
```

**WhatsApp Mesajı (UI'da gösterilecek):**
> "Yeni modelimiz geldi 🎧 Renk ve ürün detayları için bize yazabilirsiniz."

**Müşteri Yanıtı (animasyonlu):**
> "Siyah rengi mevcut mu?"

---

## Video 2: Mahalle Fırını Kruvasan (Yerel İşletme Demo)

```
Cinematic food advertisement, 9:16 vertical, 9 seconds.

Scene 1 (0-2s): Golden croissants just out of oven. Steam rising.
Warm bakery light. Extreme close-up of flaky layers.

Scene 2 (2-5s): Chocolate drizzle macro in 120fps slow motion.
Rich, glistening texture. Warm amber color grade.

Scene 3 (5-7s): Croissant and coffee cup on rustic wooden table.
Morning light through window. Cozy, artisan bakery atmosphere.

Scene 4 (7-9s): Clean overhead shot. 3 croissants arranged on white parchment.
Minimal typography: "Bugün fırından çıktı." appears.

Style: Artisan food brand. Warm, authentic, appetite-inducing.
No voiceover. Soft acoustic background music. Golden hour color grade.
```

**WhatsApp Mesajı:**
> "Bugünün taze ürünleri hazır 🥐 Sipariş ve detay için bize yazabilirsiniz."

**Müşteri Yanıtı:**
> "6 adet ayırabilir misiniz?"

---

## Video Prompt Şablonu — Hizmet Sektörü

```
Clean, professional service business video, 9:16, 8 seconds.

Scene 1 (0-2s): [MEKÂN/ARAÇ/EKIP] establishing shot. Professional lighting.
Scene 2 (2-5s): Service delivery moment. Human touch, trust signals.
Scene 3 (5-7s): Happy customer / result moment. Authentic, not stock.
Scene 4 (7-8s): Business name + contact info overlay. Clean typography.

Style: Trustworthy, local business feel. Warm but professional color grade.
```

---

## OmniStudio API Çağrısı

```typescript
// generate_v5_video.mjs benzeri
const brief = {
  sector: 'e-ticaret' | 'restoran' | 'hizmet' | 'klinik',
  brandKit: {
    logoUrl: '/logos/mesajify-logo.png',
    primaryColor: '#25C96F',
    accentColor: '#2f5bff',
  },
  productImageUrl: '<ürün görseli URL>',
  campaignText: '<WhatsApp mesaj metni>',
  duration: 10,
  format: '9:16',
  style: 'premium-cinematic',
}
```
