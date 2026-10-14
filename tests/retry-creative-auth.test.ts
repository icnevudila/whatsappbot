import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { randomBytes } from 'node:crypto'

test('the actual retry action retains the authenticated tenant client for background logo resolution',async()=>{
  const source=readFileSync('apps/customer/src/app/(panel)/icerik/actions.ts','utf8')
  const start=source.indexOf('export async function retryCreative(')
  const action=source.slice(start,source.indexOf('export async function reconcileCreative(',start))
  const kicked:any[]=[]
  const supabase={from:()=>{
    let updated=false
    const query:any={select:()=>query,eq:()=>query,update:()=>{updated=true;return query},
      maybeSingle:async()=>({data:updated?{id:'owned'}:{id:'owned',status:'failed',source:'ai',format:'square',payload:{},error:'logo unavailable'},error:null})}
    return query
  }}
  const context={userId:'user-a',org:{id:'tenant-a',role:'owner'},supabase}
  const runtime:any={exports:{},requireActiveOrg:async()=>context,isOrgAdminRole:()=>true,
    isUncertainImageFailure:()=>false,randomBytes,revalidateLibrary:()=>{},
    kickGeneration:async(...args:any[])=>{kicked.push(args);return null}}
  vm.runInNewContext(ts.transpileModule(action,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,runtime)
  assert.ok((await runtime.exports.retryCreative('owned')).ok)
  assert.equal(kicked.length,1)
  assert.equal(kicked[0][1]?.supabase,supabase)
  assert.equal(kicked[0][1]?.userId,'user-a')
  assert.equal(kicked[0][1]?.org.id,'tenant-a')
})
