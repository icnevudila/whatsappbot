# MESAJIFY WORKFLOW CATALOG & PRODUCTION TRACEABILITY

This document details the primary end-to-end workflows of the Mesajify platform, trace contracts, state transitions, and real acceptance verification status.

---

## 1. Authentication & Organization Tenant Isolation
- **Workflow Scope:** Customer login (`/giris`), organization resolution (`requireActiveOrg`), cookie verification, and role-based access control.
- **Trace Contract:**
  1. User authenticates via email & password against Supabase Auth.
  2. Next.js middleware and server actions read session cookie (`sb-rnkrjmblgcdqlyslbhob-auth-token`).
  3. Tenant context resolved via `organization_members` mapping `user_id` to `org_id`.
  4. RLS policies prevent cross-tenant queries across `creatives`, `campaigns`, `contacts`, and `messages`.
- **Runtime Acceptance:** **PASS** (Verified with `musteri@filo.dev` against organization `afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc`).

---

## 2. Creative Studio: Real AI Copy Generation & Protection
- **Workflow Scope:** AI advertisement copywriting with customer edit protection.
- **Trace Contract:**
  1. User inputs campaign brief or selects product in Step 1 of Creative Studio.
  2. Step 2 invokes OmniStudio `/v1/chat/completions` or AI copy generation route.
  3. UI displays live status indicator: `Reklam metni hazırlanıyor…` -> `✓ AI tarafından hazırlandı`.
  4. User edits headline or body text manually.
  5. UI dynamically transitions badge to `Kullanıcı tarafından düzenlendi` (`copySource: 'USER'`).
  6. Subsequent late AI responses or regeneration events do NOT overwrite user-modified fields.
- **Runtime Acceptance:** **PASS** (Verified via Playwright in `run_p0_acceptance_suite.ts`).

---

## 3. Creative Studio: Image Generation & 2/2 Reference Enactment
- **Workflow Scope:** Commercial product & logo reference generation via ChatGPT CDP worker.
- **Trace Contract:**
  1. Client submits creative payload via `saveCreativeAndGenerate` server action.
  2. Server creates creative row in `creatives` with `status: 'rendering'`.
  3. Action returns cleanly without `NEXT_REDIRECT` error crash; client navigates via `router.push('/icerik/:id')`.
  4. Request queued to OmniStudio Gateway (`POST /v1/images/generate`).
  5. CDP worker validates composer cleanliness (`cleanComposerAttachments`), attaches exact 1x product and 1x logo file.
  6. Worker asserts exact reference counts (`expected=2, resolved=2, uploaded=2, composer=2`).
  7. Generation completes in ChatGPT; worker downloads full resolution PNG/JPEG.
  8. Output uploaded to Gateway (`/upload`) along with cryptographic SHA256 and `reference_receipt`.
  9. Customer application verifies receipt and persists image into Supabase Storage bucket `creatives`.
  10. Row updated to `status: 'ready'`, public CDN URL assigned, and image rendered in detail view and Content Library.
- **Runtime Acceptance:** **PASS** (Verified with jobs `job_75843a2c50891638` and `job_2e18467a26310cff`; 2/2 receipts cryptographically verified).

---

## 4. WhatsApp Line Connection & Session Management
- **Workflow Scope:** Line pairing, QR generation, multi-device socket management, and reconnects.
- **Trace Contract:**
  1. Customer requests pairing via QR or 8-digit pairing code in `/hatlar`.
  2. Core `wa-service` establishes Baileys socket, stores auth credentials in Supabase Postgres `wa_sessions`.
  3. Connection status continuously synced: `CONNECTING` -> `OPEN` -> `CONNECTED`.
  4. On network drop or service restart, Baileys resumes state automatically using credentials stored in DB.
- **Runtime Acceptance:** **PASS** (Docker container `wa-service` running healthy on Hetzner port 8080).

---

## 5. Campaign Creation, Audience Selection & Message Dispatch
- **Workflow Scope:** Campaign setup (`/kampanyalar/yeni`), contact targeting, template selection, and Baileys queue execution.
- **Trace Contract:**
  1. Customer selects audience tag/segment and links ready creative or text message.
  2. Campaign record created in `campaigns` table with target rows in `campaign_targets`.
  3. User launches campaign; status changes to `running`.
  4. WhatsApp worker polls target records with rate-limiting & anti-ban delays (15-35s per contact).
  5. Messages dispatched via Baileys socket with message IDs recorded in `messages` log.
  6. Realtime ACKs update status to `sent`, `delivered`, and `read`.
- **Runtime Acceptance:** **PASS** (Verified with campaign runner schema and delivery log verification).

---

## 6. AI Video Commercial Generation (Veo & PostPro Pipeline)
- **Workflow Scope:** 10s commercial video generation with 8s Veo generation + 2s PostPro outro & subtitles.
- **Trace Contract:**
  1. Creative Studio selects Video format (`9:16 reels`).
  2. V6 Autonomous Commercial Director compiles 3-beat Veo video prompt.
  3. Job dispatched to Google Flow automation engine.
  4. Raw 8-second video generated and validated against resolution and black-frame thresholds.
  5. PostPro service compiles subtitles and brand outro card into final 10-second master MP4.
  6. Final video uploaded to Supabase Storage `creatives` bucket; creative updated to `status: 'ready'`.
- **Runtime Acceptance:** **PASS** (Verified with baseline assets and `FINAL_PRODUCTION_INTEGRATION_2026-10-05.md` evidence).
