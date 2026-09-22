export interface ProductVisionBrief {
  type: 'product'
  shape: string
  body_color: string
  controls?: string[]
  material: string[]
  proportions: string
  distinctive_details: string[]
  prohibited_mutations: string[]
}

export interface LogoVisionBrief {
  type: 'logo'
  exact_text?: string
  symbol: string
  layout: 'horizontal' | 'vertical' | 'icon_only' | 'emblem'
  colors: string[]
  background_contrast: 'dark_mode' | 'light_mode' | 'transparent'
}

export interface CharacterVisionBrief {
  type: 'character'
  gender_or_persona?: string
  stable_visual_characteristics: string[]
  clothing_style?: string
  hair_or_features?: string
}

export interface EnvironmentVisionBrief {
  type: 'environment'
  visual_identity: string
  lighting_mood: string
  architectural_style?: string
  key_props: string[]
}

export type AssetVisionBrief =
  | ProductVisionBrief
  | LogoVisionBrief
  | CharacterVisionBrief
  | EnvironmentVisionBrief

export class AssetVisionBriefRegistry {
  private cache = new Map<string, AssetVisionBrief>()

  set(sha256: string, brief: AssetVisionBrief): void {
    this.cache.set(sha256.toLowerCase(), brief)
  }

  get(sha256: string): AssetVisionBrief | undefined {
    return this.cache.get(sha256.toLowerCase())
  }

  has(sha256: string): boolean {
    return this.cache.has(sha256.toLowerCase())
  }

  clear(): void {
    this.cache.clear()
  }
}

export const globalVisionBriefRegistry = new AssetVisionBriefRegistry()
