import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'

export const runtime = 'nodejs'
export const maxDuration = 45

export async function POST(req: Request) {
  try {
    const { org, supabase } = await requireActiveOrg()
    const body = await req.json()
    const { messageId, mediaUrl } = body

    if (!mediaUrl || typeof mediaUrl !== 'string') {
      return NextResponse.json({ success: false, error: 'Ses dosyası URLsi bulunamadı.' }, { status: 400 })
    }

    // 1. Check if already transcribed in DB
    if (messageId) {
      const { data: existing } = await supabase
        .from('message_log')
        .select('body')
        .eq('id', Number(messageId))
        .eq('org_id', org.id)
        .maybeSingle()

      if (existing?.body && existing.body.trim().length > 0 && !existing.body.startsWith('(')) {
        return NextResponse.json({ success: true, text: existing.body })
      }
    }

    // 2. Try Primary Zero-Cost Local Hetzner Whisper Service ($0.00 / 0 TL)
    const whisperHost = process.env.WHISPER_SERVICE_URL?.trim() || 'http://167.233.201.31:3457'
    let transcribedText = ''
    let providerUsed = 'hetzner_local_whisper'

    try {
      const localRes = await fetch(`${whisperHost}/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mediaUrl }),
        signal: AbortSignal.timeout(20000),
      })

      if (localRes.ok) {
        const localJson = (await localRes.json()) as { success?: boolean; text?: string }
        if (localJson.success && typeof localJson.text === 'string') {
          transcribedText = localJson.text.trim()
        }
      }
    } catch {
      // Local service temporarily unreachable, will try fallback below
    }

    // 3. Fallback to Groq / OpenAI only if local Whisper didn't transcribe
    if (!transcribedText) {
      const audioRes = await fetch(mediaUrl)
      if (!audioRes.ok) {
        return NextResponse.json(
          { success: false, error: 'Ses dosyası indirilemedi (' + audioRes.status + ').' },
          { status: 502 },
        )
      }
      const audioBuffer = await audioRes.arrayBuffer()
      const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' })

      // Try sending audio buffer directly to local whisper in case URL was restricted
      try {
        const b64 = Buffer.from(audioBuffer).toString('base64')
        const directLocalRes = await fetch(`${whisperHost}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio_base64: b64 }),
          signal: AbortSignal.timeout(20000),
        })
        if (directLocalRes.ok) {
          const directJson = (await directLocalRes.json()) as { success?: boolean; text?: string }
          if (directJson.success && typeof directJson.text === 'string') {
            transcribedText = directJson.text.trim()
          }
        }
      } catch {
        // Continue to cloud fallback
      }

      // If still not transcribed, check Groq/OpenAI cloud keys
      if (!transcribedText) {
        const groqKey = process.env.GROQ_API_KEY?.trim()
        const openaiKey = process.env.OPENAI_API_KEY?.trim()
        const apiKey = groqKey || openaiKey

        if (apiKey) {
          const apiUrl = groqKey
            ? 'https://api.groq.com/openai/v1/audio/transcriptions'
            : 'https://api.openai.com/v1/audio/transcriptions'
          const model = groqKey ? 'whisper-large-v3-turbo' : 'whisper-1'

          const formData = new FormData()
          formData.append('file', audioBlob, 'audio.ogg')
          formData.append('model', model)
          formData.append('language', 'tr')
          formData.append('temperature', '0')

          const cloudRes = await fetch(apiUrl, {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + apiKey },
            body: formData,
          })

          if (cloudRes.ok) {
            const cloudJson = (await cloudRes.json()) as { text?: string }
            transcribedText = (cloudJson.text || '').trim()
            providerUsed = groqKey ? 'groq' : 'openai'
          }
        }
      }
    }

    if (!transcribedText) {
      return NextResponse.json({ success: false, error: 'Seste anlaşılır bir konuşma tespit edilemedi veya ses boş.' })
    }

    // 4. Cache in DB so future views don't re-transcribe
    if (messageId) {
      await supabase
        .from('message_log')
        .update({ body: transcribedText })
        .eq('id', Number(messageId))
        .eq('org_id', org.id)
    }

    return NextResponse.json({ success: true, text: transcribedText, provider: providerUsed })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'İşlem başarısız.' },
      { status: 500 },
    )
  }
}
