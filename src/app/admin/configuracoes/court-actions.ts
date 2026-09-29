'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'

export interface CourtSettingsActionResult {
  ok: boolean
  message: string
}

export async function setCourtBookingGeneral(slotDurationMinutes: number, openingTime: string): Promise<CourtSettingsActionResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('court_booking_settings')
    .update({
      slot_duration_minutes: slotDurationMinutes,
      opening_time: openingTime,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'default')

  if (error) return { ok: false, message: error.message }

  revalidatePath('/admin/configuracoes')
  revalidatePath('/reservas')
  return { ok: true, message: 'Configuração salva.' }
}

export async function setCourtBookingDay(dayOfWeek: number, enabled: boolean, closingTime: string): Promise<CourtSettingsActionResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase.from('court_booking_days').upsert(
    {
      day_of_week: dayOfWeek,
      enabled,
      closing_time: closingTime,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'day_of_week' }
  )

  if (error) return { ok: false, message: error.message }

  revalidatePath('/admin/configuracoes')
  revalidatePath('/reservas')
  return { ok: true, message: 'Dia atualizado.' }
}
