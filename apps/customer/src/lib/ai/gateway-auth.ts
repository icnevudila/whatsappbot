/** Only for requests to the configured internal Gateway; never external media URLs. */
export function gatewayAuthHeaders(): Record<string, string> {
  const token = (process.env.OMNISTUDIO_GATEWAY_TOKEN || process.env.CHATGPT_API_KEY || '').trim()
  return token && token !== 'none' ? { Authorization: `Bearer ${token}` } : {}
}
