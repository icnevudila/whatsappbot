import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireActiveOrg } from '@/lib/org'
import { serveCreativeDownload, type DownloadCreative, type DownloadOutput } from '@/lib/creative/download'
import type { SupabaseClient } from '@supabase/supabase-js'

// ai_media_outputs exists in migrations but is absent from the checked-in generated Database.
// Narrow this compatibility view to the exact read contract; no service-role client or any.
type OutputDatabase = {public:{Tables:{ai_media_outputs:{Row:DownloadOutput;Insert:Partial<DownloadOutput>;Update:Partial<DownloadOutput>;Relationships:[]}};Views:Record<string,never>;Functions:Record<string,never>;Enums:Record<string,never>;CompositeTypes:Record<string,never>}}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 180

async function download(request: Request, {params}: {params: Promise<{creativeId: string}>}) {
  const headers = {'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff'}
  const db = await createSupabaseServerClient()
  // Validate a real Auth session, never the live-monitor PIN or an admin-cookie bypass.
  const {data,error} = await db.auth.getUser()
  if (error || !data.user || data.user.is_anonymous) return Response.json({error:'İndirmek için giriş yapın.'},{status:401,headers})
  let active: Awaited<ReturnType<typeof requireActiveOrg>>
  try { active = await requireActiveOrg() }
  catch { return Response.json({error:'Aktif işletme erişimi doğrulanamadı.'},{status:403,headers}) }
  if (active.userId !== data.user.id) return Response.json({error:'Oturum doğrulanamadı.'},{status:401,headers})
  const {creativeId} = await params
  return serveCreativeDownload(request,creativeId,{
    orgId:active.org.id,
    creative:async id => {
      const result = await db.from('creatives').select('id,org_id,title,format,status,storage_path,public_url,payload')
        .eq('id',id).eq('org_id',active.org.id).maybeSingle()
      if (result.error) throw result.error
      return result.data as DownloadCreative | null
    },
    output:async id => {
      const outputDb = db as unknown as SupabaseClient<OutputDatabase>
      const result = await outputDb.from('ai_media_outputs').select('id,org_id,file_path,storage_url,sha256,byte_size,verified,is_approved,duration_seconds,width,height,product_type')
        .eq('id',id).eq('org_id',active.org.id).maybeSingle()
      if (result.error) throw result.error
      return result.data as DownloadOutput | null
    },
    signStorage:async key => {
      const result = await db.storage.from('creatives').createSignedUrl(key,120)
      return result.error ? null : result.data.signedUrl
    },
    storageOrigin:process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    gatewayOrigin:process.env.OMNISTUDIO_GATEWAY_URL || process.env.AI_GATEWAY_URL || 'https://media.167.233.201.31.nip.io',
    mediaSigningSecret:process.env.MEDIA_SIGNING_SECRET || process.env.OMNISTUDIO_GATEWAY_TOKEN || '',
    fetch,
  })
}

export const GET = download
export const HEAD = download
