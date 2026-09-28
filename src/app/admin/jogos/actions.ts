'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { summarizeSets, isValidSetSequence } from '@/lib/scoring'
import { applyLadderChallengeResult, getRankingSettings, settingsWithDefaults } from '@/lib/ladder'
import type { MatchStatus, SetScore } from '@/types'

export async function updateMatchResult(matchId: string, sets: SetScore[]) {
  await requireAdmin()
  if (!isValidSetSequence(sets)) throw new Error('Sequência de sets inválida.')

  const supabase = createServiceClient()
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match) throw new Error('Partida não encontrada.')

  const played = sets.filter(s => s.p1 > 0 || s.p2 > 0)
  const summary = summarizeSets(played)
  const winnerId = summary.winner === 'p1' ? match.player1_id : match.player2_id

  await supabase
    .from('matches')
    .update({
      sets: played,
      sets_pro: summary.setsPro,
      sets_contra: summary.setsContra,
      games_pro: summary.gamesPro,
      games_contra: summary.gamesContra,
      winner_id: winnerId,
      status: 'realizado',
    })
    .eq('id', matchId)

  await applyLadderChallengeResult(matchId)

  revalidatePath('/admin/jogos')
  revalidatePath('/ranking')
}

export async function setMatchStatus(matchId: string, status: MatchStatus) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('matches').update({ status }).eq('id', matchId)
  revalidatePath('/admin/jogos')
  revalidatePath('/ranking')
}

/**
 * Marca a partida como W.O. a favor de `winnerId` (precisa ser player1_id
 * ou player2_id da partida). Por padrão zera o placar; se a categoria/
 * temporada tiver `wo_conta_sets` ligado (config em /admin/configuracoes),
 * credita `wo_sets_vencedor`/`wo_games_vencedor` ao vencedor, o que também
 * alimenta o bônus por set/game na view `standings`. Se a partida vier de
 * um desafio de escada, também move as posições.
 */
export async function markWalkover(matchId: string, winnerId: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match) throw new Error('Partida não encontrada.')
  if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
    throw new Error('Vencedor precisa ser um dos jogadores da partida.')
  }

  const settings = settingsWithDefaults(await getRankingSettings(supabase, match.season_id, match.category_id))
  const winnerSets = settings.wo_conta_sets ? settings.wo_sets_vencedor : 0
  const winnerGames = settings.wo_conta_sets ? settings.wo_games_vencedor : 0
  // matches.sets_pro/games_pro são sempre da perspectiva do player1; se quem
  // ganhou o W.O. for o player2, o placar creditado vai para as colunas *_contra.
  const winnerIsPlayer1 = winnerId === match.player1_id

  await supabase
    .from('matches')
    .update({
      status: 'wo',
      winner_id: winnerId,
      sets: null,
      sets_pro: winnerIsPlayer1 ? winnerSets : 0,
      sets_contra: winnerIsPlayer1 ? 0 : winnerSets,
      games_pro: winnerIsPlayer1 ? winnerGames : 0,
      games_contra: winnerIsPlayer1 ? 0 : winnerGames,
      reported_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  await applyLadderChallengeResult(matchId)

  revalidatePath('/admin/jogos')
  revalidatePath('/ranking')
}

export async function rescheduleMatch(matchId: string, scheduledDate: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('matches').update({ scheduled_date: scheduledDate }).eq('id', matchId)
  revalidatePath('/admin/jogos')
  revalidatePath('/ranking')
}
