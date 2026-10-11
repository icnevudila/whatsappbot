import { chromium } from 'playwright'
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3025'
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@filo.dev'
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass123!'

const EVIDENCE_DIR = path.resolve('docs/evidence/real_ai_production')
const RUN_ID = `real_ai_${Date.now()}`
const RUN_DIR = path.join(EVIDENCE_DIR, RUN_ID)
const SCREENSHOT_DIR = path.join(RUN_DIR, 'screenshots')
const OUTPUTS_DIR = path.join(RUN_DIR, 'media_outputs')

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
fs.mkdirSync(OUTPUTS_DIR, { recursive: true })

const ORGS = {
  bofe: {
    id: 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc',
    name: 'Bofe',
    productId: 'b68d4eb9-7cc0-491e-9ece-84b8c01068b1',
    productName: 'Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası',
    productImageUrl: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc/products/7f776e2c-adf2-45ac-8e99-21e8ac782013.jpg',
    logoUrl: 'http://167.233.201.31:3456/outputs/bofe_logo.png',
    brandKitId: 'cd4ce662-eede-48a0-ba71-80433a61a842',
  },
  ayvaz: {
    id: '4a58b0dd-0931-4901-880a-686457d15010',
    name: 'Ayvazoğlu İnşaat',
    productId: '3c563c0e-2d46-47df-8898-e0c125455adf',
    productName: 'Tuğla',
    productImageUrl: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/4a58b0dd-0931-4901-880a-686457d15010/products/3c563c0e-2d46-47df-8898-e0c125455adf/1edbcbb3-53e6-42ea-95b0-1bf94ac243c3.webp',
    logoUrl: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/4a58b0dd-0931-4901-880a-686457d15010/org-logo.jpg',
    brandKitId: '489f335c-ea99-46e4-b8dd-b75dd68255ea',
  },
}

export {
  BASE_URL,
  TEST_EMAIL,
  TEST_PASSWORD,
  RUN_ID,
  RUN_DIR,
  SCREENSHOT_DIR,
  OUTPUTS_DIR,
  ORGS,
}
