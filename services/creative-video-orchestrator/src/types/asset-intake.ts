export type BusinessModel =
  | 'physical_product'
  | 'saas_software'
  | 'restaurant_food'
  | 'service_business'
  | 'retail_cpg'

export type AssetRole =
  | 'official_logo'
  | 'product_image'
  | 'service_screenshot'
  | 'website_or_app_screen'
  | 'packaging_image'
  | 'environment_reference'
  | 'approved_campaign_image'
  | 'forbidden_asset'

export interface TenantAsset {
  asset_id: string
  org_id: string
  sha256: string
  role: AssetRole
  mime_type: string
  source: 'upload' | 'db_sync' | 'brand_kit'
  file_path: string
  approved: boolean
  label?: string
}

export interface TenantAssetInventory {
  org_id: string
  business_model: BusinessModel
  official_logo?: TenantAsset
  product_images: TenantAsset[]
  service_screenshots: TenantAsset[]
  website_or_app_screens: TenantAsset[]
  packaging_images: TenantAsset[]
  environment_references: TenantAsset[]
  approved_campaign_images: TenantAsset[]
  forbidden_assets: TenantAsset[]
}
