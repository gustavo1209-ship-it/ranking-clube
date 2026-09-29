import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/current-profile'
import { Navbar } from '@/components/navbar'
import { CourtSlotButton } from '@/components/court-slot-button'
import { ReservasDatePicker } from '@/components/reservas-date-picker'
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
import type { CourtBooking, Profile } from '@/types'

interface Props {
  searchParams: Promise<{ data?: string }>
}

export default async function ReservasPage({ searchParams }: Props) {
  const { data: dateParam } = await searchParams
  const profile = await getCurrentProfile()

  const today = todayIso()
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today

  const supabase = createServiceClient()
  const [settings, days, { data: bookings }, { data: profiles }] = await Promise.all([
    getCourtBookingSettings(supabase),
    getCourtBookingDays(supabase),
    supabase.from('court_bookings').select('*').eq('booking_date', date) as unknown as Promise<{ data: CourtBooking[] | null }>,
    supabase.from('profiles').select('*') as unknown as Promise<{ data: Profile[] | null }>,
  ])

  const profilesById = new Map((profiles ?? []).map(p => [p.id, p]))
  const dayConfig = days.find(d => d.day_of_week === dayOfWeekOf(date))!
  const slots = dayConfig.enabled ? generateSlots(settings.opening_time, dayConfig.closing_time, settings.slot_duration_minutes) : []

  const bookingsByCourt = new Map(
    COURTS.map(c => [c, new Map((bookings ?? []).filter(b => b.court === c).map(b => [b.start_time.slice(0, 5), b]))])
  )

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

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.full_name} isAdmin={profile?.is_admin} />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center gap-2 text-lime-400">
          <MapPin size={16} />
          <p className="text-xs font-semibold tracking-wider uppercase">Reserva de quadras</p>
        </div>
        <h1 className="text-2xl font-bold text-white mt-1">Quadras A e B</h1>

        <div className="flex items-center justify-between gap-3 mt-6 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex-wrap">
          <Link href={`/reservas?data=${prevDate}`} className="text-sm text-gray-400 hover:text-white shrink-0">
            ← Anterior
          </Link>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <p className="text-sm text-white font-medium capitalize">{dateLabel}</p>
            {date !== today && (
              <Link href="/reservas" className="text-xs text-lime-400 hover:text-lime-300 font-medium">
                Hoje
              </Link>
            )}
            <ReservasDatePicker date={date} />
          </div>
          <Link href={`/reservas?data=${nextDate}`} className="text-sm text-gray-400 hover:text-white shrink-0">
            Próximo →
          </Link>
        </div>

        {!profile && <p className="text-sm text-gray-500 mt-4">Entre na sua conta para reservar um horário.</p>}

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {COURTS.map(court => {
            const bookingsByStart = bookingsByCourt.get(court)!
            return (
              <div key={court}>
                <h2 className="text-white font-semibold mb-3">Quadra {court}</h2>

                {!dayConfig.enabled ? (
                  <p className="text-sm text-gray-500 text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
                    Quadras fechadas neste dia.
                  </p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
                    Nenhum horário configurado para este dia.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
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
                          booking={
                            booking ? { id: booking.id, name: profilesById.get(booking.profile_id)?.full_name || 'Reservado' } : null
                          }
                          canCancel={bookedByMe || Boolean(profile?.is_admin)}
                          disabledPast={disabledPast}
                          loggedIn={Boolean(profile)}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
