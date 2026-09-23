import Link from 'next/link'
import { Trophy, Calendar, Swords } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/current-profile'
import { isEnrolledInSeason } from '@/lib/enrollment'
import { Navbar } from '@/components/navbar'
import { BrandMark } from '@/components/brand-mark'
import { LadderChallengeActions } from '@/components/ladder-challenge-actions'
import { ParticipationButton } from '@/components/participation-button'
import type { Category, LadderChallenge, Season } from '@/types'

export default async function HomePage() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  const { data: season } = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'ativa')
    .maybeSingle<Season>()

  let incomingChallenges: LadderChallenge[] = []
  let categoriesById = new Map<string, Category>()
  let profilesById = new Map<string, { full_name: string }>()
  let joined = false

  if (profile) {
    const serviceClient = createServiceClient()
    const [{ data: challenges }, { data: categories }, { data: profiles }] = await Promise.all([
      serviceClient
        .from('ladder_challenges')
        .select('*')
        .eq('challenged_id', profile.id)
        .eq('status', 'aguardando_aceite')
        .order('created_at', { ascending: false }) as unknown as Promise<{ data: LadderChallenge[] | null }>,
      supabase.from('categories').select('*') as unknown as Promise<{ data: Category[] | null }>,
      supabase.from('profiles').select('id, full_name') as unknown as Promise<{ data: { id: string; full_name: string }[] | null }>,
    ])
    incomingChallenges = challenges ?? []
    categoriesById = new Map((categories ?? []).map(c => [c.id, c]))
    profilesById = new Map((profiles ?? []).map(p => [p.id, p]))
    if (season) joined = await isEnrolledInSeason(supabase, season.id, profile.id)
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.full_name} isAdmin={profile?.is_admin} />

      <main className="max-w-3xl mx-auto px-4 py-20 text-center">
        {incomingChallenges.length > 0 && (
          <div className="max-w-md mx-auto mb-10 text-left space-y-2">
            {incomingChallenges.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 bg-lime-500/10 border border-lime-500/30 rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-white font-medium flex items-center gap-1.5">
                    <Swords size={14} className="text-lime-400 shrink-0" />
                    {profilesById.get(c.challenger_id)?.full_name || 'Alguém'} te desafiou
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {categoriesById.get(c.category_id)?.name} · prazo {c.deadline}
                  </p>
                </div>
                <LadderChallengeActions challengeId={c.id} />
              </div>
            ))}
          </div>
        )}

        <BrandMark size={64} className="mx-auto" />
        <h1 className="text-3xl sm:text-4xl font-black mt-4">
          Ranking Tênis <span className="text-lime-400 italic">Caça e Pesca de Veranópolis</span>
        </h1>
        <p className="text-lime-400/70 text-xs tracking-[0.3em] uppercase mt-2 font-medium">Temporada no saibro</p>
        <p className="text-gray-400 mt-4 max-w-xl mx-auto">
          Acompanhe a classificação por categoria e os confrontos sorteados automaticamente
          ao longo da temporada.
        </p>

        {season ? (
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-gray-300 bg-gray-900 border border-gray-800 rounded-full px-4 py-2">
            <Calendar size={14} className="text-lime-400" />
            Temporada ativa: <span className="font-medium text-white">{season.name}</span>
          </p>
        ) : (
          <p className="mt-6 text-sm text-gray-500">Nenhuma temporada ativa no momento.</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href="/ranking"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-600 text-gray-950 font-semibold rounded-xl transition-colors"
          >
            <Trophy size={18} />
            Ver ranking
          </Link>
          {profile ? (
            season && <ParticipationButton joined={joined} variant="hero" />
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white font-semibold rounded-xl transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
