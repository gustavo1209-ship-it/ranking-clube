'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trophy, Swords, User, LogOut, LogIn, Menu, X, ListOrdered } from 'lucide-react'
import { BrandMark } from '@/components/brand-mark'

interface NavbarProps {
  userName?: string | null
  isAdmin?: boolean
}

export function Navbar({ userName, isAdmin }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const links = [
    { href: '/', label: 'Início', icon: null },
    { href: '/ranking', label: 'Ranking', icon: <Trophy size={16} /> },
    { href: '/resultados', label: 'Resultados', icon: <ListOrdered size={16} /> },
    ...(userName ? [
      { href: '/jogos', label: 'Meus Jogos', icon: <Swords size={16} /> },
      { href: '/perfil', label: 'Perfil', icon: <User size={16} /> },
    ] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: null }] : []),
  ]

  return (
    <nav className="border-b border-gray-800 bg-gray-950/95 sticky top-0 z-50 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-heading font-semibold leading-tight shrink-0">
          <BrandMark size={26} className="shrink-0" />
          <span className="flex flex-col">
            <span className="text-white text-base">Ranking</span>
            <span className="text-lime-400 italic text-[11px] sm:text-xs -mt-0.5 whitespace-nowrap">
              Clube Caça e Pesca Veranópolis
            </span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-lime-500/20 text-lime-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {userName ? (
            <>
              <span className="text-sm text-gray-400">{userName}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <LogOut size={16} />
                Sair
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-lime-500 hover:bg-lime-600 text-gray-950 transition-colors"
            >
              <LogIn size={16} />
              Entrar
            </Link>
          )}
        </div>

        <button
          className="md:hidden p-2 text-gray-400 hover:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-3 flex flex-col gap-2">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-lime-500/20 text-lime-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          {userName ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <LogOut size={16} />
              Sair ({userName})
            </button>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-lime-500 hover:bg-lime-600 text-gray-950 transition-colors"
            >
              <LogIn size={16} />
              Entrar
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
