'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/current-profile'
import { generateSlots, getCourtBookingDays, getCourtBookingSettings, dayOfWeekOf, nowHHMM, todayIso } from '@/lib/court-bookings'
import type { CourtName } from '@/types'

export interface BookingActionResult {
  ok: boolean
  message: string
}

export async function createBooking(court: CourtName, date: string, startTime: string): Promise<BookingActionResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, message: 'Você precisa estar logado.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: 'Data inválida.' }

  const today = todayIso()
  if (date < today) return { ok: false, message: 'Não é possível reservar uma data que já passou.' }
  if (date === today && startTime <= nowHHMM()) return { ok: false, message: 'Esse horário já passou.' }

  const supabase = createServiceClient()
  const [settings, days] = await Promise.all([getCourtBookingSettings(supabase), getCourtBookingDays(supabase)])

  const dayConfig = days.find(d => d.day_of_week === dayOfWeekOf(date))
  if (!dayConfig?.enabled) return { ok: false, message: 'Não há reservas neste dia.' }

  const slot = generateSlots(settings.opening_time, dayConfig.closing_time, settings.slot_duration_minutes).find(
    s => s.start === startTime
  )
  if (!slot) return { ok: false, message: 'Horário indisponível.' }

  if (settings.max_bookings_per_player !== null) {
    const { count } = await supabase
      .from('court_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', profile.id)
      .gte('booking_date', today)
    if ((count ?? 0) >= settings.max_bookings_per_player) {
      return {
        ok: false,
        message: `Você já atingiu o limite de ${settings.max_bookings_per_player} reserva(s) ativa(s). Cancele uma para reservar outra.`,
      }
    }
  }

  const { error } = await supabase.from('court_bookings').insert({
    court,
    booking_date: date,
    start_time: slot.start,
    end_time: slot.end,
    profile_id: profile.id,
  })

  if (error) {
    if (error.code === '23505') return { ok: false, message: 'Esse horário acabou de ser reservado por outra pessoa.' }
    return { ok: false, message: 'Não foi possível criar a reserva.' }
  }

  revalidatePath('/reservas')
  return { ok: true, message: `Quadra ${court} reservada para ${date} às ${slot.start}.` }
}

export async function cancelBooking(bookingId: string): Promise<BookingActionResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, message: 'Você precisa estar logado.' }

  const supabase = createServiceClient()
  const { data: booking } = await supabase.from('court_bookings').select('*').eq('id', bookingId).single()
  if (!booking) return { ok: false, message: 'Reserva não encontrada.' }
  if (booking.profile_id !== profile.id && !profile.is_admin) {
    return { ok: false, message: 'Você não pode cancelar essa reserva.' }
  }

  await supabase.from('court_bookings').delete().eq('id', bookingId)

  revalidatePath('/reservas')
  return { ok: true, message: 'Reserva cancelada.' }
}
