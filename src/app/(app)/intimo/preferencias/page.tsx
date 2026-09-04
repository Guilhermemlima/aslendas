import { redirect } from 'next/navigation'
import { requireCouple } from '@/services/session'
import { getIntimateSettings, isIntimateUnlocked, listConsentCategories } from '@/services/intimate'
import { IntimatePreferences } from '@/features/intimate/intimate-preferences'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export default async function IntimatePreferencesPage() {
  const { couple, me } = await requireCouple()

  const [settings, unlocked, categories] = await Promise.all([
    getIntimateSettings(couple.id, me.id),
    isIntimateUnlocked(me.id),
    listConsentCategories(),
  ])

  if (!settings?.adult_confirmed_at || !settings.is_enabled || !unlocked) redirect('/intimo')

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Só suas"
        title="Preferências"
        description="Estes ajustes valem só para você. A outra pessoa tem os dela."
      />

      <IntimatePreferences
        maxIntensity={settings.max_intensity}
        blocked={settings.blocked_categories}
        categories={categories.map((category) => ({
          code: category.code,
          name: category.name,
          intensity: category.intensity,
        }))}
      />
    </PageTransition>
  )
}
