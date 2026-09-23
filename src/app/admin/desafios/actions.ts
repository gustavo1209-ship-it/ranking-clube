'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { applyLadderWalkover } from '@/lib/ladder'

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

  await applyLadderWalkover(supabase, challenge, winnerId)

  revalidatePath('/admin/desafios')
  revalidatePath('/ranking')
}
