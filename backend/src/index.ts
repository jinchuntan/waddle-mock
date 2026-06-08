import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import session from 'express-session'
import passport from 'passport'
import path from 'path'
import { fileURLToPath } from 'url'
import { runMigrations } from './db/migrate.js'
import { whatsAppService } from './services/whatsappBaileys.js'
import { queueManager } from './services/queueManager.js'
import negotiateRouter from './routes/negotiate.js'
import whatsappRouter from './routes/whatsapp.js'
import sessionsRouter from './routes/sessions.js'
import emailRouter from './routes/email.js'
import authRouter from './routes/auth.js'
import waddleForMeRouter from './routes/waddleForMe.js'

const app = express()
app.set('trust proxy', 1) // Railway (and other PaaS) terminate TLS at the proxy
const PORT = Number(process.env.PORT ?? 3001)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist')

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(session({
  secret: process.env.SESSION_SECRET ?? 'waddle-session-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 5 * 60 * 1000 }, // 5 min — only for OAuth handshake
}))
app.use(passport.initialize())
app.use(passport.session())

app.use('/api/auth', authRouter)
app.use('/api/sessions', sessionsRouter)
app.use('/api/email', emailRouter)
app.use('/api/negotiate', negotiateRouter)
app.use('/api/whatsapp', whatsappRouter)
app.use('/api/waddle-for-me', waddleForMeRouter)

app.use(express.static(FRONTEND_DIST))
app.get('*', (_req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'))
})

async function start(): Promise<void> {
  // 1. Run any pending DB migrations before anything else
  await runMigrations()
  console.log('[db] migrations up to date')

  // 2. Start HTTP server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Waddle backend → http://0.0.0.0:${PORT}`)
  })

  // 3. Initialise WhatsApp — non-fatal so a Baileys error never takes the HTTP server down
  whatsAppService.onMessage((phone, text) => {
    queueManager.onIncomingReply(phone, text, new Date().toISOString()).catch(err => {
      console.error('[server] incoming message error:', err)
    })
  })

  whatsAppService.initialize()
    .then(() => console.log('[whatsapp] initialising...'))
    .catch(err => console.error('[whatsapp] startup error (non-fatal):', err))

  // 4. Recover any negotiations that were mid-flight before the last restart
  await queueManager.recover()
}

start().catch(err => {
  console.error('[server] fatal startup error:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandled rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('[process] uncaught exception:', err)
})
