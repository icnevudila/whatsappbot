# Filo canlı smoke checklist

**Cuma müşteri yolu = Admin provision** (panel self-signup kapalı).

## Önkoşul

- [ ] Vercel: Supabase + `NEXT_PUBLIC_SITE_URL` + Stripe Price/Webhook + `NEXT_PUBLIC_LEGAL_ENTITY_NAME`
- [ ] Auth: e-posta confirm + leaked password + Redirect Allow List `/auth/callback`
- [ ] Worker ayakta (`/durum` → Bağlı)
- [ ] Admin: `platform_admin` + `NEXT_PUBLIC_PANEL_URL`

## Akış

1. **Provision** — Admin’den müşteri e-posta + işletme → invite mail
2. **Giriş** — `/auth/callback` → `/kurulum` → marka + hat bağla
3. **Gönderim** — `/hizli-gonderim` → toast + `/gidenler` / kampanya detay
4. **Gelen** — test yanıtı → `/gelenler` canlı + toast
5. **Kota** — (test) kota düşük → gate hata
6. **Upgrade** — Stripe Checkout → webhook plan/kota; askı kalkar
7. **past_due** — (test) unpaid → askı banner + gönderim kesilir
8. **Davet** — üye e-posta → `/davet/{token}` kabul
9. **Suspend** — admin askı → claim/gönderim yok

## Hızlı HTTP (oturumsuz)

```bash
curl -sI https://YOUR-DOMAIN/ | head -1
curl -sI https://YOUR-DOMAIN/kvkk | head -1
curl -sI https://YOUR-DOMAIN/kosullar | head -1
curl -sI https://YOUR-DOMAIN/giris | head -1
```
