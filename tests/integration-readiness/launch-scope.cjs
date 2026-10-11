'use strict';
// Product scope correction from the user; preserve the historical technical evidence.
const launchScope={stripeSubscriptionsAtLaunch:false,deferredFindingIds:['BILL-01','BILL-02','BILL-03','BILL-04','DB-01'],decision:'NO_GO_NON_BILLING_BLOCKERS'};
function applyLaunchScope(text){
  const note='## Initial launch scope — user clarification\n\nStripe subscriptions are **not part of the initial product release**. Stripe billing defects, the Stripe ledger/RLS finding and Stripe migration delivery dependency are deferred integration work, **not launch or pilot blockers**. Their historical evidence remains valid. No billing code was changed or enabled. The remaining NO-GO rests on media authorization/playback, tenant/admin security and missing independent customer-journey/recovery evidence.\n\n';
  text=text.replace(/(> Independent frozen-snapshot audit[^\n]*\n\n)/,`$1${note}`);
  text=text.replaceAll('contracts/billing/security defects','contracts/security defects');
  text=text.replaceAll('cross-branch media and billing defects were reproduced','cross-branch media defects were reproduced; historical billing findings are deferred');
  text=text.replaceAll('billing/media/security blockers','media/security blockers');
  text=text.replaceAll('## NO-GO: reproduced security/billing defects','## Launch security blockers and deferred billing evidence');
  text=text.replaceAll('| Stripe events |','| Stripe events (deferred; not an initial-launch gate) |');
  text=text.replaceAll('| Race/replay/out-of-order |','| Stripe race/replay/out-of-order (deferred) |');
  text=text.replaceAll('| Is Stripe safe? |','| Future Stripe integration (deferred) |');
  text=text.replaceAll('| Billing | Real route + isolated PG, all invoice/checkout/old-sub cases | Confirmed defects; concurrent PG BLOCKED |','| Stripe billing (deferred) | Not required for initial launch | Findings retained for future activation |');
  text=text.replaceAll('Close P0/P1 blockers, prove seeded','Close launch-scoped P0/P1 blockers (excluding deferred Stripe), prove seeded');
  text=text.replaceAll('Owners repair SEC-01, BILL-01..04, MEDIA-01..04 and SEC-02..03','Owners repair SEC-01, MEDIA-01..04 and SEC-02..03 for launch; BILL-01..04 are deferred');
  text=text.replaceAll('In a disposable integration candidate, apply reviewed server-only additive Stripe ledger migration first. Verify roles/RLS/RPC and old-event/concurrency fixtures. Do not rewrite already-applied historical migrations.','Stripe ledger migration is not required for initial launch. Before future Stripe activation, apply a reviewed additive migration and verify roles/RLS/RPC, old events and concurrent replay; never rewrite an already-applied migration.');
  text=text.replaceAll('→ additive DB/roles → compatible Gateway/client pair','→ required non-billing DB/roles → compatible Gateway/client pair');
  text=text.replaceAll('new generation/checkout admission','new generation admission');
  text=text.replaceAll('**P1 migration delivery dependency**','**Deferred Stripe migration delivery dependency (P1 before future activation)**');
  for(const id of launchScope.deferredFindingIds){
    text=text.replaceAll(`### P1 ${id} —`,`### Deferred Stripe: P1 ${id} —`);
    text=text.replaceAll(`- **P1 ${id}**:`,`- **DEFERRED Stripe / P1 ${id}**:`);
  }
  return text;
}
module.exports={launchScope,applyLaunchScope};
