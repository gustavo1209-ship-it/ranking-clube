'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { getCurrentProfile } from '@/lib/current-profile'

export interface UpdateEmailResult {
  ok: boolean
  message: string
}

export async function updateOwnEmail(newEmail: string): Promise<UpdateEmailResult> {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false, message: 'Você precisa estar logado.' }

  const email = newEmail.trim().toLowerCase()
  if (!email) return { ok: false, message: 'Informe um email.' }
  if (email === profile.email) return { ok: true, message: 'Esse já é o seu email atual.' }

  const supabase = createServiceClient()

  const { error: authError } = await supabase.auth.admin.updateUserById(profile.id, {
    email,
    email_confirm: true,
  })
  if (authError) {
    const inUse = authError.message.toLowerCase().includes('already') || authError.message.toLowerCase().includes('registered')
    return { ok: false, message: inUse ? 'Esse email já está em uso.' : 'Não foi possível atualizar o email.' }
  }

  await supabase.from('profiles').update({ email }).eq('id', profile.id)

  return { ok: true, message: 'Email atualizado! Use o novo email para entrar da próxima vez.' }
}
