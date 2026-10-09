import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { compileHistoricalV5, buildHistoricalDirectorPrompt, finalizeHistoricalProviderPrompt, type RawBrandInput } from '@wa/creative-video-orchestrator'
import type { VideoGenerationRequest } from './providers/video-provider-router.js'
import { supervisorAuth } from './providers/supervisor-auth.js'
import { assertSimpleV5ReferencePair } from './simple-v5-reference-pair.js'

type Assets = VideoGenerationRequest['assets']

function imageReference(asset: Assets[number]) {
  const bytes = readFileSync(asset.file_path)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== asset.sha256.toLowerCase()) throw new Error('HISTORICAL_DIRECTOR_CANONICAL_SHA_MISMATCH')
  const mimeType = bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')) ? 'image/png'
    : bytes[0] === 255 && bytes[1] === 216 ? 'image/jpeg'
    : bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP' ? 'image/webp' : null
  if (!mimeType) throw new Error('HISTORICAL_DIRECTOR_CANONICAL_IMAGE_INVALID')
  return { asset_id: asset.asset_id, org_id: asset.org_id, role: asset.role === 'logo' ? 'logo' : 'product', sha256, mimeType, data: `data:${mimeType};base64,${bytes.toString('base64')}` }
}

export async function runHistoricalVideoDirector(input: {
  rawInput: RawBrandInput; assets: Assets; jobId: string; attemptId: string
  gatewayUrl?: string; fetchImpl?: typeof fetch
}) {
  const { rawInput, assets, jobId, attemptId } = input
  assertSimpleV5ReferencePair(rawInput.org_id, assets)
  const hero = rawInput.products?.[0]
  let dialogue = rawInput.campaign.approved_spoken_line?.trim() || ''
  if (!dialogue && hero) {
    dialogue = `${rawInput.brand_name}, ${hero.name} ürününü bu kısa tanıtımda gerçek çalışma ortamında gösteriyor.`
  }
  if (!hero || !dialogue) throw new Error('HISTORICAL_CREATIVE_INPUT_REQUIRED')
  const productAsset = assets.find(a => a.role !== 'logo')!
  const logoAsset = assets.find(a => a.role === 'logo')!
  if (hero.asset_id !== productAsset.asset_id || hero.sha256 !== productAsset.sha256 || rawInput.logo_asset_id !== logoAsset.asset_id || rawInput.logo_sha256 !== logoAsset.sha256) throw new Error('HISTORICAL_CREATIVE_SNAPSHOT_REFERENCE_MISMATCH')
  const historical = compileHistoricalV5({
    creativeDirectorVersion: process.env.CREATIVE_DIRECTOR_VERSION === 'V3' ? 'V3' : undefined,
    brandName: rawInput.brand_name, about: rawInput.brand_description, sectorHint: rawInput.sector_profile,
    brief: rawInput.campaign.objective, ctaText: rawInput.campaign.cta,
    products: [{ name: hero.name, description: hero.description, imageUrl: '@HeroProduct', price: rawInput.campaign.price, promo: rawInput.campaign.offer }],
    productImageUrl: '@HeroProduct', logoUrl: '@BrandLogo',
    brandKit: { name: rawInput.brand_name, colors: rawInput.brand_palette, fonts: { heading: rawInput.typography?.headingFont }, logoUrl: '@BrandLogo' },
    videoSpeech: true,
  }, dialogue)
  const basePrompt = process.env.CREATIVE_DIRECTOR_VERSION === 'V3'
    ? `Act as a cinematic director. Inspect the attached canonical product and logo. Refine light and framing only within the following single-action contract. Preserve the PHYSICAL ACTION CONTRACT literally, one continuous take and three pacing beats, actor/product identity and support. Do not add lifting, loading, scene cuts, invented functions, dialogue or campaign facts. Return only the final English provider prompt:\n${historical.veoPrompt}`
    : buildHistoricalDirectorPrompt({
    brandName: rawInput.brand_name, productName: hero.name, compiledPrompt: historical.veoPrompt,
    logoVisualDescription: 'Ayrı yüklenen kanonik marka logosunu görsel olarak incele; kimliği bu dosyadan belirle.',
    sector: rawInput.sector_profile, sceneAtmosphere: historical.shotPlan.singleLocation,
  })
  const prompt = `${basePrompt}\n\nSES SÖZLEŞMESİ: Briefteki onaylı AUDIO satırı tek ses kaynağıdır. Ses 0.5s başlar, 5.25s bitişini hedefler, son sözcük kesinlikle 5.5s öncesinde biter. Örneklerdeki replikleri kullanma; yeni söz, fiyat veya kampanya repliği ekleme.\nKANONİK REFERANSLAR: Bir ana ürün ve bir marka logosu fiziksel olarak yüklenmiştir. Kamera ve ürün davranışını yukarıdaki tarihsel planla koru. Ürün üstündeki mevcut marka baskısını koru; logoyu yeniden çizme, fiziksel yüzeye yeni logo veya tabela oluşturma. Kanonik logo doğruluğu deterministik bitirme ile sağlanır.`
  const references = assets.map(imageReference)
  const gatewayUrl = (input.gatewayUrl || process.env.OMNISTUDIO_GATEWAY_URL || 'http://127.0.0.1:3456').replace(/\/$/,'')
  const auth = supervisorAuth()

  try {
    const response = await (input.fetchImpl || fetch)(`${gatewayUrl}/v1/chat/historical-video-director`, {
      method: 'POST', ...auth, body: JSON.stringify({ org_id: rawInput.org_id, job_id: jobId, attempt_id: attemptId, brand_name: rawInput.brand_name, prompt, references, expected_reference_count: 2 }),
      signal: AbortSignal.timeout(200000),
    })
    if (!response.ok) throw new Error(`HISTORICAL_DIRECTOR_GATEWAY_FAILED_${response.status}`)
    const result: any = await response.json()
    const receipt = result.vision_receipt
    if (!receipt || receipt.org_id !== rawInput.org_id || receipt.composer_attachment_count !== 2 || receipt.uploaded_reference_count !== 2 || !Array.isArray(receipt.references) || receipt.references.length !== 2) throw new Error('HISTORICAL_DIRECTOR_PHYSICAL_ATTACHMENTS_UNVERIFIED')
    for (const ref of references) if (receipt.references.filter((r:any)=>r.role===ref.role && r.asset_id===ref.asset_id && r.sha256===ref.sha256).length!==1) throw new Error('HISTORICAL_DIRECTOR_PHYSICAL_REFERENCE_MISMATCH')
    if (typeof result.prompt !== 'string' || result.prompt.length < 200) throw new Error('HISTORICAL_DIRECTOR_EMPTY_PROMPT')
    if (process.env.CREATIVE_DIRECTOR_VERSION === 'V3') {
      const contractLine = historical.veoPrompt.split('\n').find(line => line.startsWith('PHYSICAL ACTION CONTRACT:'))
      // The canonical contract contains negative constraints such as "no forklift".
      // Preserve that exact contract instead of rejecting its forbidden-action words.
      if (!contractLine || !result.prompt.split('\n').includes(contractLine))
        throw new Error('V3_DIRECTOR_PHYSICAL_CONTRACT_CHANGED')
      const direction = (result.prompt as string).split('\n').filter(line => line !== contractLine).join('\n')
      if (/three_cut|hard cut|(?:uses?|drives?|operates?)\s+(?:a\s+)?forklift|loading pallets/i.test(direction))
        throw new Error('V3_DIRECTOR_PHYSICAL_CONTRACT_CHANGED')
    }
    const providerPrompt = finalizeHistoricalProviderPrompt(result.prompt, dialogue)
    return { historical, rewrittenPrompt: result.prompt, providerPrompt, gatewayJobId: result.gateway_job_id, visionReceipt: receipt, fallbackUsed: false }
  } catch (err: any) {
    console.warn(`[historical-video-director] Gateway director unavailable or failed (${err?.message || err}), falling back to deterministic historical prompt`)
    const providerPrompt = finalizeHistoricalProviderPrompt(historical.veoPrompt, dialogue)
    return {
      historical,
      rewrittenPrompt: historical.veoPrompt,
      providerPrompt,
      gatewayJobId: null,
      visionReceipt: null,
      fallbackUsed: true,
      fallbackReason: err?.message || String(err),
    }
  }
}
