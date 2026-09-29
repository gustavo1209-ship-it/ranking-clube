import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { settingsWithDefaults } from '@/lib/ladder'
import { getCourtBookingDays, getCourtBookingSettings } from '@/lib/court-bookings'
import { ScoringRulesControl } from './scoring-rules-control'
import { ApplyAllScoringForm } from './apply-all-scoring-form'
import { CourtBookingSettingsControl } from './court-booking-settings-control'
import type { Category, CategoryRankingSettings, Season } from '@/types'

export default async function ConfiguracoesPage() {
  await requireAdmin()
  const supabase = createServiceClient()

  const [{ data: seasons }, { data: categories }, { data: allSettings }, courtSettings, courtDays] = await Promise.all([
    supabase.from('seasons').select('*').order('start_date', { ascending: false }) as unknown as Promise<{ data: Season[] | null }>,
    supabase.from('categories').select('*').order('sort_order') as unknown as Promise<{ data: Category[] | null }>,
    supabase.from('category_ranking_settings').select('*') as unknown as Promise<{ data: CategoryRankingSettings[] | null }>,
    getCourtBookingSettings(supabase),
    getCourtBookingDays(supabase),
  ])

  const settingsByKey = new Map((allSettings ?? []).map(s => [`${s.season_id}:${s.category_id}`, s]))

  return (
    <div>
      <h1 className="text-2xl font-bold">Configurações</h1>

      <div className="mt-6">
        <CourtBookingSettingsControl
          initialSlotDuration={courtSettings.slot_duration_minutes}
          initialOpeningTime={courtSettings.opening_time}
          initialDays={courtDays}
        />
      </div>

      <h2 className="text-lg font-semibold text-white mt-10">Regras de pontuação</h2>
      <p className="text-sm text-gray-400 mt-1">Modelo &quot;Pontuação&quot;, por temporada e categoria.</p>

      <div className="mt-6">
        <ApplyAllScoringForm />
      </div>

      <div className="mt-8 space-y-6">
        {(seasons ?? []).length === 0 && <p className="text-sm text-gray-500">Nenhuma temporada cadastrada ainda.</p>}

        {(seasons ?? []).map(season => (
          <div key={season.id}>
            <h2 className="text-white font-medium">{season.name}</h2>
            <div className="mt-2 space-y-2">
              {(categories ?? []).map(cat => {
                const settings = settingsWithDefaults(settingsByKey.get(`${season.id}:${cat.id}`) ?? null)
                return (
                  <div
                    key={cat.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <p className="text-white font-medium text-sm shrink-0 sm:w-40">{cat.name}</p>
                    <ScoringRulesControl
                      seasonId={season.id}
                      categoryId={cat.id}
                      initial={{
                        pontosVitoria: settings.pontos_vitoria,
                        pontosDerrota: settings.pontos_derrota,
                        pontosVitoriaWo: settings.pontos_vitoria_wo,
                        pontosDerrotaWo: settings.pontos_derrota_wo,
                        pontosBonusSet: settings.pontos_bonus_set,
                        pontosBonusGame: settings.pontos_bonus_game,
                        woContaSets: settings.wo_conta_sets,
                        woSetsVencedor: settings.wo_sets_vencedor,
                        woGamesVencedor: settings.wo_games_vencedor,
                      }}
                    />
                  </div>
                )
              })}
              {(categories ?? []).length === 0 && <p className="text-sm text-gray-500">Cadastre categorias primeiro.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
