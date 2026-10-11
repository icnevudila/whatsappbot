# Service architecture audit

> 2026-10-11 — INITIAL AUDIT, INTEGRATED ACCEPTANCE PENDING. Source baseline 5e79320b86298d472508275c1538beabedea9ebb. Production reads and isolated tests are separate evidence classes. No production restart, deployment, payment or message sending. Wizard/library owned by another bot; those files are untouched.


## Live container inventory

| Service | Actual image | Health | Restart policy | Memory cap | Log cap |
|---|---|---|---|---|---|
| wa-service | wa-service:chat-auth-20261010 | healthy | unless-stopped | 6144 MiB | 10m |
| ai-media-control | infra-ai-media-control:outro-logo-1fc79bf | healthy | unless-stopped | 1024 MiB | 10m |
| gflow-engine | infra-gflow-engine:integration-diagnostics-9f74b72 | healthy | unless-stopped | 4096 MiB | 10m |
| omnistudio-engine | docker-omnistudio-worker | NO DOCKER HEALTHCHECK | unless-stopped | UNBOUNDED | UNBOUNDED |
| hetzner-caddy | caddy:alpine | NO DOCKER HEALTHCHECK | unless-stopped | UNBOUNDED | UNBOUNDED |

## Responsibility and dependency map

| Component | Responsibility/location | Dependencies | Health / capacity / critical risk |
|---|---|---|---|
| Customer | Next.js, Vercel; app.mesajify.com | Supabase Auth/DB/Storage, Gateway via server/WA jobs | Live authenticated dashboard/settings opened; full new-customer E2E pending |
| Admin | Vercel project whatsappbot-admin | Supabase service role + platform admin | Production deployment READY observed in partial listing; active alias acceptance pending |
| Panel | apps/panel, legacy app | Auth/DB/WA queue | No separate project in repository-filtered team listing; routing/decommissioning not proven |
| Landing | Vercel mesajify-landing | Customer registration, static media | READY listed; signup/empty-tenant journey pending |
| PostgreSQL | Supabase managed PostgreSQL 17.6 | Pooler, RLS, migrations | 30/60 connections in a snapshot; not peak load |
| Storage | Supabase buckets and Gateway outputs | Org asset ownership, upload completion | DB backup does not establish binary-media restoration |
| wa-service | VPS WhatsApp sessions, jobs/campaign runner | PostgreSQL, Baileys, Gateway text/media | /ready ready=true, 1 live line; configured maximum 50 is not tested capacity |
| ai-media-control | VPS durable video orchestration | PostgreSQL, gflow, Gateway, ffprobe | Healthy, persistent workspaces mounted; fresh complete-video acceptance pending |
| gflow-engine | VPS Google Flow/Veo transport | Account leasing, browser profiles, provider quota | Healthy; profile/account readiness under load not established |
| OmniStudio | VPS Gateway + browser workers | ChatGPT, Flow supervisor, queue disk | Health ready=true; only one registered idle worker observed, not four available workers |
| Caddy | VPS reverse proxy/media | Containers and output mounts | No Docker healthcheck; authenticated edge exposure audit pending |
| Background work | WA polling/campaign ticks, Gateway queue/supervisor | DB leases, persisted receipts | Retry/idempotency paths tested locally; full staging faults pending |

## Release divergence

Main 5e79320b86298d472508275c1538beabedea9ebb; active Customer bb28a21b65b89d7af0c50cb3387797e4fa22a1af from test/mesajify-full-e2e-v1; server checkout baseline 5556310 does not describe patched container sources. Source hashes and image IDs in runtime inventory are the deploy evidence. Main cannot be treated as the exact customer runtime. Other bot completion and a frozen candidate revision are required before integrated acceptance.

## Observed risks

OmniStudio has no cgroup memory limit, no Docker healthcheck and unlimited json-file logs. WA cap 6 GiB and Flow cap 4 GiB exceed this host's physical 3.72 GiB individually; caps are not reserved memory. Independent idle samples showed ~1.8 GiB OmniStudio use. Do not raise generation concurrency from these settings alone. No unused service was stopped; no orphan process was killed.

## Evidence and reproduction

- [Runtime inventory](evidence/runtime-inventory.json), captured 2026-10-11T08:58:53.169531+00:00; sanitized, read-only SSH and one aggregate database query.
- [Vercel manifest](evidence/vercel-manifest.json); deployment lists were partial, active customer alias separately resolved.
- [Queue measurements](evidence/queue-load.json); actual queue class bodies, filesystem persistence, synthetic providers.
- Commands: `py scripts/sales-readiness-runtime.py`, `node scripts/sales-readiness-queue-load.cjs`.
- Test logs retain initial failures as well as corrected runs.
