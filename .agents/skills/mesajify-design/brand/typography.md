# Mesajify Tipografi Sistemi

## Font Ailesi

| Rol | Font | Kaynak |
|---|---|---|
| **Display / UI** | Outfit | Google Fonts — zaten kurulu |
| **Kod / Mono** | JetBrains Mono | Google Fonts — zaten kurulu |

```css
--font-display: 'Outfit', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

## Boyut Skalası

| Token | Boyut | Ağırlık | Kullanım |
|---|---|---|---|
| `--text-display-xl` | `72px` / `4.5rem` | `600` | H1 desktop (Hero) |
| `--text-display-lg` | `56px` / `3.5rem` | `600` | H1 mobile, H2 desktop |
| `--text-display-md` | `40px` / `2.5rem` | `580` | H2 mobile, bölüm başlıkları |
| `--text-display-sm` | `28px` / `1.75rem` | `580` | H3, card başlıkları |
| `--text-xl` | `20px` / `1.25rem` | `500` | Subtitle, öne çıkan metin |
| `--text-lg` | `18px` / `1.125rem` | `400` | Body büyük |
| `--text-base` | `16px` / `1rem` | `400` | Body standart |
| `--text-sm` | `14px` / `0.875rem` | `400` | İkincil metin, etiketler |
| `--text-xs` | `12px` / `0.75rem` | `500` | Badge, caption, mono etiket |

## Font Weight Kuralları

- **H1 display:** `font-weight: 580–620` (Outfit variable font)
- **H2/H3:** `font-weight: 560–580`
- **Body:** `font-weight: 400`
- **Button:** `font-weight: 500`
- **Badge/Label:** `font-weight: 600`

## Satır Aralığı

- Display metinler: `line-height: 1.1–1.15`
- Body: `line-height: 1.6–1.7`
- UI etiketleri: `line-height: 1.2`

## Container & Layout

```css
--container-max: 1240px;   /* Ana içerik */
--container-narrow: 720px; /* Blog, FAQ, odak içerik */
--section-py: clamp(80px, 10vw, 140px);
```

## Kategori Etiketi (küçük mono)

Bölüm başlığı üstündeki küçük etiketler:
```css
font-family: var(--font-mono);
font-size: 11px;
font-weight: 500;
letter-spacing: 0.08em;
text-transform: uppercase;
color: var(--color-text-muted);
```
