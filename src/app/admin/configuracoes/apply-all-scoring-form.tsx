'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Wand2 } from 'lucide-react'
import { applyScoringRulesToAll, type ScoringRules } from './actions'
import { DEFAULT_LADDER_SETTINGS } from '@/lib/ladder'

type NumericRuleKey = Exclude<keyof ScoringRules, 'woContaSets'>

const FIELDS: { key: NumericRuleKey; label: string; min: number }[] = [
  { key: 'pontosVitoria', label: 'Vitória', min: 0 },
  { key: 'pontosDerrota', label: 'Derrota', min: 0 },
  { key: 'pontosVitoriaWo', label: 'Vitória W.O.', min: 0 },
  { key: 'pontosDerrotaWo', label: 'Derrota W.O.', min: 0 },
  { key: 'pontosBonusSet', label: 'Bônus/set', min: 0 },
  { key: 'pontosBonusGame', label: 'Bônus/game', min: 0 },
]

export function ApplyAllScoringForm() {
  const router = useRouter()
  const [rules, setRules] = useState<ScoringRules>({
    pontosVitoria: DEFAULT_LADDER_SETTINGS.pontos_vitoria,
    pontosDerrota: DEFAULT_LADDER_SETTINGS.pontos_derrota,
    pontosVitoriaWo: DEFAULT_LADDER_SETTINGS.pontos_vitoria_wo,
    pontosDerrotaWo: DEFAULT_LADDER_SETTINGS.pontos_derrota_wo,
    pontosBonusSet: DEFAULT_LADDER_SETTINGS.pontos_bonus_set,
    pontosBonusGame: DEFAULT_LADDER_SETTINGS.pontos_bonus_game,
    woContaSets: DEFAULT_LADDER_SETTINGS.wo_conta_sets,
    woSetsVencedor: DEFAULT_LADDER_SETTINGS.wo_sets_vencedor,
    woGamesVencedor: DEFAULT_LADDER_SETTINGS.wo_games_vencedor,
  })
  const [applying, setApplying] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleApply() {
    if (!confirm('Isso vai sobrescrever as regras de pontuação de TODAS as temporadas e categorias. Continuar?')) return
    setApplying(true)
    setMessage(null)
    const result = await applyScoringRulesToAll(rules)
    setMessage({ ok: result.ok, text: result.message })
    setApplying(false)
    if (result.ok) router.refresh()
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-white font-medium">Regra padrão para todo o clube</h2>
      <p className="text-sm text-gray-500 mt-1">
        Defina os valores e aplique de uma vez a todas as temporadas e categorias. Você ainda pode ajustar
        individualmente cada uma depois.
      </p>

      <div className="flex flex-wrap items-end gap-4 mt-4">
        {FIELDS.map(field => (
          <label key={field.key} className="flex flex-col gap-1 text-xs text-gray-400">
            {field.label}
            <input
              type="number"
              min={field.min}
              value={rules[field.key]}
              onChange={e => setRules(prev => ({ ...prev, [field.key]: Math.max(field.min, Number(e.target.value) || 0) }))}
              className="w-20 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:outline-none focus:border-lime-500"
            />
          </label>
        ))}

        <label className="flex items-center gap-1.5 text-xs text-gray-400 pb-2">
          <input
            type="checkbox"
            checked={rules.woContaSets}
            onChange={e => setRules(prev => ({ ...prev, woContaSets: e.target.checked }))}
            className="accent-lime-500"
          />
          W.O. conta sets p/ vencedor
        </label>
        {rules.woContaSets && (
          <>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Sets W.O.
              <input
                type="number"
                min={0}
                value={rules.woSetsVencedor}
                onChange={e => setRules(prev => ({ ...prev, woSetsVencedor: Math.max(0, Number(e.target.value) || 0) }))}
                className="w-20 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:outline-none focus:border-lime-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-gray-400">
              Games W.O.
              <input
                type="number"
                min={0}
                value={rules.woGamesVencedor}
                onChange={e => setRules(prev => ({ ...prev, woGamesVencedor: Math.max(0, Number(e.target.value) || 0) }))}
                className="w-20 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:outline-none focus:border-lime-500"
              />
            </label>
          </>
        )}

        <button
          onClick={handleApply}
          disabled={applying}
          className="flex items-center gap-1.5 px-4 py-2 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 text-gray-950 font-semibold rounded-xl text-sm transition-colors"
        >
          {applying ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          Aplicar a todas
        </button>
      </div>

      {message && <p className={`text-xs mt-3 ${message.ok ? 'text-lime-400' : 'text-red-400'}`}>{message.text}</p>}
    </div>
  )
}
