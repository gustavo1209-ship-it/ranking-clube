'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { summarizeSets, isValidSetSequence } from '@/lib/scoring'
import { applyLadderChallengeResult } from '@/lib/ladder'
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

export async function rescheduleMatch(matchId: string, scheduledDate: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('matches').update({ scheduled_date: scheduledDate }).eq('id', matchId)
  revalidatePath('/admin/jogos')
  revalidatePath('/ranking')
}
