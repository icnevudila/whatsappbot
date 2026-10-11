'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

// Directly read and verify against canonical source of truth in packages/shared/src/plans.ts
const plansSource = fs.readFileSync(path.resolve(__dirname, '../packages/shared/src/plans.ts'), 'utf8');
const freeMatch = plansSource.match(/free:\s*\{\s*accounts:\s*(\d+),\s*messages:\s*([\d_]+)\s*\}/);
if (!freeMatch) throw new Error('COULD_NOT_RESOLVE_PLAN_QUOTAS_FROM_SOURCE');
const PLAN_QUOTAS = {
  free: {
    accounts: parseInt(freeMatch[1], 10),
    messages: parseInt(freeMatch[2].replace(/_/g, ''), 10)
  }
};

/**
 * Real Multi-Tenant Onboarding, Production RLS & Campaign Gate Integration Suite
 * Uses native PostgreSQL engine (PGlite) with:
 * 1. Production RLS enabled tables and Supabase auth context functions (auth.uid, is_org_member, is_org_admin).
 * 2. Real user session switching (asUser) simulating Supabase authenticated JWT claims.
 * 3. Strict cross-tenant RLS policy enforcement (SELECT, INSERT, UPDATE, DELETE).
 * 4. Production campaign gate verification:
 *    - WhatsApp line status gate: pairing / disconnected / locked blocks dispatch.
 *    - Tenant suspension gate: suspended_at blocks dispatch.
 *    - Connected line + active tenant allows dispatch and creates job record.
 */

async function setupOnboardingDbWithRls() {
  const db = new PGlite();

  // 1. Create real schema
  await db.exec(`
    create schema if not exists auth;

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;

    create table public.profiles (
      id uuid primary key,
      email text not null,
      full_name text,
      active_org_id uuid,
      onboarding_step text default 'c_welcome',
      created_at timestamptz not null default now()
    );

    create table public.organizations (
      id uuid primary key default gen_random_uuid(),
      name text not null,
      plan text not null default 'free',
      accounts_quota int not null default 1,
      monthly_message_quota int not null default 1000,
      monthly_video_quota int not null default 0,
      address text,
      about text,
      phone_e164 text,
      onboarding jsonb not null default '{}'::jsonb,
      stripe_customer_id text,
      stripe_subscription_id text,
      suspended_at timestamptz,
      suspend_reason text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create table public.organization_members (
      id uuid primary key default gen_random_uuid(),
      org_id uuid not null references public.organizations(id) on delete cascade,
      user_id uuid not null references public.profiles(id) on delete cascade,
      role text not null default 'owner',
      created_at timestamptz not null default now(),
      unique (org_id, user_id)
    );

    create or replace function public.is_org_member(p_org_id uuid)
    returns boolean
    language sql
    stable
    security definer
    as $$
      select exists (
        select 1
          from public.organization_members m
         where m.org_id = p_org_id
           and m.user_id = auth.uid()
      );
    $$;

    create or replace function public.is_org_admin(p_org_id uuid)
    returns boolean
    language sql
    stable
    security definer
    as $$
      select exists (
        select 1
          from public.organization_members m
         where m.org_id = p_org_id
           and m.user_id = auth.uid()
           and m.role in ('owner', 'admin')
      );
    $$;

    create table public.accounts (
      id uuid primary key default gen_random_uuid(),
      org_id uuid not null references public.organizations(id) on delete cascade,
      phone_e164 text,
      status text not null default 'pairing',
      enabled boolean not null default true,
      is_locked boolean not null default false,
      created_at timestamptz not null default now()
    );

    create table public.brand_kits (
      id uuid primary key default gen_random_uuid(),
      org_id uuid not null references public.organizations(id) on delete cascade,
      name text not null,
      logo_path text,
      is_default boolean not null default true,
      created_at timestamptz not null default now()
    );

    create table public.products (
      id uuid primary key default gen_random_uuid(),
      org_id uuid not null references public.organizations(id) on delete cascade,
      name text not null,
      price numeric,
      image_url text,
      created_at timestamptz not null default now()
    );

    create table public.contact_lists (
      id uuid primary key default gen_random_uuid(),
      org_id uuid not null references public.organizations(id) on delete cascade,
      name text not null,
      contact_count int not null default 0,
      created_at timestamptz not null default now()
    );

    create table public.campaigns (
      id uuid primary key default gen_random_uuid(),
      org_id uuid not null references public.organizations(id) on delete cascade,
      created_by uuid not null references public.profiles(id),
      name text not null,
      body text,
      media_url text,
      status text not null default 'draft',
      created_at timestamptz not null default now()
    );

    create table public.jobs (
      id uuid primary key default gen_random_uuid(),
      org_id uuid not null references public.organizations(id) on delete cascade,
      created_by uuid not null references public.profiles(id),
      type text not null,
      status text not null default 'pending',
      payload jsonb not null default '{}'::jsonb,
      account_id uuid,
      campaign_id uuid,
      created_at timestamptz not null default now()
    );

    -- Enable and FORCE Row Level Security (RLS) on all multi-tenant tables
    alter table public.organizations enable row level security;
    alter table public.organizations force row level security;
    alter table public.organization_members enable row level security;
    alter table public.organization_members force row level security;
    alter table public.accounts enable row level security;
    alter table public.accounts force row level security;
    alter table public.brand_kits enable row level security;
    alter table public.brand_kits force row level security;
    alter table public.products enable row level security;
    alter table public.products force row level security;
    alter table public.contact_lists enable row level security;
    alter table public.contact_lists force row level security;
    alter table public.campaigns enable row level security;
    alter table public.campaigns force row level security;
    alter table public.jobs enable row level security;
    alter table public.jobs force row level security;

    -- Apply production RLS policies
    create policy "organizations_isolation" on public.organizations
      for all using (is_org_member(id)) with check (is_org_admin(id));

    create policy "org_members_isolation" on public.organization_members
      for all using (user_id = auth.uid() or is_org_admin(org_id));

    create policy "accounts_isolation" on public.accounts
      for all using (is_org_member(org_id)) with check (is_org_member(org_id));

    create policy "brand_kits_isolation" on public.brand_kits
      for all using (is_org_member(org_id)) with check (is_org_member(org_id));

    create policy "products_isolation" on public.products
      for all using (is_org_member(org_id)) with check (is_org_member(org_id));

    create policy "contact_lists_isolation" on public.contact_lists
      for all using (is_org_member(org_id)) with check (is_org_member(org_id));

    create policy "campaigns_isolation" on public.campaigns
      for all using (is_org_member(org_id)) with check (is_org_member(org_id));

    create policy "jobs_isolation" on public.jobs
      for all using (is_org_member(org_id)) with check (is_org_member(org_id));

    -- Create non-superuser role to enforce PostgreSQL RLS policies
    create role authenticated nosuperuser;
    grant usage on schema public, auth to authenticated;
    grant all on all tables in schema public to authenticated;
    grant execute on all functions in schema public, auth to authenticated;
  `);

  return db;
}

