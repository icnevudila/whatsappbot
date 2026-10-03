# Media repair — 2026-10-03

Latest instruction: fixes only. No new test suites, image/video submissions or paid generations started in this continuation. Deployment build/syntax/health/hash checks are operational safeguards, not acceptance tests.

## Existing image recovered

Creative `37f46a20-4918-480d-aa8b-414944cbfa8e`, provider job `job_c30318cdf61fec1f`, exact owned target `4D557B41C827CE5643331A49865AC9A8`.

The provider was still generating at the original 180-second cutoff. Observation-only recovery downloaded the final output from the same target, without new Send, fresh conversation or another paid generation. Gateway completed with SHA `9fadb95b97b19505927310907d39191b66bfde5932f62553044396c640cd38d7`.

The customer backend incorrectly treated reconciliation as terminal failure. Fixed: reconciliation remains rendering/pending; a recovered completed job can finalize its matching failed/rendering creative through a job-identity-fenced update. Existing failed reconciliations automatically observe their saved job. Result tracking no longer ends solely because six minutes elapsed; observations slow to fifteen-second intervals.

Existing creative is now `ready`, error null, decoded PNG 1254 × 1254, 1,612,320 bytes. Stable tenant/creative/job storage path and durable receipt persisted. Reference receipt counts expected/resolved/uploaded/composer = 2/2/2/2. Actual customer page now displays the image and campaign actions. This is repair of an existing job, not a new acceptance campaign; does not certify every output's visual fidelity or another tenant.

## Runtime fixes deployed

- Preserve image targets with durable ownership across ambiguous timeouts/disconnects.
- No fresh paid retry after a durable attachment receipt and possible provider submission.
- Same-target bounded observation/download recovery; startup processing-image recovery does not deadlock the worker map.
- Clear old failure metadata on successful completion.
- Attachment diagnostics no longer include raw composer HTML.
- Gateway called a missing `resolveWorker` method on the deployed supervisor. Added exact provider/account/alias resolution.
- External Flow leases now use the resolved canonical account/worker and never silently fall back to `flow-primary`.
- Reserved Flow lease is STARTING, not GENERATING; session restoration remains possible before execution begins.

First observation deployment backup `/opt/whatsappbot/infra/image-receipt-backup-1791037741`; follow-up backup `/opt/whatsappbot/infra/image-receipt-backup-1791038325`. Exact-file backups, source drift checks, idle gateway/video checks, deployed hash read-back and process health were used. Only gateway/worker Node processes reloaded; Chrome/container not restarted. The first recovery deployment had one explicitly fenced controller-terminal reconciliation creative, not unknown general in-flight jobs.

Customer production deployment `dpl_FC2pYQTPPBAjN3bvaenxoaxFvWvt`, commit `3178abe3b0d7eda495e88794a800f87d2984716f`, READY on app.mesajify.com. Follow-up polling-only delta is tracked on the same branch.

## Not claimed complete

Video provider in-flight crash reconciliation and the broader queued GFlow driver/output/package changes remain separate; not fully deployed or live-certified here. No new video was generated. No zero-error guarantee, second-tenant acceptance or full production-ready claim. Current main and unrelated dirty working-tree changes were preserved; fixes are pushed on scoped branches.
