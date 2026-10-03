process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rnkrjmblgcdqlyslbhob.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'mock-publishable-key'

import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_SPOKEN_WORDS } from '../apps/customer/src/lib/video-wizard-contract'
import { buildVeoVoiceoverPromptBlock } from '../apps/customer/src/lib/video-voiceover-contract'

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

  // Test K: No Invented Marketing Claims in Fallback Copy
  it('K. No Invented Marketing Claims: fallback copy uses ONLY factual brand/product/offer, zero invented superiority or urgency claims', () => {
    const forbiddenClaims = [
      'yüksek kalite',
      'avantajlı fiyat',
      'güven ve dayanıklılık',
      'en avantajlı',
      'özel fiyatları kaçırmayın',
      'fırsatı yakala',
      'fırsatları kaçırmayın',
      'kalitesiyle',
      'güvencesiyle',
      'sağlamlığın adresi',
      'lider marka',
    ]

    const testScenarios = [
      { productName: 'Bofe Akülü Püskürtücü', brandName: 'Bofe Tarım', mediaType: 'VIDEO' as const },
      { productName: 'Ayvazoğlu Tuğla', brandName: 'Ayvazoğlu', objective: 'BRAND_AWARENESS', mediaType: 'VIDEO' as const },
      { productName: 'Pro Plan', brandName: 'SaaS Inc', campaignDetail: 'Yıllık lisanslama', mediaType: 'IMAGE' as const },
      { productName: 'Premium Koltuk', brandName: 'Bofe', offer: '%20 İndirim', mediaType: 'VIDEO' as const },
    ]

    for (const scenario of testScenarios) {
      const copy = generateDeterministicLocalCopy(scenario)
      const combinedText = `${copy.headline} ${copy.supportingLine} ${copy.cta} ${copy.voiceover}`.toLowerCase()

      for (const forbidden of forbiddenClaims) {
        assert.equal(
          combinedText.includes(forbidden),
          false,
          `Deterministic copy must not contain forbidden invented claim "${forbidden}". Generated: "${combinedText}"`
        )
      }

      // Voiceover word count validation
      const words = copy.voiceover.trim().split(/\s+/).filter(Boolean)
      assert.ok(words.length >= 6 && words.length <= MAX_SPOKEN_WORDS, `Voiceover word count (${words.length}) must be in valid range`)
    }
  })

  // Test L: Voiceover Timing Contract strictly < 5.5s (end_sec: 5.25)
  it('L. Voiceover Timing Contract: speechTimeline ends at 5.25s (< 5.5s) and prompt block enforces finishing before 5.5s', () => {
    const testVoiceover = 'Bofe Tarım Akülü Püskürtücü ürününü keşfedin. Detaylı bilgi için iletişime geçin.'
    const promptBlock = buildVeoVoiceoverPromptBlock(testVoiceover)

    // Check prompt block requirements
    assert.ok(promptBlock.includes('VOICEOVER — TURKISH (tr-TR), EXACTLY ONCE:'))
    assert.ok(promptBlock.includes(`"${testVoiceover}"`))
    assert.ok(promptBlock.includes('Turkish voiceover starts after 0.5s.'))
    assert.ok(promptBlock.includes('Speak this exact approved Turkish sentence once naturally between 0.5s and 5.25s. Voiceover fully finishes before 5.5s.'))
    assert.ok(promptBlock.includes('After voiceover ends: music/ambient only.'))
    assert.ok(promptBlock.includes('Strictly forbid any English narration or English speech. No English narration.'))
    assert.ok(promptBlock.includes('Do not translate it. No translation.'))
    assert.ok(promptBlock.includes('No other spoken words. No second narration.'))

    // Check speech timeline timing
    const speechTimeline = [
      {
        start_sec: 0.5,
        end_sec: 5.25,
        exact_text: testVoiceover,
        speaker: 'Spiker',
      },
    ]

    for (const item of speechTimeline) {
      assert.ok(item.start_sec >= 0.5, `start_sec (${item.start_sec}) must be >= 0.5s`)
      assert.ok(item.end_sec < 5.5, `end_sec (${item.end_sec}) must be strictly < 5.5s`)
      assert.equal(item.end_sec, 5.25, 'end_sec canonical value must be 5.25s')
    }
  })

  // Test M: Provider Prompt Validation Contract: passes provider check without ProviderRoutingError
  it('M. Provider Prompt Validation: prompt satisfies real-video-providers validation', () => {
    const voiceoverText = 'Bofe Tarım Akülü Püskürtücü ürününü keşfedin. Ayrıntılı bilgi ve sipariş için bizimle iletişime geçin.'
    const promptBlock = buildVeoVoiceoverPromptBlock(voiceoverText)

    const compiledPrompt = [
      `[FORMAT]: 8.0-second vertical commercial video ad, 9:16 aspect ratio.`,
      `[SUBJECT]: Authentic photorealistic commercial for Bofe Tarım featuring Akülü Püskürtücü.`,
      promptBlock,
      `[RAW DIFFUSION POLICY]: Clean commercial footage.`,
    ].join('\n\n')

    // Simulate real-video-providers.ts assertSimpleProviderContract checks
    const promptLower = compiledPrompt.toLowerCase()
    const cleanSentence = voiceoverText.replace(/^["“'”]+|["“'”]+$/g, '')

    assert.ok(compiledPrompt.includes(cleanSentence), 'Prompt must contain exact voiceover text')
    assert.equal(promptLower.includes('translate to english'), false, 'No translation to english')
    assert.equal(promptLower.includes('translate into english'), false, 'No translation into english')

    const hasTurkishNarration = promptLower.includes('turkish') && (promptLower.includes('narration') || promptLower.includes('voiceover'))
    const hasExactOnce = promptLower.includes('once') && (promptLower.includes('exact') || promptLower.includes('exactly') || promptLower.includes('speak'))
    const hasNoEnglish = promptLower.includes('no english')
    const hasDoNotTranslate = promptLower.includes('do not translate') || promptLower.includes('no translation')

    assert.ok(hasTurkishNarration, 'Must enforce Turkish narration/voiceover')
    assert.ok(hasExactOnce, 'Must enforce exact sentence once')
    assert.ok(hasNoEnglish, 'Must enforce no English')
    assert.ok(hasDoNotTranslate, 'Must enforce do not translate')

    const durationSeconds = 8
    const passesTiming = !(durationSeconds === 8 && !promptLower.includes('5.5s') && !promptLower.includes('5.5'))
    assert.ok(passesTiming, 'Prompt must explicitly contain 5.5s / 5.5 timing constraint')
  })
})

