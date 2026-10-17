# Wizard concurrent E2E

Date: 17 October 2026 (Europe/Istanbul). Evidence: `../../artifacts/ai-media-queue-2026-10-17/`.
Local baseline/origin main: `35ceff0097f365acb6660fd07681a273f07d6910`.
Live checkout: `5556310def2d851158668f4b71bdf635fc6d1fae`, with 364 dirty entries when sampled.
Live Git SHA does not identify all deployed code. The initial simulation phase performed no production deploy, migration, restart or paid generation.
PASS below always names its local/mock scope; it never implies real-provider or customer acceptance.


**NOT TESTED — stage gate not satisfied.** This run did not operate a real customer Wizard or submit production browser requests. Gateway-only fixtures do not establish full-stack staging acceptance. Existing unresolved paid identities, live source drift and missing cost attribution prevent advancement to real provider and customer-delivery acceptance.

| Customer scenario | Current evidence |
|---|---|
| Login / company / product / Wizard options | NOT TESTED browser |
| Image + video submission across three organizations | PASS Gateway fixture only; NOT TESTED Wizard |
| Actual variation / revision UI | NOT TESTED; mixed fixture labels are not these APIs |
| Queue status / no fabricated estimate | Local API regression PASS; browser display NOT TESTED |
| Refresh / navigate away and back | NOT TESTED |
| Completion notification / preview / download | NOT TESTED |
| Error / retry / cancellation | Local helpers only; NOT TESTED browser |
| `/canli-takip/ai-media` accurate stuck-job visibility | Source inspected, NOT TESTED browser |

The monitoring endpoint ignores active jobs older than 15 minutes in its active KPI and omits some processing states. It must not be used as proof there are no orphaned jobs: direct DB inspection found a ten-day-old active job. No customer UI or prompt/design modes were changed.

Resume after full-stack staging and cost gates: use actual panel options (no required prepared campaign), verify tenant identity at each step, submit once, refresh/navigate while queued, correlate job/attempt IDs, inspect final media, download and hash it, then verify exact Storage and billing records. Start with bounded provider capacity; admitting ten clients must not launch ten concurrent renders.

## Authorized real-provider follow-up

The results above describe the initial simulation audit. Subsequent authorized real Wizard canaries, downloads, observed Flow balances and the failed video are documented in [REAL_PROVIDER_ACCEPTANCE.md](REAL_PROVIDER_ACCEPTANCE.md). That follow-up supersedes NOT TESTED statements only for the exact scenarios it verified. Its Gateway suite passes 169/169 locally; production acceptance remains NO-GO.
