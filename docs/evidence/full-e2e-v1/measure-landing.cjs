const { chromium } = require('playwright');
const fs = require('fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}); const runs=[];
 for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900}});
 await context.tracing.start({screenshots:true,snapshots:true,sources:false});
 const page=await context.newPage(); const cdp=await context.newCDPSession(page);
 await cdp.send('Network.enable');
 if(mobile) await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000});
 await page.addInitScript(()=>{window.__qa={lcp:0,cls:0}; new PerformanceObserver(l=>{for(const e of l.getEntries())window.__qa.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__qa.cls+=e.value}).observe({type:'layout-shift',buffered:true});});
 for(const cache of ['cold','warm']){
 const requests=[]; const lengths=[]; const errors=[]; const videoRequests=new Map();
 const response=e=>{if(/\.mp4(?:\?|$)/.test(e.response.url))videoRequests.set(e.requestId,{url:e.response.url,status:e.response.status,encodedBytesDuringWindow:0})};
 const received=e=>{const row=videoRequests.get(e.requestId);if(row)row.encodedBytesDuringWindow+=e.encodedDataLength};
 const request=r=>{if(/\.mp4(?:\?|$)/.test(r.url()))requests.push(r.url())}; const data=e=>lengths.push(e.encodedDataLength); const err=e=>errors.push(e.message);
 page.on('request',request);page.on('pageerror',err);cdp.on('Network.loadingFinished',data);cdp.on('Network.responseReceived',response);cdp.on('Network.dataReceived',received);
 if(cache==='cold'){await cdp.send('Network.clearBrowserCache');await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});}else await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
 await page.goto('http://localhost:3018/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(5000);
 const timing=await page.evaluate(()=>({paint:performance.getEntriesByType('paint').map(x=>({name:x.name,startTime:x.startTime})),ttfb:performance.getEntriesByType('navigation')[0].responseStart,lcp:window.__qa.lcp,cls:window.__qa.cls,video:performance.getEntriesByType('resource').filter(x=>/\.mp4(?:\?|$)/.test(x.name)).map(x=>({url:x.name,transferSize:x.transferSize,encodedBodySize:x.encodedBodySize,duration:x.duration})),videos:[...document.querySelectorAll('video')].map(v=>({src:v.currentSrc,readyState:v.readyState,paused:v.paused})),overflow:document.documentElement.scrollWidth>innerWidth}));
 runs.push({mobile,cache,observationSeconds:5,throttled:mobile,requests,videoTransfers:[...videoRequests.values()],videoEncodedBytesDuringWindow:[...videoRequests.values()].reduce((a,b)=>a+b.encodedBytesDuringWindow,0),totalNetworkEncodedBytes:lengths.reduce((a,b)=>a+b,0),errors,...timing});
 await page.screenshot({path:`docs/evidence/full-e2e-v1/metric-${mobile?'mobile':'desktop'}-${cache}.png`});
 page.off('request',request);page.off('pageerror',err);cdp.off('Network.loadingFinished',data);cdp.off('Network.responseReceived',response);cdp.off('Network.dataReceived',received);
 }
 await context.tracing.stop({path:`docs/evidence/full-e2e-v1/landing-${mobile?'mobile':'desktop'}-trace.zip`});await context.close();
 }
 fs.writeFileSync('docs/evidence/full-e2e-v1/landing-playwright-performance.json',JSON.stringify({environment:'local optimized webpack build; not deployed production baseline',inp:'not measured: no qualifying interaction',runs},null,2));await browser.close(); console.log(JSON.stringify(runs.map(x=>({mobile:x.mobile,cache:x.cache,requests:x.requests.length,lcp:x.lcp,cls:x.cls,errors:x.errors}))));
})().catch(e=>{console.error(e.message);process.exit(1)});
