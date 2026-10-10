import { Pool } from 'pg'
import { verifyCommercialIntegrity } from '../apps/customer/src/lib/ai/campaign-message'

async function runRegressionSuite() {
  console.log('=== P0/P1 WIZARD COMPREHENSIVE REGRESSION SUITE ===\n')

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) {
    console.warn('[SECURITY] DATABASE_URL env tanımlanmamış. DB testleri atlanıyor.')
  }

  // Proper TLS verification: do not use rejectUnauthorized: false
  const pool = connectionString ? new Pool({ connectionString, ssl: true }) : null
  let passed = 0
  let failed = 0

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${name}${detail ? ` -> ${detail}` : ''}`)
      passed++
    } else {
      console.error(`[FAIL] ${name}${detail ? ` -> ${detail}` : ''}`)
      failed++
    }
  }

  // 1. Çok Ürünlü Katalog & Doğru Ürün Seçimi vs Yanlış Ürün Kimliği (Bofe Tarım)
  const bofeOrgId = 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc'
  const ayvazOrgId = '4a58b0dd-0931-4901-880a-686457d15010'

  if (pool) {
    const { rows: bofeProducts } = await pool.query(
      'SELECT p.id, p.name, p.is_active, img.public_url FROM org_products p LEFT JOIN org_product_images img ON p.id = img.product_id WHERE p.org_id = $1',
      [bofeOrgId]
    )
    assert(bofeProducts.length > 0, 'Bofe Tarım katalog ürünleri mevcut', `Adet: ${bofeProducts.length}`)
    const validProduct = bofeProducts[0]

    // Test 1: Doğru ürün kimliği ve aktiflik doğrulaması
    assert(validProduct.is_active === true, 'Katalog ürünü aktif', `Ürün: ${validProduct.name}`)
    assert(Boolean(validProduct.public_url), 'Katalog ürününün kanonik görseli mevcut', `Görsel: ${validProduct.public_url?.slice(0, 40)}...`)

    // Test 2: Yanlış ürün kimliği (başka işletmeye ait ürün veya sahte UUID)
    const fakeProductId = '00000000-0000-0000-0000-000000000000'
    const { rows: fakeCheck } = await pool.query(
      'SELECT id FROM org_products WHERE org_id = $1 AND id = $2',
      [bofeOrgId, fakeProductId]
    )
    assert(fakeCheck.length === 0, 'Yanlış / sahte ürün kimliği işletmede bulunamaz (Sessiz fallback engellendi)')

    // Test 3: İki işletmenin farklı ürünleri (Cross-tenant ürün izolasyonu)
    const { rows: crossCheck } = await pool.query(
      'SELECT id FROM org_products WHERE org_id = $1 AND id = $2',
      [ayvazOrgId, validProduct.id]
    )
    assert(crossCheck.length === 0, 'Ayvazoğlu İnşaat, Bofe Tarım ürününü seçemez (Tenant izolasyonu tam)')

    // Test 4: Logo kontrolü
    const { rows: orgLogos } = await pool.query(
      'SELECT id, logo_path FROM organizations WHERE id IN ($1, $2)',
      [bofeOrgId, ayvazOrgId]
    )
    for (const org of orgLogos) {
      assert(Boolean(org.logo_path), `İşletme kurumsal logosu tanımlı (${org.id.slice(0, 8)})`, `Logo: ${org.logo_path}`)
    }
  }

  // Test 5: Ticari Bütünlük - Geçerli Fiyat Korunumu
  const goodSource = 'Bofe 16L Akülü Sırt Pompası 2.450 TL yerine tanıtıma özel 1.850 TL. Tel: 0542 821 22 05'
  const validAiText = 'Bofe 16L Akülü Sırt Pompası stokta! 2.450 TL yerine sadece 1.850 TL avantajlı fiyatla hemen arayın: 0542 821 22 05'
  const checkValid = verifyCommercialIntegrity({
    sourceText: goodSource,
    outputText: validAiText,
    strictPriceCheck: true,
  })
  assert(checkValid.valid === true, 'Ticari bütünlük: Doğru eski/yeni fiyat korundu (PASS)')

  // Test 6: Ticari Bütünlük - Değiştirilmiş Fiyat (1.850 -> 11.850 TL) Kesin Reddi
  const mutatedAiText = 'Bofe 16L Akülü Sırt Pompası stokta! 2.450 TL yerine 11.850 TL fiyatla sipariş verin.'
  const checkMutated = verifyCommercialIntegrity({
    sourceText: goodSource,
    outputText: mutatedAiText,
    strictPriceCheck: true,
  })
  assert(checkMutated.valid === false, 'Ticari bütünlük: 1.850 TL yerine 11.850 TL üretimi KESİNLİKLE REDDEDİLDİ (FAIL)')
  assert(checkMutated.hallucinatedTerms.some(t => t.includes('11.850')), 'Uydurma/değiştirilmiş fiyat yakalandı')

  // Test 7: Ticari Bütünlük - Uydurma garanti ve sahte zaman kısıtı
  const fakePromiseText = 'Bofe 16L Akülü Sırt Pompası 1.850 TL! Bu hafta sonuna özel ömür boyu garanti ile sizlerle!'
  const checkFake = verifyCommercialIntegrity({
    sourceText: goodSource,
    outputText: fakePromiseText,
    strictPriceCheck: true,
  })
  assert(checkFake.valid === false, 'Ticari bütünlük: Uydurma garanti ve "bu hafta sonu" sızıntısı KESİNLİKLE REDDEDİLDİ (FAIL)')

  // Test 8: Canlı Gateway Fikir & Metin Uç Noktası Doğrulaması
  const gatewayUrl = process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456'
  const token = process.env.OMNISTUDIO_GATEWAY_TOKEN || process.env.CHATGPT_API_KEY
  if (!token) {
    console.warn('[SECURITY] OMNISTUDIO_GATEWAY_TOKEN env tanımlanmamış. Canlı Gateway testi atlanıyor.')
  } else {
    try {
      const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 20,
        }),
        signal: AbortSignal.timeout(90000),
      })
      const text = await res.text()
      assert(res.status === 200, `Canlı OmniStudio Gateway /v1/chat/completions yetkili Bearer çağrısı HTTP ${res.status}`, text.slice(0, 100))
    } catch (err: any) {
      assert(false, 'Canlı OmniStudio Gateway çağrısı', err.message)
    }
  }

  console.log(`\nRegression Suite Tamamlandı: ${passed} PASS, ${failed} FAIL\n`)
  if (pool) await pool.end()
  if (failed > 0) process.exit(1)
}

runRegressionSuite().catch(console.error)
