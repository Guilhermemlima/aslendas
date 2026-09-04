import type { Metadata, Viewport } from 'next'
import { Caveat, Cormorant_Garamond, Inter } from 'next/font/google'
import { ToastProvider } from '@/components/ui/toast'
import { getCoupleContext } from '@/services/session'
import { SITE } from '@/lib/constants'
import './globals.css'

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})
const hand = Caveat({ subsets: ['latin'], variable: '--font-hand', display: 'swap' })

/** Conteúdo privado: nada de indexação, preview ou compartilhamento. */
export const metadata: Metadata = {
  title: SITE.name,
  description: SITE.description,
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: 'default' },
  formatDetection: { telephone: false, email: false, address: false },
}

export const viewport: Viewport = {
  themeColor: '#FDF8F4',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // A paleta e as animações do casal são aplicadas já no HTML, sem flash.
  const context = await getCoupleContext()
  const palette = context?.settings.palette ?? 'rose'
  const animations = context?.settings.animations ?? true

  return (
    <html
      lang="pt-BR"
      data-palette={palette}
      data-animations={animations ? 'on' : 'off'}
      className={`${sans.variable} ${display.variable} ${hand.variable}`}
    >
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
