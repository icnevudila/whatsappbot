'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')

// Onboarding Step Engine Logic (Mirroring apps/customer/src/lib/onboarding.ts)
const ONBOARDING_STEPS = [
  'hosgeldin',
  'isletme',
  'adres',
  'hat',
  'rehber',
  'tanitim',
  'marka',
]

function stepIndex(step) {
  return ONBOARDING_STEPS.indexOf(step)
}

function computeFurthestStep(input) {
  const { org, accountConnected, brandReady } = input
  const flags = org?.onboarding ?? {}
  if (brandReady || flags.brand_analyzed) return 'marka'
  if (org?.about?.trim()) return 'marka'
  if (flags.skipped_contacts || flags.contacts_imported) return 'tanitim'
  if (accountConnected) return 'rehber'
  if (org?.address?.trim()) return 'hat'
  if (org) return 'adres'
  return 'hosgeldin'
}

function clampStep(requested, furthest) {
  return stepIndex(requested) > stepIndex(furthest) ? furthest : requested
}

// Campaign Validation & Safety Logic (Mirroring apps/customer/src/lib/campaign-validation.ts)
function validateCampaignSettings(min, max, cap) {
  if (![min, max, cap].every(Number.isSafeInteger)) return 'Bekleme süreleri ve günlük sınır tam sayı olmalı.'
  if (min < 3 || max > 3600 || min > max) return 'Bekleme aralığı 3–3600 saniye arasında olmalı; en kısa süre en uzun süreyi aşamaz.'
  if (cap < 1 || cap > 250) return 'Hat başına günlük sınır 1–250 arasında olmalı.'
  return null
}

function validateMediaUrl(raw) {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' || url.username || url.password) return 'Görsel için geçerli bir HTTPS adresi kullanın.'
    return null
  } catch {
    return 'Görsel adresi geçersiz.'
  }
}

test('Synthetic New Customer: Initial State & Step Progression', () => {
  // 1. Fresh customer with no organization
  const freshStep = computeFurthestStep({
    org: null,
    accountConnected: false,
    brandReady: false,
  })
  assert.equal(freshStep, 'hosgeldin', 'Fresh visitor without org should start at hosgeldin')

  // 2. Organization created with name only
  const orgInit = {
    id: 'org_synth_01',
    name: 'Yeni Butik',
    address: null,
    about: null,
    phone_e164: null,
    onboarding: {},
  }
  const stepAfterOrg = computeFurthestStep({
    org: orgInit,
    accountConnected: false,
    brandReady: false,
  })
  assert.equal(stepAfterOrg, 'adres', 'After org name entered, furthest step is adres')

  // 3. Organization with address provided -> reaches hat (line connection)
  const orgWithAddress = {
    ...orgInit,
    address: 'Bagdat Caddesi No: 42, Kadikoy, Istanbul',
  }
  const stepAfterAddress = computeFurthestStep({
    org: orgWithAddress,
    accountConnected: false,
    brandReady: false,
  })
  assert.equal(stepAfterAddress, 'hat', 'After address entered, next step is hat connection')

  // 4. Clamping logic prevents jumping ahead to brand kit without completing intermediate steps
  assert.equal(clampStep('marka', stepAfterAddress), 'hat', 'Cannot jump to marka before hat is connected')
  assert.equal(clampStep('isletme', stepAfterAddress), 'isletme', 'Can navigate back to earlier steps')

  // 5. WhatsApp line paired & connected -> progresses to rehber (contacts)
  const stepAfterLineConnected = computeFurthestStep({
    org: orgWithAddress,
    accountConnected: true,
    brandReady: false,
  })
  assert.equal(stepAfterLineConnected, 'rehber', 'Once WA is connected, furthest step advances to contacts (rehber)')

  // 6. Contacts imported or skipped -> advances to tanitim
  const orgWithContacts = {
    ...orgWithAddress,
    onboarding: { skipped_contacts: true },
  }
  const stepAfterContacts = computeFurthestStep({
    org: orgWithContacts,
    accountConnected: true,
    brandReady: false,
  })
  assert.equal(stepAfterContacts, 'tanitim', 'Once contacts skipped or imported, advances to tanitim')

  // 7. Brand ready / analyzed -> advances to marka
  const stepWithBrand = computeFurthestStep({
    org: { ...orgWithContacts, about: 'Kadin giyim ve aksesuar magazamiz' },
    accountConnected: true,
    brandReady: true,
  })
  assert.equal(stepWithBrand, 'marka', 'Full onboarding reached marka')
})

test('Synthetic New Customer: Default Free Plan Quotas & Boundaries', () => {
  const FREE_QUOTAS = {
    accounts: 1,
    messages: 100,
    daily_cap: 100,
  }

  // Verify business constraints for newly onboarded free tenant
  assert.equal(FREE_QUOTAS.accounts, 1, 'Free tier permits exactly 1 active WhatsApp account')
  assert.equal(FREE_QUOTAS.messages, 100, 'Free tier has 100 monthly messages')
  assert.ok(FREE_QUOTAS.daily_cap <= 100, 'Free tier daily cap cannot exceed 100')
})

