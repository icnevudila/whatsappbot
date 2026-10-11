'use strict';
// Actual frozen source, synthetic environment and blocked/spied external I/O only.
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const vm=require('node:vm');
const ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');
const {source}=require('./source.cjs');
const key=crypto.randomBytes(32).toString('hex');
const fixtureOrg={id:'11111111-1111-4111-8111-111111111111',role:'owner',stripe_customer_id:'cus_synthetic',suspended_at:null};
const manualMode={MESAJIFY_BILLING_MODE:'manual'}; // negative canary, NOT an implemented app flag
function load(branch,file,imports={},environment={},extra={}){
  const module={exports:{}};
  const code=ts.transpileModule(source(branch,file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{module,exports:module.exports,process:{env:environment},console,Buffer,URL,URLSearchParams,Request,Response,Headers,Uint8Array,AbortSignal,
    require:id=>{if(Object.hasOwn(imports,id))return imports[id];if(id.startsWith('node:'))return require(id);throw new Error('Unexpected dependency '+id);},...extra},{filename:file});
  return module.exports;
}
function imports(){
  const shared=load('master','packages/shared/src/plans.ts');
  return {'next/server':{NextResponse:{json:(data,options)=>new Response(JSON.stringify(data),{status:options?.status||200})}},
    '@/lib/org':{requireActiveOrg:async()=>({userId:'synthetic-admin',org:fixtureOrg})},
    '@/lib/stripe-prices':load('master','apps/customer/src/lib/stripe-prices.ts',{'@wa/shared':shared},{STRIPE_PRICE_PRO:'price_synthetic'}),'@wa/shared':shared};
}
function post(){return new Request('http://localhost/api/billing/checkout',{method:'POST',body:JSON.stringify({plan:'pro'}),headers:{'content-type':'application/json'}});}
test('Actual Checkout/Portal/status are disabled only when Stripe environment keys are absent',async()=>{
  let calls=0;
  for(const endpoint of ['checkout','portal']){
    const route=load('master',`apps/customer/src/app/api/billing/${endpoint}/route.ts`,imports(),manualMode,{fetch:async()=>{calls++;throw new Error('External I/O prohibited');}});
    assert.equal((await route.POST(post())).status,503);
  }
  const status=load('master','apps/customer/src/app/api/billing/status/route.ts',imports(),manualMode);
  const result=await (await status.GET()).json();
  assert.equal(result.checkoutReady,false);assert.equal(result.webhookReady,false);assert.equal(calls,0);
});
test('REPRODUCTION V1-OFF-01: retained synthetic keys allow actual Checkout/Portal despite manual-mode canary',async()=>{
  let calls=0;
  const env={...manualMode,STRIPE_SECRET_KEY:key,STRIPE_PRICE_PRO:'price_synthetic'};
  for(const endpoint of ['checkout','portal']){
    const route=load('master',`apps/customer/src/app/api/billing/${endpoint}/route.ts`,imports(),env,{fetch:async url=>{
      assert.ok(String(url).startsWith('https://api.stripe.com/'));calls++;
      return new Response(JSON.stringify({id:'cs_synthetic',url:'https://fixture.invalid/no-payment'}));
    }});
    assert.equal((await route.POST(post())).status,200);
  }
  assert.equal(calls,2); // zero real requests; proves configured code is not V1-disabled
});
test('Actual webhook with absent webhook secret returns 503 before database/provider access',async()=>{
  let calls=0;
  const route=load('sales','apps/customer/src/app/api/billing/webhook/route.ts',{...imports(),'@supabase/supabase-js':{createClient:()=>{calls++;throw new Error('DB forbidden');}}},manualMode);
  assert.equal((await route.POST(post())).status,503);assert.equal(calls,0);
});
test('REPRODUCTION V1-OFF-02: configured actual webhook still calls automatic entitlement RPC in manual-mode canary',async()=>{
  let invocation;
  const env={...manualMode,STRIPE_WEBHOOK_SECRET:key,NEXT_PUBLIC_SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:key};
  const route=load('sales','apps/customer/src/app/api/billing/webhook/route.ts',{...imports(),'@supabase/supabase-js':{createClient:()=>({rpc:async(name,params)=>{
    invocation={name,params};return {data:{status:'fixture-captured'},error:null};
  }})}},env);
  const payload=JSON.stringify({id:'evt_synthetic',created:Math.floor(Date.now()/1000),type:'checkout.session.completed',data:{object:{object:'checkout.session',subscription:'sub_synthetic',customer:'cus_synthetic',status:'complete',metadata:{org_id:fixtureOrg.id,plan:'pro'}}}});
  const timestamp=Math.floor(Date.now()/1000);
  const signature=crypto.createHmac('sha256',key).update(`${timestamp}.${payload}`).digest('hex');
  const result=await route.POST(new Request('http://localhost/api/billing/webhook',{method:'POST',body:payload,headers:{'stripe-signature':`t=${timestamp},v1=${signature}`}}));
  assert.equal(result.status,200);assert.equal(invocation.name,'apply_stripe_subscription_atomic');assert.equal(invocation.params.p_is_upgrade,true);
});
test('REPRODUCTION V1-UI-01: actual settings component displays payment success solely from URL query',async()=>{
  const jsx=(type,props)=>({type,props});
  const page=load('master','apps/customer/src/app/(panel)/ayarlar/page.tsx',{
    'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'Link'},'next/navigation':{redirect:()=>{throw new Error('unexpected redirect');}},
    '@/components/ui':{Notice:'Notice',PageHeader:'Header'},'@/components/icon':{Icon:'Icon'},'@/components/brand':{Wordmark:'Wordmark'},
    '@/lib/org':{requireActiveOrg:async()=>({org:fixtureOrg,email:null}),listUserOrgs:async()=>[]},'@/lib/contact':{CONTACT_EMAIL:'fixture@example.invalid'},
    '@/app/giris/actions':{signOut:()=>{}},'../org-switcher':{OrgSwitcher:'OrgSwitcher'},'./sections':{SETTINGS_SECTIONS:[]}
  },manualMode);
  const tree=await page.default({searchParams:Promise.resolve({billing:'ok'})});
  assert.ok(JSON.stringify(tree).includes('Ödeme alındı'));
});
test('Actual admin identity gate ignores user-editable metadata',()=>{
  const platform=load('master','apps/admin/src/lib/platform.ts',{'next/navigation':{redirect:()=>{}},'@/lib/supabase/server':{createSupabaseServerClient:()=>{}}});
  assert.equal(platform.isPlatformAdminUser({user_metadata:{platform_admin:true},app_metadata:{}}),false);
  assert.equal(platform.isPlatformAdminUser({app_metadata:{platform_admin:true}}),true);
});
test('Actual manual entitlement SQL rejects non-admin; permits admin, but has no function-level audit write',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec(`create role authenticated;create table organizations(id uuid primary key,name text,plan text,accounts_quota int,monthly_message_quota int,updated_at timestamptz);
    create function public.is_platform_admin() returns boolean language sql as $$select coalesce(current_setting('audit.fixture_admin',true),'false')='true'$$;
    insert into organizations values('${fixtureOrg.id}','Synthetic Tenant','free',1,1000,now());`);
  const sql=source('master','supabase/migrations/20260905150000_jobs_cancel_admin_org.sql');
  await db.exec(sql.slice(sql.indexOf('create or replace function public.admin_update_organization')));
  await assert.rejects(()=>db.query('select public.admin_update_organization($1::uuid,$2,$3,$4)',[fixtureOrg.id,'pro',10,50000]),/forbidden/);
  assert.equal((await db.query('select plan from organizations')).rows[0].plan,'free');
  await db.exec("select set_config('audit.fixture_admin','true',false)");
  await db.query('select public.admin_update_organization($1::uuid,$2,$3,$4)',[fixtureOrg.id,'pro',10,50000]);
  assert.equal((await db.query('select plan from organizations')).rows[0].plan,'pro');
  const definition=(await db.query("select pg_get_functiondef('public.admin_update_organization(uuid,text,int,int)'::regprocedure) as body")).rows[0].body;
  assert.equal(/insert\s+into/i.test(definition),false); // external triggers/logging not simulated or claimed absent
});
test('REPRODUCTION V1-ENT-02: actual admin action sends video quota argument absent from migration RPC signature',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec(`create role authenticated;create table organizations(id uuid primary key,name text,plan text,accounts_quota int,monthly_message_quota int,updated_at timestamptz);
    create function public.is_platform_admin() returns boolean language sql as $$select true$$;`);
  const sql=source('master','supabase/migrations/20260905150000_jobs_cancel_admin_org.sql');
  await db.exec(sql.slice(sql.indexOf('create or replace function public.admin_update_organization')));
  let params;
  const action=load('master','apps/admin/src/app/org-actions.ts',{
    'next/cache':{revalidatePath:()=>{}},'next/headers':{headers:()=>{}},'@wa/shared':load('master','packages/shared/src/plans.ts'),
    '@/lib/platform':{requirePlatformAdmin:async()=>({supabase:{rpc:async(_name,p)=>{params=p;
      try{await db.query('select public.admin_update_organization(p_org_id=>$1::uuid,p_plan=>$2,p_accounts_quota=>$3::int,p_monthly_message_quota=>$4::int,p_monthly_video_quota=>$5::int)',[p.p_org_id,p.p_plan,p.p_accounts_quota,p.p_monthly_message_quota,p.p_monthly_video_quota]);return {data:{},error:null};}catch(error){return {data:null,error};}
    }}})},'@/lib/supabase/service':{createSupabaseServiceClient:()=>{},siteOriginFromEnv:()=>''}
  },{}, {FormData});
  const form=new FormData();for(const [k,v] of Object.entries({org_id:fixtureOrg.id,plan:'pro',accounts_quota:'10',monthly_message_quota:'50000',monthly_video_quota:'3'}))form.set(k,v);
  const result=await action.updateOrganizationQuotas(null,form);
  assert.equal(params.p_monthly_video_quota,3);assert.ok(result.error.includes('does not exist'));
});
