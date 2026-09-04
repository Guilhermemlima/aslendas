import { requireCouple } from '@/services/session'
import { listBucketList } from '@/services/content'
import { BucketList } from '@/features/plans/bucket-list'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Nossos Planos · Nosso Universo' }

export default async function PlansPage() {
  const { couple } = await requireCouple()
  const items = await listBucketList(couple.id)

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Lista de sonhos"
        title="Nossos Planos"
        description="Do restaurante que falta conhecer à viagem que ainda vai acontecer."
      />

      <BucketList
        items={items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          status: item.status,
          priority: item.priority,
          targetDate: item.target_date,
          completedAt: item.completed_at,
        }))}
      />
    </PageTransition>
  )
}
