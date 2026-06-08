import { apiFetch } from './api'

/**
 * Streams a procurement chat message to the Waddle backend and calls onChunk for
 * each text delta. The backend talks to OpenRouter server-side — no AI provider
 * keys are ever exposed to the browser.
 *
 * @param {object} opts
 * @param {string} opts.message          - The user's message
 * @param {string} opts.locationContext  - Location instruction passed as context
 * @param {Array<{role:'user'|'assistant',text:string}>} opts.history - Prior turns for context
 * @param {function} opts.onChunk        - Called with each text delta string
 * @param {function} opts.onDone         - Called when stream completes
 * @param {function} opts.onError        - Called with error message string
 */
export async function streamMessage({ message, locationContext, history = [], onChunk, onDone, onError }) {
  try {
    const response = await apiFetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, locationContext, history }),
    })

    if (!response.ok) {
      let detail = ''
      try {
        const data = await response.json()
        detail = data.error ?? ''
      } catch {
        detail = await response.text()
      }
      throw new Error(`API error ${response.status}${detail ? `: ${detail}` : ''}`)
    }

    const reader  = response.body.getReader()
    const decoder = new TextDecoder()
    let   buffer  = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        let chunk
        try {
          chunk = JSON.parse(line)
        } catch {
          continue // skip malformed/partial lines
        }
        if (chunk.type === 'text-delta' && chunk.textDelta) {
          onChunk(chunk.textDelta)
        } else if (chunk.type === 'error') {
          throw new Error(chunk.error ?? 'Stream error')
        }
        // chunk.type === 'done' — stream finished; onDone called after the loop
      }
    }

    onDone()
  } catch (err) {
    onError(err.message)
  }
}
