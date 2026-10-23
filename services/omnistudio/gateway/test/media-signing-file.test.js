'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {signMediaAccess,verifyMediaAccess}=require('../public_output_access');
test('persisted dedicated signing secret supports restart-safe media delivery without a gateway master token', t=>{
 const saved={media:process.env.MEDIA_SIGNING_SECRET,gateway:process.env.OMNISTUDIO_GATEWAY_TOKEN};
 delete process.env.MEDIA_SIGNING_SECRET; delete process.env.OMNISTUDIO_GATEWAY_TOKEN;
 const original=fs.readFileSync;
 t.mock.method(fs,'readFileSync',function(file,...args){
  if(String(file).endsWith('.media_signing_secret'))return 'dedicated-test-signing-secret';
  return original.call(this,file,...args);
 });
 try{
  const signature=signMediaAccess({filename:'output.png',tenantId:'tenant-a'});
  const result=verifyMediaAccess({req:{url:'/outputs/output.png?'+signature.queryString,headers:{}},filename:'output.png',ownerTenant:'tenant-a'});
  assert.equal(result.allowed,true);
  const proxy=verifyMediaAccess({req:{url:'/outputs/output.png?'+signature.queryString,headers:{'x-tenant-id':'tenant-a',authorization:'Bearer unrelated-api-key'}},filename:'output.png',ownerTenant:'tenant-a'});
  assert.equal(proxy.allowed,true);
  const spoof=verifyMediaAccess({req:{url:'/outputs/output.png?'+signature.queryString,headers:{'x-tenant-id':'tenant-b'}},filename:'output.png',ownerTenant:'tenant-a'});
  assert.equal(spoof.allowed,false);
  const wrong=verifyMediaAccess({req:{url:'/outputs/output.png?'+signature.queryString,headers:{}},filename:'output.png',ownerTenant:'tenant-b'});
  assert.equal(wrong.allowed,false);
  assert.equal(wrong.statusCode,403);
 }finally{
  if(saved.media===undefined)delete process.env.MEDIA_SIGNING_SECRET;else process.env.MEDIA_SIGNING_SECRET=saved.media;
  if(saved.gateway===undefined)delete process.env.OMNISTUDIO_GATEWAY_TOKEN;else process.env.OMNISTUDIO_GATEWAY_TOKEN=saved.gateway;
 }
});
