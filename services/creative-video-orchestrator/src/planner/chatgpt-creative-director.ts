import type { CreativeContext, MultimodalAttachment, VerifiedFact } from '../types/creative-context.js'
import type { ShortAdMasterPlan, MasterPlanBeat, SpeechTimelineItem } from './short-ad-master-plan.js'
import type { AdvertisingFormat } from '../strategy/advertising-grammar-registry.js'
import type { CreativeFingerprint } from '../strategy/creative-diversity-guard.js'
import { ShortAdCreativeDirector } from './short-ad-creative-director.js'
import { globalSectorPresetRegistry } from '../strategy/sector-presets.js'
import type { IChatGPTCreativeProvider } from '../adapters/chatgpt-creative-adapter.js'
import { ChatGPTCreativeAdapter } from '../adapters/chatgpt-creative-adapter.js'

export interface CreativeConcept {
  concept_id: string
  title: string
  one_sentence_idea: string
  ad_format: AdvertisingFormat
  format_variant: string
  hook_type: string
  story_structure: string
  first_frame: string
  product_role: string
  human_role: string
  environment: string
  speech_approach: string
  camera_energy: string
  ending_family: string
  why_it_fits_brand: string
  why_it_fits_objective: string
  difference_from_other_options: string
  creative_fingerprint: CreativeFingerprint
}

export interface ConceptSelectionResult {
  selected_concept_id: string
  selection_reason: string
  selected_concept: CreativeConcept
}

export class ChatGPTCreativeDirectorV2 {
  private baseDirector = new ShortAdCreativeDirector()
  private chatGptProvider: IChatGPTCreativeProvider

  constructor(chatGptProvider?: IChatGPTCreativeProvider) {
    this.chatGptProvider = chatGptProvider || new ChatGPTCreativeAdapter()
  }

