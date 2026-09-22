/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * CONCEPT GENERATOR (V6)
 * 
 * Amaç:
 * İlk gelen fikri doğrudan seçmek yerine, aynı brief için 5 kökten farklı
 * dramatik ve görsel anlatım aygıtı (Narrative Device) barındıran konsept üretir.
 */

import type { ResolvedCreativeFacts, CreativeDNA, StrategicPromise, CreativeConcept } from './creative-types'

export function generateCreativeConcepts(
  facts: ResolvedCreativeFacts,
  dna: CreativeDNA,
  promise: StrategicPromise
): CreativeConcept[] {
  const brand = facts.brandName
  const product = facts.product.name
  const material = dna.product.materials[0] || 'engineered material'
  const env = dna.product.visualWorld[0] || 'authentic workplace'

  return [
    // Konsept 1: Dokusal ve Maddi Hakikat (Material Tactility & Physics)
    {
      id: 'c01_material_truth',
      name: 'Maddenin Özü ve Hakikati',
      oneSentenceIdea: `${product} malzemesinin mikron düzeyindeki kusursuz dokusundan makro nihai esere uzanan fiziksel yolculuk.`,
      narrativeDevice: 'scale_and_tactility_expansion',
      openingMechanism: `Aşırı yakın makro planda ${material} dokusunun doğal ışıkla parıldayan yüzeyiyle anında başlar.`,
      payoffMechanism: `Kameranın geri çekilerek ${env} içinde kusursuz yerleşimini ve ${brand} mührünü göstermesiyle tamamlanır.`,
      visualPotential: [
        'ultra-macro texture',
        'subtle dust or moisture light refraction',
        'massive geometric expansion',
      ],
      proofUsage: [
        'Fiziksel malzemenin saf kalitesi ve dokusal pürüzsüzlüğü.',
      ],
      risks: [
        'Aşırı soyut kalma riski; 2. saniyede ürün bütünlüğü hızla görünür kılınmalıdır.',
      ],
    },

    // Konsept 2: Usta / Operatör Etkileşimi (Master Practitioner & Ergonomics)
    {
      id: 'c02_practitioner_mastery',
      name: 'Ustanın Dokunuşu',
      oneSentenceIdea: `İşinin ehli bir profesyonelin ${product} ile kurduğu sessiz, kendinden emin ve kesintisiz uyum.`,
      narrativeDevice: 'human_mastery_and_tool_extension',
      openingMechanism: `Bir ustanın kararlı, odaklanmış bakışı ve ellerinin ${product} üzerine yerleştiği 0.3 saniyelik net aksiyon.`,
      payoffMechanism: `Ustanın tamamlanmış işe duyduğu sessiz gurur ve ürünün kusursuz stabil duruşu.`,
      visualPotential: [
        'authentic hand gestures',
        'practical work environment',
        'purposeful body language without fake smiles',
      ],
      proofUsage: [
        'Kullanım anındaki akıcılık, titreşimsiz veya dengeli performans.',
      ],
      risks: [
        'Oyuncunun yapay görünme riski; abartılı mimik veya kameraya gülümseme yasaklanmalıdır.',
      ],
    },

    // Konsept 3: Dönüşüm ve Süreç İspatı (Process & Transformation Proof)
    {
      id: 'c03_transformation_proof',
      name: 'Süreç İspatı',
      oneSentenceIdea: `${product} devreye girmeden önceki ihtiyaç hali ile devreye girdikten sonraki kusursuz sonuç arasındaki radikal fark.`,
      narrativeDevice: 'cause_and_effect_transformation',
      openingMechanism: 'Ortamdaki gerçek bir iş probleminin veya hazırlık anının yüksek enerjiyle başlaması.',
      payoffMechanism: `${product} müdahalesi sonrası ortaya çıkan nihai, temiz ve eksiksiz sonuç tablosu.`,
      visualPotential: [
        'before-and-after tangible progress',
        'dynamic lighting transition',
        'clean structural finish',
      ],
      proofUsage: [
        'Zaman tasarrufu ve operasyonel verim kanıtı.',
      ],
      risks: [
        'Ucuz tele-alışveriş formatına kayma riski; sinematik ışık ve gerçekçi fizik korunmalıdır.',
      ],
    },

    // Konsept 4: Boyut, Hacim ve Lojistik Güç (Scale & Supply Power)
    {
      id: 'c04_scale_and_supply',
      name: 'Kesintisiz Hacim ve Sevkiyat Gücü',
      oneSentenceIdea: `${brand} arkasındaki kesintisiz üretim hacminin, stok gücünün ve şantiyeye/bahçeye zamanında ulaşmasının yarattığı sarsılmaz güven.`,
      narrativeDevice: 'scale_and_availability_monument',
      openingMechanism: 'Nizamî dizilmiş, ufka uzanan yüksek hacimli düzenli ürün blokları veya lojistik hazırlığı.',
      payoffMechanism: 'Gereken ürünün tam vaktinde ve eksiksiz yerine ulaştığı anın teslimiyet rahatlığı.',
      visualPotential: [
        'sweeping architectural lines',
        'rhythmic pallet geometry',
        'industrial precision',
      ],
      proofUsage: [
        'Tedarik kesintisi yaşamama ve derhal temin edilebilirlik kanıtı.',
      ],
      risks: [
        'Soğuk ve ruhsuz bir depo videosuna dönüşme riski; insan ölçeği ve sıcak ışık eklenmelidir.',
      ],
    },

    // Konsept 5: Görsel Zarafet ve Prestij Portresi (Prestige & Stillness)
    {
      id: 'c05_prestige_monolith',
      name: 'Sessiz Otorite ve Prestij',
      oneSentenceIdea: `${product} öyle bir güvenilirlikle durur ki, bağırmadan yalnızca mükemmelliğiyle konuşur.`,
      narrativeDevice: 'quiet_commercial_prestige',
      openingMechanism: 'Doğal gün ışığının ürün silueti üzerinden yavaşça kayarak formu açığa çıkarması.',
      payoffMechanism: `Işığın ${brand} logosunun metal veya mat kabartması üzerine tam oturmasıyla sessiz zafer.`,
      visualPotential: [
        'chiselled rim highlights',
        'monolithic camera glide',
        'rich shadowed contrast',
      ],
      proofUsage: [
        'Malzeme kalitesi, boya/dokusu ve montaj kusursuzluğu.',
      ],
      risks: [
        'Eylemsiz veya durağan görünme riski; yavaş ama kesintisiz kamera itişi (push-in) gereklidir.',
      ],
    },
  ]
}
