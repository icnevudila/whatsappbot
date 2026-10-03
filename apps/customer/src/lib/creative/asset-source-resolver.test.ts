import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { resolveAssetSource } from './asset-source-resolver.js'

test('canonical source matrix runs offline with decoded byte identity', async t => {
  const bytes = await sharp({create:{width:24,height:18,channels:3,background:'#168347'}}).png().toBuffer()
  const hash = createHash('sha256').update(bytes).digest('hex')
  const original = globalThis.fetch
  const calls: string[] = []
  globalThis.fetch = async input => {
    const url = String(input); calls.push(url)
    if(url.includes('missing')) return new Response(null,{status:404})
    return new Response(url.includes('corrupt') ? Buffer.alloc(100,65) : bytes,{headers:{'content-type':'image/png'}})
  }
  try {
    for(const [source,kind] of [
      ['https://fixture.invalid/product.png','absolute_url'],
      ['/outputs/offline-fixture.png','gateway_output'],
      ['/brand/offline-fixture.png','public_brand'],
      ['/logos/offline-fixture.png','public_logo'],
      ['/api/media-proxy?file=offline-fixture.png','gateway_output'],
    ]) await t.test(kind+' '+source,async()=>{
      const asset = await resolveAssetSource(source)
      assert.ok(asset); assert.equal(asset.sourceType,kind)
      assert.equal(asset.sha256,hash); assert.equal(asset.decode,'success')
      assert.equal(asset.width,24); assert.equal(asset.height,18)
    })
    for(const bucket of ['brand-assets','creatives']) await t.test('storage '+bucket,async()=>{
      const downloaded: string[] = []
      const storage = {storage:{from:(selected:string)=>({
        download:async(key:string)=>{downloaded.push(selected+'/'+key);return {data:new Blob([bytes]),error:null}},
        getPublicUrl:(key:string)=>({data:{publicUrl:'https://fixture.invalid/'+selected+'/'+key}}),
      })}}
      const tenant = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      const asset = await resolveAssetSource(bucket+'/'+tenant+'/product.png',{tenantId:tenant,supabase:storage as never})
      assert.equal(asset?.sourceType,'storage'); assert.equal(asset?.sha256,hash)
      assert.deepEqual(downloaded,[bucket+'/'+tenant+'/product.png'])
    })
    await t.test('negative inputs and cross-tenant namespace',async()=>{
      for(const source of [null,undefined,'','/brand/%2e%2e/private.png','/outputs/../private.png','/api/media-proxy?file=..%2Fprivate.png','/api/media-proxy?file=%zz','https://fixture.invalid/corrupt.png','/brand/missing-fixture.png'])
        assert.equal(await resolveAssetSource(source),null,String(source))
      const before = calls.length
      await assert.rejects(resolveAssetSource('creatives/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/product.png',{
        tenantId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      }),/CROSS_ORG_CONTAMINATION/)
      assert.equal(calls.length,before)
    })
    await t.test('explicit missing bucket cannot silently load another asset',async()=>{
      const buckets: string[] = []
      const storage = {storage:{from:(bucket:string)=>({
        download:async()=>{buckets.push(bucket);return {data:null,error:new Error('missing')}},
      })}}
      assert.equal(await resolveAssetSource('creatives/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/product.png',{
        tenantId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',supabase:storage as never,
      }),null)
      assert.deepEqual(buckets,['creatives'])
    })
    await t.test('nested output identity and symlink containment',async()=>{
      const directory = mkdtempSync(path.join(tmpdir(),'canonical-output-test-'))
      const outside = mkdtempSync(path.join(tmpdir(),'canonical-outside-test-'))
      const priorCwd = process.cwd()
      try {
        mkdirSync(path.join(directory,'outputs','nested'),{recursive:true})
        writeFileSync(path.join(directory,'outputs','nested','product.png'),bytes)
        writeFileSync(path.join(directory,'outputs','product.png'),Buffer.alloc(100,65))
        writeFileSync(path.join(outside,'private.png'),bytes)
        symlinkSync(outside,path.join(directory,'outputs','missing-escape'),'junction')
        process.chdir(directory)
        assert.equal((await resolveAssetSource('/outputs/nested/product.png'))?.sha256,hash)
        assert.equal(await resolveAssetSource('/outputs/missing-escape/private.png'),null)
      } finally {
        process.chdir(priorCwd)
        rmSync(directory,{recursive:true,force:true})
        rmSync(outside,{recursive:true,force:true})
      }
    })
    await t.test('approved filesystem source rejects paths outside operator roots',async()=>{
      const directory = mkdtempSync(path.join(tmpdir(),'canonical-asset-test-'))
      const prior = process.env.MEDIA_ASSET_FILESYSTEM_ROOTS
      try {
        const file = path.join(directory,'product.png')
        writeFileSync(file,bytes)
        process.env.MEDIA_ASSET_FILESYSTEM_ROOTS = directory
        const asset = await resolveAssetSource(file)
        assert.equal(asset?.sourceType,'filesystem'); assert.equal(asset?.sha256,hash)
        assert.equal(await resolveAssetSource(process.execPath),null)
      } finally {
        if(prior === undefined) delete process.env.MEDIA_ASSET_FILESYSTEM_ROOTS
        else process.env.MEDIA_ASSET_FILESYSTEM_ROOTS = prior
        rmSync(directory,{recursive:true,force:true})
      }
    })
  } finally { globalThis.fetch = original }
})
