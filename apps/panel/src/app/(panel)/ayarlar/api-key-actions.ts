'use server'

import { createHash, randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/org'

export type ApiKeyState = { error?: string; ok?: string; key?: string } | null

export async function createOrgApiKey(
  _prev: ApiKeyState,
  formData: FormData,
): Promise<ApiKeyState> {
  const name = String(formData.get('name') ?? 'default').trim() || 'default'
  try {
    const { userId, org, supabase } = await requireActiveOrg()
    if (org.role !== 'owner' && org.role !== 'admin') {
      return { error: 'Yetki yok.' }
    }
    const raw = `filo_${randomBytes(24).toString('base64url')}`
    const prefix = raw.slice(0, 8)
    const hash = createHash('sha256').update(raw).digest('hex')
    const { error } = await supabase.from('org_api_keys' as never).insert({
      org_id: org.id,
      created_by: userId,
      name,
      key_prefix: prefix,
      key_hash: hash,
    } as never)
    if (error) return { error: error.message }
    revalidatePath('/ayarlar')
    return {
      ok: 'Anahtar oluşturuldu — bir kez gösterilir, kopyalayın.',
      key: raw,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}
