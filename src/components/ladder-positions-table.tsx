'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GripVertical, Trash2 } from 'lucide-react'
import { movePlayerManually, removePlayer, setPlayerLadderStatus } from '@/app/admin/temporadas/[id]/escada/actions'
import { LADDER_PLAYER_STATUS_LABELS } from '@/types'
import type { LadderPlayerStatus, LadderPosition } from '@/types'

interface Stats {
  partidas_jogadas: number
  vitorias: number
  derrotas: number
}

interface Props {
  seasonId: string
  categoryId: string
  positions: LadderPosition[]
  namesById: Record<string, string>
  statsByProfile: Record<string, Stats>
}

const STATUS_OPTIONS: LadderPlayerStatus[] = ['ativo', 'inativo', 'afastado']

export function LadderPositionsTable({ seasonId, categoryId, positions, namesById, statsByProfile }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(positions)
  const [prevPositions, setPrevPositions] = useState(positions)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([])

  if (positions !== prevPositions) {
    setPrevPositions(positions)
    setItems(positions)
  }

  function indexAtY(y: number): number {
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (y < rect.top + rect.height / 2) return i
    }
    return rowRefs.current.length - 1
  }

  function handlePointerDown(index: number, e: React.PointerEvent<HTMLElement>) {
    e.preventDefault()
    setDragIndex(index)
    setOverIndex(index)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    if (dragIndex === null) return
    setOverIndex(indexAtY(e.clientY))
  }

  function handlePointerUp(e: React.PointerEvent<HTMLElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    if (dragIndex === null) return
    const targetIndex = overIndex ?? dragIndex
    setOverIndex(null)
    setDragIndex(null)
    if (targetIndex === dragIndex) return

    const reordered = [...items]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    setItems(reordered)
    setError('')

    const newPosition = targetIndex + 1
    setBusyId(moved.profile_id)
    movePlayerManually(seasonId, categoryId, moved.profile_id, newPosition).then(result => {
      setBusyId(null)
      if (!result.ok) {
        setError(result.message)
        setItems(positions)
      } else {
        router.refresh()
      }
    })
  }

  async function handleStatus(profileId: string, status: LadderPlayerStatus) {
    setBusyId(profileId)
    await setPlayerLadderStatus(seasonId, categoryId, profileId, status)
    setBusyId(null)
    router.refresh()
  }

  async function handleRemove(profileId: string) {
    if (confirmRemoveId !== profileId) {
      setConfirmRemoveId(profileId)
      return
    }
    setConfirmRemoveId(null)
    setBusyId(profileId)
    setError('')
    const result = await removePlayer(seasonId, categoryId, profileId)
    setBusyId(null)
    if (!result.ok) setError(result.message)
    else router.refresh()
  }

  return (
    <div>
      {error && (
        <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-x-auto">
        <table className="w-full text-sm select-none">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-left">
              <th className="pb-3 pr-2 font-medium w-6"></th>
              <th className="pb-3 pr-4 font-medium w-10">#</th>
              <th className="pb-3 pr-4 font-medium">Jogador</th>
              <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">J</th>
              <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">V</th>
              <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">D</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {items.map((pos, index) => {
              const stats = statsByProfile[pos.profile_id]
              const isBusy = busyId === pos.profile_id
              const isOver = overIndex === index
              const isDragging = dragIndex === index
              return (
                <tr
                  key={pos.profile_id}
                  ref={el => {
                    rowRefs.current[index] = el
                  }}
                  className={`transition-colors ${isBusy || isDragging ? 'opacity-50' : ''} ${
                    isOver && dragIndex !== null ? 'bg-lime-500/10' : ''
                  }`}
                >
                  <td
                    className="py-2 pr-2 text-gray-600 cursor-grab active:cursor-grabbing touch-none"
                    onPointerDown={e => handlePointerDown(index, e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  >
                    <GripVertical size={14} />
                  </td>
                  <td className="py-2 pr-4 text-gray-400 font-medium">{index + 1}</td>
                  <td className="py-2 pr-4 text-white font-medium">{namesById[pos.profile_id] || 'Participante'}</td>
                  <td className="py-2 pr-4 text-center hidden sm:table-cell text-gray-400">{stats?.partidas_jogadas ?? 0}</td>
                  <td className="py-2 pr-4 text-center hidden sm:table-cell text-green-400">{stats?.vitorias ?? 0}</td>
                  <td className="py-2 pr-4 text-center hidden sm:table-cell text-red-400">{stats?.derrotas ?? 0}</td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      {STATUS_OPTIONS.map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatus(pos.profile_id, status)}
                          disabled={isBusy}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                            pos.player_status === status
                              ? 'bg-lime-500/20 text-lime-400'
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {LADDER_PLAYER_STATUS_LABELS[status]}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(pos.profile_id)}
                      onBlur={() => setConfirmRemoveId(prev => (prev === pos.profile_id ? null : prev))}
                      disabled={isBusy}
                      className={`text-xs font-medium px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                        confirmRemoveId === pos.profile_id
                          ? 'bg-red-500/20 text-red-400'
                          : 'text-gray-600 hover:text-red-400'
                      }`}
                      title="Remover da escada"
                    >
                      {confirmRemoveId === pos.profile_id ? 'Confirmar?' : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="text-xs text-gray-600 mt-3">Arraste um jogador pela posição (ícone à esquerda) para reordenar a escada.</p>
      </div>
    </div>
  )
}
