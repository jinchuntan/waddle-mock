import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface EmailContext {
  supplierName: string
  supplierEmail: string
  product: string
  quantity: string
  targetPrice: string
  senderName: string
}

export interface EmailDraft {
  subject: string
  body: string
}

export async function generateEmailDraft(ctx: EmailContext): Promise<EmailDraft> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: `You are a procurement specialist drafting a supplier inquiry email.

Context:
- Supplier company: ${ctx.supplierName}
- Product / item needed: ${ctx.product}
- Quantity required: ${ctx.quantity}
- Target price / budget: ${ctx.targetPrice}
- Sent by: ${ctx.senderName}

Write a professional, concise procurement inquiry email. Be polite and businesslike. State the requirements clearly, mention the target price as a reference point (not a demand), and close with a request for a formal quotation and their best terms.

Use plain text only — no markdown, no bullet points. Paragraph breaks are fine.

Respond ONLY with valid JSON in this exact format — no explanation, no other text:
{"subject":"...","body":"..."}`,
      },
    ],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude did not return valid JSON')

  const parsed = JSON.parse(match[0]) as { subject?: string; body?: string }
  if (!parsed.subject || !parsed.body) throw new Error('Email draft missing subject or body')

  return { subject: parsed.subject, body: parsed.body }
}
