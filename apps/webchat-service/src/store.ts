export type ThreadMessage = {
  id: string
  text: string
  senderId: string
  direction: 'inbound' | 'outbound'
  at: string
}

const threads = new Map<string, ThreadMessage[]>()

export function getThread(threadId: string): ThreadMessage[] {
  return [...(threads.get(threadId) ?? [])]
}

export function append(threadId: string, message: ThreadMessage): void {
  const list = threads.get(threadId) ?? []
  list.push(message)
  threads.set(threadId, list)
}

export function clearThreads(): void {
  threads.clear()
}
