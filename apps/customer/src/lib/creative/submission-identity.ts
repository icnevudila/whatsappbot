type IdentityRecord = { fingerprint: string; id: string }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

/** Retain the same identity after a lost response; a changed draft starts a new request. */
export function resolveSubmissionIdentity(input: {
  fingerprint: string; storageKey: string; storage: StorageLike | null;
  previous: IdentityRecord | null; createId: () => string;
}): IdentityRecord {
  if (input.previous?.fingerprint === input.fingerprint) return input.previous
  try {
    const saved = JSON.parse(input.storage?.getItem(input.storageKey) || 'null')
    if (saved?.fingerprint === input.fingerprint && typeof saved.id === 'string' &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(saved.id)) return saved
  } catch { /* storage can be unavailable; caller retains the in-memory identity */ }
  const record = { fingerprint: input.fingerprint, id: input.createId() }
  try { input.storage?.setItem(input.storageKey, JSON.stringify(record)) } catch { /* preserve in memory */ }
  return record
}
