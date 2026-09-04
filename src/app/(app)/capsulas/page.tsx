import { requireCouple } from '@/services/session'
import { listCapsules } from '@/services/content'
import { CapsulesBoard } from '@/features/capsules/capsules-board'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Cápsulas do Tempo · Nosso Universo' }

export default async function CapsulesPage() {
  const { couple, userId } = await requireCouple()
  const capsules = await listCapsules(couple.id)

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Mensagens para o futuro"
        title="Cápsulas do Tempo"
        description="Escreva hoje, leia lá na frente. Até a data marcada nem o conteúdo nem as fotos aparecem."
      />

      <CapsulesBoard
        meId={userId}
        capsules={capsules.map((capsule) => ({
          id: capsule.id,
          title: capsule.title,
          unlockAt: capsule.unlock_at,
          createdBy: capsule.created_by,
          createdAt: capsule.created_at,
          openedAt: capsule.opened_at,
          unlocked: capsule.unlocked,
          message: capsule.message,
          media: capsule.media.map((item) => ({ id: item.id, url: item.url, kind: item.kind })),
        }))}
      />
    </PageTransition>
  )
}
