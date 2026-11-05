import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatUserSceneInstruction,
  buildLegacySimpleCreativePrompt,
} from './prompt'
import { inheritVariationContext } from './variation-context'
import type { CreativeSnapshot, CreativePayload } from './types'

test('1. formatUserSceneInstruction cleanly distinguishes between regular scene staging and user revision command', () => {
  // Regular scene direction
  const normal = formatUserSceneInstruction('Güneşli ve aydınlık bir kafe tezgahı', false)
  assert.ok(normal?.includes('USER SCENE ART DIRECTION'))
  assert.ok(!normal?.includes('USER REVISION REQUEST'))

  // Revision command
  const revision = formatUserSceneInstruction('Başlığı kısalt, alt kısma 3 özellik ekle: Hızlı Teslimat | Yüksek Dayanım | Pratik Kullanım', true)
  assert.ok(revision?.includes('USER REVISION REQUEST'))
  assert.ok(revision?.includes('typography, headline, 3-feature highlights'))
})

test('2. buildLegacySimpleCreativePrompt in revision mode routes revision commands accurately', () => {
  const snapshot: CreativeSnapshot = {
    brief: 'Tarım ilaçlama pompası afişi',
    style: 'auto',
    formatId: 'feed',
    aspect: '4:5',
    textDensity: 'balanced',
    useLogo: true,
    generationType: 'revision',
    baseCreativeId: 'base-creative-123',
    instruction: 'Başlığı "Hasat Zamanı İndirimi" yap, butona "Teklif Alın →" yaz.',
    cta: 'Teklif Alın →',
    website: 'bofe.com.tr',
    labels: ['16 Litre Kapasite', 'Akülü Pratik Kullanım', 'Yüksek Dayanım'],
    primaryBenefits: ['16 Litre Kapasite', 'Akülü Pratik Kullanım', 'Yüksek Dayanım'],
    brandKit: {
      id: 'bofe-kit',
      name: 'Bofe Tarım',
      tone: 'Güvenilir ve profesyonel',
      colors: { primary: '#026009', accent: '#70b329' },
      fonts: { heading: 'Montserrat' },
      logoPath: 'orgs/bofe/logo.png',
    },
    products: [
      {
        id: 'p-1',
        name: '16L Akülü Sırt Pompası',
        description: 'Güçlü bataryalı ilaçlama pompası',
        imageUrl: 'orgs/bofe/pompa.png',
        include: { name: true, image: true, description: true, boxContents: false, price: false, promo: false },
      },
    ],
  }

  const result = buildLegacySimpleCreativePrompt(snapshot)
  assert.ok(result.prompt.includes('USER REVISION REQUEST'))
  assert.ok(result.prompt.includes('Hasat Zamanı İndirimi'))
  assert.ok(result.prompt.includes('CONTROLLED REVISION DIRECTIVE'))
  assert.ok(result.prompt.includes('Mandatory Call-to-Action (CTA): Teklif Alın →'))
  assert.ok(result.prompt.includes('Key verified selling point: 16 Litre Kapasite · Akülü Pratik Kullanım · Yüksek Dayanım'))
})

test('3. inheritVariationContext preserves button CTA and website when not overridden by client', () => {
  const parent = {
    cta: 'Teklif Alın →',
    website: 'ayvazogluinsaat.com',
    customHeadline: 'Sağlam Temel. Güvenli Yarınlar.',
    primaryBenefits: ['Güvenilir Tedarik', 'Geniş Ürün Çeşidi', 'Zamanında Teslimat'],
  } as unknown as CreativePayload

  const childDraft = {
    requestKey: 'rev-req-1',
    generationType: 'revision',
  }

  const inherited = inheritVariationContext(childDraft, parent)
  assert.equal(inherited.cta, 'Teklif Alın →')
  assert.equal(inherited.website, 'ayvazogluinsaat.com')
  assert.equal(inherited.customHeadline, 'Sağlam Temel. Güvenli Yarınlar.')
  assert.deepEqual(inherited.primaryBenefits, ['Güvenilir Tedarik', 'Geniş Ürün Çeşidi', 'Zamanında Teslimat'])
})
