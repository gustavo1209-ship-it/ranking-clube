import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/current-profile'
import { Navbar } from '@/components/navbar'
import { JoinSeasonButton } from '@/components/join-season-button'
import { Trophy } from 'lucide-react'
import type { Category, Season } from '@/types'

export default async function ParticiparPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()

  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'ativa')
    .maybeSingle<Season>()

  let season = activeSeason

  if (!season) {
    const { data: draftSeason } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'rascunho')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<Season>()
    season = draftSeason
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order') as { data: Category[] | null }

  const { data: myEnrollments } = season
    ? await supabase.from('enrollments').select('category_id').eq('season_id', season.id).eq('profile_id', profile.id)
    : { data: [] }

  const joinedCategoryIds = new Set((myEnrollments ?? []).map(e => e.category_id))

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.full_name} isAdmin={profile.is_admin} />

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Participar da temporada</h1>

        {!season ? (
          <p className="text-sm text-gray-500 mt-4">
            Nenhuma temporada aberta para inscrição no momento. Fale com o admin do clube.
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-400 mt-1">
              {season.name} · {season.status === 'ativa' ? 'Ativa' : 'Inscrições abertas'}
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Escolha em quais categorias você quer participar. O admin vai iniciar a temporada
              quando todo mundo estiver inscrito.
            </p>

            <div className="mt-6 space-y-2">
              {(categories ?? []).map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Trophy size={16} className="text-lime-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white font-medium">{cat.name}</p>
                      {cat.description && <p className="text-sm text-gray-500 truncate">{cat.description}</p>}
                    </div>
                  </div>
                  <JoinSeasonButton
                    seasonId={season.id}
                    categoryId={cat.id}
                    joined={joinedCategoryIds.has(cat.id)}
                  />
                </div>
              ))}
              {(categories ?? []).length === 0 && (
                <p className="text-sm text-gray-500">Nenhuma categoria cadastrada ainda.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
