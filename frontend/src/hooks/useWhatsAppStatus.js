import { useState, useEffect, useRef, useCallback } from 'react'
import { getWhatsAppStatus, getWhatsAppQR } from '../lib/whatsappApi.js'

const POLL_MS = 3_000

export function useWhatsAppStatus() {
  const [status, setStatus] = useState('connecting')
  const [qr, setQr] = useState(null)
  const pollRef = useRef(null)

  const poll = useCallback(async () => {
    try {
      const { status: s } = await getWhatsAppStatus()
      setStatus(s)

      if (s === 'qr_ready') {
        try {
          const { qr: q } = await getWhatsAppQR()
          setQr(q)
        } catch {
          setQr(null)
        }
      } else {
        setQr(null)
      }
    } catch {
      // Backend not reachable — keep last known status
    }
  }, [])

  useEffect(() => {
    poll()
    pollRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(pollRef.current)
  }, [poll])

  return {
    status,
    isConnected: status === 'connected',
    qr,
  }
}
