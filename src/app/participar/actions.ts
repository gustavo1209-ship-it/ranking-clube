'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/current-profile'
import { handleNewEnrollment } from '@/lib/enrollment'

export interface JoinResult {
  ok: boolean
  message: string
}

export async function joinSeason(seasonId: string, categoryId: string): Promise<JoinResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, message: 'Você precisa estar logado.' }

  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .eq('profile_id', profile.id)
    .maybeSingle()
  if (existing) return { ok: true, message: 'Você já está inscrito nessa categoria.' }

  const { error } = await supabase
    .from('enrollments')
    .insert({ season_id: seasonId, category_id: categoryId, profile_id: profile.id })
  if (error) return { ok: false, message: 'Não foi possível te inscrever.' }

  await handleNewEnrollment(supabase, seasonId, categoryId, profile.id)

  revalidatePath('/participar')
  revalidatePath('/')
  return { ok: true, message: 'Inscrição confirmada!' }
}

export async function leaveSeason(seasonId: string, categoryId: string): Promise<JoinResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, message: 'Você precisa estar logado.' }

  const supabase = createServiceClient()
  await supabase
    .from('enrollments')
    .delete()
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .eq('profile_id', profile.id)

  revalidatePath('/participar')
  revalidatePath('/')
  return { ok: true, message: 'Inscrição cancelada.' }
}
