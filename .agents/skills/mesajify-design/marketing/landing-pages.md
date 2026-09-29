# Mesajify Landing Page Kuralları

## Bölüm Sıralaması (Kesin)

```
1.  NAVBAR
2.  HERO + LIVE WHATSAPP DEMO
3.  PRODUCT TRUTH BAR
4.  SECTOR LAB (İnteraktif)
5.  3 ADIMDA MESAJIFY
6.  BENTO GRID — 4 GÜÇ
7.  REAL PRODUCT EXPLORER
8.  PIPELINE
9.  METRİKLER
10. KONTROL / GÜVEN (Koyu bölüm)
11. FAQ
12. FINAL CTA
13. FOOTER
```

## Hero Bölümü Kuralları

- **Layout:** %55 copy / %45 telefon demo (desktop)
- **H1:** "Reklamınızı oluşturun. WhatsApp'tan ulaştırın. Yanıtları tek yerden yönetin."
- **Sub:** "Ürün fotoğrafınızı yükleyin. Mesajify kampanya içeriğinizi hazırlar..."
- **Trust line:** "✓ Kurulum gerektirmez  ✓ Teknik bilgi gerekmez"
- Telefon: **Saf HTML/CSS** mockup, gerçek `<video>` elemanı içinde

## Telefon Simülatörü Animasyon Sırası

```
0s    → product.mp4 autoplay muted loop başlar
3s    → Mesaj balonu gelir (WhatsApp UI içinde)
       "Yeni koleksiyonumuz yayında ✨ Detay için yazabilirsiniz."
4.5s  → Müşteri yanıtı animasyonu:
       "Siyah modeli var mı?"
6s    → Mesajify notification popup:
       "🔔 Yeni yanıt — Gelen Kutusu"
```

## Onaylı Metrikler (Sadece Bunlar)

| Sayı | Açıklama |
|---|---|
| `100+` | Sektör |
| `1.000` | Hazır senaryo |
| `8–16 sn` | Reklam formatları |
| `9:16` | Dikey video |

**YASAK:** `%98.4 iletim oranı` veya kanıtlanamayan istatistikler.

## Bileşen Dosya Yapısı

```
apps/landing/src/components/
├── navbar.tsx
├── hero/
│   ├── hero-section.tsx
│   └── phone-simulator.tsx
├── trust-bar.tsx
├── studio/
│   ├── sector-lab.tsx
│   └── video-card.tsx
├── how-it-works/steps-section.tsx
├── bento/
│   ├── bento-grid.tsx
│   └── multi-line-demo.tsx
├── product/panel-tour.tsx
├── pipeline/pipeline-section.tsx
├── metrics/metrics-bar.tsx
├── trust/control-section.tsx
├── faq/faq-accordion.tsx
├── cta/final-cta.tsx
└── footer.tsx
```

## Animasyon Kuralları (Landing'e Özel)

- Framer Motion **YOK** — CSS native + `IntersectionObserver`
- `prefers-reduced-motion` desteği zorunlu
- Scroll trigger threshold: `0.15`
- Stagger max budget: `400ms`

## Teknik Kısıtlar

- `next/image` — tüm görseller için
- Video: `autoplay muted loop playsInline`
- `preload="metadata"` — video boyut kontrolü
- Lighthouse Performance hedefi: `> 90`
