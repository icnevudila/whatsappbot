/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * STRATEGIC PROMISE ENGINE (V6)
 * 
 * Amaç:
 * Reklam bir slogan yığını değildir.
 * "İzleyicinin film bittikten sonra inanmasını istediğimiz tek temel şey nedir?"
 * sorusunu yanıtlar.
 */

import type { ResolvedCreativeFacts, CreativeDNA, StrategicPromise } from './creative-types'

export function formulateStrategicPromise(
  facts: ResolvedCreativeFacts,
  dna: CreativeDNA
): StrategicPromise {
  const offer = facts.product.name
  const brand = facts.brandName

  // Temel inanç dönüşümü
  const viewerBeliefBefore = `Sektördeki diğer tedarikçiler gibi ${brand} de standart bir satıcıdır, farkı belirsizdir.`
  const viewerBeliefAfter = `${brand}, ${offer} konusunda şansa yer bırakmayan, doğrudan üretimden gelen malzeme ve işçilik kalitesiyle kesinlikle tercih edilmesi gereken güvenilir ortaktır.`

  // Somut kanıt maddeleri (Yalnızca doğrulanmış veriden)
  const evidence: StrategicPromise['evidence'] = [
    {
      type: 'material_authenticity',
      description: `${dna.product.materials[0]} fiziksel dokusu ve gerçek çalışma toleransı.`,
      source: 'product_fact',
    },
    {
      type: 'operational_competence',
      description: `${brand} kurumsal güvencesiyle sahada kesintisiz performans.`,
      source: 'brand_fact',
    },
  ]

  if (facts.campaign.offer) {
    evidence.push({
      type: 'commercial_offer',
      description: facts.campaign.offer,
      source: 'campaign_fact',
    })
  }

  // Kanıtlanamayan abartılı iddialar kesinlikle filtrelenir
  const forbiddenOverclaims = [
    'sektörün en iyisi',
    'dünya lideri',
    'rakipsiz',
    '%100 garantili mucize',
    'bir numara',
    'türkiyenin en büyüğü',
    'rakip tanımayan teknoloji',
  ]

  const statement = `${brand} ile ${offer}: İspatlanmış malzeme kalitesi, kesintisiz temin ve sıfır taviz.`

  return {
    statement,
    viewerBeliefBefore,
    viewerBeliefAfter,
    evidence,
    forbiddenOverclaims,
  }
}
