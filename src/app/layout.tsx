import type { Metadata } from 'next'
import { Fraunces, Work_Sans } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
})

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
})

export const metadata: Metadata = {
  title: 'Ranking Tênis — Caça e Pesca de Veranópolis',
  description: 'Ranking anual de tênis de saibro do Caça e Pesca de Veranópolis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${workSans.variable}`}>
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
