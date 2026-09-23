'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/current-profile'

export interface RescheduleActionResult {
  ok: boolean
  message: string
}

export async function proposeReschedule(matchId: string, newDate: string): Promise<RescheduleActionResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, message: 'Você precisa estar logado.' }
  if (!newDate) return { ok: false, message: 'Informe uma data.' }

  const supabase = createServiceClient()

  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match) return { ok: false, message: 'Partida não encontrada.' }
  if (match.player1_id !== profile.id && match.player2_id !== profile.id) {
    return { ok: false, message: 'Você não faz parte desta partida.' }
  }
  if (match.status !== 'agendado') return { ok: false, message: 'Essa partida não pode mais ser remarcada.' }

  const { data: existing } = await supabase
    .from('match_reschedule_requests')
    .select('id')
    .eq('match_id', matchId)
    .eq('status', 'pendente')
    .limit(1)
  if (existing && existing.length > 0) {
    return { ok: false, message: 'Já existe uma proposta de data em aberto para essa partida.' }
  }

  const { error } = await supabase.from('match_reschedule_requests').insert({
    match_id: matchId,
    proposed_by: profile.id,
    proposed_date: newDate,
  })
  if (error) return { ok: false, message: 'Não foi possível propor a nova data.' }

  revalidatePath(`/jogos/${matchId}`)
  revalidatePath('/jogos')
  revalidatePath('/proximos-jogos')
  return { ok: true, message: `Data proposta: ${newDate}. Aguardando o adversário aceitar.` }
}

export async function respondReschedule(requestId: string, accept: boolean): Promise<RescheduleActionResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, message: 'Você precisa estar logado.' }

  const supabase = createServiceClient()

  const { data: request } = await supabase.from('match_reschedule_requests').select('*').eq('id', requestId).single()
  if (!request) return { ok: false, message: 'Proposta não encontrada.' }
  if (request.status !== 'pendente') return { ok: false, message: 'Essa proposta já foi respondida.' }
  if (request.proposed_by === profile.id) return { ok: false, message: 'Você não pode responder à sua própria proposta.' }

  const { data: match } = await supabase.from('matches').select('*').eq('id', request.match_id).single()
  if (!match) return { ok: false, message: 'Partida não encontrada.' }
  if (match.player1_id !== profile.id && match.player2_id !== profile.id) {
    return { ok: false, message: 'Você não faz parte desta partida.' }
  }

  const now = new Date().toISOString()

  if (accept) {
    const { error: matchError } = await supabase
      .from('matches')
      .update({ scheduled_date: request.proposed_date })
      .eq('id', request.match_id)
    if (matchError) return { ok: false, message: 'Não foi possível atualizar a data da partida.' }

    await supabase.from('match_reschedule_requests').update({ status: 'aceito', decided_at: now }).eq('id', requestId)
  } else {
    await supabase.from('match_reschedule_requests').update({ status: 'recusado', decided_at: now }).eq('id', requestId)
  }

  revalidatePath(`/jogos/${request.match_id}`)
  revalidatePath('/jogos')
  revalidatePath('/proximos-jogos')
  revalidatePath('/ranking')
  return { ok: true, message: accept ? 'Nova data aceita.' : 'Proposta recusada.' }
}

export async function cancelReschedule(requestId: string): Promise<RescheduleActionResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, message: 'Você precisa estar logado.' }

  const supabase = createServiceClient()

  const { data: request } = await supabase.from('match_reschedule_requests').select('*').eq('id', requestId).single()
  if (!request) return { ok: false, message: 'Proposta não encontrada.' }
  if (request.proposed_by !== profile.id) return { ok: false, message: 'Só quem propôs pode cancelar.' }
  if (request.status !== 'pendente') return { ok: false, message: 'Essa proposta já foi respondida.' }

  await supabase
    .from('match_reschedule_requests')
    .update({ status: 'cancelado', decided_at: new Date().toISOString() })
    .eq('id', requestId)

  revalidatePath(`/jogos/${request.match_id}`)
  return { ok: true, message: 'Proposta cancelada.' }
}
