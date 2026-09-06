# Filo satışa hazırlık (SELLABLE GO-LIVE)

**Cuma müşteri satışı:** kod + migration’lar hazır. Aşağıdaki **ops** maddeleri prod’da elle doğrulanmalı.

Satış modeli (şu anki kod): **Admin provision** (müşteri hesabı Filo açar) + isteğe bağlı org daveti. Panel self-signup kapalı (`destek@filo.app`).

## 0) Cuma öncesi zorunlu (P0)

Kod (bu repoda uygulandı):

- [x] Davet / admin provision → `/auth/callback` (PKCE)
- [x] `message_log` Realtime publication
- [x] Checkout yalnız env price (istemci `priceId` yok)
- [x] `past_due` / `unpaid` → org askı; ödeme gelince askı kalkar
- [x] `enqueueJob` kota/askı gate (`message.send`, `campaign.start|resume`)
- [x] Askı bandı panel layout

Ops (sen / Dashboard):

- [ ] Vercel Production: Stripe `STRIPE_SECRET_KEY` + `STRIPE_PRICE_STARTER` (+ Pro) + `STRIPE_WEBHOOK_SECRET`
- [ ] Stripe webhook → `https://whatsappbot-ten-omega.vercel.app/api/billing/webhook` (3 event) + Customer Portal açık
- [x] `NEXT_PUBLIC_SITE_URL` = `https://whatsappbot-ten-omega.vercel.app` (Vercel Production/Preview/Development)
- [ ] Supabase Auth: Confirm email + Leaked password + Redirect Allow List `/auth/callback` (+ Pro PITR)
- [x] `NEXT_PUBLIC_LEGAL_ENTITY_NAME` = `Filo Yazılım A.Ş.` (Vercel; şirket ünvanı farklıysa söyle)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` panel + admin
- [ ] Admin kullanıcı `app_metadata.platform_admin=true`
- [ ] Hetzner worker ayakta (`/durum` → Bağlı)
- Self-signup: **kapalı kalsın** (admin provision modeli) — açma

## 1) Ortam (Vercel panel Production)

Zorunlu:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (panel kanonik URL; davet + Stripe return)
- `SUPABASE_SERVICE_ROLE_KEY` (davet + Stripe webhook)
- `NEXT_PUBLIC_LEGAL_ENTITY_NAME`

Stripe:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_STARTER` (veya `STRIPE_PRICE_ID` fallback)
- `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ENTERPRISE` (opsiyonel)
- `STRIPE_WEBHOOK_SECRET`
- Webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Customer Portal’ı Stripe Dashboard’da etkinleştirin

**Kullanmayın:** `STRIPE_DEFAULT_ORG_ID`

Admin:

- `apps/admin` → `NEXT_PUBLIC_PANEL_URL` + service role
- kullanıcı `app_metadata.platform_admin=true`

Worker (Hetzner):

- `DATABASE_URL`, `WORKER_ID`, `MAX_SESSIONS`, … (`apps/wa-service/.env.example`)

## 2) Auth / güvenlik (Dashboard — MCP ile açılamaz)

Proje: [Auth settings](https://supabase.com/dashboard/project/rnkrjmblgcdqlyslbhob/auth/providers)

- [ ] **Confirm email** açık (`mailer_autoconfirm` kapalı)
- [ ] **Leaked password protection** (HaveIBeenPwned) açık
- [ ] **PITR / backups**: Database → Backups (Pro plan gerekir)
- [ ] Redirect URLs: `https://YOUR-PANEL/auth/callback`

Yerel `supabase/config.toml`: `enable_confirmations = true`, min şifre 8.

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/rnkrjmblgcdqlyslbhob/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mailer_autoconfirm":false,"password_hibp_enabled":true}'
```

## 3) Cuma smoke (müşteri yolu)

1. Admin → müşteri e-posta + işletme provision → invite mail
2. Müşteri `/auth/callback` → `/kurulum` → hat bağla
3. Hızlı gönderim → `/gidenler` + toast
4. (Opsiyonel) Stripe Checkout starter → kota yükselir
5. Davet ikinci üye → kabul
6. Admin askıya al → gönderim kesilir; banner görünür

Detay: [`docs/SMOKE.md`](SMOKE.md)

## 4) Yasal

- [x] `NEXT_PUBLIC_LEGAL_ENTITY_NAME` = `Filo Yazılım A.Ş.` (Vercel’e yazıldı; resmi ünvan farklıysa güncelle)
- [x] `/kvkk` ve `/kosullar` ünvanı env’den
- [ ] Destek: `destek@filo.app` (posta kutusu canlı mı doğrula)

## 5) Bilinçli sınırlar (sonraki sprint)

- Self-serve panel signup (şu an kapalı — bilerek)
- MFA / SSO
- Dağıtık rate limit
- Audit log / DPA

## Referans migration’lar

- `20260906160000_saas_sellable_hardening.sql`
- `20260906170000_stripe_apply_clear_subscription.sql`
- `20260906180000_admin_overview_suspended.sql`
- `20260906190000_vt_schema_hardening.sql`
- `20260906195000_member_rbac_admin_writes.sql`
- `20260906200000_message_log_realtime.sql`
