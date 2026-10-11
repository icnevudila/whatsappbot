import { readFileSync, writeFileSync } from 'fs'
import {
  CAMPAIGN_GENERATE_SYSTEM,
  buildGeneratePrompt,
  buildRewritePrompt,
  verifyCommercialIntegrity,
  type CampaignTone,
  type RewriteAction,
} from '../apps/customer/src/lib/ai/campaign-message'

const envFile = readFileSync('apps/customer/.env.local', 'utf8')
const tokenMatch = envFile.match(/OMNISTUDIO_GATEWAY_TOKEN="?([^"\n\r]+)"?/)
const token = tokenMatch ? tokenMatch[1] : ''

const GATEWAY_URL = 'http://167.233.201.31:3456/v1/chat/completions'

// 4 Real Businesses & Products from DB
const BUSINESSES = [
  {
    key: 'BOFE',
    id: 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0',
    name: 'Bofe Tarım',
    sector: 'Tarım / Makine',
    about: 'Tarımsal ilaçlama ve bahçe ekipmanları üreticisi ve distribütörü.',
    address: 'Demirci Mahallesi, Nilüfer / Bursa',
    phone: '+90 542 821 22 05',
    tone: 'Doğal ve güvenilir',
    product: {
      name: 'Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L',
      desc: 'Geniş 16L açık mavi depo haznesi, güçlü lityum-iyon batarya, ayarlanabilir pirinç nozul, ergonomik sırt askısı.',
      price: '1.850 TL',
      oldPrice: '2.450 TL',
      brief: 'Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L stoklarımızda! 2.450 TL yerine tanıtıma özel 1.850 TL. Güçlü akü ve ayarlanabilir nozul ile tarla ve bahçe ilaçlamasında pratik kullanım.',
    },
  },
  {
    key: 'AYVAZOGLU',
    id: '4a58b0dd-0931-4901-880a-686457d15010',
    name: 'Ayvazoğlu İnşaat',
    sector: 'İnşaat / Yapı Malzemeleri',
    about: 'Fabrikadan toptan ve perakende klinker ve standart inşaat tuğlası satışı.',
    address: 'Organize Sanayi Bölgesi, Trabzon',
    phone: '+90 462 325 10 20',
    tone: 'Kurumsal ve güçlü',
    product: {
      name: '13.5 Standart İnşaat Tuğlası',
      desc: 'Kapıya teslim, fabrikadan toptan ve perakende satış 13.5 tuğla. Şantiye teslimi tır bazında sipariş.',
      price: null,
      oldPrice: null,
      brief: 'Ayvazoğlu İnşaat fabrikadan toptan 13.5 tuğla satışımız devam ediyor. Şantiye teslimi tır bazında siparişlerde net iskonto avantajı sunuyoruz.',
    },
  },
  {
    key: 'MESAJIFY',
    id: '2881f690-6853-4064-8768-307463ae6255',
    name: 'Mesajify',
    sector: 'B2B SaaS / Müşteri İletişimi',
    about: 'Çoklu hat WhatsApp gelen kutusu, kitle iletişimi ve AI destekli kampanya yönetim platformu.',
    address: 'Levent, Beşiktaş / İstanbul',
    phone: '+90 545 365 13 19',
    tone: 'Yenilikçi ve profesyonel',
    product: {
      name: 'Mesajify WhatsApp Tanıtım & Kitle Platformu',
      desc: 'Civardaki işletmeleri bulma, liste oluşturma, çoklu hat üzerinden doğrudan tanıtım ve müşteri yanıt yönetimi.',
      price: null,
      oldPrice: null,
      brief: 'Mesajify ile işletmenizin tüm WhatsApp hatlarını tek panelden yönetin. Toplu kampanya gönderimi, ortak gelen kutusu ve anında müşteri takibi.',
    },
  },
  {
    key: 'MAYDONOZ',
    id: 'a2e4cc0c-7a82-47f1-a618-0baebf6b67a3',
    name: 'Maydonoz Döner',
    sector: 'Restoran / Gıda',
    about: 'Özel marine edilmiş yaprak et ve tavuk döner, Hatay usulü soslu dürümler.',
    address: 'Cumhuriyet Caddesi No:42, Nilüfer / Bursa',
    phone: '+90 224 451 00 20',
    tone: 'Sıcak, samimi ve iştah açıcı',
    product: {
      name: 'Özel Soslu Hatay Döner Dürüm',
      desc: 'Özel tereyağlı lavaş, dinlendirilmiş enfes Hatay usulü yaprak döner ve nefis domates sosu.',
      price: '165 TL',
      oldPrice: '195 TL',
      brief: 'Maydonoz Döner’de Özel Soslu Hatay Döner Dürüm 195 TL yerine 165 TL! Tereyağlı çıtır lavaş ve enfes Hatay sosuyla sıcacık kapınızda.',
    },
  },
]

