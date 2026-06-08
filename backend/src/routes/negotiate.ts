import { Router } from 'express'
import type { Request, Response } from 'express'
import { createNegotiation, getNegotiation } from '../db/queries/negotiations.js'
import { appendMessage } from '../db/queries/messages.js'
import { queueManager } from '../services/queueManager.js'
import { sseManager } from '../services/sseManager.js'
import type { StartNegotiateBody } from '../types.js'

const router = Router()

router.post('/start', async (req: Request<object, object, StartNegotiateBody>, res: Response) => {
  const { supplier, phone, product, quantity, targetPrice, sessionId } = req.body

  if (!phone?.trim()) {
    res.status(400).json({ error: 'Supplier phone number is required' })
    return
  }
  if (!supplier?.trim() || !product?.trim() || !quantity?.trim() || !targetPrice?.trim()) {
    res.status(400).json({ error: 'All fields are required' })
    return
  }

  try {
    const negotiation = await createNegotiation({
      supplier: supplier.trim(),
      phone: phone.trim(),
      product: product.trim(),
      quantity: quantity.trim(),
      targetPrice: targetPrice.trim(),
      sessionId: sessionId?.trim() || undefined,
    })

    // Enqueue — the queue manager handles the opening message and all turns
    await queueManager.enqueue(negotiation.id)

    res.json({ id: negotiation.id, status: 'sent' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
})

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const negotiation = await getNegotiation(req.params.id)
    if (!negotiation) {
      res.status(404).json({ error: 'Negotiation not found' })
      return
    }
    res.json(negotiation)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch negotiation'
    res.status(500).json({ error: message })
  }
})

// Server-Sent Events stream — frontend subscribes for real-time updates
router.get('/:id/events', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const negotiation = await getNegotiation(req.params.id)
    if (!negotiation) {
      res.status(404).json({ error: 'Negotiation not found' })
      return
    }

    const cleanup = sseManager.addClient(req.params.id, res)

    // Send current state immediately so the client is in sync on connect
    res.write(`event: status\ndata: ${JSON.stringify({ status: negotiation.status })}\n\n`)
    for (const msg of negotiation.messages) {
      res.write(`event: message\ndata: ${JSON.stringify(msg)}\n\n`)
    }

    req.on('close', cleanup)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to connect to event stream'
    res.status(500).json({ error: message })
  }
})

export default router
