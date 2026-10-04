'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {validateHistoricalDirectorInput,assertHistoricalDirectorReceipt}=require('../historical_video_director_contract.js');
const org='afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc';
function ref(role,id,byte){const bytes=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.from([byte])]);return {role,asset_id:id,org_id:org,mimeType:'image/png',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),data:'data:image/png;base64,'+bytes.toString('base64')};}
function body(){return {org_id:org,job_id:'b36d86ad-6e65-441f-bd29-0de8d36d9948',attempt_id:'58c2675f-95e5-4e8b-9d0f-a9b67be1a850',prompt:'Historical prompt '.repeat(20),expected_reference_count:2,references:[ref('product','b68d4eb9-7cc0-491e-9ece-84b8c01068b1',1),ref('logo','cd4ce662-eede-48a0-ba71-80433a61a842',2)]};}
test('director accepts only two owned hash-verified canonical image roles',()=>assert.equal(validateHistoricalDirectorInput(body()).length,2));
test('director rejects missing logo, extra asset, wrong role and unowned reference',()=>{
 for(const change of [b=>b.references.pop(),b=>b.references.push(b.references[0]),b=>b.references[1].role='environment',b=>b.references[1].org_id=b.job_id]){const b=body();change(b);assert.throws(()=>validateHistoricalDirectorInput(b));}
});
test('director fails closed on changed bytes and identical canonical assets',()=>{
 const b=body();b.references[0].sha256='0'.repeat(64);assert.throws(()=>validateHistoricalDirectorInput(b),/SHA_MISMATCH/);
 const duplicate=body();duplicate.references[1]={...duplicate.references[0],role:'logo'};assert.throws(()=>validateHistoricalDirectorInput(duplicate),/INVALID_REFERENCE_PAIR/);
});
test('physical receipt must match both exact asset ids, roles and hashes',()=>{
 const b=body();const receipt={org_id:org,composer_attachment_count:2,uploaded_reference_count:2,references:b.references.map(({role,asset_id,sha256})=>({role,asset_id,sha256}))};
 assert.doesNotThrow(()=>assertHistoricalDirectorReceipt(receipt,b.references,org));
 assert.throws(()=>assertHistoricalDirectorReceipt({...receipt,composer_attachment_count:1},b.references,org));
 receipt.references[0].sha256='0'.repeat(64);assert.throws(()=>assertHistoricalDirectorReceipt(receipt,b.references,org),/REFERENCE_MISMATCH/);
});
