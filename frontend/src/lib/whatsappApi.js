import { apiFetch } from './api'

export async function getWhatsAppStatus() {
  const res = await apiFetch('/api/whatsapp/status')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to fetch WhatsApp status')
  return data
}

export async function getWhatsAppQR() {
  const res = await apiFetch('/api/whatsapp/qr')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'No QR available')
  return data
}
