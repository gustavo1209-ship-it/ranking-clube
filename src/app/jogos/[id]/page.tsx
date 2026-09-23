'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { summarizeSets, isValidSetSequence } from '@/lib/scoring'
import { applyLadderResultAfterReport } from '@/app/jogos/report-actions'
import { proposeReschedule, respondReschedule, cancelReschedule } from '@/app/jogos/reschedule-actions'
import { ArrowLeft, Save, Loader2, CalendarClock, Check, X } from 'lucide-react'
import type { Match, MatchRescheduleRequest, Profile, SetScore } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

const EMPTY_SETS: SetScore[] = [{ p1: 0, p2: 0 }, { p1: 0, p2: 0 }, { p1: 0, p2: 0 }]

export default function LancarPlacarPage({ params }: Props) {
  const router = useRouter()

  const [matchId, setMatchId] = useState('')
  const [match, setMatch] = useState<Match | null>(null)
  const [profilesById, setProfilesById] = useState<Map<string, Profile>>(new Map())
  const [currentUserId, setCurrentUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sets, setSets] = useState<SetScore[]>(EMPTY_SETS)
  const [rescheduleRequest, setRescheduleRequest] = useState<MatchRescheduleRequest | null>(null)
  const [newDate, setNewDate] = useState('')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)
  const [rescheduleMessage, setRescheduleMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    params.then(p => setMatchId(p.id))
  }, [params])

  async function loadReschedule(id: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('match_reschedule_requests')
      .select('*')
      .eq('match_id', id)
      .eq('status', 'pendente')
      .maybeSingle()
    setRescheduleRequest(data)
  }

  useEffect(() => {
    if (!matchId) return

    async function load() {
      const supabase = createClient()
      const [{ data: { user } }, { data: matchData }, { data: profiles }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('matches').select('*').eq('id', matchId).single(),
        supabase.from('profiles').select('*'),
      ])

      setCurrentUserId(user?.id ?? '')
      setMatch(matchData)
      setProfilesById(new Map((profiles ?? []).map((p: Profile) => [p.id, p])))
      if (matchData?.sets?.length) setSets(matchData.sets)
      setLoading(false)
      await loadReschedule(matchId)
    }
    load()
  }, [matchId])

  async function handleProposeDate(e: React.FormEvent) {
    e.preventDefault()
    if (!newDate) return
    setRescheduleLoading(true)
    setRescheduleMessage(null)
    const result = await proposeReschedule(matchId, newDate)
    setRescheduleMessage({ ok: result.ok, text: result.message })
    setRescheduleLoading(false)
    if (result.ok) {
      setNewDate('')
      await loadReschedule(matchId)
    }
  }

  async function handleRespond(accept: boolean) {
    if (!rescheduleRequest) return
    setRescheduleLoading(true)
    setRescheduleMessage(null)
    const result = await respondReschedule(rescheduleRequest.id, accept)
    setRescheduleMessage({ ok: result.ok, text: result.message })
    setRescheduleLoading(false)
    if (result.ok) {
      const supabase = createClient()
      const { data: matchData } = await supabase.from('matches').select('*').eq('id', matchId).single()
      setMatch(matchData)
      await loadReschedule(matchId)
    }
  }

  async function handleCancelProposal() {
    if (!rescheduleRequest) return
    setRescheduleLoading(true)
    setRescheduleMessage(null)
    const result = await cancelReschedule(rescheduleRequest.id)
    setRescheduleMessage({ ok: result.ok, text: result.message })
    setRescheduleLoading(false)
    if (result.ok) await loadReschedule(matchId)
  }

  function nameOf(id: string | null) {
    if (!id) return '—'
    return profilesById.get(id)?.full_name || 'Participante'
  }

  function updateSet(index: number, side: 'p1' | 'p2', value: string) {
    const n = Math.max(0, Math.min(20, Number(value) || 0))
    setSets(prev => prev.map((s, i) => (i === index ? { ...s, [side]: n } : s)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!match) return
    setError('')

    if (!isValidSetSequence(sets)) {
      setError('Informe pelo menos 2 sets válidos, com um vencedor claro.')
      return
    }

    const played = sets.filter(s => s.p1 > 0 || s.p2 > 0)
    const summary = summarizeSets(played)
    const winnerId = summary.winner === 'p1' ? match.player1_id : match.player2_id

    setSaving(true)
    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        sets: played,
        sets_pro: summary.setsPro,
        sets_contra: summary.setsContra,
        games_pro: summary.gamesPro,
        games_contra: summary.gamesContra,
        winner_id: winnerId,
        status: 'realizado',
        reported_by: currentUserId,
        reported_at: new Date().toISOString(),
      })
      .eq('id', match.id)

    if (updateError) {
      setError('Não foi possível salvar o placar. Tente novamente.')
      setSaving(false)
      return
    }

    if (match.challenge_id) {
      await applyLadderResultAfterReport(match.id)
    }

    router.push('/jogos')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={24} className="text-lime-400 animate-spin" />
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        Partida não encontrada.
      </div>
    )
  }

  const canReport = match.status === 'agendado' && (currentUserId === match.player1_id || currentUserId === match.player2_id)

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-sm mx-auto py-10">
        <Link href="/jogos" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-6">
          <ArrowLeft size={14} />
          Voltar aos meus jogos
        </Link>

        <h1 className="text-xl font-bold text-white">
          {nameOf(match.player1_id)} <span className="text-gray-500">vs</span> {nameOf(match.player2_id)}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{match.scheduled_date}</p>

        {match.status === 'agendado' && (currentUserId === match.player1_id || currentUserId === match.player2_id) && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mt-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-1.5 mb-3">
              <CalendarClock size={15} className="text-lime-400" />
              Remarcar data
            </h2>

            {rescheduleRequest ? (
              rescheduleRequest.proposed_by === currentUserId ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">
                    Você propôs <span className="text-white font-medium">{rescheduleRequest.proposed_date}</span>.
                    Aguardando resposta de {nameOf(match.player1_id === currentUserId ? match.player2_id : match.player1_id)}.
                  </p>
                  <button
                    onClick={handleCancelProposal}
                    disabled={rescheduleLoading}
                    className="text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                  >
                    Cancelar proposta
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-300">
                    {nameOf(rescheduleRequest.proposed_by)} propôs nova data:{' '}
                    <span className="text-white font-medium">{rescheduleRequest.proposed_date}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(true)}
                      disabled={rescheduleLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {rescheduleLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleRespond(false)}
                      disabled={rescheduleLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {rescheduleLoading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                      Recusar
                    </button>
                  </div>
                </div>
              )
            ) : (
              <form onSubmit={handleProposeDate} className="flex items-center gap-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  required
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-lime-500"
                />
                <button
                  type="submit"
                  disabled={rescheduleLoading}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Propor
                </button>
              </form>
            )}

            {rescheduleMessage && (
              <p className={`text-xs mt-2 ${rescheduleMessage.ok ? 'text-lime-400' : 'text-red-400'}`}>
                {rescheduleMessage.text}
              </p>
            )}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-6">
          {!canReport ? (
            <div>
              {match.status === 'realizado' ? (
                <div className="space-y-3">
                  <p className="text-lime-400 font-medium">Vencedor: {nameOf(match.winner_id)}</p>
                  <div className="space-y-1 text-sm text-gray-300">
                    {(match.sets ?? []).map((s, i) => (
                      <p key={i}>Set {i + 1}: {s.p1} - {s.p2}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  Você não pode lançar o placar desta partida.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-400">Preencha os games de cada set (melhor de 3).</p>
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
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Salvar resultado
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
