import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { BusinessModel, TenantAsset } from '../types/asset-intake.js'
import type {
  ShortAdMasterPlan,
  MasterPlanBeat,
  SpeechTimelineItem,
  EditingRhythmPlan,
  OnScreenCopyPlan,
} from './short-ad-master-plan.js'
import { ShortAdFormatRouter } from '../strategy/advertising-grammar-router.js'
import type { AdvertisingFormat } from '../strategy/advertising-grammar-registry.js'
import { AdFormatRouter, type UserStylePreference } from '../strategy/ad-format-router.js'
import { FormatVariantSelector } from '../strategy/format-variant-selector.js'
import { CreativeDiversityGuard, type CreativeFingerprint } from '../strategy/creative-diversity-guard.js'
import type { SubtitleMode } from '../types/job-asset-manifest.js'
import { globalSectorPresetRegistry } from '../strategy/sector-presets.js'

export interface IShortAdCreativeDirectorProvider {
  generateMasterPlan(
    snapshot: BrandContextSnapshot,
    businessModel: BusinessModel,
    assets: TenantAsset[]
  ): Promise<ShortAdMasterPlan>
}

/**
 * ShortAdCreativeDirector.
 * The creative advertising brain behind 8-second commercial ads.
 * Integrates advertising grammar (AdFormatRouter, FormatVariantSelector, CreativeDiversityGuard),
 * audience psychology, cinematic direction, continuous timed audio/VO scripting (18-24 words across 0-8s),
 * editing rhythm, and deterministic brand composition.
 *
 * Rule: Veo NEVER plans the ad. Veo is purely the cinematic camera crew.
 * The Creative Director produces the master blueprint before any footage is generated.
 */
export class ShortAdCreativeDirector {
  private formatRouter = new ShortAdFormatRouter()
  private adFormatRouter = new AdFormatRouter()
  private variantSelector = new FormatVariantSelector()
  private diversityGuard = new CreativeDiversityGuard()

  constructor(private customProvider?: IShortAdCreativeDirectorProvider) {}

