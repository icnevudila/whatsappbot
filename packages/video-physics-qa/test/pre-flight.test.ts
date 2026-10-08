import test from 'node:test'
import assert from 'node:assert/strict'
import { PhysicsPreFlightAnalyzer } from '../src/physics-pre-flight.js'
import type { PhysicalActionContract } from '../src/types.js'

test('PhysicsPreFlightAnalyzer: flags heavy pallet onto single brick as HIGH_RISK', () => {
  const badContract: PhysicalActionContract = {
    subject: 'tuğla 2',
    action: 'Forklift ağır palet yükünü tek tuğla üzerine indiriyor',
    environment: 'construction yard',
    support_surface: 'tek dik duran tuğla',
    contact_relationship: 'palet ahşap tabanı tek tuğlanın üzerine biniyor',
    motion_direction: 'downward vertical',
    start_state: 'airborne pallet',
    end_state: 'resting on single brick',
    physical_constraints: ['weight capacity', 'equilibrium'],
    continuity_anchor: 'hero brick',
  }

  const result = PhysicsPreFlightAnalyzer.evaluateContract(badContract)
  assert.equal(result.valid, false)
  assert.equal(result.riskLevel, 'HIGH')
  assert.ok(result.identifiedRisks.some(r => r.includes('HIGH_RISK_PHYSICAL_OVERLOAD')))
  assert.ok(result.suggestedActionCorrection)
})

test('PhysicsPreFlightAnalyzer: approves realistic ground pallet placement', () => {
  const safeContract: PhysicalActionContract = {
    subject: 'tuğla 2',
    action: 'Forklift ahşap paleti güvenli zemin istif alanına yerleştiriyor',
    environment: 'construction yard',
    support_surface: 'düz zemin zemin',
    contact_relationship: 'çatallar paleti zemine bırakana kadar destekliyor',
    motion_direction: 'controlled forward downward',
    start_state: 'forklift forks engaging',
    end_state: 'ground stationary pallet',
    physical_constraints: ['ground load capacity'],
    continuity_anchor: 'hero pallet',
  }

  const result = PhysicsPreFlightAnalyzer.evaluateContract(safeContract)
  assert.equal(result.valid, true)
  assert.equal(result.riskLevel, 'LOW')
  assert.equal(result.identifiedRisks.length, 0)
})

test('PhysicsPreFlightAnalyzer: handles agricultural spraying correctly', () => {
  const agriContract: PhysicalActionContract = {
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
  }

  const result = PhysicsPreFlightAnalyzer.evaluateContract(agriContract)
  assert.equal(result.valid, true)
  assert.equal(result.riskLevel, 'LOW')
})
