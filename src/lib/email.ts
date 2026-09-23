const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ranking-clube.vercel.app'

interface SendEmailInput {
  to: string
  subject: string
  html: string
}

/**
 * Envia um email via Brevo (API HTTP, com remetente verificado por clique
 * de confirmação — sem precisar de domínio/DNS). Se BREVO_API_KEY ou
 * BREVO_SENDER_EMAIL não estiverem configuradas, não faz nada
 * (silenciosamente) — útil em desenvolvimento local, sem quebrar o
 * restante do fluxo caso o envio falhe.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  if (!apiKey || !senderEmail) return

  try {
    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Ranking Caça e Pesca', email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })
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
