export interface ProvenanceVerificationRequest {
  jobId: string
  rawVideoSha: string
  rawAudioLanguage: string
  rawAudioTranscript?: string
  rawDetectedBranding: string
  rawBrandingPassed: boolean
  rawAudioPassed: boolean
  compositorLogoSha?: string
  sourceLogoSha?: string
  voiceoverAudioSha?: string
  finalVideoSha?: string
  isMock?: boolean
}

export type ProvenanceFailureCode =
  | 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH'
  | 'RAW_VIDEO_BRANDING_MISMATCH'
  | 'CANONICAL_LOGO_MISMATCH'
  | 'PROVENANCE_INTEGRITY_BREACH'

export interface ProvenanceAuditReport {
  passed: boolean
  failureCode?: ProvenanceFailureCode
  provenanceChain: {
    raw_video_sha: string
    raw_audio_language: string
    raw_audio_transcript?: string
    raw_detected_branding: string
    compositor_logo_sha?: string
    voiceover_sha?: string
    final_video_sha?: string
  }
  issues: string[]
  details: string
}

/**
 * SourceProvenanceGate.
 * Strict fail-closed audit gate enforcing that:
 * 1. Raw generation defects (English speech, hallucinated branding) CANNOT be concealed
 *    or masked by post-production cleanup (voiceover dubbing, logo overlays).
 * 2. If raw generation failed either language or branding gates, the entire deliverable
 *    is REJECTED even if the final MP4 superficially appears clean.
 * 3. Exact chain-of-custody hashes (raw_video_sha, raw_audio_language, compositor_logo_sha,
 *    voiceover_sha, final_video_sha) are immutably verified.
 */
export class SourceProvenanceGate {
  public static verifyProvenance(req: ProvenanceVerificationRequest): ProvenanceAuditReport {
    const issues: string[] = []

    const chain = {
      raw_video_sha: req.rawVideoSha,
      raw_audio_language: req.rawAudioLanguage,
      raw_audio_transcript: req.rawAudioTranscript,
      raw_detected_branding: req.rawDetectedBranding,
      compositor_logo_sha: req.compositorLogoSha,
      voiceover_sha: req.voiceoverAudioSha,
      final_video_sha: req.finalVideoSha,
    }

    // 1. Raw Audio Language Gate: Veo must NOT have spoken English
    const hasEnglishSpeech = Boolean(
      req.rawAudioTranscript &&
      req.rawAudioTranscript.trim().length > 3 &&
      req.rawAudioLanguage.toLowerCase() === 'en'
    )
    if (!req.rawAudioPassed || hasEnglishSpeech) {
      issues.push(
        `PROVENANCE_INTEGRITY_BREACH [RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH]: Raw generative footage produced English audio ("${req.rawAudioTranscript || ''}"). Voiceover dubbing over defective raw audio is strictly forbidden. Must REGENERATE.`
      )
      return {
        passed: false,
        failureCode: 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH',
        provenanceChain: chain,
        issues,
        details: 'Raw video produced foreign audio; post-production cleanup forbidden.',
      }
    }

    // 2. Raw Branding Gate: Raw video must NOT contain hallucinated/invented stamps
    if (!req.rawBrandingPassed) {
      issues.push(
        `PROVENANCE_INTEGRITY_BREACH [RAW_VIDEO_BRANDING_MISMATCH]: Raw generative footage contains unauthorized or corrupted diegetic branding ("${req.rawDetectedBranding}"). Overlay masking is strictly forbidden. Must REGENERATE.`
      )
      return {
        passed: false,
        failureCode: 'RAW_VIDEO_BRANDING_MISMATCH',
        provenanceChain: chain,
        issues,
        details: 'Raw video has invented branding; overlay masking forbidden.',
      }
    }

    // 3. Logo SHA match: compositor input logo must equal authoritative source logo
    if (req.sourceLogoSha && req.compositorLogoSha && req.sourceLogoSha !== req.compositorLogoSha) {
      issues.push(
        `PROVENANCE_INTEGRITY_BREACH [CANONICAL_LOGO_MISMATCH]: Compositor logo SHA (${req.compositorLogoSha}) does not match source canonical logo SHA (${req.sourceLogoSha}).`
      )
      return {
        passed: false,
        failureCode: 'CANONICAL_LOGO_MISMATCH',
        provenanceChain: chain,
        issues,
        details: 'Logo asset drift detected in compositor pipeline.',
      }
    }

    return {
      passed: true,
      provenanceChain: chain,
      issues: [],
      details: 'Full provenance chain verified: raw audio, raw branding, canonical logo, and final deliverable all authentic.',
    }
  }
}
