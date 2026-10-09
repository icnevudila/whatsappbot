import type { SupabaseClient } from '@supabase/supabase-js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVideoCatalogReferences } from './video-catalog-references'

// Execute tenant-scoped queries against records belonging to two distinct tenants.
function catalog() {
  const rows: Record<string, Record<string, unknown>[]> = {
    org_products:[{org_id:'tenant-a',id:'product-a',is_active:true,name:'Pompa',description:'16 litre'},
      {org_id:'tenant-b',id:'product-b',is_active:true,name:'Tuğla',description:'Kil'}],
    org_product_images:[{org_id:'tenant-a',product_id:'product-a',public_url:'https://assets.invalid/pompa.png'},
      {org_id:'tenant-b',product_id:'product-b',public_url:'https://assets.invalid/tugla.png'}],
    organizations:[{id:'tenant-a',logo_path:'https://assets.invalid/a.png'},{id:'tenant-b',logo_path:'https://assets.invalid/b.png'}],
    brand_kits:[],
  }
  const client = {from(table:string) {
    const filters: Array<[string,unknown]> = []
    return {select(){return this},eq(key:string,value:unknown){filters.push([key,value]);return this},
      order(){return this},limit(){return this},async maybeSingle(){
        assert.ok(filters.some(([key,value]) => key === (table === 'organizations' ? 'id':'org_id') && value === 'tenant-a'), 'every lookup must scope the authenticated tenant')
        return {data:rows[table].find(row=>filters.every(([key,value])=>row[key]===value)) || null,error:null}
      }}
  }}
  return { rows, supabase: client as unknown as SupabaseClient }
}
const input={productId:'product-a',logoUrl:'https://assets.invalid/a.png',productUrl:'https://assets.invalid/pompa.png'}

test('foreign product cannot be published even when the caller supplies its valid public image URL',async()=>{
  const fixture=catalog()
  await assert.rejects(loadVideoCatalogReferences(fixture.supabase,'tenant-a',{
    ...input,productId:'product-b',productUrl:'https://assets.invalid/tugla.png',
  }),{code:'PRODUCT_NOT_IN_ORG',status:403})
})
test('a same-tenant product cannot borrow another product or tenant image',async()=>{
  await assert.rejects(loadVideoCatalogReferences(catalog().supabase,'tenant-a',{
    ...input,productUrl:'https://assets.invalid/tugla.png',
  }),{code:'ASSET_REFERENCE_CHANGED',status:409})
})
test('canonical catalog assets and facts are returned for the selected product',async()=>{
  const value=await loadVideoCatalogReferences(catalog().supabase,'tenant-a',input)
  assert.equal(value.product.name,'Pompa')
  assert.equal(value.productUrl,input.productUrl)
  assert.equal(value.logoUrl,input.logoUrl)
})
test('persisted branding file is not accepted as a product reference',async()=>{
  const fixture=catalog()
  fixture.rows.org_product_images[0].public_url='/brand/logo.png'
  await assert.rejects(loadVideoCatalogReferences(fixture.supabase,'tenant-a',{
    ...input,productUrl:'/brand/logo.png',
  }),{code:'PRODUCT_REFERENCE_IS_LOGO'})
})

test('selected foreign brand kit fails closed instead of falling back to default branding',async()=>{
  const fixture=catalog()
  fixture.rows.brand_kits.push({org_id:'tenant-b',id:'kit-b',logo_path:'https://assets.invalid/b.png'})
  await assert.rejects(loadVideoCatalogReferences(fixture.supabase,'tenant-a',{...input,brandKitId:'kit-b'}),{code:'BRAND_KIT_NOT_IN_ORG',status:403})
})
test('selected tenant kit controls the canonical logo and persisted campaign identity',async()=>{
  const fixture=catalog()
  fixture.rows.brand_kits.push({org_id:'tenant-a',id:'kit-a',name:'Alt marka',logo_path:'https://assets.invalid/subbrand.png'})
  const result=await loadVideoCatalogReferences(fixture.supabase,'tenant-a',{...input,brandKitId:'kit-a',logoUrl:'https://assets.invalid/subbrand.png'})
  assert.equal(result.logoUrl,'https://assets.invalid/subbrand.png')
  assert.equal(result.kit?.id,'kit-a')
})
