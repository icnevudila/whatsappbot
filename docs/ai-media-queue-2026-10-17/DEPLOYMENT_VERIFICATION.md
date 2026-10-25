# Controlled deployment and second video canary

17 October 2026. User explicitly authorized production deployment and controlled restart with “herşey serbest”. Branch source: c248446; live checkout remains 5556310 with pre-existing runtime modifications. No main merge, git reset/pull, container restart or prompt/creative-mode change was performed.

## Deployment

The live checkout had 364 dirty entries. Downloaded the three exact live Gateway files privately, checked their hashes again immediately before writing, and applied only this branch's diff from baseline 35ceff0. Live server.js contained additional differences; those were preserved. The resulting live server.js intentionally differs from the branch's full server.js. Exact before/deployed hashes are in `../../artifacts/ai-media-real-2026-10-17/deployed-source-hashes.json`.

Backups and the deployment inputs are privately retained on the VPS at `/root/queue-hardening-20261017/`: each `*.before` source file and `functions.before.sql`. Previous function definitions were captured before replacing them in a transaction. Migration `20261017074757_ai_media_account_lease_fencing.sql` was applied directly to the existing database; Supabase migration-history registration was not performed. This avoided applying unrelated pending migrations.

Both the database and Gateway queues were checked before deployment. No unexpired active Control lease and no unreleased browser account lease were found. One old expired ATTACHING_INGREDIENTS job remained held and was not changed. Gateway queue was empty. All three files passed `node --check`. Only the unique `node server.js` process received SIGTERM; the existing process supervisor started its replacement. No Chrome/CDP worker, GFlow, Control or WhatsApp container was restarted. New Gateway PID was 1165284 when checked, health online/ai_ready true, image workers idle. Authenticated account-04 ensure-ready subsequently returned HTTP 200 / READY. A first unauthenticated diagnostic used the wrong token-file location and correctly returned 403; the probe was corrected to the actual configured Gateway token file without exposing its value.

## Database verification

`postdeploy-runtime.log` confirms the account row lock, unexpired heartbeat condition and authenticated-role denial. A transaction containing a synthetic browser lease was rolled back: expired token false, valid token true, wrong token false, zero TTL false. See `postdeploy-lease-sql.log`.

`verify-postgres-account-contention.cjs` executed the deployed function in a randomly named isolated schema on the real PostgreSQL server, with independent backend connections. The second account claimant was observed waiting on a database lock, then returned false after the first committed. A different account succeeded. An injected audit insert constraint failure rolled back both job and account. No public customer job/account row was written, and the isolated schema was removed. See `postdeploy-postgres-contention.log`. This proves the measured database contention behavior; it does not prove partition fencing of an already-running browser.

## Second real video canary: FAIL

Actual Wizard selected Mesajify, product “Mesajify — Gerçek Uygulama Arayüzü”, 9:16 video, and the existing approved narration. One submission created:

- job `32e6bfc8-a1ad-5eb1-a45e-2337acc02386`
- org `2881f690-6853-4064-8768-307463ae6255`
- attempt `9b0eef9d-4520-4752-890b-a579b9d3fd27`
- account `account-04`
- project `0b9c961b-659f-46ad-8f37-16d421178f4d`
- workflow `24d98116-038b-4ccb-b9af-cde7d84dffa2`
- media `0a0ef114-4e9c-47d3-96e7-46fc5bce3aff`

Created 09:01:26.069Z; leased 09:01:36.777Z; OPENING_PROJECT 09:02:40.173Z; INGREDIENTS_VERIFIED 09:03:52.972Z; GENERATING 09:03:53.228Z; FAILED 09:04:14.293Z. Total approximately 168 seconds. The two uploaded reference identities were distinct and attached before submission. Flow submit was observed, running status 2 followed, then terminal status 4 with no returned file. Error: `[FLOW_EXECUTION_FAILED] Generation failed with return code 1`.

This canary passed the earlier readiness failure point. It does not prove the transient navigation issue permanently eliminated. Provider status 4 has no verified cause in the captured diagnostic details (`details: []`); it is not evidence of quota exhaustion, policy rejection or a specific infrastructure defect. No new automatic attempt or account switch was performed.

Refresh of the exact job in the actual panel eventually displayed “Video Hazırlanamadı”, with no SUCCESS/download claim. Screenshot: `postdeploy-video-failed-refresh.png`. There is no MP4, ffprobe, audio, outro, final-frame or visual-quality PASS for this canary. The generic retry button was not clicked.

## Credits and release decision

Read-only Flow account-details UI after the failure showed account-04 920 credits, the same displayed number observed before the first canary. This is a pair of account balance observations, not a per-job debit/refund settlement. The exact project did not expose an additional failure reason; its inspected page contained zero video elements. The existing old uncertain jobs remain unresolved.

**NO-GO.** The database/source hardening is deployed and the measured SQL checks pass. Real video delivery still fails, so paid bulk capacity is not certified. The 36-job Gateway mock matrix remains separate from full-stack staging and real provider evidence. Remaining gates include provider failure/cost reconciliation, old uncertain-job recovery, in-flight partition fencing, atomic quota reservation, full-stack outage/recovery tests and bounded 3/5/10 real acceptance.

## Rollback procedure

Do not roll back over an active generation. First drain/hold admissions and verify no active Gateway work or current unexpired Control/browser lease. Verify the current deployed hashes against the receipt before restoring only the three backed-up Gateway files. Restore `functions.before.sql` inside a database transaction if database rollback is required; retain service-only RPC privileges and verify them. Syntax-check restored Gateway sources, then stop only the unique Gateway server process so its existing supervisor restarts it. Verify health and runtime source/function hashes afterward. The rollback has been prepared, not executed; it would remove the new fencing protections and therefore requires a concrete operational reason.
