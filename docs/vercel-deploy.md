# Vercel: panel + dashboard + admin

Monorepo. Worker Docker/VPS’te kalır. Asıl müşteri ürünü: **panel**.

## Projeler

| Vercel proje | Root Directory | Env (özet) |
|--------------|----------------|------------|
| Panel | `apps/panel` | Supabase public + `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, Stripe (`STRIPE_*`) |
| `filo-dashboard` | `apps/dashboard` | Supabase public, `NEXT_PUBLIC_PANEL_URL` |
| `filo-admin` | `apps/admin` | Supabase public (+ service role davet için önerilir) |

Detaylı satış checklist: [`SELLABLE-GO-LIVE.md`](./SELLABLE-GO-LIVE.md).

## Panel Stripe checklist

```
STRIPE_SECRET_KEY=
STRIPE_PRICE_STARTER=   # veya STRIPE_PRICE_ID
STRIPE_PRICE_PRO=
STRIPE_PRICE_ENTERPRISE=
STRIPE_WEBHOOK_SECRET=
# Webhook URL: https://PANEL_DOMAIN/api/billing/webhook
# Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
```

`STRIPE_DEFAULT_ORG_ID` kullanmayın.

## Platform admin

Supabase → Auth → User → App Metadata:

```json
{ "platform_admin": true }
```

## Notlar

- Panel self-serve: `create_organization` (max 3 owner org, free kota).
- Davet: `org_invites` + Auth `inviteUserByEmail` → `/davet/{token}`.
- Monorepo install: kökten `npm ci` (`@wa/shared`).
