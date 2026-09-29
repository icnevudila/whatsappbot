# Mesajify Renk Paleti

## Ana Renkler

| Token | Hex | Kullanım |
|---|---|---|
| `--color-bg` | `#FFFFFF` | Sayfa arka planı |
| `--color-bg-subtle` | `#FAFAFA` | Section arka planı (alternatif) |
| `--color-text` | `#0A0A0A` | Ana metin, başlıklar |
| `--color-text-muted` | `#6B7280` | İkincil metin, açıklamalar |
| `--color-border` | `rgba(0,0,0,0.08)` | Tüm kenar çizgileri |
| `--color-accent` | `#2f5bff` | Kobalt — link, badge, vurgu |
| `--color-green` | `#25D366` | WhatsApp yeşili — sadece mesajlaşma UI'ında |
| `--color-green-subtle` | `#F0FDF4` | Yeşil arka plan (badge, durum) |
| `--color-dark` | `#0A0A0A` | Koyu bölüm arka planı (güven/kontrol section) |
| `--color-dark-text` | `#FAFAFA` | Koyu bölümde metin |

## Gradient Kuralları

- Landing'de gereksiz gradient **YASAK**
- İzin verilen tek gradient: Logo'nun kendi yeşil gradyanı
- CTA buton: **Düz renk** (`#0A0A0A` primary, `#2f5bff` secondary)

## Dark Section (sadece Kontrol/Güven bölümü)

```css
background: #0A0A0A;
color: #FAFAFA;
border: none;
```

## WhatsApp Yeşili Kullanım Kuralları

✅ İzinli:
- Telefon simülatöründe mesaj balonu arka planı
- Çevrimiçi/aktif durum indikatörü
- WhatsApp ikonu yanında

❌ Yasak:
- Ana CTA butonu olarak
- Başlık rengi olarak
- Genel vurgu rengi olarak (bu kobalt `#2f5bff`'in rolü)
