const gwUrl = process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456'

async function check() {
  console.log(`Checking gateway at: ${gwUrl}`)
  
  try {
    const res = await fetch(`${gwUrl}/health`)
    console.log('/health status:', res.status)
    const text = await res.text()
    console.log('/health text:', text)
  } catch (e) {
    console.error('/health error:', e.message)
  }

  try {
    const res = await fetch(`${gwUrl}/v1/models`)
    console.log('/v1/models status:', res.status)
    const json = await res.json()
    console.log('/v1/models:', JSON.stringify(json, null, 2))
  } catch (e) {
    console.log('/v1/models error:', e.message)
  }
}

check().catch(console.error)
