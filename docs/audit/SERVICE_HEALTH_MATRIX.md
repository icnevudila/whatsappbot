# MESAJIFY SERVICE HEALTH & REVISION MATRIX

Date of Audit: **2026-10-06**  
Auditor Role: **Final System Auditor & Production Reliability Engineer**  
Active Git Branch: `codex/final-production-integration`  
Git HEAD SHA: `79dfba99144445a134d49639cb0de02213034df9`  

---

| Service Name | Host / Platform | Port / Path | Deployed Revision | Observed Health Status | Empirical Verification Notes | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer App** | Local Dev / Vercel Edge | `3003` / `/` | `79dfba9` (clean) | HTTP 200 OK | Next.js 14 running healthy; authenticated sessions, CSR/SSR rendering intact. | **PASS** |
| **Panel App** | Vercel Edge | `/panel` | `79dfba9` | HTTP 200 OK | Realtime listener & multi-line agent conversation routes operational. | **PASS** |
| **OmniStudio Gateway** | Hetzner Cloud (`167.233.201.31`) | `3456` / `/health` | `79dfba9` | HTTP 200 OK (`{"status":"ok"}`) | Upstream proxy, memory job queue, upload endpoint, and status queries healthy. | **PASS** |
| **ChatGPT CDP Worker** | Hetzner Cloud (`167.233.201.31`) | `127.0.0.1:9222` | `79dfba9` | Active & Connected | Chrome CDP worker attached to ChatGPT session. Reference attachment, cleanup, and download functional. | **PASS** |
| **WhatsApp Core Service** | Hetzner Cloud (`167.233.201.31`) | `8080` (Docker) | Container `wa-service` | Healthy / Running | Docker container uptime > 14 hours. Baileys multi-device socket management running. | **PASS** |
| **PostgreSQL Database** | Supabase AWS Cloud | `5432` / Pooler | Managed Postgres 15 | Connected | Direct pooler queries responding in < 25ms. RLS policies active and enforcing isolation. | **PASS** |
| **Asset Storage** | Supabase S3 CDN | `443` / `creatives` | AWS Tokyo S3 | Operational | Bucket `creatives` publicly serving generated PNG/MP4 assets with valid content-types. | **PASS** |
| **Video Production Engine** | Local / Hetzner Workers | CLI / Worker | `79dfba9` | Ready | Google Flow automation & PostPro ffmpeg pipeline operational. | **PASS** |

---

## Service Reliability Parameters
- **Auto-restart Policy:** Gateway daemon and CDP worker running under `systemd` / daemon supervisors with restart on unexpected termination.
- **Fail-Closed Thresholds:** Enforced on image reference verification (`assertReferenceCount` matches expected = 2).
- **Graceful Observation Reconnect:** CDP observation loop wrapped with `globalThis.fetch` to ensure uninterrupted stream monitoring during transient WebSocket interruptions.
