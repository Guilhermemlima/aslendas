import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { listSurprises } from '@/services/content'
import { SurprisesAdmin } from '@/features/admin/surprises-admin'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export const metadata = { title: 'Surpresas · Painel' }

export default async function SurprisesAdminPage() {
  const { couple, userId, partner } = await requireCouple()
  const surprises = await listSurprises(couple.id)

  // A RLS já devolve só as suas + as que a outra pessoa já revelou.
  const mine = surprises.filter((surprise) => surprise.created_by === userId)

  return (
    <PageTransition className="space-y-8">
      <Link href="/admin" className="inline-block text-sm text-ink-soft hover:text-rose-700">
        ← Voltar ao painel
      </Link>

      <SectionHeading
        eyebrow="Painel"
        title="Modo surpresa"
        description="Prepare algo agora e programe para aparecer só na data marcada. Até lá, a outra pessoa não vê nem que existe."
      />

      <SurprisesAdmin
        partnerName={partner?.display_name ?? null}
        partnerId={partner?.id ?? null}
        surprises={mine.map((surprise) => ({
          id: surprise.id,
          title: surprise.title,
          message: surprise.message,
          revealAt: surprise.reveal_at,
          animation: surprise.animation,
          isActive: surprise.is_active,
          revealedAt: surprise.revealed_at,
          targetUserId: surprise.target_user_id,
          mediaIds: surprise.media.map((item) => item.id),
        }))}
      />
    </PageTransition>
  )
}
