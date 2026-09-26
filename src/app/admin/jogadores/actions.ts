'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'

export interface BulkCreateResultRow {
  name: string
  email: string
  password?: string
  ok: boolean
  message: string
}

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 10; i++) password += chars[Math.floor(Math.random() * chars.length)]
  return password
}

/**
 * Cadastra vários jogadores reais de uma vez (cada linha "Nome, email").
 * Cria o usuário direto no Auth com uma senha temporária gerada aqui — o
 * gatilho handle_new_user cria o profile a partir do full_name enviado.
 * A pessoa troca essa senha depois em /perfil.
 */
export async function bulkCreatePlayers(raw: string): Promise<BulkCreateResultRow[]> {
  await requireAdmin()
  const supabase = createServiceClient()

  const lines = raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const results: BulkCreateResultRow[] = []

  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map(p => p.trim())
    const name = parts[0] ?? ''
    const email = (parts[1] ?? '').toLowerCase()

    if (!name || !email) {
      results.push({ name, email, ok: false, message: 'Linha inválida — use "Nome, email".' })
      continue
    }

    const password = generateTempPassword()
    const { error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    })

    if (error) {
      const already = error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('registered')
      results.push({ name, email, ok: false, message: already ? 'Email já cadastrado.' : error.message })
      continue
    }

    results.push({ name, email, password, ok: true, message: 'Cadastrado.' })
  }

  revalidatePath('/admin/jogadores')
  return results
}

export async function updatePlayer(formData: FormData) {
  await requireAdmin()

  const profileId = String(formData.get('id') ?? '')
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!profileId) throw new Error('Jogador inválido.')
  if (!email) throw new Error('Informe um email.')
  if (!fullName) throw new Error('Informe um nome.')

  const supabase = createServiceClient()

  const { data: current } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', profileId)
    .single()

  if (current?.email !== email) {
    const { error: authError } = await supabase.auth.admin.updateUserById(profileId, {
      email,
      email_confirm: true,
    })
    if (authError) throw new Error(`Não foi possível atualizar o email: ${authError.message}`)
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, email })
    .eq('id', profileId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/jogadores')
}

/**
 * Exclui um jogador (usado para remover cadastros de teste). Apaga antes os
 * registros que não têm cascade a partir de profiles (partidas, desafios e
 * histórico da escada) para não esbarrar em violação de FK; enrollments e
 * ladder_positions já têm "on delete cascade" e são removidos automaticamente
 * junto com o usuário no Auth.
 */
export async function deletePlayer(profileId: string) {
  const admin = await requireAdmin()
  if (!profileId) throw new Error('Jogador inválido.')
  if (profileId === admin.id) throw new Error('Você não pode excluir o próprio cadastro.')

  const supabase = createServiceClient()

  await supabase.from('matches').delete().or(`player1_id.eq.${profileId},player2_id.eq.${profileId}`)
  await supabase.from('ladder_challenges').delete().or(`challenger_id.eq.${profileId},challenged_id.eq.${profileId}`)
  await supabase.from('ladder_position_history').delete().or(`profile_id.eq.${profileId},opponent_id.eq.${profileId}`)

  const { error } = await supabase.auth.admin.deleteUser(profileId)
  if (error) throw new Error(`Não foi possível excluir o jogador: ${error.message}`)

  revalidatePath('/admin/jogadores')
}
