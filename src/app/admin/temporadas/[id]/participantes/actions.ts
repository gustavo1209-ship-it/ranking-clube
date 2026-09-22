'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { appendToLadderBottom, getRankingSettings, settingsWithDefaults } from '@/lib/ladder'

export async function enroll(seasonId: string, categoryId: string, profileId: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('enrollments').insert({ season_id: seasonId, category_id: categoryId, profile_id: profileId })

  const settings = settingsWithDefaults(await getRankingSettings(supabase, seasonId, categoryId))
  if (settings.ranking_model === 'escada') {
    const { data: existingPositions } = await supabase
      .from('ladder_positions')
      .select('id')
      .eq('season_id', seasonId)
      .eq('category_id', categoryId)
      .limit(1)
    if (existingPositions && existingPositions.length > 0) {
      await appendToLadderBottom(supabase, seasonId, categoryId, profileId)
    }
  }

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
