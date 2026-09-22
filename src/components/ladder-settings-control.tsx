'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Settings2 } from 'lucide-react'
import { setRankingModel, initLadder } from '@/app/admin/temporadas/[id]/escada/actions'
import type { RankingModel } from '@/types'

interface Props {
  seasonId: string
  categoryId: string
  initialModel: RankingModel
  initialMaxGap: number
  initialDaysToPlay: number
  initialRematchDays: number
  ladderInitialized: boolean
}

export function LadderSettingsControl({
  seasonId,
  categoryId,
  initialModel,
  initialMaxGap,
  initialDaysToPlay,
  initialRematchDays,
  ladderInitialized,
}: Props) {
  const router = useRouter()
  const [model, setModel] = useState<RankingModel>(initialModel)
  const [maxGap, setMaxGap] = useState(initialMaxGap)
  const [daysToPlay, setDaysToPlay] = useState(initialDaysToPlay)
  const [rematchDays, setRematchDays] = useState(initialRematchDays)
  const [saving, setSaving] = useState(false)
  const [initing, setIniting] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(nextModel: RankingModel) {
    setSaving(true)
    setMessage(null)
    const result = await setRankingModel(seasonId, categoryId, nextModel, { maxGap, daysToPlay, rematchDays })
    setMessage({ ok: result.ok, text: result.message })
    setSaving(false)
    if (result.ok) router.refresh()
  }

  async function handleModelChange(next: RankingModel) {
    setModel(next)
    await save(next)
  }

  async function handleInit() {
    setIniting(true)
    setMessage(null)
    const result = await initLadder(seasonId, categoryId)
    setMessage({ ok: result.ok, text: result.message })
    setIniting(false)
    if (result.ok) router.refresh()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <select
          value={model}
          onChange={e => handleModelChange(e.target.value as RankingModel)}
          disabled={saving}
          className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-lime-500"
        >
          <option value="pontos">Pontuação</option>
          <option value="escada">Escada</option>
        </select>

        {model === 'escada' && !ladderInitialized && (
          <button
            onClick={handleInit}
            disabled={initing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {initing ? <Loader2 size={14} className="animate-spin" /> : null}
            Iniciar escada
          </button>
        )}

        {model === 'escada' && ladderInitialized && (
          <Link
            href={`/admin/temporadas/${seasonId}/escada?categoria=${categoryId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            <Settings2 size={14} />
            Gerenciar escada
          </Link>
        )}
      </div>

      {model === 'escada' && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
          <label className="flex items-center gap-1.5">
            Gap
            <input
              type="number"
              min={1}
              value={maxGap}
              onChange={e => setMaxGap(Math.max(1, Number(e.target.value) || 1))}
              onBlur={() => save('escada')}
              className="w-14 px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center"
            />
          </label>
          <label className="flex items-center gap-1.5">
            Dias p/ jogar
            <input
              type="number"
              min={1}
              value={daysToPlay}
              onChange={e => setDaysToPlay(Math.max(1, Number(e.target.value) || 1))}
              onBlur={() => save('escada')}
              className="w-14 px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center"
            />
          </label>
          <label className="flex items-center gap-1.5">
            Dias revanche
            <input
              type="number"
              min={0}
              value={rematchDays}
              onChange={e => setRematchDays(Math.max(0, Number(e.target.value) || 0))}
              onBlur={() => save('escada')}
              className="w-14 px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center"
            />
          </label>
        </div>
      )}

      {message && <p className={`text-xs ${message.ok ? 'text-lime-400' : 'text-red-400'}`}>{message.text}</p>}
    </div>
  )
}
