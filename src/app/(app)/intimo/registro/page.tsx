import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { assertIntimateAccess, listIntimateLog } from '@/services/intimate'
import { IntimateLog } from '@/features/intimate/intimate-log'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'

export default async function IntimateLogPage() {
  const { couple, userId } = await requireCouple()

  // Mesma checagem usada pelas Server Actions: maioridade, área ativada e PIN.
  const acesso = await assertIntimateAccess(couple.id, userId)
  if (!acesso.ok) redirect('/intimo')

  const entries = await listIntimateLog(couple.id)

  return (
    <PageTransition className="space-y-8">
      <Link href="/intimo" className="inline-block text-sm text-ink-soft hover:text-rose-700">
        ← Voltar para a área íntima
      </Link>

      <SectionHeading
        eyebrow="Só entre vocês dois"
        title="Nosso registro"
        description="Marque os dias e acompanhe como anda a rotina de vocês."
      />

      <IntimateLog
        entries={entries.map((entry) => ({
          date: entry.happened_on,
          vezes: entry.vezes,
          note: entry.note,
          mood: entry.mood,
        }))}
      />
    </PageTransition>
  )
}
