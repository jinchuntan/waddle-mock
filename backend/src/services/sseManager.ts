import type { Response } from 'express'
import type { SSEEventType, SSEPayload } from '../types.js'

type SendFn = (event: SSEEventType, data: unknown) => void

class SSEManager {
  // negotiationId → set of active response senders
  private clients = new Map<string, Set<SendFn>>()

  addClient(negotiationId: string, res: Response): () => void {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const send: SendFn = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    }

    if (!this.clients.has(negotiationId)) {
      this.clients.set(negotiationId, new Set())
    }
    this.clients.get(negotiationId)!.add(send)

    // Return cleanup function for the route to call on connection close
    return () => {
      this.clients.get(negotiationId)?.delete(send)
      if (this.clients.get(negotiationId)?.size === 0) {
        this.clients.delete(negotiationId)
      }
    }
  }

  emit<E extends SSEEventType>(
    negotiationId: string,
    event: E,
    data: SSEPayload[E],
  ): void {
    const senders = this.clients.get(negotiationId)
    if (!senders || senders.size === 0) return
    for (const send of senders) {
      send(event, data)
    }
  }
}

export const sseManager = new SSEManager()
