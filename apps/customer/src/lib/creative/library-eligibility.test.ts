import test from 'node:test'
import assert from 'node:assert/strict'
import { isLibraryCreativeEligible } from './library-eligibility'
const sha='a'.repeat(64)
const image={id:'image-a',org_id:'tenant-a',status:'ready',source:'ai',format:'image',public_url:'https://storage.invalid/tenant-a/image.png',storage_path:'tenant-a/image.png',payload:{imageOutputReceipt:{orgId:'tenant-a',creativeId:'image-a',decodedImage:true,sha256:sha,size:100,mimeType:'image/png',storagePath:'tenant-a/image.png'}}}
test('clean library requires owned decoded stored image; status alone cannot publish',()=>{
 assert.equal(isLibraryCreativeEligible(image,'tenant-a'),true)
 for(const changed of [{org_id:'tenant-b'},{status:'failed'},{public_url:' '},{storage_path:'tenant-b/image.png'},{payload:{}},{payload:{...image.payload,imageReconciliationRequired:true}}]) assert.equal(isLibraryCreativeEligible({...image,...changed},'tenant-a'),false)
})
test('V3 editorial review is advisory; decoded tenant-bound bytes still required',()=>{
 const payload={...image.payload,creativeDirectorVersion:'V3',imageHumanReview:{source:'CUSTOMER_EXPLICIT_REVIEW',identityConfirmed:true,commerceConfirmed:true,reviewerId:'reviewer-a',reviewedAt:'2026-10-10T10:00:00Z',sha256:sha}}
 assert.equal(isLibraryCreativeEligible({...image,payload},'tenant-a'),true)
 assert.equal(isLibraryCreativeEligible({...image,payload:{...payload,imageHumanReview:{...payload.imageHumanReview,sha256:'b'.repeat(64)}}},'tenant-a'),true)
})
test('legacy MP4 and missing output state fail closed; approved owned output passes',()=>{
 const video={...image,format:'video',public_url:'/api/ai-media/outputs/00000000-0000-0000-0000-000000000001'}
 assert.equal(isLibraryCreativeEligible(video,'tenant-a'),false)
 assert.equal(isLibraryCreativeEligible(video,'tenant-a',{status:'needs_review'}),false)
 assert.equal(isLibraryCreativeEligible(video,'tenant-a',{status:'ready'}),true)
 assert.equal(isLibraryCreativeEligible({...video,org_id:'tenant-b'},'tenant-a',{status:'ready'}),false)
})

test('editorial status does not hide technically validated media; invalid bytes remain blocked',()=>{
 assert.equal(isLibraryCreativeEligible({...image,status:'needs_review'},'tenant-a'),true)
 assert.equal(isLibraryCreativeEligible({...image,status:'needs_review',payload:{...image.payload,imageOutputReceipt:{...image.payload.imageOutputReceipt,decodedImage:false}}},'tenant-a'),false)
})
