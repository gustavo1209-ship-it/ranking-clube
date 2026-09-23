import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { PlayersTable } from './players-table'
import { BulkCreateForm } from './bulk-create-form'
import type { Profile } from '@/types'

export default async function JogadoresPage() {
  await requireAdmin()
  const supabase = createServiceClient()
  const { data: players } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name') as { data: Profile[] | null }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Jogadores</h1>
          <p className="text-sm text-gray-400 mt-1">
            Edite o nome e o email de qualquer jogador. O email também é usado para o login dele.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <BulkCreateForm />
      </div>

      <div className="mt-6">
        <PlayersTable players={players ?? []} />
      </div>
    </div>
  )
}
