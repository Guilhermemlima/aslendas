import { requireCouple } from '@/services/session'
import { SettingsPanel } from '@/features/settings/settings-panel'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Configurações · Nosso Universo' }

export default async function SettingsPage() {
  const { settings } = await requireCouple()

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Do jeito de vocês"
        title="Configurações"
        description="Cores, fontes, animações e quais páginas aparecem no menu."
      />

      <SettingsPanel
        initial={{
          palette: settings.palette as 'rose',
          font: settings.font as 'serif',
          animations: settings.animations,
          particles: settings.particles,
          home_quote: settings.home_quote ?? '',
          hidden_pages: settings.hidden_pages,
        }}
      />
    </PageTransition>
  )
}
