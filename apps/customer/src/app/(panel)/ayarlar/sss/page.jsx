import { redirect } from 'next/navigation'
import { Notice } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole, listUserOrgs } from '@/lib/org'
import { SettingsPageFrame } from '../settings-shell'
import { FaqBoard } from './faq-board'

export const metadata = { title: 'Sık sorulan sorular' }
export const dynamic = 'force-dynamic'

export default async function FaqSettingsPage() {
  let org
  let supabase
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const canEdit = isOrgAdminRole(org.role)
  const [orgs, faqsResult, productsResult] = await Promise.all([
    listUserOrgs(),
    supabase
      .from('org_faqs')
      .select('id, product_id, question, answer, sort_order, is_active, created_at')
      .eq('org_id', org.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('org_products')
      .select('id, name')
      .eq('org_id', org.id)
      .eq('is_active', true)
      .order('name', { ascending: true }),
  ])
  const { data, error } = faqsResult
  const { data: products } = productsResult
  const showOrgName = orgs.length > 1

  return (
    <SettingsPageFrame
      title="Sık sorulan sorular"
      description="İşletmenize veya ürünlerinize özel soru-cevaplar. AI yanıtlama bunları kullanır."
      titleEnd={
        showOrgName ? (
          <span className="wb-wa-org-chip" title={org.name}>
            {org.name}
          </span>
        ) : undefined
      }
    >
      {!canEdit ? (
        <Notice tone="warn">Görüntülüyorsunuz. Düzenleme için yönetici gerekir.</Notice>
      ) : null}
      {error ? <Notice tone="danger">{error.message}</Notice> : null}
      <FaqBoard initial={data ?? []} products={products ?? []} canEdit={canEdit} />
    </SettingsPageFrame>
  )
}
