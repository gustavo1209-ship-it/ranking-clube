import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { expireOverdueLadderChallenges } from '@/lib/ladder'
import { cancelChallengeAdmin, markChallengeWO } from '@/app/admin/desafios/actions'
import { addPlayerToLadder, createAdminChallenge } from './actions'
import { LadderPositionsTable } from '@/components/ladder-positions-table'
import { LADDER_CHALLENGE_STATUS_LABELS } from '@/types'
import type { Category, LadderChallenge, LadderPosition, Profile, Season, Standing } from '@/types'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ categoria?: string }>
}

export default async function EscadaAdminPage({ params, searchParams }: Props) {
  await requireAdmin()
  const { id: seasonId } = await params
  const { categoria } = await searchParams
  const supabase = createServiceClient()

  const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).single<Season>()
  if (!season) notFound()

  const { data: categories } = await supabase.from('categories').select('*').order('sort_order') as { data: Category[] | null }
  const categoryId = categoria ?? categories?.[0]?.id

  if (categoryId) await expireOverdueLadderChallenges(supabase, seasonId, categoryId)

  const [{ data: positions }, { data: standings }, { data: challenges }, { data: profiles }] = categoryId
    ? await Promise.all([
        supabase
          .from('ladder_positions')
          .select('*')
          .eq('season_id', seasonId)
          .eq('category_id', categoryId)
          .order('position') as unknown as Promise<{ data: LadderPosition[] | null }>,
        supabase
          .from('standings')
          .select('*')
          .eq('season_id', seasonId)
          .eq('category_id', categoryId) as unknown as Promise<{ data: Standing[] | null }>,
        supabase
          .from('ladder_challenges')
          .select('*')
          .eq('season_id', seasonId)
          .eq('category_id', categoryId)
          .order('created_at', { ascending: false }) as unknown as Promise<{ data: LadderChallenge[] | null }>,
        supabase.from('profiles').select('*') as unknown as Promise<{ data: Profile[] | null }>,
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]

  const profilesById = new Map((profiles ?? []).map(p => [p.id, p]))
  const standingsByProfile = new Map((standings ?? []).map(s => [s.profile_id, s]))
  const nameOf = (id: string | null) => (id ? profilesById.get(id)?.full_name || 'Participante' : '—')

  const positionedIds = new Set((positions ?? []).map(p => p.profile_id))
  const availableToAdd = (profiles ?? [])
    .filter(p => !positionedIds.has(p.id))
    .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email))
  const ladderPlayers = (positions ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)

  async function cancelAction(formData: FormData) {
    'use server'
    await cancelChallengeAdmin(String(formData.get('challenge_id')))
  }

  async function woAction(formData: FormData) {
    'use server'
    await markChallengeWO(String(formData.get('challenge_id')), String(formData.get('winner_id')))
  }

  async function addPlayerAction(formData: FormData) {
    'use server'
    const profileId = String(formData.get('profile_id') || '')
    const catId = String(formData.get('category_id') || '')
    if (!profileId || !catId) return
    await addPlayerToLadder(seasonId, catId, profileId)
  }

  async function createChallengeAction(formData: FormData) {
    'use server'
    const catId = String(formData.get('category_id') || '')
    const challengerId = String(formData.get('challenger_id') || '')
    const challengedId = String(formData.get('challenged_id') || '')
    if (!catId || !challengerId || !challengedId) return
    await createAdminChallenge(seasonId, catId, challengerId, challengedId)
  }

  const openChallenges = (challenges ?? []).filter(c => ['aguardando_aceite', 'aceito', 'agendado'].includes(c.status))
  const closedChallenges = (challenges ?? []).filter(c => !['aguardando_aceite', 'aceito', 'agendado'].includes(c.status))

  return (
    <div>
      <h1 className="text-2xl font-bold">Escada — {season.name}</h1>

      <div className="flex flex-wrap gap-2 mt-4">
        {(categories ?? []).map(cat => (
          <Link
            key={cat.id}
            href={`/admin/temporadas/${seasonId}/escada?categoria=${cat.id}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              categoryId === cat.id
                ? 'bg-lime-500/20 border-lime-500/40 text-lime-400'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {!categoryId && <p className="text-sm text-gray-500 mt-6">Cadastre uma categoria primeiro.</p>}

      {categoryId && (positions ?? []).length === 0 && (
        <p className="text-sm text-gray-500 mt-6">
          Escada ainda não iniciada para esta categoria. Volte para{' '}
          <Link href={`/admin/temporadas/${seasonId}`} className="text-lime-400 hover:text-lime-300">
            a página da temporada
          </Link>{' '}
          e clique em &quot;Iniciar escada&quot;.
        </p>
      )}

      {categoryId && (positions ?? []).length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Adicionar jogador</h2>
              {availableToAdd.length === 0 ? (
                <p className="text-xs text-gray-500">Todos os jogadores cadastrados já estão nessa escada.</p>
              ) : (
                <form action={addPlayerAction} className="flex gap-2">
                  <input type="hidden" name="category_id" value={categoryId} />
                  <select
                    name="profile_id"
                    required
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-lime-500"
                  >
                    {availableToAdd.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 text-sm font-medium rounded-lg transition-colors"
                  >
                    Adicionar
                  </button>
                </form>
              )}
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white mb-3">Criar desafio manualmente</h2>
              <form action={createChallengeAction} className="space-y-2">
                <input type="hidden" name="category_id" value={categoryId} />
                <div className="flex gap-2">
                  <select
                    name="challenger_id"
                    required
                    defaultValue=""
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-lime-500"
                  >
                    <option value="" disabled>Desafiante</option>
                    {ladderPlayers.map(p => (
                      <option key={p.profile_id} value={p.profile_id}>
                        {p.position}º {nameOf(p.profile_id)}
                      </option>
                    ))}
                  </select>
                  <select
                    name="challenged_id"
                    required
                    defaultValue=""
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-lime-500"
                  >
                    <option value="" disabled>Desafiado</option>
                    {ladderPlayers.map(p => (
                      <option key={p.profile_id} value={p.profile_id}>
                        {p.position}º {nameOf(p.profile_id)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full px-3 py-2 bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 text-sm font-medium rounded-lg transition-colors"
                >
                  Criar desafio + partida
                </button>
                <p className="text-xs text-gray-600">Cria direto como &quot;agendado&quot; (sem passar por aceite). Depois lance o placar em Jogos.</p>
                <p className="text-xs text-gray-600">Se o desafiante vencer, ele assume a posição do desafiado — por isso o &quot;Desafiante&quot; deve ser quem está na posição pior (número maior).</p>
              </form>
            </div>
          </div>

          <div className="mt-6">
            <LadderPositionsTable
              seasonId={seasonId}
              categoryId={categoryId}
              positions={positions as LadderPosition[]}
              namesById={Object.fromEntries(Array.from(profilesById.entries()).map(([id, p]) => [id, p.full_name]))}
              statsByProfile={Object.fromEntries(
                Array.from(standingsByProfile.entries()).map(([id, s]) => [
                  id,
                  { partidas_jogadas: s.partidas_jogadas, vitorias: s.vitorias, derrotas: s.derrotas },
                ])
              )}
            />
          </div>

          <h2 className="font-semibold text-white mt-8 mb-3">Desafios em aberto</h2>
          <div className="space-y-2">
            {openChallenges.length === 0 && <p className="text-sm text-gray-500">Nenhum desafio em aberto.</p>}
            {openChallenges.map(c => (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-white">
                    {nameOf(c.challenger_id)} <span className="text-gray-500">desafia</span> {nameOf(c.challenged_id)}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {LADDER_CHALLENGE_STATUS_LABELS[c.status]} · prazo {c.deadline}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={woAction}>
                    <input type="hidden" name="challenge_id" value={c.id} />
                    <input type="hidden" name="winner_id" value={c.challenger_id} />
                    <button type="submit" className="text-xs text-lime-400 hover:text-lime-300 font-medium">
                      W.O. p/ {nameOf(c.challenger_id)}
                    </button>
                  </form>
                  <form action={woAction}>
                    <input type="hidden" name="challenge_id" value={c.id} />
                    <input type="hidden" name="winner_id" value={c.challenged_id} />
                    <button type="submit" className="text-xs text-lime-400 hover:text-lime-300 font-medium">
                      W.O. p/ {nameOf(c.challenged_id)}
                    </button>
                  </form>
                  <form action={cancelAction}>
                    <input type="hidden" name="challenge_id" value={c.id} />
                    <button type="submit" className="text-xs text-red-400 hover:text-red-300 font-medium">
                      Cancelar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>

          <h2 className="font-semibold text-white mt-8 mb-3">Histórico de desafios</h2>
          <div className="space-y-2">
            {closedChallenges.length === 0 && <p className="text-sm text-gray-500">Nenhum desafio concluído ainda.</p>}
            {closedChallenges.map(c => (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm">
                <p className="text-white">
                  {nameOf(c.challenger_id)} <span className="text-gray-500">vs</span> {nameOf(c.challenged_id)}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">{LADDER_CHALLENGE_STATUS_LABELS[c.status]}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
