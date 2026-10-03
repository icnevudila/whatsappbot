import { CREATIVE_FORMATS } from './types'

export const IMAGE_SOURCE_FORMATS = [...new Set(CREATIVE_FORMATS.map(item => item.format))]

export function isReadyImageSource(source: { format?: string | null; status?: string | null;
  publicUrl?: string | null; public_url?: string | null; storagePath?: string | null; storage_path?: string | null }): boolean {
  const url = source.publicUrl ?? source.public_url
  if (source.status !== 'ready' || !url?.trim() || !IMAGE_SOURCE_FORMATS.includes(source.format as any)) return false
  return ![url, source.storagePath ?? source.storage_path].some(value => {
    if (!value) return false
    try { return /\.(?:mp4|webm|mov|m4v|avi|mkv)(?:$|[?#])/i.test(decodeURIComponent(value)) }
    catch { return true }
  })
}
