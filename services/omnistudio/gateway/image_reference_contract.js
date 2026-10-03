'use strict';

// Keep byte identity and semantic roles across the public API -> queue -> worker.
function normalizeImageReferences(refs, tenantId = null) {
  return refs.map((input, index) => {
    const ref = typeof input === 'string' ? { url: input.trim() } : { ...input };
    const value = ref.url || ref.data || ref.b64_json;
    if (typeof value !== 'string' || !value.trim()) throw new Error(`INVALID_REFERENCE: reference ${index + 1} is empty`);
    if (ref.org_id && tenantId && ref.org_id !== tenantId) throw new Error('INVALID_REFERENCE: tenant mismatch');
    if (ref.mimeType && !/^image\//.test(ref.mimeType)) throw new Error('INVALID_REFERENCE: unsupported MIME type');
    if (ref.sha256 && !/^[a-f0-9]{64}$/i.test(ref.sha256)) throw new Error('INVALID_REFERENCE: invalid SHA-256');
    return {
      ...(/^https?:\/\//i.test(value) ? { url: value.trim() } : { data: value.trim() }),
      ...(ref.mimeType ? { mimeType: ref.mimeType } : {}),
      ...(ref.role ? { role: ref.role } : {}),
      ...(ref.sha256 ? { sha256: ref.sha256.toLowerCase() } : {}),
      ...(ref.org_id ? { org_id: ref.org_id } : {}),
    };
  });
}

function referenceRoleInstructions(refs) {
  const roles = refs.flatMap((ref, index) => {
    if (ref.role === 'product') return [`Reference ${index + 1}: canonical PRODUCT photo; preserve its identity, geometry, materials and colors. Do not substitute another product.`];
    if (ref.role === 'logo') return [`Reference ${index + 1}: original BRAND LOGO; preserve the emblem, proportions and colors. It is not the product.`];
    if (ref.role === 'base') return [`Reference ${index + 1}: BASE image for the requested edit; preserve everything not explicitly changed by the brief.`];
    return [];
  });
  return roles.length ? '\n\n[REFERENCE ROLES]\n' + roles.join('\n') : '';
}

function assertReferenceCount(expected, actual) {
  if (!Number.isInteger(expected) || expected < 0 || expected > 4 || expected !== actual) {
    throw new Error('REFERENCE_ATTACHMENT_FAILED: expected and actual reference counts differ');
  }
}

module.exports = { normalizeImageReferences, referenceRoleInstructions, assertReferenceCount };
