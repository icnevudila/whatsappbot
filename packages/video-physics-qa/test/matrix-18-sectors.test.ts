import test from 'node:test'
import assert from 'node:assert/strict'
import { PhysicsPreFlightAnalyzer } from '../src/physics-pre-flight.js'
import type { PhysicalActionContract } from '../src/types.js'

interface TestCase {
  id: string
  sector: string
  description: string
  contract: PhysicalActionContract
  expectedRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  expectedValid: boolean
}

const testCases: TestCase[] = [
  // 1. Tarım - Sırt pompası yaprak ilaçlama (SAFE)
  {
    id: 'TC-01',
    sector: 'Tarım',
    description: 'Böfe Tarım sırt tipi ilaçlama pompası yaprak hedefli ilaçlama',
    contract: {
      subject: 'tarım pompası',
      action: 'Operatör nozülden yapraklar üzerine ultra ince sprey mist uyguluyor',
      environment: 'zeytin bahçesi',
      support_surface: 'target foliage yaprak',
      contact_relationship: 'fluid droplets coating target leaves',
      motion_direction: 'forward sweeping',
      start_state: 'pressurized mist',
      end_state: 'wetted foliage',
      physical_constraints: ['fluid dynamics'],
      continuity_anchor: 'spray wand and trees',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 2. Tarım - Hedefsiz havaya rastgele sıvı sıkma (MEDIUM)
  {
    id: 'TC-02',
    sector: 'Tarım',
    description: 'Hedefsiz havaya rastgele sıvı püskürtme',
    contract: {
      subject: 'tarım pompası',
      action: 'Pompa havaya rastgele sprey püskürtüyor',
      environment: 'tarla',
      support_surface: 'boş hava',
      contact_relationship: 'unfocused airborne spray',
      motion_direction: 'upward',
      start_state: 'spraying',
      end_state: 'airborne mist',
      physical_constraints: ['air dispersion'],
      continuity_anchor: 'spray nozzle',
    },
    expectedRisk: 'MEDIUM',
    expectedValid: true, // Warns but doesn't hard block
  },
  // 3. İnşaat - Paletin tek tuğlaya indirilmesi (HIGH - Ayvazoğlu hatası)
  {
    id: 'TC-03',
    sector: 'İnşaat',
    description: 'Forklift ağır paleti tek tuğla üzerine indiriyor',
    contract: {
      subject: 'tuğla 2',
      action: 'Forklift ağır palet yükünü tek tuğla üzerine indiriyor',
      environment: 'şantiye',
      support_surface: 'tek dik duran tuğla',
      contact_relationship: 'palet ahşap tabanı tek tuğlanın üzerine biniyor',
      motion_direction: 'downward vertical',
      start_state: 'airborne pallet',
      end_state: 'resting on single brick',
      physical_constraints: ['weight capacity'],
      continuity_anchor: 'hero brick',
    },
    expectedRisk: 'HIGH',
    expectedValid: false,
  },
  // 4. İnşaat - Paletin düz zemine güvenli indirilmesi (SAFE)
  {
    id: 'TC-04',
    sector: 'İnşaat',
    description: 'Forklift paleti zemine güvenli indiriyor',
    contract: {
      subject: 'tuğla 2',
      action: 'Forklift ahşap paleti düz zemin üzerine indiriyor',
      environment: 'inşaat sahası',
      support_surface: 'düz zemin beton',
      contact_relationship: 'ahşap palet tabanı zemine tam oturuyor',
      motion_direction: 'downward controlled',
      start_state: 'forklift forks engaging',
      end_state: 'ground resting',
      physical_constraints: ['ground load capacity'],
      continuity_anchor: 'pallet stack',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 5. İnşaat - Ustanın harç üzerine tuğla koyması (SAFE)
  {
    id: 'TC-05',
    sector: 'İnşaat',
    description: 'Duvar ustası tuğlayı harç yatağına yerleştiriyor',
    contract: {
      subject: 'tuğla 2',
      action: 'Usta mala ile harç sürülmüş duvar sırasına tuğla yerleştiriyor',
      environment: 'duvar örüm sahası',
      support_surface: 'harç yatağı ve alt tuğla sırası',
      contact_relationship: 'tuğla harca tam oturuyor',
      motion_direction: 'downward placement',
      start_state: 'mason hands holding',
      end_state: 'leveled wall brick',
      physical_constraints: ['mortar adhesion'],
      continuity_anchor: 'wall line',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 6. Gıda - Dönercinin döner kesmesi (SAFE)
  {
    id: 'TC-06',
    sector: 'Gıda',
    description: 'Usta döner bıçağıyla sıcak eti kesiyor',
    contract: {
      subject: 'yaprak döner',
      action: 'Usta keskin döner bıçağıyla döner ocağından ince et dilimleri kesiyor',
      environment: 'döner ocağı mutfak',
      support_surface: 'döner şişi',
      contact_relationship: 'bıçak et teması',
      motion_direction: 'downward slice',
      start_state: 'rotating meat spit',
      end_state: 'sliced meat in pan',
      physical_constraints: ['mechanical slicing'],
      continuity_anchor: 'chef knife and meat',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 7. Gıda - Havada kendiliğinden beliren döner (HIGH)
  {
    id: 'TC-07',
    sector: 'Gıda',
    description: 'Döner porsiyonu havada kendiliğinden beliriyor',
    contract: {
      subject: 'yaprak döner',
      action: 'Döner tabağı havada kendiliğinden beliriyor',
      environment: 'restoran',
      support_surface: 'boşluk',
      contact_relationship: 'floating in air',
      motion_direction: 'none',
      start_state: 'invisible',
      end_state: 'floating food',
      physical_constraints: ['gravity'],
      continuity_anchor: 'food',
    },
    expectedRisk: 'HIGH',
    expectedValid: false,
  },
  // 8. Çiçekçilik - Çiçek buketinin vazoya konulması (SAFE)
  {
    id: 'TC-08',
    sector: 'Çiçekçilik',
    description: 'Taze kesilmiş güllerin su dolu cam vazoya yerleştirilmesi',
    contract: {
      subject: 'gül buketi',
      action: 'Çiçekçi sapları temizlenmiş gülleri su dolu cam vazoya yerleştiriyor',
      environment: 'çiçek atölyesi',
      support_surface: 'cam vazo tabanı ve su',
      contact_relationship: 'saplar vazo tabanında toplanıyor',
      motion_direction: 'downward placement',
      start_state: 'hand-held bouquet',
      end_state: 'vase arranged flowers',
      physical_constraints: ['fluid level', 'stem rigidity'],
      continuity_anchor: 'vase and flowers',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 9. Endüstri - CNC torna milinin dönmesi (SAFE)
  {
    id: 'TC-09',
    sector: 'Endüstri',
    description: 'Vortex CNC frezede metal parçanın işlenmesi',
    contract: {
      subject: 'endüstriyel mil',
      action: 'CNC ucu sabitlenmiş silindirik çelik mili soğutma sıvısı eşliğinde tornalıyor',
      environment: 'makine atölyesi',
      support_surface: 'ayna ve punta desteği',
      contact_relationship: 'kesici uç talaş kaldırıyor',
      motion_direction: 'rotational and lateral feed',
      start_state: 'chucked stock',
      end_state: 'precision machined shaft',
      physical_constraints: ['rigidity', 'clamping force'],
      continuity_anchor: 'cnc spindle',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 10. Endüstri - Forklift çatalları çekilirken havada asılı kalan palet (HIGH)
  {
    id: 'TC-10',
    sector: 'Endüstri',
    description: 'Forklift çatalları çekerken yükün havada asılı kalması',
    contract: {
      subject: 'makine kasası',
      action: 'Forklift çatallarını yükün altından çekiyor ve yük havada kalıyor',
      environment: 'fabrika holü',
      support_surface: 'boş hava',
      contact_relationship: 'çatalları bırak ve havada dur',
      motion_direction: 'reverse fork retract',
      start_state: 'lifted crate',
      end_state: 'airborne hovering',
      physical_constraints: ['gravity'],
      continuity_anchor: 'crate',
    },
    expectedRisk: 'HIGH',
    expectedValid: false,
  },
  // 11. Otomotiv - Detailing bezinin kaporta üzerinde kayması (SAFE)
  {
    id: 'TC-11',
    sector: 'Otomotiv',
    description: 'Mikrofiber bezin cilalı kaput üzerinde pürüzsüz kayması',
    contract: {
      subject: 'seramik kaplama bezi',
      action: 'Usta mikrofiber bezi araç kaputu üzerinde dairesel hareketlerle gezdiriyor',
      environment: 'detailing stüdyosu',
      support_surface: 'araç kaputu metal yüzey',
      contact_relationship: 'kumaş panel temas sürtünmesi',
      motion_direction: 'circular glide',
      start_state: 'dry panel',
      end_state: 'deep gloss finish',
      physical_constraints: ['surface friction'],
      continuity_anchor: 'car hood',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 12. Kozmetik - Damlalığın cilde serum damlatması (SAFE)
  {
    id: 'TC-12',
    sector: 'Kozmetik',
    description: 'Cam pipetten el sırtına tek damla serum düşüşü',
    contract: {
      subject: 'cilt serumu',
      action: 'Cam damlalık el sırtına tek berrak damla bırakıyor',
      environment: 'aydınlık banyo stüdyosu',
      support_surface: 'el sırtı ten yüzeyi',
      contact_relationship: 'sıvı damlası ten üzerine temas ediyor',
      motion_direction: 'downward gravity drop',
      start_state: 'suspended drop',
      end_state: 'absorbed radiant drop',
      physical_constraints: ['surface tension', 'gravity'],
      continuity_anchor: 'hand and dropper',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 13. Lojistik - Tır kasasına rampa üzerinden forklift girişi (SAFE)
  {
    id: 'TC-13',
    sector: 'Lojistik',
    description: 'Forklift rampa üzerinden dorseye palet taşıyor',
    contract: {
      subject: 'koli paleti',
      action: 'Forklift yükleme rampası üzerinden dorse zeminine palet sürüyor',
      environment: 'lojistik aktarma merkezi',
      support_surface: 'çelik rampa ve dorse zemin',
      contact_relationship: 'tekerlekler rampa zemininde',
      motion_direction: 'forward rolling',
      start_state: 'loading bay',
      end_state: 'trailer interior',
      physical_constraints: ['ramp slope', 'tire traction'],
      continuity_anchor: 'trailer and fork',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 14. Mobilya - Masanın ayakları zemine basması (SAFE)
  {
    id: 'TC-14',
    sector: 'Mobilya',
    description: 'Ahşap masanın parke zemin üzerine yerleştirilmesi',
    contract: {
      subject: 'masif meşe masa',
      action: 'İki montaj ustası masayı parke zemin üzerine dengeli şekilde indiriyor',
      environment: 'modern salon',
      support_surface: 'parke zemin tabanı',
      contact_relationship: 'dört ahşap ayak zemine tam basıyor',
      motion_direction: 'downward slow placement',
      start_state: 'lifted table',
      end_state: 'stable four-point contact',
      physical_constraints: ['quad support equilibrium'],
      continuity_anchor: 'table',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 15. E-Ticaret - Kargo kutusunun konveyör bantta ilerlemesi (SAFE)
  {
    id: 'TC-15',
    sector: 'E-Ticaret',
    description: 'Koli bandının konveyör üzerinde pürüzsüz hareketi',
    contract: {
      subject: 'kargo kolisi',
      action: 'Bantlı konveyör koliyi barkod okuyucu altından geçiriyor',
      environment: 'otomasyon deposu',
      support_surface: 'dönen rulo konveyör bandı',
      contact_relationship: 'koli tabanı kayış üzerinde',
      motion_direction: 'linear horizontal forward',
      start_state: 'conveyor entry',
      end_state: 'scanned sorting bin',
      physical_constraints: ['belt friction'],
      continuity_anchor: 'conveyor belt',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 16. Ayakkabı - Koşu ayakkabısının zemine basması (SAFE)
  {
    id: 'TC-16',
    sector: 'Tekstil',
    description: 'Koşucunun tabanlığı zeminle buluşturması',
    contract: {
      subject: 'spor ayakkabı',
      action: 'Koşucu esnek tabanla asfalt zemine basıp yaylanıyor',
      environment: 'sabah koşu parkuru',
      support_surface: 'düz zemin asfalt',
      contact_relationship: 'kauçuk taban zemin temas sürtünmesi',
      motion_direction: 'stride impact and rebound',
      start_state: 'aerial stride',
      end_state: 'cushioned floor strike',
      physical_constraints: ['kinetic elasticity'],
      continuity_anchor: 'runner feet',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 17. Ağır Sanayi - Vinç halatının paleti taşıması (SAFE)
  {
    id: 'TC-17',
    sector: 'Ağır Sanayi',
    description: 'Tavan vinci çelik halatla kalıbı dengede taşıyor',
    contract: {
      subject: 'çelik döküm kalıbı',
      action: 'Tavan vinci sapan halatlarıyla ağır kalıbı kontrollü şekilde havada taşıyor',
      environment: 'döküm fabrikası',
      support_surface: 'çelik sapan halatları',
      contact_relationship: 'dört noktalı kanca dengesi',
      motion_direction: 'slow lateral gantry travel',
      start_state: 'hooked mold',
      end_state: 'cooling bay overhead',
      physical_constraints: ['tensile cable limits'],
      continuity_anchor: 'crane hook',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  },
  // 18. Restaurant - Garsonun tepsiyi taşıması (SAFE)
  {
    id: 'TC-18',
    sector: 'Restoran',
    description: 'Garson tepsiyi omuz hizasında taşıyarak masaya yaklaşıyor',
    contract: {
      subject: 'servis tepsisi',
      action: 'Garson tepsiyi el ayasıyla dengede tutarak masaya doğru yürüyor',
      environment: 'restoran salonu',
      support_surface: 'garson avuç içi',
      contact_relationship: 'tepsi tabanı avuç içi dengesi',
      motion_direction: 'forward walking glide',
      start_state: 'kitchen exit',
      end_state: 'table arrival',
      physical_constraints: ['center of mass'],
      continuity_anchor: 'waiter and tray',
    },
    expectedRisk: 'LOW',
    expectedValid: true,
  }
]

test('18-Sector Physical Contract Matrix Validation', () => {
  let passedCount = 0
  let truePositives = 0 // correctly caught high risk
  let trueNegatives = 0 // correctly passed safe cases
  let falsePositives = 0 // safe cases incorrectly flagged high
  let falseNegatives = 0 // bad cases incorrectly passed

  for (const tc of testCases) {
    const result = PhysicsPreFlightAnalyzer.evaluateContract(tc.contract)
    assert.equal(
      result.valid,
      tc.expectedValid,
      `Mismatch on ${tc.id} (${tc.sector}): expected valid=${tc.expectedValid}, got ${result.valid}`
    )

    if (!tc.expectedValid && !result.valid) truePositives++
    if (tc.expectedValid && result.valid) trueNegatives++
    if (tc.expectedValid && !result.valid) falsePositives++
    if (!tc.expectedValid && result.valid) falseNegatives++
    passedCount++
  }

  assert.equal(passedCount, 18)
  assert.equal(falsePositives, 0, 'Must have zero false positives on safe commercials')
  assert.equal(falseNegatives, 0, 'Must catch all designated physical impossibilities')
})
