import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {readImageJob,submitImageJob,ImageJobReconciliationError,ImageJobPendingError} from './omnistudio-image-job'
test('provider receipt and real output contract remain bound to the exact image job',async t=>{
  const original = globalThis.fetch
  const bytes = await sharp({create:{width:24,height:18,channels:3,background:'#168347'}}).png().toBuffer()
  const job = {id:'job-a',gatewayUrl:'https://fixture.invalid',queuedAt:'2026-10-03T12:00:00Z',expectedReferenceCount:2}
  const reference = {job_id:'job-a',worker_id:'worker-a',target_id:'target-a',conversation_owner_job_id:'job-a',expected_reference_count:2,resolved_reference_count:2,uploaded_reference_count:2,composer_attachment_count:2,attachments_ready_at:'2026-10-03T12:00:00Z'}
  const result = {status:'completed',result_url:'https://fixture.invalid/output.png',result_sha256:createHash('sha256').update(bytes).digest('hex'),expected_reference_count:2,reference_receipt:reference}
  try {
    await t.test('two owned references and exact decoded output pass',async()=>{
      globalThis.fetch = async input=>String(input).includes('/status/') ? Response.json(result) : new Response(bytes,{headers:{'content-type':'image/png'}})
      const image = await readImageJob(job,'tenant-a')
      assert.equal(image?.width,24);assert.equal(image?.height,18);assert.deepEqual(image?.referenceReceipt,reference)
    })
    await t.test('missing, mismatched count or foreign receipt fails before downloading artifact',async()=>{
      for(const changed of [{reference_receipt:null},{expected_reference_count:1},{reference_receipt:{...reference,job_id:'job-b'}}]){
        let downloads=0
        globalThis.fetch = async input=>{if(!String(input).includes('/status/')) downloads++;return Response.json({...result,...changed})}
        await assert.rejects(readImageJob(job,'tenant-a'),ImageJobReconciliationError)
        assert.equal(downloads,0)
      }
    })
    await t.test('wrong output SHA or oversized artifact cannot become a ready image',async()=>{
      globalThis.fetch = async input=>String(input).includes('/status/') ? Response.json({...result,result_sha256:'a'.repeat(64)}) : new Response(bytes,{headers:{'content-type':'image/png'}})
      await assert.rejects(readImageJob(job,'tenant-a'),ImageJobPendingError)
      globalThis.fetch = async input=>String(input).includes('/status/') ? Response.json(result) : new Response(bytes,{headers:{'content-type':'image/png','content-length':String(33*1024*1024)}})
      await assert.rejects(readImageJob(job,'tenant-a'),ImageJobPendingError)
    })
    await t.test('malformed independent expected count performs zero provider submits',async()=>{
      let calls=0;globalThis.fetch=async()=>{calls++;throw new Error('unexpected request')}
      await assert.rejects(submitImageJob(job.gatewayUrl,{expected_reference_count:'2'}),/REFERENCE_ATTACHMENT_FAILED/)
      assert.equal(calls,0)
    })
    await t.test('401/403 auth errors throw terminal ImageJobFailedError, never ImageJobPendingError',async()=>{
      globalThis.fetch = async () => new Response('Unauthorized', { status: 401 })
      await assert.rejects(readImageJob(job, 'tenant-a'), (err: any) => err.name === 'ImageJobFailedError' && err.message.includes('401/403'))
      globalThis.fetch = async () => new Response('Forbidden', { status: 403 })
      await assert.rejects(readImageJob(job, 'tenant-a'), (err: any) => err.name === 'ImageJobFailedError' && err.message.includes('401/403'))
    })
    await t.test('404 missing job and 500 server error throw ImageJobReconciliationError, never ImageJobPendingError',async()=>{
      globalThis.fetch = async () => new Response('Not Found', { status: 404 })
      await assert.rejects(readImageJob(job, 'tenant-a'), ImageJobReconciliationError)
      globalThis.fetch = async () => new Response('Server Error', { status: 500 })
      await assert.rejects(readImageJob(job, 'tenant-a'), ImageJobReconciliationError)
    })
  } finally {globalThis.fetch=original}
})
