import { Router } from 'express'
import type { Request, Response } from 'express'
import { generateEmailDraft } from '../services/emailAgent.js'
import { sendEmail } from '../services/emailService.js'

const router = Router()

// Generate an AI email draft — user reviews before sending
router.post('/preview', async (req: Request, res: Response) => {
  const { supplierName, supplierEmail, product, quantity, targetPrice, senderName } = req.body

  if (!supplierName?.trim() || !supplierEmail?.trim() || !product?.trim() ||
      !quantity?.trim() || !targetPrice?.trim() || !senderName?.trim()) {
    res.status(400).json({ error: 'All fields are required' })
    return
  }

  try {
    const draft = await generateEmailDraft({
      supplierName: supplierName.trim(),
      supplierEmail: supplierEmail.trim(),
      product: product.trim(),
      quantity: quantity.trim(),
      targetPrice: targetPrice.trim(),
      senderName: senderName.trim(),
    })
    res.json(draft)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate draft'
    res.status(500).json({ error: message })
  }
})

// Send the confirmed email
router.post('/send', async (req: Request, res: Response) => {
  const { to, subject, body } = req.body

  if (!to?.trim() || !subject?.trim() || !body?.trim()) {
    res.status(400).json({ error: 'to, subject, and body are required' })
    return
  }

  try {
    await sendEmail({ to: to.trim(), subject: subject.trim(), body: body.trim() })
    res.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email'
    res.status(500).json({ error: message })
  }
})

export default router
