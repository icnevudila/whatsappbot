'use client'

import { useActionState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  AccentLink,
  Button,
  Card,
  Field,
  Input,
  Meter,
  Notice,
  QuietLink,
} from '@/components/ui'
import { Icon, type IconName } from '@/components/icon'
import { useToast } from '@/components/toast'
import { useT } from '@/lib/i18n/provider'
import { DEFAULT_COLORS } from '@/lib/creative-templates'
import type { getSetupProgress, SetupStepKey } from '@/lib/setup-progress'
import { saveBrandKit, type BrandKitState } from '../marka-kiti/actions'
import { ImportForm } from '../kisiler/import-form'
import { WaCheckForm } from '../kisiler/wa-check-form'
import { VerifyAllButton } from '../kisiler/verify-all-button'

type Progress = Awaited<ReturnType<typeof getSetupProgress>>

function BrandStep() {
  const router = useRouter()
  const toast = useToast()
  const t = useT()
  const [state, action, pending] = useActionState<BrandKitState, FormData>(saveBrandKit, null)

  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
    if (state?.ok) {
      toast(state.ok, 'success')
      router.refresh()
    }
  }, [state?.error, state?.ok, toast, router])

  return (
    <form action={action} className="space-y-3">
      <Field label={t('setup.brandName')} hint={t('setup.brandNameHint')}>
        <Input name="name" required placeholder={t('setup.brandNamePh')} maxLength={80} />
      </Field>
      <Field label={t('setup.primaryColor')}>
        <Input
          name="primary"
          type="color"
          defaultValue={DEFAULT_COLORS.primary}
          className="h-10 w-20 cursor-pointer p-1"
        />
      </Field>
      <input type="hidden" name="secondary" value={DEFAULT_COLORS.secondary} />
      <input type="hidden" name="accent" value={DEFAULT_COLORS.accent} />
      <input type="hidden" name="background" value={DEFAULT_COLORS.background} />
      <input type="hidden" name="text" value={DEFAULT_COLORS.text} />
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? t('setup.saving') : t('setup.saveContinue')}
      </Button>
    </form>
  )
}

export function OnboardingWizard({ progress }: { progress: Progress }) {
  const router = useRouter()
  const t = useT()
  const refresh = () => router.refresh()

  const stepMeta = useMemo(
    () =>
      [
        {
          key: 'brand' as SetupStepKey,
          title: t('setup.brandTitle'),
          lead: t('setup.brandLead'),
          icon: 'brand' as IconName,
        },
        {
          key: 'contacts' as SetupStepKey,
          title: t('setup.contactsTitle'),
          lead: t('setup.contactsLead'),
          icon: 'people' as IconName,
        },
        {
          key: 'connected' as SetupStepKey,
          title: t('setup.lineTitle'),
          lead: t('setup.lineLead'),
          icon: 'phone' as IconName,
        },
        {
          key: 'verified' as SetupStepKey,
          title: t('setup.verifyTitle'),
          lead: t('setup.verifyLead'),
          icon: 'check' as IconName,
        },
      ] as const,
    [t],
  )

  const activeKey = progress.nextStep ?? 'brand'
  const activeIndex = stepMeta.findIndex((s) => s.key === activeKey)
  const active = stepMeta[activeIndex] ?? stepMeta[0]!

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
          {t('setup.kicker')}
        </p>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em] text-ink">
          {active.title}
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">{active.lead}</p>
      </div>

      <div>
        <div className="mb-1.5 flex justify-between text-[12px] text-ink-muted">
          <span>
            {t('setup.stepOf', {
              current: Math.min(activeIndex + 1, stepMeta.length),
              total: stepMeta.length,
            })}
          </span>
          <span className="tabular">{t('setup.completedCount', { count: progress.doneCount })}</span>
        </div>
        <Meter value={progress.doneCount} max={stepMeta.length} />
      </div>

      <ol className="flex flex-wrap gap-2">
        {stepMeta.map((step, index) => {
          const done = progress.steps[step.key]
          const current = step.key === activeKey
          return (
            <li
              key={step.key}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] ${
                current
                  ? 'border-accent/35 bg-accent-soft font-semibold text-accent-dim'
                  : done
                    ? 'border-ok/30 bg-ok-soft text-ok-dim'
                    : 'border-hairline text-ink-faint'
              }`}
            >
              <Icon name={done ? 'check' : step.icon} className="size-3.5 shrink-0" />
              {done ? null : <span className="tabular">{index + 1}</span>}
              {step.title}
            </li>
          )
        })}
      </ol>

      <Card>
        <div className="space-y-4 p-4">
          {activeKey === 'brand' ? <BrandStep /> : null}

          {activeKey === 'contacts' ? (
            <div className="space-y-3">
              <p className="text-[12.5px] text-ink-muted">{t('setup.contactsHint')}</p>
              <ImportForm />
              <Button type="button" onClick={refresh}>
                {t('setup.contactsRefresh')}
              </Button>
            </div>
          ) : null}

          {activeKey === 'connected' ? (
            <div className="space-y-3">
              <p className="text-[12.5px] leading-relaxed text-ink-muted">{t('setup.lineBody')}</p>
              <div className="flex flex-wrap gap-2">
                <AccentLink href="/hesaplar#yeni-hat">{t('setup.lineCta')}</AccentLink>
                <Button type="button" onClick={refresh}>
                  {t('setup.lineRefresh')}
                </Button>
              </div>
              {progress.counts.connectedCount > 0 ? (
                <Notice tone="success">
                  {t('setup.lineOk', { count: progress.counts.connectedCount })}
                </Notice>
              ) : null}
            </div>
          ) : null}

          {activeKey === 'verified' ? (
            <div className="space-y-4">
              <p className="text-[12.5px] text-ink-muted">{t('setup.verifyHint')}</p>
              <WaCheckForm />
              <div className="border-t border-hairline pt-3">
                <VerifyAllButton />
              </div>
              <Button type="button" onClick={refresh}>
                {t('setup.verifyRefresh')}
              </Button>
              {progress.counts.outCount === 0 ? (
                <p className="text-[12px] leading-relaxed text-ink-faint">
                  {t('setup.firstSendHint')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      <p className="text-center text-[11.5px] text-ink-faint">
        {t('setup.finishHint')}{' '}
        <QuietLink href="/yardim" className="text-[11.5px]">
          {t('common.help')}
        </QuietLink>
      </p>
    </div>
  )
}
