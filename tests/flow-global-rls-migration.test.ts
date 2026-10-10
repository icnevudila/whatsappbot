import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import {PGlite} from '@electric-sql/pglite';
test('Flow RLS migration is repeatable, safe before schema and rejects global tenant reads',async()=>{const db=new PGlite();try{
 const sql=fs.readFileSync('supabase/migrations/20261010100649_reassert_flow_global_rls.sql','utf8');
 await db.exec('create role authenticated; create schema auth; create function auth.uid() returns uuid language sql as $$select current_setting(\'request.jwt.claim.sub\',true)::uuid$$;');
 await db.exec(sql);
 await db.exec(`create table organization_members(org_id uuid,user_id uuid);create table ai_media_attempts(org_id uuid);alter table ai_media_attempts enable row level security;grant select on organization_members,ai_media_attempts to authenticated;insert into organization_members values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011');insert into ai_media_attempts values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');`);
 for(const name of ['flow_accounts','flow_account_events','flow_workers','flow_incidents'])await db.exec(`create table ${name}(id int);insert into ${name} values(1);alter table ${name} enable row level security;grant select on ${name} to authenticated;create policy ${name}_auth_select on ${name} for select to authenticated using(true);`);
 await db.exec(sql);await db.exec(sql);
 await db.exec("set role authenticated;set request.jwt.claim.sub='00000000-0000-4000-8000-000000000011'");
 for(const name of ['flow_accounts','flow_account_events','flow_workers','flow_incidents'])assert.equal((await db.query(`select * from ${name}`)).rows.length,0,name);
 assert.equal((await db.query('select * from ai_media_attempts')).rows.length,1);
 }finally{await db.close()}});
