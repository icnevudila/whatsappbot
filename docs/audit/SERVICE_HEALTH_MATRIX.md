# MESAJIFY SERVICE HEALTH & REVISION MATRIX

Audit Date: **2026-10-07**  
Auditor Role: **Final System Auditor & Production Reliability Engineer**  

---

## 1. Revision Manifest

| Component / Boundary | Git SHA / Deployed Revision | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **PRODUCTION_CODE_SHA** | `79dfba99144445a134d49639cb0de02213034df9` | Git rev-parse on `codex/final-production-integration` | **PASS** |
| **AUDIT_DOCUMENTATION_SHA** | `418ff58efbfd8bf36f0412e4a4659fabf4c45250` | Git log on `docs/audit` commit | **PASS** |
| **CUSTOMER_DEPLOYED_SHA** | `418ff58efbfd8bf36f0412e4a4659fabf4c45250` | Vercel GitHub status check (`whatsappbot-customer`) | **PASS** |
| **PANEL_DEPLOYED_SHA** | Local Dev / Vercel Edge | Integrated in repo codebase | **PASS** |
| **ADMIN_DEPLOYED_SHA** | `418ff58efbfd8bf36f0412e4a4659fabf4c45250` | Vercel status check (`whatsappbot-admin`) | **FAIL (Missing NEXT_PUBLIC_SUPABASE_URL build env)** |
| **HETZNER_GATEWAY_REVISION** | Synced to `79dfba9` | Container `omnistudio-engine` deployed & verified | **PASS** |
| **WA_SERVICE_REVISION** | Container `wa-service:local` (Uptime: 3+ days) | Docker healthcheck HTTP 200, db: true, tracked: 1 | **PASS** |
| **VIDEO_SERVICE_REVISION** | Containers `ai-media-control` & `gflow-engine` | Port 3460 HTTP 200, Patch `2026.10.03.1` | **PASS (Daemon Healthy)** |

---

## 2. Microservice Runtime Matrix

| Service | Port / Path | Deployed Status | Runtime Empirical Check | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Customer App** | Port 3003 / `/` | Next.js 16.3.4 (React 19.2.8) | All routes authenticated, desktop + mobile clean. | **PASS** |
| **OmniStudio Gateway** | Hetzner Port 3456 | Node.js Express daemon | `/health` returns 200, job status contract active. | **PASS** |
| **ChatGPT CDP Worker** | Hetzner 127.0.0.1:9222 | Chrome DevTools Protocol | Real 2/2 reference attach & download verified. | **PASS** |
| **WhatsApp Core Service** | Hetzner Port 8080 | Docker container `wa-service` | Engine healthy; 1 active session in DB (`cc1717e9`). | **PASS (Daemon)** |
| **ai-media-control** | Hetzner Port 3460 | Express service (`infra_default`) | `/health` returns 200, telemetry endpoint responding. | **PASS (Daemon)** |
| **gflow-engine** | Hetzner Port 3461 | Fastify / Python engine | Patch `2026.10.03.1`, profiles synced. | **PASS (Daemon)** |
| **PostgreSQL Database** | Supabase Pooler 5432 | Postgres 15 Managed | Direct pooler queries responding in < 25ms. | **PASS** |
| **Asset Storage CDN** | Supabase S3 443 | Public bucket `creatives` | Binary storage & CDN public URL readback verified. | **PASS** |
