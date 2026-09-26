'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'
import { declineLadderChallenge } from '@/app/jogos/desafios-actions'

export function CancelChallengeButton({ challengeId }: { challengeId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleCancel() {
    if (!window.confirm('Cancelar este desafio?')) return
    setLoading(true)
    setMessage(null)
    const result = await declineLadderChallenge(challengeId)
    setMessage({ ok: result.ok, text: result.message })
    setLoading(false)
    if (result.ok) router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleCancel}
        disabled={loading}
        className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
        Cancelar desafio
      </button>
      {message && <p className={`text-xs ${message.ok ? 'text-lime-400' : 'text-red-400'}`}>{message.text}</p>}
    </div>
  )
}
