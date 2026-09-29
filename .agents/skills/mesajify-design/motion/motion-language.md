# Mesajify Motion Dili

## Motion Personality: PREMIUM

LottieFiles motion-design-skill'den seçilen archetype:

| Özellik | Değer |
|---|---|
| **Archetype** | Premium |
| **Duration palette** | `250ms` (hızlı) / `400ms` (standart) / `600ms` (dramatik) |
| **Signature easing** | `cubic-bezier(0.4, 0, 0.2, 1)` |
| **Entrance easing** | `cubic-bezier(0.05, 0.7, 0.1, 1)` (MD3 Emphasized) |
| **Exit easing** | `cubic-bezier(0.3, 0, 1, 1)` (MD3 Accelerate) |
| **Overshoot** | `0%` (premium, sıfır bounce) |
| **Ambient** | Evet — arka plan hafif pulse/breathe |

## CSS Değişkenleri

```css
:root {
  /* Duration */
  --motion-quick: 250ms;
  --motion-standard: 400ms;
  --motion-dramatic: 600ms;

  /* Easing */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-enter: cubic-bezier(0.05, 0.7, 0.1, 1);
  --ease-exit: cubic-bezier(0.3, 0, 1, 1);
  --ease-sine: cubic-bezier(0.37, 0, 0.63, 1);
}
```

## Bölüm Bazlı Animasyonlar

### Hero Section
- H1: `translateY(24px) opacity(0) → translateY(0) opacity(1)`, `600ms`, `--ease-enter`
- Sub başlık: `400ms` delay `200ms`
- CTA butonlar: `400ms` delay `400ms`
- Telefon simülatörü: `scale(0.95) opacity(0) → scale(1) opacity(1)`, `700ms` delay `300ms`

### Card Girişi (Scroll Trigger)
```css
/* Başlangıç */
transform: translateY(20px);
opacity: 0;

/* Bitiş */
transform: translateY(0);
opacity: 1;
transition: transform 400ms var(--ease-enter),
            opacity 400ms var(--ease-enter);
```

### Bento Grid Stagger
- Card 1: delay `0ms`
- Card 2: delay `80ms`
- Card 3: delay `160ms`
- Card 4: delay `240ms`
- Toplam budget: `< 400ms` (Premium archetype kuralı)

### Telefon Simülatörü Mesaj Animasyonu
```
0s    → Video başlar (autoplay muted loop)
3s    → Müşteri mesajı gelir: translateX(20px)→0, opacity 0→1, 300ms
4.5s  → Mesajify bildirim popup: scale(0.9)→1, opacity 0→1, 250ms
```

### Sekme Değişimi (Sector Lab)
- İçerik çıkışı: `opacity 1→0`, `150ms`, `--ease-exit`
- İçerik girişi: `opacity 0→1 + translateY(8px→0)`, `300ms`, `--ease-enter`

## Hover Kuralları

```css
/* Card hover */
transition: border-color 150ms var(--ease-standard),
            box-shadow 150ms var(--ease-standard);

/* Button hover */
transition: background 100ms var(--ease-standard),
            transform 100ms var(--ease-standard);

/* Button active/press */
transform: scale(0.98);
transition: transform 80ms var(--ease-standard);
```

## Scroll Trigger Kuralları

- `IntersectionObserver` threshold: `0.15`
- Once: true (tekrar tetiklenmez)
- `prefers-reduced-motion: reduce` → tüm animasyonlar devre dışı
