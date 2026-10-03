export type ProductionStageKey =
  | 'REQUEST_ACCEPTED'
  | 'QUEUED'
  | 'ASSETS_PREPARING'
  | 'GENERATING'
  | 'MEDIA_PROCESSING'
  | 'QUALITY_CHECK'
  | 'READY'
  | 'NEEDS_REVIEW'
  | 'FAILED'

export type EtaConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type ProgressMode = 'determinate' | 'indeterminate'

export interface StageDefinition {
  key: ProductionStageKey
  index: number // 1 to 7, or 0 for terminal states
  title: string
  description: string
  detailHint: string
  isTerminal?: boolean
}

export const CANONICAL_VIDEO_STAGES: readonly StageDefinition[] = [
  {
    key: 'REQUEST_ACCEPTED',
    index: 1,
    title: 'İstek Doğrulanıyor',
    description: 'Reklam kurgusu, kurumsal kimlik ve onaylı metin kilitlendi.',
    detailHint: 'Parametreler ve marka kısıtları doğrulanıyor',
  },
  {
    key: 'QUEUED',
    index: 2,
    title: 'Prodüksiyon Sırasında',
    description: 'Prodüksiyon sırası bekleniyor.',
    detailHint: 'İşlem sırası stüdyo kuyruğunda',
  },
  {
    key: 'ASSETS_PREPARING',
    index: 3,
    title: 'Logo ve Ürün Hazırlanıyor',
    description: 'Logonuz ve ürün fotoğraflarınız stüdyoya aktarılıyor.',
    detailHint: 'Referans materyaller ve stüdyo sahnesi hazırlanıyor',
  },
  {
    key: 'GENERATING',
    index: 4,
    title: 'Video Üretiliyor',
    description: 'Sinematik sahneler ve kurgu işleniyor.',
    detailHint: 'Yapay zeka video modeli kareleri render ediyor',
  },
  {
    key: 'MEDIA_PROCESSING',
    index: 5,
    title: 'Video Alınıyor ve İşleniyor',
    description: 'Üretilen video stüdyodan alınıyor ve işleniyor.',
    detailHint: 'Ham video indirilip yayın formatına dönüştürülüyor',
  },
  {
    key: 'QUALITY_CHECK',
    index: 6,
    title: 'Son Kontroller Yapılıyor',
    description: 'Görsel netliği, ses uyumu ve kalite denetleniyor.',
    detailHint: 'Teknik standartlar ve görsel doğruluk denetleniyor',
  },
  {
    key: 'READY',
    index: 7,
    title: 'Videonuz Hazır!',
    description: 'Reklam videonuz başarıyla tamamlandı.',
    detailHint: 'Video yayına ve indirilmeye hazır',
    isTerminal: true,
  },
] as const

export const TERMINAL_STAGES: Record<'NEEDS_REVIEW' | 'FAILED', StageDefinition> = {
  NEEDS_REVIEW: {
    key: 'NEEDS_REVIEW',
    index: 0,
    title: 'İnsan İncelemesi Gerekiyor',
    description: 'Video teknik olarak üretildi ancak otomatik kalite kapısından geçmedi.',
    detailHint: 'Ekip kontrolü sonrasında onaylanacaktır',
    isTerminal: true,
  },
  FAILED: {
    key: 'FAILED',
    index: 0,
    title: 'Üretim Başarısız Oldu',
    description: 'Video üretilirken bir hata oluştu.',
    detailHint: 'Lütfen tekrar deneyin veya destek ekibiyle iletişime geçin',
    isTerminal: true,
  },
}
