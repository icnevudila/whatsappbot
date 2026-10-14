# Performance and load evidence

Status: PASS for the bounded in-process queue contract; NOT TESTED for 100–300 customer capacity.

Command: `node --test services/omnistudio/gateway/test/tenant-load.test.js`.
Five cases: 10, 50, 100, 200, 300 tenant jobs with repeated request IDs, identical customer display
names and stub completion. The actual AdvancedJobQueue executes; no paid provider, browser,
Database, Storage or external services are invoked. Each case verifies zero duplicate job IDs,
exact tenant result ownership, one completion per job and drained queue.

Raw AUDIT_STUB_LOAD records include elapsed time, queue P95, throughput, RSS and CPU time.
Database/storage latency and provider capacity are null/NOT_TESTED, not zero or PASS.
Evidence: evidence/load-audit.tap; the same five cases also run inside the Gateway suite.
Do not sum them twice as unique tests.

Observed representative run:
| Tenants | Queue P95 ms | Total ms | Duplicate jobs | Wrong tenant results |
|---|---:|---:|---:|---:|
| 100 | 69.04 | 69.34 | 0 | 0 |
| 200 | 126.26 | 126.70 | 0 | 0 |
| 300 | 221.12 | 222.70 | 0 | 0 |

These timings are machine/run dependent and describe immediate stub completion, not actual
AI throughput. No production load test, stress test, saturation test or service interruption occurred.
Staging DB/Storage contention, account-specific provider throughput, long queue wait fairness,
transactional credit reservation and capacity for 100–300 firms remain required before a capacity claim.
