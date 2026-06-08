import { randomUUID } from 'node:crypto'
import { pool } from '../client.js'
import type { Negotiation, NegotiationStatus, ConversationMessage } from '../../types.js'

function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function rowToNegotiation(row: Record<string, unknown>, messages: ConversationMessage[]): Negotiation {
  return {
    id: row.id as string,
    supplier: row.supplier as string,
    phone: row.phone as string,
    product: row.product as string,
    quantity: row.quantity as string,
    targetPrice: row.target_price as string,
    status: row.status as NegotiationStatus,
    sentAt: (row.created_at as Date).toISOString(),
    summary: (row.summary as string | null) ?? undefined,
    messages,
  }
}

function rowToMessage(row: Record<string, unknown>): ConversationMessage {
  return {
    role: row.role as 'agent' | 'supplier',
    text: row.body as string,
    timestamp: (row.sent_at as Date).toISOString(),
  }
}

export async function createNegotiation(
  data: Pick<Negotiation, 'supplier' | 'phone' | 'product' | 'quantity' | 'targetPrice'> & { sessionId?: string },
): Promise<Negotiation> {
  const id = randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO negotiations (id, supplier, phone, product, quantity, target_price, session_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, data.supplier, normalisePhone(data.phone), data.product, data.quantity, data.targetPrice, data.sessionId ?? null],
  )
  return rowToNegotiation(rows[0], [])
}

export async function getNegotiation(id: string): Promise<Negotiation | null> {
  const { rows: negRows } = await pool.query(
    'SELECT * FROM negotiations WHERE id = $1',
    [id],
  )
  if (negRows.length === 0) return null

  const { rows: msgRows } = await pool.query(
    'SELECT * FROM messages WHERE negotiation_id = $1 ORDER BY sent_at ASC',
    [id],
  )
  return rowToNegotiation(negRows[0], msgRows.map(rowToMessage))
}

export async function getNegotiationByPhone(phone: string): Promise<Negotiation | null> {
  // Most recent active negotiation for this phone number
  const { rows: negRows } = await pool.query(
    `SELECT * FROM negotiations
     WHERE phone = $1 AND status NOT IN ('done','failed')
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalisePhone(phone)],
  )
  if (negRows.length === 0) return null

  const { rows: msgRows } = await pool.query(
    'SELECT * FROM messages WHERE negotiation_id = $1 ORDER BY sent_at ASC',
    [negRows[0].id],
  )
  return rowToNegotiation(negRows[0], msgRows.map(rowToMessage))
}

export async function updateNegotiation(
  id: string,
  updates: Partial<Pick<Negotiation, 'status' | 'summary'>>,
): Promise<void> {
  const fields: string[] = ['updated_at = NOW()']
  const values: unknown[] = []
  let idx = 1

  if (updates.status !== undefined) {
    fields.push(`status = $${idx++}`)
    values.push(updates.status)
  }
  if (updates.summary !== undefined) {
    fields.push(`summary = $${idx++}`)
    values.push(updates.summary)
  }

  values.push(id)
  await pool.query(
    `UPDATE negotiations SET ${fields.join(', ')} WHERE id = $${idx}`,
    values,
  )
}
