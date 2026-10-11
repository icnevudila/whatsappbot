'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const http=require('node:http');
const ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');
const {source,loadCommonJS,refs}=require('./source.cjs');
const gatewayFile='services/omnistudio/gateway/public_output_access.js';
const key=crypto.randomBytes(32).toString('hex');
function gateway(){return loadCommonJS('sales',gatewayFile,{NODE_ENV:'production',MEDIA_SIGNING_SECRET:key,OMNISTUDIO_GATEWAY_TOKEN:key});}
function request(url='/',headers={}){return {url,headers,socket:{remoteAddress:'203.0.113.5'}};}
function loadTS(branch,file,imports={},extra={}){
  const code=ts.transpileModule(source(branch,file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,require:id=>{
    if(Object.hasOwn(imports,id))return imports[id];
    if(id.startsWith('node:'))return require(id);
    throw new Error(`Unexpected dependency: ${id}`);
  },process:{env:{}},Buffer,URL,Request,Response,Headers,Uint8Array,AbortSignal,console,...extra},{filename:file});
  return module.exports;
}
test('Gateway actual verifier denies anonymous private media and tenant-header spoofing',()=>{
  const g=gateway();
  assert.equal(g.verifyMediaAccess({req:request(),filename:'fixture.mp4',ownerTenant:'tenant-a',secret:key}).allowed,false);
  const decision=g.verifyMediaAccess({req:request('/',{'x-tenant-id':'tenant-a'}),filename:'fixture.mp4',ownerTenant:'tenant-a',secret:key});
  assert.equal(decision.statusCode,401);
});
test('Gateway actual verifier denies invalid HMAC, expiry, unknown owner and cross-tenant signed access',()=>{
  const g=gateway();
  const signed=g.signMediaAccess({filename:'fixture.mp4',tenantId:'tenant-a',secret:key});
  assert.equal(g.verifyMediaAccess({req:request('/?'+signed.queryString),filename:'fixture.mp4',ownerTenant:'tenant-a',secret:key}).allowed,true);
  assert.equal(g.verifyMediaAccess({req:request('/?'+signed.queryString),filename:'fixture.mp4',ownerTenant:'tenant-b',secret:key}).statusCode,403);
  assert.equal(g.verifyMediaAccess({req:request('/?'+signed.queryString),filename:'fixture.mp4',secret:key}).statusCode,403);
  assert.equal(g.verifyMediaAccess({req:request('/?'+signed.queryString.replace(signed.sig,'0'.repeat(64))),filename:'fixture.mp4',ownerTenant:'tenant-a',secret:key}).statusCode,401);
  const expired=g.signMediaAccess({filename:'fixture.mp4',tenantId:'tenant-a',secret:key,ttlSeconds:-5});
  assert.equal(g.verifyMediaAccess({req:request('/?'+expired.queryString),filename:'fixture.mp4',ownerTenant:'tenant-a',secret:key}).statusCode,401);
});
test('Gateway owner sidecar survives a fresh module instance',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mesajify-audit-owner-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  gateway().registerMediaOwner('fixture.mp4','tenant-a',dir);
  assert.equal(gateway().getMediaOwner('fixture.mp4',dir),'tenant-a');
});
test('REPRODUCTION: Gateway admin bearer token comparison incorrectly ignores credential case',()=>{
  const g=gateway();
  const changedCase=key.toUpperCase();
  assert.notEqual(changedCase,key);
  assert.equal(g.verifyMediaAccess({req:request('/',{authorization:'Bearer '+changedCase}),filename:'fixture.mp4',secret:key}).allowed,true);
});
test('Gateway missing signing secret fails closed and production loopback is not trusted',()=>{
  const g=loadCommonJS('sales',gatewayFile,{});
  assert.throws(()=>g.signMediaAccess({filename:'fixture.mp4',tenantId:'tenant-a'}),/CONFIG_ERROR/);
  const guard=loadCommonJS('sales','services/omnistudio/gateway/gateway_request_guard.js',{NODE_ENV:'production'});
  assert.equal(guard.isAuthorizedWorker({headers:{},socket:{remoteAddress:'127.0.0.1'}}),false);
});
function stripeHarness(db){
  const shared=loadTS('sales','packages/shared/src/plans.ts');
  const prices=loadTS('sales','apps/customer/src/lib/stripe-prices.ts',{'@wa/shared':shared});
  const admin={from:()=>({select:()=>({eq:(_col,value)=>({maybeSingle:async()=>({data:(await db.query('select id from organizations where stripe_customer_id=$1',[value])).rows[0]||null})})})}),rpc:async(_fn,p)=>{
    try{
      const values=[p.p_event_id,p.p_event_created_at,p.p_event_type,p.p_org_id,p.p_plan,p.p_accounts_quota,p.p_monthly_message_quota,p.p_stripe_customer_id,p.p_stripe_subscription_id,p.p_status,p.p_is_upgrade,p.p_is_downgrade];
      const result=await db.query('select public.apply_stripe_subscription_atomic($1,$2::timestamptz,$3,$4::uuid,$5,$6::int,$7::int,$8,$9,$10,$11::bool,$12::bool) as result',values);
      return {data:result.rows[0].result,error:null};
    }catch(error){return {data:null,error};}
  }};
  const route=loadTS('sales','apps/customer/src/app/api/billing/webhook/route.ts',{
    'next/server':{NextResponse:{json:(body,options)=>new Response(JSON.stringify(body),{status:options?.status||200})}},
    '@supabase/supabase-js':{createClient:()=>admin},'@wa/shared':shared,'@/lib/stripe-prices':prices
  },{process:{env:{STRIPE_WEBHOOK_SECRET:key,NEXT_PUBLIC_SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:key}}});
  async function send(event,signature){
    const payload=JSON.stringify(event),timestamp=Math.floor(Date.now()/1000);
    const sig=crypto.createHmac('sha256',key).update(`${timestamp}.${payload}`).digest('hex');
    const response=await route.POST(new Request('http://localhost/api/billing/webhook',{method:'POST',body:payload,headers:{'stripe-signature':signature||`t=${timestamp},v1=${sig}`}}));
    return {status:response.status,body:await response.json()};
  }
  return {send};
}
async function database(t){
  const db=new PGlite();t.after(()=>db.close());
  await db.exec(`create table public.organizations(id uuid primary key,name text,plan text,accounts_quota int,monthly_message_quota int,stripe_customer_id text,stripe_subscription_id text,suspended_at timestamptz,suspend_reason text,updated_at timestamptz);
    insert into organizations values('11111111-1111-4111-8111-111111111111','Synthetic Audit Tenant','pro',10,50000,'cus_fixture','sub_current',null,null,now());`);
  await db.exec(source('sales','supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql'));
  return db;
}
function event(id,type,object,created=Math.floor(Date.now()/1000)){
  return {id,type,created,data:{object:{customer:'cus_fixture',metadata:{org_id:'11111111-1111-4111-8111-111111111111',plan:'pro'},...object}}};
}
async function org(db){return (await db.query('select * from organizations')).rows[0];}
test('Actual Stripe POST + embedded PostgreSQL reject invalid signature; replay is idempotent; past_due suspends',async t=>{
  const db=await database(t),h=stripeHarness(db);
  const e=event('evt_fixture_suspend','customer.subscription.updated',{id:'sub_current',object:'subscription',status:'past_due'});
  assert.equal((await h.send(e,'t=0,v1=invalid')).status,400);
  assert.equal((await h.send(e)).body.status,'applied');
  assert.equal((await org(db)).suspend_reason,'stripe_past_due');
  assert.equal((await h.send(e)).body.status,'idempotent_duplicate');
  assert.equal((await db.query('select count(*)::int n from stripe_webhook_events')).rows[0].n,1);
});
test('Actual Stripe POST + embedded PostgreSQL preserve newer state and manual suspension',async t=>{
  const db=await database(t),h=stripeHarness(db),now=Math.floor(Date.now()/1000);
  await db.exec("update organizations set suspended_at=now(),suspend_reason='manual_security'");
  await h.send(event('evt_new','customer.subscription.updated',{id:'sub_current',object:'subscription',status:'active'},now));
  assert.equal((await org(db)).suspend_reason,'manual_security');
  assert.equal((await h.send(event('evt_old','customer.subscription.updated',{id:'sub_current',object:'subscription',status:'past_due'},now-60))).body.status,'skipped_stale');
});
test('REPRODUCTION: actual Stripe route nulls obsolete deletion subscription ID and downgrades active tenant',async t=>{
  const db=await database(t),h=stripeHarness(db);
  const res=await h.send(event('evt_old_subscription_deleted','customer.subscription.deleted',{id:'sub_obsolete',object:'subscription',status:'canceled'}));
  assert.equal(res.body.status,'applied');
  assert.equal((await org(db)).plan,'free');
  assert.equal((await org(db)).stripe_subscription_id,null);
});
test('Actual invoice.payment_failed status open: frozen snapshot suspension expectation',async t=>{
  const db=await database(t),h=stripeHarness(db);
  const res=await h.send(event('evt_invoice_failure','invoice.payment_failed',{id:'in_fixture',object:'invoice',subscription:'sub_current',status:'open'}));
  assert.equal(res.status,200);
  if(refs.sales==='17b8eb765b408784a7ac11ed4ef3974c7281cc0f')assert.equal((await org(db)).suspended_at,null);
  else assert.notEqual((await org(db)).suspended_at,null);
});
test('REPRODUCTION: paid invoice without subscription metadata changes pro to starter; obsolete paid invoice replaces current subscription',async t=>{
  const db=await database(t),h=stripeHarness(db);
  await h.send(event('evt_paid_obsolete','invoice.payment_succeeded',{id:'in_paid',object:'invoice',subscription:'sub_obsolete',status:'paid',metadata:{}}));
  assert.equal((await org(db)).plan,'starter');
  assert.equal((await org(db)).stripe_subscription_id,'sub_obsolete');
});
test('REPRODUCTION: checkout completed but unpaid is activated',async t=>{
  const db=await database(t),h=stripeHarness(db);
  await db.exec("update organizations set suspended_at=now(),suspend_reason='stripe_past_due'");
  await h.send(event('evt_checkout_unpaid','checkout.session.completed',{id:'cs_fixture',object:'checkout.session',subscription:'sub_current',status:'complete',payment_status:'unpaid'}));
  assert.equal((await org(db)).suspended_at,null);
});
test('Stripe migration RPC is service-role only; ledger lacks RLS (grant-dependent risk)',async t=>{
  const db=await database(t);
  const fn=(await db.query("select has_function_privilege('public.apply_stripe_subscription_atomic(text,timestamptz,text,uuid,text,int,int,text,text,text,bool,bool)','execute') as allowed")).rows[0];
  assert.equal(fn.allowed,true); // fixture owner has privileges
  assert.equal((await db.query("select relrowsecurity from pg_class where relname='stripe_webhook_events'")).rows[0].relrowsecurity,false);
  await db.exec('create role fixture_anon; grant usage on schema public to fixture_anon; set role fixture_anon');
  await assert.rejects(()=>db.query("select public.apply_stripe_subscription_atomic('x',now(),'x','11111111-1111-4111-8111-111111111111','pro',1,1)"),/permission denied/);
  await db.exec('reset role');
});
test('Actual Stripe route fails closed when atomic migration unavailable',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  const h=stripeHarness(db);
  const result=await h.send(event('evt_no_migration','customer.subscription.updated',{object:'subscription',id:'sub_current',status:'active'}));
  assert.equal(result.status,500);
});
test('REPRODUCTION: deterministic admin cookie is accepted when both server secrets absent',async()=>{
  let supplied;
  const auth=loadTS('master','apps/customer/src/app/canli-takip/auth.ts',{'next/headers':{cookies:async()=>({get:()=>({value:supplied})})}});
  supplied=auth.getExpectedToken();
  assert.equal(await auth.checkIsAuthenticated(),true);
});
test('REPRODUCTION: Master secret scanner skips secret-bearing lines containing process.env and exits clean on Git failure',()=>{
  const scanner=source('master','scripts/check_secrets.js');
  function scan(exec){
    let exitCode=null;
    try{vm.runInNewContext(scanner,{require:()=>({execSync:exec}),console:{error:()=>{}},process:{exit:code=>{exitCode=code;throw new Error('fixture-exit');}}});}catch(error){if(error.message!=='fixture-exit')throw error;}
    return exitCode;
  }
  assert.equal(scan(()=>`+++ b/synthetic.js\n+const access = "Bearer ${key}"; const configured = process.env.KEY;`),null);
  assert.equal(scan(()=>{throw new Error('fixture Git failure');}),0);
});
test('REPRODUCTION: media-url normalization strips signed Gateway query and emits public URL for private creatives',()=>{
  const urls=loadTS('master','apps/customer/src/lib/media-url.ts');
  const signed=gateway().signMediaAccess({filename:'fixture.mp4',tenantId:'tenant-a',secret:key});
  const normalized=urls.getSafeMediaUrl('https://media.167.233.201.31.nip.io/outputs/fixture.mp4?'+signed.queryString);
  assert.equal(new URL(normalized).search,'');
  assert.ok(urls.resolvePreviewUrl('creatives/tenant-a/fixture.jpg').includes('/object/public/creatives/'));
});
test('Actual Master video delivery validates identity, supports bounded/suffix ranges and 416',async()=>{
  const delivery=loadTS('master','apps/customer/src/lib/creative/video-delivery.ts');
  const bytes=Buffer.from('synthetic-video-byte-fixture');
  const evidence={sha256:crypto.createHash('sha256').update(bytes).digest('hex'),byte_size:bytes.length};
  assert.equal(delivery.verifiedVideoResponse(bytes,evidence,'bytes=0-4').status,206);
  assert.equal(await delivery.verifiedVideoResponse(bytes,evidence,'bytes=-3').text(),'ure');
  assert.equal(delivery.verifiedVideoResponse(bytes,evidence,'bytes=999-').status,416);
  assert.equal(delivery.verifiedVideoResponse(bytes,{...evidence,byte_size:1}).status,502);
  assert.equal(delivery.persistedVideoUrl('../escape.mp4','https://fixture.invalid'),null);
});
test('REPRODUCTION: actual Master preview GET receives 502 against signed-only Gateway authorization',async()=>{
  const g=gateway();let requested;
  const output={id:'out_fixture',job_id:'job_fixture',org_id:'tenant-a',file_path:'fixture.mp4',storage_url:null,verified:true,is_approved:true,sha256:'0'.repeat(64),byte_size:10};
  const supabase={from:()=>({select:()=>({eq:()=>({single:async()=>({data:output})})})})};
  const delivery=loadTS('master','apps/customer/src/lib/creative/video-delivery.ts');
  const route=loadTS('master','apps/customer/src/app/api/ai-media/outputs/[outputId]/route.ts',{
    'next/server':{NextResponse:Response},'@/lib/creative/video-delivery':delivery,
    '@/lib/org':{requireActiveOrg:async()=>({org:{id:'tenant-a'},supabase,isPlatformAdmin:false})},
    '@/app/canli-takip/auth':{checkIsAuthenticated:async()=>false},
    '@/lib/supabase/service':{createSupabaseServiceClient:()=>supabase},
    '@supabase/supabase-js':{createClient:()=>supabase},
    '@/lib/creative/video-output-approval':{isApprovedFinalVideoOutput:()=>true,isReviewVideoOutput:()=>false}
  },{fetch:async(url,options)=>{
    requested={url,options};
    const decision=g.verifyMediaAccess({req:request(new URL(url).pathname,options?.headers||{}),filename:'fixture.mp4',ownerTenant:'tenant-a',secret:key});
    return new Response('fixture',{status:decision.allowed?200:decision.statusCode});
  }});
  const req=new Request('http://localhost/api/ai-media/outputs/out_fixture');req.nextUrl=new URL(req.url);
  const response=await route.GET(req,{params:Promise.resolve({outputId:'out_fixture'})});
  assert.equal(response.status,502);assert.equal(requested.options.headers,undefined);
});
test('Creative DNA defaults off; current enabled adapter adds metadata without strategy or hook transformation',()=>{
  const dna=loadTS('master','apps/customer/src/lib/creative/v2/creative-dna-adapter.ts');
  assert.equal(dna.isCreativeDNAEnabled(),false);
  const result=dna.adaptCreativeWithDNA({productId:'synthetic'},{enabledOverride:true});
  assert.equal(result.adapterMode,'DNA_TRANSFORMED');
  assert.equal(result.payload.approaches,undefined);
});
test('Isolated HTTP runs exact Gateway media handler: signed range works; unsigned denied; unsafe cache and range reproduced',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mesajify-audit-http-'));
  const g=gateway(),filename='fixture.mp4',bytes=Buffer.from('synthetic-media-bytes');
  fs.writeFileSync(path.join(dir,filename),bytes);g.registerMediaOwner(filename,'tenant-a',dir);
  const serverSource=source('sales','services/omnistudio/gateway/server.js');
  const start=serverSource.indexOf("if ((method === 'GET' || method === 'HEAD') && (pathname.startsWith('/outputs/')");
  const end=serverSource.indexOf('// 8. Sistem Durumu',start);
  assert.ok(start>=0&&end>start);
  // Execute the pinned handler body, not a reimplementation; no provider/worker initialization.
  const handle=vm.runInNewContext(`(req,res)=>{const parsedUrl=new URL(req.url,'http://localhost');const pathname=parsedUrl.pathname;const method=req.method;${serverSource.slice(start,end)}}`,{
    fs,path,URL,__dirname:dir,getOutputDir:()=>dir,isInternalWorkerRequest:()=>false,
    ...g,queue:{jobs:new Map()},videoQueue:{jobs:new Map()}
  });
  const server=http.createServer(handle);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});});
  const base=`http://127.0.0.1:${server.address().port}/outputs/${filename}`;
  const signed=g.signMediaAccess({filename,tenantId:'tenant-a',secret:key});
  assert.equal((await fetch(base)).status,401);
  const range=await fetch(base+'?'+signed.queryString,{headers:{Range:'bytes=0-4'}});
  assert.equal(range.status,206);assert.equal(await range.text(),'synth');
  const full=await fetch(base+'?'+signed.queryString);
  assert.equal(full.status,200);assert.equal(full.headers.get('cache-control'),'public, max-age=86400');
  await full.arrayBuffer();
  const invalid=await fetch(base+'?'+signed.queryString,{method:'HEAD',headers:{Range:'bytes=999-1000'}});
  assert.equal(invalid.status,206); // defect: should be 416, size is only 21 bytes
});
test('BLOCKED: independent full browser journey, two-tab paid-job recovery and fresh mobile playback',{skip:'No isolated seeded application/auth/storage/worker stack. Existing real-tenant runners prohibited.'},()=>{});
