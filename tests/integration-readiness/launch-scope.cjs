'use strict';
// Product scope correction from the user; preserve the historical technical evidence.
const launchScope={stripeSubscriptionsAtLaunch:false,deferredFindingIds:['BILL-01','BILL-02','BILL-03','BILL-04','DB-01'],decision:{V1:'NO_GO',V2:'NO_GO_BEFORE_PAYMENT_ACTIVATION'},v1MandatoryControls:['Stripe Checkout/Portal disabled independently of retained credentials','Webhook cannot mutate entitlements','Payment UI disabled','Server-side authorized and auditable manual entitlements','Admin/tenant/private-media controls','Wizard E2E and operational recovery']};
function applyLaunchScope(text){
  const note='## Separate release scopes — V1 and V2\n\n**V1: NO-GO** for a controlled, Stripe-free pilot until its mandatory controls are proven. **V2: NO-GO before payment activation**, with BILL-01/02/03/04 retained in the payment backlog. Historical billing defects are not V1 payment-feature blockers; safely disabling Checkout/Portal, webhook entitlement effects and payment UI is nevertheless a V1 requirement. Actual pinned code lacks a release-specific disable gate: missing keys disable calls, retained synthetic keys re-enable them. Manual entitlements have server-side admin checks, but durable change audit is unverified and the action/migration RPC signature mismatch is reproduced. Existing admin/tenant/private-media, Gateway compatibility, Wizard E2E and recovery blockers remain mandatory. No production configuration or deployed disable state was inspected or changed. See [V1 decision](V1_INDEPENDENT_GO_NO_GO.md), [V2 backlog](V2_STRIPE_BACKLOG_GO_NO_GO.md), [disable/manual-entitlement review](V1_BILLING_DISABLED_AND_MANUAL_ENTITLEMENTS.md).\n\n';
  text=text.replace(/(> Independent frozen-snapshot audit[^\n]*\n\n)/,`$1${note}`);
  text=text.replaceAll('contracts/billing/security defects','contracts/security defects');
  text=text.replaceAll('cross-branch media and billing defects were reproduced','cross-branch media defects were reproduced; historical billing findings are deferred');
  text=text.replaceAll('billing/media/security blockers','media/security blockers');
  text=text.replaceAll('## NO-GO for integration release and commercial pilot','## V1: NO-GO for controlled pilot; V2: NO-GO before payment activation');
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