async function callGateway(payload: any, timeoutMs = 25000) {
  const start = Date.now()
  try {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
    const durationMs = Date.now() - start
    const json = await res.json().catch(() => ({}))
    return {
      ok: res.ok,
      status: res.status,
      durationMs,
      id: json.id || null,
      model: json.model || 'gpt-4o',
      content: json.choices?.[0]?.message?.content?.trim() || json.reply?.trim() || '',
      raw: json,
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - start,
      id: null,
      model: 'unknown',
      content: '',
      error: err.message,
    }
  }
}

async function runMarathon() {
  console.log('==================================================================')
  console.log('   MESAJIFY AI CREATIVE MARATHON: 4 BUSINESSES, DEEP EVALUATION   ')
  console.log('==================================================================')

  const results: any[] = []

  // PART 1: 5 TONES X 4 BUSINESSES (20 TESTS)
  console.log('\n>>> [PART 1] 5 TONES X 4 BUSINESSES')
  const tones: CampaignTone[] = ['samimi', 'profesyonel', 'eglenceli', 'enerjik', 'satis']

  for (const biz of BUSINESSES) {
    console.log(`\n--- Business: ${biz.name} (${biz.sector}) ---`)
    for (const tone of tones) {
      process.stdout.write(`  Generating tone: ${tone.padEnd(12)}... `)

      const userPrompt = buildGeneratePrompt({
        brief: biz.product.brief,
        tone,
        business: {
          name: biz.name,
          about: biz.about,
          address: biz.address,
          phone: biz.phone,
          tone: biz.tone,
        },
      })

      const res = await callGateway({
        tenant_id: biz.id,
        customer: biz.name,
        messages: [
          { role: 'system', content: CAMPAIGN_GENERATE_SYSTEM },
          { role: 'user', content: userPrompt },
        ],
      })

      const integrity = verifyCommercialIntegrity({
        sourceText: biz.product.brief,
        outputText: res.content,
        strictPriceCheck: Boolean(biz.product.price),
      })

      // Qualitative evaluation
      let verdict = 'PASS'
      let reasoning = 'Gerçekçi, sektöre uygun dil, ticari bilgiler korundu.'
      if (!res.ok || !res.content) {
        verdict = 'FAIL'
        reasoning = `Gateway çağrısı başarısız oldu: ${res.status}`
      } else if (!integrity.valid) {
        verdict = 'PARTIAL'
        reasoning = `Ticari bilgi uyarısı: ${integrity.drifts.join('; ')}`
      } else if (res.content.includes('kaliteyle tanışın') || res.content.includes(`${biz.name} ile kalite`)) {
        verdict = 'PARTIAL'
        reasoning = 'Klişe reklam cümlesi tespit edildi.'
      }

      console.log(`Status: ${res.status} (${res.durationMs}ms) | Verdict: ${verdict}`)

      results.push({
        part: 'PART_1_TONES',
        businessKey: biz.key,
        businessName: biz.name,
        sector: biz.sector,
        productName: biz.product.name,
        tone,
        inputBrief: biz.product.brief,
        gatewayStatus: res.status,
        gatewayJobId: res.id,
        latencyMs: res.durationMs,
        output: res.content,
        integrityCheck: integrity,
        verdict,
        reasoning,
      })
    }
  }

  // PART 2: DEDICATED REWRITE ACTIONS (12 TESTS ACROSS BUSINESSES)
  console.log('\n>>> [PART 2] TARGETED REWRITE ACTIONS ACROSS BUSINESSES')
  const rewriteTests: { bizKey: string; action: RewriteAction; baseMsg: string }[] = [
    {
      bizKey: 'BOFE',
      action: 'shorten',
      baseMsg: 'Değerli üreticimiz, Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L stoklarımızda! Güçlü aküsü ve ayarlanabilir nozuluyla tarla işlerinizi kolaylaştırın. Tanıtıma özel 2.450 TL yerine 1.850 TL. Bize hemen ulaşın: 0542 821 22 05.',
    },
    {
      bizKey: 'BOFE',
      action: 'expand',
      baseMsg: 'Bofe 16L Akülü Sırt Pompası stokta! Tanıtıma özel 2.450 TL yerine 1.850 TL.',
    },
    {
      bizKey: 'BOFE',
      action: 'fix_grammar',
      baseMsg: 'degerli uretici bofe 16L akulu pompa 2450 tl yerine 1850 tl dir siparis icin arayiniz',
    },
    {
      bizKey: 'AYVAZOGLU',
      action: 'professional',
      baseMsg: 'Selamlar, toptan tuğlalar geldi, tırla şantiyeye teslim yapıyoruz, iskonto var arayın.',
    },
    {
      bizKey: 'AYVAZOGLU',
      action: 'cta',
      baseMsg: 'Ayvazoğlu İnşaat fabrikadan toptan 13.5 standart tuğla satışı devam ediyor. Tır bazında şantiye teslimi iskonto avantajı sunuyoruz.',
    },
    {
      bizKey: 'AYVAZOGLU',
      action: 'sales_focused',
      baseMsg: 'Ayvazoğlu İnşaat olarak fabrikadan toptan 13.5 tuğla satışımız devam etmektedir. Tır bazlı teslimat imkanı.',
    },
    {
      bizKey: 'MESAJIFY',
      action: 'attention_grabbing',
      baseMsg: 'Mesajify ile işletmenizin tüm WhatsApp hatlarını tek panelden yönetebilirsiniz. Toplu kampanya gönderimi yapabilirsiniz.',
    },
    {
      bizKey: 'MESAJIFY',
      action: 'whatsapp',
      baseMsg: 'Mesajify ile işletmenizin tüm WhatsApp hatlarını tek panelden yönetin. Müşterilerinizi etiketleyin, otomatik karşılayın ve satışlarınızı artırın.',
    },
    {
      bizKey: 'MESAJIFY',
      action: 'original',
      baseMsg: 'Mesajify çoklu hat WhatsApp platformudur. Gelen mesajları tek yerden cevaplayın.',
    },
    {
      bizKey: 'MAYDONOZ',
      action: 'friendly',
      baseMsg: 'Özel Soslu Hatay Döner Dürüm 195 TL yerine 165 TL. Sipariş veriniz: 0224 451 00 20.',
    },
    {
      bizKey: 'MAYDONOZ',
      action: 'urgency',
      baseMsg: 'Bugün öğle saatine özel Maydonoz Döner’de Özel Soslu Hatay Döner Dürüm 195 TL yerine 165 TL! Hemen arayın sıcacık gelsin.',
    },
    {
      bizKey: 'MAYDONOZ',
      action: 'remove_emoji',
      baseMsg: '🌯🔥 Enfes tereyağlı çıtır lavaşlı Hatay Dürüm 195 TL yerine 165 TL! 🛵 Hemen sipariş verin! 📞 0224 451 00 20',
    },
  ]

  for (const t of rewriteTests) {
    const biz = BUSINESSES.find((b) => b.key === t.bizKey)!
    process.stdout.write(`  Rewrite [${biz.key}] action: ${t.action.padEnd(18)}... `)

    const userPrompt = buildRewritePrompt({
      currentMessage: t.baseMsg,
      action: t.action,
      business: { name: biz.name, phone: biz.phone, address: biz.address },
    })

    const res = await callGateway({
      tenant_id: biz.id,
      customer: biz.name,
      messages: [
        { role: 'system', content: CAMPAIGN_GENERATE_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
    })

    const integrity = verifyCommercialIntegrity({
      sourceText: t.baseMsg,
      outputText: res.content,
      strictPriceCheck: true,
    })

    let verdict = 'PASS'
    let reasoning = `İşlem '${t.action}' amacına uygun tamamlandı.`
    if (!res.ok || !res.content) {
      verdict = 'FAIL'
      reasoning = 'Gateway hatası.'
    } else if (t.action === 'remove_emoji' && /[\u{1F300}-\u{1F9FF}]/u.test(res.content)) {
      verdict = 'FAIL'
      reasoning = 'Emojiler temizlenemedi.'
    } else if (t.action === 'shorten' && res.content.length > t.baseMsg.length * 0.9) {
      verdict = 'PARTIAL'
      reasoning = 'Yeterince kısaltılmadı.'
    }

    console.log(`Status: ${res.status} (${res.durationMs}ms) | Verdict: ${verdict}`)

    results.push({
      part: 'PART_2_REWRITES',
      businessKey: biz.key,
      businessName: biz.name,
      action: t.action,
      baseMessage: t.baseMsg,
      gatewayStatus: res.status,
      gatewayJobId: res.id,
      latencyMs: res.durationMs,
      output: res.content,
      integrityCheck: integrity,
      verdict,
      reasoning,
    })
  }

  // PART 3: 6 IDEA CHIPS (BOFE & MAYDONOZ DÖNER)
  console.log('\n>>> [PART 3] 6 IDEA CHIPS VIA UPDATED ROUTE LOGIC')
  const categories = [
    'İndirim kampanyası',
    'Yeni ürün',
    'Sezon kampanyası',
    'Özel gün',
    'Fiyat duyurusu',
    'Mağaza duyurusu',
  ]
  const ideaSystem = 'Sen yaratıcı bir reklam direktörüsün. Verilen işletme, marka tonu ve ürün bilgilerine dayanarak özgün, sektöre özel ve dikkat çekici bir Türkçe kampanya / reklam görseli fikri yaz. En fazla iki akıcı cümle (maksimum 300 karakter). Klişe sloganlardan ("kaliteyle tanışın", "siz de gelin") kaçın. Verilmeyen fiyat, sahte indirim veya doğrulanmamış vaat uydurma. Yalnızca fikir metnini döndür.'

  for (const bizKey of ['BOFE', 'MAYDONOZ']) {
    const biz = BUSINESSES.find((b) => b.key === bizKey)!
    console.log(`\n--- Idea Chips for: ${biz.name} ---`)
    for (const cat of categories) {
      process.stdout.write(`  Idea Chip: ${cat.padEnd(20)}... `)

      const payload = {
        tenant_id: biz.id,
        customer: biz.name,
        messages: [
          { role: 'system', content: ideaSystem },
          {
            role: 'user',
            content: JSON.stringify({
              category: cat,
              business: biz.name,
              brandKit: { name: biz.name, tone: biz.tone },
              products: [{ name: biz.product.name, description: biz.product.desc }],
            }),
          },
        ],
      }

      const res = await callGateway(payload)
      const isTemplate = res.content.includes('sade bir tanıtım görseli hazırlayalım')
      const verdict = res.ok && !isTemplate && res.content.length > 20 ? 'REAL_AI_PASS' : 'FAIL_OR_TEMPLATE'
      console.log(`Status: ${res.status} | Source: ${isTemplate ? 'template' : 'gpt'} | Verdict: ${verdict}`)

      results.push({
        part: 'PART_3_IDEA_CHIPS',
        businessKey: biz.key,
        businessName: biz.name,
        category: cat,
        gatewayStatus: res.status,
        gatewayJobId: res.id,
        latencyMs: res.durationMs,
        source: isTemplate ? 'template' : 'gpt',
        output: res.content,
        verdict,
      })
    }
  }

  // PART 4: CREATIVE PLAN & "FARKLI ÖNER" (FORCE REFRESH DIVERSITY EVALUATION)
  console.log('\n>>> [PART 4] CREATIVE PLAN & FORCE REFRESH (ANGLE DIVERSITY)')
  for (const biz of BUSINESSES) {
    console.log(`\nTesting Plan & Refresh for: ${biz.name}...`)

    const planSystem = `Sen Türkiye'nin en iyi kreatif reklam ajanslarında çalışan uzman bir Reklam Sanat Yönetmenisin. Verilen marka ve ürün için YALNIZCA geçerli bir JSON döndür.
DİL VE KALİTE KURALI:
- Headline, supporting_line, cta %100 özgün, doğal ve sektörel Türkçe olmalıdır.
- Klişelerden ("kaliteyle tanışın", "${biz.name} ile ${biz.product.name}") kesinlikle kaçın.
JSON ŞEMASI:
{
  "copy": {
    "headline": "3-6 kelimelik özgün Türkçe reklam başlığı",
    "supporting_line": "8-15 kelimelik net Türkçe alt metin",
    "cta": "2-3 kelimelik net buton metni"
  },
  "scene": { "environment": "Ortam", "subject": "Odak", "composition": "Kompozisyon" }
}`

    // Call 1: Standard plan
    const res1 = await callGateway({
      tenant_id: biz.id,
      customer: biz.name,
      messages: [
        { role: 'system', content: planSystem },
        {
          role: 'user',
          content: `Marka: ${biz.name}\nÜrün: ${biz.product.name}\nAçıklama: ${biz.product.desc}\nKampanya Amacı: Özel Fırsat\nTicari Bilgiler: Fiyat: ${biz.product.price || 'Görüşünüz'}`,
        },
      ],
    })

    // Call 2: Force refresh ("Farklı Öner" with different creative angle directive)
    const res2 = await callGateway({
      tenant_id: biz.id,
      customer: biz.name,
      messages: [
        { role: 'system', content: planSystem },
        {
          role: 'user',
          content: `Marka: ${biz.name}\nÜrün: ${biz.product.name}\nAçıklama: ${biz.product.desc}\nKampanya Amacı: Yeni Farklı Pazarlama Açısı (Farklı Öner)\nÖNEMLİ: İlk öneriden TAMAMEN FARKLI bir satış argümanına (rahatlık, hız veya ekonomik avantaj) odaklan.`,
        },
      ],
    })

    let p1: any = {}
    let p2: any = {}
    try {
      p1 = JSON.parse(res1.content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    } catch {}
    try {
      p2 = JSON.parse(res2.content.match(/\{[\s\S]*\}/)?.[0] || '{}')
    } catch {}

    const headline1 = p1.copy?.headline || 'Plan 1'
    const headline2 = p2.copy?.headline || 'Plan 2'
    const areDistinct = headline1 !== headline2 && !headline1.includes(headline2)

    console.log(`  Plan 1 Headline: "${headline1}"`)
    console.log(`  Plan 2 Headline: "${headline2}"`)
    console.log(`  Are Distinct Angles: ${areDistinct ? 'YES (GENUINE DIVERSITY)' : 'NO (WORD SWAP)'}`)

    results.push({
      part: 'PART_4_CREATIVE_PLANS',
      businessKey: biz.key,
      businessName: biz.name,
      plan1: {
        headline: headline1,
        supporting: p1.copy?.supporting_line,
        cta: p1.copy?.cta,
        jobId: res1.id,
        latencyMs: res1.durationMs,
      },
      plan2: {
        headline: headline2,
        supporting: p2.copy?.supporting_line,
        cta: p2.copy?.cta,
        jobId: res2.id,
        latencyMs: res2.durationMs,
      },
      areDistinct,
      verdict: areDistinct ? 'PASS' : 'PARTIAL',
    })
  }

  const outPath = 'docs/evidence/wizard_audit_evidence/multi_brand_marathon_results.json'
  writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8')
  console.log(`\n==================================================================`)
  console.log(`MARATHON COMPLETED! Total records: ${results.length}. Saved to ${outPath}`)
  console.log(`==================================================================`)
}

runMarathon().catch(console.error)
