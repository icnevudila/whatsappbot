const {chromium}=require('playwright');const fs=require('fs');const assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
 for(const kind of ['image','video'])for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://localhost:3019/dev/studio-v3?view=motion&kind=${kind}`,{waitUntil:'networkidle',timeout:120000});
  await page.waitForFunction(()=>[...document.querySelectorAll('.studio-stage-motion')].every(el=>el.complete&&el.naturalWidth>0));
  assert.equal(await page.locator('.studio-stage-visual').count(),9);
  const sources=await page.locator('.studio-stage-motion').evaluateAll(els=>els.map(el=>el.getAttribute('src')));assert.equal(new Set(sources).size,6);
  for(const stage of ['READY','NEEDS_REVIEW','FAILED'])assert.equal(await page.locator(`[data-stage="${stage}"] .studio-stage-motion`).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  const iconUrls=await page.locator('.studio-stage-icon').evaluateAll(els=>[...new Set(els.map(el=>el.style.maskImage.match(/url\(["']?(.*?)["']?\)/)?.[1]).filter(Boolean))]);
  for(const url of iconUrls){const response=await context.request.get('http://localhost:3019'+url);assert.equal(response.status(),200);assert.match(await response.text(),/<svg/);}
  await page.screenshot({path:`docs/evidence/progress-motion-v2/${kind}-${width}.png`,fullPage:true});
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.studio-stage-motion').first().isVisible(),false);assert.equal(await page.locator('.studio-stage-static').first().isVisible(),true);
  results.push({kind,width,distinctAnimations:new Set(sources).size,icons:iconUrls.length,reducedMotion:true,overflow:false,errors});await context.close();
 }
 const context=await browser.newContext();const page=await context.newPage();await page.goto('http://localhost:3019/dev/studio-v3?view=progress&state=GENERATING',{waitUntil:'networkidle',timeout:120000});await page.screenshot({path:'docs/evidence/progress-motion-v2/progress-video.png',fullPage:true});
 for(const state of ['NEEDS_REVIEW','FAILED']){await page.goto(`http://localhost:3019/dev/studio-v3?view=progress&state=${state}`,{waitUntil:'networkidle'});assert.equal(await page.locator(`[data-stage="${state}"]`).count(),1);assert.equal(await page.locator('[data-stage="READY"]').count(),0);}
 await browser.close();fs.writeFileSync('docs/evidence/progress-motion-v2/browser-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
