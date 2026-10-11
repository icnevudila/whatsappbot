/** Read-only acceptance: existing media + real test-account session; never generates or mutates tenant records. */
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { resolve, basename } from 'node:path'
import { execFileSync } from 'node:child_process'
import sharp from 'sharp'

const base=process.env.E2E_BASE_URL || 'http://localhost:3015'
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base)) throw new Error('Acceptance must target an isolated local app, not production')
const email=process.env.E2E_USER_EMAIL,password=process.env.E2E_USER_PASSWORD
if(!email || !password) throw new Error('Existing authorized E2E account credentials are required via environment')
const out=resolve(process.env.E2E_ARTIFACT_DIR || 'tmp/wizard-download-acceptance')
await mkdir(out,{recursive:true})
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const results=[]
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}})
const auth=await client.auth.signInWithPassword({email,password})
if(auth.error)throw new Error('Existing test account could not authenticate')
const browser=await chromium.launch({headless:true,channel:'chrome'})
const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:1000}})
const page=await context.newPage()
const capture=(name,proof)=>{results.push({name,status:'PASS',...proof});console.log('PASS '+name)}
try {
  // No provider/planner/generation API requests in an acceptance download test.
  await context.route('**/api/ai-media/plan',route=>route.abort())
  await context.route('**/api/ai-media/draft',route=>route.abort())
  await context.route('**/api/ai-media/jobs',route=>route.request().method()==='POST'?route.abort():route.continue())
  await page.goto(`${base}/giris`,{waitUntil:'domcontentloaded',timeout:90_000})
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/ozet',{timeout:90_000})
  capture('Real session login',{localApp:true})
  const orgs={bofe:'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc',ayvaz:'4a58b0dd-0931-4901-880a-686457d15010'}
  const setOrg=async orgId=>context.addCookies([{name:'wb_active_org',value:orgId,domain:new URL(base).hostname,path:'/',httpOnly:true,sameSite:'Lax'}])
  for(const [brand,orgId] of Object.entries(orgs)) {
    await setOrg(orgId)
    const video=brand==='ayvaz'
    const query=await client.from('creatives').select('id,org_id,title,format,status,storage_path,public_url,payload')
      .eq('org_id',orgId).eq('status','ready').eq('format',video?'video':'square').order('created_at',{ascending:false}).limit(20)
    if(query.error)throw new Error('Creative read failed: '+query.error.code)
    let chosen,originalSha
    for(const row of query.data || []) {
      if(video) {
        const outputId=new URL(row.public_url || '',base).pathname.split('/').pop()
        const data=await client.from('ai_media_outputs').select('id,is_approved,verified,sha256,duration_seconds,width,height').eq('id',outputId).eq('org_id',orgId).maybeSingle()
        if(data.data?.is_approved && data.data.verified && Math.abs(Number(data.data.duration_seconds)-10)<0.1) {chosen=row;originalSha=data.data.sha256;break}
      } else if(row.storage_path) {
        const original=await client.storage.from('creatives').download(row.storage_path)
        if(!original.error) {chosen=row;originalSha=sha(new Uint8Array(await original.data.arrayBuffer()));break}
      }
    }
    if(!chosen)throw new Error('No eligible persisted '+brand+' media')
    await page.goto(`${base}/icerik/${chosen.id}`,{waitUntil:'load',timeout:90_000})
    const initialUrl=page.url()
    await page.waitForTimeout(1000) // Let React attach handlers to the streamed server page.
    await page.getByRole('button',{name:'Daha fazla',exact:true}).click()
    await page.getByRole('menuitem',{name:'İndir',exact:true}).waitFor({state:'visible',timeout:15_000})
    const endpoint=`${base}/api/creatives/${chosen.id}/download`
    const downloadPromise=page.waitForEvent('download',{timeout:120_000});downloadPromise.catch(()=>{})
    await page.getByRole('menuitem',{name:'İndir',exact:true}).click()
    const download=await downloadPromise
    const path=resolve(out,`${brand}-${basename(download.suggestedFilename())}`)
    await download.saveAs(path)
    // Chromium download responses are not consistently emitted as page Response events.
    // Independently read the same authenticated endpoint and compare its exact bytes too.
    const response=await context.request.get(endpoint,{timeout:120_000})
    if(await download.failure())throw new Error('Browser download failed')
    if(!(await stat(path)).size)throw new Error('Downloaded file absent/empty')
    const bytes=await readFile(path),actualSha=sha(bytes)
    if(sha(await response.body())!==actualSha)throw new Error('Authenticated GET and native browser download differ')
    if(actualSha!==originalSha)throw new Error('Downloaded bytes differ from original persisted output')
    if(page.url()!==initialUrl)throw new Error('Download navigated away from app')
    if(response.status()!==200 || !response.headers()['content-disposition']?.startsWith('attachment;'))throw new Error('Attachment response contract failed')
    const type=video?'video/mp4':'image/png'
    if(response.headers()['content-type']!==type)throw new Error('Wrong media MIME')
    let decoded
    if(video) {
      decoded=JSON.parse(execFileSync('ffprobe',['-v','error','-show_format','-show_streams','-of','json',path],{encoding:'utf8'}))
      if(!decoded.streams.some(stream=>stream.codec_type==='video') || Number(decoded.format.duration)<9.9)throw new Error('Invalid final MP4')
      const player=page.locator('video').first()
      await player.evaluate(async el=>{el.load();if(el.readyState<1)await new Promise((ok,fail)=>{el.onloadedmetadata=ok;el.onerror=()=>fail(Error('Playback metadata failed'));setTimeout(()=>fail(Error('Playback timeout')),45_000)})})
      await player.evaluate(async el=>{el.muted=true;await el.play();await new Promise(ok=>setTimeout(ok,500));el.pause();el.currentTime=5})
      await page.waitForFunction(()=>{const video=document.querySelector('video');return video && video.readyState>=2 && Math.abs(video.currentTime-5)<0.25},{},{timeout:45_000})
      const outputUrl=new URL(chosen.public_url,base).toString()
      const range=await context.request.get(outputUrl,{headers:{Range:'bytes=100-199'}})
      if(range.status()!==206 || (await range.body()).length!==100)throw new Error('Playback byte-range regression')
      capture('Real video playback + seek + HTTP 206',{creativeId:chosen.id,statusCode:range.status()})
    } else {
      const metadata=await sharp(bytes).metadata();await sharp(bytes).raw().toBuffer()
      decoded={width:metadata.width,height:metadata.height,format:metadata.format}
      if(!decoded.width || !decoded.height)throw new Error('Image decode failed')
    }
    await page.screenshot({path:resolve(out,`${brand}-after-download.png`),fullPage:true})
    capture(`${brand} browser file download`,{creativeId:chosen.id,filename:download.suggestedFilename(),bytes:bytes.length,
      downloadedSha256:actualSha,originalSha256:originalSha,contentType:type,contentDisposition:response.headers()['content-disposition'],
      pageUnchanged:true,decoded:video?{duration:decoded.format.duration,videoCodec:decoded.streams.find(s=>s.codec_type==='video').codec_name}:decoded})
    if(video) {
      await setOrg(orgs.bofe)
      const foreign=await context.request.get(endpoint)
      if(foreign.status()!==404)throw new Error('Cross-active-tenant download was not blocked')
      capture('Cross-active-tenant real download denied',{statusCode:foreign.status()})
      const anon=await browser.newContext()
      try {const noSession=await anon.request.get(endpoint);if(noSession.status()!==401)throw new Error('Anonymous download not blocked');capture('Anonymous real download denied',{statusCode:noSession.status()})}finally{await anon.close()}
    }
  }
  const missing=await context.request.get(`${base}/api/creatives/00000000-0000-4000-8000-999999999999/download`)
  if(missing.status()!==404)throw new Error('Missing creative response wrong')
  capture('Missing media ID real API denied',{statusCode:missing.status()})
  // UI-only fixture has previewOnly: no writes or paid generation. Actual session/data checks are above.
  await page.goto(`${base}/dev/studio-v3?missing=product`,{waitUntil:'load',timeout:90_000})
  await page.waitForTimeout(1000)
  const continueButton=page.getByRole('button',{name:'Devam Et (Görsel ve Reklam Metni) →',exact:true})
  if(await continueButton.isEnabled())throw new Error('Physical product without reference unexpectedly enabled')
  await page.getByRole('button',{name:/^Marka Tanıtımı/}).click()
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(button=>button.textContent?.includes('Devam Et (Görsel ve Reklam Metni)') && !button.disabled),{},{timeout:10_000})
  if(!(await continueButton.isEnabled()))throw new Error('Brand still requires product image')
  if(await page.getByText('3. Tanıtılacak Ürün / Hizmet',{exact:true}).count())throw new Error('Brand mode shows fake product selector')
  await continueButton.click();await page.getByRole('button',{name:'Son Kontrol →',exact:true}).click()
  if(!(await page.getByRole('button',{name:'Reklam Görselimi Oluştur',exact:true}).isEnabled()))throw new Error('Brand image generation UI wrongly disabled')
  await page.screenshot({path:resolve(out,'brand-logo-only-summary.png'),fullPage:true})
  capture('Brand image logo-only UI + physical image required',{fixtureOnly:true})
  await page.getByRole('button',{name:'← Geri (Görsel ve Metin)',exact:true}).click()
  await page.getByRole('button',{name:'← Geri (İşletme ve Ürün)',exact:true}).click()
  await page.getByRole('button',{name:/Kampanya Videosu/}).click()
  if(await continueButton.isEnabled())throw new Error('Unsupported logo-only video enabled')
  if(!(await page.getByText(/Yalnız logoyla marka videosu mevcut video sağlayıcısında desteklenmiyor/).count()))throw new Error('Missing unsupported provider explanation')
  capture('Logo-only brand video unavailable with clear explanation',{fixtureOnly:true})
  await page.setViewportSize({width:390,height:844})
  await page.screenshot({path:resolve(out,'brand-mobile.png'),fullPage:true})
  if(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1))throw new Error('Mobile page horizontal overflow')
  capture('Mobile mode selector readable without horizontal overflow',{width:390,fixtureOnly:true})
} catch(error) {
  results.push({name:'Acceptance incomplete',status:'FAIL',message:error.message})
  await page.screenshot({path:resolve(out,'failure.png'),fullPage:true}).catch(()=>{})
  console.error(error.message);process.exitCode=1
} finally {
  await writeFile(resolve(out,'results.json'),JSON.stringify({at:new Date().toISOString(),base,
    scope:'Local modified Next app; existing real Supabase test account/media; no production deploy, generation or tenant mutation. Wizard visual tests explicitly fixture-only.',results},null,2))
  await context.close();await browser.close()
}
