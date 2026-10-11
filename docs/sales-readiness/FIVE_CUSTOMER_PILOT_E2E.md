# New customer onboarding E2E

> 2026-10-11 — INITIAL AUDIT, INTEGRATED ACCEPTANCE PENDING. Source baseline 5e79320b86298d472508275c1538beabedea9ebb. Production reads and isolated tests are separate evidence classes. No production restart, deployment, payment or message sending. Wizard/library owned by another bot; those files are untouched.


## Browser observations, existing tenant only

Authenticated app.mesajify.com opened directly to Ayvazoğlu dashboard. The dashboard explains missing WhatsApp line and links to line setup; contact group step is complete. Existing tenant has 29 contacts/two groups, therefore this is NOT an empty new organization test.

[Dashboard screenshot](evidence/dashboard-onboarding.png) shows the missing-line guide. Business settings say org entitlement 3/3 exhausted; no new org was created. The visible org selector offered four named orgs; business card quota display and semantics need clarification (not sufficient evidence of a billing bug). UI lists Başlangıç, 1 line and 1,000 messages; compares against persisted entitlements before deciding correctness.

AI settings publicly describe an unlimited economical mode and approximately 70 seconds; neither unlimited service capacity nor that latency was established in this audit. Flag commercial wording for the owning bot; no Wizard/library edits.

Registration → login → fresh org → logo → product → QR → contacts → campaign → AI → preview → draft remains PENDING on isolated staging. No production account/consent/payment was submitted. Repeat after the other bot finishes and pin the exact Customer deployment and Gateway revision. Screenshot evidence from an existing populated tenant cannot satisfy new-customer acceptance.

## Evidence and reproduction

- [Runtime inventory](evidence/runtime-inventory.json), captured 2026-10-11T08:58:53.169531+00:00; sanitized, read-only SSH and one aggregate database query.
- [Vercel manifest](evidence/vercel-manifest.json); deployment lists were partial, active customer alias separately resolved.
- [Queue measurements](evidence/queue-load.json); actual queue class bodies, filesystem persistence, synthetic providers.
- Commands: `py scripts/sales-readiness-runtime.py`, `node scripts/sales-readiness-queue-load.cjs`.
- Test logs retain initial failures as well as corrected runs.