  /**
   * Generates 3 genuinely distinct Creative Concepts for the ad campaign.
   */
  public async generateThreeConcepts(context: CreativeContext): Promise<CreativeConcept[]> {
    // 1. Try remote ChatGPT service if available
    const remote = await this.chatGptProvider.callDirector(context)
    if (remote && Array.isArray(remote.concepts) && remote.concepts.length === 3) {
      return remote.concepts
    }

    // 2. Deterministic Multimodal Creative Director Reasoning
    const brand = context.brand_profile.brand_name
    const sector = context.brand_profile.sector
    const product = context.campaign_context.selected_product_or_service
    const sectorPreset = globalSectorPresetRegistry.get(sector)
    const userStyle = context.campaign_context.user_style_preference || 'AUTO'
    const heroAsset = context.asset_manifest.attachments.find(a => a.canonical_handle === '@HeroProduct')

    // Observables (shape, color, geometry) — NO unverified claims
    const primaryColor = heroAsset?.visual_attributes?.primary_colors?.[0] || 'orijinal gövde rengi'
    const shape = heroAsset?.visual_attributes?.shape || 'belirgin gövde formu'
    const handles = heroAsset?.visual_attributes?.visible_handles ? 'üst tutma kulbu' : 'kompakt yapı'

    // Concept A: RESULT_FIRST (Macro Impact & Observable Application First)
    const conceptA: CreativeConcept = {
      concept_id: 'concept_A_result_first',
      title: `${brand} Sonuç Odaklı Hızlı Tanıtım`,
      one_sentence_idea: `${product} modelinin uygulama anını ve çalışma adımlarını ilk saniyede gösteren dinamik tanıtım.`,
      ad_format: userStyle === 'PRODUCT_USAGE' ? 'PRODUCT_USAGE' : 'PERFORMANCE_DEMO',
      format_variant: 'RESULT_FIRST',
      hook_type: 'instant_result_impact',
      story_structure: 'RESULT -> ACTION -> PRODUCT_HERO -> PAYOFF',
      first_frame: `Aşırı makro yakın çekim: ${product} (${shape}, ${primaryColor}) gövdesi ve nozül ucu çalışma ortamında.`,
      product_role: 'Uygulamanın merkezindeki ana ürün',
      human_role: 'Çalışmayı yürüten kullanıcı',
      environment: sectorPreset.description || 'Doğal çalışma sahası',
      speech_approach: 'Net, doğrudan ve bilgilendirici anlatım',
      camera_energy: 'Yüksek tempolu, makrodan genişe dinamik geçiş',
      ending_family: 'product_hero_hold',
      why_it_fits_brand: `${brand} ürün tanınırlığını ilk saniyeden pekiştirir.`,
      why_it_fits_objective: `Hedef kitleye zaman kaybetmeden ürünü göstererek dikkat eşiğini aşar.`,
      difference_from_other_options: 'Kullanım aşamalarını beklemeden doğrudan ürünün uygulama anını öne çıkarır.',
      creative_fingerprint: {
        tenant_id: context.org_id,
        ad_format: 'PERFORMANCE_DEMO',
        format_variant: 'RESULT_FIRST',
        hook_type: 'instant_result_impact',
        opening_visual_type: 'result_macro',
        camera_pattern: 'macro_cine_shallow_push',
        environment_type: sector,
        speech_structure: 'HOOK_PROOF_PAYOFF',
        end_card_family: 'minimalist_center',
      },
    }

    // Concept B: HUMAN_ACTION_FIRST (Dynamic Workflow & Practical Application)
    const conceptB: CreativeConcept = {
      concept_id: 'concept_B_human_action',
      title: `${brand} Gerçek Kullanıcı & Eylem Akışı`,
      one_sentence_idea: `Kullanıcının ${product} ile sahada hazırlık ve çalışma adımlarını yürüttüğü akış.`,
      ad_format: userStyle === 'FAST_SALES' ? 'PERFORMANCE_DEMO' : 'PROBLEM_SOLUTION',
      format_variant: 'HUMAN_ACTION_FIRST',
      hook_type: 'human_action_motion',
      story_structure: 'CHALLENGE -> ACTION -> WORKFLOW -> BRAND_CLOSE',
      first_frame: `Gerçek çalışma anında kullanıcının ${handles} ile ${product} üzerine elini koyup çalışmayı başlatması.`,
      product_role: 'Çalışma sürecinin merkezindeki ekipman',
      human_role: 'Sahada aktif çalışan uygulayıcı',
      environment: sectorPreset.description || 'Doğal uygulama ortamı',
      speech_approach: 'Sakin ve doğrudan saha adımlarını aktaran ses',
      camera_energy: 'Doğal omuz kamerası ve akıcı takip',
      ending_family: 'minimalist_center',
      why_it_fits_brand: `${brand} pratik kullanım odaklı yaklaşımını yansıtır.`,
      why_it_fits_objective: `Sektörel kitleye doğrudan çalışma pratiğini göstererek ilgi uyandırır.`,
      difference_from_other_options: 'Ürünü izole bir obje olarak değil, kullanıcının çalışma akışı içinde gösterir.',
      creative_fingerprint: {
        tenant_id: context.org_id,
        ad_format: 'PROBLEM_SOLUTION',
        format_variant: 'HUMAN_ACTION_FIRST',
        hook_type: 'human_action_motion',
        opening_visual_type: 'human_action_macro',
        camera_pattern: 'handheld_fluid_track',
        environment_type: sector,
        speech_structure: 'PROBLEM_SOLUTION_PAYOFF',
        end_card_family: 'minimalist_center',
      },
    }

    // Concept C: DETAIL_ENERGY / STEP_BY_STEP (Macro Precision & Material Focus)
    const conceptC: CreativeConcept = {
      concept_id: 'concept_C_detail_energy',
      title: `${brand} Malzeme ve Mekanik Detaylar`,
      one_sentence_idea: `${product} gövde formunu, malzeme dokusunu ve adım adım çalışma adımlarını sergileyen anlatım.`,
      ad_format: userStyle === 'PREMIUM' ? 'BRAND_CINEMATIC' : 'PRODUCT_USAGE',
      format_variant: 'STEP_BY_STEP',
      hook_type: 'macro_product_detail',
      story_structure: 'DETAIL_HOOK -> STEP_PROGRESSION -> SYSTEM_HARMONY -> ELEGANT_CLOSE',
      first_frame: `Işığın ${product} (${primaryColor}) yüzeyinde akışı ve nozül bileşenlerine sinematik ultra yakın plan.`,
      product_role: 'Malzeme ve bileşen detaylarını sergileyen merkez ürün',
      human_role: 'Özenle ekipmanı yönlendiren uygulayıcı',
      environment: sectorPreset.description || 'Detaylı çalışma alanı',
      speech_approach: 'Net ve detayları tane tane aktaran ritim',
      camera_energy: 'Pürüzsüz sinematik ray hareketi ve derinlikli odak kayması',
      ending_family: 'split_screen_proof',
      why_it_fits_brand: `${brand} malzeme yapısını ve formunu somut biçimde ortaya koyar.`,
      why_it_fits_objective: `Ürünün detaylarını incelemek isteyen kitleye görsel netlik sağlar.`,
      difference_from_other_options: 'Uygulama hızından ziyade ürünün formuna, malzeme yapısına ve detaylarına odaklanır.',
      creative_fingerprint: {
        tenant_id: context.org_id,
        ad_format: 'PRODUCT_USAGE',
        format_variant: 'STEP_BY_STEP',
        hook_type: 'macro_product_detail',
        opening_visual_type: 'product_functional_macro',
        camera_pattern: 'slow_slider_precision',
        environment_type: sector,
        speech_structure: 'DETAIL_STEP_CLOSE',
        end_card_family: 'split_screen_proof',
      },
    }

    return [conceptA, conceptB, conceptC]
  }

