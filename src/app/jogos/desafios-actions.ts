'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/current-profile'
import {
  addDaysIso,
  eligibleChallengeTargetPositions,
  expireOverdueLadderChallenges,
  getRankingSettings,
  hasActiveChallenge,
  hasRecentMatchup,
  settingsWithDefaults,
} from '@/lib/ladder'

export interface ChallengeActionResult {
  ok: boolean
  message: string
}

export async function createLadderChallenge(
  seasonId: string,
  categoryId: string,
  challengedId: string
): Promise<ChallengeActionResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, message: 'Você precisa estar logado.' }
  if (challengedId === profile.id) return { ok: false, message: 'Você não pode desafiar a si mesmo.' }

  const supabase = createServiceClient()

  const settings = settingsWithDefaults(await getRankingSettings(supabase, seasonId, categoryId))
  if (settings.ranking_model !== 'escada') return { ok: false, message: 'Esta categoria não usa o ranking por escada.' }

  await expireOverdueLadderChallenges(supabase, seasonId, categoryId)

  const [{ data: challengerPos }, { data: challengedPos }] = await Promise.all([
    supabase
      .from('ladder_positions')
      .select('*')
      .eq('season_id', seasonId)
      .eq('category_id', categoryId)
      .eq('profile_id', profile.id)
      .maybeSingle(),
    supabase
      .from('ladder_positions')
      .select('*')
      .eq('season_id', seasonId)
      .eq('category_id', categoryId)
      .eq('profile_id', challengedId)
      .maybeSingle(),
  ])

  if (!challengerPos) return { ok: false, message: 'Você não está na escada desta categoria.' }
  if (challengerPos.player_status !== 'ativo') return { ok: false, message: 'Você precisa estar ativo na escada para desafiar.' }
  if (!challengedPos) return { ok: false, message: 'Jogador não está na escada desta categoria.' }
  if (challengedPos.player_status !== 'ativo') return { ok: false, message: 'Esse jogador está inativo/afastado e não pode ser desafiado.' }

  const eligible = eligibleChallengeTargetPositions(challengerPos.position, settings.ladder_max_challenge_gap)
  if (!eligible.includes(challengedPos.position)) {
    return { ok: false, message: `Você só pode desafiar jogadores até ${settings.ladder_max_challenge_gap} posições acima da sua.` }
  }

  if (await hasActiveChallenge(supabase, seasonId, categoryId, profile.id)) {
    return { ok: false, message: 'Você já tem um desafio em andamento.' }
  }
  if (await hasActiveChallenge(supabase, seasonId, categoryId, challengedId)) {
    return { ok: false, message: 'Esse jogador já está envolvido em outro desafio.' }
  }

  if (await hasRecentMatchup(supabase, seasonId, categoryId, profile.id, challengedId, settings.ladder_rematch_days)) {
    return { ok: false, message: `Vocês já se enfrentaram recentemente. Aguarde ${settings.ladder_rematch_days} dias entre revanches.` }
  }

  const deadline = addDaysIso(settings.ladder_days_to_play)

  const { error } = await supabase.from('ladder_challenges').insert({
    season_id: seasonId,
    category_id: categoryId,
    challenger_id: profile.id,
    challenged_id: challengedId,
    challenger_position_at: challengerPos.position,
    challenged_position_at: challengedPos.position,
    deadline,
  })

  if (error) return { ok: false, message: 'Não foi possível criar o desafio.' }

  revalidatePath('/jogos')
  revalidatePath('/ranking')
  revalidatePath('/admin/desafios')
  return { ok: true, message: `Desafio enviado! Prazo até ${deadline}.` }
}

export async function acceptLadderChallenge(challengeId: string): Promise<ChallengeActionResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, message: 'Você precisa estar logado.' }

  const supabase = createServiceClient()
  const { data: challenge } = await supabase.from('ladder_challenges').select('*').eq('id', challengeId).single()
  if (!challenge) return { ok: false, message: 'Desafio não encontrado.' }
  if (challenge.challenged_id !== profile.id) return { ok: false, message: 'Você não pode aceitar este desafio.' }

  if (challenge.deadline < new Date().toISOString().slice(0, 10) && challenge.status === 'aguardando_aceite') {
    await supabase.from('ladder_challenges').update({ status: 'expirado', updated_at: new Date().toISOString() }).eq('id', challengeId)
    return { ok: false, message: 'O prazo deste desafio expirou.' }
  }
  if (challenge.status !== 'aguardando_aceite') return { ok: false, message: 'Este desafio não está mais aguardando aceite.' }

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .insert({
      season_id: challenge.season_id,
      category_id: challenge.category_id,
      player1_id: challenge.challenger_id,
      player2_id: challenge.challenged_id,
      scheduled_date: challenge.deadline,
      status: 'agendado',
      challenge_id: challenge.id,
    })
    .select()
    .single()

  if (matchError || !match) return { ok: false, message: 'Não foi possível agendar a partida do desafio.' }

  await supabase
    .from('ladder_challenges')
    .update({ status: 'agendado', match_id: match.id, updated_at: new Date().toISOString() })
    .eq('id', challengeId)

  revalidatePath('/jogos')
  revalidatePath('/ranking')
  revalidatePath('/admin/desafios')
  return { ok: true, message: 'Desafio aceito! A partida já está nos seus jogos.' }
}

export async function declineLadderChallenge(challengeId: string): Promise<ChallengeActionResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, message: 'Você precisa estar logado.' }

  const supabase = createServiceClient()
  const { data: challenge } = await supabase.from('ladder_challenges').select('*').eq('id', challengeId).single()
  if (!challenge) return { ok: false, message: 'Desafio não encontrado.' }
  if (challenge.challenger_id !== profile.id && challenge.challenged_id !== profile.id) {
    return { ok: false, message: 'Você não faz parte deste desafio.' }
  }
  if (challenge.status !== 'aguardando_aceite') return { ok: false, message: 'Este desafio não pode mais ser recusado.' }

  await supabase.from('ladder_challenges').update({ status: 'cancelado', updated_at: new Date().toISOString() }).eq('id', challengeId)

  revalidatePath('/jogos')
  revalidatePath('/ranking')
  revalidatePath('/admin/desafios')
  return { ok: true, message: 'Desafio recusado.' }
}
