'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'

export async function enroll(seasonId: string, categoryId: string, profileId: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('enrollments').insert({ season_id: seasonId, category_id: categoryId, profile_id: profileId })
  revalidatePath(`/admin/temporadas/${seasonId}/participantes`)
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
