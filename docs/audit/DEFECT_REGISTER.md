# MESAJIFY DEFECT & RESOLUTION REGISTER

Audit Date: **2026-10-06**  
Branch: `codex/final-production-integration`  

---

| Defect ID | Severity | Component | Problem Description | Root Cause | Implemented Resolution | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | **P0** | `cdp_worker.js` | Observation loop throwing `TypeError: fetch is not a function` during CDP target reconnection. | The custom fetch wrapper in the worker masked the Node global `fetch` in specific reconnect contexts. | Replaced call with `globalThis.fetch` in `reconnectImageObservation` ensuring reliable CDP HTTP API discovery. | **RESOLVED & VERIFIED** |
| **DEF-02** | **P0** | `cdp_worker.js` / `server.js` | Reference receipt missing from Gateway status endpoint causing downstream fail-closed contract rejects. | Worker computed `referenceReceipt` but omitted forwarding it in the `/upload` completion call to the gateway. | Captured `referenceReceipt` object, attached as `x-reference-receipt` header to `/upload`, persisted on `job`, and exposed in `/v1/images/status/:id`. | **RESOLVED & VERIFIED** |
| **DEF-03** | **P1** | `cdp_worker.js` | Turn readiness occasionally failing to detect completed generation when `hasNewMsg` flag fluctuated. | Turn detection only evaluated `hasNewMsg && !isGenerating`. | Updated ready condition to evaluate `checkResult?.foundImgSrc && ((hasNewMsg && !isGenerating) || checkResult?.ready)`. | **RESOLVED & VERIFIED** |
| **DEF-04** | **P1** | `creative-studio-v2.tsx` | Next.js server action throwing `NEXT_REDIRECT` error banner in client UI upon creative submission. | Server action called `redirect()` internally within an unhandled try-catch or async transition. | Replaced server redirect with client-side navigation (`router.push('/icerik/' + id)`) following successful action response. | **RESOLVED & VERIFIED** |
| **DEF-05** | **P2** | `creative-studio-v2.tsx` | User edited headline was vulnerable to being overwritten if late AI copy response arrived. | Async AI copy generation handler did not check whether the user had already modified the headline field. | Introduced `copySource` state tracking. If user modifies headline or body, subsequent AI completion callbacks are ignored. | **RESOLVED & VERIFIED** |
