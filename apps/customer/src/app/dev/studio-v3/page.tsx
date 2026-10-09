import { notFound } from 'next/navigation'
import { CreativeStudioV2 } from '@/app/(panel)/icerik/creative-studio-v2'
import { FeedbackProviders } from '@/components/feedback-providers'
import type { WizardBootstrap } from '@/app/(panel)/icerik/wizard-types'

export const dynamic = 'force-dynamic'

export default async function StudioUiFixture({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  if (process.env.NODE_ENV !== 'development' || process.env.STUDIO_V3_UI_FIXTURE !== '1') notFound()
  const params = await searchParams
  const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/><text x="30" y="100" fill="black">QA FIXTURE</text></svg>')
  const data: WizardBootstrap = {
    org:{id:'00000000-0000-4000-8000-000000000099',name:'Bağımsız Arayüz Test İşletmesi',address:null,about:null,websiteHint:null,
      logoPreview:params.missing==='logo'?null:image, monthlyVideoQuota:0,monthlyVideoUsed:0},
    kits:[], products:[{id:'fixture-product',name:'Bağımsız test ürününün mobil satır kaydırma ve çok uzun katalog adı kontrolü için kullanılan açıkça etiketli arayüz fixture kaydı',
      description:'Bu kayıt gerçek katalog ürünü değildir. Yalnız form ve mobil yerleşim testi.',boxContents:null,
      images:params.missing==='product'?[]:[{id:'fixture-image',url:image}]}],
    phones:[],socials:[],library:[],imageAiEnabled:false,canManage:true,
  }
  return <main className="mx-auto max-w-5xl p-3 sm:p-6">
    <p className="mb-4 rounded border p-3 text-sm">YEREL ARAYÜZ TESTİ — fixture veri; oturum, sağlayıcı, ücretli üretim, kayıt ve katalog kabul kanıtı değildir.</p>
    <FeedbackProviders><CreativeStudioV2 data={data} previewOnly /></FeedbackProviders>
  </main>
}
