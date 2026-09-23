import type { Metadata, Viewport } from 'next'
import { Fraunces, Work_Sans } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['500', '600', '700', '900'],
  style: ['normal', 'italic'],
})

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
})

export const metadata: Metadata = {
  title: 'Ranking Tênis — Caça e Pesca de Veranópolis',
  description: 'Ranking anual de tênis de saibro do Caça e Pesca de Veranópolis',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ranking Tênis',
  },
}

export const viewport: Viewport = {
  themeColor: '#071f14',
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
