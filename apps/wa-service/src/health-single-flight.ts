/** Concurrent probes share one database/session check; no stale success cache. */
export function singleFlight<T>(run: () => Promise<T>): () => Promise<T> {
  let active: Promise<T> | undefined
  return () => {
    if (!active) {
      active = Promise.resolve().then(run).finally(() => { active = undefined })
    }
    return active
  }
}
