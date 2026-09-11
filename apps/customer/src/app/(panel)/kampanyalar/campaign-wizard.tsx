'use client'

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSyncBusy } from '@/components/busy'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { Button, Card, Field, Input, Notice, Textarea } from '@/components/ui'
import { appendOptOutFooter } from '@/lib/opt-out-footer'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { countUniqueRecipients, createCampaign, duplicateCampaign, updateCampaign, type CampaignState } from './actions'
import {
  AiRewriteBar,
  AiWriteModal,
  AudiencePicker,
  MediaPicker,
  PublishCards,
  SenderPicker,
  SummaryRow,
  WaPreview,
  WizardStepper,
} from './campaign-wizard-ui'
import {
  WIZARD_STEPS,
  formatCount,
  parseWizardStep,
  toDatetimeLocal,
  type WizardCampaign,
  type WizardSharedProps,
  type WizardStepId,
} from './campaign-wizard-types'

const DRAFT_KEY = 'wa.customer.campaign-wizard.v1'

type DraftShape = {
  name: string
  body: string
  mediaUrl: string
  messageType: string
  lists: string[]
  accounts: string[]
  startMode: 'draft' | 'schedule' | 'now'
  scheduledAt: string
}

function typeFromMime(mime: string): 'image' | 'video' | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return null
}

