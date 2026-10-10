const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {captureTurnBaseline,readCurrentTurn}=require('../../../services/omnistudio/gateway/chatgpt_turn_scope');
const {observePromptAcceptance}=require('../../../services/omnistudio/gateway/prompt_acceptance');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage();
  const image='<img alt="Generated image" src="https://example.invalid/old.png">';
  await page.setContent('<div class="group/user-message">old prompt</div><section data-testid="conversation-turn-2"><div data-conversation-role="assistant">Old result</div>'+image+'</section>');
  await page.evaluate(()=>{for(const img of document.images){Object.defineProperties(img,{complete:{value:true},naturalWidth:{value:1024},naturalHeight:{value:1024}})}});
  const baseline=await page.evaluate(captureTurnBaseline);
  const receipt=async(prompt)=>page.evaluate(({source,prompt,baseline})=>(0,eval)('('+source+')')(prompt,baseline),{source:observePromptAcceptance.toString(),prompt,baseline});
  assert.equal(await receipt('new prompt'),false);
  const read=async(prompt)=>page.evaluate(({source,prompt,baseline})=>(0,eval)('('+source+')')(prompt,baseline),{source:readCurrentTurn.toString(),prompt,baseline});
  assert.equal((await read('new prompt')).foundImgSrc,null);
  await page.setContent('<div class="group/user-message">old prompt</div><section data-testid="conversation-turn-2"><div data-conversation-role="assistant">Old result</div>'+image+'</section><div class="group/user-message">wrong prompt</div>');
  assert.equal((await read('new prompt')).hasNewMsg,false);
  assert.equal(await receipt('new prompt'),false);
  await page.setContent('<div class="group/user-message">old prompt</div><section data-testid="conversation-turn-2"><div data-conversation-role="assistant">Old result</div>'+image+'</section><div class="group/user-message">new prompt</div><section data-testid="conversation-turn-4"><div data-conversation-role="assistant">Fresh result</div><img alt="Generated image" src="https://example.invalid/new.png"></section>');
  await page.evaluate(()=>{for(const img of document.images){Object.defineProperties(img,{complete:{value:true},naturalWidth:{value:1024},naturalHeight:{value:1024}})}});
  const fresh=await read('new prompt'); assert.equal(fresh.ready,true);assert.equal(fresh.foundImgSrc,'https://example.invalid/new.png');assert.equal(fresh.candidateCount,1);
  assert.equal(await receipt('new prompt'),true);
  await page.setContent('<div class="group/user-message"><div data-message-author-role="user">new prompt</div></div><section data-testid="conversation-turn-4"><div data-conversation-role="assistant">Nested fresh result</div></section>');
  const nested=await read('new prompt');
  assert.equal(nested.hasNewMsg,true);assert.equal(nested.text,'Nested fresh result');
  const repeatedBaseline=await page.evaluate(captureTurnBaseline);
  assert.equal(repeatedBaseline.userKeys.length,1);
  await page.setContent('<div class="group/user-message"><div data-message-author-role="user">new prompt</div></div><section data-testid="conversation-turn-4"><div data-conversation-role="assistant">Previous result</div></section><div class="group/user-message"><div data-message-author-role="user">new prompt</div></div><section data-testid="conversation-turn-6"><div data-conversation-role="assistant">Repeated prompt fresh result</div></section>');
  const repeated=await page.evaluate(({source,baseline})=>(0,eval)('('+source+')')('new prompt',baseline),{source:readCurrentTurn.toString(),baseline:repeatedBaseline});
  assert.equal(repeated.hasNewMsg,true);assert.equal(repeated.text,'Repeated prompt fresh result');
  assert.equal(await page.evaluate(({source,baseline})=>(0,eval)('('+source+')')('new prompt',baseline),{source:observePromptAcceptance.toString(),baseline:repeatedBaseline}),true);
  console.log('PASS modern selectors; old output rejected; wrong prompt rejected; current turn image scoped');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
