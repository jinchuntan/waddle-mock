import { randomUUID } from 'node:crypto'
import { pool } from '../client.js'
import type { QueueItem, QueueItemStatus } from '../../types.js'

function rowToQueueItem(row: Record<string, unknown>): QueueItem {
  return {
    id: row.id as string,
    negotiationId: row.negotiation_id as string,
    position: row.position as number,
    status: row.status as QueueItemStatus,
    lastMessageAt: row.last_message_at ? (row.last_message_at as Date).toISOString() : null,
    timeoutAt: row.timeout_at ? (row.timeout_at as Date).toISOString() : null,
    createdAt: (row.created_at as Date).toISOString(),
  }
}

export async function enqueueItem(negotiationId: string, position: number): Promise<QueueItem> {
  const id = randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO queue_items (id, negotiation_id, position)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, negotiationId, position],
  )
  return rowToQueueItem(rows[0])
}

export async function getQueueItem(negotiationId: string): Promise<QueueItem | null> {
  const { rows } = await pool.query(
    'SELECT * FROM queue_items WHERE negotiation_id = $1',
    [negotiationId],
  )
  return rows.length > 0 ? rowToQueueItem(rows[0]) : null
}

export async function updateQueueItem(
  negotiationId: string,
  updates: Partial<Pick<QueueItem, 'status' | 'lastMessageAt' | 'timeoutAt'>>,
): Promise<void> {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (updates.status !== undefined) {
    fields.push(`status = $${idx++}`)
    values.push(updates.status)
  }
  if (updates.lastMessageAt !== undefined) {
    fields.push(`last_message_at = $${idx++}`)
    values.push(updates.lastMessageAt ? new Date(updates.lastMessageAt) : null)
  }
  if (updates.timeoutAt !== undefined) {
    fields.push(`timeout_at = $${idx++}`)
    values.push(updates.timeoutAt ? new Date(updates.timeoutAt) : null)
  }

  if (fields.length === 0) return

  values.push(negotiationId)
  await pool.query(
    `UPDATE queue_items SET ${fields.join(', ')} WHERE negotiation_id = $${idx}`,
    values,
  )
}

// Returns all items that were mid-flight when the server last stopped — used on startup to rebuild the in-memory queue
export async function getRecoverableItems(): Promise<QueueItem[]> {
  const { rows } = await pool.query(
    `SELECT qi.* FROM queue_items qi
     JOIN negotiations n ON n.id = qi.negotiation_id
     WHERE qi.status IN ('pending','active','waiting_reply','timed_out')
       AND n.status NOT IN ('done','failed')
     ORDER BY qi.position ASC`,
  )
  return rows.map(rowToQueueItem)
}

export async function getNextPosition(): Promise<number> {
  const { rows } = await pool.query(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM queue_items',
  )
  return rows[0].next as number
}
