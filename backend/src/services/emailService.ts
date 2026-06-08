import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

// Auto-detect SMTP settings from the sender's email domain.
// Users configure only EMAIL_USER + EMAIL_PASS — no manual host/port needed.
function resolveSmtp(email: string): { host: string; port: number } {
  const domain = email.split('@')[1]?.toLowerCase() ?? ''
  if (domain === 'gmail.com') return { host: 'smtp.gmail.com', port: 587 }
  if (['outlook.com', 'hotmail.com', 'live.com', 'live.co.uk', 'msn.com'].includes(domain)) {
    return { host: 'smtp-mail.outlook.com', port: 587 }
  }
  return { host: `smtp.${domain}`, port: 587 }
}

let _transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (_transporter) return _transporter

  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASS
  if (!user || !pass) {
    throw new Error(
      'EMAIL_USER and EMAIL_PASS must be set to send emails. ' +
      'For Gmail use an App Password (myaccount.google.com/apppasswords).',
    )
  }

  const { host, port } = resolveSmtp(user)
  _transporter = nodemailer.createTransport({ host, port, secure: false, auth: { user, pass } })
  return _transporter
}

export async function sendEmail({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}): Promise<void> {
  const transporter = getTransporter()
  const from = `"${process.env.EMAIL_FROM_NAME ?? 'Waddle Procurement'}" <${process.env.EMAIL_USER!}>`
  await transporter.sendMail({ from, to, subject, text: body })
}
