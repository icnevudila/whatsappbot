import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateAuthoritativeEta } from './eta-calculator'

const measured = {historicalDurationsSeconds:Array.from({length:20},(_,i)=>100+i),
  activeWorkerCapacity:2,queueAheadCount:0,currentStageIndex:4,elapsedTotalSeconds:50}

test('unknown capacity or queue order cannot claim an authoritative queued ETA', () => {
  for (const changed of [{activeWorkerCapacity:0},{queueAheadCount:null}]) {
    const result=calculateAuthoritativeEta({...measured,currentStageIndex:2,...changed})
    assert.equal(result.eta_min_seconds,null)
    assert.equal(result.eta_max_seconds,null)
    assert.equal(result.eta_confidence,'LOW')
  }
})

test('failed/review terminal states do not display completed; only ready does', () => {
  assert.equal(calculateAuthoritativeEta({...measured,isTerminal:true,currentStageIndex:6}).eta_display_text,null)
  assert.equal(calculateAuthoritativeEta({...measured,isTerminal:true,currentStageIndex:7}).eta_display_text,'Tamamlandı')
})

test('remaining range uses actual measured duration and elapsed time instead of a stage percentage', () => {
  const result=calculateAuthoritativeEta(measured)
  assert.equal(result.eta_min_seconds,60)
  assert.equal(result.eta_max_seconds,66)
  assert.equal(calculateAuthoritativeEta({...measured,elapsedTotalSeconds:150}).eta_max_seconds,null)
})

test('fewer than five measured samples cannot produce a numeric estimate', () => {
  const result=calculateAuthoritativeEta({...measured,historicalDurationsSeconds:[110,120]})
  assert.equal(result.eta_min_seconds,null)
  assert.equal(result.eta_confidence,'LOW')
})
