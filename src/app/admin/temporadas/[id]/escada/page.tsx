import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { expireOverdueLadderChallenges } from '@/lib/ladder'
import { setPlayerLadderStatus, movePlayerManually } from './actions'
import { cancelChallengeAdmin, markChallengeWO } from '@/app/admin/desafios/actions'
import { ArrowUpDown } from 'lucide-react'
import {
  LADDER_CHALLENGE_STATUS_LABELS,
  LADDER_PLAYER_STATUS_LABELS,
} from '@/types'
import type { Category, LadderChallenge, LadderPlayerStatus, LadderPosition, Profile, Season, Standing } from '@/types'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ categoria?: string }>
}

const STATUS_OPTIONS: LadderPlayerStatus[] = ['ativo', 'inativo', 'afastado']

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

  async function moveAction(formData: FormData) {
    'use server'
    const profileId = String(formData.get('profile_id'))
    const catId = String(formData.get('category_id'))
    const newPosition = Number(formData.get('position'))
    if (!profileId || !catId || !newPosition) return
    await movePlayerManually(seasonId, catId, profileId, newPosition)
  }

  async function statusAction(formData: FormData) {
    'use server'
    const profileId = String(formData.get('profile_id'))
    const catId = String(formData.get('category_id'))
    const status = String(formData.get('status')) as LadderPlayerStatus
    await setPlayerLadderStatus(seasonId, catId, profileId, status)
  }

  async function cancelAction(formData: FormData) {
    'use server'
    await cancelChallengeAdmin(String(formData.get('challenge_id')))
  }

  async function woAction(formData: FormData) {
    'use server'
    await markChallengeWO(String(formData.get('challenge_id')), String(formData.get('winner_id')))
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-left">
                  <th className="pb-3 pr-4 font-medium w-10">#</th>
                  <th className="pb-3 pr-4 font-medium">Jogador</th>
                  <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">J</th>
                  <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">V</th>
                  <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">D</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Mover para</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {(positions ?? []).map(pos => {
                  const stats = standingsByProfile.get(pos.profile_id)
                  return (
                    <tr key={pos.id}>
                      <td className="py-2 pr-4 text-gray-400 font-medium">{pos.position}</td>
                      <td className="py-2 pr-4 text-white font-medium">{nameOf(pos.profile_id)}</td>
                      <td className="py-2 pr-4 text-center hidden sm:table-cell text-gray-400">{stats?.partidas_jogadas ?? 0}</td>
                      <td className="py-2 pr-4 text-center hidden sm:table-cell text-green-400">{stats?.vitorias ?? 0}</td>
                      <td className="py-2 pr-4 text-center hidden sm:table-cell text-red-400">{stats?.derrotas ?? 0}</td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-1">
                          {STATUS_OPTIONS.map(status => (
                            <form action={statusAction} key={status}>
                              <input type="hidden" name="profile_id" value={pos.profile_id} />
                              <input type="hidden" name="category_id" value={categoryId} />
                              <input type="hidden" name="status" value={status} />
                              <button
                                type="submit"
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  pos.player_status === status
                                    ? 'bg-lime-500/20 text-lime-400'
                                    : 'text-gray-500 hover:text-gray-300'
                                }`}
                              >
                                {LADDER_PLAYER_STATUS_LABELS[status]}
                              </button>
                            </form>
                          ))}
                        </div>
                      </td>
                      <td className="py-2">
                        <form action={moveAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="profile_id" value={pos.profile_id} />
                          <input type="hidden" name="category_id" value={categoryId} />
                          <input
                            type="number"
                            name="position"
                            min={1}
                            max={(positions ?? []).length}
                            defaultValue={pos.position}
                            className="w-14 px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center text-xs"
                          />
                          <button type="submit" className="text-gray-500 hover:text-lime-400">
                            <ArrowUpDown size={14} />
                          </button>
                        </form>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
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
