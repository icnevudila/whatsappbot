'use strict';
const { readCurrentTurn } = require('./chatgpt_turn_scope.js');
// Recovery is observation/download only. No navigation, file upload or Send action.
async function observeOwnedImage({job,tab,cdp,fetchImpl,gatewayUrl,sleep,maxChecks=80}) {
  try {
    const receipt=job.referenceReceipt;
    if (!receipt || receipt.job_id!==job.id || receipt.target_id!==tab.id || receipt.worker_id!==job.assignedTo)
      throw new Error('IMAGE_OBSERVATION_OWNER_MISMATCH');
    for(let attempt=0;attempt<maxChecks;attempt++) {
      const ownership=await cdp.send('Runtime.evaluate',{expression:'window.__mesajifyImageOwnerJobId',returnByValue:true});
      if(ownership.result?.value!==job.id) throw new Error('IMAGE_OBSERVATION_OWNER_MISMATCH');
      const read=await cdp.send('Runtime.evaluate',{
        expression:`(${readCurrentTurn.toString()})(${JSON.stringify(job.prompt)}, {userKeys:[]})`,returnByValue:true});
      const state=read.result?.value;
      if(state?.ready && state.foundImgSrc) {
        const extracted=await cdp.send('Runtime.evaluate',{
          expression:`(async()=>{const response=await fetch(${JSON.stringify(state.foundImgSrc)});if(!response.ok||!String(response.headers.get('content-type')||'').startsWith('image/'))throw new Error('INVALID_IMAGE_RESPONSE');const blob=await response.blob();if(blob.size>20000000)throw new Error('IMAGE_TOO_LARGE');return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onloadend=()=>resolve(reader.result);reader.readAsDataURL(blob);});})()`,awaitPromise:true,returnByValue:true});
        const value=extracted.result?.value;
        if(typeof value!=='string'||!/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)) throw new Error('INVALID_IMAGE_RESPONSE');
        const bytes=Buffer.from(value.slice(value.indexOf(',')+1),'base64');
        if(!bytes.length || bytes.length>20000000) throw new Error('INVALID_IMAGE_RESPONSE');
        const response=await fetchImpl(`${gatewayUrl}/upload?jobId=${encodeURIComponent(job.id)}&filename=img_${job.id}_${Date.now()}.png`,{
          method:'POST',headers:{'content-type':'image/png'},body:bytes,signal:AbortSignal.timeout(15000)});
        if(!response.ok) throw new Error('IMAGE_OBSERVATION_UPLOAD_FAILED');
        return {completed:true};
      }
      if(state?.hasNewMsg && !state.isGenerating && !state.foundImgSrc && state.text)
        throw new Error('MODEL_TEXT_RESPONSE_WITHOUT_IMAGE');
      await sleep(1500);
    }
    return {completed:false};
  } finally {cdp.close();}
}
module.exports={observeOwnedImage};