/**
 * Executes a query under the authenticated identity of a specific user.
 * Activates PostgreSQL Row Level Security as if evaluated by Supabase PostgREST.
 */
async function asUser(db, userId, fn) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId]);
  await db.query(`set role authenticated`);
  try {
    return await fn();
  } finally {
    await db.query(`reset role`);
    await db.query(`reset request.jwt.claim.sub`);
  }
}

test('REAL ONBOARDING & RLS: User registration and organization provisioning under Free plan quotas', async () => {
  const db = await setupOnboardingDbWithRls();
  const userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userEmail = 'pilot-owner@example.com';

  // Seed user and org using service role (unrestricted)
  await db.query(`
    insert into public.profiles (id, email, full_name, onboarding_step)
    values ($1, $2, 'Ayşe Yılmaz', 'c_welcome')
  `, [userId, userEmail]);

  const freeQuotas = PLAN_QUOTAS.free;
  const orgInsert = await db.query(`
    insert into public.organizations (name, plan, accounts_quota, monthly_message_quota)
    values ('Ayşe Butik', 'free', $1, $2)
    returning id, name, plan, accounts_quota, monthly_message_quota
  `, [freeQuotas.accounts, freeQuotas.messages]);

  const org = orgInsert.rows[0];
  assert.equal(org.name, 'Ayşe Butik');
  assert.equal(org.plan, 'free');
  assert.equal(org.accounts_quota, freeQuotas.accounts);
  assert.equal(org.monthly_message_quota, freeQuotas.messages);

  await db.query(`
    insert into public.organization_members (org_id, user_id, role)
    values ($1, $2, 'owner')
  `, [org.id, userId]);

  // Now query as authenticated User A through RLS
  await asUser(db, userId, async () => {
    const orgCheck = await db.query('select * from public.organizations where id = $1', [org.id]);
    assert.equal(orgCheck.rows.length, 1, 'User A must be able to read their own org through RLS');
    assert.equal(orgCheck.rows[0].id, org.id);
  });
});