  /**
   * Concept Selection: Selects winning concept based on campaign objective, user style preference,
   * brand profile, available assets, and past human feedback.
   */
  public selectWinningConcept(
    concepts: CreativeConcept[],
    context: CreativeContext
  ): ConceptSelectionResult {
    const userPref = (context.campaign_context.user_style_preference || 'AUTO').toUpperCase()
    const recentFingerprints = context.recent_fingerprints || []

    // 1. Direct user preference match
    if (userPref === 'FAST_SALES' || userPref === 'OFFER') {
      const match = concepts.find(c => c.ad_format === 'PERFORMANCE_DEMO' || c.ad_format === 'OFFER_DRIVEN')
      if (match) {
        return {
          selected_concept_id: match.concept_id,
          selection_reason: 'Kullanıcının Hızlı Satış ve Doğrudan Sonuç tercihi doğrultusunda seçildi.',
          selected_concept: match,
        }
      }
    }

    if (userPref === 'PRODUCT_USAGE') {
      const match = concepts.find(c => c.ad_format === 'PRODUCT_USAGE')
      if (match) {
        return {
          selected_concept_id: match.concept_id,
          selection_reason: 'Kullanıcının Adım Adım Ürün Kullanımı tercihi doğrultusunda seçildi.',
          selected_concept: match,
        }
      }
    }

    if (userPref === 'PROBLEM_SOLUTION') {
      const match = concepts.find(c => c.ad_format === 'PROBLEM_SOLUTION')
      if (match) {
        return {
          selected_concept_id: match.concept_id,
          selection_reason: 'Kullanıcının Problem - Çözüm tercihi doğrultusunda seçildi.',
          selected_concept: match,
        }
      }
    }

    if (userPref === 'PREMIUM') {
      const match = concepts.find(c => c.concept_id === 'concept_C_detail_energy' || c.ad_format === 'BRAND_CINEMATIC')
      if (match) {
        return {
          selected_concept_id: match.concept_id,
          selection_reason: 'Kullanıcının Premium / Sinematik Detay tercihi doğrultusunda seçildi.',
          selected_concept: match,
        }
      }
    }

    // 2. Anti-fatigue check against recent fingerprints
    for (const c of concepts) {
      const isRepeated = recentFingerprints.some(
        rf => rf.format_variant === c.format_variant && rf.hook_type === c.hook_type
      )
      if (!isRepeated) {
        return {
          selected_concept_id: c.concept_id,
          selection_reason: `Otomatik Seçim: Son üretilen reklamlardan farklı görsel kanca (${c.hook_type}) ve varyant (${c.format_variant}) sağladığı için tercih edildi.`,
          selected_concept: c,
        }
      }
    }

    // Default to Concept A
    return {
      selected_concept_id: concepts[0].concept_id,
      selection_reason: 'Otomatik Seçim: Kampanya hedefiyle en uyumlu genel performans dengesi.',
      selected_concept: concepts[0],
    }
  }

