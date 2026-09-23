import nodemailer from 'nodemailer'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ranking-clube.vercel.app'
const FROM_ADDRESS = process.env.GMAIL_USER ? `Ranking Caça e Pesca <${process.env.GMAIL_USER}>` : ''

interface SendEmailInput {
  to: string
  subject: string
  html: string
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) return null

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    })
  }
  return transporter
}

/**
 * Envia um email via SMTP do Gmail (conta dedicada + senha de app). Se
 * GMAIL_USER/GMAIL_APP_PASSWORD não estiverem configuradas, não faz nada
 * (silenciosamente) — útil em desenvolvimento local, sem quebrar o
 * restante do fluxo caso o envio falhe.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const transport = getTransporter()
  if (!transport) return

  try {
    await transport.sendMail({ from: FROM_ADDRESS, to, subject, html })
  } catch {
    // best-effort — não bloqueia o fluxo principal se o email falhar
  }
}

export function ladderChallengeEmail({
  challengerName,
  categoryName,
  deadline,
}: {
  challengerName: string
  categoryName: string
  deadline: string
}) {
  return {
    subject: `${challengerName} te desafiou no ranking!`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a2e1a;">Você foi desafiado! 🎾</h2>
        <p><strong>${challengerName}</strong> te desafiou na escada da categoria <strong>${categoryName}</strong>.</p>
        <p>Prazo para aceitar e realizar a partida: <strong>${deadline}</strong>.</p>
        <p style="margin-top: 24px;">
          <a href="${SITE_URL}/jogos" style="background: #84cc16; color: #0a0a0a; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Ver desafio
          </a>
        </p>
        <p style="color: #666; font-size: 13px; margin-top: 24px;">
          Ranking Tênis — Clube Caça e Pesca de Veranópolis
        </p>
      </div>
    `,
  }
}
