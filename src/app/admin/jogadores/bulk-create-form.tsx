'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, UserPlus, Copy, Check } from 'lucide-react'
import { bulkCreatePlayers, type BulkCreateResultRow } from './actions'

export function BulkCreateForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<BulkCreateResultRow[] | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!raw.trim()) return
    setLoading(true)
    setResults(null)
    const rows = await bulkCreatePlayers(raw)
    setResults(rows)
    setLoading(false)
    router.refresh()
  }

  function copyAll() {
    if (!results) return
    const text = results
      .filter(r => r.ok)
      .map(r => `${r.name} — login: ${r.email} — senha: ${r.password}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-lime-500/20 hover:bg-lime-500/30 text-lime-400 text-sm font-medium rounded-lg transition-colors"
      >
        <UserPlus size={14} />
        Cadastrar em massa
      </button>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-white mb-1">Cadastrar jogadores em massa</h2>
      <p className="text-xs text-gray-500 mb-3">
        Uma pessoa por linha, no formato <code className="text-gray-400">Nome, email</code>. Uma senha
        temporária é gerada para cada um — depois é só compartilhar (ex: WhatsApp) e a pessoa troca a
        senha em &quot;Meu perfil&quot;.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={raw}
          onChange={e => setRaw(e.target.value)}
          rows={6}
          placeholder={'Fulano de Tal, fulano@email.com\nCiclana Souza, ciclana@email.com'}
          className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-600 focus:outline-none focus:border-lime-500 font-mono"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !raw.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 text-gray-950 text-sm font-semibold rounded-lg transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Cadastrar
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); setResults(null); setRaw('') }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </form>

      {results && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {results.filter(r => r.ok).length} de {results.length} cadastrados com sucesso.
            </p>
            {results.some(r => r.ok) && (
              <button
                onClick={copyAll}
                className="flex items-center gap-1 text-xs text-lime-400 hover:text-lime-300 font-medium"
              >
                {copiedAll ? <Check size={12} /> : <Copy size={12} />}
                {copiedAll ? 'Copiado!' : 'Copiar lista de logins/senhas'}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {results.map((r, i) => (
              <div
                key={i}
                className={`text-xs rounded-lg px-3 py-2 border ${
                  r.ok
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                }`}
              >
                <span className="font-medium">{r.name || '(sem nome)'}</span>
                {' — '}
                {r.email || '(sem email)'}
                {r.ok ? (
                  <> — senha: <span className="font-mono">{r.password}</span></>
                ) : (
                  <> — {r.message}</>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
