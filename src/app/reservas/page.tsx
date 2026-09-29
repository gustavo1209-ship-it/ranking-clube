import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/current-profile'
import { Navbar } from '@/components/navbar'
import { CourtSlotButton } from '@/components/court-slot-button'
import {
  COURTS,
  addDaysIso,
  dayOfWeekOf,
  generateSlots,
  getCourtBookingDays,
  getCourtBookingSettings,
  nowHHMM,
  todayIso,
} from '@/lib/court-bookings'
import type { CourtBooking, CourtName, Profile } from '@/types'

interface Props {
  searchParams: Promise<{ data?: string; quadra?: string }>
}

export default async function ReservasPage({ searchParams }: Props) {
  const { data: dateParam, quadra } = await searchParams
  const profile = await getCurrentProfile()

  const today = todayIso()
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today
  const court: CourtName = quadra === 'B' ? 'B' : 'A'

  const supabase = createServiceClient()
  const [settings, days, { data: bookings }, { data: profiles }] = await Promise.all([
    getCourtBookingSettings(supabase),
    getCourtBookingDays(supabase),
    supabase
      .from('court_bookings')
      .select('*')
      .eq('booking_date', date)
      .eq('court', court) as unknown as Promise<{ data: CourtBooking[] | null }>,
    supabase.from('profiles').select('*') as unknown as Promise<{ data: Profile[] | null }>,
  ])

  const profilesById = new Map((profiles ?? []).map(p => [p.id, p]))
  const dayConfig = days.find(d => d.day_of_week === dayOfWeekOf(date))!
  const slots = dayConfig.enabled ? generateSlots(settings.opening_time, dayConfig.closing_time, settings.slot_duration_minutes) : []
  const bookingsByStart = new Map((bookings ?? []).map(b => [b.start_time.slice(0, 5), b]))

  const prevDate = addDaysIso(date, -1)
  const nextDate = addDaysIso(date, 1)
  const isPastDate = date < today
  const currentTime = nowHHMM()

  const dateLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  })

  function hrefFor(d: string, c: CourtName) {
    return `/reservas?data=${d}&quadra=${c}`
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.full_name} isAdmin={profile?.is_admin} />

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-lime-400">
          <MapPin size={16} />
          <p className="text-xs font-semibold tracking-wider uppercase">Reserva de quadras</p>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1">Quadras A e B</h1>

        <div className="flex flex-wrap gap-2 mt-6">
          {COURTS.map(c => (
            <Link
              key={c}
              href={hrefFor(date, c)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                court === c
                  ? 'bg-lime-500/20 border-lime-500/40 text-lime-400'
                  : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Quadra {c}
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
          <Link href={hrefFor(prevDate, court)} className="text-sm text-gray-400 hover:text-white">
            ← Anterior
          </Link>
          <p className="text-sm text-white font-medium capitalize">{dateLabel}</p>
          <Link href={hrefFor(nextDate, court)} className="text-sm text-gray-400 hover:text-white">
            Próximo →
          </Link>
        </div>

        {!profile && <p className="text-sm text-gray-500 mt-4">Entre na sua conta para reservar um horário.</p>}

        <div className="mt-6">
          {!dayConfig.enabled ? (
            <p className="text-sm text-gray-500 text-center py-12">Quadras fechadas neste dia.</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">Nenhum horário configurado para este dia.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {slots.map(slot => {
                const booking = bookingsByStart.get(slot.start)
                const bookedByMe = Boolean(booking && profile && booking.profile_id === profile.id)
                const disabledPast = isPastDate || (date === today && slot.start <= currentTime)
                return (
                  <CourtSlotButton
                    key={slot.start}
                    court={court}
                    date={date}
                    slotStart={slot.start}
                    slotEnd={slot.end}
                    booking={booking ? { id: booking.id, name: profilesById.get(booking.profile_id)?.full_name || 'Reservado' } : null}
                    canCancel={bookedByMe || Boolean(profile?.is_admin)}
                    disabledPast={disabledPast}
                    loggedIn={Boolean(profile)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
