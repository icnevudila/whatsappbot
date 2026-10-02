import assert from 'node:assert/strict'
import test from 'node:test'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { inlineReference, submitImageJob, readImageJob, ImageJobPendingError, ImageJobFailedError, ImageJobReconciliationError, ImageSubmissionUncertainError } from '../apps/customer/src/lib/ai/omnistudio-image-job'
import { inspectImageOutput, ImageOutputInvalidError } from '../apps/customer/src/lib/ai/image-output'
import { DirectImageReconciliationError, generateImage } from '../apps/customer/src/lib/ai/image'
import { createServer } from 'node:http'

const originalFetch = global.fetch
test.afterEach(() => { global.fetch = originalFetch })
const receipt = { id:'job-one', gatewayUrl:'https://gateway.test', queuedAt:'2026-10-01T00:00:00Z' }
test('async submission is short and preserves request identity, references and kit', async () => {
  let request: Record<string, unknown> = {}
  global.fetch = async (_url, options) => { request = JSON.parse(String(options?.body)); return Response.json({job_id:'job-one'},{status:202}) }
  const refs = [inlineReference({data:Buffer.from('canonical'),mimeType:'image/webp',role:'product'})]
  const job = await submitImageJob('https://gateway.test',{requestId:'stable',tenantId:'a',referenceImages:refs,brandKit:{name:'a'}})
  assert.equal(job.id,'job-one'); assert.equal(request.async,true); assert.equal(request.requestId,'stable')
  assert.deepEqual(request.referenceImages,refs); assert.deepEqual(request.brandKit,{name:'a'})
  assert.equal(refs[0].sha256.length,64)
})
test('pending and lost observation do not start another generation', async () => {
  let calls = 0
  global.fetch = async () => { calls++; return Response.json({status:'processing'}) }
  assert.equal(await readImageJob(receipt,'a'),null); assert.equal(calls,1)
  global.fetch = async () => Response.json({error:'unknown'},{status:404})
  await assert.rejects(readImageJob(receipt),ImageJobPendingError)
})
test('terminal provider failure is distinct from a transient polling failure', async () => {
  global.fetch = async () => Response.json({status:'failed',error:'REFERENCE_ATTACHMENT_FAILED'})
  await assert.rejects(readImageJob(receipt),ImageJobFailedError)
})
test('download validates HTTP/MIME and records real PNG dimensions', async () => {
  const png = await sharp({create:{width:1024,height:1536,channels:3,background:'#ff6633'}}).png().toBuffer()
  global.fetch = async url => String(url).includes('/status/') ? Response.json({status:'completed',result_url:'https://output.test/a.png',result_sha256:createHash('sha256').update(png).digest('hex')}) : new Response(png,{headers:{'content-type':'image/png'}})
  const image = await readImageJob(receipt)
  assert.equal(image?.width,1024); assert.equal(image?.height,1536)
  global.fetch = async url => String(url).includes('/status/') ? Response.json({status:'completed',result_url:'https://output.test/a.png',result_sha256:createHash('sha256').update(png).digest('hex')}) : new Response('error',{status:502})
  await assert.rejects(readImageJob(receipt),ImageJobPendingError)
})

