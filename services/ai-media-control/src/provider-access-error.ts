/** A project creation failure alone is not evidence of an authentication failure. */
export function requiresProviderAccess(message: string): boolean {
  return /FLOW_AUTH_REQUIRED|AUTH_REQUIRED|FlowAccountChooserError|AuthExpiredError/.test(message) ||
    (/PROJECT_CREATION_FAILED/.test(message) && /Flow redirected to its public landing page/.test(message))
}
