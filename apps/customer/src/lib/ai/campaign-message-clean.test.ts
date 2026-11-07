import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanAiMessage, verifyCommercialIntegrity, generateCampaignWhatsAppMessage } from './campaign-message'

test('paired message preserves all commercial terms and contact channels without invented urgency', () => {
  const result = generateCampaignWhatsAppMessage({brandName:'Örnek',headline:'Yeni sezona hazırlanın',templateFamily:'CAMPAIGN_POSTER',primaryBenefits:['Kapıya teslim'],price:'999 TL',oldPrice:'1200 TL',quantityTiers:'10 adet ve üzeri: 950 TL',deliveryFact:'Kapıya teslim, 3 gün içinde',campaignDate:'10–20 Kasım',contactLines:['0555 000 00 01','0555 000 00 02'],website:'example.com',productRef:true,logoRef:true})
  for (const fact of ['999 TL','1200 TL','10 adet ve üzeri: 950 TL','Kapıya teslim, 3 gün içinde','10–20 Kasım','0555 000 00 01','0555 000 00 02','example.com']) assert.ok(result.includes(fact),fact)
  assert.doesNotMatch(result,/son şans|sınırlı stok|Kampanya Detayları/i)
})

test('fact deduplication cannot confuse a quantity with a larger number containing the same digits',()=>{
  const result=generateCampaignWhatsAppMessage({brandName:'Örnek',headline:'Ürün',templateFamily:'CAMPAIGN_POSTER',primaryBenefits:['10 adet'],stockFact:'110 adet',contactLines:[],productRef:true,logoRef:true})
  assert.match(result,/(?:^|\n)(?:• )?10 adet(?:\n|$)/)
  assert.ok(result.includes('110 adet'))
})

test('rejects empty provider output for rewrites without prices or a brand', () => {
  for (const outputText of ['', '  \r\n\t', cleanAiMessage('Kampanya Mesajı\n\n')]) {
    const result = verifyCommercialIntegrity({ sourceText: 'Ürünlerimizi incelemek için yazabilirsiniz.', outputText })
    assert.equal(result.valid, false)
    assert.ok(result.drifts.includes('Üretilen kampanya metni boş.'))
  }
  assert.equal(verifyCommercialIntegrity({
    sourceText: 'Ürünlerimizi incelemek için yazabilirsiniz.',
    outputText: 'Ürünlerimiz hakkında bilgi almak için bize yazın.',
  }).valid, true)
})

test('removes observed AI style labels without changing customer campaign copy', () => {
  const copy = 'Tuğla siparişleriniz 3 gün içinde kapınıza teslim edilir.'
  assert.equal(cleanAiMessage(`Samimi Kampanya Mesajı\n\n${copy}`), copy)
  assert.equal(cleanAiMessage(`Satış Odaklı Kampanya Metni:\r\n${copy}`), copy)
  assert.equal(cleanAiMessage(`Kampanya Mesajı\n${copy}`), copy)
  assert.equal(cleanAiMessage(`Tuğla Kampanyası\n\n${copy}`), `Tuğla Kampanyası\n\n${copy}`)
  assert.equal(cleanAiMessage('Samimi Kampanya Mesajı taslağını inceleyin.'), 'Samimi Kampanya Mesajı taslağını inceleyin.')
})

test('removes an exact tenant brand campaign heading but preserves customer headlines', () => {
  const copy = 'Ayvazoğlu İnşaat tuğla, 3 gün içinde kapınıza teslim.'
  assert.equal(cleanAiMessage(`Ayvazoğlu İnşaat WhatsApp Kampanya Mesajı\n\n${copy}`, 'Ayvazoğlu İnşaat'), copy)
  assert.equal(cleanAiMessage(`A+B (İnşaat) Kampanya Metni:\n${copy}`, 'A+B (İnşaat)'), copy)
  assert.equal(cleanAiMessage(`Tuğla Kampanyası\n${copy}`, 'Ayvazoğlu İnşaat'), `Tuğla Kampanyası\n${copy}`)
  assert.equal(cleanAiMessage('Ayvazoğlu İnşaat WhatsApp Kampanya Mesajı hakkında bilgi alın.', 'Ayvazoğlu İnşaat'), 'Ayvazoğlu İnşaat WhatsApp Kampanya Mesajı hakkında bilgi alın.')
})