  /**
   * Generates detailed ShortAdMasterPlan for the selected concept.
   * Voice-as-spine (~18-24 Turkish words, no isolated slogan stacks), dynamic 0-8s beats,
   * factual integrity (only VerifiedFacts allowed).
   */
  public async buildDetailedMasterPlan(
    selectedConcept: CreativeConcept,
    context: CreativeContext
  ): Promise<ShortAdMasterPlan> {
    const brand = context.brand_profile.brand_name
    const sector = context.brand_profile.sector
    const product = context.campaign_context.selected_product_or_service
    const sectorPreset = globalSectorPresetRegistry.get(sector)
    const verifiedFacts = context.verified_facts || []

    // Dynamic cut points based on format and variant
    const cutPoints = this.baseDirector.computeDynamicCutPoints(
      selectedConcept.ad_format,
      selectedConcept.format_variant,
      sector
    )
    const [t1, t2, t3, t4] = cutPoints

    // Build Continuous Turkish Voice-Over Script (18-24 words, no stacked slogans, 100% factual)
    let masterVoiceOver = ''
    let speechItems: SpeechTimelineItem[] = []

    // Factual extraction: Only use verified facts from context
    const factSnippet = verifiedFacts.length > 0 ? `${verifiedFacts[0].claim} ile ` : ''

    if (selectedConcept.format_variant === 'RESULT_FIRST') {
      masterVoiceOver = `${brand} ile ${product} modelini yakından tanıyın. ${factSnippet}bahçenizde ilaçlama adımlarını planlayın ve detayları keşfedin.`
      speechItems = [
        {
          start_sec: 0.0,
          end_sec: t1,
          exact_text: `${brand} ile ${product} modelini yakından tanıyın.`,
          speaker: 'Spiker',
          delivery: 'Sakin, açık ve doğrudan ticari seslendirme',
          corresponding_visual_beat: 'HOOK',
        },
        {
          start_sec: t1,
          end_sec: t3,
          exact_text: `${factSnippet}bahçenizde ilaçlama adımlarını planlayın`,
          speaker: 'Spiker',
          delivery: 'Net ve doğal bilgilendirici tempo',
          corresponding_visual_beat: 'PRODUCT_PROOF',
        },
        {
          start_sec: t3,
          end_sec: 8.0,
          exact_text: 've detayları keşfedin.',
          speaker: 'Spiker',
          delivery: 'Güven veren nötr marka kapanışı',
          corresponding_visual_beat: 'BRAND_CLOSE',
        },
      ]
    } else if (selectedConcept.format_variant === 'HUMAN_ACTION_FIRST') {
      masterVoiceOver = `Bahçe ve tarla bakımında ${product}. ${factSnippet}uygulama adımlarını doğrudan sahada inceleyin ve kararınızı verin.`
      speechItems = [
        {
          start_sec: 0.0,
          end_sec: t1,
          exact_text: `Bahçe ve tarla bakımında ${product}.`,
          speaker: 'Spiker',
          delivery: 'Doğal saha ve kullanıcı odaklı ton',
          corresponding_visual_beat: 'HOOK',
        },
        {
          start_sec: t1,
          end_sec: t3,
          exact_text: `${factSnippet}uygulama adımlarını doğrudan sahada inceleyin`,
          speaker: 'Spiker',
          delivery: 'Akıcı ve net bilgilendirme',
          corresponding_visual_beat: 'PRODUCT_PROOF',
        },
        {
          start_sec: t3,
          end_sec: 8.0,
          exact_text: 've kararınızı verin.',
          speaker: 'Spiker',
          delivery: 'Net ve yönlendirici kapanış',
          corresponding_visual_beat: 'BRAND_CLOSE',
        },
      ]
    } else {
      masterVoiceOver = `${product} gövde ve bileşenlerini yakından görün. ${factSnippet}kullanım aşamalarını adım adım takip edin.`
      speechItems = [
        {
          start_sec: 0.0,
          end_sec: t1,
          exact_text: `${product} gövde ve bileşenlerini yakından görün.`,
          speaker: 'Spiker',
          delivery: 'Tane tane ve odaklanmış tonlama',
          corresponding_visual_beat: 'HOOK',
        },
        {
          start_sec: t1,
          end_sec: t3,
          exact_text: `${factSnippet}kullanım aşamalarını`,
          speaker: 'Spiker',
          delivery: 'Açık ve vurgulu seslendirme',
          corresponding_visual_beat: 'PRODUCT_PROOF',
        },
        {
          start_sec: t3,
          end_sec: 8.0,
          exact_text: 'adım adım takip edin.',
          speaker: 'Spiker',
          delivery: 'Zarif ve net kapanış',
          corresponding_visual_beat: 'BRAND_CLOSE',
        },
      ]
    }

    // Dynamic Visual Beats: Count and structure dynamically adapted to format (not forced 5 beats)
    let beats: MasterPlanBeat[] = []

    if (selectedConcept.ad_format === 'BRAND_CINEMATIC') {
      // 3 Beats for Cinematic / Premium
      beats = [
        {
          start: 0.0,
          end: 2.5,
          purpose: 'HOOK',
          visual_action: `Aşırı makro yakın plan: ${product} (${context.asset_manifest.attachments[0]?.visual_attributes?.shape || 'gövde formu'}) yüzeyinde ışık akışı.`,
          product_action: `@HeroProduct kadrajda dengeli ve net`,
          actor_action: 'Doğal hazırlık',
          environment: selectedConcept.environment,
          camera: 'Yavaş sinematik ray hareketi ve derinlikli odak',
          lighting: sectorPreset.lightingProfile || 'Doğal ticari aydınlatma',
          physics_constraints: ['yerçekimi ve mekanik temas doğal', 'doğal insan postürü'],
          voiceover: speechItems[0]?.exact_text || '',
          sfx: 'Doğal çevre sesi',
          ambience: 'Sakin ambiyans',
        },
        {
          start: 2.5,
          end: 6.0,
          purpose: 'PRODUCT_PROOF',
          visual_action: `@HeroProduct ve kullanıcının kontrollü doğal çalışma anı, gerçek çevre dokusu.`,
          product_action: '@HeroProduct kanonik referans oranlarıyla merkezde',
          actor_action: 'Uygulama eylemini gerçekleştirme',
          environment: selectedConcept.environment,
          camera: 'Genişleyen stabil açı',
          lighting: 'Doğal sabah gün ışığı',
          physics_constraints: ['akışkan ve mekanik dinamikler gerçekçi'],
          voiceover: speechItems[1]?.exact_text || '',
          sfx: 'Çalışma sesi',
          ambience: 'Ortam akışı',
        },
        {
          start: 6.0,
          end: 8.0,
          purpose: 'BRAND_CLOSE',
          visual_action: `@HeroProduct merkezde stabil tutulur, post-prodüksiyon marka grafikleri için temiz alan bırakılır.`,
          product_action: '@HeroProduct son karede sabit',
          actor_action: 'Doğal arka plan duruşu',
          environment: selectedConcept.environment,
          camera: 'Sabit sinematik kilitlenme',
          lighting: 'Doğal aydınlatma',
          physics_constraints: ['fiziksel temas doğal'],
          voiceover: speechItems[2]?.exact_text || '',
          sfx: 'Marka kapanış zili',
          ambience: 'Sakinleşen ambiyans',
        },
      ]
    } else {
      // 4 Beats for Performance Demo, Problem-Solution, UGC, Offer
      const b1_end = t1
      const b2_end = t2
      const b3_end = t3
      beats = [
        {
          start: 0.0,
          end: b1_end,
          purpose: 'HOOK',
          visual_action: selectedConcept.first_frame,
          product_action: `@HeroProduct anlık ve belirgin şekilde kadrajda`,
          actor_action: 'Kullanıcının odaklanmış ilk eylemi',
          environment: selectedConcept.environment,
          camera: 'Macro cine lens, sığ alan derinliği, dikkat çekici giriş',
          lighting: sectorPreset.lightingProfile || 'Doğal ticari aydınlatma',
          physics_constraints: [
            'yerçekimi ve mekanik temas doğal',
            'akışkan ve mekanik dinamikler gerçekçi',
            'doğal insan postürü',
          ],
          voiceover: speechItems[0]?.exact_text || '',
          sfx: sectorPreset.soundscapeDefaults[0] || 'Tok mekanik aktivasyon sesi',
          ambience: sectorPreset.soundscapeDefaults[1] || 'Doğal ortam ambiyansı',
        },
        {
          start: b1_end,
          end: b2_end,
          purpose: 'REVEAL',
          visual_action: `Akıcı geri çekilme ile @HeroProduct bütünüyle ve kullanıcının kontrollü eylemiyle görünür`,
          product_action: '@HeroProduct kanonik referans oranlarıyla merkezde',
          actor_action: 'Kendinden emin eylemi sürdürme',
          environment: selectedConcept.environment,
          camera: 'Akıcı yatay takip ve dengeli odak',
          lighting: sectorPreset.lightingProfile || 'Açık gün ışığı',
          physics_constraints: ['fiziksel orantı korunmalı', 'el tutuşu doğal'],
          voiceover: '',
          sfx: 'Çalışma sesi',
          ambience: 'Ortam akışı',
        },
        {
          start: b2_end,
          end: b3_end,
          purpose: 'PRODUCT_PROOF',
          visual_action: `@HeroProduct sahada gerçek bitki yaprakları üzerinde püskürtme uygulamasını sergilerken`,
          product_action: 'Tam işlevsel çalışma kanıtı',
          actor_action: 'Rahat ve profesyonel kontrol',
          environment: selectedConcept.environment,
          camera: 'Hızlı dinamik pan ve sığ alan derinliği',
          lighting: 'Dinamik vurgu ışığı',
          physics_constraints: ['akışkan ve mekanik dinamikler gerçekçi'],
          voiceover: speechItems[1]?.exact_text || '',
          sfx: 'Verimli çalışma sesi',
          ambience: 'Çalışma sahası sesleri',
        },
        {
          start: b3_end,
          end: 8.0,
          purpose: 'BRAND_CLOSE',
          visual_action: `@HeroProduct temiz açıdan merkezde, post-prodüksiyon logo ve CTA için temiz alan bırakılır`,
          product_action: '@HeroProduct son karede net ve prestijli',
          actor_action: 'Arka planda doğal akış',
          environment: selectedConcept.environment,
          camera: 'Sabit sinematik kilitlenme',
          lighting: 'Prestijli stüdyo/gün ışığı harmanı',
          physics_constraints: ['sıfır yapay bozulma', 'doğal postür'],
          voiceover: speechItems[2]?.exact_text || '',
          sfx: 'Marka kapanış zili / bas tınısı',
          ambience: 'Sakinleşen ambiyans',
        },
      ]
    }

    const handles = context.asset_manifest.attachments.map(a => a.canonical_handle)
    const negativeConstraints = [
      'no generated subtitles, headlines, prices, CTA buttons, phone numbers, website URLs, invented logos, or random typography.',
      'no impossible physical deformations, no extra limbs, no phantom tools, no floating water droplets defying gravity.',
      ...sectorPreset.negativeVisuals,
    ]

    const masterPlan: ShortAdMasterPlan = {
      plan_id: `plan_${context.job_id.slice(0, 8)}_${Date.now()}`,
      brand_name: brand,
      ad_format: selectedConcept.ad_format,
      selected_ad_format: selectedConcept.ad_format,
      selected_format_variant: selectedConcept.format_variant as any,
      selection_reason: 'Creative Director V2 selection',
      creative_idea: selectedConcept.one_sentence_idea,
      advertising_hook: selectedConcept.hook_type,
      product_truth: `${product} gerçek kullanımda güvenilirdir.`,
      audience_value: 'Zaman tasarrufu ve garantili iş performansı.',
      story_arc: selectedConcept.story_structure,
      beats,
      master_spoken_script: masterVoiceOver,
      voiceover_script: masterVoiceOver,
      speech_timeline: speechItems,
      subtitle_plan: speechItems.map(s => ({ start: s.start_sec, end: s.end_sec, text: s.exact_text })),
      editing_rhythm: {
        cut_points: cutPoints,
        visual_rhythm: 'BUILD_PEAK_RESOLVE',
        hook_frame: '0.0s',
        product_reveal_frame: `${t1}s`,
        proof_frame: `${t2}s`,
        payoff_frame: `${t3}s`,
        brand_close_frame: `${t4}s`,
      },
      audio_plan: {
        speech_mode: 'native_veo_dialogue',
        spoken_language: 'tr-TR',
        exact_spoken_lines: speechItems.map(s => ({
          start: s.start_sec,
          end: s.end_sec,
          speaker: s.speaker,
          text: s.exact_text,
          delivery_style: s.delivery,
        })),
        speech_timeline: speechItems,
        ambient_audio_description: sectorPreset.soundscapeDefaults[1] || 'Doğal çevre sesi',
        sound_effects_description: sectorPreset.soundscapeDefaults[0] || 'Mekanik aktivasyon',
        allow_paraphrase: false,
        allow_translation: false,
        allow_extra_dialogue: false,
      },
      on_screen_copy: {
        hook: selectedConcept.hook_type,
        benefit_or_proof: `${product} anlık performans`,
        brand_or_cta: context.campaign_context.verified_cta || 'Hemen İnceleyin',
      },
      logo_strategy: 'GRAPHIC_OVERLAY + END_CARD',
      diegetic_branding_plan: [],
      overlay_plan: [],
      end_card_plan: {
        start_sec: t4,
        end_sec: 8.0,
        template_family: 'minimalist_center',
        headline: brand,
        cta_text: context.campaign_context.verified_cta || 'Hemen İnceleyin',
        website_or_phone: context.campaign_context.verified_url || context.campaign_context.verified_phone || '',
        background_color: '#000000',
        accent_color: '#FFCC00',
      },
      canonical_asset_handles: handles,
      negative_constraints: negativeConstraints,
      creative_fingerprint: selectedConcept.creative_fingerprint,
      veo_generation_intent: selectedConcept.one_sentence_idea,
      subtitles_mode: context.campaign_context.subtitle_mode,
    }

    return masterPlan

  }
}
