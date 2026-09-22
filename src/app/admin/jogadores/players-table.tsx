'use client'

import { useState } from 'react'
import { Pencil, Save, X, Loader2, ShieldCheck } from 'lucide-react'
import { updatePlayer } from './actions'
import type { Profile } from '@/types'

interface Props {
  players: Profile[]
}

export function PlayersTable({ players }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function startEdit(player: Profile) {
    setEditingId(player.id)
    setName(player.full_name)
    setEmail(player.email)
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setError('')
  }

  async function handleSave(id: string) {
    setSaving(true)
    setError('')
    try {
      const formData = new FormData()
      formData.set('id', id)
      formData.set('full_name', name)
      formData.set('email', email)
      await updatePlayer(formData)
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    }
    setSaving(false)
  }

  if (players.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum jogador cadastrado ainda.</p>
  }

  return (
    <div className="space-y-2">
      {players.map(player => {
        const isEditing = editingId === player.id
        return (
          <div key={player.id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            {isEditing ? (
              <div className="space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nome"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-lime-500"
                  />
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-lime-500"
                  />
                </div>
                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(player.id)}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 text-gray-950 text-sm font-semibold rounded-lg transition-colors"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Salvar
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    <X size={14} />
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white font-medium flex items-center gap-1.5">
                    {player.full_name || 'Sem nome'}
                    {player.is_admin && <ShieldCheck size={14} className="text-lime-400" />}
                  </p>
                  <p className="text-gray-500 text-sm truncate">{player.email || 'Sem email cadastrado'}</p>
                </div>
                <button
                  onClick={() => startEdit(player)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors shrink-0"
                >
                  <Pencil size={14} />
                  Editar
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
