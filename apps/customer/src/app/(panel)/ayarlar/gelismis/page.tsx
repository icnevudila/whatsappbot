import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card, CardHeader, Notice } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { WebhookSettingsForm, DeleteOrganizationForm } from '../org-forms'
import { BillingCheckoutButton } from '../billing-checkout-button'
import { ApiKeyForm } from '../api-key-form'
import { SettingsPageFrame } from '../settings-shell'

export const metadata: Metadata = { title: 'Gelişmiş' }

export default async function AdvancedSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string | string[] }>
}) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const params = await searchParams
  const billingRaw = params.billing
  const billing =
    typeof billingRaw === 'string'
      ? billingRaw
      : Array.isArray(billingRaw)
        ? billingRaw[0]
        : undefined

  const canManage = org.role === 'owner' || org.role === 'admin'
  const isOwner = org.role === 'owner'

  const { data: apiKeyRows } = canManage
    ? await supabase
        .from('org_api_keys' as never)
        .select('id, name, key_prefix, last_used_at, created_at' as never)
        .eq('org_id' as never, org.id as never)
        .is('revoked_at' as never, null)
        .order('created_at' as never, { ascending: false })
    : { data: [] as {
        id: string
        name: string
        key_prefix: string
        last_used_at: string | null
        created_at: string
      }[] }

  return (
    <SettingsPageFrame
      title="Gelişmiş"
      description="Webhook, API anahtarı, faturalama ve tehlikeli işlemler."
    >
      {billing === 'ok' ? (
        <Notice tone="success">Ödeme alındı. Paket kısa süre içinde güncellenir.</Notice>
      ) : null}
      {billing === 'cancel' ? (
        <Notice tone="warn">Ödeme iptal edildi.</Notice>
      ) : null}

      {!canManage ? (
        <Notice tone="warn">Bu bölümü yalnızca sahip veya yönetici düzenleyebilir.</Notice>
      ) : (
        <div className="space-y-2.5">
          <Card>
            <CardHeader title="Webhook" />
            <WebhookSettingsForm webhookUrl={org.webhook_url ?? null} canEdit />
          </Card>

          <Card>
            <CardHeader title="Faturalama" subtitle="Paket yükseltme Stripe üzerinden alınır." />
            <div className="p-3.5">
              <BillingCheckoutButton />
            </div>
          </Card>

          <Card>
            <CardHeader title="API anahtarı" />
            <ApiKeyForm
              canEdit
              keys={(apiKeyRows ?? []) as {
                id: string
                name: string
                key_prefix: string
                last_used_at: string | null
                created_at: string
              }[]}
            />
          </Card>

          {isOwner ? (
            <Card>
              <CardHeader title="Tehlikeli bölge" subtitle="İşletmeyi kalıcı olarak siler." />
              <div className="p-3.5">
                <DeleteOrganizationForm
                  orgName={org.name}
                  hasStripeSubscription={Boolean(org.stripe_subscription_id)}
                />
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </SettingsPageFrame>
  )
}
