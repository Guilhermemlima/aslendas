import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { listAchievements, listGames, listHistory, getStats, levelFromXp } from '@/services/games'
import { Card, CardBody } from '@/components/ui/card'
import { Badge, Progress, SectionHeading } from '@/components/ui/misc'
import { NavIcon } from '@/components/layout/icon'
import { PageTransition, Reveal } from '@/components/motion/reveal'
import { formatShortDate } from '@/lib/date'
import type { GameCategory } from '@/types/db'

export const metadata = { title: 'Jogos · Nosso Universo' }

const GROUPS: { key: GameCategory; label: string; description: string }[] = [
  { key: 'classico', label: 'Clássicos', description: 'Os que sempre rendem risada.' },
  { key: 'conexao', label: 'Conexão', description: 'Para se conhecerem ainda melhor.' },
  { key: 'memoria', label: 'Memória', description: 'O quanto vocês lembram da própria história.' },
  { key: 'sorte', label: 'Sorte', description: 'Deixa o acaso decidir a noite.' },
]

export default async function GamesPage() {
  const { couple } = await requireCouple()

  const [games, stats, achievements, history] = await Promise.all([
    listGames(),
    getStats(couple.id),
    listAchievements(couple.id),
    listHistory(couple.id, 6),
  ])

  const level = levelFromXp(stats.xp)
  const unlocked = achievements.filter((achievement) => achievement.unlocked)

  return (
    <PageTransition className="space-y-10">
      <SectionHeading
        eyebrow="Central de jogos"
        title="Jogar juntos"
        description="Escolham um modo, respondam e vejam o quanto vocês se conhecem."
      />

      {/* ------------------------------------------------------ progresso -- */}
      <Reveal>
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-gold" />
          <CardBody className="grid gap-5 p-5 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <p className="label mb-1">Nível {level.level}</p>
              <p className="font-display text-3xl text-ink">{stats.xp.toLocaleString('pt-BR')} XP</p>
              <Progress value={level.current / level.needed} className="mt-3" />
              <p className="mt-1.5 text-xs text-ink-faint">
                faltam {(level.needed - level.current).toLocaleString('pt-BR')} XP para o próximo nível
              </p>
            </div>

            <Stat label="Pontos" value={stats.points.toLocaleString('pt-BR')} />
            <Stat label="Sequência" value={`${stats.streak_days} ${stats.streak_days === 1 ? 'dia' : 'dias'}`} />
            <Stat label="Jogos completos" value={String(stats.games_played)} />
            <Stat label="Perguntas respondidas" value={String(stats.questions_answered)} />
            <Stat label="Conquistas" value={`${unlocked.length}/${achievements.length}`} />
            <div className="flex items-end">
              <Link href="/jogos/conquistas" className="text-sm font-medium text-rose-700 hover:underline">
                Ver conquistas
              </Link>
            </div>
          </CardBody>
        </Card>
      </Reveal>

      {/* ---------------------------------------------------------- jogos -- */}
      {GROUPS.map((group, groupIndex) => {
        const groupGames = games.filter((game) => game.category === group.key)
        if (groupGames.length === 0) return null

        return (
          <section key={group.key}>
            <div className="mb-4">
              <h2 className="font-display text-2xl text-ink">{group.label}</h2>
              <p className="text-sm text-ink-soft">{group.description}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groupGames.map((game, index) => (
                <Reveal key={game.id} delay={groupIndex * 0.02 + index * 0.04}>
                  <Link href={`/jogos/${game.slug}`} className="focus-ring block h-full">
                    <Card hover className="h-full">
                      <CardBody className="flex h-full flex-col gap-2 p-5">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
                          <NavIcon name={game.icon ?? 'gamepad'} className="h-5 w-5" />
                        </span>
                        <h3 className="mt-1 font-display text-xl leading-snug text-ink">{game.name}</h3>
                        <p className="text-sm text-ink-soft">{game.tagline}</p>
                        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
                          {game.modes.map((mode) => (
                            <Badge key={mode} tone={mode === 'secreto' ? 'lilac' : 'neutral'}>
                              {mode === 'secreto' ? 'resposta secreta' : mode}
                            </Badge>
                          ))}
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        )
      })}

      {/* ------------------------------------------------------- histórico -- */}
      {history.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-2xl text-ink">Últimas partidas</h2>
          <Card>
            <CardBody className="divide-y divide-line/60 p-0">
              {history.map((session) => (
                <div key={session.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700">
                    <NavIcon name={session.game?.icon ?? 'gamepad'} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{session.game?.name ?? 'Jogo'}</p>
                    <p className="text-xs text-ink-faint">
                      {formatShortDate(session.started_at)} · {session.answerCount} respostas
                    </p>
                  </div>
                  <Badge tone={session.status === 'finalizada' ? 'gold' : 'neutral'}>
                    {session.status === 'finalizada' ? 'concluído' : session.status}
                  </Badge>
                </div>
              ))}
            </CardBody>
          </Card>
        </section>
      )}

      <p className="text-center text-sm text-ink-faint">
        Quer conteúdo adulto?{' '}
        <Link href="/intimo" className="font-medium text-rose-700 hover:underline">
          A área íntima fica separada, com PIN e consentimento dos dois.
        </Link>
      </p>
    </PageTransition>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label mb-1">{label}</p>
      <p className="font-display text-2xl text-ink">{value}</p>
    </div>
  )
}
