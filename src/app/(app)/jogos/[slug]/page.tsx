import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireCouple } from '@/services/session'
import { getGame, listQuestions } from '@/services/games'
import { listMedia } from '@/services/media'
import { listMemories } from '@/services/content'
import { GamePlayer } from '@/features/games/game-player'
import { PageTransition } from '@/components/motion/reveal'
import { EmptyState } from '@/components/ui/misc'
import { ButtonLink } from '@/components/ui/button'

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { couple, me, partner } = await requireCouple()

  const game = await getGame(slug)
  if (!game) notFound()

  // Jogos íntimos só existem dentro da área íntima, nunca aqui.
  if (game.is_intimate) redirect('/intimo')

  const questions = await listQuestions(game, couple.id, me.id)

  // Dois jogos usam o acervo do casal em vez do banco de perguntas.
  const photos =
    slug === 'adivinhe-a-foto'
      ? (await listMedia(couple.id, { kind: 'image', limit: 40 })).filter((item) => item.url)
      : []
  const memories = slug === 'adivinhe-a-memoria' ? await listMemories(couple.id, { limit: 30 }) : []

  const needsContent =
    (slug === 'adivinhe-a-foto' && photos.length < 3) ||
    (slug === 'adivinhe-a-memoria' && memories.length < 3)

  if (needsContent) {
    return (
      <PageTransition>
        <EmptyState
          emoji="📦"
          title="Falta material para este jogo"
          description={
            slug === 'adivinhe-a-foto'
              ? 'Envie pelo menos três fotos para a galeria e volte aqui.'
              : 'Guarde pelo menos três memórias e volte aqui.'
          }
          action={
            <ButtonLink href={slug === 'adivinhe-a-foto' ? '/galeria' : '/admin/memorias'}>
              {slug === 'adivinhe-a-foto' ? 'Ir para a galeria' : 'Adicionar memórias'}
            </ButtonLink>
          }
        />
      </PageTransition>
    )
  }

  return (
    <PageTransition className="space-y-6">
      <Link href="/jogos" className="inline-block text-sm text-ink-soft hover:text-rose-700">
        ← Voltar para os jogos
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
        photos={photos.slice(0, 20).map((photo) => ({
          id: photo.id,
          url: photo.url!,
          caption: photo.caption,
          year: new Date(photo.taken_at ?? photo.created_at).getFullYear(),
        }))}
        memories={memories.slice(0, 20).map((memory) => ({
          id: memory.id,
          title: memory.title,
          description: memory.description,
          happenedOn: memory.happened_on,
          coverUrl: memory.cover?.url ?? null,
        }))}
      />
    </PageTransition>
  )
}
