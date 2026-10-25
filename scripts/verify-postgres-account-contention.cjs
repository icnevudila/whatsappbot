// Run with pg available and DATABASE_URL set. Never writes public job/account rows.
const { Client } = require('pg');
const { randomBytes, randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');

async function main() {
  const schema = `queue_audit_${randomBytes(8).toString('hex')}`;
  assert.match(schema, /^queue_audit_[a-f0-9]{16}$/);
  const config = { connectionString: process.env.DATABASE_URL, statement_timeout: 10000 };
  const admin = new Client(config), first = new Client(config), second = new Client(config);
  let created = false;
  try {
    await Promise.all([admin.connect(), first.connect(), second.connect()]);
    const definition = (await admin.query("select pg_get_functiondef('public.studio_lease_job(uuid,text,text)'::regprocedure) as sql")).rows[0].sql;
    assert.ok(definition.includes('FOR UPDATE'), 'Live function must contain the account lock');
    await admin.query(`CREATE SCHEMA ${schema}`);
    created = true;
    await admin.query(`CREATE TABLE ${schema}.flow_accounts(id text primary key,status text,current_job_id uuid,updated_at timestamptz);
      CREATE TABLE ${schema}.ai_media_jobs(id uuid primary key,org_id uuid,state text,lease_worker_id text,lease_account_id text,lease_timeout_at timestamptz,updated_at timestamptz);
      CREATE TABLE ${schema}.ai_media_events(job_id uuid,org_id uuid,event_type text,from_state text,to_state text,message text,payload jsonb);
      INSERT INTO ${schema}.flow_accounts(id,status) VALUES ('a','idle'),('b','idle');`);
    // Execute the deployed function body unchanged except its isolated namespace.
    await admin.query(definition.replaceAll('public.', `${schema}.`).replace(/SET search_path TO 'public'/g, `SET search_path TO '${schema}'`));
    const jobs = [randomUUID(), randomUUID(), randomUUID()];
    for (const id of jobs) await admin.query(`INSERT INTO ${schema}.ai_media_jobs(id,org_id,state) VALUES($1,$1,'QUEUED')`, [id]);
    const lease = async (client, id, account) => (await client.query(`select ${schema}.studio_lease_job($1,$2,$3) as owned`, [id, 'audit-worker', account])).rows[0].owned;
    await first.query('BEGIN');
    assert.equal(await lease(first, jobs[0], 'a'), true);
    await second.query('BEGIN');
    const secondPid = (await second.query('select pg_backend_pid() as pid')).rows[0].pid;
    const contender = lease(second, jobs[1], 'a');
    // Attach a rejection handler immediately, including on cleanup/error paths.
    contender.catch(() => {});
    let blocked = false;
    for (let i = 0; i < 20; i++) {
      const row = (await admin.query('select wait_event_type from pg_stat_activity where pid=$1', [secondPid])).rows[0];
      if (row?.wait_event_type === 'Lock') { blocked = true; break; }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.ok(blocked, 'Second independent backend must wait on the first account owner');
    await first.query('COMMIT');
    assert.equal(await contender, false);
    await second.query('COMMIT');
    assert.equal(await lease(second, jobs[1], 'b'), true);
    await admin.query(`INSERT INTO ${schema}.flow_accounts(id,status) VALUES ('c','idle');
      ALTER TABLE ${schema}.ai_media_events ADD CONSTRAINT audit_failure CHECK(false) NOT VALID;`);
    await assert.rejects(lease(second, jobs[2], 'c'), error => error.code === '23514');
    assert.equal((await admin.query(`select state from ${schema}.ai_media_jobs where id=$1`, [jobs[2]])).rows[0].state, 'QUEUED');
    assert.equal((await admin.query(`select status from ${schema}.flow_accounts where id='c'`)).rows[0].status, 'idle');
    console.log(JSON.stringify({ scope: 'isolated schema, deployed function, independent PostgreSQL backends',
      sameAccountWaitObserved: blocked, competingClaimRejected: true, differentAccountClaimed: true,
      auditFailureRolledBackJobAndAccount: true, publicCustomerRowsWritten: 0 }));
  } finally {
    await Promise.allSettled([first.query('ROLLBACK'), second.query('ROLLBACK')]);
    await Promise.allSettled([first.end(), second.end()]);
    if (created) await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
