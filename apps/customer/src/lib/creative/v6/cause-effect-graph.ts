/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * CAUSE / EFFECT GRAPH ENGINE (V6)
 * 
 * Kesin İlke:
 * Sahneler bağımsız güzel görüntüler toplamı değildir.
 * Her önemli sahne öncekinin sonucu ve sonrakinin sebebi olmalıdır (A causes B, B creates C).
 */

import type { StoryBeat, CauseEffectLink } from './creative-types'

export function buildCauseEffectGraph(beats: StoryBeat[]): CauseEffectLink[] {
  if (!beats || beats.length <= 1) {
    return []
  }

  const links: CauseEffectLink[] = []

  for (let i = 0; i < beats.length - 1; i++) {
    const from = beats[i]
    const to = beats[i + 1]

    let causalRelation = `${from.purpose} eylemi, doğrudan ${to.purpose} durumunu doğurur.`
    let continuityDevice: CauseEffectLink['continuityDevice'] = 'action'

    if (from.type === 'hook' && (to.type === 'product_entrance' || to.type === 'reveal')) {
      causalRelation = 'Açılıştaki fiziksel temas veya merak anı, doğrudan ürünün merkezde devreye girmesine yol açar.'
      continuityDevice = 'object'
    } else if (to.type === 'proof' || to.type === 'transformation') {
      causalRelation = 'Ürünün doğru pozisyonda çalışması, malzemedeki kusursuz dönüşümü ve işlevsel sonucu üretir.'
      continuityDevice = 'material'
    } else if (from.type === 'transformation' && to.type === 'escalation') {
      causalRelation = 'Tekil parçanın kusursuzluğu, tüm yapının veya operasyonun ölçeklenerek tamamlanmasını sağlar.'
      continuityDevice = 'shape'
    } else if (to.type === 'brand_resolution') {
      causalRelation = 'İspatlanan başarı, bu sonucun tek güvenilir kaynağı olan markanın mühürlenmesiyle sonlanır.'
      continuityDevice = 'meaning'
    }

    links.push({
      fromBeatId: from.id,
      toBeatId: to.id,
      causalRelation,
      continuityDevice,
    })
  }

  return links
}
