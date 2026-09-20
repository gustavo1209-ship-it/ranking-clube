'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { generateSeasonSchedule } from '@/lib/scheduler'

export async function createSeason(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') || '').trim()
  const startDate = String(formData.get('start_date') || '')
  const endDate = String(formData.get('end_date') || '')
  if (!name || !startDate || !endDate) return

  const supabase = createServiceClient()
  await supabase.from('seasons').insert({ name, start_date: startDate, end_date: endDate })

  revalidatePath('/admin/temporadas')
}

export async function activateSeason(id: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('seasons').update({ status: 'encerrada' }).eq('status', 'ativa')
  await supabase.from('seasons').update({ status: 'ativa' }).eq('id', id)
  revalidatePath('/admin/temporadas')
  revalidatePath(`/admin/temporadas/${id}`)
}

export async function finishSeason(id: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('seasons').update({ status: 'encerrada' }).eq('id', id)
  revalidatePath('/admin/temporadas')
  revalidatePath(`/admin/temporadas/${id}`)
}

export interface GenerateScheduleResult {
  ok: boolean
  message: string
}

export async function generateCategorySchedule(seasonId: string, categoryId: string): Promise<GenerateScheduleResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).single()
  if (!season) return { ok: false, message: 'Temporada não encontrada.' }

  const { data: existing } = await supabase
    .from('matches')
    .select('id, status')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)

  const hasPlayed = (existing ?? []).some(m => m.status !== 'agendado')
  if (hasPlayed) {
    return { ok: false, message: 'Já existem partidas realizadas nesta categoria — não é possível regenerar o calendário.' }
  }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('profile_id')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)

  const playerIds = (enrollments ?? []).map(e => e.profile_id)

  if (playerIds.length < 2) {
    return { ok: false, message: 'É preciso pelo menos 2 participantes inscritos nesta categoria.' }
  }

  const schedule = generateSeasonSchedule({
    playerIds,
    seasonStart: season.start_date,
    seasonEnd: season.end_date,
    seed: `${seasonId}:${categoryId}`,
  })

  await supabase.from('matches').delete().eq('season_id', seasonId).eq('category_id', categoryId)
  await supabase.from('matches').insert(
    schedule.map(m => ({
      season_id: seasonId,
      category_id: categoryId,
      round_number: m.roundNumber,
      player1_id: m.player1Id,
      player2_id: m.player2Id,
      scheduled_date: m.scheduledDate,
    }))
  )

  revalidatePath(`/admin/temporadas/${seasonId}`)
  revalidatePath('/ranking')

  return { ok: true, message: `${schedule.length} partidas geradas.` }
}
