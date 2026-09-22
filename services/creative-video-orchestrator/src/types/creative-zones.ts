export interface LockedZoneSpecification {
  /** The model is strictly prohibited from altering, redesigning, or hallucinating these elements */
  product: {
    sourceAssetId: string
    sourceSha256: string
    isStrictReference: boolean
  }
  logo: {
    sourceAssetId: string
    sourceSha256: string
    deterministicOverlayOnly: boolean // Never AI generated
  }
  ui: {
    isScreenCaptureLocked: boolean
    prohibitPhysicalPlaque: boolean
  }
  packaging: {
    enforceGeometry: boolean
  }
  exactColors: string[]
  factualText: {
    prohibitAiTextGeneration: boolean
    deterministicOverlayOnly: boolean
  }
}

export interface GenerativeZoneSpecification {
  /** The model is free to direct and stylize within these generative domains */
  environment: {
    theme: string
    allowedLocations: string[]
    forbiddenLocations: string[]
  }
  actors: {
    role: string
    attire: string
    actions: string[]
  }
  lighting: {
    mood: string
    cinematographyStyle: string
  }
  camera: {
    movements: string[]
    framing: string[]
  }
  props: {
    allowedProps: string[]
    forbiddenProps: string[]
  }
  atmosphere: string
}

export interface CreativeZoneContract {
  tenantId: string
  jobId: string
  locked: LockedZoneSpecification
  generative: GenerativeZoneSpecification
}
