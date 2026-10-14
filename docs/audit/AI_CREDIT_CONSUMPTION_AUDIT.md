# AI consumption and credit audit

Status: BLOCKED for complete provider-confirmed cost/billing acceptance.

Existing paths:
- organizations.monthly_video_quota + ai_media_jobs monthly active/completed count in video-job-service.
- Flow account menu parsing records real balance, source and checked time; unavailable balance is unknown.
- Image request identity and video durable idempotency avoid duplicate paid submission after lost response.
- Gateway metadata / flow_account_events include before/after credit fields, but an exhaustive,
  reconciled per-job/attempt/provider usage ledger was not independently demonstrated.

Corrections:
- Conflicting image request IDs no longer deliver a previous SKU or create an ambiguous repeat.
- Missing recent-video cost metadata now returns null/unknown instead of asserting zero credits.
  Numeric recorded costs remain recorded_unverified unless metadata supplies a status.
- Missing historical prompts no longer become invented brand-specific production trace text.
  recorded-video-usage.test.js executes the actual read model against filesystem fixtures.
- Default simulator activation was removed, so production cannot silently use process-local
  account leases when a distributed store is missing.

Remaining risks:
1. Monthly quota reads and insertion are separate DB operations. The quota is checked after
   the owned idempotent fast path (not before), but different concurrent request IDs still need
   real transactional reservation tests. No overcharge or quota overrun was asserted as observed.
2. Provider credit deltas cannot safely be attributed to one job when other account work overlaps.
3. Unknown/failed/uncertain provider outcomes must retain unknown cost; a free-plan label is not a receipt.
4. Daily/monthly user balance reconciliation and exact model price acceptance remain NOT TESTED.

Initial authorization prohibited paid provider calls. The user subsequently explicitly permitted
necessary real outputs and necessary counts. Production remains sequential and evidence reviewed;
no batch provider load or unrelated paid jobs are authorized by inference.

Stub load credit exposure is zero because provider calls are zero; it predicts no commercial cost.
