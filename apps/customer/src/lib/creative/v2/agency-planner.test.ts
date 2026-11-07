import test from 'node:test'
import assert from 'node:assert/strict'
import {parseAgencySelection,generateAgencyPlan} from './agency-planner'
import type {CreativePlanV2} from './types'
const candidates=[{id:0,plan:{} as CreativePlanV2},{id:2,plan:{} as CreativePlanV2}]

test('parallel plans and editor cannot share a conversation, including across simultaneous requests',async()=>{
 const scopes:string[]=[],editorScopes:string[]=[]
 const deps={generatePlan:async(input:import('./ai-planner').PlannerInput)=>{scopes.push(input.planningConversationId!);return {source:'AI',scene:{environment:input.planningConversationId}} as CreativePlanV2},complete:async(...args:Parameters<typeof import('@/lib/ai/text').completeText>)=>{editorScopes.push(args[3]!.conversationId!);return '{"selectedId":1,"reason":"Ürünle ilişkili fikir","risks":[]}'} }
 const input={brandName:'Bofe',productName:'Sırt pompası',objective:'PRODUCT_INTRO',stylePreset:'AUTO',mediaType:'IMAGE'} as const
 const results=await Promise.all([generateAgencyPlan(input,deps),generateAgencyPlan(input,deps)])
 assert.equal(scopes.length,6)
 assert.equal(new Set([...scopes,...editorScopes]).size,8)
 assert.ok(scopes.every(scope=>scope.includes(':candidate:')))
 assert.ok(editorScopes.every(scope=>scope.endsWith(':editor')))
 assert.ok(results.every(result=>result.conceptReview?.status==='selected'&&result.conceptReview.selection?.selectedId===1))
})
test('selection must identify a generated candidate with an explicit rationale and risk list',()=>{
 assert.deepEqual(parseAgencySelection('{"selectedId":2,"reason":"Ürünün malzemesiyle ilişkili.","risks":["Başlık ürünün önünü kapatmamalı."]}',candidates),{selectedId:2,reason:'Ürünün malzemesiyle ilişkili.',risks:['Başlık ürünün önünü kapatmamalı.']})
 for(const raw of ['{}','{"selectedId":1,"reason":"iyi","risks":[]}','{"selectedId":0,"reason":"","risks":[]}','{"selectedId":0,"reason":"iyi","risks":"yok"}','{"selectedId":0,"reason":"iyi","risks":[1]}'])assert.equal(parseAgencySelection(raw,candidates),null)
})
