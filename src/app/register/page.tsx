'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputCls = "w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        setError('Este email já está cadastrado.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: name,
        email,
      })
    }

    router.push('/jogos')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">🎾</span>
          <h1 className="text-2xl font-bold mt-3">
            Ranking <span className="text-lime-400">CPV</span>
          </h1>
          <p className="text-gray-400 text-sm mt-2">Cadastre-se para participar</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Seu nome completo"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Mínimo 6 caracteres"
                className={inputCls}
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
              Criar conta
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="text-lime-400 hover:text-lime-300 font-medium">
            Entrar
          </Link>
        </p>
        <p className="text-center text-sm text-gray-600 mt-2">
          <Link href="/" className="hover:text-gray-400">← Voltar ao início</Link>
        </p>
      </div>
    </div>
  )
}
