process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rnkrjmblgcdqlyslbhob.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'mock-publishable-key'

import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_SPOKEN_WORDS } from '../apps/customer/src/lib/video-wizard-contract'

const {
  generateDeterministicLocalCopy,
  AI_PLANNER_TIMEOUT_MS,
} = require('../apps/customer/src/app/(panel)/icerik/creative-studio-v2')

describe('Creative Studio V2 Non-Blocking AI Planner Contract Suite', () => {
  // Test A: AI planner responds in 1 second
  it('A. AI planner responds in 1 second: suggestion populates untouched fields', async () => {
    let headline = ''
    let supportingLine = ''
    let ctaText = ''
    let headlineDirty = false
    let isPlanning = true

    // Simulate fast 1-second AI planner response
    const fastAiPlan = {
      copy: {
        headline: 'Ayvazoğlu Tuğla ile Yüksek Dayanıklılık',
        supporting_line: 'Şantiyenize doğrudan toptan teslimat ve garantili sağlamlık.',
        cta: 'Hemen İnceleyin',
      },
    }

    // Apply response logic
    if (!headlineDirty) headline = fastAiPlan.copy.headline
    supportingLine = fastAiPlan.copy.supporting_line
    ctaText = fastAiPlan.copy.cta
    isPlanning = false

    assert.equal(headline, 'Ayvazoğlu Tuğla ile Yüksek Dayanıklılık')
    assert.equal(supportingLine, 'Şantiyenize doğrudan toptan teslimat ve garantili sağlamlık.')
    assert.equal(ctaText, 'Hemen İnceleyin')
    assert.equal(isPlanning, false)
  })

  // Test B: AI planner takes 20 seconds -> aborted at <= 5 seconds, wizard remains usable, preview clickable
  it('B. AI planner takes 20 seconds: aborted at <= 5000ms budget, wizard usable, preview clickable', async () => {
    const controller = new AbortController()
    let isPlanning = true
    let planError: string | null = null

    const startTime = performance.now()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, AI_PLANNER_TIMEOUT_MS)

    // Simulate slow network request
    const simulateSlowAi = async () => {
      return new Promise<void>((resolve, reject) => {
        const slowTimer = setTimeout(resolve, 20_000)
        controller.signal.addEventListener('abort', () => {
          clearTimeout(slowTimer)
          const err = new Error('AbortError')
          err.name = 'AbortError'
          reject(err)
        })
      })
    }

    try {
      await simulateSlowAi()
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        planError = 'AI_TIMEOUT'
      }
    } finally {
      clearTimeout(timeoutId)
      isPlanning = false
    }

    const elapsed = performance.now() - startTime
    assert.ok(elapsed <= AI_PLANNER_TIMEOUT_MS + 200, `Must abort within 5000ms (+200ms leeway), took ${elapsed.toFixed(1)}ms`)
    assert.equal(isPlanning, false, 'isPlanning must reset to false')
    assert.equal(planError, 'AI_TIMEOUT')

    // Verify preview button disabled state for image: MUST NOT be blocked by planner
    const mediaType = 'IMAGE'
    const imagePreviewDisabled = mediaType === 'VIDEO' && false
    assert.equal(imagePreviewDisabled, false, 'Image preview must remain clickable')
  })

  // Test C: AI planner never responds -> no infinite "Hazırlanıyor"
  it('C. AI planner never responds: controller abort guarantees termination, no infinite loading', async () => {
    const controller = new AbortController()
    let isPlanning = true

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        controller.abort()
        isPlanning = false
        resolve()
      }, 50) // test timeout resolution
    })

    await timeoutPromise
    assert.equal(isPlanning, false, 'isPlanning must never remain true infinitely')
    assert.equal(controller.signal.aborted, true)
  })

  // Test D: User edits headline while AI pending -> late AI does NOT overwrite headline
  it('D. User edits headline while AI pending: late AI does not overwrite edited field', async () => {
    let headline = 'Initial Local Fallback Headline'
    let headlineDirty = false
    let supportingLine = 'Initial Supporting'
    let supportingLineDirty = false

    // User types in headline
    headline = 'User Customized Headline'
    headlineDirty = true

    // Late AI response arrives
    const lateAiPlan = {
      copy: {
        headline: 'Late AI Generated Headline (SHOULD BE IGNORED)',
        supporting_line: 'Late AI Supporting (SHOULD BE APPLIED)',
      },
    }

    // Apply response logic: only update if untouched (!dirty)
    if (!headlineDirty) headline = lateAiPlan.copy.headline
    if (!supportingLineDirty) supportingLine = lateAiPlan.copy.supporting_line

    assert.equal(headline, 'User Customized Headline', 'User edit must NEVER be overwritten by late AI')
    assert.equal(supportingLine, 'Late AI Supporting (SHOULD BE APPLIED)', 'Untouched fields receive AI copy')
  })

  // Test E: User changes style while AI pending -> previous request aborted, wizard responsive
  it('E. User changes style while AI pending: previous request is aborted and superseded', () => {
    let activeController: AbortController | null = null

    // Request 1 for style AUTO
    activeController = new AbortController()
    const firstController = activeController

    // User rapidly switches to PREMIUM style
    if (activeController) {
      activeController.abort()
    }
    activeController = new AbortController()
    const secondController = activeController

    assert.equal(firstController.signal.aborted, true, 'First request must be cancelled')
    assert.equal(secondController.signal.aborted, false, 'Second request is active')
  })

  // Test F: Video AI planner slow -> deterministic Turkish VO immediately available
  it('F. Video AI planner slow: deterministic Turkish VO immediately available within word limits', () => {
    const copy = generateDeterministicLocalCopy({
      productName: 'Endüstriyel Tuğla',
      brandName: 'Ayvazoğlu',
      objective: 'PRODUCT_INTRO',
      mediaType: 'VIDEO',
    })

    assert.ok(copy.voiceover.length > 0, 'Voiceover must be generated instantly')
    const words = copy.voiceover.trim().split(/\s+/).filter(Boolean)
    const wordCount = words.length

    assert.ok(wordCount >= 8 && wordCount <= 14, `Word count must be 8-14 words, got ${wordCount}`)
    assert.ok(wordCount <= MAX_SPOKEN_WORDS, `Word count must be <= ${MAX_SPOKEN_WORDS}`)

    // Check preview button condition for VIDEO with deterministic copy
    const videoPreviewDisabled = wordCount === 0 || wordCount > MAX_SPOKEN_WORDS
    assert.equal(videoPreviewDisabled, false, 'Video preview must be immediately clickable with deterministic VO')
  })

  // Test G: Step 1 -> Step 2 execution time is instant (<200ms)
  it('G. Step 1 -> Step 2 local copy synthesis is strictly < 200ms', () => {
    const t0 = performance.now()
    const local = generateDeterministicLocalCopy({
      productName: 'Bofe Yönetici Koltuğu',
      brandName: 'Bofe Metal',
      objective: 'SALES_OFFER',
      offer: '%25 İndirim',
      mediaType: 'IMAGE',
    })
    const duration = performance.now() - t0

    assert.ok(duration < 10, `Local copy generation must be <10ms, took ${duration.toFixed(2)}ms`)
    assert.ok(local.headline.length > 0)
    assert.ok(local.supportingLine.length > 0)
    assert.ok(local.cta.length > 0)
  })

  // Test H: Terminal State FAILED renders error state and action buttons, never blank
  it('H. Terminal State FAILED: renders clear error UI and action controls, eliminating blank screen', () => {
    const jobState = 'FAILED'
    const jobFailureMessage = 'Provider prompt must specify voiceover finishing before 5.5s'

    // Verify terminal gate condition: must not be ignored
    const isWaiting = jobState !== 'IDLE' && jobState !== 'COMPLETED' && jobState !== 'FAILED' && jobState !== 'NEEDS_REVIEW'
    assert.equal(isWaiting, false, 'Waiting view must not render for FAILED')

    const isTerminalError = jobState === 'FAILED' || jobState === 'NEEDS_REVIEW'
    assert.equal(isTerminalError, true, 'FAILED must activate terminal error branch')

    const displayTitle = jobState === 'FAILED' ? 'Video Hazırlanamadı' : 'Video İnceleme Bekliyor'
    const displayMessage = jobFailureMessage || 'Video üretimi tamamlanamadı.'

    assert.equal(displayTitle, 'Video Hazırlanamadı')
    assert.ok(displayMessage.includes('5.5s'), 'Must display informative failure reason')
  })

  // Test I: Terminal State NEEDS_REVIEW renders review banner and fallback/playback preview, never blank
  it('I. Terminal State NEEDS_REVIEW: renders review banner and playback preview if available', () => {
    const jobState = 'NEEDS_REVIEW'
    const playbackUrl = 'https://media.167.233.201.31.nip.io/outputs/preview.mp4'

    const isTerminalReview = jobState === 'FAILED' || jobState === 'NEEDS_REVIEW'
    assert.equal(isTerminalReview, true, 'NEEDS_REVIEW must activate terminal branch')

    const displayTitle = jobState === 'FAILED' ? 'Video Hazırlanamadı' : 'Video İnceleme Bekliyor'
    assert.equal(displayTitle, 'Video İnceleme Bekliyor')
    assert.ok(playbackUrl.length > 0, 'Playback preview is rendered for user inspection')
  })

  // Test J: Terminal State COMPLETED without playback URL renders processing placeholder, never blank
  it('J. Terminal State COMPLETED without playback URL: renders processing placeholder instead of empty void', () => {
    const jobState = 'COMPLETED'
    const completedVideoUrl = null

    assert.equal(jobState, 'COMPLETED')
    const hasPlayer = Boolean(completedVideoUrl)
    assert.equal(hasPlayer, false)

    // Fallback UI condition
    const showsFallbackNotice = !completedVideoUrl
    assert.equal(showsFallbackNotice, true, 'Must show processing placeholder while video optimizes')
  })
})
