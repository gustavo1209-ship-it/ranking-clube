'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Navbar } from '@/components/navbar'
import { updateOwnEmail } from './actions'
import { Save, Loader2 } from 'lucide-react'
import type { Profile } from '@/types'

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [email, setEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailMessage, setEmailMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setName(data.full_name)
        setPhone(data.phone ?? '')
        setEmail(data.email)
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    setSaving(true)
    setSaved(false)
    const supabase = createClient()
    await supabase.from('profiles').update({ full_name: name, phone }).eq('id', profile.id)
    setSaving(false)
    setSaved(true)
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return

    setSavingEmail(true)
    setEmailMessage(null)
    const result = await updateOwnEmail(email)
    setEmailMessage({ ok: result.ok, text: result.message })
    setSavingEmail(false)
    if (result.ok) setProfile({ ...profile, email })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 size={24} className="text-lime-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.full_name} isAdmin={profile?.is_admin} />

      <main className="max-w-sm mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold">Meu perfil</h1>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nome</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-lime-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Telefone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-500 transition-colors"
              />
            </div>

            {saved && <p className="text-lime-400 text-sm">Perfil atualizado.</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Salvar
            </button>
          </form>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-4">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email (usado para login)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-lime-500 transition-colors"
              />
            </div>

            {emailMessage && (
              <p className={`text-sm ${emailMessage.ok ? 'text-lime-400' : 'text-red-400'}`}>{emailMessage.text}</p>
            )}

            <button
              type="submit"
              disabled={savingEmail}
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {savingEmail ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Alterar email
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
