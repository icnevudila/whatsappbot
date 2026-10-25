import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

// Embedded PostgreSQL executes the shipped PL/pgSQL, not a mock of its result.
// PGlite serializes queries; this tests conflict handling and rollback, not
// independent network clients or production RLS.
const root = resolve(import.meta.dirname, '../../..')
const original = readFileSync(resolve(root,'supabase/migrations/20261004062000_studio_atomic_state_audit.sql'),'utf8')
const latest = readdirSync(resolve(root,'supabase/migrations')).filter(n=>n.endsWith('_ai_media_account_lease_fencing.sql')).sort().at(-1)
const migration = latest ? readFileSync(resolve(root,'supabase/migrations',latest),'utf8') : ''
function functionBody(sql: string) {
  const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.studio_lease_job')
  return sql.slice(start,sql.indexOf('END $$;',start)+7)
}
const jobA='00000000-0000-4000-8000-000000000001'
const jobB='00000000-0000-4000-8000-000000000002'
async function fixture() {
  const db = new PGlite()
  await db.exec(`CREATE TABLE flow_accounts(id text primary key,status text default 'idle',current_job_id uuid,updated_at timestamptz);
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE browser_account_leases(provider text,account_id text,lease_token text,heartbeat_at timestamptz,expires_at timestamptz,released_at timestamptz);
    CREATE TABLE ai_media_jobs(id uuid primary key,org_id uuid,state text,lease_worker_id text,lease_account_id text,lease_timeout_at timestamptz,updated_at timestamptz);
    CREATE TABLE ai_media_events(job_id uuid,org_id uuid,event_type text,from_state text,to_state text,message text,payload jsonb);
    INSERT INTO flow_accounts(id) VALUES ('account-a'),('account-b');
    INSERT INTO ai_media_jobs(id,org_id,state) VALUES ('${jobA}','${jobA}','QUEUED'),('${jobB}','${jobB}','QUEUED');`)
  const body = process.env.TEST_BASELINE_LEASE === '1' ? functionBody(original) : migration
  assert.ok(body.includes('CREATE OR REPLACE FUNCTION public.studio_lease_job'))
  await db.exec(body)
  return db
}
async function lease(db: PGlite,id:string,account:string) {
  return (await db.query<{result:boolean}>('select studio_lease_job($1,$2,$3) as result',[id,`worker-${id}`,account])).rows[0].result
}
test('two logical jobs cannot simultaneously own the same Flow account', async () => {
  const db=await fixture()
  try {
    assert.equal(await lease(db,jobA,'account-a'),true)
    assert.equal(await lease(db,jobB,'account-a'),false)
    assert.equal((await db.query<{state:string}>('select state from ai_media_jobs where id=$1',[jobB])).rows[0].state,'QUEUED')
    assert.equal(await lease(db,jobB,'account-b'),true)
  } finally { await db.close() }
})

test('expired SQL heartbeat cannot resurrect authority and RPC access is service-only', async () => {
  const db=await fixture()
  try {
    await db.exec("INSERT INTO browser_account_leases VALUES ('FLOW','a','old',now(),now()-interval '1 second',null)")
    assert.equal((await db.query<{result:boolean}>("select heartbeat_browser_account_lease('FLOW','a','old',60) as result")).rows[0].result,false)
    for (const role of ['anon','authenticated']) {
      assert.equal((await db.query<{allowed:boolean}>("select has_function_privilege($1,'public.studio_lease_job(uuid,text,text)','EXECUTE') as allowed",[role])).rows[0].allowed,false)
    }
    assert.equal((await db.query<{allowed:boolean}>("select has_function_privilege('service_role','public.studio_lease_job(uuid,text,text)','EXECUTE') as allowed")).rows[0].allowed,true)
  } finally { await db.close() }
})
test('audit insert failure rolls back job and account together', async () => {
  const db=await fixture()
  try {
    await db.exec("ALTER TABLE ai_media_events ADD CONSTRAINT reject_audit CHECK (false)")
    await assert.rejects(lease(db,jobA,'account-a'))
    assert.equal((await db.query<{state:string}>('select state from ai_media_jobs where id=$1',[jobA])).rows[0].state,'QUEUED')
    assert.equal((await db.query<{status:string}>('select status from flow_accounts where id=$1',['account-a'])).rows[0].status,'idle')
  } finally { await db.close() }
})
test('terminal job replay and unavailable account never obtain ownership', async () => {
  const db=await fixture()
  try {
    await db.exec(`UPDATE ai_media_jobs SET state='COMPLETED' WHERE id='${jobA}'; UPDATE flow_accounts SET status='needs_reauth' WHERE id='account-a'`)
    assert.equal(await lease(db,jobA,'account-b'),false)
    assert.equal(await lease(db,jobB,'account-a'),false)
  } finally { await db.close() }
})
