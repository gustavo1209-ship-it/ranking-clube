'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2 } from 'lucide-react'
import { deleteSeason } from '@/app/admin/temporadas/actions'

export function DeleteSeasonButton({ seasonId }: { seasonId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setLoading(true)
    const result = await deleteSeason(seasonId)
    setLoading(false)
    setConfirming(false)
    if (result.ok) router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onBlur={() => setConfirming(false)}
      disabled={loading}
      className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors disabled:opacity-50 ${
        confirming ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-red-400'
      }`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      {confirming ? 'Confirmar exclusão?' : 'Excluir'}
    </button>
  )
}
