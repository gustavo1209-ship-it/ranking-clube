'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { addDaysIso, appendToLadderBottom, getRankingSettings, initLadderPositions, movePlayerToPosition, removePlayerFromLadder, settingsWithDefaults } from '@/lib/ladder'
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

export async function removePlayer(
  seasonId: string,
  categoryId: string,
  profileId: string
): Promise<LadderActionResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  try {
    await removePlayerFromLadder(supabase, seasonId, categoryId, profileId)
    revalidatePath(`/admin/temporadas/${seasonId}/escada`)
    revalidatePath(`/admin/temporadas/${seasonId}/participantes`)
    revalidatePath(`/admin/temporadas/${seasonId}`)
    revalidatePath('/ranking')
    revalidatePath('/admin/desafios')
    return { ok: true, message: 'Jogador removido da escada.' }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Não foi possível remover o jogador.' }
  }
}

export async function addPlayerToLadder(
  seasonId: string,
  categoryId: string,
  profileId: string
): Promise<LadderActionResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: existing } = await supabase
    .from('enrollments')
    .select('id')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .eq('profile_id', profileId)
    .maybeSingle()

  if (!existing) {
    await supabase.from('enrollments').insert({ season_id: seasonId, category_id: categoryId, profile_id: profileId })
  }

  await appendToLadderBottom(supabase, seasonId, categoryId, profileId)

  revalidatePath(`/admin/temporadas/${seasonId}/escada`)
  revalidatePath(`/admin/temporadas/${seasonId}/participantes`)
  revalidatePath('/ranking')
  return { ok: true, message: 'Jogador adicionado ao fim da escada.' }
}

export async function createAdminChallenge(
  seasonId: string,
  categoryId: string,
  challengerId: string,
  challengedId: string
): Promise<LadderActionResult> {
  await requireAdmin()
  if (challengerId === challengedId) return { ok: false, message: 'Escolha dois jogadores diferentes.' }
  const supabase = createServiceClient()

  const settings = settingsWithDefaults(await getRankingSettings(supabase, seasonId, categoryId))

  const [{ data: challengerPos }, { data: challengedPos }] = await Promise.all([
    supabase
      .from('ladder_positions')
      .select('position')
      .eq('season_id', seasonId)
      .eq('category_id', categoryId)
      .eq('profile_id', challengerId)
      .maybeSingle(),
    supabase
      .from('ladder_positions')
      .select('position')
      .eq('season_id', seasonId)
      .eq('category_id', categoryId)
      .eq('profile_id', challengedId)
      .maybeSingle(),
  ])
  if (!challengerPos || !challengedPos) return { ok: false, message: 'Os dois jogadores precisam estar na escada.' }

  const deadline = addDaysIso(settings.ladder_days_to_play)

  const { data: challenge, error } = await supabase
    .from('ladder_challenges')
    .insert({
      season_id: seasonId,
      category_id: categoryId,
      challenger_id: challengerId,
      challenged_id: challengedId,
      challenger_position_at: challengerPos.position,
      challenged_position_at: challengedPos.position,
      status: 'agendado',
      deadline,
    })
    .select()
    .single()
  if (error || !challenge) return { ok: false, message: 'Não foi possível criar o desafio.' }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      season_id: seasonId,
      category_id: categoryId,
      player1_id: challengerId,
      player2_id: challengedId,
      scheduled_date: deadline,
      status: 'agendado',
      challenge_id: challenge.id,
    })
    .select()
    .single()
  if (matchError || !match) return { ok: false, message: 'Não foi possível criar a partida do desafio.' }

  await supabase.from('ladder_challenges').update({ match_id: match.id }).eq('id', challenge.id)

  revalidatePath(`/admin/temporadas/${seasonId}/escada`)
  revalidatePath('/admin/jogos')
  revalidatePath('/admin/desafios')
  revalidatePath('/jogos')
  revalidatePath('/ranking')
  return { ok: true, message: `Desafio e partida criados. Lance o placar em /admin/jogos/${match.id}.` }
}
