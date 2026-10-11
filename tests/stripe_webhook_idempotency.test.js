'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

/**
 * Stripe Webhook Ledger Simulation & Isolation Test
 * Verifies:
 * 1. Exact event idempotency (same event_id processed once, replays return cached receipt)
 * 2. Out-of-order sequence guarding (older created_at events cannot overwrite newer subscription states)
 * 3. Atomic entitlement allocation (preventing duplicate message quotas/seats)
 * 4. Suspension state handling under failed/past_due charges
 */

class StripeWebhookLedger {
  constructor() {
    this.processedEvents = new Map() // eventId -> { processedAt, result }
    this.subscriptions = new Map() // orgId -> { plan, status, version, lastEventTimestamp, quota }
  }

  async processEvent(event) {
    const { id: eventId, created: eventTimestamp, type, data } = event
    const obj = data?.object || {}
    const orgId = obj.metadata?.org_id || obj.client_reference_id

    if (!eventId) throw new Error('STRIPE_EVENT_ID_REQUIRED')

    // 1. Exact Event Idempotency Check
    if (this.processedEvents.has(eventId)) {
      return {
        ...this.processedEvents.get(eventId).result,
        idempotent: true,
        replayed: true,
      }
    }

    if (!orgId) {
      return { skipped: true, reason: 'NO_ORG_ID' }
    }

    const currentSub = this.subscriptions.get(orgId) || {
      plan: 'free',
      status: 'none',
      version: 0,
      lastEventTimestamp: 0,
      quota: 1000,
    }

    // 2. Out-of-Order Sequence Guard
    if (eventTimestamp && currentSub.lastEventTimestamp > eventTimestamp) {
      const skippedResult = {
        skipped: true,
        reason: 'OUT_OF_ORDER_EVENT',
        currentPlan: currentSub.plan,
        currentTimestamp: currentSub.lastEventTimestamp,
        staleTimestamp: eventTimestamp,
      }
      this.processedEvents.set(eventId, { processedAt: Date.now(), result: skippedResult })
      return skippedResult
    }

    // 3. Process State Transition
    let targetPlan = currentSub.plan
    let targetStatus = currentSub.status
    let targetQuota = currentSub.quota

    if (type === 'checkout.session.completed' || (type === 'customer.subscription.updated' && (obj.status === 'active' || obj.status === 'trialing'))) {
      targetPlan = (obj.metadata?.plan || 'starter').toLowerCase()
      targetStatus = 'active'
      targetQuota = targetPlan === 'pro' ? 50000 : targetPlan === 'enterprise' ? 500000 : 10000
    } else if (type === 'customer.subscription.deleted' || obj.status === 'canceled') {
      targetPlan = 'free'
      targetStatus = 'canceled'
      targetQuota = 1000
    } else if (obj.status === 'past_due' || obj.status === 'unpaid') {
      targetStatus = 'suspended'
    }

    const updated = {
      plan: targetPlan,
      status: targetStatus,
      version: currentSub.version + 1,
      lastEventTimestamp: eventTimestamp || Date.now(),
      quota: targetQuota,
    }

    this.subscriptions.set(orgId, updated)
    const successResult = {
      idempotent: false,
      replayed: false,
      orgId,
      plan: updated.plan,
      status: updated.status,
      quota: updated.quota,
      version: updated.version,
    }

    this.processedEvents.set(eventId, { processedAt: Date.now(), result: successResult })
    return successResult
  }
}

test('Stripe Webhook Idempotency: exact replayed event is not applied twice', async () => {
  const ledger = new StripeWebhookLedger()
  const event = {
    id: 'evt_test_12345',
    created: 1700000000,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_abc',
        client_reference_id: 'org_sentinel_1',
        metadata: { plan: 'starter' },
        status: 'complete',
      },
    },
  }

  const firstCall = await ledger.processEvent(event)
  assert.equal(firstCall.replayed, false)
  assert.equal(firstCall.plan, 'starter')
  assert.equal(firstCall.quota, 10000)
  assert.equal(firstCall.version, 1)

  // Replay exactly same event
  const secondCall = await ledger.processEvent(event)
  assert.equal(secondCall.replayed, true)
  assert.equal(secondCall.plan, 'starter')
  assert.equal(secondCall.quota, 10000)
  assert.equal(secondCall.version, 1, 'Version must not increment on replayed event')
})

test('Stripe Webhook Out-of-Order Guard: older event cannot overwrite newer subscription status', async () => {
  const ledger = new StripeWebhookLedger()
  const newerEvent = {
    id: 'evt_newer_upgrade',
    created: 1700000500, // Newer timestamp
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_test_1',
        client_reference_id: 'org_sentinel_2',
        status: 'active',
        metadata: { plan: 'pro' },
      },
    },
  }

  const olderDelayedEvent = {
    id: 'evt_older_checkout',
    created: 1700000100, // Older timestamp delivered later
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_old',
        client_reference_id: 'org_sentinel_2',
        metadata: { plan: 'starter' },
      },
    },
  }

  // 1. Newer event arrives first
  const upgradeResult = await ledger.processEvent(newerEvent)
  assert.equal(upgradeResult.plan, 'pro')
  assert.equal(upgradeResult.quota, 50000)

  // 2. Delayed older event arrives later
  const delayedResult = await ledger.processEvent(olderDelayedEvent)
  assert.equal(delayedResult.skipped, true)
  assert.equal(delayedResult.reason, 'OUT_OF_ORDER_EVENT')

  // Organization remains at PRO, not downgraded to STARTER
  assert.equal(ledger.subscriptions.get('org_sentinel_2').plan, 'pro')
  assert.equal(ledger.subscriptions.get('org_sentinel_2').quota, 50000)
})

test('Stripe Webhook Suspension & Reinstatement lifecycle', async () => {
  const ledger = new StripeWebhookLedger()
  const orgId = 'org_sentinel_3'

  // 1. Activate Starter
  await ledger.processEvent({
    id: 'evt_active',
    created: 1700000100,
    type: 'customer.subscription.updated',
    data: { object: { client_reference_id: orgId, status: 'active', metadata: { plan: 'starter' } } },
  })
  assert.equal(ledger.subscriptions.get(orgId).status, 'active')

  // 2. Past due -> suspend
  await ledger.processEvent({
    id: 'evt_past_due',
    created: 1700000200,
    type: 'customer.subscription.updated',
    data: { object: { client_reference_id: orgId, status: 'past_due' } },
  })
  assert.equal(ledger.subscriptions.get(orgId).status, 'suspended')

  // 3. Payment recovered -> reactivate
  await ledger.processEvent({
    id: 'evt_recovered',
    created: 1700000300,
    type: 'customer.subscription.updated',
    data: { object: { client_reference_id: orgId, status: 'active', metadata: { plan: 'starter' } } },
  })
  assert.equal(ledger.subscriptions.get(orgId).status, 'active')
})
