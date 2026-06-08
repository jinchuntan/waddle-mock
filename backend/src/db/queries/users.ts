import { pool as db } from '../client.js'

export interface User {
  id: string
  googleId: string
  email: string
  name: string | null
  avatarUrl: string | null
  createdAt: string
}

interface UpsertUserParams {
  googleId: string
  email: string
  name: string | null
  avatarUrl: string | null
}

export async function upsertUser(params: UpsertUserParams): Promise<User> {
  const { googleId, email, name, avatarUrl } = params
  const { rows } = await db.query<User>(
    `INSERT INTO users (google_id, email, name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id) DO UPDATE
       SET email      = EXCLUDED.email,
           name       = EXCLUDED.name,
           avatar_url = EXCLUDED.avatar_url
     RETURNING id, google_id AS "googleId", email, name, avatar_url AS "avatarUrl", created_at AS "createdAt"`,
    [googleId, email, name, avatarUrl],
  )
  return rows[0]
}

export async function getUserById(id: string): Promise<User | null> {
  const { rows } = await db.query<User>(
    `SELECT id, google_id AS "googleId", email, name, avatar_url AS "avatarUrl", created_at AS "createdAt"
     FROM users WHERE id = $1`,
    [id],
  )
  return rows[0] ?? null
}
