/** A single scheduler instance never runs two asynchronous ticks concurrently. */
export function createNonOverlappingTick(task: () => Promise<void>, onError: (error: unknown) => void) {
  let running = false
  return async (): Promise<void> => {
    if (running) return
    running = true
    try {
      await task()
    } catch (error) {
      onError(error)
    } finally {
      running = false
    }
  }
}