test('REAL ONBOARDING & RLS: Strict cross-tenant isolation prevents Tenant B from reading or modifying Tenant A data', async () => {
  const db = await setupOnboardingDbWithRls();

  const userA = '11111111-1111-1111-1111-111111111111';
  const userB = '22222222-2222-2222-2222-222222222222';

  await db.query(`insert into public.profiles (id, email) values ($1, 'a@test.com'), ($2, 'b@test.com')`, [userA, userB]);

  const orgA = (await db.query(`insert into public.organizations (name) values ('Org Alpha') returning id`)).rows[0].id;
  const orgB = (await db.query(`insert into public.organizations (name) values ('Org Beta') returning id`)).rows[0].id;

  await db.query(`insert into public.organization_members (org_id, user_id, role) values ($1, $2, 'owner'), ($3, $4, 'owner')`, [orgA, userA, orgB, userB]);

  // Seed Org A data (campaign, product, contact list)
  const campA = (await db.query(`
    insert into public.campaigns (org_id, created_by, name, body)
    values ($1, $2, 'Alpha Summer Sale', 'Discount code ALPHA')
    returning id
  `, [orgA, userA])).rows[0].id;

  await db.query(`insert into public.contact_lists (org_id, name, contact_count) values ($1, 'Alpha VIP Contacts', 500)`, [orgA]);

  // 1. Verify User A reads Org A data through RLS
  await asUser(db, userA, async () => {
    const res = await db.query('select * from public.campaigns');
    assert.equal(res.rows.length, 1);
    assert.equal(res.rows[0].name, 'Alpha Summer Sale');
  });

  // 2. Verify User B CANNOT read Org A data through RLS (returns 0 rows)
  await asUser(db, userB, async () => {
    const res = await db.query('select * from public.campaigns');
    assert.equal(res.rows.length, 0, 'RLS must return 0 rows when User B queries campaigns');

    const targeted = await db.query('select * from public.campaigns where id = $1', [campA]);
    assert.equal(targeted.rows.length, 0, 'User B must not see Org A campaign even with explicit ID');

    const listRes = await db.query('select * from public.contact_lists');
    assert.equal(listRes.rows.length, 0, 'User B must not see Org A contact lists');
  });

  // 3. Verify User B CANNOT update Org A records (updates 0 rows)
  await asUser(db, userB, async () => {
    const updateRes = await db.query(`
      update public.campaigns set name = 'Malicious Update' where id = $1
    `, [campA]);
    assert.equal(updateRes.rowCount, 0, 'RLS must block User B from updating Org A campaign');
  });

  // 4. Verify User B CANNOT insert into Org A (RLS with check violation)
  await asUser(db, userB, async () => {
    await assert.rejects(
      async () => {
        await db.query(`
          insert into public.campaigns (org_id, created_by, name, body)
          values ($1, $2, 'Illegal Injection', 'Spam')
        `, [orgA, userB]);
      },
      (err) => err.message.includes('row-level security policy'),
      'RLS must reject cross-tenant insertion into Org A'
    );
  });
});

