import { Router } from 'express'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import jwt from 'jsonwebtoken'
import { upsertUser, getUserById } from '../db/queries/users.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function normaliseUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `https://${url}`
}
const BACKEND_URL  = normaliseUrl(process.env.BACKEND_URL  ?? 'http://localhost:3001')
const FRONTEND_URL = normaliseUrl(process.env.FRONTEND_URL ?? 'http://localhost:5173')

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:  `${BACKEND_URL}/api/auth/google/callback`,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const user = await upsertUser({
          googleId:  profile.id,
          email:     profile.emails?.[0]?.value ?? '',
          name:      profile.displayName ?? null,
          avatarUrl: profile.photos?.[0]?.value ?? null,
        })
        done(null, user)
      } catch (err) {
        done(err as Error)
      }
    },
  ),
)

// Serialize/deserialize only used for the OAuth redirect phase
passport.serializeUser((user: any, done) => done(null, user.id))
passport.deserializeUser(async (id: string, done) => {
  try { done(null, await getUserById(id)) }
  catch (err) { done(err) }
})

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: true }),
)

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}?error=auth_failed`, session: true }),
  (req, res) => {
    const user = req.user as any
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' },
    )
    res.redirect(`${FRONTEND_URL}/app?token=${encodeURIComponent(token)}`)
  },
)

router.get('/me', requireAuth, (req, res) => {
  const { id, email, name, avatarUrl } = req.user!
  res.json({ id, email, name, avatar: avatarUrl })
})

export default router
