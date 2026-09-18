import type { SVGProps } from 'react'

const paths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  phone: 'M8 2h8a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 M10 18h4',
  send: 'm22 2-7 20-4-9L2 9 22 2Z M11 13 22 2',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  campaign: 'm3 10 18-6v16L3 14v-4Z M7 15l2 6h4l-2-5 M3 10v4',
  inbox: 'M21 15V4H3v16h18v-5 M3 14h5l2 3h4l2-3h5',
  outbound: 'M5 12h14 M13 6l6 6-6 6',
  back: 'M19 12H5 M12 19l-7-7 7-7',
  shield: 'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7l-9-4Z',
  brand: 'm12 3 9 5-9 5-9-5 9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5',
  sparkles: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M6 6l2.5 2.5 M15.5 15.5 18 18 M18 6l-2.5 2.5 M8.5 15.5 6 18',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  check: 'm5 12 4 4L19 6',
  help: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  chart: 'M4 19V5 M4 19h16 M8 15v-4 M12 15V8 M16 15v-6',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  steps: 'M9 5h12 M9 12h12 M9 19h12 M4 6V4 M4 13v-2 M4 20v-2',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
  ellipsis: 'M12 5h.01 M12 12h.01 M12 19h.01',
  close: 'M6 6l12 12 M18 6 6 18',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  trash: 'M4 7h16 M10 11v6 M14 11v6 M6 7l1 14h10l1-14 M9 7V4h6v3',
  refresh: 'M21 12a9 9 0 1 1-2.6-6.3 M21 3v6h-6',
  edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  wand: 'M15 4V2 M15 16v-2 M8 9h2 M20 9h2 M18 12l1.5 1.5 M15 9h.01 M18 6l1.5-1.5 M3 21l9-9 M12 6 10.5 4.5',
  tune: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6',
  download: 'M12 3v12 M8 11l4 4 4-4 M5 19h14',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 6v6l4 2',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  filter: 'M3 5h18l-7 8v5l-4 2v-7z',
  search: 'M21 21l-4.35-4.35 M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
  plus: 'M12 5v14 M5 12h14',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M21 15l-3.1-3.1a2 2 0 0 0-2.8 0L6 21',
  copy: 'M9 9h11v11H9z M4 4h11v4',
  circle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20',
  gem: 'M3 9l9-6 9 6-9 12L3 9Z M3 9h18',
  zap: 'M13 2 4 13h7l-1 9 10-12h-7l1-8Z',
  paperclip: 'm21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48',
  mic: 'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3 M8 22h8',
  stop: 'M6 6h12v12H6z',
  play: 'M5 3l14 9-14 9V3z',
  video: 'm23 7-7 5 7 5V7z M1 5h15v14H1z',
  location: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
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
  if (href.startsWith('/hesaplar') || href.startsWith('/ayarlar/hatlar')) return 'phone'
  if (href.startsWith('/hizli-gonderim')) return 'send'
  if (href.startsWith('/kisiler')) return 'people'
  if (href.startsWith('/kampanyalar')) return 'campaign'
  if (href.startsWith('/icerik')) return 'sparkles'
  if (href.startsWith('/mesajlar') || href.startsWith('/gelenler')) return 'inbox'
  if (href.startsWith('/gidenler')) return 'outbound'
  if (href.startsWith('/kara-liste') || href.startsWith('/ayarlar/engellenenler')) return 'shield'
  if (href.startsWith('/durum')) return 'activity'
  if (href.startsWith('/raporlar')) return 'chart'
  if (href.startsWith('/marka-kiti') || href.startsWith('/ayarlar/marka')) return 'brand'
  if (href.startsWith('/ayarlar')) return 'settings'
  if (href.startsWith('/yardim')) return 'help'
  if (href.startsWith('/kurulum')) return 'steps'
  return 'overview'
}