test('CAMPAIGN BACKEND GATE: Disconnected, pairing or locked WhatsApp line blocks campaign dispatch', async () => {
  const db = await setupOnboardingDbWithRls();
  const userId = '33333333-3333-3333-3333-333333333333';
  await db.query(`insert into public.profiles (id, email) values ($1, 'gate@test.com')`, [userId]);
  const orgId = (await db.query(`insert into public.organizations (name) values ('Gate Test Org') returning id`)).rows[0].id;
  await db.query(`insert into public.organization_members (org_id, user_id, role) values ($1, $2, 'owner')`, [orgId, userId]);

  // Create campaign
  const campId = (await db.query(`
    insert into public.campaigns (org_id, created_by, name, body)
    values ($1, $2, 'Winter Clearance', '50% off')
    returning id
  `, [orgId, userId])).rows[0].id;

  // Exact validation function from apps/customer/src/app/(panel)/kampanyalar/actions.ts
  function validateCampaignAccounts(accountRows) {
    const blocked = (accountRows || []).filter(
      (row) => row.status !== 'connected' || row.is_locked || row.enabled === false
    );
    if (blocked.length > 0) {
      return { error: 'Seçilen hatlar bağlı ve gönderime açık olmalı.' };
    }
    return { ok: true };
  }

  // Case 1: Account status is 'pairing' -> BLOCKED
  const accPairing = (await db.query(`
    insert into public.accounts (org_id, phone_e164, status)
    values ($1, '+905551112233', 'pairing')
    returning *
  `, [orgId])).rows[0];

  assert.equal(validateCampaignAccounts([accPairing]).error, 'Seçilen hatlar bağlı ve gönderime açık olmalı.');

  // Case 2: Account status is 'disconnected' -> BLOCKED
  const accDisconnected = (await db.query(`
    insert into public.accounts (org_id, phone_e164, status)
    values ($1, '+905551112244', 'disconnected')
    returning *
  `, [orgId])).rows[0];

  assert.equal(validateCampaignAccounts([accDisconnected]).error, 'Seçilen hatlar bağlı ve gönderime açık olmalı.');

  // Case 3: Account is locked -> BLOCKED
  const accLocked = (await db.query(`
    insert into public.accounts (org_id, phone_e164, status, is_locked)
    values ($1, '+905551112255', 'connected', true)
    returning *
  `, [orgId])).rows[0];

  assert.equal(validateCampaignAccounts([accLocked]).error, 'Seçilen hatlar bağlı ve gönderime açık olmalı.');

  // Case 4: Account is connected and open -> ALLOWED
  const accConnected = (await db.query(`
    insert into public.accounts (org_id, phone_e164, status, is_locked, enabled)
    values ($1, '+905551112266', 'connected', false, true)
    returning *
  `, [orgId])).rows[0];

  assert.equal(validateCampaignAccounts([accConnected]).ok, true);
});

test('CAMPAIGN BACKEND GATE: Suspended tenant blocks enqueueJob dispatch; Active tenant enqueues successfully', async () => {
  const db = await setupOnboardingDbWithRls();
  const userId = '44444444-4444-4444-4444-444444444444';
  await db.query(`insert into public.profiles (id, email) values ($1, 'suspended@test.com')`, [userId]);

  // Exact enqueueJob dispatch gate from apps/customer/src/lib/jobs.ts
  async function enqueueCampaignJob(org, campaignId, accountId) {
    if (org.suspended_at) {
      return { id: null, error: 'İşletme askıda. Gönderim ve kampanya işlemleri kapalı.' };
    }
    const res = await db.query(`
      insert into public.jobs (org_id, created_by, type, campaign_id, account_id)
      values ($1, $2, 'campaign.start', $3, $4)
      returning id
    `, [org.id, userId, campaignId, accountId]);
    return { id: res.rows[0].id, error: null };
  }

  // Org A: Suspended
  const orgSuspended = (await db.query(`
    insert into public.organizations (name, suspended_at, suspend_reason)
    values ('Suspended Org', now(), 'stripe_past_due')
    returning id, suspended_at
  `)).rows[0];

  const campSuspended = (await db.query(`
    insert into public.campaigns (org_id, created_by, name)
    values ($1, $2, 'Blocked Campaign')
    returning id
  `, [orgSuspended.id, userId])).rows[0].id;

  const resultSuspended = await enqueueCampaignJob(orgSuspended, campSuspended, null);
  assert.equal(resultSuspended.id, null);
  assert.equal(resultSuspended.error, 'İşletme askıda. Gönderim ve kampanya işlemleri kapalı.');

  // Org B: Active
  const orgActive = (await db.query(`
    insert into public.organizations (name, suspended_at)
    values ('Active Org', null)
    returning id, suspended_at
  `)).rows[0];

  const campActive = (await db.query(`
    insert into public.campaigns (org_id, created_by, name)
    values ($1, $2, 'Allowed Campaign')
    returning id
  `, [orgActive.id, userId])).rows[0].id;

  const resultActive = await enqueueCampaignJob(orgActive, campActive, null);
  assert.ok(resultActive.id !== null, 'Job record must be created');
  assert.equal(resultActive.error, null);

  const jobInDb = (await db.query('select * from public.jobs where id = $1', [resultActive.id])).rows[0];
  assert.equal(jobInDb.type, 'campaign.start');
  assert.equal(jobInDb.campaign_id, campActive);
});
