import { apiFetch } from './api'

export async function startNegotiation({ supplier, phone, product, quantity, targetPrice, sessionId }) {
  const res = await apiFetch('/api/negotiate/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ supplier, phone, product, quantity, targetPrice, sessionId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to start negotiation')
  return data
}

export async function getNegotiation(id) {
  const res = await apiFetch(`/api/negotiate/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to fetch negotiation')
  return data
}

export function subscribeToNegotiation(id, callbacks) {
  const token = localStorage.getItem('waddle_token')
  const url = token
    ? `/api/negotiate/${id}/events?token=${encodeURIComponent(token)}`
    : `/api/negotiate/${id}/events`
  const source = new EventSource(url)

  source.addEventListener('message',    e => callbacks.onMessage?.(JSON.parse(e.data)))
  source.addEventListener('status',     e => callbacks.onStatus?.(JSON.parse(e.data)))
  source.addEventListener('activity',   e => callbacks.onActivity?.(JSON.parse(e.data)))
  source.addEventListener('typing',     e => callbacks.onTyping?.(JSON.parse(e.data)))
  source.addEventListener('extraction', e => callbacks.onExtraction?.(JSON.parse(e.data)))

  source.onerror = () => callbacks.onError?.()

  return () => source.close()
}
