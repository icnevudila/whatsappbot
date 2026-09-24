import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { ReferenceRegistry } from '../types/reference-registry.js'

export interface CanonicalLogoVerificationResult {
  passed: boolean
  logoPath?: string
  logoSha256?: string
  error?: string
  failureCode?: 'NEEDS_ASSET' | 'CANONICAL_LOGO_MISMATCH'
}

export interface VerifyLogoOptions {
  isMock?: boolean
}

/**
 * CanonicalLogoGate.
 * Strict pre-composition gate ensuring the exact authoritative user-supplied PNG logo
 * is resolved and verified by SHA256 before any video assembly occurs.
 *
 * Rules:
 * 1. The final screen-space logo must come from the actual canonical uploaded asset bytes.
 * 2. Do NOT recreate the logo from text, SVG generated from brand name, font rendering, or AI approximation.
 * 3. Verify: source logo SHA == compositor logo input SHA.
 * 4. If the canonical logo file is missing: FAIL CLOSED with NEEDS_ASSET.
 */
export class CanonicalLogoGate {
  public static verifyLogo(
    snapshot: BrandContextSnapshot,
    registry?: ReferenceRegistry,
    options?: VerifyLogoOptions
  ): CanonicalLogoVerificationResult {
    // In mock testing environments with mock adapters, simulate valid canonical verification
    if (options?.isMock) {
      const mockSha = snapshot.logo_sha256 || 'mock_canonical_logo_sha'
      return {
        passed: true,
        logoPath: snapshot.logo_file_path || 'mock_logo.png',
        logoSha256: mockSha,
      }
    }

    // 1. Check ReferenceRegistry for registered @BrandLogo
    let logoAsset = registry?.getAll().find((a: any) => a.role === 'logo' || a.handle === '@BrandLogo')

    const rawLogoPath = logoAsset?.file_path || snapshot.logo_file_path
    const expectedSha = logoAsset?.sha256 || snapshot.logo_sha256

    if (!rawLogoPath) {
      return {
        passed: false,
        error: 'NEEDS_ASSET: Missing canonical @BrandLogo reference in registry or snapshot.',
        failureCode: 'NEEDS_ASSET',
      }
    }

    let resolvedPath = rawLogoPath
    if (!existsSync(resolvedPath)) {
      const candidates = [
        join(process.cwd(), '..', '..', rawLogoPath),
        join(process.cwd(), '..', rawLogoPath),
        join(process.cwd(), rawLogoPath),
      ]
      for (const cand of candidates) {
        if (existsSync(cand)) {
          resolvedPath = cand
          break
        }
      }
    }

    if (!existsSync(resolvedPath)) {
      return {
        passed: false,
        error: `NEEDS_ASSET: Canonical logo file not found at path "${rawLogoPath}". Do not invent a replacement.`,
        failureCode: 'NEEDS_ASSET',
      }
    }

    // Compute byte SHA256
    try {
      const fileBytes = readFileSync(resolvedPath)
      const actualSha = createHash('sha256').update(fileBytes).digest('hex')

      if (expectedSha && actualSha !== expectedSha) {
        return {
          passed: false,
          error: `CANONICAL_LOGO_MISMATCH: Logo SHA drift detected. Expected ${expectedSha}, got ${actualSha}.`,
          failureCode: 'CANONICAL_LOGO_MISMATCH',
        }
      }

      return {
        passed: true,
        logoPath: resolvedPath,
        logoSha256: actualSha,
      }
    } catch (err: any) {
      return {
        passed: false,
        error: `NEEDS_ASSET: Failed reading canonical logo file: ${err.message}`,
        failureCode: 'NEEDS_ASSET',
      }
    }
  }
}
