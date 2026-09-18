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

    // 2. Fetch audio file
    const audioRes = await fetch(mediaUrl)
    if (!audioRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Ses dosyası indirilemedi (' + audioRes.status + ').' },
        { status: 502 },
      )
    }
    const audioBuffer = await audioRes.arrayBuffer()
    const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' })

    // 3. Determine Whisper API Provider (Groq Free Tier or OpenAI)
    const groqKey = process.env.GROQ_API_KEY?.trim()
    const openaiKey = process.env.OPENAI_API_KEY?.trim()

    const apiKey = groqKey || openaiKey
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Transkripsiyon API anahtarı (GROQ_API_KEY veya OPENAI_API_KEY) tanımlı değil.' },
        { status: 500 },
      )
    }

    const apiUrl = groqKey
      ? 'https://api.groq.com/openai/v1/audio/transcriptions'
      : 'https://api.openai.com/v1/audio/transcriptions'
    const model = groqKey ? 'whisper-large-v3-turbo' : 'whisper-1'

    const formData = new FormData()
    formData.append('file', audioBlob, 'audio.ogg')
    formData.append('model', model)
    formData.append('language', 'tr')
    formData.append('temperature', '0')

    const whisperRes = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
      },
      body: formData,
    })

    if (!whisperRes.ok) {
      const errText = await whisperRes.text()
      return NextResponse.json(
        { success: false, error: 'Yapay zeka ses çeviri hatası: ' + errText },
        { status: 502 },
      )
    }

    const json = await whisperRes.json()
    const transcribedText = (json.text || '').trim()

    if (!transcribedText) {
      return NextResponse.json({ success: false, error: 'Seste anlaşılır bir konuşma tespit edilemedi.' })
    }

    // 4. Cache in DB so future views don't re-transcribe
    if (messageId) {
      await supabase
        .from('message_log')
        .update({ body: transcribedText })
        .eq('id', Number(messageId))
        .eq('org_id', org.id)
    }

    return NextResponse.json({ success: true, text: transcribedText, provider: groqKey ? 'groq' : 'openai' })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'İşlem başarısız.' },
      { status: 500 },
    )
  }
}
