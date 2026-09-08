export type StoredEvent = Record<string, unknown> & {
  id?: string
  at?: string
}

export class InMemoryEventStore {
  private events: StoredEvent[] = []

  append(event: StoredEvent): void {
    this.events.push(event)
  }

  list(limit = 100): StoredEvent[] {
    if (limit <= 0) return []
    return this.events.slice(-limit)
  }

  clear(): void {
    this.events = []
  }
}
