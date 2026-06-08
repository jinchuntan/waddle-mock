import { pool } from '../client.js'
import type { ConversationMessage } from '../../types.js'

function rowToMessage(row: Record<string, unknown>): ConversationMessage {
  return {
    role: row.role as 'agent' | 'supplier',
    text: row.body as string,
    timestamp: (row.sent_at as Date).toISOString(),
  }
}

export async function appendMessage(
  negotiationId: string,
  message: ConversationMessage,
): Promise<ConversationMessage> {
  const { rows } = await pool.query(
    `INSERT INTO messages (negotiation_id, role, body, sent_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [negotiationId, message.role, message.text, new Date(message.timestamp)],
  )
  return rowToMessage(rows[0])
}

export async function getMessages(negotiationId: string): Promise<ConversationMessage[]> {
  const { rows } = await pool.query(
    'SELECT * FROM messages WHERE negotiation_id = $1 ORDER BY sent_at ASC',
    [negotiationId],
  )
  return rows.map(rowToMessage)
}

// Returns last N messages — used for the sliding context window in the AI agent
export async function getRecentMessages(
  negotiationId: string,
  limit: number,
): Promise<ConversationMessage[]> {
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT * FROM messages WHERE negotiation_id = $1 ORDER BY sent_at DESC LIMIT $2
     ) sub ORDER BY sent_at ASC`,
    [negotiationId, limit],
  )
  return rows.map(rowToMessage)
}
