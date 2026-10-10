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
  const ratios: Record<string, number> = { '1:1': 1, '4:5': 4 / 5, '9:16': 9 / 16, '16:9': 16 / 9 }
  const expected = ratios[aspect]
  if (!expected || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 ||
      Math.abs(width / height / expected - 1) > 0.01) {
    throw new ImageOutputInvalidError('IMAGE_ASPECT_MISMATCH: Üretilen görsel seçilen en-boy oranıyla uyuşmuyor.')
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
