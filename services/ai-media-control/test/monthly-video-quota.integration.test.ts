import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const migration = readFileSync(resolve(import.meta.dirname, '../../../supabase/migrations/20261017103715_ai_media_atomic_monthly_video_quota.sql'), 'utf8')
async function fixture() {
  const db = new PGlite()
  await db.exec(`CREATE TABLE organizations(id text PRIMARY KEY, monthly_video_quota integer);
    CREATE TABLE ai_media_jobs(id text PRIMARY KEY, org_id text REFERENCES organizations, state text,
      created_at timestamptz NOT NULL DEFAULT now());
    INSERT INTO organizations VALUES ('a',1),('b',1),('disabled',0);`)
  await db.exec(migration)
  return db
}
async function insert(db: PGlite, id: string, org = 'a', state = 'PENDING') {
  await db.query('INSERT INTO ai_media_jobs(id,org_id,state) VALUES ($1,$2,$3)', [id,org,state])
}

// Embedded PostgreSQL verifies the shipped trigger; it serializes queries and
// does not replace a separate-client production concurrency/RLS smoke.
test('last monthly slot rejects a second admission but isolates tenant quotas', async () => {
  const db = await fixture()
  try {
    await insert(db,'first')
    await assert.rejects(insert(db,'second'), {code:'PZ429'})
    await insert(db,'other','b')
    assert.equal((await db.query('SELECT id FROM ai_media_jobs')).rows.length,2)
  } finally { await db.close() }
})

test('terminal counted transitions retain slot; failed retry must reacquire it', async () => {
  const db = await fixture()
  try {
    await insert(db,'first')
    await db.exec("UPDATE ai_media_jobs SET state='COMPLETED' WHERE id='first'")
    await assert.rejects(insert(db,'second'), {code:'PZ429'})
    await db.exec("UPDATE ai_media_jobs SET state='FAILED' WHERE id='first'")
    await insert(db,'second')
    await assert.rejects(db.exec("UPDATE ai_media_jobs SET state='PENDING' WHERE id='first'"), {code:'PZ429'})
    await assert.rejects(db.exec("UPDATE ai_media_jobs SET org_id='b' WHERE id='second'"), {code:'PZ403'})
    await assert.rejects(db.exec("UPDATE ai_media_jobs SET created_at=now()-interval '1 month' WHERE id='second'"), {code:'PZ403'})
  } finally { await db.close() }
})

test('prior month does not consume this month and invalid quota fails closed', async () => {
  const db = await fixture()
  try {
    await db.exec("INSERT INTO ai_media_jobs VALUES ('past','a','COMPLETED', date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'-interval '1 second')")
    await insert(db,'current')
    await assert.rejects(insert(db,'zero','disabled'), {code:'PZ503'})
    assert.equal((await db.query("SELECT prosecdef FROM pg_proc WHERE proname='enforce_ai_media_monthly_video_quota'")).rows[0].prosecdef,false)
  } finally { await db.close() }
})

test('multirow admission is atomic and quota rejection rolls the whole statement back', async () => {
  const db = await fixture()
  try {
    await assert.rejects(db.exec("INSERT INTO ai_media_jobs(id,org_id,state) VALUES ('x','a','PENDING'),('y','a','PENDING')"), {code:'PZ429'})
    assert.equal((await db.query('SELECT id FROM ai_media_jobs')).rows.length,0)
    await insert(db,'after-rollback')
  } finally { await db.close() }
})
