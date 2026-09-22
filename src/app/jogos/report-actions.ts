'use server'

import { revalidatePath } from 'next/cache'
import { applyLadderChallengeResult } from '@/lib/ladder'

export async function applyLadderResultAfterReport(matchId: string) {
  await applyLadderChallengeResult(matchId)
  revalidatePath('/ranking')
  revalidatePath('/jogos')
}
