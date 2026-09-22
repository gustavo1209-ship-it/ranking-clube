'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { movePlayerToPosition } from '@/lib/ladder'

export async function cancelChallengeAdmin(challengeId: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase
    .from('ladder_challenges')
    .update({ status: 'cancelado', updated_at: new Date().toISOString() })
    .eq('id', challengeId)

  revalidatePath('/admin/desafios')
  revalidatePath('/ranking')
}

export async function markChallengeWO(challengeId: string, winnerId: string) {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: challenge } = await supabase.from('ladder_challenges').select('*').eq('id', challengeId).single()
  if (!challenge) throw new Error('Desafio não encontrado.')
  if (winnerId !== challenge.challenger_id && winnerId !== challenge.challenged_id) {
    throw new Error('O vencedor precisa ser um dos dois jogadores do desafio.')
  }

  if (winnerId === challenge.challenger_id) {
    const { data: challengedPos } = await supabase
      .from('ladder_positions')
      .select('position')
      .eq('season_id', challenge.season_id)
      .eq('category_id', challenge.category_id)
      .eq('profile_id', challenge.challenged_id)
      .maybeSingle()

    if (challengedPos) {
      await movePlayerToPosition(supabase, {
        seasonId: challenge.season_id,
        categoryId: challenge.category_id,
        profileId: challenge.challenger_id,
        newPosition: challengedPos.position,
        opponentId: challenge.challenged_id,
        challengeId: challenge.id,
        reason: 'desafio',
      })
    }
  }

  const now = new Date().toISOString()
  await supabase.from('ladder_challenges').update({ status: 'wo', decided_at: now, updated_at: now }).eq('id', challengeId)

  revalidatePath('/admin/desafios')
  revalidatePath('/ranking')
}
