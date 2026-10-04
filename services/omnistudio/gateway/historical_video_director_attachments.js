'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { readComposerAttachments } = require('./image_reference_gate.js');
const { validateHistoricalDirectorInput } = require('./historical_video_director_contract.js');

async function attachHistoricalDirectorReferences(cdp, job, temporaryPaths, sleep) {
  const refs=validateHistoricalDirectorInput({org_id:job.tenantId,job_id:job.historicalCreativeJobId,attempt_id:job.historicalAttemptId,prompt:job.rawPrompt,references:job.referenceImages,expected_reference_count:job.expectedReferenceCount});
  for (let i=0;i<refs.length;i++) {
    const ref=refs[i]; const ext=ref.mimeType==='image/jpeg'?'jpg':ref.mimeType==='image/webp'?'webp':'png';
    const target=path.join('/tmp',`historical_director_${job.id}_${i}.${ext}`);
    fs.writeFileSync(target,Buffer.from(ref.data.split(',')[1],'base64'),{flag:'wx',mode:0o600});temporaryPaths.push(target);
  }
  await cdp.send('DOM.enable');
  let input; const deadline=Date.now()+15000;
  while(Date.now()<deadline) {
    const doc=await cdp.send('DOM.getDocument',{},5000);
    input=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'#upload-photos, #upload-media, input[type=file]'},5000);
    if(input?.nodeId)break;
    await sleep(200);
  }
  if(!input?.nodeId)throw new Error('HISTORICAL_DIRECTOR_FILE_INPUT_UNAVAILABLE');
  const observe=async()=>(await cdp.send('Runtime.evaluate',{expression:`(${readComposerAttachments.toString()})()`,returnByValue:true})).result?.value;
  const before=await observe();
  if(!before || before.count!==0)throw new Error('HISTORICAL_DIRECTOR_STALE_ATTACHMENTS');
  await cdp.send('DOM.setFileInputFiles',{files:temporaryPaths,nodeId:input.nodeId},5000);
  const uploadedDeadline=Date.now()+45000;
  while(Date.now()<uploadedDeadline) {
    const state=await observe();
    if(state?.ready && state.count===2)return {gateway_job_id:job.id,org_id:job.tenantId,composer_attachment_count:2,uploaded_reference_count:temporaryPaths.length,references:refs.map(r=>({asset_id:r.asset_id,role:r.role,sha256:r.sha256}))};
    await sleep(200);
  }
  throw new Error('HISTORICAL_DIRECTOR_ATTACHMENTS_UNVERIFIED');
}
module.exports={attachHistoricalDirectorReferences};
