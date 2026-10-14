# Queue, worker and recovery audit

Actual states differ by component; no artificial universal enum was added.
- Image Gateway: pending / processing / completed / failed / reconciliation_required.
- Video Gateway: queued / processing / completed / failed / reconciliation_required.
- AI Media Control: PENDING through VALIDATING_INPUTS, QUEUED, LEASED, environment/reference/
  generation/download/processing/QA stages, COMPLETED / NEEDS_REVIEW / FAILED.
- Cancellation is represented by a guarded FAILED transition with cancellation metadata.

Independent local tests cover shared account/session leases, heartbeat busy TTL, orphan targets,
owned observation reconnect, lost submit response, durable restart, exact request idempotency,
storage/RPC failure, CAS state transitions, non-overlapping ticks, finishing checkpoint reuse,
automatic release and incomplete publication. Existing outputs are never substitute success.

Confirmed corrections: no auto production simulator; request hash conflict; authenticated retry
context; no synthetic successful keyframe. Legacy durable image jobs without request hashes
fail closed and require reconciliation. Preserve their files and inspect original job; do not
discard state or resubmit simply to clear a conflict.

Runtime status: existing Gateway/worker/Flow were not patched, restarted, drained or redeployed.
Current container/source SHA, real restart recovery and worker crash under live provider load
are NOT VERIFIED. The localhost candidate submits to existing provider runtime, so candidate
source tests do not prove the provider runtime contains these corrections.

Fresh user variation is monitored by exact job identity. An uncertain outcome must be reconciled
before another attempt; subsequent paid variation production waits for this result.
