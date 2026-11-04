import sharp from 'sharp'

/** Provider bytes are authoritative. Never infer output dimensions from the request. */
export class ImageOutputInvalidError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImageOutputInvalidError'
  }
}

/** Allow raster rounding, but never publish a different requested orientation/ratio. */
export function assertImageAspect(width: number, height: number, aspect: string | undefined) {
  if (!aspect) return
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new ImageOutputInvalidError('IMAGE_ASPECT_MISMATCH: Geçersiz görsel boyutları.')
  }
  const ratio = width / height
  if (aspect === '1:1') {
    if (Math.abs(ratio - 1) > 0.12) throw new ImageOutputInvalidError('IMAGE_ASPECT_MISMATCH: Kare (1:1) görsel bekleniyordu.')
  } else if (aspect === '9:16') {
    // Standard 9:16 (0.5625), 1024x1792 (0.5714), or OpenAI portrait 1024x1536 (0.6667)
    if (ratio < 0.45 || ratio > 0.75) throw new ImageOutputInvalidError('IMAGE_ASPECT_MISMATCH: Dikey story (9:16) görsel bekleniyordu.')
  } else if (aspect === '4:5') {
    // Standard 4:5 (0.80), 3:4 (0.75), or portrait 2:3 (0.6667)
    if (ratio < 0.60 || ratio > 0.90) throw new ImageOutputInvalidError('IMAGE_ASPECT_MISMATCH: Dikey feed (4:5) görsel bekleniyordu.')
  } else if (aspect === '16:9') {
    // Standard 16:9 (1.777) or 1792x1024 (1.75)
    if (ratio < 1.45 || ratio > 2.0) throw new ImageOutputInvalidError('IMAGE_ASPECT_MISMATCH: Yatay banner (16:9) görsel bekleniyordu.')
  }
}

export async function inspectImageOutput(data: Buffer) {
  if (data.length < 32 || data.length > 32 * 1024 * 1024) {
    throw new ImageOutputInvalidError('Görsel dosyası boş veya güvenli boyut sınırını aşıyor.')
  }
  try {
    const decoder = sharp(data, { failOn: 'warning', limitInputPixels: 40_000_000 })
    const meta = await decoder.metadata()
    const mimeTypes: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }
    const mimeType = mimeTypes[meta.format || '']
    if (!mimeType || !meta.width || !meta.height || (meta.pages || 1) > 1) {
      throw new ImageOutputInvalidError('Desteklenmeyen veya ölçülemeyen görsel çıktısı.')
    }
    // Header-only PNG/JPEGs can advertise dimensions but still be unplayable.
    await decoder.stats()
    const rotated = (meta.orientation || 0) >= 5 && (meta.orientation || 0) <= 8
    return { mimeType, width: rotated ? meta.height : meta.width, height: rotated ? meta.width : meta.height }
  } catch (error) {
    if (error instanceof ImageOutputInvalidError) throw error
    throw new ImageOutputInvalidError('Görsel dosyası çözümlenemedi; başarılı çıktı sayılmadı.')
  }
}
