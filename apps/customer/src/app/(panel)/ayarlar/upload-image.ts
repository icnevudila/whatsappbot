const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_BYTES = 5 * 1024 * 1024

export function extForMime(mime: string) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

export async function readImageFile(file: File) {
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Dosya seçilmedi.' as const }
  }
  if (file.size > MAX_BYTES) {
    return { error: 'Görsel en fazla 5 MB olabilir.' as const }
  }
  if (!ALLOWED.has(file.type)) {
    return { error: 'PNG, JPG veya WEBP yükleyin.' as const }
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  return { buffer, mime: file.type, ext: extForMime(file.type) }
}

export function collectImageFiles(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)
}
