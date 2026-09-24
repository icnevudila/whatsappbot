import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { getControlPlaneSnapshot } from '@/lib/control-plane/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const encoder = new TextEncoder()

export async function GET(request: Request) {
  if (!(await checkIsAuthenticated())) {
    return new Response('Yetkisiz erişim', { status: 401 })
  }

  let timer: ReturnType<typeof setInterval> | null = null
  let closeTimer: ReturnType<typeof setTimeout> | null = null
  let lastEventId = new URL(request.url).searchParams.get('after') || ''

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const snapshot = await getControlPlaneSnapshot()
          const unseen = snapshot.events
            .filter(event => !lastEventId || event.id !== lastEventId)
            .slice(0, lastEventId ? 30 : 60)
          if (snapshot.events[0]) lastEventId = snapshot.events[0].id
          controller.enqueue(encoder.encode(`event: operations\ndata: ${JSON.stringify({ events: unseen, overview: snapshot.overview, generatedAt: snapshot.generatedAt })}\n\n`))
        } catch (error) {
          controller.enqueue(encoder.encode(`event: degraded\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : 'Akış yenilenemedi' })}\n\n`))
        }
      }

      await send()
      timer = setInterval(send, 5_000)
      closeTimer = setTimeout(() => controller.close(), 55_000)
    },
    cancel() {
      if (timer) clearInterval(timer)
      if (closeTimer) clearTimeout(closeTimer)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
