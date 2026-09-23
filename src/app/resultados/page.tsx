import Link from 'next/link'
import { Calendar, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/current-profile'
import { Navbar } from '@/components/navbar'
import type { Category, Match, Profile, Season } from '@/types'

interface Props {
  searchParams: Promise<{ categoria?: string }>
}

export default async function ResultadosPage({ searchParams }: Props) {
  const { categoria } = await searchParams
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  const { data: season } = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'ativa')
    .maybeSingle<Season>()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order') as { data: Category[] | null }

  const selectedCategoryId = categoria ?? categories?.[0]?.id

  let matches: Match[] = []
  let upcoming: Match[] = []
  let profilesById = new Map<string, Profile>()

  if (season && selectedCategoryId) {
    const [{ data: matchData }, { data: upcomingData }, { data: allProfiles }] = await Promise.all([
      supabase
        .from('matches')
        .select('*')
        .eq('season_id', season.id)
        .eq('category_id', selectedCategoryId)
        .eq('status', 'realizado')
        .order('scheduled_date', { ascending: false }) as unknown as Promise<{ data: Match[] | null }>,
      supabase
        .from('matches')
        .select('*')
        .eq('season_id', season.id)
        .eq('category_id', selectedCategoryId)
        .eq('status', 'agendado')
        .order('scheduled_date', { ascending: true }) as unknown as Promise<{ data: Match[] | null }>,
      supabase.from('profiles').select('*') as unknown as Promise<{ data: Profile[] | null }>,
    ])

    matches = matchData ?? []
    upcoming = upcomingData ?? []
    profilesById = new Map((allProfiles ?? []).map(p => [p.id, p]))
  }

  function nameOf(id: string | null) {
    if (!id) return '—'
    return profilesById.get(id)?.full_name || 'Participante'
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.full_name} isAdmin={profile?.is_admin} />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold">Resultados</h1>
        {season ? (
          <p className="text-sm text-gray-400 mt-1">Temporada: {season.name}</p>
        ) : (
          <p className="text-sm text-gray-500 mt-1">Nenhuma temporada ativa.</p>
        )}

        {categories && categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6">
            {categories.map(cat => (
              <Link
                key={cat.id}
                href={`/resultados?categoria=${cat.id}`}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-lime-500/20 border-lime-500/40 text-lime-400'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        )}

        <section className="mt-8">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-lime-400" />
            Próximos jogos
          </h2>
          <div className="space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-gray-500">Nenhum jogo agendado nesta categoria.</p>}
            {upcoming.map(match => (
              <div key={match.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm">
                <p className="text-white">
                  {nameOf(match.player1_id)} <span className="text-gray-500">vs</span> {nameOf(match.player2_id)}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">{match.scheduled_date}</p>
              </div>
            ))}
          </div>
        </section>

        <h2 className="font-semibold text-white mt-8 mb-3">Resultados</h2>
        <div className="space-y-3">
          {matches.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Trophy size={40} className="mx-auto mb-3 opacity-30" />
              <p>Nenhum resultado lançado nesta categoria ainda.</p>
            </div>
          )}

          {matches.map(match => {
            const p1Won = match.winner_id === match.player1_id
            return (
              <div key={match.id} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className={p1Won ? 'text-white font-semibold' : 'text-gray-400'}>
                        {nameOf(match.player1_id)}
                      </span>
                      <span className="text-gray-600 mx-1.5">vs</span>
                      <span className={!p1Won ? 'text-white font-semibold' : 'text-gray-400'}>
                        {nameOf(match.player2_id)}
                      </span>
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{match.scheduled_date}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(match.sets ?? []).map((set, i) => (
                      <span
                        key={i}
                        className="text-xs font-medium bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-gray-300 tabular-nums"
                      >
                        {set.p1}-{set.p2}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-lime-400 text-xs mt-2 flex items-center gap-1.5">
                  <Trophy size={12} />
                  Vencedor: {nameOf(match.winner_id)}
                </p>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
