import test from 'node:test'
import assert from 'node:assert/strict'
import {
  VideoQualityScorecard,
  type CandidateEvaluationResult,
} from '../src/qa/video-quality-scorecard.js'

test('VIDEO QUALITY SCORECARD: pristine candidate with valid Turkish audio and matching product -> ACCEPT with high score', () => {
  const result = VideoQualityScorecard.evaluateCandidate({
    candidate_id: 'cand-001',
    attempt_number: 1,
    provider: 'FLOW_VEO',
    provider_account_id: 'account-03',
    raw_output_path: '/shared/outputs/test/cand-001.mp4',
    raw_output_sha256: 'a'.repeat(64),
    prompt_used: 'Pristine authentic commercial',
    audioReport: {
      passed: true,
      detectedLanguage: 'tr',
      transcript: 'Mesajify ile tüm mesajlarınızı tek panelden yönetin.',
      issues: [],
      details: 'Spoken dialogue verified.',
    },
    videoReport: {
      decision: 'PASS',
      failure_codes: [],
      issues: [],
      reasoning: 'Product and brand match reference perfectly.',
      brand_consistency_score: 95,
      product_morph_detected: false,
      hallucinated_typography_detected: false,
      sector_environment_match: true,
    },
  })

  assert.equal(result.decision, 'ACCEPT')
  assert.equal(result.critical_defects.length, 0)
  assert.ok(result.metrics.composite_quality_score >= 85, `Expected score >= 85, got ${result.metrics.composite_quality_score}`)
  assert.equal(result.metrics.product_fidelity_score, 90)
  assert.equal(result.metrics.brand_fidelity_score, 95)
  assert.equal(result.metrics.audio_speech_integrity_score, 90)
})

test('VIDEO QUALITY SCORECARD: WRONG_PRODUCT defect strictly disqualifies candidate (REJECT)', () => {
  const result = VideoQualityScorecard.evaluateCandidate({
    candidate_id: 'cand-002',
    attempt_number: 1,
    provider: 'FLOW_VEO',
    raw_output_path: '/shared/outputs/test/cand-002.mp4',
    raw_output_sha256: 'b'.repeat(64),
    prompt_used: 'Commercial showing wrong product',
    audioReport: { passed: true, detectedLanguage: 'tr', transcript: 'Tamam.', issues: [], details: '' },
    videoReport: {
      decision: 'REGENERATE',
      failure_codes: ['WRONG_PRODUCT'],
      issues: ['Wrong product model displayed.'],
      reasoning: 'Generated a green mechanical pump instead of 16L battery pump.',
      brand_consistency_score: 50,
      product_morph_detected: false,
      hallucinated_typography_detected: false,
    },
  })

  assert.equal(result.decision, 'REJECT')
  assert.ok(result.critical_defects.some(d => d.code === 'WRONG_PRODUCT'))
  assert.equal(result.metrics.product_fidelity_score, 0)
  assert.match(result.disqualification_reason || '', /WRONG_PRODUCT/)
})

test('VIDEO QUALITY SCORECARD: FOREIGN_BRAND defect strictly disqualifies candidate (REJECT)', () => {
  const result = VideoQualityScorecard.evaluateCandidate({
    candidate_id: 'cand-003',
    attempt_number: 1,
    provider: 'FLOW_VEO',
    raw_output_path: '/shared/outputs/test/cand-003.mp4',
    raw_output_sha256: 'c'.repeat(64),
    prompt_used: 'Commercial with competitor logo',
    videoReport: {
      decision: 'REGENERATE',
      failure_codes: ['FOREIGN_BRAND'],
      issues: ['Competitor brand logo seen on screen.'],
      reasoning: 'Foreign logo leaked.',
      brand_consistency_score: 0,
      product_morph_detected: false,
      hallucinated_typography_detected: false,
    },
  })

  assert.equal(result.decision, 'REJECT')
  assert.ok(result.critical_defects.some(d => d.code === 'FOREIGN_BRAND'))
  assert.equal(result.metrics.brand_fidelity_score, 0)
})

