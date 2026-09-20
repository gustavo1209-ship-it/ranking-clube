'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updateMatchResult, setMatchStatus, rescheduleMatch } from '../actions'
import { ArrowLeft, Save, Loader2, Ban, RotateCcw } from 'lucide-react'
import type { Match, MatchStatus, Profile, SetScore } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

const EMPTY_SETS: SetScore[] = [{ p1: 0, p2: 0 }, { p1: 0, p2: 0 }, { p1: 0, p2: 0 }]

export default function AdminEditarJogoPage({ params }: Props) {
  const router = useRouter()
  const [matchId, setMatchId] = useState('')
  const [match, setMatch] = useState<Match | null>(null)
  const [profilesById, setProfilesById] = useState<Map<string, Profile>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sets, setSets] = useState<SetScore[]>(EMPTY_SETS)
  const [scheduledDate, setScheduledDate] = useState('')

  useEffect(() => {
    params.then(p => setMatchId(p.id))
  }, [params])

  useEffect(() => {
    if (!matchId) return
    async function load() {
      const supabase = createClient()
      const [{ data: matchData }, { data: profiles }] = await Promise.all([
        supabase.from('matches').select('*').eq('id', matchId).single(),
        supabase.from('profiles').select('*'),
      ])
      setMatch(matchData)
      setProfilesById(new Map((profiles ?? []).map((p: Profile) => [p.id, p])))
      if (matchData?.sets?.length) setSets(matchData.sets)
      if (matchData?.scheduled_date) setScheduledDate(matchData.scheduled_date)
      setLoading(false)
    }
    load()
  }, [matchId])

  function nameOf(id: string | null) {
    if (!id) return '—'
    return profilesById.get(id)?.full_name || 'Participante'
  }

  function updateSet(index: number, side: 'p1' | 'p2', value: string) {
    const n = Math.max(0, Math.min(20, Number(value) || 0))
    setSets(prev => prev.map((s, i) => (i === index ? { ...s, [side]: n } : s)))
  }

  async function handleSaveResult(e: React.FormEvent) {
    e.preventDefault()
    if (!match) return
    setError('')
    setSaving(true)
    try {
      const played = sets.filter(s => s.p1 > 0 || s.p2 > 0)
      await updateMatchResult(match.id, played)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
    setSaving(false)
  }

  async function handleStatus(newStatus: MatchStatus) {
    if (!match) return
    setSaving(true)
    await setMatchStatus(match.id, newStatus)
    router.refresh()
    setSaving(false)
  }

  async function handleReschedule() {
    if (!match || !scheduledDate) return
    setSaving(true)
    await rescheduleMatch(match.id, scheduledDate)
    router.refresh()
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-lime-400 animate-spin" />
      </div>
    )
  }

  if (!match) return <p className="text-gray-400">Partida não encontrada.</p>

  return (
    <div className="max-w-lg">
      <Link href="/admin/jogos" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-6">
        <ArrowLeft size={14} />
        Voltar
      </Link>

      <h1 className="text-xl font-bold text-white">
        {nameOf(match.player1_id)} <span className="text-gray-500">vs</span> {nameOf(match.player2_id)}
      </h1>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-6 space-y-6">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Data agendada</label>
            <input
              type="date"
              value={scheduledDate}
              onChange={e => setScheduledDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-lime-500"
            />
          </div>
          <button
            onClick={handleReschedule}
            disabled={saving}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            Remarcar
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleStatus('wo')}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Ban size={14} />
            Marcar W.O.
          </button>
          <button
            onClick={() => handleStatus('cancelado')}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Ban size={14} />
            Cancelar
          </button>
          <button
            onClick={() => handleStatus('agendado')}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RotateCcw size={14} />
            Reabrir
          </button>
        </div>

        <form onSubmit={handleSaveResult} className="space-y-4 border-t border-gray-800 pt-6">
          <p className="text-sm text-gray-400">Placar (melhor de 3 sets)</p>
          {sets.map((set, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-12">Set {index + 1}</span>
              <input
                type="number"
                min={0}
                max={20}
                value={set.p1 || ''}
                onChange={e => updateSet(index, 'p1', e.target.value)}
                placeholder="0"
                className="w-16 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:outline-none focus:border-lime-500"
              />
              <span className="text-gray-600">x</span>
              <input
                type="number"
                min={0}
                max={20}
                value={set.p2 || ''}
                onChange={e => updateSet(index, 'p2', e.target.value)}
                placeholder="0"
                className="w-16 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:outline-none focus:border-lime-500"
              />
            </div>
          ))}

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 text-gray-950 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Salvar placar
          </button>
        </form>
      </div>
    </div>
  )
}
