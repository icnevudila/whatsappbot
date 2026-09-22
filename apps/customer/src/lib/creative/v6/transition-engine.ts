/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * SEMANTIC TRANSITION ENGINE (V6)
 * 
 * Kesin İlke:
 * Geçişler (Transitions) rastgele video efektleri değildir.
 * İki sahne arasındaki organik anlamsal, geometrik veya eylemsel bağı (Match Cut, Motion Match, Action Cut) bulur.
 */

import type { SceneContractV2 } from './creative-types'

export interface TransitionDescriptor {
  fromSceneId: string
  toSceneId: string
  technique: 'cut' | 'match_cut' | 'motion_match' | 'object_wipe' | 'occlusion' | 'sound_bridge' | 'action_cut'
  semanticReason: string
  matchAnchor: string
}

export function planSemanticTransitions(scenes: SceneContractV2[]): TransitionDescriptor[] {
  if (!scenes || scenes.length <= 1) return []

  const transitions: TransitionDescriptor[] = []

  for (let i = 0; i < scenes.length - 1; i++) {
    const from = scenes[i]
    const to = scenes[i + 1]

    let technique: TransitionDescriptor['technique'] = 'cut'
    let matchAnchor = 'continuous visual flow'
    let semanticReason = 'Doğal anlatı geçişi'

    // 1. Hareket Eşleşmesi (Motion Match): Aynı hareket yönü
    if (from.motionDirection && to.motionDirection && from.motionDirection === to.motionDirection) {
      technique = 'motion_match'
      matchAnchor = from.motionDirection
      semanticReason = `Aynı yönlü kesintisiz hareket akışı (${from.motionDirection}) ile enerji korunur.`
    }
    // 2. Eylem Kesmesi (Action Cut): Bir eylemin başlangıcından sonucuna
    else if (from.outgoingAction && to.incomingAction) {
      technique = 'action_cut'
      matchAnchor = 'human/mechanical action continuity'
      semanticReason = 'Birinci sahnedeki eylemin fiziksel ivmesi doğrudan ikinci sahneye bağlanır.'
    }
    // 3. Şekil / Geometri Eşleşmesi (Match Cut): Malzeme veya nesne benzerliği
    else if (from.visualMotif && to.visualMotif && from.visualMotif === to.visualMotif) {
      technique = 'match_cut'
      matchAnchor = from.visualMotif
      semanticReason = `Geometrik form ve malzeme motifi (${from.visualMotif}) kesme anında korunur.`
    }
    // 4. Ses Köprüsü (Sound Bridge)
    else if (from.naturalAudio && to.naturalAudio) {
      technique = 'sound_bridge'
      matchAnchor = from.naturalAudio[0] || 'ambient foley'
      semanticReason = 'Görüntü kesilmeden önce ses akışı sonraki mekana taşarak devamlılık sağlar.'
    }

    transitions.push({
      fromSceneId: from.sceneId,
      toSceneId: to.sceneId,
      technique,
      semanticReason,
      matchAnchor,
    })
  }

  return transitions
}
