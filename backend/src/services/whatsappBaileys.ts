import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
  type proto,
} from '@whiskeysockets/baileys'
import { EventEmitter } from 'node:events'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import P from 'pino'
import QRCode from 'qrcode'
import type { WhatsAppConnectionStatus } from '../types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.resolve(__dirname, '../../.baileys-auth')

// Silence Baileys' internal pino logger — we surface only what matters
const silentLogger = P({ level: 'silent' })

type IncomingMessageHandler = (phone: string, text: string, messageKey: proto.IMessageKey) => void

class WhatsAppService extends EventEmitter {
  private sock: WASocket | null = null
  private status: WhatsAppConnectionStatus = 'disconnected'
  private qrDataUrl: string | null = null
  private messageHandlers: IncomingMessageHandler[] = []
  private reconnecting = false
  private generation = 0 // incremented each initialize() so stale handlers self-discard

  async initialize(): Promise<void> {
    if (this.reconnecting) return
    this.reconnecting = true
    this.status = 'connecting'
    this.sock = null
    const gen = ++this.generation

    try {
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

      // fetchLatestBaileysVersion() calls GitHub — fall back to bundled version if it fails
      const versionResult = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }))

      this.sock = makeWASocket({
        ...(versionResult.version ? { version: versionResult.version } : {}),
        auth: state,
        logger: silentLogger,
        printQRInTerminal: false,
        browser: ['Waddle', 'Desktop', '1.0.0'],
        // Marks messages as read automatically so suppliers see the blue ticks
        markOnlineOnConnect: false,
      })

      this.sock.ev.on('creds.update', saveCreds)

      this.sock.ev.on('connection.update', async (update) => {
        if (gen !== this.generation) return // superseded by a newer initialize()
        const { connection, lastDisconnect, qr } = update

        if (qr) {
          this.qrDataUrl = await QRCode.toDataURL(qr)
          this.status = 'qr_ready'
          this.emit('qr', this.qrDataUrl)
          console.log('[whatsapp] QR ready — scan in the Waddle UI')
        }

        if (connection === 'open') {
          this.status = 'connected'
          this.qrDataUrl = null
          this.reconnecting = false
          console.log('[whatsapp] connected')
          this.emit('connected')
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })
            ?.output?.statusCode
          const loggedOut = statusCode === DisconnectReason.loggedOut

          this.status = 'disconnected'
          this.reconnecting = false
          this.emit('disconnected', loggedOut)
          console.log(`[whatsapp] disconnected — loggedOut=${loggedOut}`)

          if (loggedOut) {
            // Stale credentials — wipe them so next initialize() gets a fresh QR
            await fs.rm(AUTH_DIR, { recursive: true, force: true }).catch(() => {})
            console.log('[whatsapp] cleared stale auth state, will re-prompt for QR')
          }

          // Always retry so the user can re-scan
          await new Promise(r => setTimeout(r, 3_000))
          await this.initialize()
        }
      })

      this.sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (gen !== this.generation) return
        if (type !== 'notify') return

        for (const msg of messages) {
          if (msg.key.fromMe) continue
          if (!msg.message) continue

          const jid = msg.key.remoteJid
          if (!jid || !jid.endsWith('@s.whatsapp.net')) continue // groups ignored

          const text      = extractText(msg.message)
          const mediaType = extractMediaType(msg.message)

          // Silently drop stickers — no meaningful response possible
          if (!text && !mediaType) continue
          if (mediaType === 'sticker') continue

          const effectiveText = text ?? `[${mediaType} received — please respond in text so I can continue the negotiation]`
          const phone = jid.replace('@s.whatsapp.net', '')
          for (const handler of this.messageHandlers) {
            handler(phone, effectiveText, msg.key)
          }
        }
      })
    } catch (err) {
      this.reconnecting = false
      console.error('[whatsapp] initialization error — retrying in 5s:', err)
      // Retry after backoff so a transient failure (e.g. network blip) self-heals
      setTimeout(() => {
        this.initialize().catch(e => console.error('[whatsapp] retry error:', e))
      }, 5_000)
    }
  }

  async sendMessage(to: string, text: string): Promise<void> {
    if (!this.sock || this.status !== 'connected') {
      throw new Error('WhatsApp is not connected')
    }
    const jid = normaliseJid(to)
    await this.sock.sendMessage(jid, { text })
  }

  // Shows "typing..." in the recipient's chat for the given duration,
  // then resolves — call this right before sendMessage
  async sendTypingIndicator(to: string, durationMs: number): Promise<void> {
    if (!this.sock || this.status !== 'connected') return
    const jid = normaliseJid(to)
    await this.sock.sendPresenceUpdate('composing', jid)
    await new Promise(r => setTimeout(r, durationMs))
    await this.sock.sendPresenceUpdate('paused', jid)
  }

  async markAsRead(to: string, messageKey: proto.IMessageKey): Promise<void> {
    if (!this.sock || this.status !== 'connected') return
    try {
      await this.sock.readMessages([messageKey])
    } catch {
      // Non-fatal — best effort
    }
  }

  onMessage(handler: IncomingMessageHandler): void {
    this.messageHandlers.push(handler)
  }

  getStatus(): WhatsAppConnectionStatus {
    return this.status
  }

  getQR(): string | null {
    return this.qrDataUrl
  }
}

function normaliseJid(phone: string): string {
  return phone.replace(/\D/g, '') + '@s.whatsapp.net'
}

function extractText(message: proto.IMessage): string | null {
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    null
  )
}

function extractMediaType(message: proto.IMessage): string | null {
  if (message.imageMessage)    return 'image'
  if (message.documentMessage) return 'document'
  if (message.audioMessage)    return 'voice note'
  if (message.videoMessage)    return 'video'
  if (message.stickerMessage)  return 'sticker'
  return null
}

export const whatsAppService = new WhatsAppService()
