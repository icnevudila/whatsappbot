import type { BrandKitOption } from '@/components/ai-image'

export const WIZARD_STEPS = [
  { id: 'kampanya', label: 'Kampanya' },
  { id: 'alicilar', label: 'Alıcılar' },
  { id: 'icerik', label: 'İçerik' },
  { id: 'gonderen', label: 'Gönderen' },
  { id: 'onizleme', label: 'Önizleme' },
  { id: 'yayinla', label: 'Yayınla' },
] as const

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id']

export type ListOption = {
  id: string
  label: string
  detail?: string
  contactCount?: number
}

export type AccountOption = {
  id: string
  label: string
  phone?: string | null
  detail?: string
  disabled?: boolean
  connected?: boolean
}

export type CreativeOption = {
  id: string
  url: string
}

export type WizardCampaign = {
  id: string
  name: string
  status: string
  body: string | null
  media_url: string | null
  message_type: string
  source_list_ids: string[]
  account_ids: string[]
  min_delay_seconds: number
  max_delay_seconds: number
  daily_cap_per_account: number
  body_b?: string | null
  ab_percent?: number | null
  scheduled_at?: string | null
}

export type WizardSharedProps = {
  orgId: string
  lists: ListOption[]
  accounts: AccountOption[]
  creatives: CreativeOption[]
  aiEnabled: boolean
  imageAiEnabled: boolean
  brandName?: string
  brandTone?: string
  brandKits: BrandKitOption[]
}

export function parseWizardStep(raw: string | null | undefined): WizardStepId {
  return WIZARD_STEPS.some((step) => step.id === raw) ? (raw as WizardStepId) : 'kampanya'
}

export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatCount(n: number): string {
  return n.toLocaleString('tr-TR')
}
