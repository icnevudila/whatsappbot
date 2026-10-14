# AI system inventory — 2026-10-14

Baseline verified by `git ls-remote origin`: simulation/v2-and-veo-integration =
7a4d7f81a3488cd2cbacfe3352ea979889988fef. Audit branch: audit/full-ai-production-hardening.
Remote main: 3e7d5bb4085522d13b83335683f71dfdf65d0975;
Creative Studio branch: b59ebf4d9d5a07b694eba991ef628e82f882fa72;
Veo quality branch: 1f9bb46b9399512a49f4dfa71cf40a5f8ed295af.
The user subsequently authorized necessary sequential real AI media acceptance calls. Remote mutation, deployment, migrations and live service intervention remain forbidden.

| Component | Entry / caller | Outputs / provider | Initial risk / verification |
|---|---|---|---|
| Customer AI text | api/icerik/fikir, api/mesajlar/ai-suggest, lib/ai/campaign-message | OmniStudio chat | Tenant facts, authentication, invented commercial claims |
| Creative Studio V2 | lib/creative/v2, app/actions, api/icerik/render | Gateway image worker, creative records, Storage | SKU/parent lineage, references, duplicate generation, delivery |
| Customer video | api/ai-media/jobs → lib/creative/video-job-service | ai_media_jobs / assets / events | Quota race, owned assets, locked revision, idempotency |
| AI media control | services/ai-media-control/src/index.ts | Supabase jobs → creative-video-orchestrator | Lease/recovery, uncertain submit, callback identity |
| Video orchestrator | services/creative-video-orchestrator/src | Provider adapters, validation and finishing | Reference/RAW/final identity, audio/outro acceptance |
| OmniStudio Gateway | services/omnistudio/gateway/server.js | Image/text queues, VideoJobQueue, durable private state | P0: production/status routes lack common auth; hardcoded token fallback; simulator default defeats distributed fail-closed |
| Browser workers | gateway/cdp_worker.js, browser_worker_supervisor.js | ChatGPT browser / account leases | Submission uncertainty, output ownership, restart, reference receipt |
| Flow | services/gflow-engine | Flow project/workflow → download/progress journal | Invocation identity, stale output, provider failure classification |
| Monitoring | customer/api/canli-takip/* | Gateway / jobs / account telemetry | Admin boundary, cross-tenant operational data |
| Data | supabase/migrations, Storage callers | Tenant records and media | RLS, public object policy, transactional quota and cost truth |
| Panel / bot consumers | apps/panel, apps/wa-service and shared AI clients | Replies / campaign media | Wrong-tenant knowledge, Gateway credential compatibility |

Repository wiring is not proof these services run at this commit in production.
Existing WIZARD_FINAL_PRODUCTION_READINESS.md is an untracked Oct 10 report for
496ed0d, not independently attributable to the requested integration SHA.
Tracked docs/MASTER_FINAL_STABILIZATION_2026-10-13.md explicitly retains incomplete
provider acceptance. Neither historical GO nor old authorization expands this run's scope.

Priority: reproduce/fix Gateway anonymous production and receipt access first; then
worker/tenant output identity, consumption/idempotency, customer regressions, isolated
load and browser UI. Paid output quality and live DB policy claims remain unverified
unless independently evidenced under the current authorization.
