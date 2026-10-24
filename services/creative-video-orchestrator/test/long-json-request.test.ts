import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {postGenerationJson} from '../src/adapters/long-json-request.js'

test('delayed engine response is collected without a second generation POST', async()=>{
 let submissions=0
 const server=createServer((_req,res)=>{submissions++;setTimeout(()=>{res.writeHead(200,{'content-type':'application/json'});res.end('{"verified":true}')},40)})
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
  const address=server.address() as {port:number}
  const response=await postGenerationJson(`http://127.0.0.1:${address.port}`,{job_id:'one'},AbortSignal.timeout(1000))
  assert.deepEqual(await response.json(),{verified:true})
  assert.equal(submissions,1)
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
test('deadline aborts one pending request and never resubmits',async()=>{
 let submissions=0
 const server=createServer(()=>{submissions++})
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
 try{
  const address=server.address() as {port:number}
  await assert.rejects(postGenerationJson(`http://127.0.0.1:${address.port}`,{},AbortSignal.timeout(80)))
  assert.equal(submissions,1)
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()))}
})
