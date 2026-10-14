import test from 'node:test'
import assert from 'node:assert/strict'
import { selectVisualDiversityPlan, visualDiversityDirective, type VisualDiversityPlan } from './visual-diversity'

test('software composition rotation preserves screenshot presentation across all families', () => {
  const recent: VisualDiversityPlan[] = []
  for (let index = 0; index < 5; index++) {
    const plan = selectVisualDiversityPlan({ requestKey: `software-${index}`, subject: 'software', recent })
    assert.ok(plan)
    assert.ok(!recent.some(previous => previous.family === plan.family))
    const directive = visualDiversityDirective(plan)
    assert.match(directive, /original.*aspect ratio/)
    assert.match(directive, /Do not stretch a portrait screenshot into a widescreen laptop/)
    assert.match(directive, /explicit user design request takes precedence/)
    assert.doesNotMatch(plan.composition, /Bold angled device|floating frosted-glass|volumetric lighting/)
    recent.push(plan)
  }
  assert.equal(new Set(recent.map(plan => plan.family)).size, 5)
})

test('enhancement and copy revision preserve the chosen scene', () => {
  const parent = selectVisualDiversityPlan({ requestKey: 'chosen-scene', subject: 'software' })!
  const enhanced = selectVisualDiversityPlan({ requestKey: 'enhance', subject: 'software', parent, variationMode: 'enhance' })!
  assert.equal(enhanced.family, parent.family)
  assert.equal(enhanced.composition, parent.composition)
  assert.equal(enhanced.enhancement, true)
  assert.equal(selectVisualDiversityPlan({ requestKey: 'revision', subject: 'software', parent, generationType: 'revision' }), parent)
})
