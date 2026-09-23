'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ListOrdered, Loader2, Swords } from 'lucide-react'
import { createLadderChallenge } from '@/app/jogos/desafios-actions'
import { LADDER_PLAYER_STATUS_LABELS } from '@/types'
import type { LadderPlayerStatus } from '@/types'

export interface LadderRow {
  profile_id: string
  name: string
  position: number
  player_status: LadderPlayerStatus
  partidas_jogadas: number
  vitorias: number
  derrotas: number
  sets_pro: number
  sets_contra: number
}

interface LadderTableProps {
  rows: LadderRow[]
  currentUserId?: string
  seasonId: string
  categoryId: string
  canChallenge: boolean
  eligiblePositions: number[]
  rematchBlockedUntil?: Record<string, string>
}

export function LadderTable({
  rows,
  currentUserId,
  seasonId,
  categoryId,
  canChallenge,
  eligiblePositions,
  rematchBlockedUntil = {},
}: LadderTableProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleChallenge(challengedId: string) {
    setLoadingId(challengedId)
    setMessage(null)
    const result = await createLadderChallenge(seasonId, categoryId, challengedId)
    setMessage({ ok: result.ok, text: result.message })
    setLoadingId(null)
    if (result.ok) router.refresh()
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <ListOrdered size={40} className="mx-auto mb-3 opacity-30" />
        <p>A escada desta categoria ainda não foi iniciada.</p>
      </div>
    )
  }

  return (
    <div>
      {message && (
        <p className={`text-sm mb-3 ${message.ok ? 'text-lime-400' : 'text-red-400'}`}>{message.text}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-left">
              <th className="pb-3 pr-4 font-medium w-10">#</th>
              <th className="pb-3 pr-4 font-medium">Nome</th>
              <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">J</th>
              <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">V</th>
              <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">D</th>
              <th className="pb-3 pr-4 font-medium text-center" title="Saldo de sets">Sets</th>
              <th className="pb-3 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {rows.map(row => {
              const isMe = row.profile_id === currentUserId
              const rematchUntil = rematchBlockedUntil[row.profile_id]
              const showChallenge =
                canChallenge &&
                !isMe &&
                row.player_status === 'ativo' &&
                eligiblePositions.includes(row.position) &&
                !rematchUntil

              return (
                <tr key={row.profile_id} className={`transition-colors ${isMe ? 'bg-lime-500/10' : 'hover:bg-gray-900/50'}`}>
                  <td className="py-2 pr-4 text-gray-500 font-medium">{row.position}</td>
                  <td className="py-2 pr-4">
                    <span className={`font-medium ${isMe ? 'text-lime-400' : 'text-white'}`}>
                      {row.name}
                      {isMe && <span className="ml-1 text-xs text-lime-500">(você)</span>}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-center hidden sm:table-cell text-gray-400">{row.partidas_jogadas}</td>
                  <td className="py-2 pr-4 text-center hidden sm:table-cell text-green-400">{row.vitorias}</td>
                  <td className="py-2 pr-4 text-center hidden sm:table-cell text-red-400">{row.derrotas}</td>
                  <td className="py-2 pr-4 text-center text-gray-300 font-medium tabular-nums">
                    {row.sets_pro}-{row.sets_contra}
                  </td>
                  <td className="py-2 text-right">
                    {showChallenge ? (
                      <button
                        onClick={() => handleChallenge(row.profile_id)}
                        disabled={loadingId === row.profile_id}
                        className="flex items-center gap-1.5 ml-auto px-2.5 py-1 bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {loadingId === row.profile_id ? <Loader2 size={12} className="animate-spin" /> : <Swords size={12} />}
                        Desafiar
                      </button>
                    ) : row.player_status !== 'ativo' ? (
                      <span className="text-xs text-gray-500">{LADDER_PLAYER_STATUS_LABELS[row.player_status]}</span>
                    ) : rematchUntil ? (
                      <span className="text-xs text-gray-500" title="Trava de revanche">
                        Revanche em {rematchUntil}
                      </span>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
