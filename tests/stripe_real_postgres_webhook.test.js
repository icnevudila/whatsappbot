'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

/**
 * Real PostgreSQL Integration Test for Stripe Webhook Atomic Processing
 * Uses embedded native PostgreSQL engine (PGlite) to execute:
 * 1. The exact production migration: 20261011123000_stripe_webhook_atomic_ledger.sql
 * 2. True atomic row locking (FOR UPDATE) and transactional ledger recording
 * 3. Exact concurrent race condition handling
 * 4. Out-of-order sequence guarding (preventing stale events from overriding newer state)
 * 5. Lifecycle handling for past_due, active, trialing, canceled, and customer.subscription.deleted
 * 6. Fail-closed behavior when migration is absent
 */

async function setupDatabaseWithMigration() {
  const db = new PGlite();

  // Create base organizations schema
  await db.query(`
    create table public.organizations (
      id uuid primary key,
      name text not null,
      plan text not null default 'free',
      accounts_quota int not null default 1,
      monthly_message_quota int not null default 100,
      monthly_video_quota int not null default 0,
      stripe_customer_id text,
      stripe_subscription_id text,
      suspended_at timestamptz,
      suspend_reason text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  // Load and apply the real production migration
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  await db.exec(migrationSql);

  return db;
}

test('POSTGRES ATOMIC STRIPE: Migration sets up ledger table and atomic RPC successfully', async () => {
  const db = await setupDatabaseWithMigration();

  // Verify stripe_webhook_events table exists
  const tableCheck = await db.query(`
    select table_name from information_schema.tables 
    where table_name = 'stripe_webhook_events'
  `);
  assert.equal(tableCheck.rows.length, 1, 'stripe_webhook_events table must exist');

  // Verify column stripe_last_event_created_at exists in organizations
  const colCheck = await db.query(`
    select column_name from information_schema.columns 
    where table_name = 'organizations' and column_name = 'stripe_last_event_created_at'
  `);
  assert.equal(colCheck.rows.length, 1, 'organizations.stripe_last_event_created_at column must exist');
});

test('POSTGRES ATOMIC STRIPE: Concurrent duplicate events result in exactly 1 application and 1 idempotent response', async () => {
  const db = await setupDatabaseWithMigration();
  const orgId = '11111111-1111-1111-1111-111111111111';

  await db.query(`
    insert into public.organizations (id, name, plan, accounts_quota, monthly_message_quota)
    values ($1, 'Acme Corp', 'free', 1, 100)
  `, [orgId]);

  const eventId = 'evt_race_condition_test_001';
  const eventCreatedAt = new Date('2026-10-11T12:00:00Z').toISOString();

  // Fire 2 simultaneous executions with the same eventId
  const callRpc = () => db.query(`
    select public.apply_stripe_subscription_atomic(
      p_event_id => $1,
      p_event_created_at => $2::timestamptz,
      p_event_type => 'customer.subscription.updated',
      p_org_id => $3::uuid,
      p_plan => 'starter',
      p_accounts_quota => 3,
      p_monthly_message_quota => 1000,
      p_stripe_customer_id => 'cus_123',
      p_stripe_subscription_id => 'sub_123',
      p_status => 'active',
      p_is_upgrade => true,
      p_is_downgrade => false
    ) as result
  `, [eventId, eventCreatedAt, orgId]);

  const [resA, resB] = await Promise.all([callRpc(), callRpc()]);

  const resultA = resA.rows[0].result;
  const resultB = resB.rows[0].result;

  const statuses = [resultA.status, resultB.status].sort();
  assert.deepEqual(
    statuses,
    ['applied', 'idempotent_duplicate'],
    'One call must apply the change and the other must return idempotent_duplicate'
  );

  // Verify database state: Exactly 1 record in ledger
  const ledgerRows = await db.query(
    'select * from public.stripe_webhook_events where event_id = $1',
    [eventId]
  );
  assert.equal(ledgerRows.rows.length, 1, 'Ledger must have exactly 1 record for this eventId');
  assert.equal(ledgerRows.rows[0].status, 'applied');

  // Verify organization state
  const org = (await db.query('select * from public.organizations where id = $1', [orgId])).rows[0];
  assert.equal(org.plan, 'starter');
  assert.equal(org.accounts_quota, 3);
  assert.equal(org.monthly_message_quota, 1000);
});

test('POSTGRES ATOMIC STRIPE: Out-of-order older event is safely ignored without downgrading newer state', async () => {
  const db = await setupDatabaseWithMigration();
  const orgId = '22222222-2222-2222-2222-222222222222';

  await db.query(`
    insert into public.organizations (id, name, plan, accounts_quota, monthly_message_quota)
    values ($1, 'Beta Store', 'free', 1, 100)
  `, [orgId]);

  // Step 1: Process newer event (T2 = 14:00:00) upgrading to Pro
  const eventNewerId = 'evt_seq_newer_002';
  const timeNewer = new Date('2026-10-11T14:00:00Z').toISOString();
  await db.query(`
    select public.apply_stripe_subscription_atomic(
      p_event_id => $1,
      p_event_created_at => $2::timestamptz,
      p_event_type => 'customer.subscription.updated',
      p_org_id => $3::uuid,
      p_plan => 'pro',
      p_accounts_quota => 10,
      p_monthly_message_quota => 5000,
      p_stripe_customer_id => 'cus_pro',
      p_stripe_subscription_id => 'sub_pro',
      p_status => 'active',
      p_is_upgrade => true,
      p_is_downgrade => false
    )
  `, [eventNewerId, timeNewer, orgId]);

  // Step 2: Delayed older event arrives (T1 = 13:00:00) indicating older Starter plan
  const eventOlderId = 'evt_seq_older_001';
  const timeOlder = new Date('2026-10-11T13:00:00Z').toISOString();
  const resStale = await db.query(`
    select public.apply_stripe_subscription_atomic(
      p_event_id => $1,
      p_event_created_at => $2::timestamptz,
      p_event_type => 'customer.subscription.updated',
      p_org_id => $3::uuid,
      p_plan => 'starter',
      p_accounts_quota => 3,
      p_monthly_message_quota => 1000,
      p_stripe_customer_id => 'cus_pro',
      p_stripe_subscription_id => 'sub_pro',
      p_status => 'active',
      p_is_upgrade => false,
      p_is_downgrade => false
    ) as result
  `, [eventOlderId, timeOlder, orgId]);

  const staleResult = resStale.rows[0].result;
  assert.equal(staleResult.status, 'skipped_stale');
  assert.equal(staleResult.current_plan, 'pro');

  // Verify database: Org state must remain PRO!
  const org = (await db.query('select * from public.organizations where id = $1', [orgId])).rows[0];
  assert.equal(org.plan, 'pro', 'Stale event must not overwrite newer Pro plan');
  assert.equal(org.accounts_quota, 10);
  assert.equal(org.monthly_message_quota, 5000);

  // Stale event is safely audited in ledger with status skipped_stale
  const staleLedger = (await db.query('select * from public.stripe_webhook_events where event_id = $1', [eventOlderId])).rows[0];
  assert.equal(staleLedger.status, 'skipped_stale');
});

test('POSTGRES ATOMIC STRIPE: Failed charge suspends tenant; payment recovery reinstates tenant', async () => {
  const db = await setupDatabaseWithMigration();
  const orgId = '33333333-3333-3333-3333-333333333333';

  await db.query(`
    insert into public.organizations (id, name, plan, accounts_quota, monthly_message_quota)
    values ($1, 'Gamma Shop', 'starter', 3, 1000)
  `, [orgId]);

  // 1. Payment failure (past_due)
  const failEvent = 'evt_past_due_001';
  await db.query(`
    select public.apply_stripe_subscription_atomic(
      p_event_id => $1,
      p_event_created_at => now(),
      p_event_type => 'customer.subscription.updated',
      p_org_id => $2::uuid,
      p_plan => 'starter',
      p_accounts_quota => 3,
      p_monthly_message_quota => 1000,
      p_stripe_customer_id => 'cus_gamma',
      p_stripe_subscription_id => 'sub_gamma',
      p_status => 'past_due',
      p_is_upgrade => false,
      p_is_downgrade => false
    )
  `, [failEvent, orgId]);

  let org = (await db.query('select * from public.organizations where id = $1', [orgId])).rows[0];
  assert.ok(org.suspended_at !== null, 'Tenant must be suspended on past_due');
  assert.equal(org.suspend_reason, 'stripe_past_due');

  // 2. Payment recovery (active)
  const recoveryEvent = 'evt_recovery_002';
  await db.query(`
    select public.apply_stripe_subscription_atomic(
      p_event_id => $1,
      p_event_created_at => now() + interval '1 minute',
      p_event_type => 'customer.subscription.updated',
      p_org_id => $2::uuid,
      p_plan => 'starter',
      p_accounts_quota => 3,
      p_monthly_message_quota => 1000,
      p_stripe_customer_id => 'cus_gamma',
      p_stripe_subscription_id => 'sub_gamma',
      p_status => 'active',
      p_is_upgrade => false,
      p_is_downgrade => false
    )
  `, [recoveryEvent, orgId]);

  org = (await db.query('select * from public.organizations where id = $1', [orgId])).rows[0];
  assert.equal(org.suspended_at, null, 'Suspension must be cleared on payment recovery');
  assert.equal(org.suspend_reason, null);
});

test('POSTGRES ATOMIC STRIPE: Voluntary cancellation downgrades to free and clears subscription ID', async () => {
  const db = await setupDatabaseWithMigration();
  const orgId = '44444444-4444-4444-4444-444444444444';

  await db.query(`
    insert into public.organizations (id, name, plan, accounts_quota, monthly_message_quota, stripe_subscription_id)
    values ($1, 'Delta Corp', 'starter', 3, 1000, 'sub_active')
  `, [orgId]);

  const cancelEvent = 'evt_cancel_001';
  await db.query(`
    select public.apply_stripe_subscription_atomic(
      p_event_id => $1,
      p_event_created_at => now(),
      p_event_type => 'customer.subscription.deleted',
      p_org_id => $2::uuid,
      p_plan => 'free',
      p_accounts_quota => 1,
      p_monthly_message_quota => 100,
      p_stripe_customer_id => 'cus_delta',
      p_stripe_subscription_id => null,
      p_status => 'canceled',
      p_is_upgrade => false,
      p_is_downgrade => true
    )
  `, [cancelEvent, orgId]);

  const org = (await db.query('select * from public.organizations where id = $1', [orgId])).rows[0];
  assert.equal(org.plan, 'free');
  assert.equal(org.accounts_quota, 1);
  assert.equal(org.monthly_message_quota, 100);
  assert.equal(org.stripe_subscription_id, null, 'Subscription ID must be cleared upon downgrade to free');
  assert.equal(org.suspended_at, null, 'Voluntary cancellation should not mark tenant as delinquent/suspended');
});

test('POSTGRES ATOMIC STRIPE: Fail-closed without migration returns database error and halts', async () => {
  // Create an unmigrated database instance
  const unmigratedDb = new PGlite();
  await unmigratedDb.query(`
    create table public.organizations (id uuid primary key, plan text);
  `);

  // Calling unmigrated RPC must fail
  await assert.rejects(
    async () => {
      await unmigratedDb.query(`
        select public.apply_stripe_subscription_atomic(
          p_event_id => 'evt_fail_test',
          p_event_created_at => now(),
          p_event_type => 'customer.subscription.updated',
          p_org_id => '00000000-0000-0000-0000-000000000000'::uuid,
          p_plan => 'starter',
          p_accounts_quota => 3,
          p_monthly_message_quota => 1000
        )
      `);
    },
    (err) => {
      // Must be undefined function error in PostgreSQL
      return err.message.includes('apply_stripe_subscription_atomic');
    },
    'Unmigrated database must throw and prevent unrecorded execution'
  );
});
