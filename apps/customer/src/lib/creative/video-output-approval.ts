/** Technical validation and editorial approval are separate, mandatory gates. */
export function isApprovedVideoOutput(output: { verified?: unknown; is_approved?: unknown }): boolean {
  return output.verified === true && output.is_approved === true
}
