import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
const org='00000000-0000-4000-8000-000000000001', creative='00000000-0000-4000-8000-000000000002', output='00000000-0000-4000-8000-000000000003', job='00000000-0000-4000-8000-000000000004', reviewer='00000000-0000-4000-8000-000000000005', foreign='00000000-0000-4000-8000-000000000099', sha='a'.repeat(64), updated='2026-10-10T10:00:00Z'
test('PostgreSQL fixture: exact video approval is atomic and rejects stale or foreign artifacts',async t=>{
 const db=new PGlite()
 try {
  await db.exec(`create role service_role; create table creatives(id uuid primary key,org_id uuid,status text,format text,updated_at timestamptz,public_url text,payload jsonb);
  create table ai_media_jobs(id uuid primary key,org_id uuid,state text);
  create table ai_media_outputs(id uuid primary key,org_id uuid,job_id uuid,sha256 text,byte_size bigint,storage_url text,file_path text,width int,height int,duration_seconds numeric,verified boolean,is_approved boolean,product_type text);`)
  await db.exec(fs.readFileSync('supabase/migrations/20261010094815_atomic_video_review.sql','utf8'))
  const seed=async()=>{
   await db.exec('truncate creatives,ai_media_jobs,ai_media_outputs;')
   await db.query(`insert into creatives values($1,$2,'needs_review','video',$3,$4,$5)`,[creative,org,updated,`/api/ai-media/outputs/${output}`,JSON.stringify({flowJob:{id:job}})])
   await db.query(`insert into ai_media_jobs values($1,$2,'NEEDS_REVIEW')`,[job,org])
   await db.query(`insert into ai_media_outputs values($1,$2,$3,$4,100,'https://storage.invalid/video.mp4','/persist/video.mp4',720,1280,10,true,false,'SHORT_VIDEO')`,[output,org,job,sha])
  }
  const approve=async(o=org,s=sha,u=updated)=>(await db.query<{approved:boolean}>(`select approve_creative_video_review($1,$2,$3,$4,$5,$6) as approved`,[o,creative,output,s,u,reviewer])).rows[0].approved
  await t.test('current owned reviewed 10s bytes publish both records together',async()=>{
   await seed(); assert.equal(await approve(),true)
   assert.equal((await db.query<any>('select status,payload from creatives')).rows[0].status,'ready')
   assert.equal((await db.query<any>('select is_approved from ai_media_outputs')).rows[0].is_approved,true)
   assert.equal(await approve(),false)
  })
  for(const [name,mutation] of [
   ['raw 8s',`update ai_media_outputs set duration_seconds=8`],
   ['unverified',`update ai_media_outputs set verified=false`],
   ['foreign output',`update ai_media_outputs set org_id='${foreign}'`],
   ['old job',`update creatives set payload='{}'`],
   ['wrong aspect',`update ai_media_outputs set width=1280,height=720`],
   ['old revision',`update creatives set updated_at=now()`],
   ['storage absent',`update ai_media_outputs set storage_url=null,file_path=null`],
  ]) await t.test(name+' fails closed with neither record approved',async()=>{
   await seed(); await db.exec(mutation); assert.equal(await approve(),false)
   assert.equal((await db.query<any>('select status from creatives')).rows[0].status,'needs_review')
   assert.equal((await db.query<any>('select is_approved from ai_media_outputs')).rows[0].is_approved,false)
  })
  await t.test('wrong SHA and foreign caller cannot release bytes',async()=>{await seed();assert.equal(await approve(org,'b'.repeat(64)),false);assert.equal(await approve(foreign),false)})
 } finally {await db.close()}
})
