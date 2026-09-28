'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'

export interface ScoringRules {
  pontosVitoria: number
  pontosDerrota: number
  pontosVitoriaWo: number
  pontosDerrotaWo: number
  pontosBonusSet: number
  pontosBonusGame: number
}

export interface ScoringActionResult {
  ok: boolean
  message: string
}

function revalidateAfterScoringChange() {
  revalidatePath('/admin/configuracoes')
  revalidatePath('/admin/temporadas')
  revalidatePath('/ranking')
}

export async function setScoringRules(
  seasonId: string,
  categoryId: string,
  rules: ScoringRules
): Promise<ScoringActionResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const { error } = await supabase.from('category_ranking_settings').upsert(
    {
      season_id: seasonId,
      category_id: categoryId,
      pontos_vitoria: rules.pontosVitoria,
      pontos_derrota: rules.pontosDerrota,
      pontos_vitoria_wo: rules.pontosVitoriaWo,
      pontos_derrota_wo: rules.pontosDerrotaWo,
      pontos_bonus_set: rules.pontosBonusSet,
      pontos_bonus_game: rules.pontosBonusGame,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'season_id,category_id' }
  )

  if (error) return { ok: false, message: error.message }

  revalidateAfterScoringChange()
  return { ok: true, message: 'Regras de pontuação salvas.' }
}

export async function applyScoringRulesToAll(rules: ScoringRules): Promise<ScoringActionResult> {
  await requireAdmin()
  const supabase = createServiceClient()

  const [{ data: seasons }, { data: categories }] = await Promise.all([
    supabase.from('seasons').select('id'),
    supabase.from('categories').select('id'),
  ])

  const pairs = (seasons ?? []).flatMap(s => (categories ?? []).map(c => ({ season_id: s.id, category_id: c.id })))
  if (pairs.length === 0) return { ok: false, message: 'Nenhuma temporada/categoria cadastrada ainda.' }

  const now = new Date().toISOString()
  const rows = pairs.map(p => ({
    season_id: p.season_id,
    category_id: p.category_id,
    pontos_vitoria: rules.pontosVitoria,
    pontos_derrota: rules.pontosDerrota,
    pontos_vitoria_wo: rules.pontosVitoriaWo,
    pontos_derrota_wo: rules.pontosDerrotaWo,
    pontos_bonus_set: rules.pontosBonusSet,
    pontos_bonus_game: rules.pontosBonusGame,
    updated_at: now,
  }))

  const { error } = await supabase.from('category_ranking_settings').upsert(rows, { onConflict: 'season_id,category_id' })

  if (error) return { ok: false, message: error.message }

  revalidateAfterScoringChange()
  return { ok: true, message: `Regra aplicada a ${pairs.length} combinação(ões) de temporada/categoria.` }
}
