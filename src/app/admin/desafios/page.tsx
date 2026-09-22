import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { expireOverdueLadderChallenges } from '@/lib/ladder'
import { cancelChallengeAdmin, markChallengeWO } from './actions'
import { LADDER_CHALLENGE_STATUS_LABELS } from '@/types'
import type { Category, LadderChallenge, Profile, Season } from '@/types'

export default async function DesafiosAdminPage() {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: openPairs } = await supabase
    .from('ladder_challenges')
    .select('season_id, category_id')
    .in('status', ['aguardando_aceite', 'aceito'])

  const uniquePairs = new Map((openPairs ?? []).map(p => [`${p.season_id}:${p.category_id}`, p]))
  await Promise.all(
    Array.from(uniquePairs.values()).map(p => expireOverdueLadderChallenges(supabase, p.season_id, p.category_id))
  )

  const [{ data: challenges }, { data: seasons }, { data: categories }, { data: profiles }] = await Promise.all([
    supabase.from('ladder_challenges').select('*').order('created_at', { ascending: false }) as unknown as Promise<{ data: LadderChallenge[] | null }>,
    supabase.from('seasons').select('*') as unknown as Promise<{ data: Season[] | null }>,
    supabase.from('categories').select('*') as unknown as Promise<{ data: Category[] | null }>,
    supabase.from('profiles').select('*') as unknown as Promise<{ data: Profile[] | null }>,
  ])

  const seasonsById = new Map((seasons ?? []).map(s => [s.id, s]))
  const categoriesById = new Map((categories ?? []).map(c => [c.id, c]))
  const profilesById = new Map((profiles ?? []).map(p => [p.id, p]))
  const nameOf = (id: string | null) => (id ? profilesById.get(id)?.full_name || 'Participante' : '—')

  async function cancelAction(formData: FormData) {
    'use server'
    await cancelChallengeAdmin(String(formData.get('challenge_id')))
  }

  async function woAction(formData: FormData) {
    'use server'
    await markChallengeWO(String(formData.get('challenge_id')), String(formData.get('winner_id')))
  }

  const openStatuses = ['aguardando_aceite', 'aceito', 'agendado']
  const open = (challenges ?? []).filter(c => openStatuses.includes(c.status))
  const closed = (challenges ?? []).filter(c => !openStatuses.includes(c.status))

  return (
    <div>
      <h1 className="text-2xl font-bold">Desafios da escada</h1>
      <p className="text-sm text-gray-400 mt-1">Todos os desafios de todas as temporadas e categorias.</p>

      <h2 className="font-semibold text-white mt-8 mb-3">Em aberto</h2>
      <div className="space-y-2">
        {open.length === 0 && <p className="text-sm text-gray-500">Nenhum desafio em aberto.</p>}
        {open.map(c => (
          <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-white">
                {nameOf(c.challenger_id)} <span className="text-gray-500">desafia</span> {nameOf(c.challenged_id)}
              </p>
              <p className="text-gray-500 text-xs mt-0.5">
                {seasonsById.get(c.season_id)?.name} · {categoriesById.get(c.category_id)?.name} ·{' '}
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

      <h2 className="font-semibold text-white mt-8 mb-3">Histórico</h2>
      <div className="space-y-2">
        {closed.length === 0 && <p className="text-sm text-gray-500">Nenhum desafio concluído ainda.</p>}
        {closed.map(c => (
          <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm">
            <p className="text-white">
              {nameOf(c.challenger_id)} <span className="text-gray-500">vs</span> {nameOf(c.challenged_id)}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {seasonsById.get(c.season_id)?.name} · {categoriesById.get(c.category_id)?.name} ·{' '}
              {LADDER_CHALLENGE_STATUS_LABELS[c.status]}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
