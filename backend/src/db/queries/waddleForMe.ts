import { randomUUID } from 'node:crypto'
import { pool } from '../client.js'

export interface WaddleForMeJob {
  id: string
  userId: string
  supplierContact: string
  contactType: 'phone' | 'email'
  productDescription: string
  quantity: string | null
  budget: string | null
  notes: string | null
  status: 'pending' | 'in_progress' | 'done' | 'failed'
  result: string | null
  createdAt: string
  updatedAt: string
}

function rowToJob(row: Record<string, unknown>): WaddleForMeJob {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    supplierContact: row.supplier_contact as string,
    contactType: row.contact_type as 'phone' | 'email',
    productDescription: row.product_description as string,
    quantity: row.quantity as string | null,
    budget: row.budget as string | null,
    notes: row.notes as string | null,
    status: row.status as WaddleForMeJob['status'],
    result: row.result as string | null,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  }
}

export async function createJob(params: {
  userId: string
  supplierContact: string
  contactType: 'phone' | 'email'
  productDescription: string
  quantity?: string
  budget?: string
  notes?: string
}): Promise<WaddleForMeJob> {
  const id = randomUUID()
  const { rows } = await pool.query(
    `INSERT INTO waddle_for_me_jobs
      (id, user_id, supplier_contact, contact_type, product_description, quantity, budget, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [id, params.userId, params.supplierContact, params.contactType,
     params.productDescription, params.quantity ?? null, params.budget ?? null, params.notes ?? null],
  )
  return rowToJob(rows[0])
}

export async function getJobs(userId: string): Promise<WaddleForMeJob[]> {
  const { rows } = await pool.query(
    `SELECT * FROM waddle_for_me_jobs WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  )
  return rows.map(rowToJob)
}

export async function getJob(id: string, userId: string): Promise<WaddleForMeJob | null> {
  const { rows } = await pool.query(
    `SELECT * FROM waddle_for_me_jobs WHERE id = $1 AND user_id = $2`,
    [id, userId],
  )
  return rows[0] ? rowToJob(rows[0]) : null
}
