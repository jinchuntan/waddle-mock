import { apiFetch } from './api'

export async function createSession(title, threadId) {
  const res = await apiFetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, threadId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to create session')
  return data
}

export async function getSessions() {
  const res = await apiFetch('/api/sessions')
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to load sessions')
  return data
}

export async function getSession(id) {
  const res = await apiFetch(`/api/sessions/${id}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Session not found')
  return data
}

export async function appendSessionMessage(sessionId, role, content) {
  const res = await apiFetch(`/api/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, content }),
  })
  if (!res.ok) throw new Error('Failed to save message')
  return res.json()
}

export async function deleteSession(id) {
  await apiFetch(`/api/sessions/${id}`, { method: 'DELETE' })
}
