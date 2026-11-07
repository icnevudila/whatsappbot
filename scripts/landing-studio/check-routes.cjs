const fs=require('node:fs');
const paths=['/','/kreatif-studyo','/whatsapp-kampanyalari','/ortak-gelen-kutusu','/isletme-listeleri','/nasil-calisir','/ornekler','/cozumler','/cozumler/perakende','/cozumler/atolyeler','/cozumler/hizmet-isletmeleri','/olmayan-sayfa'];
Promise.all(paths.map(async path=>{const response=await fetch('http://localhost:3017'+path);const html=await response.text();return {path,status:response.status,h1:(html.match(/<h1[^>]*>(.*?)<\/h1>/s)||[])[1]?.replace(/<[^>]*>/g,' '),canonical:(html.match(/rel="canonical" href="([^"]+)/)||[])[1]};})).then(rows=>{
 fs.writeFileSync('artifacts/landing-studio-2026-11-06/routes.json',JSON.stringify(rows,null,2));
 for(const row of rows){if(row.status!==(row.path==='/olmayan-sayfa'?404:200))throw Error(JSON.stringify(row));if(row.path!=='/olmayan-sayfa'&&(!row.h1||!row.canonical))throw Error('Missing page metadata '+row.path);}
 console.log('11 marketing pages respond with H1/canonical; unknown route returns 404.');
}).catch(error=>{console.error(error);process.exitCode=1;});
