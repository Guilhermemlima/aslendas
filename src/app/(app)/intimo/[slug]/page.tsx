import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { getGame, listQuestions } from '@/services/games'
import { getIntimateSettings, isIntimateUnlocked } from '@/services/intimate'
import { GamePlayer } from '@/features/games/game-player'
import { PageTransition } from '@/components/motion/reveal'
import { EmptyState } from '@/components/ui/misc'
import { ButtonLink } from '@/components/ui/button'

export default async function IntimateGamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { couple, me, partner } = await requireCouple()

  const [settings, unlocked] = await Promise.all([
    getIntimateSettings(couple.id, me.id),
    isIntimateUnlocked(me.id),
  ])

  // Sem maioridade confirmada, PIN ativo e área habilitada, nada é carregado.
  if (!settings?.adult_confirmed_at || !settings.is_enabled || !unlocked) redirect('/intimo')

  const game = await getGame(slug)
  if (!game || !game.is_intimate) notFound()

  // listQuestions já aplica intensidade, bloqueios e consentimento dos dois.
  const questions = await listQuestions(game, couple.id, me.id)

  if (questions.length === 0) {
    return (
      <PageTransition>
        <EmptyState
          emoji="🔒"
          title="Nada liberado neste jogo"
          description="Este conteúdo depende do consentimento das duas pessoas e do seu nível de intensidade."
          action={<ButtonLink href="/intimo/consentimento">Abrir consentimento</ButtonLink>}
        />
      </PageTransition>
    )
  }

  return (
    <PageTransition className="space-y-6">
      <Link href="/intimo" className="inline-block text-sm text-ink-soft hover:text-rose-700">
        ← Voltar para a área íntima
      </Link>

      <GamePlayer
        game={{
          slug: game.slug,
          name: game.name,
          tagline: game.tagline,
          description: game.description,
          modes: game.modes,
          config: game.config as { segments?: { label: string; icon: string; detail: string }[] },
        }}
        me={{ id: me.id, name: me.display_name }}
        partner={partner ? { id: partner.id, name: partner.display_name } : null}
        questionCount={questions.length}
        photos={[]}
        memories={[]}
      />
    </PageTransition>
  )
}
