import { createServiceClient } from '@/lib/supabase/service'
import { appendToLadderBottom, getRankingSettings, settingsWithDefaults } from '@/lib/ladder'
import { generateMatchesForLateJoiner } from '@/lib/late-enrollment'

type ServiceClient = ReturnType<typeof createServiceClient>

/**
 * Roda depois que um jogador é inscrito numa (temporada, categoria):
 * - modelo escada: se a escada já foi iniciada, entra no fim dela
 * - modelo pontos: se o calendário já foi gerado, cria as partidas dele
 *   contra quem já estava inscrito
 */
export async function handleNewEnrollment(
  supabase: ServiceClient,
  seasonId: string,
  categoryId: string,
  profileId: string
) {
  const settings = settingsWithDefaults(await getRankingSettings(supabase, seasonId, categoryId))

  if (settings.ranking_model === 'escada') {
    const { data: existingPositions } = await supabase
      .from('ladder_positions')
      .select('id')
      .eq('season_id', seasonId)
      .eq('category_id', categoryId)
      .limit(1)
    if (existingPositions && existingPositions.length > 0) {
      await appendToLadderBottom(supabase, seasonId, categoryId, profileId)
    }
  } else {
    await generateMatchesForLateJoiner(supabase, seasonId, categoryId, profileId)
  }
}
