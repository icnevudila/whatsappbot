import test from 'node:test'
import assert from 'node:assert/strict'
import { videoFailureUserMessage } from './job-failure-message'

test('real materialization failure does not disclose internal source or tenant to customer', () => {
  const text = videoFailureUserMessage("[MATERIALIZE_FAILED] tenant 'private-org' source '/shared/secret/path'")
  assert.match(text, /Logo veya ürün/)
  assert.doesNotMatch(text, /private-org|\/shared|MATERIALIZE_FAILED/)
  assert.equal(videoFailureUserMessage(text), text, 'API-safe message remains actionable when the client maps it again')
})
test('unknown provider exception is never rendered verbatim', () => {
  assert.doesNotMatch(videoFailureUserMessage('provider says Bearer PRIVATE_CREDENTIAL'), /PRIVATE_CREDENTIAL|Bearer/)
})
test('identical product/logo gives actionable Turkish message', () => {
  assert.match(videoFailureUserMessage('PRODUCT_REFERENCE_IS_LOGO'), /Gerçek ürün veya arayüz/)
})