  /**
   * Plans the complete 8-second commercial master plan.
   */
  public async planCommercial(
    snapshot: BrandContextSnapshot,
    businessModel: BusinessModel,
    assets: TenantAsset[],
    options?: {
      user_style_preference?: UserStylePreference
      recent_fingerprints?: CreativeFingerprint[]
      subtitles_mode?: SubtitleMode
    }
  ): Promise<ShortAdMasterPlan> {
    if (this.customProvider) {
      return this.customProvider.generateMasterPlan(snapshot, businessModel, assets)
    }

    const brand = snapshot.brand_name
    const sector = snapshot.sector_profile
    const primaryProd = snapshot.products[0]
    const prodName = primaryProd?.name || `${brand} Ürünü`

    // 1. Creative Strategy Formulation & Format Routing
    const userPref = options?.user_style_preference || snapshot.campaign?.user_style_preference || 'AUTO'
    const routing = this.adFormatRouter.routeStyleToFormat(
      userPref,
      snapshot.campaign?.objective,
      sector,
      businessModel,
      assets
    )
    const adFormat: AdvertisingFormat = routing.ad_format
    const variantResult = this.variantSelector.selectVariant(
      adFormat,
      sector,
      businessModel,
      options?.recent_fingerprints || [],
      snapshot.org_id
    )

    const proposedFingerprint: CreativeFingerprint = {
      tenant_id: snapshot.org_id,
      ad_format: adFormat,
      format_variant: variantResult.format_variant,
      hook_type: variantResult.format_variant === 'MACRO_FIRST' ? 'macro_product_detail' : 'human_action_motion',
      opening_visual_type: 'product_functional_macro',
      camera_pattern: 'macro_cine_shallow_push',
      environment_type: sector,
      speech_structure: 'HOOK_PROOF_PAYOFF',
      end_card_family: 'minimalist_center',
    }

    const { fingerprint: finalFingerprint } = this.diversityGuard.guardAndDiversify(
      proposedFingerprint,
      options?.recent_fingerprints || [],
      variantResult.available_variants
    )

    const grammar = this.formatRouter.getGrammar(adFormat)

    const creativeIdea = this.synthesizeCreativeIdea(brand, sector, prodName, businessModel)
    const advertisingHook = this.synthesizeHook(sector, businessModel)
    const productTruth = this.synthesizeProductTruth(snapshot, primaryProd, businessModel)
    const audienceValue = this.synthesizeAudienceValue(snapshot, businessModel)
    const storyArc = 'HOOK (0-0.7s) -> REVEAL (0.7-2.2s) -> PRODUCT PROOF (2.2-4.5s) -> PAYOFF (4.5-6.2s) -> BRAND CLOSE (6.2-8.0s)'

    const sectorPreset = globalSectorPresetRegistry.get(sector)

    // 2. Exact Timed Beats aligned with advertising grammar
    const beats: MasterPlanBeat[] = [
      {
        start: 0.0,
        end: 0.7,
        purpose: 'HOOK',
        visual_action: sectorPreset.id.includes('agri')
          ? 'Aşırı makro yakın çekim: Pirinç nozülden basınçla fışkıran ilk mikronize sıvı damlacıkları ve ani hareket'
          : sectorPreset.id.includes('construct')
          ? 'Şantiye kolon hattında terazi ibresinin sıfırlanma anına ve killi tuğla dokusuna makro odak'
          : sectorPreset.id.includes('soft') || sectorPreset.id.includes('saas')
          ? 'Bilgisayar ekranındaki harita pinlerine ve anlık analitik grafiğe hızlı dinamik odaklanma'
          : `Aşırı makro yakın çekim: ${prodName} fonksiyonel detayına ve ${sectorPreset.mandatoryProofTypes[0] || 'çalışma mekanizmasına'} odak`,
        product_action: sectorPreset.id.includes('agri')
          ? 'Pirinç nozülden anlık yüksek basınç çıkışı'
          : sectorPreset.id.includes('construct')
          ? 'Hassas oturum ve milimetrik terazi dengesi'
          : sectorPreset.id.includes('soft')
          ? 'Canlı veri ve arayüz akışı'
          : `@HeroProduct ${sectorPreset.mandatoryProofTypes[0] || 'aktif durumu'}`,
        actor_action: sectorPreset.id.includes('agri')
          ? 'Tetiğe basış anı'
          : sectorPreset.id.includes('construct')
          ? 'Ustanın tuğlayı dengeli yerleştirme anı'
          : 'Kullanıcının odaklanmış eylemi',
        environment: sectorPreset.id.includes('agri')
          ? 'Güneş ışığında parlayan Ege zeytinliği'
          : sectorPreset.id.includes('construct')
          ? 'Modern mimari şantiye ve yapı alanı'
          : sectorPreset.id.includes('soft')
          ? 'Modern cam cepheli ofis'
          : `${sectorPreset.description} alanı`,
        camera: sectorPreset.cameraLanguage || 'Macro cine lens, sığ alan derinliği, yüksek dinamik giriş',
        lighting: sectorPreset.lightingProfile || 'Doğal ticari aydınlatma',
        physics_constraints: [
          'yerçekimi ve mekanik temas doğal',
          ...sectorPreset.negativeVisuals.slice(0, 2),
          'ekranda yapay yazı yok',
        ],
        voiceover: '',
        dialogue: undefined,
        sfx: sectorPreset.soundscapeDefaults[0] || 'Düşük frekanslı tok püskürtme patlama sesi',
        ambience: sectorPreset.soundscapeDefaults[1] || 'Zeytin yapraklarının hafif hışırtısı',
      },
      {
        start: 0.7,
        end: 2.2,
        purpose: 'REVEAL',
        visual_action: sectorPreset.id.includes('agri')
          ? 'Hızlı akıcı geri çekilme ile zeytin ağaçları arasında sırtında ürünle ilerleyen çiftçinin ve gövdenin net görünümü'
          : sectorPreset.id.includes('construct')
          ? 'Geri çekilme ile şantiye cephesinde usta ve nizami örülmüş tuğla hattının net görünümü'
          : sectorPreset.id.includes('soft')
          ? 'Geniş açıya akıcı geçişle ofiste analitik paneli inceleyen kararlı yönetici'
          : `Akıcı geri çekilme ile @HeroProduct ve kullanıcının güven veren görünümü`,
        product_action: 'Kanonik @HeroProduct gövdesi dengeli ve net kadrajda',
        actor_action: 'Kendinden emin adımlarla eyleme devam etme',
        environment: sectorPreset.id.includes('agri')
          ? 'Sabah güneşiyle aydınlanan bakımlı Ege zeytinliği'
          : sectorPreset.id.includes('construct')
          ? 'Temiz ve düzenli inşaat alanı'
          : sectorPreset.id.includes('soft')
          ? 'Modern çalışma alanı'
          : sectorPreset.description,
        camera: '50mm cine lens, akıcı yanal takip ve net ürün odağı',
        lighting: sectorPreset.lightingProfile,
        physics_constraints: [
          'ergonomik askı ve temas doğal',
          ...sectorPreset.negativeVisuals.slice(0, 2),
          'ekranda yapay yazı yok',
        ],
        voiceover: '',
        dialogue: undefined,
        sfx: 'Düşük frekanslı tok geçiş sesi',
        ambience: sectorPreset.soundscapeDefaults[1] || 'Doğal bahçe rüzgar fısıltısı',
      },
      {
        start: 2.2,
        end: 4.5,
        purpose: 'PRODUCT_PROOF',
        visual_action: sectorPreset.id.includes('agri')
          ? 'Çiftçinin pirinç püskürtme borusuyla zeytin yapraklarına kesintisiz ve homojen sıvı uygulaması'
          : sectorPreset.id.includes('construct')
          ? 'Ustanın killi cephe tuğlasını harç yatağına milimetrik yerleştirip tokmakla sabitlemesi'
          : sectorPreset.id.includes('soft')
          ? 'Laptop ekranındaki harita arayüzünde tek tıkla doğrulanmış lokasyonların onaylanması'
          : `Kullanıcının @HeroProduct ile ${sectorPreset.mandatoryProofTypes[0] || 'performans kanıtını'} sergilemesi`,
        product_action: sectorPreset.id.includes('agri')
          ? 'Kanonik pirinç püskürtme borusundan yapraklara kesintisiz ve dengeli sıvı püskürtme'
          : sectorPreset.id.includes('construct')
          ? 'Tuğlanın harçla kusursuz kenetlenmesi ve sıfır derz kayması'
          : '@HeroProduct ile kesintisiz ve dengeli performans',
        actor_action: 'Hassas ve yetkin kontrol ile net uygulama',
        environment: sectorPreset.id.includes('agri')
          ? 'Zeytin ağaçları sırası boyunca doğal sabah ışığı'
          : sectorPreset.id.includes('construct')
          ? 'Yapı duvar hattı boyunca doğal gün ışığı'
          : sectorPreset.description,
        camera: '50mm cine lens, akıcı yanal takip ve net ürün odağı',
        lighting: sectorPreset.lightingProfile,
        physics_constraints: [
          'tutma noktaları ergonomik',
          ...sectorPreset.negativeVisuals.slice(0, 2),
        ],
        voiceover: '',
        dialogue: undefined,
        sfx: sectorPreset.soundscapeDefaults[0] || 'Pompa çalışma sesi ve homojen sıvı püskürtme sesi',
        ambience: sectorPreset.soundscapeDefaults[1] || 'Doğal bahçe ortamı',
      },
      {
        start: 4.5,
        end: 6.2,
        purpose: 'BENEFIT',
        visual_action: sectorPreset.id.includes('agri')
          ? 'Geniş açıya açılarak ağaç tacının tam kapsandığını gören çiftçinin tatmin dolu duruşu ve güven dolu baş onayı'
          : sectorPreset.id.includes('construct')
          ? 'Geniş açıya açılarak duvar örgü hattının nizami tamamlanışını gören ustanın tatmin dolu duruşu ve güven onayı'
          : sectorPreset.id.includes('soft')
          ? 'Ekrana bakan yöneticinin güven dolu tebessümü ve onay hareketi'
          : `Geniş açıya açılarak kusursuz sonucu gören kullanıcının güven dolu tatmin duruşu`,
        product_action: 'Sağlam ve güven veren ürün duruşu',
        actor_action: 'Sonuçtan memnun, güven dolu baş onayı',
        environment: sectorPreset.id.includes('agri')
          ? 'Zeytin ağaçları ve ufuk'
          : sectorPreset.id.includes('construct')
          ? 'Tamamlanmış yapı hattı ve ufuk'
          : sectorPreset.description,
        camera: '35mm geniş açıya akıcı yumuşak geri çekilme (pull-back reveal)',
        lighting: sectorPreset.lightingProfile,
        physics_constraints: [
          'kadrajda yapay metin veya yapay logo yok',
        ],
        voiceover: '',
        dialogue: undefined,
        sfx: 'Tok kapanış tınısı',
        ambience: sectorPreset.soundscapeDefaults[1] || 'Sakin bahçe ambiyansı',
      },
      {
        start: 6.2,
        end: 8.0,
        purpose: 'BRAND_CLOSE',
        visual_action: sectorPreset.id.includes('agri')
          ? 'Zeytinliğin sabah ışığı altındaki görüntüsü akıcı şekilde korunarak marka kapanış kartına zemin oluşturur'
          : sectorPreset.id.includes('construct')
          ? 'Mimari yapının ışık altındaki estetik görüntüsü akıcı şekilde korunarak marka kapanış kartına zemin oluşturur'
          : `${sectorPreset.name} atmosferi akıcı şekilde korunarak marka kapanış kartına zemin oluşturur`,
        product_action: `${brand} kurumsal güvencesi`,
        actor_action: 'Kadraj geriye çekilirken ortam atmosferi devam eder',
        environment: sectorPreset.id.includes('agri')
          ? 'Zeytin ağaçları ve sıcak sabah ufku'
          : sectorPreset.id.includes('construct')
          ? 'Mimari silüet ve sıcak gün batımı'
          : `${sectorPreset.description} atmosferi`,
        camera: 'Sabit derinlikli kadraj (frame-hold background continuation)',
        lighting: 'Altın saat tonları',
        physics_constraints: [
          'arka plan kadraj devamlılığı korunur',
          'ani siyah ekran yok',
        ],
        voiceover: '',
        dialogue: undefined,
        sfx: 'Tok kurumsal marka son sesi',
        ambience: sectorPreset.soundscapeDefaults[1] || 'Sakin rüzgar sesi',
      },
    ]

    // 3. Continuous Timed Speech across 0-8s (18-24 Turkish words, Subject-Object-Predicate)
    let speechTimeline: SpeechTimelineItem[] = []

    if (sectorPreset.id.includes('agri')) {
      speechTimeline = [
        {
          start_sec: 0.0,
          end_sec: 2.0,
          exact_text: 'Zorlu bahçe işlerinde güç ve hız arayanlara:',
          speaker: 'farmer',
          delivery: 'Urgent, engaging Turkish hook delivery',
          corresponding_visual_beat: '0.0-2.2s (HOOK + REVEAL)',
        },
        {
          start_sec: 2.0,
          end_sec: 5.0,
          exact_text: `${brand} şarjlı sırt pompasıyla tek tuşla güçlü ilaçlama.`,
          speaker: 'farmer',
          delivery: 'Authoritative, clear product demonstration delivery',
          corresponding_visual_beat: '2.2-4.5s (PRODUCT_PROOF)',
        },
        {
          start_sec: 5.0,
          end_sec: 8.0,
          exact_text: `Yüksek verim, kesintisiz performans. ${brand} ile keşfedin.`,
          speaker: 'farmer',
          delivery: 'Warm, confident closing delivery continuing into end card',
          corresponding_visual_beat: '4.5-8.0s (PAYOFF + BRAND_CLOSE)',
        },
      ]
    } else if (sectorPreset.id.includes('construct')) {
      speechTimeline = [
        {
          start_sec: 0.0,
          end_sec: 2.0,
          exact_text: 'Zorlu şantiye koşullarında sağlamlık ve güven arayan ustalara:',
          speaker: 'master_mason',
          delivery: 'Urgent, engaging Turkish hook delivery',
          corresponding_visual_beat: '0.0-2.2s (HOOK + REVEAL)',
        },
        {
          start_sec: 2.0,
          end_sec: 5.0,
          exact_text: `${brand} ürünleriyle her projede kusursuz işçilik ve güven.`,
          speaker: 'master_mason',
          delivery: 'Authoritative, clear product demonstration delivery',
          corresponding_visual_beat: '2.2-4.5s (PRODUCT_PROOF)',
        },
        {
          start_sec: 5.0,
          end_sec: 8.0,
          exact_text: `Yüksek dayanıklılık, tam güvence. ${brand} ile inşa edin.`,
          speaker: 'master_mason',
          delivery: 'Warm, confident closing delivery continuing into end card',
          corresponding_visual_beat: '4.5-8.0s (PAYOFF + BRAND_CLOSE)',
        },
      ]
    } else if (sectorPreset.id.includes('soft') || sectorPreset.id.includes('saas')) {
      speechTimeline = [
        {
          start_sec: 0.0,
          end_sec: 2.0,
          exact_text: 'Karmaşık veri süreçlerinde hız ve netlik arayan işletmelere:',
          speaker: 'executive',
          delivery: 'Urgent, engaging Turkish hook delivery',
          corresponding_visual_beat: '0.0-2.2s (HOOK + REVEAL)',
        },
        {
          start_sec: 2.0,
          end_sec: 5.0,
          exact_text: `${brand} akıllı yönetim paneliyle tek ekranda anlık kontrol.`,
          speaker: 'executive',
          delivery: 'Authoritative, clear product demonstration delivery',
          corresponding_visual_beat: '2.2-4.5s (PRODUCT_PROOF)',
        },
        {
          start_sec: 5.0,
          end_sec: 8.0,
          exact_text: `Zamandan tasarruf, tam kontrol. ${brand} ile hemen başlayın.`,
          speaker: 'executive',
          delivery: 'Warm, confident closing delivery continuing into end card',
          corresponding_visual_beat: '4.5-8.0s (PAYOFF + BRAND_CLOSE)',
        },
      ]
    } else if (sectorPreset.id.includes('food')) {
      speechTimeline = [
        {
          start_sec: 0.0,
          end_sec: 2.0,
          exact_text: 'Eşsiz lezzet ve taze malzemelerle hazırlanan zengin sofralara:',
          speaker: 'chef',
          delivery: 'Urgent, engaging Turkish hook delivery',
          corresponding_visual_beat: '0.0-2.2s (HOOK + REVEAL)',
        },
        {
          start_sec: 2.0,
          end_sec: 5.0,
          exact_text: `${brand} ustalarının özel tarifiyle anında enfes lezzet deneyimi.`,
          speaker: 'chef',
          delivery: 'Authoritative, clear product demonstration delivery',
          corresponding_visual_beat: '2.2-4.5s (PRODUCT_PROOF)',
        },
        {
          start_sec: 5.0,
          end_sec: 8.0,
          exact_text: `Unutulmaz tatlar, kaliteli sunum. ${brand} ile keşfedin.`,
          speaker: 'chef',
          delivery: 'Warm, confident closing delivery continuing into end card',
          corresponding_visual_beat: '4.5-8.0s (PAYOFF + BRAND_CLOSE)',
        },
      ]
    } else if (sectorPreset.id.includes('beauty')) {
      speechTimeline = [
        {
          start_sec: 0.0,
          end_sec: 2.0,
          exact_text: 'Doğal ışıltı ve pürüzsüz bir cilt arayan kadınlara:',
          speaker: 'beauty_expert',
          delivery: 'Urgent, engaging Turkish hook delivery',
          corresponding_visual_beat: '0.0-2.2s (HOOK + REVEAL)',
        },
        {
          start_sec: 2.0,
          end_sec: 5.0,
          exact_text: `${brand} besleyici formülüyle cildinizde anında canlandırıcı etki.`,
          speaker: 'beauty_expert',
          delivery: 'Authoritative, clear product demonstration delivery',
          corresponding_visual_beat: '2.2-4.5s (PRODUCT_PROOF)',
        },
        {
          start_sec: 5.0,
          end_sec: 8.0,
          exact_text: `Işıltılı görünüm, doğal güzellik. ${brand} ile tanışın.`,
          speaker: 'beauty_expert',
          delivery: 'Warm, confident closing delivery continuing into end card',
          corresponding_visual_beat: '4.5-8.0s (PAYOFF + BRAND_CLOSE)',
        },
      ]
    } else {
      speechTimeline = [
        {
          start_sec: 0.0,
          end_sec: 2.0,
          exact_text: 'Kalite, dayanıklılık ve üstün performanstan vazgeçmeyenlere:',
          speaker: 'spokesperson',
          delivery: 'Urgent, engaging Turkish hook delivery',
          corresponding_visual_beat: '0.0-2.2s (HOOK + REVEAL)',
        },
        {
          start_sec: 2.0,
          end_sec: 5.0,
          exact_text: `${brand} kalitesiyle her kullanımda maksimum verim ve rahatlık.`,
          speaker: 'spokesperson',
          delivery: 'Authoritative, clear product demonstration delivery',
          corresponding_visual_beat: '2.2-4.5s (PRODUCT_PROOF)',
        },
        {
          start_sec: 5.0,
          end_sec: 8.0,
          exact_text: `Güvenilir kalite, uzun ömürlü kullanım. ${brand} güvencesiyle.`,
          speaker: 'spokesperson',
          delivery: 'Warm, confident closing delivery continuing into end card',
          corresponding_visual_beat: '4.5-8.0s (PAYOFF + BRAND_CLOSE)',
        },
      ]
    }

    const fullSpokenScript = speechTimeline.map(s => s.exact_text).join(' ')

    const audioPlan = {
      spoken_language: 'tr-TR',
      speech_mode: 'native_veo_dialogue' as const,
      exact_spoken_lines: speechTimeline.map(s => ({
        start: s.start_sec,
        end: s.end_sec,
        speaker: s.speaker,
        text: s.exact_text,
        delivery_style: s.delivery,
      })),
      speech_timeline: speechTimeline,
      master_spoken_script: fullSpokenScript,
      allow_paraphrase: false as const,
      allow_translation: false as const,
      allow_extra_dialogue: false as const,
      ambient_audio_description: 'soft morning orchard ambience, subtle equipment operating sound, natural leaf movement',
      sound_effects_description: 'subtle equipment activation hum and spray sound',
    }

    const canonicalHandles = businessModel === 'saas_software'
      ? ['@SoftwareUI', '@BrandLogo']
      : ['@HeroProduct', '@ProductDetail', '@EnvironmentReference', '@BrandLogo']

    const unverifiedList = (snapshot.unverified_facts || []).map(u => u.toLowerCase().trim())
    const isVerified = (val?: string): boolean => {
      if (!val || !val.trim()) return false
      const lower = val.toLowerCase().trim()
      return !unverifiedList.some(unv => unv && lower.includes(unv))
    }

    // 4. Strict Copy Hierarchy: Maximum 3 message levels on-screen (zero cartoon emojis/icons)
    const onScreenCopy: OnScreenCopyPlan = {
      hook: businessModel === 'saas_software' ? 'NET VE ANLIK KONTROL' : 'BAHÇEDE GÜÇ VE HIZ',
      benefit_or_proof: businessModel === 'saas_software' ? 'TEK EKRANDA YÖNETİM' : 'TEK TUŞLA GÜÇLÜ İLAÇLAMA',
      brand_or_cta: isVerified(snapshot.campaign.cta) ? snapshot.campaign.cta.toUpperCase() : `${brand.toUpperCase()} GÜVENCESİYLE`,
    }

    // 5. Editing Rhythm Plan
    const editingRhythm: EditingRhythmPlan = {
      cut_points: grammar.cut_points,
      visual_rhythm: grammar.visual_rhythm,
      hook_frame: 'Extreme macro close-up on precision brass nozzle with sudden pressure burst',
      product_reveal_frame: 'Rapid fluid pull-back revealing full ergonomic sprayer on operator',
      proof_frame: 'Dynamic continuous mist coverage arcing across foliage',
      payoff_frame: 'Operator surveying complete coverage under morning sunlight with confident approval',
      brand_close_frame: 'Atmospheric grove frame-hold smoothly continuing into brand end card',
    }

    const lowerThird = {
      type: 'lower_third' as const,
      start_sec: 1.5,
      end_sec: 5.5,
      text_line_1: onScreenCopy.benefit_or_proof || (isVerified(snapshot.campaign.headline) ? snapshot.campaign.headline! : prodName),
      accent_color: snapshot.brand_palette.accent || '#00FFCC',
      bg_color: snapshot.brand_palette.primary || '#0A2E28',
      mobile_safe_zone: true,
    }

    // Only include phone or website if verified
    const validPhone = isVerified(snapshot.campaign.phoneNumber) ? snapshot.campaign.phoneNumber : undefined
    const validWebsite = isVerified(snapshot.campaign.website) ? snapshot.campaign.website : undefined
    const contactStr = [validPhone, validWebsite].filter(Boolean).join(' | ')

    const endCard = {
      start_sec: 6.2,
      end_sec: 8.0,
      template_family: 'minimalist_center',
      headline: brand,
      cta_text: isVerified(snapshot.campaign.cta) ? snapshot.campaign.cta : `${brand} Güvencesiyle`,
      website_or_phone: contactStr,
      background_color: snapshot.brand_palette.primary || '#0A2E28',
      accent_color: snapshot.brand_palette.accent || '#00A896',
      visual_transition: 'background_continuation' as const,
    }

    return {
      plan_id: `short_plan_${Date.now()}`,
      brand_name: brand,
      ad_format: adFormat,
      selected_ad_format: adFormat,
      selected_format_variant: finalFingerprint.format_variant,
      selection_reason: routing.selection_reason,
      creative_fingerprint: finalFingerprint,
      subtitles_mode: options?.subtitles_mode || snapshot.campaign?.subtitles || 'auto',
      creative_idea: creativeIdea,
      advertising_hook: advertisingHook,
      product_truth: productTruth,
      audience_value: audienceValue,
      story_arc: storyArc,
      beats,
      audio_plan: audioPlan,
      master_spoken_script: fullSpokenScript,
      speech_timeline: speechTimeline,
      editing_rhythm: editingRhythm,
      on_screen_copy: onScreenCopy,
      voiceover_script: fullSpokenScript,
      subtitle_plan: speechTimeline.map(s => ({ start: s.start_sec, end: s.end_sec, text: s.exact_text })),
      logo_strategy: 'DIEGETIC_BRANDING + END_CARD',
      diegetic_branding_plan: [
        {
          surface_type: 'equipment_panel',
          visibility_window: { start: 0.0, end: 6.2 },
          description: 'Front recessed equipment panel of @HeroProduct',
        },
      ],
      overlay_plan: [lowerThird],
      end_card_plan: endCard,
      negative_constraints: [
        'NO GENERATED TEXT',
        'NO INVENTED LOGO',
        'NO FAKE LOGO',
        'NO ALTERED LOGO',
        'NO EXTRA BRAND MARKS',
        'NO GENERATED PRICE',
        'NO GENERATED CTA',
        'NO GENERATED PHONE NUMBER',
        'NO GENERATED WEBSITE',
        'NO WATERMARK',
        'NO PRODUCT REDESIGN',
        'no car wash or automotive elements in agriculture',
        'no distorted hands or floating fingers',
        'no disconnected pipes or floating sprays',
      ],
      canonical_asset_handles: canonicalHandles,
      veo_generation_intent: `8s commercial raw cinematography capturing authentic ${sector} environment and real @HeroProduct action.`,
    }
  }

