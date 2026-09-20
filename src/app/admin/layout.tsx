import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/current-profile'
import { Navbar } from '@/components/navbar'

const TABS = [
  { href: '/admin', label: 'Painel' },
  { href: '/admin/categorias', label: 'Categorias' },
  { href: '/admin/temporadas', label: 'Temporadas' },
  { href: '/admin/jogos', label: 'Jogos' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile()
  if (!profile?.is_admin) redirect('/jogos')

  return (
    <div className="min-h-screen">
      <Navbar userName={profile.full_name} isAdmin={profile.is_admin} />

      <div className="max-w-5xl mx-auto px-4 pt-8">
        <div className="flex gap-1 border-b border-gray-800">
          {TABS.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