export function CampaignWizard({
  mode,
  campaign,
  initialStep,
  initialMediaUrl,
  ...shared
}: WizardSharedProps & {
  mode: 'create' | 'edit'
  campaign?: WizardCampaign
  initialStep?: string
  initialMediaUrl?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const toast = useToast()
  const confirm = useConfirm()
  const action = mode === 'create' ? createCampaign : updateCampaign
  const [state, formAction, pending] = useActionState<CampaignState, FormData>(action, null)
  const [step, setStep] = useState<WizardStepId>(() => parseWizardStep(initialStep ?? searchParams.get('adim')))
  const [name, setName] = useState(campaign?.name ?? '')
  const [body, setBody] = useState(campaign?.body ?? '')
  const [mediaUrl, setMediaUrl] = useState(campaign?.media_url ?? initialMediaUrl ?? '')
  const [messageType, setMessageType] = useState(
    campaign?.message_type || (initialMediaUrl ? 'image' : 'text'),
  )
  const [selectedLists, setSelectedLists] = useState<string[]>(campaign?.source_list_ids ?? [])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(campaign?.account_ids ?? [])
  const [startMode, setStartMode] = useState<'draft' | 'schedule' | 'now'>(
    campaign?.status === 'scheduled' ? 'schedule' : 'draft',
  )
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(campaign?.scheduled_at))
  const [hint, setHint] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uniqueCount, setUniqueCount] = useState<number | null>(null)
  const [counting, setCounting] = useState(false)
  const [dirty, setDirty] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const sendArmedRef = useRef(false)
  const allowSubmitRef = useRef(false)
  const restored = useRef(false)
  const [countPending, startCount] = useTransition()

  const structureLocked = campaign?.status === 'running'
  const readOnly = campaign ? !['draft', 'paused', 'scheduled', 'running', 'stopped'].includes(campaign.status) : false
  const stepIndex = WIZARD_STEPS.findIndex((item) => item.id === step)

  useSyncBusy(pending, 'Kampanya kaydediliyor…')
  useSyncBusy(uploading, 'Görsel yükleniyor…')

  useEffect(() => {
    if (mode !== 'create' || restored.current) return
    restored.current = true
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as DraftShape
      setName(saved.name ?? '')
      setBody(saved.body ?? '')
      if (initialMediaUrl) {
        setMediaUrl(initialMediaUrl)
        setMessageType('image')
      } else {
        setMediaUrl(saved.mediaUrl ?? '')
        setMessageType(saved.messageType || 'text')
      }
      setSelectedLists(saved.lists ?? [])
      setSelectedAccounts(saved.accounts ?? [])
      setStartMode(saved.startMode ?? 'draft')
      setScheduledAt(saved.scheduledAt ?? '')
    } catch {
      /* ignore */
    }
  }, [mode, initialMediaUrl])

  useEffect(() => {
    if (mode !== 'create' || !dirty) return
    const payload: DraftShape = {
      name,
      body,
      mediaUrl,
      messageType,
      lists: selectedLists,
      accounts: selectedAccounts,
      startMode,
      scheduledAt,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
  }, [mode, dirty, name, body, mediaUrl, messageType, selectedLists, selectedAccounts, startMode, scheduledAt])

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirty || pending) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [dirty, pending])

  useEffect(() => {
    if (state?.error) {
      setFormError(state.error)
      toast(state.error, 'danger')
    }
    if (state?.ok) {
      toast(state.ok, 'success')
      setDirty(false)
      if (mode === 'create') localStorage.removeItem(DRAFT_KEY)
    }
  }, [state?.error, state?.ok, toast, mode])

  useEffect(() => {
    setStep(parseWizardStep(searchParams.get('adim')))
  }, [searchParams])

  const go = (next: WizardStepId) => {
    setHint(null)
    setFormError(null)
    setStep(next)
    const params = new URLSearchParams(searchParams.toString())
    params.set('adim', next)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  useEffect(() => {
    if (selectedLists.length === 0) {
      setUniqueCount(0)
      return
    }
    const handle = window.setTimeout(() => {
      startCount(async () => {
        setCounting(true)
        const result = await countUniqueRecipients(selectedLists)
        setUniqueCount(result.count)
        setCounting(false)
      })
    }, 250)
    return () => window.clearTimeout(handle)
  }, [selectedLists])

  const mark = () => setDirty(true)

  const validateStep = (id: WizardStepId): string | null => {
    if (id === 'kampanya' && !name.trim()) return 'Kampanyaya bir ad verin.'
    if (id === 'alicilar') {
      if (shared.lists.length === 0) return 'Önce Kişiler’den bir grup oluşturun.'
      if (selectedLists.length === 0) return 'En az bir kişi grubu seçin.'
    }
    if (id === 'icerik' && !body.trim() && !mediaUrl) return 'Mesaj yazın veya görsel ekleyin.'
    if (id === 'gonderen') {
      if (shared.accounts.filter((item) => !item.disabled).length === 0 && selectedAccounts.length === 0) {
        return 'Önce Hatlar’dan bir hat bağlayın.'
      }
      if (selectedAccounts.length === 0) return 'En az bir WhatsApp hattı seçin.'
    }
    if (id === 'yayinla' && startMode === 'schedule' && !scheduledAt) return 'Planlamak için tarih ve saat seçin.'
    return null
  }

  const goNext = () => {
    const error = validateStep(step)
    if (error) {
      setHint(error)
      return
    }
    allowSubmitRef.current = false
    const next = WIZARD_STEPS[Math.min(WIZARD_STEPS.length - 1, stepIndex + 1)]
    if (next) go(next.id)
  }

  const goBack = () => {
    const prev = WIZARD_STEPS[Math.max(0, stepIndex - 1)]
    if (prev) go(prev.id)
  }

  const upload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    const detected = typeFromMime(file.type)
    if (detected !== 'image') {
      setUploading(false)
      setUploadError('PNG, JPG veya WEBP yükleyin.')
      return
    }
    try {
      const supabase = getSupabaseBrowserClient()
      const extension = file.name.split('.').pop() ?? 'jpg'
      const path = `${shared.orgId}/${crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage.from('creatives').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (error) throw error
      const { data } = supabase.storage.from('creatives').getPublicUrl(path)
      setMediaUrl(data.publicUrl)
      setMessageType('image')
      mark()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('creatives').insert({
          org_id: shared.orgId,
          created_by: user.id,
          title: file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Kampanya görseli',
          source: 'upload',
          generation_type: 'upload',
          template: 'upload',
          format: 'feed',
          status: 'ready',
          public_url: data.publicUrl,
          storage_path: path,
          payload: { source: 'campaign-upload' },
        })
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Dosya yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  const selectedListNames = shared.lists
    .filter((item) => selectedLists.includes(item.id))
    .map((item) => item.label)
  const submitLabel = useMemo(() => {
    if (pending) return 'Kaydediliyor…'
    if (mode === 'edit' && campaign?.status === 'running') return 'Kalan gönderimler için kaydet'
    if (startMode === 'now') {
      return uniqueCount ? `${formatCount(uniqueCount)} kişiye gönderimi başlat` : 'Gönderimi başlat'
    }
    if (startMode === 'schedule') return 'Planı kaydet'
    return mode === 'edit' ? 'Değişiklikleri kaydet' : 'Taslak olarak kaydet'
  }, [pending, mode, campaign?.status, startMode, uniqueCount])

  const [copyPending, startCopy] = useTransition()

  if (readOnly && campaign) {
    return (
      <Card>
        <div className="space-y-3 p-5">
          <h1 className="text-[22px] font-semibold tracking-[-0.03em]">Bu kampanya tamamlandı</h1>
          <p className="text-[13.5px] text-ink-muted">
            Gönderilmiş kampanya değiştirilmez. Aynı içeriği yeni bir taslak olarak kopyalayabilirsiniz.
          </p>
          <WaPreview body={campaign.body ?? ''} mediaUrl={campaign.media_url} />
          <Button
            type="button"
            variant="accent"
            disabled={copyPending}
            onClick={() => {
              startCopy(async () => {
                const result = await duplicateCampaign(campaign.id)
                if (result.error) {
                  toast(result.error, 'danger')
                  return
                }
                if (result.id) router.push(`/kampanyalar/${result.id}/duzenle`)
              })
            }}
          >
            {copyPending ? 'Kopyalanıyor…' : 'Kopyala ve Yeni Kampanya Oluştur'}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-visible">
      <div className="px-4 pt-5 sm:px-5">
        <h1 className="text-[22px] font-semibold tracking-[-0.03em]">
          {mode === 'create' ? 'Yeni kampanya' : 'Kampanyayı düzenle'}
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-muted">
          {mode === 'create'
            ? 'Birkaç adımda hazırlayın. Müşteriler kampanya adını görmez.'
            : structureLocked
              ? 'Bu kampanya şu anda gönderiliyor. Yaptığınız değişiklikler yalnızca henüz mesaj gönderilmemiş müşterilere uygulanacaktır.'
              : 'Gönderilmiş mesajlar değişmez.'}
        </p>
      </div>

      <WizardStepper current={step} onJump={go} />

      <form
        ref={formRef}
        action={formAction}
        className="flex flex-col"
        onSubmit={(event) => {
          if (step !== 'yayinla' || !allowSubmitRef.current) {
            event.preventDefault()
            if (step !== 'yayinla') goNext()
            return
          }
          const error =
            validateStep('yayinla') ||
            validateStep('kampanya') ||
            validateStep('alicilar') ||
            validateStep('icerik') ||
            validateStep('gonderen')
          if (error) {
            event.preventDefault()
            setHint(error)
            return
          }
          if (mode === 'create') localStorage.removeItem(DRAFT_KEY)
          setDirty(false)
          if (startMode === 'now' && !sendArmedRef.current) {
            event.preventDefault()
            allowSubmitRef.current = false
            void confirm({
              title: uniqueCount
                ? `Bu kampanya ${formatCount(uniqueCount)} müşteriye gönderilmeye başlanacak.`
                : 'Gönderim şimdi başlayacak.',
              description: `${selectedAccounts.length} WhatsApp hattı kullanılacak. Bu işlem geri alınamaz; duraklatabilirsiniz.`,
              confirmLabel: uniqueCount
                ? `${formatCount(uniqueCount)} kişiye gönderimi başlat`
                : 'Gönderimi başlat',
              tone: 'accent',
            }).then((ok) => {
              if (!ok) return
              sendArmedRef.current = true
              allowSubmitRef.current = true
              formRef.current?.requestSubmit()
            })
          }
        }}
      >
        {campaign ? <input type="hidden" name="campaign_id" value={campaign.id} /> : null}
        <input type="hidden" name="media_url" value={mediaUrl} />
        <input type="hidden" name="message_type" value={mediaUrl ? messageType : 'text'} />
        <input type="hidden" name="min_delay" value={campaign?.min_delay_seconds ?? 8} />
        <input type="hidden" name="max_delay" value={campaign?.max_delay_seconds ?? 25} />
        <input type="hidden" name="daily_cap" value={campaign?.daily_cap_per_account ?? 100} />
        <input type="hidden" name="ab_percent" value={campaign?.ab_percent ?? 0} />
        <input type="hidden" name="body_b" value={campaign?.body_b ?? ''} />
        <input type="hidden" name="start_mode" value={startMode} />
        {scheduledAt ? <input type="hidden" name="scheduled_at" value={scheduledAt} /> : null}
        {selectedLists.map((id) => (
          <input key={`list-${id}`} type="hidden" name="lists" value={id} />
        ))}
        {selectedAccounts.map((id) => (
          <input key={`acc-${id}`} type="hidden" name="accounts" value={id} />
        ))}
        {campaign?.status === 'paused' || campaign?.status === 'stopped' ? (
          <input type="hidden" name="resume_after" value="0" />
        ) : null}

        <div className="space-y-4 p-4 sm:p-5">
          {step === 'kampanya' ? (
            <Field
              label="Kampanya adı"
              hint="Müşterilere gösterilmez. Siz bulmak için kullanırsınız."
            >
              <Input
                name="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  mark()
                }}
                placeholder="Eylül Ayı %20 İndirim Kampanyası"
                required
                autoComplete="off"
              />
            </Field>
          ) : (
            <input type="hidden" name="name" value={name} />
          )}

          {step === 'alicilar' ? (
            <AudiencePicker
              lists={shared.lists}
              selected={selectedLists}
              uniqueCount={uniqueCount}
              counting={counting || countPending}
              locked={structureLocked}
              onToggle={(id) => {
                setSelectedLists((current) =>
                  current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                )
                mark()
              }}
            />
          ) : null}

          {step === 'icerik' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink-muted">Mesaj</p>
                {shared.aiEnabled ? (
                  <Button type="button" variant="accent" onClick={() => setAiOpen(true)}>
                    AI ile Yaz
                  </Button>
                ) : null}
              </div>
              <Textarea
                name="body"
                rows={8}
                value={body}
                onChange={(event) => {
                  setBody(event.target.value)
                  mark()
                }}
                placeholder="Merhaba {{ad}}, bu ay mağazamızda özel bir indirim var."
              />
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-faint">
                <span className="tabular">{body.length} / 4096</span>
                <button
                  type="button"
                  className="font-medium text-accent underline underline-offset-2"
                  onClick={() => {
                    setBody((current) => appendOptOutFooter(current))
                    mark()
                  }}
                >
                  Çıkış satırı ekle
                </button>
              </div>
              {body.trim() && shared.aiEnabled ? (
                <AiRewriteBar
                  currentMessage={body}
                  onApply={(text) => {
                    setBody(text)
                    mark()
                  }}
                />
              ) : null}
              <MediaPicker
                orgId={shared.orgId}
                mediaUrl={mediaUrl}
                creatives={shared.creatives}
                imageAiEnabled={shared.imageAiEnabled}
                brandName={shared.brandName}
                brandKits={shared.brandKits}
                uploading={uploading}
                onUpload={(file) => void upload(file)}
                onSelect={(url) => {
                  setMediaUrl(url)
                  setMessageType('image')
                  mark()
                }}
                onClear={() => {
                  setMediaUrl('')
                  setMessageType('text')
                  mark()
                }}
              />
              {uploadError ? <Notice tone="danger">{uploadError}</Notice> : null}
            </div>
          ) : (
            <input type="hidden" name="body" value={body} />
          )}

          {step === 'gonderen' ? (
            <SenderPicker
              accounts={shared.accounts}
              selected={selectedAccounts}
              locked={structureLocked}
              onToggle={(id) => {
                setSelectedAccounts((current) =>
                  current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                )
                mark()
              }}
            />
          ) : null}

          {step === 'onizleme' ? (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="rounded-md border border-hairline px-3">
                <SummaryRow label="Kampanya" value={name || 'Adsız'} onEdit={() => go('kampanya')} />
                <SummaryRow
                  label="Alıcılar"
                  value={
                    uniqueCount
                      ? `${formatCount(uniqueCount)} müşteri`
                      : `${selectedLists.length} grup`
                  }
                  onEdit={() => go('alicilar')}
                />
                <SummaryRow
                  label="Gruplar"
                  value={selectedListNames.join(', ') || 'Seçilmedi'}
                  onEdit={() => go('alicilar')}
                />
                <SummaryRow
                  label="Gönderen"
                  value={`${selectedAccounts.length} WhatsApp hattı`}
                  onEdit={() => go('gonderen')}
                />
                <SummaryRow
                  label="İçerik"
                  value={mediaUrl ? 'Görsel + Metin' : 'Metin'}
                  onEdit={() => go('icerik')}
                />
              </div>
              <WaPreview body={body} mediaUrl={mediaUrl || null} />
            </div>
          ) : null}

          {step === 'yayinla' ? (
            structureLocked ? (
              <Notice tone="warn">
                Gönderim sürüyor. Kaydettiğiniz mesaj ve görsel yalnızca kalan kişilere gider.
              </Notice>
            ) : (
              <PublishCards
                mode={mode}
                selected={startMode}
                onSelect={(value) => {
                  setStartMode(value)
                  sendArmedRef.current = false
                  mark()
                }}
                scheduledAt={scheduledAt}
                onSchedule={(value) => {
                  setScheduledAt(value)
                  mark()
                }}
                uniqueCount={uniqueCount ?? 0}
                accountCount={selectedAccounts.length}
              />
            )
          ) : null}
        </div>

        <div className="sticky bottom-0 z-[1] space-y-2.5 border-t border-hairline bg-surface/95 px-4 py-3 backdrop-blur-sm sm:px-5">
          {formError ? <Notice tone="danger">{formError}</Notice> : null}
          {hint ? <Notice tone="warn">{hint}</Notice> : null}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button type="button" disabled={pending || stepIndex === 0} onClick={goBack}>
              Geri
            </Button>
            {step !== 'yayinla' ? (
              <Button type="button" variant="accent" disabled={pending} onClick={goNext}>
                İleri
              </Button>
            ) : (
              <Button
                type="button"
                variant={startMode === 'now' && !structureLocked ? 'danger' : 'accent'}
                disabled={pending}
                onClick={() => {
                  allowSubmitRef.current = true
                  formRef.current?.requestSubmit()
                }}
              >
                {submitLabel}
              </Button>
            )}
          </div>
        </div>
      </form>

      <AiWriteModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        defaultTone={shared.brandTone}
        onApply={(text) => {
          setBody(text)
          mark()
        }}
      />
    </Card>
  )
}
