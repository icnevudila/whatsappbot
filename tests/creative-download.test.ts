import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import sharp from 'sharp'
import { serveCreativeDownload, signedGatewayDownload, downloadFilename, type DownloadDependencies, type DownloadCreative, type DownloadOutput } from '../apps/customer/src/lib/creative/download'
import { verifiedVideoResponse } from '../apps/customer/src/lib/creative/video-delivery'

const orgId='00000000-0000-4000-8000-000000000001', id='00000000-0000-4000-8000-000000000002', outputId='00000000-0000-4000-8000-000000000003'
const sha = (bytes:Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const request = (method='GET') => new Request(`https://app.invalid/api/creatives/${id}/download`,{method})
const image = async () => sharp({create:{width:24,height:24,channels:3,background:'#2f5bff'}}).png().toBuffer()
function fixture(bytes:Buffer, video=false) {
  let fetches=0, signatures=0
  const creative:DownloadCreative={id,org_id:orgId,title:'Türkçe marka / yeni reklam',status:'ready',format:video?'video':'square',
    storage_path:`${orgId}/image.png`,public_url:video?`/api/ai-media/outputs/${outputId}`:'https://unused.invalid/image.png',payload:{outputSha256:sha(bytes)}}
  const output:DownloadOutput={id:outputId,org_id:orgId,file_path:`/srv/outputs/${outputId}_finished.mp4`,storage_url:'https://unused.invalid/raw.mp4',
    sha256:sha(bytes),byte_size:bytes.length,verified:true,is_approved:true,duration_seconds:10,width:720,height:1280}
  const deps:DownloadDependencies={orgId,creative:async()=>creative,output:async()=>output,storageOrigin:'https://storage.invalid',gatewayOrigin:'https://gateway.invalid',
    mediaSigningSecret:randomBytes(32).toString('hex'),
    signStorage:async key=>{signatures++;return `https://storage.invalid/storage/v1/object/sign/creatives/${key}?token=fixture`},
    fetch:async url=>{fetches++;assert.ok(String(url).startsWith(video?'https://gateway.invalid/outputs/':'https://storage.invalid/storage/v1/object/sign/creatives/'));
      const response=new Response(new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=7)controller.enqueue(bytes.subarray(i,i+7));controller.close()}}),{headers:{'content-type':video?'video/mp4':'image/png','content-length':String(bytes.length)}})
      response.arrayBuffer=()=>{throw new Error('Upstream must not be buffered in RAM')};return response},
  }
  return {deps,creative,output,fetches:()=>fetches,signatures:()=>signatures}
}

