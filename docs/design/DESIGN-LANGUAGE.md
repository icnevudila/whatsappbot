# Filo tasarım dili (Messora Cobalt)

Status: active  
Kaynak: `pilot-ui` Messora Cobalt — ekran kopyası değil, **tasarım dili**.  
Referans: `C:/Users/TP2/Documents/chatbot/pilot-ui/docs/design/DESIGN-LANGUAGE.md` + `tokens.css`

## Kavram

**Soğuk mühendislik kağıdı + tek elektrik kobalt aksan.**  
Filo WhatsApp hat / kampanya workbench’i: yoğun ürün yüzeyi, sakin sınırlar, kobalt birincil aksiyon. WhatsApp yeşili yalnızca “bağlı / WA kanal” anlamında.

## Tokenlar (ürün)

| Rol | Filo token | Değer |
|-----|------------|--------|
| Paper | `--color-canvas` | `#f3f5f9` |
| Paper 2 | `--color-canvas-alt` | `#e8ecf3` |
| Surface | `--color-surface` | `#ffffff` |
| Raised | `--color-surface-raised` | `#eef1f7` |
| Ink | `--color-ink` | `#161925` |
| Ink soft | `--color-ink-soft` | `#2f3444` |
| Muted | `--color-ink-muted` | `#646b7c` |
| Line | `--color-hairline` | `#d5dae6` |
| Accent | `--color-accent` | `#2f5bff` |
| Accent dim | `--color-accent-dim` | `#1e3fcc` |
| Accent soft | `--color-accent-soft` | `#e8edff` |
| WA / bağlı | `--color-ok` | `#25d366` |
| Semantic success | `--color-success` | `#127a52` |
| Warn | `--color-warn` | `#a15c00` |
| Danger | `--color-danger` | `#b42318` |
| Radius | `--radius-card` / sm | `10px` / `6px` |
| Ease | `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| Font | Outfit + JetBrains Mono | |

## Ürün UI kuralları

1. Birincil CTA = kobalt (`accent`); WA yeşili CTA değil.
2. Yoğun worksurface; kart gölgesi hafif; dekoratif gradyan yok.
3. Empty / loading / error durumları kritik listelerde zorunlu.
4. Motion: kısa fade/slide; `prefers-reduced-motion` saygı.
5. Anti-pattern: mor/indigo glow, teal kimlik, krem+terracotta serif, broadsheet yoğunluk.

## Uygulama

- Tokenlar: `apps/{panel,dashboard,admin}/src/app/globals.css`
- Primitives: `apps/*/src/components/ui.tsx`
- Bu dosya token/tez değişince aynı PR’da güncellenir.
