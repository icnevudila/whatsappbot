import type { PhysicalActionContract, PreFlightCheckResult } from './types.js'

export class PhysicsPreFlightAnalyzer {
  public static evaluateContract(contract: PhysicalActionContract): PreFlightCheckResult {
    const risks: string[] = []
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    const suggestions: string[] = []

    const actionText = `${contract.action} ${contract.support_surface} ${contract.contact_relationship}`.toLowerCase()

    // 1. Support & Heavy Mass Check
    // Risk: Placing heavy pallet/stack onto a single fragile unit
    if (
      (actionText.includes('pallet') || actionText.includes('palet') || actionText.includes('ağır')) &&
      (actionText.includes('tek') || actionText.includes('single') || actionText.includes('individual')) &&
      (actionText.includes('üzerine') || actionText.includes('onto') || actionText.includes('indir'))
    ) {
      risks.push('HIGH_RISK_PHYSICAL_OVERLOAD: Heavy collective pallet payload scheduled onto a single fragile support item.')
      riskLevel = 'HIGH'
      suggestions.push('Lower pallet directly onto solid floor bay or into matching industrial storage rack with full contact forks.')
    }

    // 2. Forklift / Machine Disconnect & Airborne Hover
    if (
      (actionText.includes('forklift') || actionText.includes('çatal') || actionText.includes('yük')) &&
      (actionText.includes('boş hava') || actionText.includes('havada kal') || actionText.includes('havada dur') || actionText.includes('airborne'))
    ) {
      risks.push('HIGH_RISK_LEVITATION: Heavy load suspended without physical support surface.')
      riskLevel = 'HIGH'
      suggestions.push('Load must be continuously grounded or held on load-rated machinery attachment.')
    } else if (
      (actionText.includes('forklift') || actionText.includes('çatal')) &&
      (actionText.includes('bırak') || actionText.includes('pulls away') || actionText.includes('disconnect')) &&
      !actionText.includes('zemin') && !actionText.includes('ground') && !actionText.includes('rack')
    ) {
      risks.push('MEDIUM_RISK_MECHANICAL_AFFORDANCE: Machinery releases load without verifying settled ground/rack equilibrium.')
      if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM'
      suggestions.push('Keep forklift forks firmly engaging pallet till fully stationary on stable foundation.')
    }


    // 3. Fluid & Agricultural Nozzle
    if (
      (actionText.includes('ilaçlama') || actionText.includes('sprey') || actionText.includes('mist')) &&
      !actionText.includes('foliage') && !actionText.includes('yaprak') && !actionText.includes('target')
    ) {
      risks.push('MEDIUM_RISK_UNFOCUSED_DISPERSION: Fluid action lacks designated target surface.')
      if (riskLevel !== 'HIGH') riskLevel = 'MEDIUM'
      suggestions.push('Direct spray pattern onto target crop canopy or leaves with clear nozzle origin.')
    }

    // 4. Culinary / Food Spontaneous Generation
    if (
      (actionText.includes('döner') || actionText.includes('yemek') || actionText.includes('food')) &&
      (actionText.includes('kendiliğinden') || actionText.includes('appears') || actionText.includes('floating'))
    ) {
      risks.push('HIGH_RISK_SPONTANEOUS_MATTER: Food item appears without culinary utensil or chef preparation affordance.')
      riskLevel = 'HIGH'
      suggestions.push('Show chef with authentic carving knife or serving plate initiating food placement.')
    }

    return {
      valid: riskLevel !== 'HIGH',
      riskLevel,
      identifiedRisks: risks,
      suggestedActionCorrection: suggestions.length > 0 ? suggestions.join(' ') : undefined,
    }
  }
}