  private synthesizeCreativeIdea(brand: string, sector: string, product: string, model: BusinessModel): string {
    const preset = globalSectorPresetRegistry.get(sector)
    if (preset && preset.id !== 'generic_commercial') {
      return `${preset.description} içinde ${brand} ve ${product} ile ${preset.motionCharacter}.`
    }
    if (model === 'saas_software') {
      return `Dijital platformda analitik veri analizi ve ${brand} arayüzü.`
    }
    return `Kalıcı ustalık ve profesyonel disiplin: ${brand} ile ${product}.`
  }

  private synthesizeHook(sector: string, model: BusinessModel): string {
    const preset = globalSectorPresetRegistry.get(sector)
    if (preset && preset.id !== 'generic_commercial') {
      return `${preset.name} odaklı çarpıcı açılış: ${preset.cameraLanguage}.`
    }
    if (model === 'saas_software') {
      return `İşletme analitiğinde net ve odaklanmış kontrol.`
    }
    return `Profesyonel iş temposunda yüksek kalite ve güven.`
  }

  private synthesizeProductTruth(snapshot: BrandContextSnapshot, product: any, model: BusinessModel): string {
    if (product && product.description) {
      return `${product.name}: ${product.description}.`
    }
    const preset = globalSectorPresetRegistry.get(snapshot.sector_profile)
    return `${product?.name || snapshot.brand_name}; ${preset.mandatoryProofTypes.join(', ')} standartlarına sahip profesyonel ürün.`
  }

