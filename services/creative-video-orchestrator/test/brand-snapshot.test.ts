import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createBrandContextSnapshot, type RawBrandInput } from '../src/types/brand-snapshot.js'

test('BrandContextSnapshot - successfully creates immutable snapshot with SHA-256 version', () => {
  const input: RawBrandInput = {
    org_id: 'org_test_123',
    brand_name: 'Alpha Brand',
    sector_profile: 'technology_b2b',
    brand_description: 'Innovative cloud solutions',
    brand_palette: { primary: '#1A73E8', accent: '#34A853' },
    typography: { headingFont: 'Inter', primaryColor: '#FFFFFF' },
    tone_of_voice: ['modern', 'authoritative'],
    visual_style: ['clean corporate minimalism'],
    logo_asset_id: 'asset_logo_alpha',
    logo_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
    logo_file_path: '/assets/alpha_logo.png',
    products: [
      {
        product_id: 'prod_1',
        name: 'CloudGateway Pro',
        description: 'High-throughput enterprise API gateway',
        asset_id: 'asset_prod_gateway',
        sha256: 'b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1',
      },
    ],
    campaign: {
      objective: 'B2B Demo Signups',
      cta: 'Ücretsiz Deneyin',
      offer: '14 Gün Ücretsiz',
    },
    language: 'tr',
    aspect_ratio: '9:16',
    requested_duration: 10,
    output_type: 'SHORT_VIDEO',
  }

  const snapshot = createBrandContextSnapshot(input)

  assert.equal(snapshot.org_id, 'org_test_123')
  assert.equal(snapshot.brand_name, 'Alpha Brand')
  assert.equal(snapshot.sector_profile, 'technology_b2b')
  assert.ok(snapshot.brand_manifest_version.startsWith('bmv_'))
  assert.equal(snapshot.products.length, 1)
  assert.equal(snapshot.campaign.cta, 'Ücretsiz Deneyin')

  // Verify immutability (deep freeze)
  assert.throws(() => {
    ;(snapshot as any).brand_name = 'Modified Brand'
  }, /Cannot assign to read only property/)

  assert.throws(() => {
    ;(snapshot.campaign as any).cta = 'Different CTA'
  }, /Cannot assign to read only property/)
})

test('BrandContextSnapshot - fails validation on missing mandatory fields', () => {
  assert.throws(() => {
    createBrandContextSnapshot({
      org_id: '',
      brand_name: 'Test',
      sector_profile: 'retail',
      logo_asset_id: 'logo_1',
      logo_sha256: 'hash123',
      campaign: { objective: 'Sales', cta: 'Satın Al' },
    } as any)
  }, /org_id is required/)

  assert.throws(() => {
    createBrandContextSnapshot({
      org_id: 'org_1',
      brand_name: 'Test',
      sector_profile: 'retail',
      logo_asset_id: 'logo_1',
      logo_sha256: 'hash123',
      campaign: { objective: 'Sales', cta: '' },
    } as any)
  }, /campaign.cta is mandatory/)
})
