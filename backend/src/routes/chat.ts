import { Router } from 'express'
import type { Request, Response } from 'express'
import { streamProcurementChat } from '../services/searchAgent.js'
import type { ChatTurn } from '../services/searchAgent.js'

const router = Router()

interface ChatStreamBody {
  message?: string
  locationContext?: string | null
  history?: ChatTurn[]
}

// Streaming procurement chat/search. The frontend reads the response body as a
// stream and parses newline-delimited JSON (NDJSON), one object per line:
//   {"type":"text-delta","textDelta":"..."}  — incremental model output
//   {"type":"error","error":"..."}            — failure mid-stream
//   {"type":"done"}                            — stream finished
router.post('/stream', async (req: Request<object, object, ChatStreamBody>, res: Response) => {
  const { message, locationContext, history } = req.body

  if (!message?.trim()) {
    res.status(400).json({ error: 'message is required' })
    return
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no') // disable proxy buffering so deltas flush

  const write = (obj: unknown) => res.write(JSON.stringify(obj) + '\n')

  try {
    for await (const delta of streamProcurementChat({
      message: message.trim(),
      locationContext: locationContext ?? null,
      history: Array.isArray(history) ? history : [],
    })) {
      write({ type: 'text-delta', textDelta: delta })
    }
    write({ type: 'done' })
  } catch (err) {
    const errMessage = err instanceof Error ? err.message : 'Chat failed'
    console.error('[chat] stream error:', errMessage)
    // If nothing has been sent yet we can still return a clean error status.
    if (!res.headersSent) {
      res.status(500).json({ error: errMessage })
      return
    }
    write({ type: 'error', error: errMessage })
  } finally {
    res.end()
  }
})

export default router
