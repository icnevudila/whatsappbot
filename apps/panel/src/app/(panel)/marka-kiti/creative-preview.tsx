'use client'

import {
  FORMATS,
  headlineSize,
  type CreativeInput,
} from '@/lib/creative-templates'

/**
 * Tarayici onizlemesi. Sunucudaki satori sablonlariyla ayni olculeri
 * kullaniyor (creative-templates.ts), sadece kucuk genislikte ciziyor.
 * Ikisi ayrilirsa kullanici onizlemede gordugunden farkli bir gorsel gonderir.
 */
export function CreativePreview({
  input,
  width = 288,
}: {
  input: CreativeInput
  width?: number
}) {
  const format = FORMATS[input.format]
  const height = Math.round((format.height / format.width) * width)
  const pad = width * 0.085
  const displayHeadline = input.headline.trim() || 'Kampanya başlığı'
  const titleSize = headlineSize(displayHeadline, width)
  const { colors, subline, badge, logoUrl } = input
  const headlineEmpty = !input.headline.trim()
  const headlineOpacity = headlineEmpty ? 0.45 : 1

  const logo = logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt=""
      style={{
        width: width * 0.14,
        height: width * 0.14,
        objectFit: 'contain',
      }}
    />
  ) : null

  const frame = {
    width,
    height,
    overflow: 'hidden' as const,
    borderRadius: 6,
  }

  if (input.template === 'photo') {
    return (
      <div
        style={{
          ...frame,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          position: 'relative',
          background: colors.primary,
          padding: pad,
        }}
      >
        {input.backgroundUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={input.backgroundUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : null}

        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '100%',
            height: '75%',
            backgroundImage:
              'linear-gradient(to bottom, rgba(6,8,10,0) 0%, rgba(6,8,10,0.55) 32%, rgba(6,8,10,0.85) 70%, rgba(6,8,10,0.92) 100%)',
          }}
        />

        {logoUrl ? (
          <div style={{ position: 'absolute', top: pad, left: pad }}>{logo}</div>
        ) : null}

        <div
          style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}
        >
          {badge ? (
            <span
              style={{
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
            </span>
          ) : null}

          <span
            style={{
              color: '#ffffff',
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -0.9,
              opacity: headlineOpacity,
            }}
          >
            {displayHeadline}
          </span>

          {subline ? (
            <span
              style={{
                marginTop: pad * 0.35,
                color: 'rgba(255,255,255,0.82)',
                fontSize: width * 0.036,
                lineHeight: 1.35,
              }}
            >
              {subline}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  if (input.template === 'split') {
    return (
      <div style={{ ...frame, display: 'flex', background: colors.background }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: width * 0.34,
            background: colors.primary,
            padding: pad * 0.7,
          }}
        >
          {logo}
          {badge ? (
            <span
              style={{
                color: colors.accent,
                fontSize: width * 0.032,
                fontWeight: 700,
                letterSpacing: -0.2,
              }}
            >
              {badge}
            </span>
          ) : null}
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
          <span
            style={{
              color: colors.text,
              fontSize: titleSize * 0.78,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -0.6,
              opacity: headlineOpacity,
            }}
          >
            {displayHeadline}
          </span>
          {subline ? (
            <span
              style={{
                marginTop: pad * 0.45,
                color: colors.secondary,
                fontSize: width * 0.036,
                lineHeight: 1.4,
              }}
            >
              {subline}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  if (input.template === 'frame') {
    return (
      <div
        style={{
          ...frame,
          display: 'flex',
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
            border: `${Math.max(1, width * 0.008)}px solid ${colors.accent}`,
            padding: pad,
            textAlign: 'center',
          }}
        >
          {logo}
          <span
            style={{
              marginTop: pad * 0.6,
              color: colors.text,
              fontSize: titleSize * 0.8,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -0.6,
              opacity: headlineOpacity,
            }}
          >
            {displayHeadline}
          </span>
          {subline ? (
            <span
              style={{
                marginTop: pad * 0.4,
                color: colors.secondary,
                fontSize: width * 0.034,
                lineHeight: 1.4,
              }}
            >
              {subline}
            </span>
          ) : null}
          {badge ? (
            <span
              style={{
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
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        ...frame,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: colors.primary,
        padding: pad,
      }}
    >
      <div style={{ display: 'flex' }}>{logo}</div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {badge ? (
          <span
            style={{
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
          </span>
        ) : null}

        <span
          style={{
            color: colors.background,
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -0.9,
            opacity: headlineOpacity,
          }}
        >
          {displayHeadline}
        </span>

        {subline ? (
          <span
            style={{
              marginTop: pad * 0.4,
              color: colors.accent,
              fontSize: width * 0.038,
              lineHeight: 1.35,
            }}
          >
            {subline}
          </span>
        ) : null}
      </div>
    </div>
  )
}
