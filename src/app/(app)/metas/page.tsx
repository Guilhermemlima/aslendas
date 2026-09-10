import { requireCouple } from '@/services/session'
import { listContributions, listGoals } from '@/services/finance'
import { GoalsBoard } from '@/features/finance/goals-board'
import { SectionHeading } from '@/components/ui/misc'
import { PageTransition } from '@/components/motion/reveal'
import type { ContributionView } from '@/features/finance/goal-detail'

export const metadata = { title: 'Metas · Nosso Universo' }

export default async function MetasPage() {
  const { couple } = await requireCouple()
  const goals = await listGoals(couple.id)

  // Os aportes de todas as metas em paralelo: o detalhe abre em modal, sem
  // nova navegação, então já vão prontos junto com a página.
  const listas = await Promise.all(goals.map((goal) => listContributions(goal.id)))

  const contributionsByGoal: Record<string, ContributionView[]> = {}
  goals.forEach((goal, i) => {
    contributionsByGoal[goal.id] = listas[i].map((c) => ({
      id: c.id,
      amountCents: c.amount_cents,
      contributedOn: c.contributed_on,
      note: c.note,
    }))
  })

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow="Planejando juntos"
        title="Metas"
        description="Quanto custa, para quando, e quanto guardar por mês para chegar lá."
      />

      <GoalsBoard
        goals={goals.map((goal) => ({
          id: goal.id,
          title: goal.title,
          description: goal.description,
          emoji: goal.emoji,
          category: goal.category,
          targetCents: goal.target_cents,
          targetDate: goal.target_date,
          status: goal.status,
          savedCents: goal.savedCents,
          firstContributionOn: goal.firstContributionOn,
        }))}
        contributionsByGoal={contributionsByGoal}
      />
    </PageTransition>
  )
}