test('Private image download preserves exact bytes/hash, MIME, safe UTF-8 attachment and no cache',async()=>{
  const bytes=await image(),f=fixture(bytes)
  const response=await serveCreativeDownload(request(),id,f.deps)
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/png')
  assert.match(response.headers.get('content-disposition')!,/^attachment; filename=/)
  assert.match(response.headers.get('content-disposition')!,/filename\*=UTF-8''/)
  assert.equal(response.headers.get('cache-control'),'private, no-store')
  assert.equal(response.headers.get('x-content-type-options'),'nosniff')
  assert.equal(sha(new Uint8Array(await response.arrayBuffer())),sha(bytes));assert.equal(f.fetches(),1)
})
test('Video streams exact approved FINAL identity; storage_url RAW alias never used',async()=>{
  const bytes=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(400)])
  const f=fixture(bytes,true),response=await serveCreativeDownload(request(),id,f.deps)
  assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'video/mp4')
  assert.equal(sha(new Uint8Array(await response.arrayBuffer())),f.output.sha256)
})
test('Gateway signature binds filename, exact tenant and expiration without master bearer exposure',()=>{
  const secret=randomBytes(32).toString('hex'),now=Date.now()
  const url=new URL(signedGatewayDownload('final_finished.mp4',orgId,'https://gateway.invalid',secret,now))
  assert.equal(url.searchParams.get('tid'),orgId)
  assert.equal(Number(url.searchParams.get('exp')),Math.floor(now/1000)+120)
  assert.match(url.searchParams.get('sig')!,/^[a-f0-9]{64}$/)
  assert.ok(!url.href.includes(secret))
  assert.throws(()=>signedGatewayDownload('file.mp4',orgId,'https://gateway.invalid',''))
  assert.throws(()=>signedGatewayDownload('/outputs/../other.mp4',orgId,'https://gateway.invalid',secret))
  assert.throws(()=>signedGatewayDownload('raw_video.mp4',orgId,'https://gateway.invalid',secret))
})
test('Foreign, missing, invalid IDs fail before storage signing or upstream request',async()=>{
  const f=fixture(await image());f.creative.org_id='foreign'
  assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,404)
  assert.equal((await serveCreativeDownload(request(),'invalid',f.deps)).status,400)
  f.deps.creative=async()=>null
  assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,404)
  assert.equal(f.signatures(),0);assert.equal(f.fetches(),0)
})
test('Storage namespace/path traversal and arbitrary signed destination fail closed',async()=>{
  const f=fixture(await image())
  for(const key of [`foreign/image.png`,`${orgId}/../image.png`,`${orgId}/%2e%2e/image.png`]) {
    f.creative.storage_path=key;assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,404)
  }
  f.creative.storage_path=`${orgId}/image.png`;f.deps.signStorage=async()=>`https://evil.invalid/storage/v1/object/sign/creatives/${orgId}/image.png`
  assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,502);assert.equal(f.fetches(),0)
})
test('Unapproved, foreign and RAW video outputs never fetch',async()=>{
  const f=fixture(Buffer.from('ftyp'),true)
  f.output.is_approved=false;assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,422)
  f.output.is_approved=true;f.output.org_id='foreign';assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,404)
  f.output.org_id=orgId;f.output.file_path='raw_video.mp4';assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,422)
  assert.equal(f.fetches(),0)
})
test('Hash mismatch, content-type mismatch and invalid image bytes never release attachment',async()=>{
  const f=fixture(await image());f.creative.payload={outputSha256:'0'.repeat(64)}
  const hashFailure=await serveCreativeDownload(request(),id,f.deps)
  assert.equal(hashFailure.status,502);assert.equal(hashFailure.headers.get('content-disposition'),null)
  f.deps.fetch=async()=>new Response('<html>login</html>',{headers:{'content-type':'text/html'}})
  assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,502)
  f.creative.payload={};f.deps.fetch=async()=>new Response('not a png',{headers:{'content-type':'image/png'}})
  assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,502)
})
test('Deleted upstream file and pending creative return actionable failure; HEAD has no body',async()=>{
  const f=fixture(await image());f.deps.fetch=async()=>new Response(null,{status:404})
  assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,404)
  f.creative.status='rendering';assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,409)
  const ready=fixture(await image()),head=await serveCreativeDownload(request('HEAD'),id,ready.deps)
  assert.equal(head.status,200);assert.equal(head.body,null)
})
test('Oversized upstream and mismatched persisted length fail before disk download',async()=>{
  const f=fixture(await image());f.deps.fetch=async()=>new Response(null,{headers:{'content-length':String(100*1024*1024)}})
  assert.equal((await serveCreativeDownload(request(),id,f.deps)).status,502)
  assert.ok(!/[\r\n"/\\]/.test(downloadFilename('unsafe\r\n"/name',id,'mp4')))
})
test('Existing playback byte ranges and seek semantics remain unchanged',async()=>{
  const bytes=Buffer.from('0123456789'),evidence={sha256:sha(bytes),byte_size:bytes.length}
  const range=verifiedVideoResponse(bytes,evidence,'bytes=2-4')
  assert.equal(range.status,206);assert.equal(range.headers.get('content-range'),'bytes 2-4/10');assert.equal(await range.text(),'234')
  assert.equal(await verifiedVideoResponse(bytes,evidence,'bytes=-3').text(),'789')
  assert.equal(verifiedVideoResponse(bytes,evidence,'bytes=999-1000').status,416)
  assert.equal(verifiedVideoResponse(bytes,{...evidence,sha256:'0'.repeat(64)}).status,502)
})

function routeHarness({user=true,anonymous=false,foreign=false,active=true,forgedAdmin=false}={}) {
  let mediaCalls=0, queries=0
  const filters:Array<[string,unknown]>=[]
  const db={auth:{getUser:async()=>({data:{user:user?{id:'session-user',is_anonymous:anonymous}:null},error:null})},
    from:()=>{queries++;return {select(){return this},eq(key:string,value:unknown){filters.push([key,value]);return this},maybeSingle:async()=>({data:null,error:null})}},
    storage:{from:()=>({createSignedUrl:async()=>({data:null,error:{}})})}}
  const exports:Record<string,any>={}
  const src=readFileSync('apps/customer/src/app/api/creatives/[creativeId]/download/route.ts','utf8')
  const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  vm.runInNewContext(js,{exports,Response,process:{env:{}},require:(name:string)=>{
    if(name==='@/lib/supabase/server') return {createSupabaseServerClient:async()=>db}
    if(name==='@/lib/org') return {requireActiveOrg:async()=>{if(!active)throw new Error('NO_ORGANIZATION');return {userId:foreign?'other':'session-user',org:{id:orgId},isPlatformAdmin:forgedAdmin}}}
    if(name==='@/lib/creative/download')return {serveCreativeDownload:async(req:Request,cid:string,deps:DownloadDependencies)=>{mediaCalls++;await deps.creative(cid);return new Response(null,{status:404})}}
    throw new Error('Unexpected route dependency '+name)
  },fetch})
  return {exports,filters,queries:()=>queries,mediaCalls:()=>mediaCalls}
}
test('Actual download route rejects anonymous/missing/mismatched sessions before any media query',async()=>{
  for(const state of [{user:false},{anonymous:true},{foreign:true}]) {
    const h=routeHarness(state),response=await h.exports.GET(request(),{params:Promise.resolve({creativeId:id})})
    assert.equal(response.status,401);assert.equal(h.queries(),0);assert.equal(h.mediaCalls(),0)
  }
})
test('Actual route requires active membership and scopes even platform-admin queries to active tenant',async()=>{
  const noOrg=routeHarness({active:false})
  assert.equal((await noOrg.exports.GET(request(),{params:Promise.resolve({creativeId:id})})).status,403)
  const admin=routeHarness({forgedAdmin:true})
  assert.equal((await admin.exports.GET(request(),{params:Promise.resolve({creativeId:id})})).status,404)
  assert.deepEqual(admin.filters,[['id',id],['org_id',orgId]])
})
