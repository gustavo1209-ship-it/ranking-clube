'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, LogOut, UserPlus, Loader2 } from 'lucide-react'
import { joinSeason, leaveSeason } from '@/app/participar/actions'

export function JoinSeasonButton({
  seasonId,
  categoryId,
  joined,
}: {
  seasonId: string
  categoryId: string
  joined: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleClick() {
    setLoading(true)
    setMessage(null)
    const result = joined ? await leaveSeason(seasonId, categoryId) : await joinSeason(seasonId, categoryId)
    setMessage({ ok: result.ok, text: result.message })
    setLoading(false)
    if (result.ok) router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
          joined
            ? 'bg-gray-800 hover:bg-red-500/10 text-gray-300 hover:text-red-400'
            : 'bg-lime-500/20 hover:bg-lime-500/30 text-lime-400'
        }`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : joined ? (
          <LogOut size={14} />
        ) : (
          <UserPlus size={14} />
        )}
        {joined ? 'Cancelar inscrição' : 'Participar'}
      </button>
      {joined && !message && (
        <span className="flex items-center gap-1 text-xs text-lime-400">
          <Check size={12} /> Inscrito
        </span>
      )}
      {message && <p className={`text-xs ${message.ok ? 'text-lime-400' : 'text-red-400'}`}>{message.text}</p>}
    </div>
  )
}
