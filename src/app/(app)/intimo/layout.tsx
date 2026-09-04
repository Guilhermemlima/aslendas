import type { Metadata } from 'next'

/**
 * A área íntima é isolada do resto do app:
 *   * nunca aparece em prévia de link, print ou notificação externa;
 *   * o título da aba é neutro;
 *   * cada página checa maioridade, PIN e consentimento antes de renderizar.
 */
export const metadata: Metadata = {
  title: 'Área privada',
  description: undefined,
  robots: { index: false, follow: false, nocache: true, noarchive: true, nosnippet: true },
  openGraph: undefined,
  twitter: undefined,
}

export default function IntimateLayout({ children }: { children: React.ReactNode }) {
  return <div className="no-print">{children}</div>
}
