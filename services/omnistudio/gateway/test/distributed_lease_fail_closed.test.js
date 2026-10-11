'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { DistributedLeaseStore } = require('../distributed_lease_store');

test('RPC failure cannot overwrite an account leased by another host', async () => {
  let overwritten = false;
  const database = { rpc: async () => ({ error: { code: 'PGRST202' } }),
    from() { overwritten = true; throw new Error('must not upsert'); } };
  const a = new DistributedLeaseStore({ supabase: database });
  const b = new DistributedLeaseStore({ supabase: database });
  const claims = await Promise.all([a,b].map((store,index) => store.acquireLease({
    provider:'chatgpt',accountId:'account',workerId:'host-'+index,jobId:'job-'+index,leaseToken:'token-'+index })));
  assert(claims.every(claim => claim.acquired === false && claim.message === 'LEASE_STORE_UNAVAILABLE'));
  assert.equal(overwritten,false);
});

test('production cannot silently use a process-local simulated lock', () => {
  const modulePath=path.resolve(__dirname,'../distributed_lease_store');
  const result=spawnSync(process.execPath,['-e',`new (require(${JSON.stringify(modulePath)}).DistributedLeaseStore)()`],{
    env:{...process.env,NODE_ENV:'production',SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_SERVICE_KEY:''},encoding:'utf8' });
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/DISTRIBUTED_LEASE_STORE_REQUIRED/);
});
