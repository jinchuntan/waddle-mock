import { Router } from 'express'
import type { Request, Response } from 'express'
import { whatsAppService } from '../services/whatsappBaileys.js'

const router = Router()

// Returns the current WhatsApp connection status
router.get('/status', (_req: Request, res: Response) => {
  res.json({ status: whatsAppService.getStatus() })
})

// Returns the current QR code as a base64 data URL, or null if not in QR state
router.get('/qr', (_req: Request, res: Response) => {
  const qr = whatsAppService.getQR()
  if (!qr) {
    res.status(404).json({ error: 'No QR code available — WhatsApp may already be connected or still initialising' })
    return
  }
  res.json({ qr })
})

// Scannable QR page — open in browser, scan with WhatsApp, refreshes automatically
router.get('/qr-page', (_req: Request, res: Response) => {
  const status = whatsAppService.getStatus()
  const qr = whatsAppService.getQR()

  if (status === 'connected') {
    res.send(`<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4">
      <div style="text-align:center">
        <div style="font-size:48px">✅</div>
        <h2 style="color:#166534">WhatsApp Connected</h2>
        <p style="color:#15803d">You can close this tab.</p>
      </div>
    </body></html>`)
    return
  }

  if (!qr) {
    res.send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="2"></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
      <div style="text-align:center">
        <div style="font-size:48px">⏳</div>
        <h2>Generating QR code...</h2>
        <p style="color:#64748b">This page refreshes automatically.</p>
      </div>
    </body></html>`)
    return
  }

  res.send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="30"></head>
    <body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc">
      <div style="text-align:center">
        <h2 style="color:#1a3a52;margin-bottom:4px">Connect WhatsApp to Waddle</h2>
        <p style="color:#64748b;margin-bottom:20px">Open WhatsApp → Linked Devices → Link a Device → scan this code</p>
        <img src="${qr}" style="width:260px;height:260px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.12)" />
        <p style="color:#94a3b8;font-size:13px;margin-top:16px">QR expires in ~60s — page auto-refreshes every 30s</p>
      </div>
    </body></html>`)
})

export default router
