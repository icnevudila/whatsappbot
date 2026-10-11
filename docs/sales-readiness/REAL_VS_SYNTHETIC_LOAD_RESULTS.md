# Isolated queue load tests

> 2026-10-11 — INITIAL AUDIT, INTEGRATED ACCEPTANCE PENDING. Source baseline 5e79320b86298d472508275c1538beabedea9ebb. Production reads and isolated tests are separate evidence classes. No production restart, deployment, payment or message sending. Wizard/library owned by another bot; those files are untouched.


## Authorized live HTTP probe

The user confirmed there is no separate staging and explicitly authorized controlled load on the current prelaunch environment. Probe scope: Gateway health, WA readiness and unauthenticated Customer entry; not authenticated tenant workload. Stage concurrency is request threads, not verified users. Two requests per thread per endpoint, eight-second timeout, automatic stop above 5% errors or P95 above five seconds.

| Request concurrency | Endpoint | Requests | Mean ms | P95 ms | P99 ms | Errors | Timeouts |
|---|---|---|---|---|---|---|---|
| 5 | gateway_health | 10 | 166.7 | 227.2 | 227.2 | 0 | 0 |
| 5 | wa_ready | 10 | 2050.6 | 2189.9 | 2189.9 | 0 | 0 |
| 5 | customer_entry | 10 | 1017.7 | 2568.4 | 2568.4 | 0 | 0 |
| 10 | gateway_health | 20 | 163.1 | 236.5 | 237.2 | 0 | 0 |
| 10 | wa_ready | 20 | 4372.4 | 4992.8 | 4997.6 | 0 | 0 |
| 10 | customer_entry | 20 | 511.6 | 633.9 | 649.8 | 0 | 0 |
| 30 | gateway_health | 60 | 445.3 | 628.0 | 647.6 | 0 | 0 |
| 30 | wa_ready | 60 | 8008.4 | 8010.2 | 8012.4 | 60 | 60 |

Stop reason: ERROR_RATE_ABOVE_5_PERCENT_OR_P95_ABOVE_5S. WA readiness timed out at the 30-request stage; 50 was NOT RUN. Container resource snapshots before/after each stage and immediate recovery requests are in [live HTTP evidence](evidence/live-http-load.json). These are point samples, not continuous CPU/RAM peaks. PostgreSQL peaks, queue recovery time and authenticated customer capacity remain unmeasured.

A later [recovery probe](evidence/live-http-recovery.json) returned WA readiness 200 in 794 ms, Gateway 200 in 27 ms and Customer entry 200 in 639 ms. This establishes later recovery, not exact recovery duration. Local source launches independent DB/session/queue checks per health request; a single-flight correction now shares overlapping checks and bypasses sharing during shutdown. Runtime source equivalence and post-deployment load acceptance remain pending. No live service restart/deployment occurred.


## Measured scope

40 combinations, 1568 logical jobs, repeated acceptance checked for each; all terminal receipts restored from disk. Inputs and outputs carry synthetic tenant sentinels. Source class hash 223efd208972eb3e3b4c4fce6bd40f280a34280d69ed05ff3d9ba12af72aa630. Worker pool is a harness parameter (image 4/video 2), not actual eligible-account count. Admission bursts are batched local calls, not real concurrent authenticated users.

