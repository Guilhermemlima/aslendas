import { redirect } from 'next/navigation'
import { requireCouple } from '@/services/session'
import { getConsentOverview, getIntimateSettings, isIntimateUnlocked } from '@/services/intimate'
import { ConsentPanel } from '@/features/intimate/consent-panel'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export default async function ConsentPage() {
  const { couple, me, partner } = await requireCouple()

  const [settings, unlocked] = await Promise.all([
    getIntimateSettings(couple.id, me.id),
    isIntimateUnlocked(me.id),
  ])

  if (!settings?.adult_confirmed_at || !settings.is_enabled || !unlocked) redirect('/intimo')

  const overview = await getConsentOverview(couple.id, me.id, partner?.id ?? null)

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Combinado entre os dois"
        title="Consentimento"
        description="Uma categoria só fica ativa quando as duas pessoas dizem sim. Um sim sozinho não libera nada."
      />

      <ConsentPanel
        meId={me.id}
        partnerName={partner?.display_name ?? null}
        items={overview.map((item) => ({
          code: item.category.code,
          name: item.category.name,
          description: item.category.description,
          intensity: item.category.intensity,
          active: item.active,
          mineGranted: item.mineGranted,
          partnerGranted: item.partnerGranted,
          pendingRequest: item.pendingRequest
            ? { id: item.pendingRequest.id, requestedBy: item.pendingRequest.requested_by }
            : null,
        }))}
      />
    </PageTransition>
  )
}
