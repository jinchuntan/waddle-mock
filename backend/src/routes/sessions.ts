import { Router } from 'express'
import type { Request, Response } from 'express'
import {
  createSession,
  getSessions,
  getSession,
  appendSessionMessage,
  deleteSession,
} from '../db/queries/sessions.js'
import { optionalAuth } from '../middleware/auth.js'
import type { SessionMessage } from '../types.js'

const router = Router()

router.use(optionalAuth)

router.get('/', async (req: Request, res: Response) => {
  try {
    const sessions = await getSessions(req.user?.id)
    res.json(sessions)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load sessions'
    res.status(500).json({ error: message })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const { title, threadId } = req.body
  if (!title?.trim() || !threadId?.trim()) {
    res.status(400).json({ error: 'title and threadId are required' })
    return
  }
  try {
    const session = await createSession(title.trim(), threadId.trim(), req.user?.id)
    res.json(session)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create session'
    res.status(500).json({ error: message })
  }
})

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const result = await getSession(req.params.id, req.user?.id)
    if (!result) {
      res.status(404).json({ error: 'Session not found' })
      return
    }
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load session'
    res.status(500).json({ error: message })
  }
})

router.post('/:id/messages', async (req: Request<{ id: string }>, res: Response) => {
  const { role, content } = req.body as { role: SessionMessage['role']; content: string }
  if (!role || !content) {
    res.status(400).json({ error: 'role and content are required' })
    return
  }
  try {
    const msg = await appendSessionMessage(req.params.id, role, content)
    res.json(msg)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save message'
    res.status(500).json({ error: message })
  }
})

router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await deleteSession(req.params.id, req.user?.id)
    res.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete session'
    res.status(500).json({ error: message })
  }
})

export default router