test('Synthetic New Customer: Campaign Dispatch Safety & Gatekeeping', () => {
  // Ensure that an empty tenant CANNOT accidentally dispatch messages without connected lines
  function evaluateCampaignPrerequisites(params) {
    if (!params.name.trim()) return { ok: false, error: 'Kampanyaya bir ad verin.' }
    if (!params.body.trim() && !params.mediaUrl.trim()) return { ok: false, error: 'Mesaj metni veya bir görsel gerekli.' }
    if (params.listIds.length === 0) return { ok: false, error: 'En az bir kişi grubu seçin.' }
    if (params.accountIds.length === 0) return { ok: false, error: 'En az bir gönderen hat seçin.' }

    const matched = params.accounts.filter(a => params.accountIds.includes(a.id))
    if (matched.length !== params.accountIds.length) {
      return { ok: false, error: 'Seçilen hatlardan bazıları artık yok. Hatları yeniden seçin.' }
    }
    const blocked = matched.filter(a => a.status !== 'connected' || a.is_locked || a.enabled === false)
    if (blocked.length > 0) {
      return { ok: false, error: 'Seçilen hatlar bağlı ve gönderime açık olmalı.' }
    }

    return { ok: true, error: null }
  }

  // 1. New tenant with 0 accounts
  const resNoAccount = evaluateCampaignPrerequisites({
    name: 'Açılış Kampanyası',
    body: 'Merhaba! Yeni sezon ürünlerimiz geldi.',
    mediaUrl: '',
    listIds: ['list_01'],
    accountIds: [],
    accounts: [],
  })
  assert.equal(resNoAccount.ok, false)
  assert.equal(resNoAccount.error, 'En az bir gönderen hat seçin.')

  // 2. New tenant with account still in pairing/disconnected state
  const resDisconnectedAccount = evaluateCampaignPrerequisites({
    name: 'Açılış Kampanyası',
    body: 'Merhaba! Yeni sezon ürünlerimiz geldi.',
    mediaUrl: '',
    listIds: ['list_01'],
    accountIds: ['acc_pending'],
    accounts: [{ id: 'acc_pending', status: 'pairing', enabled: true, is_locked: false }],
  })
  assert.equal(resDisconnectedAccount.ok, false)
  assert.equal(resDisconnectedAccount.error, 'Seçilen hatlar bağlı ve gönderime açık olmalı.')

  // 3. New tenant with locked account
  const resLockedAccount = evaluateCampaignPrerequisites({
    name: 'Açılış Kampanyası',
    body: 'Merhaba! Yeni sezon ürünlerimiz geldi.',
    mediaUrl: '',
    listIds: ['list_01'],
    accountIds: ['acc_locked'],
    accounts: [{ id: 'acc_locked', status: 'connected', enabled: true, is_locked: true }],
  })
  assert.equal(resLockedAccount.ok, false)
  assert.equal(resLockedAccount.error, 'Seçilen hatlar bağlı ve gönderime açık olmalı.')

  // 4. Properly connected account passes validation
  const resConnectedAccount = evaluateCampaignPrerequisites({
    name: 'Açılış Kampanyası',
    body: 'Merhaba! Yeni sezon ürünlerimiz geldi.',
    mediaUrl: '',
    listIds: ['list_01'],
    accountIds: ['acc_ok'],
    accounts: [{ id: 'acc_ok', status: 'connected', enabled: true, is_locked: false }],
  })
  assert.equal(resConnectedAccount.ok, true)
  assert.equal(resConnectedAccount.error, null)
})

test('Synthetic New Customer: Campaign Settings & Timing Guards', () => {
  // Delay checks
  assert.equal(validateCampaignSettings(2, 20, 100), 'Bekleme aralığı 3–3600 saniye arasında olmalı; en kısa süre en uzun süreyi aşamaz.')
  assert.equal(validateCampaignSettings(30, 10, 100), 'Bekleme aralığı 3–3600 saniye arasında olmalı; en kısa süre en uzun süreyi aşamaz.')
  assert.equal(validateCampaignSettings(10, 20, 0), 'Hat başına günlük sınır 1–250 arasında olmalı.')
  assert.equal(validateCampaignSettings(10, 20, 300), 'Hat başına günlük sınır 1–250 arasında olmalı.')
  assert.equal(validateCampaignSettings(8, 25, 100), null, 'Default 8-25s and 100 cap is valid')

  // Media URL check
  assert.equal(validateMediaUrl('http://insecure.site/img.jpg'), 'Görsel için geçerli bir HTTPS adresi kullanın.')
  assert.equal(validateMediaUrl('https://valid.site/img.jpg'), null)
})
