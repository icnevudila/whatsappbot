# Filo tasarım dili (Pilot Cobalt × Filo domain)

Status: active  
Kaynak: `pilot-ui` marketing (graphite hero + color planes) + product shell (PageHead → panel/table).  
Shopify/katalog kopyalanmaz.

## Kavram

**Marketing:** graphite first viewport + paper/soft/ink planes.  
**Product:** dense workbench rail, Cobalt CTA, soft paper chrome.  
**Auth:** 50/50 graphite aside + rounded form card.

## Tokenlar

| Rol | Değer |
|-----|--------|
| Paper / canvas | `#f3f5f9` |
| Surface | `#ffffff` |
| Accent CTA | `#2f5bff` |
| Nav active soft | `#e8edff` / border `#c5d0f5` |
| Hero void | `#0c0e16` |
| Hero signal (accent text) | `#9db8f5` / amber `#ff8c42` |
| WA bağlı | `#25d366` |
| Radius | 8px / 6px |
| Shadow | soft `0 2px 8px` |
| Font | Outfit + JetBrains Mono |

## Reçete

1. Landing: graphite hero split + section kickers + plane backgrounds.
2. Auth: AuthShell split.
3. Panel: grouped rail + PageHeader strip + denser Cards; inbox SplitPane.
4. Empty: dashed panel.

## Anti-pattern

Hard neo-brutal lime/red CTA, purple glow, Shopify trust rail as Filo identity.