test('VIDEO QUALITY SCORECARD: English / foreign audio strictly disqualifies candidate (REJECT)', () => {
  const result = VideoQualityScorecard.evaluateCandidate({
    candidate_id: 'cand-004',
    attempt_number: 1,
    provider: 'FLOW_VEO',
    raw_output_path: '/shared/outputs/test/cand-004.mp4',
    raw_output_sha256: 'd'.repeat(64),
    prompt_used: 'Commercial with English speech',
    audioReport: {
      passed: false,
      failureCode: 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH',
      detectedLanguage: 'en',
      transcript: 'Hello and welcome to our software platform.',
      issues: ['Detected English speech'],
      details: 'Turkish required.',
    },
    videoReport: {
      decision: 'PASS',
      failure_codes: [],
      issues: [],
      reasoning: 'Visuals look good.',
      brand_consistency_score: 90,
      product_morph_detected: false,
      hallucinated_typography_detected: false,
    },
  })

  assert.equal(result.decision, 'REJECT')
  assert.ok(result.critical_defects.some(d => d.code === 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH'))
  assert.equal(result.metrics.audio_speech_integrity_score, 0)
})

test('VIDEO QUALITY SCORECARD: INVENTED_DIEGETIC_BRANDING strictly disqualifies candidate (REJECT)', () => {
  const result = VideoQualityScorecard.evaluateCandidate({
    candidate_id: 'cand-005',
    attempt_number: 1,
    provider: 'FLOW_VEO',
    raw_output_path: '/shared/outputs/test/cand-005.mp4',
    raw_output_sha256: 'e'.repeat(64),
    prompt_used: 'Commercial with AI gibberish text',
    videoReport: {
      decision: 'REGENERATE',
      failure_codes: ['INVENTED_DIEGETIC_BRANDING'],
      issues: ['Gibberish text on acrylic plaque'],
      reasoning: 'Hallucinated typography.',
      brand_consistency_score: 20,
      product_morph_detected: false,
      hallucinated_typography_detected: true,
    },
  })

  assert.equal(result.decision, 'REJECT')
  assert.ok(result.critical_defects.some(d => d.code === 'INVENTED_DIEGETIC_BRANDING'))
})

test('AUTONOMOUS CANDIDATE SELECTOR: selects highest scoring candidate without critical defects', () => {
  // Candidate A: High raw score but fatal WRONG_PRODUCT defect
  const candA: CandidateEvaluationResult = VideoQualityScorecard.evaluateCandidate({
    candidate_id: 'cand-A',
    attempt_number: 1,
    provider: 'FLOW_VEO',
    raw_output_path: '/shared/outputs/cand-A.mp4',
    raw_output_sha256: '1'.repeat(64),
    prompt_used: 'Attempt 1',
    videoReport: {
      decision: 'REGENERATE',
      failure_codes: ['WRONG_PRODUCT'],
      issues: ['Wrong product'],
      reasoning: '',
      brand_consistency_score: 80,
      product_morph_detected: false,
      hallucinated_typography_detected: false,
    },
  })

  // Candidate B: Mediocre score (75), zero critical defects
  const candB: CandidateEvaluationResult = VideoQualityScorecard.evaluateCandidate({
    candidate_id: 'cand-B',
    attempt_number: 2,
    provider: 'FLOW_VEO',
    raw_output_path: '/shared/outputs/cand-B.mp4',
    raw_output_sha256: '2'.repeat(64),
    prompt_used: 'Attempt 2',
    audioReport: { passed: true, detectedLanguage: 'tr', transcript: 'İyi.', issues: [], details: '' },
    videoReport: {
      decision: 'PASS',
      failure_codes: [],
      issues: [],
      reasoning: 'Acceptable',
      brand_consistency_score: 75,
      product_morph_detected: false,
      hallucinated_typography_detected: false,
    },
  })

  // Candidate C: Excellent score (90), zero critical defects
  const candC: CandidateEvaluationResult = VideoQualityScorecard.evaluateCandidate({
    candidate_id: 'cand-C',
    attempt_number: 3,
    provider: 'FLOW_VEO',
    raw_output_path: '/shared/outputs/cand-C.mp4',
    raw_output_sha256: '3'.repeat(64),
    prompt_used: 'Attempt 3 refined',
    audioReport: { passed: true, detectedLanguage: 'tr', transcript: 'Mükemmel.', issues: [], details: '' },
    videoReport: {
      decision: 'PASS',
      failure_codes: [],
      issues: [],
      reasoning: 'Excellent cinematography and accurate product.',
      brand_consistency_score: 95,
      product_morph_detected: false,
      hallucinated_typography_detected: false,
    },
  })

  const selection = VideoQualityScorecard.selectBestCandidate([candA, candB, candC])

  assert.ok(selection.winner !== null)
  assert.equal(selection.winner.candidate_id, 'cand-C')
  assert.equal(selection.winner.attempt_number, 3)
  assert.equal(selection.winner.selection_rank, 1)
  assert.equal(selection.ranked_candidates.length, 2) // Cand A excluded from eligible ranked candidates
  assert.match(selection.selection_reason, /cand-C/)
})

test('AUTONOMOUS CANDIDATE SELECTOR: all candidates with critical defects -> returns null winner and flags regeneration required', () => {
  const cand1 = VideoQualityScorecard.evaluateCandidate({
    candidate_id: 'bad-1',
    attempt_number: 1,
    provider: 'FLOW_VEO',
    raw_output_path: '/shared/outputs/bad-1.mp4',
    raw_output_sha256: '4'.repeat(64),
    prompt_used: 'Attempt 1',
    videoReport: {
      decision: 'REGENERATE',
      failure_codes: ['WRONG_PRODUCT'],
      issues: ['Wrong product'],
      reasoning: '',
      brand_consistency_score: 50,
      product_morph_detected: false,
      hallucinated_typography_detected: false,
    },
  })

  const cand2 = VideoQualityScorecard.evaluateCandidate({
    candidate_id: 'bad-2',
    attempt_number: 2,
    provider: 'FLOW_VEO',
    raw_output_path: '/shared/outputs/bad-2.mp4',
    raw_output_sha256: '5'.repeat(64),
    prompt_used: 'Attempt 2',
    videoReport: {
      decision: 'REGENERATE',
      failure_codes: ['FOREIGN_BRAND'],
      issues: ['Foreign brand'],
      reasoning: '',
      brand_consistency_score: 20,
      product_morph_detected: false,
      hallucinated_typography_detected: false,
    },
  })

  const selection = VideoQualityScorecard.selectBestCandidate([cand1, cand2])
  assert.equal(selection.winner, null)
  assert.match(selection.selection_reason, /kritik kusurlar nedeniyle reddedildi/)
})
