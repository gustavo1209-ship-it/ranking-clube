'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { initLadderPositions, movePlayerToPosition } from '@/lib/ladder'
import type { LadderPlayerStatus, RankingModel } from '@/types'

export interface LadderActionResult {
  ok: boolean
  message: string
}

export async function setRankingModel(
  seasonId: string,
  categoryId: string,
  model: RankingModel,
  settings: { maxGap: number; daysToPlay: number; rematchDays: number }
): Promise<LadderActionResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase.from('category_ranking_settings').upsert(
    {
      season_id: seasonId,
      category_id: categoryId,
      ranking_model: model,
      ladder_max_challenge_gap: settings.maxGap,
      ladder_days_to_play: settings.daysToPlay,
      ladder_rematch_days: settings.rematchDays,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'season_id,category_id' }
  )

  if (error) return { ok: false, message: error.message }

  revalidatePath(`/admin/temporadas/${seasonId}`)
  revalidatePath(`/admin/temporadas/${seasonId}/escada`)
  revalidatePath('/ranking')
  return { ok: true, message: model === 'escada' ? 'Modelo definido como Escada.' : 'Modelo definido como Pontuação.' }
}

export async function initLadder(seasonId: string, categoryId: string): Promise<LadderActionResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  try {
    const count = await initLadderPositions(supabase, seasonId, categoryId)
    revalidatePath(`/admin/temporadas/${seasonId}`)
    revalidatePath(`/admin/temporadas/${seasonId}/escada`)
    revalidatePath('/ranking')
    return { ok: true, message: `Escada iniciada com ${count} jogadores.` }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Não foi possível iniciar a escada.' }
  }
}

export async function setPlayerLadderStatus(
  seasonId: string,
  categoryId: string,
  profileId: string,
  status: LadderPlayerStatus
) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase
    .from('ladder_positions')
    .update({ player_status: status, updated_at: new Date().toISOString() })
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .eq('profile_id', profileId)

  revalidatePath(`/admin/temporadas/${seasonId}/escada`)
  revalidatePath('/ranking')
}

export async function movePlayerManually(
  seasonId: string,
  categoryId: string,
  profileId: string,
  newPosition: number
): Promise<LadderActionResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  try {
    await movePlayerToPosition(supabase, {
      seasonId,
      categoryId,
      profileId,
      newPosition,
      reason: 'ajuste_admin',
    })
    revalidatePath(`/admin/temporadas/${seasonId}/escada`)
    revalidatePath('/ranking')
    return { ok: true, message: 'Posição atualizada.' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Não foi possível mover o jogador.' }
  }
}
