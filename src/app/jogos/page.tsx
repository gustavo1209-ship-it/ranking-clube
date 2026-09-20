import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Calendar, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/current-profile'
import { Navbar } from '@/components/navbar'
import { MATCH_STATUS_LABELS } from '@/types'
import type { Category, Match, Profile } from '@/types'

export default async function MeusJogosPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()

  const [{ data: matches }, { data: categories }, { data: profiles }] = await Promise.all([
    supabase
      .from('matches')
      .select('*')
      .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
      .order('scheduled_date') as unknown as Promise<{ data: Match[] | null }>,
    supabase.from('categories').select('*') as unknown as Promise<{ data: Category[] | null }>,
    supabase.from('profiles').select('*') as unknown as Promise<{ data: Profile[] | null }>,
  ])

  const categoriesById = new Map((categories ?? []).map(c => [c.id, c]))
  const profilesById = new Map((profiles ?? []).map(p => [p.id, p]))

  function opponentName(match: Match) {
    const opponentId = match.player1_id === profile!.id ? match.player2_id : match.player1_id
    return opponentId ? profilesById.get(opponentId)?.full_name || 'Participante' : '—'
  }

  const upcoming = (matches ?? []).filter(m => m.status === 'agendado')
  const past = (matches ?? []).filter(m => m.status !== 'agendado')

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.full_name} isAdmin={profile.is_admin} />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Meus jogos</h1>

        <section className="mt-8">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-lime-400" />
            Próximos
          </h2>
          <div className="space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-gray-500">Nenhum jogo agendado.</p>}
            {upcoming.map(match => (
              <Link
                key={match.id}
                href={`/jogos/${match.id}`}
                className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-lime-500/40 rounded-lg px-4 py-3 transition-colors"
              >
                <div>
                  <p className="text-white font-medium">vs {opponentName(match)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {categoriesById.get(match.category_id)?.name} · {match.scheduled_date}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-600" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-semibold text-white mb-3">Histórico</h2>
          <div className="space-y-2">
            {past.length === 0 && <p className="text-sm text-gray-500">Nenhum jogo realizado ainda.</p>}
            {past.map(match => (
              <div key={match.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">vs {opponentName(match)}</p>
                  <span className="text-xs text-gray-500">{MATCH_STATUS_LABELS[match.status]}</span>
                </div>
                <p className="text-gray-500 text-xs mt-0.5">
                  {categoriesById.get(match.category_id)?.name} · {match.scheduled_date}
                </p>
                {match.status === 'realizado' && (
                  <p className={`text-xs mt-1 font-medium ${match.winner_id === profile.id ? 'text-lime-400' : 'text-red-400'}`}>
                    {match.winner_id === profile.id ? 'Vitória' : 'Derrota'} · {match.sets_pro}-{match.sets_contra}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
