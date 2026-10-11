/** Design proposal only. No production import, provider call, or enabled feature flag. */
export type Triple<T> = readonly [T, T, T];
export type OutputMode = 'PERFORMANCE_AD' | 'BRAND_FILM';
export interface OwnedAssetReference {
  assetId: string;
  orgId: string;
  role: 'PRODUCT_REFERENCE' | 'ORIGINAL_BRAND_LOGO';
  storageBucket: string;
  storagePath: string;
  sha256: string;
  byteSize: number;
  verifiedAt: string;
}
export interface VerifiedCommercialFact {
  factId: string;
  text: string;
  evidenceId: string;
  verifiedByUserId: string;
  expiresAt?: string;
}
export interface CreativeDNARequestV1 {
  schemaVersion: '1';
  orgId: string;
  productId: string;
  brandKitVersionId: string;
  goal: 'PRODUCT_AWARENESS' | 'WHATSAPP_INQUIRY' | 'VERIFIED_OFFER';
  outputMode: OutputMode;
  productReference: OwnedAssetReference;
  originalLogo: OwnedAssetReference;
  facts: readonly VerifiedCommercialFact[];
}
export interface HookV1 {
  hookId: string;
  openingVisual: string;
  evidenceFactIds: readonly string[];
}
export interface StrategyV1 {
  strategyId: 'PRODUCT_USAGE' | 'PROBLEM_SOLUTION' | 'CAMPAIGN_OFFER';
  rationale: string;
  evidenceClassification: 'TEST_HYPOTHESIS' | 'OBSERVED_TREND' | 'PERFORMANCE_VERIFIED';
  sourceIds: readonly string[];
  hooks: Triple<HookV1>;
}
export interface CreativeDNARecommendationV1 {
  recommendationId: string;
  requestHash: string;
  orgId: string;
  productId: string;
  expiresAt: string;
  strategies: Triple<StrategyV1>;
}
export interface CreativeDNASelectionV1 {
  recommendationId: string;
  strategyId: StrategyV1['strategyId'];
  hookId: string;
  selectedByUserId: string;
  orgId: string;
}
export interface CreativeDNAPlanProposalV1 {
  schemaVersion: '1';
  enabledByDefault: false;
  productionExecutable: false;
  selection: CreativeDNASelectionV1;
  verifiedFactIds: readonly string[];
  productReference: OwnedAssetReference;
  originalLogo: OwnedAssetReference;
  generation: {
    provider: 'google_veo_3.1_fast';
    sourceSeconds: 8;
    deterministicOutroSeconds: 2;
    aspectRatio: '9:16';
    outputMode: OutputMode;
    promptSegments: Triple<string>;
  };
}
