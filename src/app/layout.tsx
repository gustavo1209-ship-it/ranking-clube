import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ranking Tênis — Caça e Pesca de Veranópolis',
  description: 'Ranking anual de tênis do Caça e Pesca de Veranópolis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
