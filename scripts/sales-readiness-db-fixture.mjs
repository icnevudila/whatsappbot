// Real embedded PostgreSQL, selected real membership/policy SQL, synthetic data.
// This does not validate Supabase Auth, production RLS or production backups.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
const root=path.resolve(import.meta.dirname,'..');
const source=await fs.readFile(path.join(root,'supabase/migrations/20260904160000_organizations_tenancy.sql'),'utf8');
const fn=source.match(/create or replace function public\.is_org_member\(p_org_id uuid\)[\s\S]*?\$\$;/)?.[0];
const policies=[...source.matchAll(/create policy "contacts_(?:select|insert|update|delete)_member"[\s\S]*?;/g)].map(m=>m[0]);
assert(fn && policies.length===4,'actual migration boundaries changed');
let db=new PGlite();
await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
 CREATE TABLE public.organizations(id uuid primary key,name text);
 CREATE TABLE public.organization_members(org_id uuid references organizations,user_id uuid,role text);
 CREATE TABLE public.contacts(id uuid primary key,org_id uuid references organizations,name text);
 ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
 GRANT USAGE ON SCHEMA public,auth TO authenticated;
 GRANT SELECT,INSERT,UPDATE,DELETE ON contacts TO authenticated;
 ${fn}
 ${policies.join('\n')}`);
const userA=crypto.randomUUID(),userB=crypto.randomUUID(),orgA=crypto.randomUUID(),orgB=crypto.randomUUID();
await db.query('INSERT INTO organizations VALUES ($1,$2),($3,$4)',[orgA,'synthetic-A',orgB,'synthetic-B']);
await db.query('INSERT INTO organization_members VALUES ($1,$2,$3),($4,$5,$6)',[orgA,userA,'owner',orgB,userB,'owner']);
await db.query('INSERT INTO contacts VALUES ($1,$2,$3),($4,$5,$6)',[crypto.randomUUID(),orgA,'fixture-A',crypto.randomUUID(),orgB,'fixture-B']);
async function verify(database,user,org,foreignOrg){
  await database.exec('SET ROLE authenticated');
  await database.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);
  const visible=await database.query('SELECT org_id,name FROM contacts');
  assert.equal(visible.rows.length,1);
  assert.equal(visible.rows[0].org_id,org);
  const changed=await database.query('UPDATE contacts SET name=$1 WHERE org_id=$2 RETURNING id',['must-not-write',foreignOrg]);
  assert.equal(changed.rows.length,0);
  await assert.rejects(database.query('INSERT INTO contacts VALUES ($1,$2,$3)',[crypto.randomUUID(),foreignOrg,'foreign-insert']),/row-level security/);
  await database.exec('RESET ROLE');
}
await verify(db,userA,orgA,orgB);
await verify(db,userB,orgB,orgA);
const backupStarted=performance.now();
const archive=await db.dumpDataDir();
const bytes=Buffer.from(await archive.arrayBuffer());
const backupMs=performance.now()-backupStarted;
await db.close();
const restoreStarted=performance.now();
db=new PGlite({loadDataDir:new Blob([bytes])});
await db.waitReady;
const restoreMs=performance.now()-restoreStarted;
await verify(db,userA,orgA,orgB);
await verify(db,userB,orgB,orgA);
const count=await db.query('SELECT count(*)::int AS total FROM contacts');
assert.equal(count.rows[0].total,2);
const report={observedAt:new Date().toISOString(),classification:'ISOLATED_PGLITE_REAL_POSTGRES_SELECTED_POLICIES',
 migration:'20260904160000_organizations_tenancy.sql',migrationSha256:crypto.createHash('sha256').update(source).digest('hex'),
 rows:2,tenants:2,readIsolation:'PASS',crossTenantUpdate:'DENIED',crossTenantInsert:'DENIED',
 backup:{bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),milliseconds:backupMs},
 restore:{milliseconds:restoreMs,rowCounts:'MATCH',policies:'RETESTED'},
 caveat:'Selected historical contacts policies in embedded Postgres with a fixture auth.uid(), not full/current Supabase schema, JWT or remote backup/Storage recovery.'};
await fs.writeFile(path.join(root,'docs/sales-readiness/evidence/embedded-db-restore.json'),JSON.stringify(report,null,2));
await db.close();
console.log(JSON.stringify(report));