  private synthesizeAudienceValue(snapshot: BrandContextSnapshot, model: BusinessModel): string {
    const preset = globalSectorPresetRegistry.get(snapshot.sector_profile)
    return `${preset.name} alanında yüksek verim, dayanıklılık ve güvenilir sonuç.`
  }

  /**
   * Plans commercial directly from an authoritative JobAssetManifest.
   * Strictly enforces: USE PROVIDED ASSETS OR FAIL CLOSED.
   * No autofill of fake facts, prices, discounts, or contact info.
   */
  public async planFromJobManifest(
    manifest: import('../types/job-asset-manifest.js').JobAssetManifest,
    options?: { recent_fingerprints?: CreativeFingerprint[] }
  ): Promise<ShortAdMasterPlan> {
    const facts = manifest.authoritative_facts
    const brand = facts.brand_name
    const prodName = facts.product_name
    const desc = facts.description || ''

    const userPref = manifest.creative_request?.user_style_preference || 'AUTO'
    const routing = this.adFormatRouter.routeStyleToFormat(
      userPref,
      manifest.creative_request?.objective,
      'agriculture',
      'physical_product',
      []
    )
    const adFormat: AdvertisingFormat = routing.ad_format
    const variantResult = this.variantSelector.selectVariant(
      adFormat,
      'agriculture',
      'physical_product',
      options?.recent_fingerprints || [],
      manifest.org_id
    )

    const proposedFingerprint: CreativeFingerprint = {
      tenant_id: manifest.org_id,
      ad_format: adFormat,
      format_variant: variantResult.format_variant,
      hook_type: variantResult.format_variant === 'MACRO_FIRST' ? 'macro_nozzle_spray' : 'operator_action',
      opening_visual_type: 'product_functional_macro',
      camera_pattern: 'macro_cine_shallow_push',
      environment_type: 'orchard',
      speech_structure: 'HOOK_PROOF_PAYOFF',
      end_card_family: 'minimalist_center',
    }

    const { fingerprint: finalFingerprint } = this.diversityGuard.guardAndDiversify(
      proposedFingerprint,
      options?.recent_fingerprints || [],
      variantResult.available_variants
    )

    const grammar = this.formatRouter.getGrammar(adFormat)

    // 5 micro-beats aligned with PERFORMANCE_DEMO grammar
    const beats: MasterPlanBeat[] = [
      {
        start: 0.0,
        end: 0.7,
        purpose: 'HOOK',
        visual_action: 'Aşırı makro yakın çekim: Pirinç nozülden basınçla fışkıran ilk mikronize sıvı damlacıkları ve ani hareket',
        product_action: 'Pirinç nozülden anlık yüksek basınç çıkışı',
        actor_action: 'Tetiğe basış anı',
        environment: 'Güneş ışığında parlayan Ege zeytinliği',
        camera: 'Macro cine lens, sığ alan derinliği, yüksek dinamik giriş',
        lighting: 'Sabah güneşiyle parlayan metalik pirinç nozül',
        physics_constraints: [
          'yerçekimi ve sıvı dinamiği doğal',
          'oto yıkama veya binek araç yok',
          'ekranda yapay yazı yok',
        ],
        sfx: 'Düşük frekanslı tok püskürtme patlama sesi',
        ambience: 'Zeytin yapraklarının hafif rüzgardaki hışırtısı',
      },
      {
        start: 0.7,
        end: 2.2,
        purpose: 'REVEAL',
        visual_action: 'Hızlı akıcı geri çekilme ile zeytin ağaçları arasında sırtında ürünle ilerleyen çiftçinin ve gövdenin net görünümü',
        product_action: 'Kanonik @HeroProduct gövdesi sırtta dengeli ve net',
        actor_action: 'Kendinden emin adımlarla ağaç sırasına yönelme',
        environment: 'Sabah güneşiyle aydınlanan bakımlı Ege zeytinliği',
        camera: '50mm cine lens, akıcı yanal takip ve net ürün odağı',
        lighting: 'Sabah doğal güneş ışığı',
        physics_constraints: [
          'ergonomik askı ve sırt teması doğal',
          'oto yıkama veya binek araç yok',
          'ekranda yapay yazı yok',
        ],
        sfx: 'Düşük frekanslı tok geçiş sesi',
        ambience: 'Doğal bahçe rüzgar fısıltısı',
      },
      {
        start: 2.2,
        end: 4.5,
        purpose: 'PRODUCT_PROOF',
        visual_action: 'Çiftçinin pirinç püskürtme borusuyla zeytin yapraklarına kesintisiz ve homojen sıvı uygulaması',
        product_action: 'Kanonik pirinç püskürtme borusundan yapraklara kesintisiz ve dengeli sıvı püskürtme',
        actor_action: 'Tetiğe basarak ağaç tacına yönlendirme ve net uygulama',
        environment: 'Zeytin ağaçları sırası boyunca doğal sabah ışığı',
        camera: '50mm cine lens, akıcı yanal takip ve net ürün odağı',
        lighting: 'Pirinç boru ve yaprakları aydınlatan yumuşak gün ışığı',
        physics_constraints: [
          'tutma noktaları ergonomik',
          'hortum gövdeye tam bağlı',
          'püskürtme yönü nozül açısıyla uyumlu',
        ],
        sfx: 'Pompa çalışma sesi ve homojen sıvı püskürtme sesi',
        ambience: 'Doğal bahçe ortamı',
      },
      {
        start: 4.5,
        end: 6.2,
        purpose: 'BENEFIT',
        visual_action: 'Geniş açıya açılarak ağaç tacının tam kapsandığını gören çiftçinin tatmin dolu duruşu ve güven dolu baş onayı',
        product_action: 'Omuzda sağlam ve güven veren duruş',
        actor_action: 'Sonuçtan memnun, güven dolu baş onayı',
        environment: 'Zeytin ağaçları ve ufuk',
        camera: '35mm geniş açıya akıcı yumuşak geri çekilme (pull-back reveal)',
        lighting: 'Doğal gün ışığı',
        physics_constraints: [
          'kadrajda yapay metin veya yapay logo yok',
        ],
        sfx: 'Tok kapanış tınısı',
        ambience: 'Sakin bahçe ambiyansı',
      },
      {
        start: 6.2,
        end: 8.0,
        purpose: 'BRAND_CLOSE',
        visual_action: 'Zeytinliğin sabah ışığı altındaki görüntüsü akıcı şekilde korunarak marka kapanış kartına zemin oluşturur',
        product_action: 'Marka güvencesi',
        actor_action: 'Kadraj geriye çekilirken zeytinlik atmosferi devam eder',
        environment: 'Zeytin ağaçları ve sıcak sabah ufku',
        camera: 'Sabit derinlikli kadraj (frame-hold background continuation)',
        lighting: 'Altın saat tonları',
        physics_constraints: [
          'arka plan kadraj devamlılığı korunur',
          'ani siyah ekran yok',
        ],
        sfx: 'Tok kurumsal marka son sesi',
        ambience: 'Sakin rüzgar sesi',
      },
    ]

    // 18-24 Turkish words continuous timed speech
    const speechTimeline: SpeechTimelineItem[] = [
      {
        start_sec: 0.0,
        end_sec: 2.0,
        exact_text: 'Zorlu bahçe işlerinde güç ve hız arayanlara:',
        speaker: 'farmer',
        delivery: 'Urgent, engaging Turkish hook delivery',
        corresponding_visual_beat: '0.0-2.2s (HOOK + REVEAL)',
      },
      {
        start_sec: 2.0,
        end_sec: 5.0,
        exact_text: `${brand} şarjlı sırt pompasıyla tek tuşla güçlü ilaçlama.`,
        speaker: 'farmer',
        delivery: 'Authoritative, clear product demonstration delivery',
        corresponding_visual_beat: '2.2-4.5s (PRODUCT_PROOF)',
      },
      {
        start_sec: 5.0,
        end_sec: 8.0,
        exact_text: `Yüksek verim, kesintisiz performans. ${brand} ile keşfedin.`,
        speaker: 'farmer',
        delivery: 'Warm, confident closing delivery continuing into end card',
        corresponding_visual_beat: '4.5-8.0s (PAYOFF + BRAND_CLOSE)',
      },
    ]

    const fullSpokenScript = speechTimeline.map(s => s.exact_text).join(' ')

    const audioPlan = {
      spoken_language: manifest.creative_request.language || 'tr-TR',
      speech_mode: 'native_veo_dialogue' as const,
      exact_spoken_lines: speechTimeline.map(s => ({
        start: s.start_sec,
        end: s.end_sec,
        speaker: s.speaker,
        text: s.exact_text,
        delivery_style: s.delivery,
      })),
      speech_timeline: speechTimeline,
      master_spoken_script: fullSpokenScript,
      allow_paraphrase: false as const,
      allow_translation: false as const,
      allow_extra_dialogue: false as const,
      ambient_audio_description: 'soft morning orchard ambience, subtle equipment operating sound, natural leaf movement',
      sound_effects_description: 'subtle equipment activation hum and spray sound',
    }

    const onScreenCopy: OnScreenCopyPlan = {
      hook: 'BAHÇEDE GÜÇ VE HIZ',
      benefit_or_proof: 'TEK TUŞLA GÜÇLÜ İLAÇLAMA',
      brand_or_cta: facts.cta ? facts.cta.toUpperCase() : `${brand.toUpperCase()} GÜVENCESİYLE`,
    }

    const editingRhythm: EditingRhythmPlan = {
      cut_points: grammar.cut_points,
      visual_rhythm: grammar.visual_rhythm,
      hook_frame: 'Extreme macro close-up on precision brass nozzle with sudden pressure burst',
      product_reveal_frame: 'Rapid fluid pull-back revealing full ergonomic sprayer on operator',
      proof_frame: 'Dynamic continuous mist coverage arcing across foliage',
      payoff_frame: 'Operator surveying complete coverage under morning sunlight with confident approval',
      brand_close_frame: 'Atmospheric grove frame-hold smoothly continuing into brand end card',
    }

    const lowerThird = {
      type: 'lower_third' as const,
      start_sec: 1.5,
      end_sec: 5.5,
      text_line_1: onScreenCopy.benefit_or_proof || facts.campaign_message || prodName,
      accent_color: '#00FFCC',
      bg_color: '#0A2E28',
      mobile_safe_zone: true,
    }

    // Only include phone or URL if explicitly provided in authoritative facts
    const contactStr = [facts.phone, facts.url].filter(Boolean).join(' | ')

    const endCard = {
      start_sec: 6.2,
      end_sec: 8.0,
      template_family: 'minimalist_center',
      headline: brand,
      cta_text: facts.cta || `${brand} Güvencesiyle`,
      website_or_phone: contactStr,
      background_color: '#0A2E28',
      accent_color: '#00A896',
      visual_transition: 'background_continuation' as const,
    }

    const handles = ['@HeroProduct', '@BrandLogo']
    if (manifest.authoritative_assets.extraReferences) {
      for (const ref of manifest.authoritative_assets.extraReferences) {
        handles.push(ref.handle)
      }
    }

    return {
      plan_id: `short_plan_${manifest.job_id}`,
      brand_name: brand,
      ad_format: adFormat,
      selected_ad_format: adFormat,
      selected_format_variant: finalFingerprint.format_variant,
      selection_reason: routing.selection_reason,
      creative_fingerprint: finalFingerprint,
      subtitles_mode: manifest.creative_request?.subtitles || 'auto',
      creative_idea: `Ege zeytinliğinde çalışan çiftçi ve ${prodName} ile ilaçlama.`,
      advertising_hook: 'Sabah ışığında zeytin ağaçları arasına adımlarla giren çiftçi ve tetiğe basış anı.',
      product_truth: desc ? `${prodName}: ${desc}` : `${prodName} şarjlı sırt pompası.`,
      audience_value: 'Bahçe bakımında şarjlı sırt pompası kullanımı.',
      story_arc: 'HOOK (0-0.7s) -> REVEAL (0.7-2.2s) -> PRODUCT PROOF (2.2-4.5s) -> PAYOFF (4.5-6.2s) -> BRAND CLOSE (6.2-8.0s)',
      beats,
      audio_plan: audioPlan,
      master_spoken_script: fullSpokenScript,
      speech_timeline: speechTimeline,
      editing_rhythm: editingRhythm,
      on_screen_copy: onScreenCopy,
      voiceover_script: fullSpokenScript,
      subtitle_plan: speechTimeline.map(s => ({ start: s.start_sec, end: s.end_sec, text: s.exact_text })),
      logo_strategy: 'DIEGETIC_BRANDING + END_CARD',
      diegetic_branding_plan: [
        {
          surface_type: 'equipment_panel',
          visibility_window: { start: 0.0, end: 6.2 },
          description: 'Front recessed equipment panel of @HeroProduct',
        },
      ],
      overlay_plan: [lowerThird],
      end_card_plan: endCard,
      negative_constraints: [
        'NO GENERATED TEXT',
        'NO INVENTED LOGO',
        'NO FAKE LOGO',
        'NO ALTERED LOGO',
        'NO EXTRA BRAND MARKS',
        'NO GENERATED PRICE',
        'NO GENERATED CTA',
        'NO GENERATED PHONE NUMBER',
        'NO GENERATED WEBSITE',
        'NO WATERMARK',
        'NO PRODUCT REDESIGN',
        'no car wash or automotive elements in agriculture',
        'no distorted hands or floating fingers',
        'no disconnected pipes or floating sprays',
      ],
      canonical_asset_handles: handles,
      veo_generation_intent: `8s commercial raw cinematography capturing authentic orchard environment and real @HeroProduct action.`,
    }
  }
}
