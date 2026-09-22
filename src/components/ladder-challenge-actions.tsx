'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, X } from 'lucide-react'
import { acceptLadderChallenge, declineLadderChallenge } from '@/app/jogos/desafios-actions'

export function LadderChallengeActions({ challengeId }: { challengeId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handle(action: 'accept' | 'decline') {
    setLoading(action)
    setMessage(null)
    const result = action === 'accept' ? await acceptLadderChallenge(challengeId) : await declineLadderChallenge(challengeId)
    setMessage({ ok: result.ok, text: result.message })
    setLoading(null)
    if (result.ok) router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => handle('accept')}
          disabled={loading !== null}
          className="flex items-center gap-1 px-2.5 py-1 bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === 'accept' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Aceitar
        </button>
        <button
          onClick={() => handle('decline')}
          disabled={loading !== null}
          className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading === 'decline' ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
          Recusar
        </button>
      </div>
      {message && <p className={`text-xs ${message.ok ? 'text-lime-400' : 'text-red-400'}`}>{message.text}</p>}
    </div>
  )
}
