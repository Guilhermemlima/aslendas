import { requireCouple } from '@/services/session'
import { listAchievements } from '@/services/games'
import { Card, CardBody } from '@/components/ui/card'
import { Progress, SectionHeading } from '@/components/ui/misc'
import { PageTransition, Reveal } from '@/components/motion/reveal'
import { formatShortDate } from '@/lib/date'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Conquistas · Nosso Universo' }

export default async function AchievementsPage() {
  const { couple } = await requireCouple()
  const achievements = await listAchievements(couple.id)
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length

  return (
    <PageTransition className="space-y-8">
      <SectionHeading
        eyebrow={`${unlocked} de ${achievements.length} desbloqueadas`}
        title="Conquistas"
        description="Marcos que vocês vão colecionando ao longo do tempo."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((achievement, index) => (
          <Reveal key={achievement.id} delay={index * 0.03}>
            <Card className={cn('h-full', !achievement.unlocked && 'opacity-70')} hover>
              <CardBody className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className={cn('text-3xl', !achievement.unlocked && 'grayscale')} aria-hidden>
                    {achievement.icon}
                  </span>
                  <span className="rounded-full bg-gold/15 px-2.5 py-1 text-[0.7rem] font-medium text-gold">
                    {achievement.xp} XP
                  </span>
                </div>
                <h3 className="font-display text-lg text-ink">{achievement.name}</h3>
                <p className="text-sm text-ink-soft">{achievement.description}</p>

                {achievement.unlocked ? (
                  <p className="pt-1 text-xs text-rose-700">
                    {achievement.unlockedAt
                      ? `desbloqueada em ${formatShortDate(achievement.unlockedAt)}`
                      : 'requisito atingido'}
                  </p>
                ) : (
                  <div className="pt-1">
                    <Progress value={achievement.progress} />
                    <p className="mt-1 text-xs text-ink-faint">
                      {Math.round(achievement.progress * 100)}% do caminho
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>
          </Reveal>
        ))}
      </div>
    </PageTransition>
  )
}