test('completed without byte hash remains unapproved reconciliation, not a new generation', async () => {
  let calls = 0
  global.fetch = async () => { calls++; return Response.json({status:'completed',result_url:'https://output.test/a.png'}) }
  await assert.rejects(readImageJob(receipt), ImageJobReconciliationError)
  assert.equal(calls, 1)
})
test('PNG/JPEG/WebP dimensions come from decodable bytes; header-only files fail', async()=>{
  for (const format of ['png','jpeg','webp'] as const) {
    const data = await sharp({create:{width:1254,height:1254,channels:3,background:'#ff6633'}}).toFormat(format).toBuffer()
    const measured=await inspectImageOutput(data)
    assert.equal(measured.width,1254); assert.equal(measured.height,1254)
    assert.equal(measured.mimeType,format==='jpeg'?'image/jpeg':`image/${format}`)
  }
  const corrupt=Buffer.alloc(40); Buffer.from([137,80,78,71,13,10,26,10]).copy(corrupt); corrupt.write('IHDR',12); corrupt.writeUInt32BE(1024,16); corrupt.writeUInt32BE(1536,20)
  await assert.rejects(inspectImageOutput(corrupt),ImageOutputInvalidError)
})
test('EXIF display rotation is measured without modifying original output',async()=>{
  const data=await sharp({create:{width:40,height:60,channels:3,background:'#ff6633'}}).jpeg().withMetadata({orientation:6}).toBuffer()
  const originalHash=createHash('sha256').update(data).digest('hex')
  const measured=await inspectImageOutput(data)
  assert.equal(measured.width,60); assert.equal(measured.height,40)
  assert.equal(createHash('sha256').update(data).digest('hex'),originalHash)
})
test('reconciliation is not an endless pending state or automatic re-render',async()=>{
  let posts=0
  global.fetch=async(_url, options)=>{if(options?.method==='POST') posts++; return Response.json({status:'reconciliation_required'})}
  await assert.rejects(readImageJob(receipt,'a'),ImageJobReconciliationError)
  assert.equal(posts,0)
})
test('a completed job hash mismatch retries download only',async()=>{
  const png=await sharp({create:{width:40,height:60,channels:3,background:'#ff6633'}}).png().toBuffer()
  global.fetch=async url=>String(url).includes('/status/')?Response.json({status:'completed',result_url:'https://output.test/a.png',result_sha256:'0'.repeat(64)}):new Response(png,{headers:{'content-type':'image/png'}})
  await assert.rejects(readImageJob(receipt,'a'),ImageJobPendingError)
})
test('uncertain-submission recovery never falls back while gateway is offline',async()=>{
  let calls=0
  global.fetch=async()=>{calls++; throw new Error('gateway down')}
  await assert.rejects(generateImage('test','1:1',null,[],{requestId:'stable',tenantId:'a',recoveringSubmission:true}),ImageSubmissionUncertainError)
  assert.equal(calls,1)
})
test('accepted image is persisted before returning pending and cannot fall through to another provider', async () => {
  let posts = 0; let saved = ''
  global.fetch = async (url,options) => {
    if (String(url).endsWith('/health')) return Response.json({status:'online'})
    if (options?.method === 'POST') { posts++; return Response.json({job_id:'job-one'},{status:202}) }
    throw new Error('Unexpected second provider or polling request')
  }
  await assert.rejects(generateImage('test','9:16',{preferredImageProvider:'omnistudio'},[],{tenantId:'a',requestId:'stable',enqueueOnly:true,onQueued:async job=>{saved=job.id}}),ImageJobPendingError)
  assert.equal(saved,'job-one'); assert.equal(posts,1)
})
test('excess references cannot silently drop the logo', async () => {
  await assert.rejects(generateImage('test','1:1',null,Array.from({length:5},()=>({data:Buffer.from('x'),mimeType:'image/png'}))),/referans/)
})
test('an ambiguous submit cannot silently fall through to another paid provider',async()=>{
  let posts=0
  global.fetch=async(url,options)=>{
    if(String(url).endsWith('/health')) return Response.json({status:'online'})
    if(options?.method==='POST') { posts++; throw new Error('Connection lost after sending the body') }
    throw new Error('Unexpected fallback request')
  }
  await assert.rejects(generateImage('test','1:1',{preferredImageProvider:'omnistudio'},[],{requestId:'stable',tenantId:'a'}),ImageSubmissionUncertainError)
  assert.equal(posts,1)
})
test('durable intent must commit before any external production POST',async()=>{
  const sequence:string[]=[]
  global.fetch=async(url,options)=>{
    if(String(url).endsWith('/health')) return Response.json({status:'online'})
    if(options?.method==='POST') {sequence.push('post'); return Response.json({job_id:'job-one'},{status:202})}
    throw new Error('Unexpected request')
  }
  await assert.rejects(generateImage('test','1:1',{preferredImageProvider:'omnistudio'},[],{
    requestId:'stable',enqueueOnly:true,onSubmitting:async intent=>{assert.equal(intent.requestId,'stable'); sequence.push('commit')},
  }),ImageJobPendingError)
  assert.deepEqual(sequence,['commit','post'])
  sequence.length=0
  await assert.rejects(generateImage('test','1:1',{preferredImageProvider:'omnistudio'},[],{
    requestId:'stable',onSubmitting:async()=>{sequence.push('failed-commit');throw new Error('DB unavailable')},
  }),ImageSubmissionUncertainError)
  assert.deepEqual(sequence,['failed-commit'])
})
test('lost receipt persistence recovers on original gateway with identical key',async()=>{
  const posts:Array<{url:string;key:string}>=[]
  let committed=''
  global.fetch=async(url,options)=>{
    if(String(url).endsWith('/health')) return Response.json({status:'online'})
    if(options?.method==='POST') {posts.push({url:String(url),key:JSON.parse(String(options.body)).requestId});return Response.json({job_id:'same-job'},{status:202})}
    throw new Error('Unexpected fallback')
  }
  const metadata={requestId:'stable-original',submissionGatewayUrl:'https://original.test',enqueueOnly:true,
    onSubmitting:async(intent:{requestId:string})=>{committed=intent.requestId},onQueued:async()=>{throw new Error('DB offline after acceptance')}}
  await assert.rejects(generateImage('test','1:1',{preferredImageProvider:'omnistudio'},[],metadata),ImageJobPendingError)
  assert.equal(committed,'stable-original')
  await assert.rejects(generateImage('test','1:1',null,[],{...metadata,recoveringSubmission:true}),ImageJobPendingError)
  assert.deepEqual(posts,[{url:'https://original.test/v1/images/generations',key:'stable-original'},{url:'https://original.test/v1/images/generations',key:'stable-original'}])
})
test('reference-dependent jobs never call providers that ignore reference bytes',async()=>{
  const calls:string[]=[]
  global.fetch=async url=>{calls.push(String(url));throw new Error('offline')}
  await assert.rejects(generateImage('product','1:1',{preferredImageProvider:'cloudflare',cloudflareAccountId:'test',cloudflareApiToken:'test'},[{data:Buffer.from('reference'),mimeType:'image/png',role:'product'}]))
  assert.equal(calls.some(url=>url.includes('cloudflare')||url.includes('pollinations')),false)
  calls.length=0
  await assert.rejects(generateImage('product','1:1',{preferredImageProvider:'openai',openaiApiKey:'test',openaiImageModel:'dall-e-3'},[{data:Buffer.from('reference'),mimeType:'image/png',role:'product'}]))
  assert.equal(calls.some(url=>url.includes('/images/generations')),false)
})
test('HTTP acceptance followed by socket loss recovers one job using persisted intent',async()=>{
  global.fetch=originalFetch
  const jobs=new Map<string,string>(); let productions=0; let posts=0
  const server=createServer(async(req,res)=>{
    if(req.url==='/health') {res.writeHead(200,{'content-type':'application/json'});res.end('{}');return}
    const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk))
    const body=JSON.parse(Buffer.concat(chunks).toString());posts++
    if(!jobs.has(body.requestId)){jobs.set(body.requestId,`job-${++productions}`)}
    if(posts===1){req.socket.destroy();return}
    res.writeHead(202,{'content-type':'application/json'});res.end(JSON.stringify({job_id:jobs.get(body.requestId)}))
  })
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  const address=server.address();assert.ok(address&&typeof address!=='string')
  const gateway=`http://127.0.0.1:${address.port}`
  let durableIntent:{requestId:string;gatewayUrl:string}|undefined
  try{
    const metadata={requestId:'tenant:creative:initial',submissionGatewayUrl:gateway,enqueueOnly:true,
      onSubmitting:async(intent:{requestId:string;gatewayUrl:string})=>{durableIntent=intent}}
    await assert.rejects(generateImage('product','1:1',{preferredImageProvider:'omnistudio'},[],metadata),ImageSubmissionUncertainError)
    assert.ok(durableIntent)
    await assert.rejects(generateImage('product','1:1',null,[],{...metadata,requestId:durableIntent.requestId,submissionGatewayUrl:durableIntent.gatewayUrl,recoveringSubmission:true}),ImageJobPendingError)
    assert.equal(posts,2);assert.equal(productions,1)
  }finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
})
test('direct Gemini/OpenAI POST failure never falls to another paid provider',async()=>{
  for(const provider of ['gemini','openai'] as const){
    let posts=0;const events:string[]=[]
    global.fetch=async(_url,options)=>{if(options?.method==='POST'){events.push('post');posts++;throw new Error('accepted then disconnected')}throw new Error('unexpected fallback')}
    await assert.rejects(generateImage('test','1:1',{preferredImageProvider:provider,geminiApiKey:'test',openaiApiKey:'test'},[],{
      requestId:'stable',onDirectSubmitting:async intent=>{assert.equal(intent.provider,provider);events.push('durable')},
    }),DirectImageReconciliationError)
    assert.equal(posts,1);assert.deepEqual(events,['durable','post'])
  }
})
test('direct intent persistence failure prevents every paid call',async()=>{
  let calls=0;global.fetch=async()=>{calls++;throw new Error('must not call')}
  await assert.rejects(generateImage('test','1:1',{preferredImageProvider:'gemini',geminiApiKey:'test'},[],{
    requestId:'stable',onDirectSubmitting:async()=>{throw new Error('DB lost')},
  }),DirectImageReconciliationError)
  assert.equal(calls,0)
})
test('direct success bytes remain available and malformed successful replies do not regenerate',async()=>{
  const png=await sharp({create:{width:40,height:60,channels:3,background:'#ff6633'}}).png().toBuffer()
  let calls=0
  global.fetch=async()=>{calls++;return Response.json({data:[{b64_json:png.toString('base64')}]})}
  const result=await generateImage('test','1:1',{preferredImageProvider:'openai',openaiApiKey:'test'},[],{requestId:'stable',onDirectSubmitting:async()=>{}})
  assert.equal(result.image.width,40);assert.deepEqual(result.image.data,png);assert.equal(calls,1)
  calls=0;global.fetch=async()=>{calls++;return new Response('bad json',{status:200})}
  await assert.rejects(generateImage('test','1:1',{preferredImageProvider:'openai',openaiApiKey:'test'},[],{requestId:'stable'}),DirectImageReconciliationError)
  assert.equal(calls,1)
})
