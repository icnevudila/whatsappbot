import type { UserVideoInput, ShotPlanOutput } from './schemas.js'

export function buildPhysicalActionContract(input: UserVideoInput) {
  const subject = input.products?.[0]?.name || 'canonical subject'
  const context = `${input.sectorHint || ''} ${subject} ${input.products?.[0]?.description || ''}`
  const sprayer = /ilaçlama|pülverizatör|pulverizatör|sprayer/i.test(context)
  const masonry = /tuğla|briket|kiremit|masonry|brick/i.test(context)
  return {
    actor: 'One stationary trained operator, present throughout the take', subject,
    action: sprayer ? 'Operate the reference nozzle toward nearby foliage, then release the trigger'
      : masonry ? 'Inspect the same stable canonical material with one brief hand touch, then withdraw the hand'
        : 'Indicate the same canonical product and its visible reference detail with one deliberate hand gesture',
    startState: sprayer ? 'Canonical equipment already securely supported exactly as in the reference; nozzle aimed at nearby foliage'
      : 'Canonical product already stationary on a stable suitable support; no loading or transport',
    contactSurface: sprayer ? 'Equipment support and operator grip stay fixed; spray meets nearby leaf surface'
      : 'Stable level product support remains visible and unchanged; hand contact does not move the product',
    motionDirection: sprayer ? 'Short controlled nozzle arc toward nearby leaves; no walking'
      : 'One hand approaches the same visible detail and retracts along the same path',
    endState: 'Same object, scale, support, person and location remain visible; action stops naturally',
    physicalConstraints: ['Gravity and contact remain continuous', 'No heavy lifting, forklift operation or unsupported loads',
      'No new parts, ingredient transformation, invented product mechanism or unsupported function'],
    continuityRequirements: ['Single continuous camera move; three pacing beats, no required scene cuts',
      'Preserve product geometry/color/material and object count; no teleporting operator or replacement packshot'],
    automatedPhysicsQA: 'NOT_IMPLEMENTED',
  }
}

/** A planning contract, never a claim that rendered physics passed. */
export function applyPhysicalActionContract(input: UserVideoInput, plan: ShotPlanOutput): ShotPlanOutput {
  const contract = buildPhysicalActionContract(input)
  const shots = plan.shots.map((shot, index) => ({ ...shot,
    subjectAction: index === 0 ? `${contract.actor}. ${contract.startState}. Begin: ${contract.action}.`
      : index === 1 ? `${contract.action}. ${contract.contactSurface}. ${contract.motionDirection}.`
        : contract.endState,
    framing: ['Medium establishing view of the already supported canonical product and operator',
      'Same uninterrupted view, smoothly approaching the active contact detail',
      'Same uninterrupted view settles on the same canonical product; operator remains present'][index],
    cameraMotion: 'One slow lateral-to-forward camera move at consistent height; no cut, dissolve or location change',
  })) as ShotPlanOutput['shots']
  const replacement = [
    `PHYSICAL ACTION CONTRACT: ${JSON.stringify(contract)}`,
    ...shots.map(shot => `SHOT ${shot.shotNumber} (${shot.timing.from}s - ${shot.timing.to}s): ${shot.framing}. ${shot.subjectAction}. ${shot.cameraMotion}.`),
    'CAMERA MOVEMENT: continuous_take; three pacing beats within ONE continuous action, not three disconnected scenes.',
  ].join('\n')
  const prompt = plan.veoEnglishPrompt
    .replace(/^SHOT [123].*$/gm, '')
    .replace(/^HERO BRAND FIDELITY.*$/gm, '')
    .replace(/^CAMERA MOVEMENT:.*$/m, replacement)
  return { ...plan, cameraMode: 'continuous_take', shots, veoEnglishPrompt: prompt,
    reasonCode: 'V3_SINGLE_PHYSICAL_ACTION_PREFLIGHT_NOT_RENDER_QA' }
}
