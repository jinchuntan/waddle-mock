import { randomUUID } from 'node:crypto'
import { pool } from '../client.js'
import type { Session, SessionMessage } from '../../types.js'

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row.id as string,
    title: row.title as string,
    threadId: row.thread_id as string,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
    messageCount: row.message_count !== undefined ? Number(row.message_count) : undefined,
    negotiationCount: row.negotiation_count !== undefined ? Number(row.negotiation_count) : undefined,
  }
}

function rowToSessionMessage(row: Record<string, unknown>): SessionMessage {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    role: row.role as SessionMessage['role'],
    content: row.content as string,
    createdAt: (row.created_at as Date).toISOString(),
  }
}

export async function createSession(title: string, threadId: string, userId?: string): Promise<Session> {
  const id = randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO sessions (id, title, thread_id, user_id) VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, title, threadId, userId ?? null],
  )
  return rowToSession(rows[0])
}

export async function getSessions(userId?: string): Promise<Session[]> {
  const { rows } = await pool.query(`
    SELECT
      s.*,
      COUNT(DISTINCT sm.id)::int  AS message_count,
      COUNT(DISTINCT n.id)::int   AS negotiation_count
    FROM sessions s
    LEFT JOIN session_messages sm ON sm.session_id = s.id
    LEFT JOIN negotiations      n  ON n.session_id  = s.id
    WHERE s.user_id = $1
    GROUP BY s.id
    ORDER BY s.updated_at DESC
  `, [userId ?? null])
  return rows.map(rowToSession)
}

export async function getSession(
  id: string,
  userId?: string,
): Promise<{ session: Session; messages: SessionMessage[] } | null> {
  const { rows: sessionRows } = await pool.query(
    'SELECT * FROM sessions WHERE id = $1 AND user_id = $2',
    [id, userId ?? null],
  )
  if (sessionRows.length === 0) return null

  const { rows: msgRows } = await pool.query(
    'SELECT * FROM session_messages WHERE session_id = $1 ORDER BY created_at ASC',
    [id],
  )
  return {
    session: rowToSession(sessionRows[0]),
    messages: msgRows.map(rowToSessionMessage),
  }
}

export async function appendSessionMessage(
  sessionId: string,
  role: SessionMessage['role'],
  content: string,
): Promise<SessionMessage> {
  const id = randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO session_messages (id, session_id, role, content) VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, sessionId, role, content],
  )
  await pool.query('UPDATE sessions SET updated_at = NOW() WHERE id = $1', [sessionId])
  return rowToSessionMessage(rows[0])
}

export async function deleteSession(id: string, userId?: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE id = $1 AND user_id = $2', [id, userId ?? null])
}
