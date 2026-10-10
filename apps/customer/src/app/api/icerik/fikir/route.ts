import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import { rateLimit } from '@/lib/rate-limit'
import { BRIEF_CHIPS } from '@/lib/creative/types'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  let context: Awaited<ReturnType<typeof requireActiveOrg>>
  try { context = await requireActiveOrg() } catch { return NextResponse.json({error:'Oturum bulunamadı.'},{status:401}) }
  const {org,userId,supabase} = context
  if (org.suspended_at) return NextResponse.json({error:'İşletme askıda.'},{status:403})
  const limited = rateLimit(`creative-idea:${org.id}:${userId}`,{limit:10,windowMs:60000})
  if (!limited.ok) return NextResponse.json({error:'Biraz bekleyin.'},{status:429})
  const body = await request.json().catch(()=>null)
  const category = String(body?.category || '')
  if (!(BRIEF_CHIPS as readonly string[]).includes(category)) return NextResponse.json({error:'Geçersiz fikir.'},{status:400})
  const ids = Array.isArray(body?.productIds) ? body.productIds.filter((id:unknown)=>typeof id==='string').slice(0,8) : []
  const kitId = typeof body?.brandKitId==='string' ? body.brandKitId : ''
  let kits = supabase.from('brand_kits').select('name,tone,colors').eq('org_id',org.id)
  kits = kitId ? kits.eq('id',kitId) : kits.eq('is_default',true)
  const [kit,products] = await Promise.all([kits.limit(1).maybeSingle(),ids.length ? supabase.from('org_products').select('name,description').eq('org_id',org.id).eq('is_active',true).in('id',ids) : Promise.resolve({data:[]})])
  const fallback = `${org.name} için ${category.toLocaleLowerCase('tr-TR')} odaklı, markamızın renkleriyle sade bir tanıtım görseli hazırlayalım.`
  const system = 'Sen yaratıcı bir reklam direktörüsün. Verilen işletme, marka tonu ve ürün bilgilerine dayanarak özgün, sektöre özel ve dikkat çekici bir Türkçe kampanya / reklam görseli fikri yaz. En fazla iki akıcı cümle (maksimum 300 karakter). Klişe sloganlardan ("kaliteyle tanışın", "siz de gelin") kaçın. Verilmeyen fiyat, sahte indirim veya doğrulanmamış vaat uydurma. Yalnızca fikir metnini döndür.'
  try {
    const gateway = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')
    const token = (process.env.OMNISTUDIO_GATEWAY_TOKEN || process.env.WORKER_CONTROL_TOKEN || process.env.CHATGPT_API_KEY || '').trim()
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (token) {
      headers['authorization'] = `Bearer ${token}`
    }
    const response = await fetch(`${gateway}/v1/chat/completions`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        tenant_id: org.id,
        customer: org.name,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify({ category, business: org.name, brandKit: kit.data, products: products.data }) },
        ],
      }),
    })
    const result = await response.json()
    const text = result?.choices?.[0]?.message?.content?.trim() || result?.reply?.trim()
    if (!response.ok || typeof text !== 'string' || text.length < 15 || text.length > 500) {
      throw new Error('INVALID_IDEA')
    }
    return NextResponse.json({ text, source: 'gpt' })
  } catch {
    return NextResponse.json({ text: fallback, source: 'template' })
  }
}
