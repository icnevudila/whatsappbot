import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'
import { generateImage, type AspectRatio } from '@/lib/ai/image'
import {
  DEFAULT_COLORS,
  FORMATS,
  headlineSize,
  suggestBackgroundPrompt,
  type CreativeInput,
  type FormatKey,
  type TemplateKey,
} from '@/lib/creative-templates'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * satori woff2 okuyamiyor; ttf, otf ve woff calisiyor.
 *
 * Google Fonts CSS ucu format secimini istegin User-Agent'ina gore yapiyor:
 * modern bir UA woff2 donuyor (satori'de ise yaramaz), eski bir UA ise
 * desteklenen bir bicim donuyor. Olculen guncel davranis .woff donmesi,
 * eskiden .ttf donuyordu. Bu yuzden tek bir uzantiya bagli kalmiyoruz,
 * desteklenen uzantilarin hepsini kabul ediyoruz.
 *
 * Sonuc modul seviyesinde onbellege aliniyor, her uretimde indirilmiyor.
 * Basarisiz olursa onbellek temizleniyor ki sonraki istek yeniden denesin.
 */
let fontCache: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700 }[]> | null =
  null

async function loadFonts() {
  if (fontCache) return fontCache

  fontCache = (async () => {
    const response = await fetch(
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;700',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.93 Safari/537.36',
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Yazi tipi listesi alinamadi (HTTP ${response.status})`)
    }

    const css = await response.text()

    const urls = [
      ...css.matchAll(/src:\s*url\((https:[^)]+\.(?:ttf|otf|woff))\)/g),
    ].map((match) => match[1])

    if (urls.length === 0) {
      // Bicim degisirse hangi cevabi aldigimizi bilmek sart: onceki surumde
      // sadece "indirilemedi" yaziyordu ve nedeni gorunmuyordu.
      throw new Error(
        `Yazi tipi baglantisi bulunamadi. Google Fonts cevabi: ${css.slice(0, 200)}`,
      )
    }

    const weights: (400 | 700)[] = [400, 700]
    const buffers = await Promise.all(
      urls.slice(0, 2).map(async (url) => {
        const font = await fetch(url)
        if (!font.ok) throw new Error(`Yazi tipi indirilemedi (HTTP ${font.status})`)
        return font.arrayBuffer()
      }),
    )

    return buffers.map((data, index) => ({
      name: 'Inter',
      data,
      weight: weights[index] ?? 400,
    }))
  })()

  try {
    return await fontCache
  } catch (error) {
    fontCache = null
    throw error
  }
}

/** Kreatif bicimini saglayicilarin anladigi en boy oranina cevirir. */
const ASPECT: Record<FormatKey, AspectRatio> = {
  square: '1:1',
  feed: '4:5',
  story: '9:16',
}

/**
 * Arka plan uretimi 40 saniyeye kadar surebiliyor. Basarisiz olursa hata
 * dondurmek yerine sablonu arka plansiz uretiyoruz: kullanici en azindan
 * markali bir gorsel aliyor, elinde hicbir sey kalmiyor olmasin.
 */
async function fetchBackground(
  prompt: string,
  format: FormatKey,
): Promise<{ dataUri: string; provider: string } | null> {
  try {
    const { image } = await generateImage(prompt, ASPECT[format])
    return {
      dataUri: `data:${image.mimeType};base64,${image.data.toString('base64')}`,
      provider: image.provider,
    }
  } catch {
    return null
  }
}

function render(
  input: CreativeInput,
  width: number,
  height: number,
  background: string | null,
) {
  const { colors, headline, subline, badge, logoUrl, template } = input
  const pad = Math.round(width * 0.085)
  const titleSize = headlineSize(headline, width)

  const logo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt=""
      width={Math.round(width * 0.14)}
      height={Math.round(width * 0.14)}
      style={{ objectFit: 'contain' }}
    />
  ) : null

  if (template === 'photo') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          position: 'relative',
          width,
          height,
          background: colors.primary,
          padding: pad,
        }}
      >
        {background ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={background}
            alt=""
            width={width}
            height={height}
            style={{ position: 'absolute', top: 0, left: 0, objectFit: 'cover' }}
          />
        ) : null}

        {/* Karartma katmani: AI arka plani her zaman koyu cikmiyor, bu olmadan
            beyaz baslik okunmaz hale gelebiliyor. Duz opaklik yerine gradyan
            kullaniyoruz; sabit opaklik goruntunun ortasinda gozle secilen
            keskin bir cizgi birakiyordu. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width,
            height: height * 0.75,
            backgroundImage:
              'linear-gradient(to bottom, rgba(6,8,10,0) 0%, rgba(6,8,10,0.55) 32%, rgba(6,8,10,0.85) 70%, rgba(6,8,10,0.92) 100%)',
          }}
        />

        {logoUrl ? (
          <div
            style={{
              display: 'flex',
              position: 'absolute',
              top: pad,
              left: pad,
            }}
          >
            {logo}
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {badge ? (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                marginBottom: pad * 0.4,
                background: colors.accent,
                color: '#06080a',
                fontSize: width * 0.03,
                fontWeight: 700,
                padding: `${width * 0.016}px ${width * 0.036}px`,
                borderRadius: 999,
              }}
            >
              {badge}
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              color: '#ffffff',
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -3,
            }}
          >
            {headline}
          </div>

          {subline ? (
            <div
              style={{
                display: 'flex',
                marginTop: pad * 0.35,
                color: 'rgba(255,255,255,0.82)',
                fontSize: width * 0.036,
                lineHeight: 1.35,
              }}
            >
              {subline}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (template === 'split') {
    return (
      <div style={{ display: 'flex', width, height, background: colors.background }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: width * 0.34,
            height,
            background: colors.primary,
            padding: pad * 0.7,
          }}
        >
          {logo}
          {badge ? (
            <div
              style={{
                display: 'flex',
                color: colors.accent,
                fontSize: width * 0.032,
                fontWeight: 700,
                letterSpacing: -0.5,
              }}
            >
              {badge}
            </div>
          ) : (
            <div style={{ display: 'flex' }} />
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            flex: 1,
            padding: pad,
          }}
        >
          <div
            style={{
              display: 'flex',
              color: colors.text,
              fontSize: titleSize * 0.78,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -2,
            }}
          >
            {headline}
          </div>
          {subline ? (
            <div
              style={{
                display: 'flex',
                marginTop: pad * 0.45,
                color: colors.secondary,
                fontSize: width * 0.036,
                lineHeight: 1.4,
              }}
            >
              {subline}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (template === 'frame') {
    return (
      <div
        style={{
          display: 'flex',
          width,
          height,
          background: colors.background,
          padding: pad * 0.5,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            border: `${Math.round(width * 0.008)}px solid ${colors.accent}`,
            padding: pad,
          }}
        >
          {logo}
          <div
            style={{
              display: 'flex',
              marginTop: pad * 0.6,
              color: colors.text,
              fontSize: titleSize * 0.8,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -2,
              textAlign: 'center',
            }}
          >
            {headline}
          </div>
          {subline ? (
            <div
              style={{
                display: 'flex',
                marginTop: pad * 0.4,
                color: colors.secondary,
                fontSize: width * 0.034,
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              {subline}
            </div>
          ) : null}
          {badge ? (
            <div
              style={{
                display: 'flex',
                marginTop: pad * 0.7,
                background: colors.accent,
                color: colors.background,
                fontSize: width * 0.03,
                fontWeight: 700,
                padding: `${width * 0.018}px ${width * 0.04}px`,
                borderRadius: 999,
              }}
            >
              {badge}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  // bold — tam zemin
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width,
        height,
        background: colors.primary,
        padding: pad,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>{logo}</div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {badge ? (
          <div
            style={{
              display: 'flex',
              alignSelf: 'flex-start',
              marginBottom: pad * 0.45,
              background: colors.accent,
              color: colors.primary,
              fontSize: width * 0.03,
              fontWeight: 700,
              padding: `${width * 0.016}px ${width * 0.036}px`,
              borderRadius: 999,
            }}
          >
            {badge}
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            color: colors.background,
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -3,
          }}
        >
          {headline}
        </div>

        {subline ? (
          <div
            style={{
              display: 'flex',
              marginTop: pad * 0.4,
              color: colors.accent,
              fontSize: width * 0.038,
              lineHeight: 1.35,
            }}
          >
            {subline}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Oturum bulunamadi.' }, { status: 401 })
  }

  let body: Partial<CreativeInput> & { brandKitId?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Gecersiz istek.' }, { status: 400 })
  }

  const headline = String(body.headline ?? '').trim()
  if (!headline) {
    return NextResponse.json({ error: 'Baslik gerekli.' }, { status: 400 })
  }

  const format = (body.format ?? 'square') as FormatKey
  const template = (body.template ?? 'bold') as TemplateKey
  const size = FORMATS[format] ?? FORMATS.square

  const input: CreativeInput = {
    template,
    format,
    headline,
    subline: String(body.subline ?? '').trim(),
    badge: String(body.badge ?? '').trim(),
    colors: { ...DEFAULT_COLORS, ...(body.colors ?? {}) },
    logoUrl: body.logoUrl ?? null,
    backgroundPrompt: String(body.backgroundPrompt ?? '').trim(),
  }

  try {
    const fonts = await loadFonts()

    const background =
      template === 'photo'
        ? await fetchBackground(
            input.backgroundPrompt || suggestBackgroundPrompt(headline),
            format,
          )
        : null

    const image = new ImageResponse(
      render(input, size.width, size.height, background?.dataUri ?? null),
      {
        width: size.width,
        height: size.height,
        fonts: fonts.map((font) => ({
          name: font.name,
          data: font.data,
          weight: font.weight,
          style: 'normal' as const,
        })),
      },
    )

    const png = Buffer.from(await image.arrayBuffer())

    // Her uretim yeni yol aliyor: Baileys mediaCache anahtari yalnizca URL,
    // ayni yolun uzerine yazmak eski gorselin gonderilmesine yol acar.
    const path = `${user.id}/${crypto.randomUUID()}.png`

    const { error: uploadError } = await supabase.storage
      .from('creatives')
      .upload(path, png, { contentType: 'image/png', upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)

    const { data: creative, error: insertError } = await supabase
      .from('creatives')
      .insert({
        owner_id: user.id,
        brand_kit_id: body.brandKitId ?? null,
        template,
        format,
        payload: {
          headline: input.headline,
          subline: input.subline,
          badge: input.badge,
          background_prompt: input.backgroundPrompt || null,
          // Hangi saglayicinin urettigi kayitli kalsin: kalite karsilastirmasi
          // ve kota takibi icin sonradan tek bilgi kaynagi bu olacak.
          background_provider: background?.provider ?? null,
          background_ok: template === 'photo' ? background !== null : null,
        },
        storage_path: path,
        public_url: publicUrl.publicUrl,
        width: size.width,
        height: size.height,
        status: 'ready',
      })
      .select('id, public_url')
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ id: creative.id, url: creative.public_url })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gorsel uretilemedi.' },
      { status: 500 },
    )
  }
}
