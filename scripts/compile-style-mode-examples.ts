import { writeFileSync } from 'node:fs'
import { buildCreativePrompt } from '../apps/customer/src/lib/creative/prompt'
import type { CreativeSnapshot } from '../apps/customer/src/lib/creative/types'

// Developer fixture only; no database writes, provider calls or paid generations.
const brief: CreativeSnapshot = {
  brief: '16L Akülü Sırt Tipi İlaçlama Pompası', style:'auto', formatId:'wa', aspect:'1:1',
  textDensity:'balanced', useLogo:true, labels:[], cta:'Hemen İnceleyin', address:null,
  website:null,dateRange:null,customText:null,phones:[],socials:[],brandKit:null,
  baseCreativeId:null,customHeadline:'Bahçeniz İçin Hazır',sector:'Tarım',
  instruction:'Zeytinlikte ürünü sağda göster.',
  products:[{id:'example-only',name:'16L Akülü Sırt Tipi İlaçlama Pompası',description:null,
    boxContents:null,imageUrl:'https://example.com/product.png',price:null,oldPrice:null,
    promo:null,extra:null,include:{name:true,description:true,price:true,promo:true,image:true,boxContents:false}}],
}
const sections = ['# Compiled style-mode examples',
  'Developer fixture, not a real customer production or acceptance result. Same brief, two styles; no invented commercial offer.']
for (const styleMode of ['balanced_modern','campaign_bold'] as const) {
  const result = buildCreativePrompt({...brief,styleMode},{mode:'V3'})
  sections.push(`## ${styleMode}`, '```text', result.prompt, '```')
}
writeFileSync('docs/CAMPAIGN_STYLE_MODE_PROMPTS.md', sections.join('\n\n')+'\n')
