import type { SVGProps } from 'react'

const paths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 M10 18h4',
  send: 'm22 2-7 20-4-9L2 9 22 2Z M11 13 22 2',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  campaign: 'm3 10 18-6v16L3 14v-4Z M7 15l2 6h4l-2-5 M3 10v4',
  inbox: 'M21 15V4H3v16h18v-5 M3 14h5l2 3h4l2-3h5',
  outbound: 'M5 12h14 M13 6l6 6-6 6',
  shield: 'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7l-9-4Z',
  brand: 'm12 3 9 5-9 5-9-5 9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  check: 'm5 12 4 4L19 6',
  help: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  chart: 'M4 19V5 M4 19h16 M8 15v-4 M12 15V8 M16 15v-6',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  steps: 'M9 5h12 M9 12h12 M9 19h12 M4 6V4 M4 13v-2 M4 20v-2',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
} as const

export type IconName = keyof typeof paths

export function Icon({
  name,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  )
}

/** Nav href → ikon. Bilinmeyen yollar overview. */
export function iconForHref(href: string): IconName {
  if (href.startsWith('/ozet')) return 'overview'
  if (href.startsWith('/hesaplar')) return 'phone'
  if (href.startsWith('/hizli-gonderim')) return 'send'
  if (href.startsWith('/kisiler')) return 'people'
  if (href.startsWith('/kampanyalar')) return 'campaign'
  if (href.startsWith('/gelenler')) return 'inbox'
  if (href.startsWith('/gidenler')) return 'outbound'
  if (href.startsWith('/kara-liste')) return 'shield'
  if (href.startsWith('/durum')) return 'activity'
  if (href.startsWith('/raporlar')) return 'chart'
  if (href.startsWith('/marka-kiti')) return 'brand'
  if (href.startsWith('/ayarlar')) return 'settings'
  if (href.startsWith('/yardim')) return 'help'
  if (href.startsWith('/kurulum')) return 'steps'
  return 'overview'
}