| Tenants | Burst width | Kind | Jobs | Admit mean ms | P95 ms | P99 ms | Queue P95 ms | Max stub concurrency |
|---|---|---|---|---|---|---|---|---|
| 3 | 5 | image | 6 | 10.38 | 17.62 | 17.62 | 62 | 4 |
| 3 | 5 | video | 6 | 8.49 | 11.37 | 11.37 | 116 | 2 |
| 3 | 10 | image | 6 | 7.32 | 10.93 | 10.93 | 64 | 4 |
| 3 | 10 | video | 6 | 5.31 | 6.10 | 6.10 | 72 | 2 |
| 3 | 30 | image | 6 | 5.69 | 6.97 | 6.97 | 45 | 4 |
| 3 | 30 | video | 6 | 8.34 | 10.37 | 10.37 | 92 | 2 |
| 3 | 50 | image | 6 | 5.81 | 6.59 | 6.59 | 51 | 4 |
| 3 | 50 | video | 6 | 6.26 | 7.41 | 7.41 | 78 | 2 |
| 5 | 5 | image | 10 | 5.37 | 6.45 | 6.45 | 107 | 4 |
| 5 | 5 | video | 10 | 5.85 | 7.27 | 7.27 | 154 | 2 |
| 5 | 10 | image | 10 | 5.42 | 6.07 | 6.07 | 106 | 4 |
| 5 | 10 | video | 10 | 6.12 | 6.91 | 6.91 | 138 | 2 |
| 5 | 30 | image | 10 | 5.38 | 6.61 | 6.61 | 104 | 4 |
| 5 | 30 | video | 10 | 5.84 | 7.23 | 7.23 | 166 | 2 |
| 5 | 50 | image | 10 | 7.48 | 12.07 | 12.07 | 164 | 4 |
| 5 | 50 | video | 10 | 7.56 | 12.34 | 12.34 | 204 | 2 |
| 10 | 5 | image | 20 | 6.98 | 9.32 | 9.58 | 335 | 4 |
| 10 | 5 | video | 20 | 6.53 | 9.15 | 9.17 | 316 | 2 |
| 10 | 10 | image | 20 | 5.25 | 5.61 | 6.01 | 219 | 4 |
| 10 | 10 | video | 20 | 7.51 | 9.62 | 13.07 | 381 | 2 |
| 10 | 30 | image | 20 | 7.25 | 11.31 | 12.25 | 276 | 4 |
| 10 | 30 | video | 20 | 6.02 | 7.03 | 8.62 | 311 | 2 |
| 10 | 50 | image | 20 | 6.44 | 9.19 | 10.58 | 259 | 4 |
| 10 | 50 | video | 20 | 6.32 | 8.38 | 10.63 | 293 | 2 |
| 30 | 5 | image | 60 | 5.42 | 6.22 | 8.38 | 724 | 4 |
| 30 | 5 | video | 60 | 5.60 | 7.07 | 7.37 | 881 | 2 |
| 30 | 10 | image | 60 | 5.82 | 7.39 | 13.23 | 770 | 4 |
| 30 | 10 | video | 60 | 6.19 | 7.58 | 10.19 | 963 | 2 |
| 30 | 30 | image | 60 | 6.13 | 8.43 | 8.89 | 719 | 4 |
| 30 | 30 | video | 60 | 5.98 | 9.25 | 9.89 | 862 | 2 |
| 30 | 50 | image | 60 | 5.43 | 7.72 | 8.80 | 804 | 4 |
| 30 | 50 | video | 60 | 6.13 | 7.79 | 8.96 | 861 | 2 |
| 50 | 5 | image | 100 | 5.31 | 6.71 | 7.39 | 1387 | 4 |
| 50 | 5 | video | 100 | 4.69 | 5.42 | 6.41 | 1217 | 2 |
| 50 | 10 | image | 100 | 5.80 | 7.53 | 8.79 | 1336 | 4 |
| 50 | 10 | video | 100 | 4.98 | 6.02 | 6.32 | 1312 | 2 |
| 50 | 30 | image | 100 | 4.97 | 5.89 | 7.07 | 1272 | 4 |
| 50 | 30 | video | 100 | 5.66 | 7.32 | 8.72 | 1298 | 2 |
| 50 | 50 | image | 100 | 4.87 | 5.66 | 5.97 | 1260 | 4 |
| 50 | 50 | video | 100 | 6.01 | 8.72 | 9.91 | 1365 | 2 |

## Limits and outstanding app load

Provider callback delay configured 5 ms; measured delay includes Node scheduling/filesystem overhead. These latencies are NOT real ChatGPT/Veo latencies. HTTP error rate, HTTP timeouts and PostgreSQL connections are null for this harness, not zero. CPU user/system time and process RSS are in the JSON; no VPS CPU/RAM was stressed.

The user confirmed no dedicated staging exists and authorized current-environment load. Scoped test identities remain to be prepared. Login/refresh, tenant switching, dashboard, contacts, campaign save/preview, message lists, library, settings and credit accounting remain NOT_TESTED_UNDER_LOAD. The bounded real HTTP probe above does not replace these scenarios. Existing worktree has no tracked root reliability test files named media-url-reliability/image-job-reliability/quick-image-job-reliability; attempted command failed and was retained.

Acceptance targets to configure before staging run: for interactive reads P95<1s, P99<2s, HTTP errors<1%, no tenant mismatch or duplicate paid attempt. These are proposed gates, not measured achievements. Run 3/5/10/30/50 independent orgs and 5/10/30/50 browser/API users separately, including multi-user orgs and prolonged churn; collect DB peaks, endpoint metrics and retries.

## Evidence and reproduction

- [Runtime inventory](evidence/runtime-inventory.json), captured 2026-10-11T08:58:53.169531+00:00; sanitized, read-only SSH and one aggregate database query.
- [Vercel manifest](evidence/vercel-manifest.json); deployment lists were partial, active customer alias separately resolved.
- [Queue measurements](evidence/queue-load.json); actual queue class bodies, filesystem persistence, synthetic providers.
- Commands: `py scripts/sales-readiness-runtime.py`, `node scripts/sales-readiness-queue-load.cjs`.
- Test logs retain initial failures as well as corrected runs.
