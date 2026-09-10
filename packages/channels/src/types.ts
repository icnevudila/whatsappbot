export const CHANNEL_IDS = [
  'whatsapp',
  'telegram',
  'instagram',
  'facebook',
  'rcs',
  'line',
  'wechat',
  'webchat',
  'shopify',
  'ikas',
  'woocommerce',
  'magento',
  'tsoft',
  'ticimax',
  'ideasoft',
  'proje',
  'trendyol',
  'hepsiburada',
  'sap',
  'oracle',
  'ifs',
  'nebim',
  'hubspot',
  'zendesk',
  'calendar',
] as const

export type ChannelId = (typeof CHANNEL_IDS)[number]

export type ChannelKind = 'messaging' | 'commerce' | 'marketplace' | 'erp' | 'crm'

export const CHANNEL_KIND: Record<ChannelId, ChannelKind> = {
  whatsapp: 'messaging',
  telegram: 'messaging',
  instagram: 'messaging',
  facebook: 'messaging',
  rcs: 'messaging',
  line: 'messaging',
  wechat: 'messaging',
  webchat: 'messaging',
  shopify: 'commerce',
  ikas: 'commerce',
  woocommerce: 'commerce',
  magento: 'commerce',
  tsoft: 'commerce',
  ticimax: 'commerce',
  ideasoft: 'commerce',
  proje: 'commerce',
  trendyol: 'marketplace',
  hepsiburada: 'marketplace',
  sap: 'erp',
  oracle: 'erp',
  ifs: 'erp',
  nebim: 'erp',
  hubspot: 'crm',
  zendesk: 'crm',
  calendar: 'crm',
}

export type ChannelEventDirection = 'inbound' | 'outbound'

export type ChannelEvent = {
  id: string
  channel: ChannelId
  orgId: string
  accountId: string
  direction: ChannelEventDirection
  externalThreadId: string
  externalMessageId?: string
  senderId: string
  text?: string
  payload?: Record<string, unknown>
  occurredAt: string
}

export type SendMessageInput = {
  orgId: string
  accountId: string
  channel: ChannelId
  threadId: string
  text: string
  metadata?: Record<string, unknown>
}

export type SendMessageResult =
  | { ok: true; externalMessageId: string; mock?: boolean }
  | { ok: false; error: string; code?: string; mock?: boolean }

export type HealthSnapshot = {
  healthy: boolean
  ready: boolean
  channel: ChannelId | ChannelId[]
  mockMode: boolean
  role?: string
  uptimeSeconds?: number
  detail?: string
}

export type CommerceLookupResult = {
  ok: boolean
  data?: Record<string, unknown>
  error?: string
  mock?: boolean
}
