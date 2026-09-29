---
name: mesajify-design
description: >-
  Mesajify marka tasarım sistemi. Landing sayfası, uygulama paneli, onboarding,
  pazarlama materyalleri ve AI asset üretimi için Mesajify DNA'sını taşır.
  Renk, tipografi, logo kullanım kuralları, UI bileşen standartları, motion dili,
  CRO prensipleri ve AI görsel/video prompt şablonları içerir.
  Yeni bir sayfa, bileşen, kampanya görseli veya landing bölümü oluştururken
  bu skill MUTLAKA aktif edilmeli.
---

# Mesajify Design System

> **Tek cümle:** Mesajify; kontrollü, görünür, ölçülebilir bir WhatsApp Kampanya Platformudur.
> Tüm tasarım kararları bu konumlandırmayı destekler.

Bu skill'in alt dosyaları:

## Referans Haritası

| Klasör | Dosya | İçerik |
|---|---|---|
| `brand/` | `colors.md` | Renk paleti, kullanım kuralları |
| `brand/` | `typography.md` | Font sistemi, boyut skalası |
| `brand/` | `logo-rules.md` | Logo versiyonları, boşluk, yasaklar |
| `brand/` | `visual-language.md` | Genel estetik, Linear etkisi, yasaklar |
| `ui/` | `buttons.md` | CTA hiyerarşisi, durum stilleri |
| `ui/` | `cards.md` | Card anatomisi, bento grid |
| `ui/` | `forms.md` | Input, validation, hata stilleri |
| `ui/` | `navigation.md` | Navbar, sidebar, breadcrumb |
| `ui/` | `dashboard.md` | Panel layout, widget sistemi |
| `motion/` | `motion-language.md` | Mesajify motion kişiliği, easing, timing |
| `motion/` | `scroll.md` | Scroll-trigger kuralları |
| `motion/` | `micro-interactions.md` | Hover, press, success, error animasyonları |
| `marketing/` | `landing-pages.md` | Bölüm yapısı, CRO kuralları, copy sistemi |
| `marketing/` | `copywriting.md` | Onaylı sözlük, yasaklı ifadeler, ton |
| `marketing/` | `cro.md` | CTA sistemi, A/B test çerçevesi |
| `ai-assets/` | `image-prompts.md` | OmniStudio görsel prompt şablonları |
| `ai-assets/` | `video-prompts.md` | OmniStudio video prompt şablonları |
| `ai-assets/` | `product-fidelity.md` | Ürün görseli kalite standartları |

---

## Hızlı Karar Rehberi

### Yeni bir bileşen/sayfa yaparken sor:
1. Bu bileşen hangi duygusal hedefi taşıyor? → `motion/motion-language.md`
2. Hangi renkler kullanılacak? → `brand/colors.md`
3. CTA metni ne olacak? → `marketing/copywriting.md` + `marketing/cro.md`
4. Animasyon hızı/easing? → `motion/motion-language.md`
5. AI görsel gerekiyor mu? → `ai-assets/image-prompts.md`

### Blacklist (HİÇBİR ZAMAN KULLANMA):
- ~~Ban yemez~~ ~~%100 güvenli~~ ~~Spam engeli~~ ~~Tespit edilmez~~
- ~~Deneyin~~ ~~Ücretsiz deneyin~~ ~~Demo alın~~ ~~Kaydolun~~
- Dark background on landing (#0A0A0A bg) — sadece vurgu bölümlerinde
- Gradient kalabalığı — ölçülü kullan
- Framer Motion (landing'de) — CSS native kullan

### Onaylı Marka Sözlüğü:
`Akıllı Hat Yönetimi` · `Kontrollü Gönderim` · `Gönderim Görünürlüğü`
`İzin Yönetimi` · `Kara Liste` · `Liste Doğrulama`
`Ortak Gelen Kutusu` · `Kampanya Kontrol Merkezi`
`WhatsApp Kampanya Platformu`
