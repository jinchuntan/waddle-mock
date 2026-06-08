import { apiFetch } from './api'

export async function getMe() {
  const res = await apiFetch('/api/auth/me')
  if (!res.ok) throw new Error('Not authenticated')
  return res.json()
}
