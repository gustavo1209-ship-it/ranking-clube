import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/current-profile'
import { Navbar } from '@/components/navbar'
import { RankingTable, type RankingRow } from '@/components/ranking-table'
import type { Category, Match, Profile, Season, Standing } from '@/types'

interface Props {
  searchParams: Promise<{ categoria?: string }>
}

export default async function RankingPage({ searchParams }: Props) {
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

  let rows: RankingRow[] = []
  let upcoming: Match[] = []
  let recent: Match[] = []
  let profilesById = new Map<string, Profile>()

  if (season && selectedCategoryId) {
    const [{ data: standings }, { data: matches }, { data: allProfiles }] = await Promise.all([
      supabase
        .from('standings')
        .select('*')
        .eq('season_id', season.id)
        .eq('category_id', selectedCategoryId) as unknown as Promise<{ data: Standing[] | null }>,
      supabase
        .from('matches')
        .select('*')
        .eq('season_id', season.id)
        .eq('category_id', selectedCategoryId)
        .order('scheduled_date') as unknown as Promise<{ data: Match[] | null }>,
      supabase.from('profiles').select('*') as unknown as Promise<{ data: Profile[] | null }>,
    ])

    profilesById = new Map((allProfiles ?? []).map(p => [p.id, p]))

    rows = (standings ?? []).map(s => ({
      profile_id: s.profile_id,
      name: profilesById.get(s.profile_id)?.full_name || 'Participante',
      partidas_jogadas: s.partidas_jogadas,
      vitorias: s.vitorias,
      derrotas: s.derrotas,
      sets_pro: s.sets_pro,
      sets_contra: s.sets_contra,
      games_pro: s.games_pro,
      games_contra: s.games_contra,
      pontos: s.pontos,
    }))

    upcoming = (matches ?? []).filter(m => m.status === 'agendado').slice(0, 10)
    recent = (matches ?? [])
      .filter(m => m.status === 'realizado')
      .sort((a, b) => (a.scheduled_date < b.scheduled_date ? 1 : -1))
      .slice(0, 10)
  }

  function nameOf(id: string | null) {
    if (!id) return '—'
    return profilesById.get(id)?.full_name || 'Participante'
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.full_name} isAdmin={profile?.is_admin} />

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Ranking</h1>
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
                href={`/ranking?categoria=${cat.id}`}
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

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-6">
          <RankingTable rows={rows} currentUserId={profile?.id} />
        </div>

        <div className="grid sm:grid-cols-2 gap-6 mt-8">
          <div>
            <h2 className="font-semibold text-white flex items-center gap-2 mb-3">
              <Calendar size={16} className="text-lime-400" />
              Próximos jogos
            </h2>
            <div className="space-y-2">
              {upcoming.length === 0 && <p className="text-sm text-gray-500">Nenhum jogo agendado.</p>}
              {upcoming.map(match => (
                <div key={match.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm">
                  <p className="text-white">{nameOf(match.player1_id)} <span className="text-gray-500">vs</span> {nameOf(match.player2_id)}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{match.scheduled_date}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-white mb-3">Últimos resultados</h2>
            <div className="space-y-2">
              {recent.length === 0 && <p className="text-sm text-gray-500">Nenhum resultado ainda.</p>}
              {recent.map(match => (
                <div key={match.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2.5 text-sm">
                  <p className="text-white">
                    {nameOf(match.player1_id)} <span className="text-gray-500">vs</span> {nameOf(match.player2_id)}
                  </p>
                  <p className="text-lime-400 text-xs mt-0.5">
                    Vencedor: {nameOf(match.winner_id)} · {match.sets_pro}-{match.sets_contra}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
