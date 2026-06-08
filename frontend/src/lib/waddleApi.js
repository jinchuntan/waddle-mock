const AGENT_ID = import.meta.env.VITE_LUA_AGENT_ID
const API_KEY  = import.meta.env.VITE_LUA_API_KEY
const BASE_URL = 'https://api.heylua.ai'

/**
 * Streams a message to the Waddle agent and calls onChunk for each text delta.
 * @param {object} opts
 * @param {string} opts.message          - The user's message
 * @param {string} opts.locationContext  - Location instruction appended as runtime context
 * @param {string} opts.threadId         - Conversation thread ID for history continuity
 * @param {function} opts.onChunk        - Called with each text delta string
 * @param {function} opts.onDone         - Called when stream completes
 * @param {function} opts.onError        - Called with error message string
 */
export async function streamMessage({ message, locationContext, threadId, onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${BASE_URL}/chat/stream/${AGENT_ID}?channel=web`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages:        [{ type: 'text', text: message }],
        navigate:        false,
        skillOverride:   [],
        runtimeContext:  locationContext,
        threadId,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${await response.text()}`)
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
        try {
          const chunk = JSON.parse(line)
          if (chunk.type === 'text-delta' && chunk.textDelta) {
            onChunk(chunk.textDelta)
          }
        } catch {
          // skip malformed lines
        }
      }
    }

    onDone()
  } catch (err) {
    onError(err.message)
  }
}
