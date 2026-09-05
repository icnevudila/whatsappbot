# Filo tasarım dili (Pilot workbench × Cobalt)

Status: active  
Kaynak: `pilot-ui` product shell + Messora Cobalt tokens.  
**Ekran klonu değil:** Shopify/katalog/omnichannel yok. Filo domain: hat, kampanya, gelen/giden.

Referans: `C:/Users/TP2/Documents/chatbot/pilot-ui/app/app/product.css` + `docs/design/DESIGN-LANGUAGE.md`

## Kavram

**Pilot workbench layout + Filo Cobalt brand.**  
Dense rail, grouped nav, full-bleed worksurface, hard-offset shadows, lime active nav. Primary CTA stays cobalt (`#2f5bff`). WhatsApp green only for “bağlı / sent”.

## Tokenlar (ürün)

| Rol | Filo token | Değer |
|-----|------------|--------|
| Paper | `--color-canvas` | `#f3f5f9` |
| Paper 2 | `--color-canvas-alt` | `#e8ecf3` |
| Surface | `--color-surface` | `#ffffff` |
| Ink | `--color-ink` | `#161925` |
| Muted | `--color-ink-muted` | `#646b7c` |
| Line | `--color-hairline` | `#d5dae6` |
| Accent CTA | `--color-accent` | `#2f5bff` |
| Nav active | `--color-nav-active` | `#c5d0f5` |
| WA / bağlı | `--color-ok` | `#25d366` |
| Success | `--color-success` | `#127a52` |
| Radius | card / sm | `6px` / `4px` |
| Shadow | hard offset | `2px 2px 0` ink |
| Font | Outfit + JetBrains Mono | |

## Ürün kabuğu

1. Rail 248px, grouped: Operasyon / Gelen-giden / İzleme / Sistem.
2. Topbar 52px; main max ~1280, no `max-w-5xl` marketing column.
3. `PageHeader` = border-bottom title strip (`.wb-page-head`).
4. Inbox = `SplitPane` list+detail; active row inset ink bar.
5. Empty = dashed panel (`.wb-empty`), not illustration.
6. Filter chips: ink fill when on (not soft accent pill).

## Anti-pattern

- Soft multi-layer SaaS shadows, purple glow, cream+serif
- Cobalt-only paint without layout change
- Copying Pilot Shopify/catalog IA into Filo

## Change control

Token or shell thesis changes update this file in the same PR.
