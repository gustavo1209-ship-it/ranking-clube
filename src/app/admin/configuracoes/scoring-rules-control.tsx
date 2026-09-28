'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setScoringRules, type ScoringRules } from './actions'

interface Props {
  seasonId: string
  categoryId: string
  initial: ScoringRules
}

type NumericRuleKey = Exclude<keyof ScoringRules, 'woContaSets'>

const FIELDS: { key: NumericRuleKey; label: string; min: number }[] = [
  { key: 'pontosVitoria', label: 'Vitória', min: 0 },
  { key: 'pontosDerrota', label: 'Derrota', min: 0 },
  { key: 'pontosVitoriaWo', label: 'Vitória W.O.', min: 0 },
  { key: 'pontosDerrotaWo', label: 'Derrota W.O.', min: 0 },
  { key: 'pontosBonusSet', label: 'Bônus/set', min: 0 },
  { key: 'pontosBonusGame', label: 'Bônus/game', min: 0 },
]

export function ScoringRulesControl({ seasonId, categoryId, initial }: Props) {
  const router = useRouter()
  const [rules, setRules] = useState<ScoringRules>(initial)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function save(overrides?: Partial<ScoringRules>) {
    const next = overrides ? { ...rules, ...overrides } : rules
    if (overrides) setRules(next)
    setSaving(true)
    setMessage(null)
    const result = await setScoringRules(seasonId, categoryId, next)
    setMessage({ ok: result.ok, text: result.message })
    setSaving(false)
    if (result.ok) router.refresh()
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
        {FIELDS.map(field => (
          <label key={field.key} className="flex items-center gap-1.5">
            {field.label}
            <input
              type="number"
              min={field.min}
              value={rules[field.key]}
              onChange={e => setRules(prev => ({ ...prev, [field.key]: Math.max(field.min, Number(e.target.value) || 0) }))}
              onBlur={() => save()}
              disabled={saving}
              className="w-14 px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center disabled:opacity-50"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={rules.woContaSets}
            onChange={e => save({ woContaSets: e.target.checked })}
            disabled={saving}
            className="accent-lime-500"
          />
          W.O. conta sets p/ vencedor
        </label>
        {rules.woContaSets && (
          <>
            <label className="flex items-center gap-1.5">
              Sets
              <input
                type="number"
                min={0}
                value={rules.woSetsVencedor}
                onChange={e => setRules(prev => ({ ...prev, woSetsVencedor: Math.max(0, Number(e.target.value) || 0) }))}
                onBlur={() => save()}
                disabled={saving}
                className="w-14 px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center disabled:opacity-50"
              />
            </label>
            <label className="flex items-center gap-1.5">
              Games
              <input
                type="number"
                min={0}
                value={rules.woGamesVencedor}
                onChange={e => setRules(prev => ({ ...prev, woGamesVencedor: Math.max(0, Number(e.target.value) || 0) }))}
                onBlur={() => save()}
                disabled={saving}
                className="w-14 px-1.5 py-1 bg-gray-800 border border-gray-700 rounded text-white text-center disabled:opacity-50"
              />
            </label>
          </>
        )}
      </div>

      {message && <p className={`text-xs ${message.ok ? 'text-lime-400' : 'text-red-400'}`}>{message.text}</p>}
    </div>
  )
}
