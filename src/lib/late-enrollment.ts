import { createServiceClient } from '@/lib/supabase/service'

type ServiceClient = ReturnType<typeof createServiceClient>

const DAY_MS = 86400000

/**
 * Quando um jogador entra numa categoria do modelo de pontos que já tem
 * calendário gerado, cria as partidas dele contra todos os outros já
 * inscritos (sem mexer nas partidas existentes), distribuindo as datas
 * entre hoje e o fim da temporada.
 */
export async function generateMatchesForLateJoiner(
  supabase: ServiceClient,
  seasonId: string,
  categoryId: string,
  newPlayerId: string
) {
  const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).single()
  if (!season) return

  const { data: existingMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .limit(1)
  if (!existingMatches || existingMatches.length === 0) return

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('profile_id')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
  const otherPlayerIds = (enrollments ?? [])
    .map(e => e.profile_id as string)
    .filter(id => id !== newPlayerId)
  if (otherPlayerIds.length === 0) return

  const { data: existingWithNew } = await supabase
    .from('matches')
    .select('player1_id, player2_id')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .or(`player1_id.eq.${newPlayerId},player2_id.eq.${newPlayerId}`)
  const alreadyPaired = new Set(
    (existingWithNew ?? []).map(m => (m.player1_id === newPlayerId ? m.player2_id : m.player1_id))
  )

  const opponents = otherPlayerIds.filter(id => !alreadyPaired.has(id))
  if (opponents.length === 0) return

  const today = new Date()
  const end = new Date(`${season.end_date}T00:00:00Z`)
  const totalDays = Math.max(Math.round((end.getTime() - today.getTime()) / DAY_MS), opponents.length)
  const slot = totalDays / opponents.length

  const rows = opponents.map((opponentId, i) => {
    const dayOffset = Math.min(Math.round(i * slot), totalDays)
    const date = new Date(today.getTime() + dayOffset * DAY_MS)
    return {
      season_id: seasonId,
      category_id: categoryId,
      player1_id: newPlayerId,
      player2_id: opponentId,
      scheduled_date: date.toISOString().slice(0, 10),
    }
  })

  await supabase.from('matches').insert(rows)
}
