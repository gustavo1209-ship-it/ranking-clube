'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { handleNewEnrollment } from '@/lib/enrollment'

export async function enroll(seasonId: string, categoryId: string, profileId: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('enrollments').insert({ season_id: seasonId, category_id: categoryId, profile_id: profileId })
  await handleNewEnrollment(supabase, seasonId, categoryId, profileId)

  revalidatePath(`/admin/temporadas/${seasonId}/participantes`)
  revalidatePath(`/admin/temporadas/${seasonId}/escada`)
}

export async function unenroll(seasonId: string, categoryId: string, profileId: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase
    .from('enrollments')
    .delete()
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .eq('profile_id', profileId)
  revalidatePath(`/admin/temporadas/${seasonId}/participantes`)
}

export interface EnrollAllResult {
  ok: boolean
  message: string
}

export async function enrollAll(seasonId: string, categoryId: string): Promise<EnrollAllResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const [{ data: profiles }, { data: existing }] = await Promise.all([
    supabase.from('profiles').select('id'),
    supabase.from('enrollments').select('profile_id').eq('season_id', seasonId).eq('category_id', categoryId),
  ])

  const existingIds = new Set((existing ?? []).map(e => e.profile_id))
  const toAdd = (profiles ?? []).map(p => p.id as string).filter(id => !existingIds.has(id))

  if (toAdd.length === 0) {
    return { ok: true, message: 'Todos já estão inscritos.' }
  }

  await supabase.from('enrollments').insert(
    toAdd.map(profileId => ({ season_id: seasonId, category_id: categoryId, profile_id: profileId }))
  )

  for (const profileId of toAdd) {
    await handleNewEnrollment(supabase, seasonId, categoryId, profileId)
  }

  revalidatePath(`/admin/temporadas/${seasonId}/participantes`)
  revalidatePath(`/admin/temporadas/${seasonId}/escada`)
  return { ok: true, message: `${toAdd.length} jogador(es) inscrito(s).` }
}
