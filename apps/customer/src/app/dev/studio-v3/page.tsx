import { ProductionStageAnimation } from '@/components/production-progress/production-stage-animation'
import { ProductionProgress } from '@/components/production-progress/production-progress'
import { mapEngineStateToStage } from '@/lib/creative/production-progress/stage-mapper'
import { notFound } from 'next/navigation'
import { CreativeStudioV2 } from '@/app/(panel)/icerik/creative-studio-v2'
import { FeedbackProviders } from '@/components/feedback-providers'
import type { WizardBootstrap } from '@/app/(panel)/icerik/wizard-types'

export const dynamic = 'force-dynamic'

export default async function StudioUiFixture({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  if (process.env.NODE_ENV !== 'development' || process.env.STUDIO_V3_UI_FIXTURE !== '1') notFound()
  const params = await searchParams
  if (params.view === 'motion') {
    const stages = ['REQUEST_ACCEPTED','QUEUED','ASSETS_PREPARING','GENERATING','MEDIA_PROCESSING','QUALITY_CHECK','READY','NEEDS_REVIEW','FAILED'] as const
    const kind = params.kind === 'image' ? 'image' : 'video'
    return <main className="mx-auto max-w-5xl p-6"><h1 className="mb-6 text-lg font-semibold">Yerel progress tasarım önizlemesi — gerçek üretim değil</h1><div className="grid grid-cols-1 gap-8 sm:grid-cols-3">{stages.map((stage,index) => <section key={stage} className="rounded-2xl border p-5"><p className="mb-6 text-xs text-gray-500">{index+1}. {stage}</p><ProductionStageAnimation kind={kind} stageKey={stage} stageIndex={index+1} /></section>)}</div></main>
  }
  if (params.view === 'animations') {
    const assets = ['image/product-upload','image/image-scan','image/creative-design','image/image-render','image/image-success','video/storyboard','video/reference-attach','video/camera-motion','video/video-render','video/timeline-edit','video/video-success','shared/loading','shared/warning']
    return <main className="p-4"><h1>YEREL ANİMASYON FIXTURE — gerçek üretim değildir</h1><div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{assets.map(asset => <section key={asset}><h2>{asset}</h2><ProductionStageAnimation stageKey="GENERATING" stageIndex={4} lottieSrc={`/animations/${asset}.json`} /></section>)}</div></main>
  }
  if (params.view === 'progress') {
    const rawState = params.state || 'VISUAL_QA_EVALUATING'
    const stage = mapEngineStateToStage(rawState)
    const state = stage.stage_key === 'READY' ? 'COMPLETED' : stage.stage_key === 'FAILED' ? 'FAILED' : stage.stage_key === 'NEEDS_REVIEW' ? 'NEEDS_REVIEW' : 'GENERATING'
    return <main className="p-4"><h1>YEREL PROGRESS FIXTURE — gerçek üretim değildir</h1><ProductionProgress viewModel={{job_id:'fixture-job',org_id:'fixture-org',state,...stage,display_state:'KALITE_KONTROLU',can_cancel:false,can_leave_page:true}} /></main>
  }
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
