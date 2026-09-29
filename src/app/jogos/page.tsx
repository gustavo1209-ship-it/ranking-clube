import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Calendar, ChevronRight, MapPin, Swords } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/current-profile'
import { Navbar } from '@/components/navbar'
import { LadderChallengeActions } from '@/components/ladder-challenge-actions'
import { CancelChallengeButton } from '@/components/cancel-challenge-button'
import { CancelBookingButton } from '@/components/cancel-booking-button'
import { getCourtNames, todayIso } from '@/lib/court-bookings'
import { LADDER_CHALLENGE_STATUS_LABELS, MATCH_STATUS_LABELS } from '@/types'
import type { Category, CourtBooking, LadderChallenge, Match, Profile } from '@/types'

export default async function MeusJogosPage() {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()
  const serviceClient = createServiceClient()

  const [{ data: matches }, { data: categories }, { data: profiles }, { data: challenges }, { data: bookings }, courtNames] =
    await Promise.all([
      supabase
        .from('matches')
        .select('*')
        .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
        .order('scheduled_date') as unknown as Promise<{ data: Match[] | null }>,
      supabase.from('categories').select('*') as unknown as Promise<{ data: Category[] | null }>,
      supabase.from('profiles').select('*') as unknown as Promise<{ data: Profile[] | null }>,
      serviceClient
        .from('ladder_challenges')
        .select('*')
        .or(`challenger_id.eq.${profile.id},challenged_id.eq.${profile.id}`)
        .in('status', ['aguardando_aceite', 'aceito'])
        .order('created_at', { ascending: false }) as unknown as Promise<{ data: LadderChallenge[] | null }>,
      supabase
        .from('court_bookings')
        .select('*')
        .eq('profile_id', profile.id)
        .gte('booking_date', todayIso())
        .order('booking_date') as unknown as Promise<{ data: CourtBooking[] | null }>,
      getCourtNames(serviceClient),
    ])

  const categoriesById = new Map((categories ?? []).map(c => [c.id, c]))
  const profilesById = new Map((profiles ?? []).map(p => [p.id, p]))
  const incomingChallenges = (challenges ?? []).filter(c => c.challenged_id === profile.id)
  const outgoingChallenges = (challenges ?? []).filter(c => c.challenger_id === profile.id)

  function opponentName(match: Match) {
    const opponentId = match.player1_id === profile!.id ? match.player2_id : match.player1_id
    return opponentId ? profilesById.get(opponentId)?.full_name || 'Participante' : '—'
  }

  const upcomingMatches = (matches ?? []).filter(m => m.status === 'agendado')
  const past = (matches ?? []).filter(m => m.status !== 'agendado')
  const upcomingBookings = bookings ?? []

  type UpcomingItem =
    | { kind: 'match'; sortKey: string; match: Match }
    | { kind: 'reserva'; sortKey: string; booking: CourtBooking }

  const upcoming: UpcomingItem[] = [
    ...upcomingMatches.map(match => ({ kind: 'match' as const, sortKey: `${match.scheduled_date} 00:00`, match })),
    ...upcomingBookings.map(booking => ({
      kind: 'reserva' as const,
      sortKey: `${booking.booking_date} ${booking.start_time}`,
      booking,
    })),
  ].sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0))

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.full_name} isAdmin={profile.is_admin} />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Meus jogos</h1>

        {(incomingChallenges.length > 0 || outgoingChallenges.length > 0) && (
          <section className="mt-8">
            <h2 className="font-semibold text-white flex items-center gap-2 mb-3">
              <Swords size={16} className="text-lime-400" />
              Meus desafios
            </h2>
            <div className="space-y-2">
              {incomingChallenges.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-white font-medium">{profilesById.get(c.challenger_id)?.full_name || 'Participante'} te desafiou</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {categoriesById.get(c.category_id)?.name} · prazo {c.deadline}
                    </p>
                  </div>
                  <LadderChallengeActions challengeId={c.id} />
                </div>
              ))}
              {outgoingChallenges.map(c => (
                <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">
                        Desafio enviado a {profilesById.get(c.challenged_id)?.full_name || 'Participante'}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {categoriesById.get(c.category_id)?.name} · {LADDER_CHALLENGE_STATUS_LABELS[c.status]} · prazo {c.deadline}
                      </p>
                    </div>
                    {c.status === 'aguardando_aceite' && <CancelChallengeButton challengeId={c.id} />}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-semibold text-white flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-lime-400" />
            Próximos
          </h2>
          <div className="space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-gray-500">Nenhum jogo agendado.</p>}
            {upcoming.map(item =>
              item.kind === 'match' ? (
                <Link
                  key={`match-${item.match.id}`}
                  href={`/jogos/${item.match.id}`}
                  className="flex items-center justify-between bg-gray-900 border border-gray-800 hover:border-lime-500/40 rounded-lg px-4 py-3 transition-colors"
                >
                  <div>
                    <p className="text-white font-medium">vs {opponentName(item.match)}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {categoriesById.get(item.match.category_id)?.name} · {item.match.scheduled_date}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-600" />
                </Link>
              ) : (
                <div
                  key={`reserva-${item.booking.id}`}
                  className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-white font-medium flex items-center gap-1.5">
                      <MapPin size={14} className="text-lime-400" />
                      {courtNames[item.booking.court]}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {item.booking.booking_date} · {item.booking.start_time.slice(0, 5)}–{item.booking.end_time.slice(0, 5)}
                    </p>
                  </div>
                  <CancelBookingButton bookingId={item.booking.id} />
                </div>
              )
            )}
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
