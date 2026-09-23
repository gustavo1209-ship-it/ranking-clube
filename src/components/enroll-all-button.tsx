'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users2, Loader2 } from 'lucide-react'
import { enrollAll } from '@/app/admin/temporadas/[id]/participantes/actions'

export function EnrollAllButton({ seasonId, categoryId }: { seasonId: string; categoryId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleClick() {
    setLoading(true)
    setMessage(null)
    const result = await enrollAll(seasonId, categoryId)
    setMessage({ ok: result.ok, text: result.message })
    setLoading(false)
    if (result.ok) router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Users2 size={14} />}
        Inscrever todos
      </button>
      {message && (
        <p className={`text-xs ${message.ok ? 'text-lime-400' : 'text-red-400'}`}>{message.text}</p>
      )}
    </div>
  )
}
