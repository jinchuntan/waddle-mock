import { apiFetch } from './api'

export async function previewEmail({ supplierName, supplierEmail, product, quantity, targetPrice, senderName }) {
  const res = await apiFetch('/api/email/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplierName, supplierEmail, product, quantity, targetPrice, senderName }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to generate email draft')
  return data
}

export async function sendEmail({ to, subject, body }) {
  const res = await apiFetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, body }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to send email')
  return data
}
